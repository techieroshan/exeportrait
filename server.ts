import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const port = 3000;
const host = '0.0.0.0';

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in the Settings > Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  taskLabel?: string;
}

/**
 * Prioritized Gemini Model Cascades (ordered Highest Quality -> Lowest Tier Fallback)
 */
const VISION_MODELS_CASCADE = [
  'gemini-3.1-pro-preview',   // Tier 1: Highest fidelity multimodal reasoning & intricate facial detail extraction
  'gemini-3.8-flash',         // Tier 2: Next generation multimodal flash model
  'gemini-3.5-flash',         // Tier 3: Reliable production multimodal flash model
  'gemini-3.1-flash-lite',    // Tier 4: Ultra-fast lightweight multimodal tier
];

const IMAGE_MODELS_CASCADE = [
  'gemini-3-pro-image',          // Tier 1: Nano Banana Pro (photorealistic, supports 1K/2K/4K resolution)
  'gemini-3.1-flash-image',      // Tier 2: Nano Banana 2 (high fidelity, supports 1K/2K resolution)
  'gemini-3.1-flash-lite-image', // Tier 3: Nano Banana Lite (rapid image generation and editing)
  'gemini-2.5-flash-image',      // Tier 4: Fallback image generation model
];

/**
 * Calculates exponential backoff with randomized jitter.
 * Using randomized jitter (decorrelated / full jitter) prevents synchronized retry spikes
 * and thundering-herd effects against busy endpoints.
 */
function calculateJitteredBackoff(
  attempt: number,
  baseDelayMs = 2000,
  maxDelayMs = 12000,
  minJitter = 0.75,
  maxJitter = 1.35
): number {
  const exponential = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
  const jitterMultiplier = minJitter + Math.random() * (maxJitter - minJitter);
  return Math.round(exponential * jitterMultiplier);
}

/**
 * Inspects an API error to determine if quota limit is strictly 0 (e.g. model not entitled on current plan).
 * If limit is 0, repeated retries on the same model will never succeed, so we immediately cascade.
 */
function isZeroQuotaError(error: any): boolean {
  const message = (error?.message || '').toLowerCase();
  return (
    message.includes('limit: 0') ||
    message.includes('"quotavalue":"0"') ||
    message.includes('"quotavalue": "0"') ||
    message.includes('limit of 0')
  );
}

/**
 * Extracts suggested retry delay (e.g. from RetryInfo or message) if returned by the API
 */
function extractRetryAfterMs(error: any): number | null {
  const message = error?.message || '';
  const match = message.match(/retry in (\d+(\.\d+)?)s/i);
  if (match && match[1]) {
    return Math.round(parseFloat(match[1]) * 1000);
  }
  if (error?.details && Array.isArray(error.details)) {
    for (const detail of error.details) {
      if (detail?.retryDelay) {
        const secs = parseFloat(detail.retryDelay.replace('s', ''));
        if (!isNaN(secs)) return Math.round(secs * 1000);
      }
    }
  }
  return null;
}

/**
 * Calls an async operation with exponential backoff and randomized jitter for retryable errors.
 */
