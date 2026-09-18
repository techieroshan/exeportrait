import fs from "fs";

async function run() {
  try {
    const res = await fetch("https://api.straico.com/v1/models", {
      headers: {
        "Authorization": "Bearer U3-W8WNQDnR4dOuFI5Li55R5SMG738V9cHvxtqoLkXOt8XcimY4"
      }
    });
    const data = await res.json();
    const nano = data.data.image.find((m: any) => m.model === "fal-ai/nano-banana/edit");
    const flux = data.data.image.find((m: any) => m.model === "fal-ai/flux/dev");
    console.log("nano:", JSON.stringify(nano, null, 2));
    console.log("flux:", JSON.stringify(flux, null, 2));
  } catch(e: any) {
    console.error(e.message);
  }
}
run();
