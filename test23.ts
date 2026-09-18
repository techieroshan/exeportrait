import fs from 'fs';
async function run() {
  try {
    const prompt = `ACT AS A MASTER PHOTOGRAPHER. TRANSFORM THE SUBJECT INTO A HIGH-END EXECUTIVE PORTRAIT.
SUBJECT GENDER: MALE
IDENTITY PRESERVATION: STRICT 1:1 MATCH. You MUST NOT alter facial bone structure, nose shape, or features. ZERO morphing allowed.
CRITICAL COMPLIANCE:
1. ANATOMICAL INTEGRITY: Maintain the subject's original skin tone, facial width, and exact eye placement.
2. EYEWEAR (MANDATORY): If the subject is wearing glasses, you MUST retain them. DO NOT remove or alter the eyewear.
3. EXACT SCALE: The face must occupy the EXACT same volume in the frame as the source. 
4. COMPOSITION: Strict frontal alignment. Face perfectly straight. NO head tilt. Square level shoulders.
5. DRESS: Symmetrical Business suit with tie in Navy or Black.
6. OUTPUT: ONE full-resolution executive image.`;

    const res = await fetch("https://api.straico.com/v0/image/generation", {
      method: "POST",
      headers: {
        "Authorization": "Bearer U3-W8WNQDnR4dOuFI5Li55R5SMG738V9cHvxtqoLkXOt8XcimY4",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "fal-ai/nano-banana/edit",
        description: prompt,
        size: "square",
        variations: 1,
        image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
      })
    });
    console.log(res.status, await res.text());
  } catch(e: any) {
    console.error(e.message);
  }
}
run();