async function callWithExponentialBackoffAndJitter<T>(
  fn: (attempt: number) => Promise<T>,
  modelName: string,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 2000;
  const maxDelayMs = options.maxDelayMs ?? 12000;
  const taskLabel = options.taskLabel ?? 'Operation';

  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[Gemini Retry] [${taskLabel}] Model '${modelName}' - Retry attempt ${attempt}/${maxRetries}...`);
      }
      return await fn(attempt);
    } catch (error: any) {
      lastError = error;
      const status = error.status || error.code || 500;
      const message = error.message || String(error);

      // If project has 0 quota for this specific model, cascade immediately without wasting retry delays
      if (isZeroQuotaError(error)) {
        console.warn(`[Gemini Cascade] [${taskLabel}] Model '${modelName}' has 0 quota entitlement (limit: 0). Cascading immediately to next tier.`);
        throw error;
      }

      const isRateLimited = status === 429 || message.includes('429') || message.includes('RESOURCE_EXHAUSTED');
      const isServerBusy = status === 503 || status === 500 || message.includes('503') || message.includes('UNAVAILABLE') || message.includes('high demand');
      const isNetworkError = message.includes('fetch failed') || message.includes('ECONNRESET') || message.includes('ETIMEDOUT') || message.includes('socket hang up');

      const isRetryable = isRateLimited || isServerBusy || isNetworkError;

      if (!isRetryable || attempt >= maxRetries) {
        console.warn(`[Gemini Cascade] [${taskLabel}] Model '${modelName}' attempt ${attempt + 1} failed (status: ${status}). Exhausted model retries.`);
        throw error;
      }

      // Calculate exponential delay with randomized jitter
      let waitMs = calculateJitteredBackoff(attempt, baseDelayMs, maxDelayMs);

      // Check for API server-suggested retry duration
      const suggestedRetryMs = extractRetryAfterMs(error);
      if (suggestedRetryMs !== null) {
        if (suggestedRetryMs > 25000) {
          // If server asks for excessive wait (> 25s), cascade down instead of freezing user experience
          console.warn(`[Gemini Cascade] [${taskLabel}] Model '${modelName}' asked for long wait (${suggestedRetryMs}ms). Cascading to next model tier.`);
          throw error;
        }
        // Add random jitter (500-1500ms) to suggested delay to prevent collision
        waitMs = suggestedRetryMs + Math.round(Math.random() * 1000 + 500);
      }

      console.warn(`[Gemini Retry] [${taskLabel}] Model '${modelName}' temporary error (${status}). Retrying in ${waitMs}ms with jitter (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw lastError;
}

/**
 * Cascades through models from highest tier to lowest tier.
 * For each model, retries with exponential backoff and jitter before falling back to the next model.
 */
async function cascadeAcrossModels<T>(
  models: string[],
  taskLabel: string,
  executeModel: (model: string) => Promise<T>,
  options: RetryOptions = {}
): Promise<{ result: T; usedModel: string; tier: number }> {
  console.log(`[Gemini Cascade] [${taskLabel}] Starting cascade across ${models.length} model tiers: ${models.join(' -> ')}`);
  
  const failureReports: string[] = [];

  for (let i = 0; i < models.length; i++) {
    const currentModel = models[i];
    const tier = i + 1;
    console.log(`[Gemini Cascade] [${taskLabel}] Attempting Tier ${tier}/${models.length}: '${currentModel}'...`);

    try {
      const result = await callWithExponentialBackoffAndJitter(
        () => executeModel(currentModel),
        currentModel,
        { ...options, taskLabel }
      );

      console.log(`[Gemini Cascade] [${taskLabel}] SUCCESS with Tier ${tier}: '${currentModel}'!`);
      return { result, usedModel: currentModel, tier };
    } catch (modelError: any) {
      const errorSummary = modelError.message ? modelError.message.substring(0, 180) : String(modelError);
      console.warn(`[Gemini Cascade] [${taskLabel}] Tier ${tier} ('${currentModel}') failed: ${errorSummary}`);
      failureReports.push(`Tier ${tier} (${currentModel}): ${errorSummary}`);

      const nextModel = models[i + 1];
      if (nextModel) {
        console.log(`[Gemini Cascade] [${taskLabel}] Cascading down to next tier (${tier + 1}/${models.length}): '${nextModel}'...`);
      }
    }
  }

  throw new Error(
    `All ${models.length} Gemini model tiers failed for ${taskLabel}:\n` +
    failureReports.map((r, idx) => `  [Tier ${idx + 1}] ${r}`).join('\n')
  );
}

async function runServer() {
  const app = express();
  
  // High ceiling body limits to handle base64 visual uploads comfortably
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '20mb', extended: true }));

  app.use((req, res, next) => {
    console.log(`[Middleware] ${req.method} ${req.url}`);
    next();
  });

  // Create temporary portrait upload folder
  const tempDir = path.join(process.cwd(), 'temp-uploads');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Dynamic API route to serve portraits directly from Express backend (bypassing any CDN rules for static paths)
  app.get('/api/image/:id', (req, res) => {
    const fileId = req.params.id;
    const filePath = path.join(tempDir, fileId);
    if (fs.existsSync(filePath)) {
      if (fileId.endsWith('.png')) res.type('image/png');
      else if (fileId.endsWith('.webp')) res.type('image/webp');
      else res.type('image/jpeg');
      res.sendFile(filePath);
    } else {
      res.status(404).send('Image was not found or has been expired.');
    }
  });

  // API Generate Headshot / Hair analysis Endpoint
  app.post('/api/generate', async (req, res) => {
    console.log(`[API] Received POST request to /api/generate`);
    try {
      const { image, gender, isAnalysis } = req.body;
      console.log(`[API] Request body: image (exists: ${!!image}), gender: ${gender}, isAnalysis: ${isAnalysis}`);

      if (!image || !gender) {
        console.log(`[API] Missing required parameters`);
        return res.status(400).json({ error: "Missing required parameters: image and gender are necessary." });
      }

      console.log(`[API] Processing headshot request. Gender: ${gender}, Analysis Grid Mode: ${isAnalysis}`);

      // 1. Convert base64 data URL and save to local disk
      const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ error: "Invalid image encoding. Image must be a base64 Data URL." });
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // Generate secure unique filename and save to local tempDir as a secondary backup
      const fileId = Date.now() + '_' + Math.random().toString(36).substring(2, 11);
      let fileExt = 'jpg';
      if (mimeType.includes('png')) fileExt = 'png';
      else if (mimeType.includes('webp')) fileExt = 'webp';

      const fileName = `portrait_${fileId}.${fileExt}`;
      const filePath = path.join(tempDir, fileName);

      console.log(`[API] Saving source image backup locally: ${filePath}`);
      fs.writeFileSync(filePath, buffer);

      // 2. Initialize Gemini SDK
      const ai = getGeminiClient();

      // 3. Vision Analysis of the original face using cascading logic (highest to lowest tier)
      console.log(`[API] Analyzing face structure using cascading vision models...`);
      
      const analysisPrompt = `Identify and describe this person's facial traits in extreme detail. Include: estimate gender and age, exact face shape, eyes (shape, size, color), nose shape, skin tone, hair (style, color, length, volume), whether glasses/spectacles are present (describe their style in detail), whether facial hair/beard is present (describe details), and general posture and features. Output ONLY the raw descriptive details of their face and features, no meta comment.`;

      const { result: analysisResponse, usedModel: visionModelUsed, tier: visionTier } = await cascadeAcrossModels(
        VISION_MODELS_CASCADE,
        'Vision Face Analysis',
        async (model: string) => {
          return await ai.models.generateContent({
            model: model,
            contents: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data,
                },
              },
              { text: analysisPrompt },
            ],
          });
        },
        { maxRetries: 2, baseDelayMs: 2000, maxDelayMs: 10000 }
      );

      const facialDescription = analysisResponse?.text;
      if (!facialDescription) {
        throw new Error(`Unable to extract vision analysis text from ${visionModelUsed}.`);
      }

      console.log(`[API] Vision analysis completed successfully using Tier ${visionTier} (${visionModelUsed}). Description length: ${facialDescription.length}`);

      // 4. Construct specific executive portrait prompt incorporating all rules & user parameters
      let generationPrompt = '';
      if (!isAnalysis) {
        // Executive Portrait Theme (integrating user instructions)
        generationPrompt = `A high-end cinematic executive studio portrait photo of a professional corporate leader.
Subject Gender: ${gender.toUpperCase()}
Subject Facial Description:
${facialDescription}

CRITICAL COMPLIANCE AND USER PREFERENCES:
1. ANATOMICAL INTEGRITY: Highly realistic details, zero morphing, matching original features perfectly.
2. EYEWEAR: IF the subject is wearing glasses in the facial description or originally had glasses, you MUST retain them. Clear any glare or stains on the glasses, and make them look plain, clean, and professional. Otherwise, do not add glasses.
3. FACIAL HAIR: IF a beard or facial hair is present in the description, you MUST trim it neatly to make it look professional and groomed. Keep everything else the same.
4. EXPRESSION: Add a friendly 5% smile and a professional, gentle, humble corporate leader look to the subject. Keep everything else the same.
5. ATTIRE: Wear high-end professional clothing. Symmetrical ${gender === 'male' ? 'business suit with a clean tie' : 'professional formal blazer'} in Navy or Black.
6. COMPOSITION: Strict frontal alignment. Face perfectly straight. NO head tilt. Square level shoulders.
7. STYLING: Studio lighting, clean corporate boardroom or soft studio backdrop (blurred depth-of-field), photorealistic, 8k.
`;
      } else {
        // Hairstyle Comparison grid (collage of 8 hairstyles)
        generationPrompt = `A gorgeous, neat 4x2 grid collage (four columns and two rows, totaling eight separate grid cells) showing eight independent portrait pictures comparing different hairstyles. Each cell is an executive portrait headshot of the exact same subject with a DIFFERENT professional hairstyle.
Subject Gender: ${gender.toUpperCase()}
Subject Facial Description:
${facialDescription}

CRITICAL COMPLIANCE AND USER PREFERENCES:
1. 8 DIFFERENT IMAGES OF THE SAME SUBJECT: In each of the 8 grid cells, the subject is the exact same person but has a different neat executive hairstyle (e.g., cell 1: classic trim, cell 2: side part, cell 3: cropped crop, cell 4: wave, cell 5: slicked back, cell 6: modern pompadour, cell 7: low fade, cell 8: textured crop).
2. EYEWEAR (CRITICAL): IF the subject is wearing glasses in the facial description, you MUST retain those glasses in all hairstyles. Clear any glare or stains on the glasses and make them look plain. Otherwise, do not add glasses.
3. FACIAL HAIR: IF a beard is present in the description, trim it neatly to look professional and clean across all cells.
4. EXPRESSION: In all 8 hairstyle cells, add a 5% professional smile and a gentle, humble, dignified business formal look.
5. ATTIRE: Symmetrical corporate blazer or business professional outfit.
6. OUTPUT LAYOUT: Organize the 8 portraits neatly in a clean 4col x 2row grid collage. Do not show black border separators or extra overlay text, only the eight photos.
`;
      }

      // 5. Generate final portrait using cascading logic (highest to lowest tier)
      console.log(`[API] Triggering Gemini image generation using cascading image models (highest to lowest tier)...`);

      const { result: generationResponse, usedModel: imageModelUsed, tier: imageTier } = await cascadeAcrossModels(
        IMAGE_MODELS_CASCADE,
        'Image Generation',
        async (model: string) => {
          const config: Record<string, any> = {
            imageConfig: {
              aspectRatio: "1:1",
            },
          };

          // Configure high-resolution output for models that support imageSize
          if (model === 'gemini-3-pro-image' || model === 'gemini-3.1-flash-image') {
            config.imageConfig.imageSize = "1K";
          }

          return await ai.models.generateContent({
            model: model,
            contents: {
              parts: [
                {
                  text: generationPrompt,
                },
              ],
            },
            config: config,
          });
        },
        { maxRetries: 2, baseDelayMs: 2500, maxDelayMs: 12000 }
      );

      let generatedBase64 = "";
      for (const part of generationResponse?.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          generatedBase64 = part.inlineData.data;
          break;
        }
      }

      if (!generatedBase64) {
        throw new Error(`No image was returned from Gemini model '${imageModelUsed}' (Tier ${imageTier}).`);
      }

      // 6. Save generated portrait to disk and expose via /api/image/
      const genFileId = Date.now() + '_' + Math.random().toString(36).substring(2, 11);
      const genFileName = `generated_${genFileId}.png`;
      const genFilePath = path.join(tempDir, genFileName);

      const genBuffer = Buffer.from(generatedBase64, 'base64');
      fs.writeFileSync(genFilePath, genBuffer);

      const generatedImageUrl = `/api/image/${genFileName}`;
      console.log(`[API] Success! Generated image served locally at: ${generatedImageUrl} (Model: ${imageModelUsed}, Tier: ${imageTier})`);

      // Optional clean up of original source backup file
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[API] Cleaned up source file immediately.`);
        }
      } catch (e) {
        // ignore
      }

      res.json({
        success: true,
        url: generatedImageUrl,
        modelUsed: imageModelUsed,
        tier: imageTier,
        totalTiers: IMAGE_MODELS_CASCADE.length,
        visionModelUsed: visionModelUsed,
      });

    } catch (error: any) {
      console.error("[API Error] generateHeadshot handler failed:", error);
      if (res.headersSent) {
        console.warn("[API Warning] Response headers already sent, cannot send 500 error.");
      } else {
        res.status(500).json({ error: error.message || "An unexpected error occurred during generation." });
      }
    }
  });

  // Serve static UI assets based on system environment (dev vs production)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, host, () => {
    console.log(`Server successfully started on http://${host}:${port}`);
  });
}

runServer();
