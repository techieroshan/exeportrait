import fs from "fs";

async function run() {
  try {
    const res = await fetch("https://api.straico.com/v0/image/generation", {
      method: "POST",
      headers: {
        "Authorization": "Bearer U3-W8WNQDnR4dOuFI5Li55R5SMG738V9cHvxtqoLkXOt8XcimY4",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "fal-ai/nano-banana/edit",
        description: "A beautiful cat",
        size: "square",
        variations: 1,
        // tiny 1x1 jpeg base64
        image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
        strength: 0.95,
        image_strength: 0.95
      })
    });
    console.log(res.status, await res.text());
  } catch(e: any) {
    console.error(e.message);
  }
}
run();
