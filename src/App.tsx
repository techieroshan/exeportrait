/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useRef, ChangeEvent } from 'react';
import { Camera, Upload, Check, RefreshCcw, Download, Sparkles, Shield, User, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { EXECUTIVE_GUIDELINES } from './constants';
import ImageCropper from './components/ImageCropper';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState(false);
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [preservationLevel, setPreservationLevel] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [generationMeta, setGenerationMeta] = useState<{
    modelUsed?: string;
    tier?: number;
    totalTiers?: number;
    visionModelUsed?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size may be too large. Trying to compress...");
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          // Silky smooth dragging and zooming by scaling down massive raw uploads to responsive HD resolution first
          const MAX_WIDTH = 1600;
          const MAX_HEIGHT = 1600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          // Force to jpeg so the MIME type is clean
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

          setCropSource(dataUrl);
          setImage(null);
          setResultImage(null);
          setError(null);
          setAnalysisMode(false);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const generateHeadshot = async (isAnalysis: boolean = false) => {
    if (!image || !gender) return;
    
    setIsProcessing(true);
    setError(null);
    setAnalysisMode(isAnalysis);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image,
          gender,
          isAnalysis
        })
      });

      if (!response.ok) {
        let errorMessage = `Server returned error status code ${response.status}`;
        const contentType = response.headers.get("content-type");
        
        if (contentType && contentType.indexOf("application/json") !== -1) {
          try {
            const errorJson = await response.json();
            errorMessage = errorJson.error || errorMessage;
          } catch (e) {
            console.error("Failed to parse error JSON", e);
          }
        } else {
          console.error("Server returned non-JSON error response", await response.text());
        }
        
        throw new Error(errorMessage);
      }

      const text = await response.text();
      try {
        const body = JSON.parse(text);
        if (body.success && body.url) {
          setResultImage(body.url);
          if (body.modelUsed) {
            setGenerationMeta({
              modelUsed: body.modelUsed,
              tier: body.tier,
              totalTiers: body.totalTiers,
              visionModelUsed: body.visionModelUsed,
            });
          }
        } else {
          throw new Error("No image was successfully generated. Please check your source picture and try again.");
        }
      } catch (e) {
        console.error("Failed to parse JSON response:", text);
        throw new Error("Server returned invalid JSON response: " + text.substring(0, 100));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during portrait generation.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-900 rounded-lg">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Executive Studio AI</h1>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-gray-500 uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Secure Processing
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left: Guidelines & Controls */}
          <div className="lg:col-span-4 space-y-8">
            <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-gray-900" />
                <h2 className="text-lg font-semibold">Executive Rubric</h2>
              </div>
              <div className="space-y-6">
                {Object.entries(EXECUTIVE_GUIDELINES).map(([key, items]) => (
                  <div key={key} id={`guideline-${key}`}>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{key}</h3>
                    <ul className="space-y-2">
                      {items.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <div className="p-6 bg-gray-900 rounded-3xl text-white">
              <div className="flex items-center gap-3 mb-4">
                <Info className="w-5 h-5 text-white/60" />
                <h3 className="font-medium">Studio Intelligence</h3>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                Our AI analyzes lighting, posture, and facial geometry to composite your portrait into a high-stakes corporate environment.
              </p>
            </div>
          </div>

          {/* Right: Studio Stages */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <AnimatePresence mode="wait">
              {cropSource && !image ? (
                <motion.div
                  key="crop"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <ImageCropper
                    imageSrc={cropSource}
                    onCropComplete={(croppedBase64) => {
                      setImage(croppedBase64);
                    }}
                    onCancel={() => {
                      setCropSource(null);
                      setImage(null);
                    }}
                  />
                </motion.div>
              ) : !image ? (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-[2rem] border-2 border-dashed border-gray-300 h-[600px] flex flex-col items-center justify-center p-12 text-center group transition-colors hover:border-gray-400"
                  id="upload-drop-zone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Upload Source Portrait</h3>
                  <p className="text-gray-500 max-w-xs mb-8">
                    Drag and drop your photo here, or browse your files. High resolution selfie or casual portrait recommended.
                  </p>
                  <button className="bg-gray-900 text-white px-8 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200">
                    Select Photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 min-h-[600px] flex flex-col"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        {isProcessing ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" /> : <User className="w-5 h-5 text-gray-400" />}
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {resultImage 
                            ? (analysisMode ? 'Hairstyle Analysis' : 'Studio Result') 
                            : 'Original Preview'}
                        </h3>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">
                          {isProcessing ? (
                            'Cascading Gemini Models...'
                          ) : resultImage && generationMeta?.modelUsed ? (
                            <span className="text-emerald-600 font-medium">
                              Rendered via {generationMeta.modelUsed} (Tier {generationMeta.tier}/{generationMeta.totalTiers})
                            </span>
                          ) : (
                            'Asset Ready'
                          )}
                        </p>
                      </div>
                    </div>
                    {!isProcessing && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setImage(null); setCropSource(null); setResultImage(null); setAnalysisMode(false); setGenerationMeta(null); }}
                          className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors"
                          id="reset-studio"
                        >
                          <RefreshCcw className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 rounded-2xl overflow-hidden bg-gray-50 relative group">
                    <img
                      src={resultImage || image}
                      alt="Portrait"
                      className={`w-full h-full object-contain transition-all duration-700 ${isProcessing ? 'blur-xl scale-110' : 'blur-0 scale-100'}`}
                      referrerPolicy="no-referrer"
                    />
                    
                    {isProcessing && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-white/40 backdrop-blur-md">
                        <div className="relative">
                          <div className="w-16 h-16 border-4 border-gray-900/20 border-t-gray-900 rounded-full animate-spin"></div>
                          <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-gray-900" />
                        </div>
                        <div className="text-center max-w-sm px-4">
                          <p className="font-semibold text-gray-900">
                            {analysisMode ? 'Generating Hairstyle Comparison' : 'Rendering Executive Portrait'}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Cascading from highest to lowest Gemini models with exponential backoff & jitter...
                          </p>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="absolute inset-0 flex items-center justify-center p-6 text-center bg-red-50/90 backdrop-blur-sm">
                        <div className="max-w-xs">
                          <p className="text-red-700 font-medium mb-4">{error}</p>
                          <button 
                            onClick={() => generateHeadshot(analysisMode)}
                            className="bg-red-700 text-white px-6 py-2 rounded-full text-sm font-medium"
                          >
                            Retry Generation
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Preservation Slider */}
                  {!resultImage && !isProcessing && (
                    <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Face Preservation</h4>
                        </div>
                        <span className="text-[10px] font-bold text-gray-900 bg-gray-200 px-2 py-0.5 rounded tracking-tighter">{preservationLevel}%</span>
                      </div>
                      <input
                        type="range"
                        min="70"
                        max="100"
                        step="5"
                        value={preservationLevel}
                        onChange={(e) => setPreservationLevel(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
                      />
                      <div className="flex justify-between mt-2 text-[9px] text-gray-400 font-medium uppercase tracking-tighter">
                        <span>High Transformation</span>
                        <span>Strict Identity</span>
                      </div>
                    </div>
                  )}

                  {/* Gender Selection */}
                  {!resultImage && !isProcessing && (
                    <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Select Target Demographic</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setGender('male')}
                          className={`py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                            gender === 'male' 
                              ? 'bg-gray-900 text-white shadow-lg' 
                              : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <User className="w-4 h-4" />
                          Executive Male
                        </button>
                        <button
                          onClick={() => setGender('female')}
                          className={`py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                            gender === 'female' 
                              ? 'bg-gray-900 text-white shadow-lg' 
                              : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <User className="w-4 h-4" />
                          Executive Female
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 grid grid-cols-2 gap-4">
                    {!resultImage ? (
                      <>
                        <button
                          onClick={() => generateHeadshot(false)}
                          disabled={isProcessing || !gender}
                          className="bg-gray-900 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-all shadow-xl shadow-gray-200"
                          id="generate-button"
                        >
                          {isProcessing && !analysisMode ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <User className="w-5 h-5" />
                          )}
                          Studio Portrait
                        </button>
                        <button
                          onClick={() => generateHeadshot(true)}
                          disabled={isProcessing}
                          className="bg-indigo-600 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xl shadow-indigo-100"
                          id="analysis-button"
                        >
                          {isProcessing && analysisMode ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Sparkles className="w-5 h-5" />
                          )}
                          Hairstyle Analysis
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = resultImage;
                          link.download = `executive-${analysisMode ? 'analysis' : 'portrait'}.png`;
                          link.target = "_blank"; // Added target blank for external URLs
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="col-span-2 bg-green-600 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-xl shadow-green-100"
                        id="download-button"
                      >
                        <Download className="w-5 h-5" />
                        Download Results
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer Meta */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-200 text-gray-400 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest mb-1">Standard</span>
            <span className="text-sm font-medium text-gray-600">ISO 9001:2026 AI Ethics</span>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest mb-1">Engine</span>
            <span className="text-sm font-medium text-gray-600">Gemini Flash v2.5</span>
          </div>
        </div>
        <p className="text-xs">© 2026 Executive Portrait Studio. All rights reserved.</p>
      </footer>
    </div>
  );
}
