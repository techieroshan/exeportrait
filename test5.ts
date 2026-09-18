async function run() {
  try {
    const res = await fetch("https://api.straico.com/v1/models", {
      headers: {
        "Authorization": "Bearer U3-W8WNQDnR4dOuFI5Li55R5SMG738V9cHvxtqoLkXOt8XcimY4"
      }
    });
    const data = await res.json();
    console.log("Chat models (sample):", JSON.stringify(data.data.chat.map((m: any) => m.model).filter((m: string) => m.includes("gemini"))));
    console.log("Image models (sample):", JSON.stringify(data.data.image.map((m: any) => m.model).filter((m: string) => m.includes("gemini") || m.includes("google"))));
  } catch(e: any) {
    console.error(e.message);
  }
}
run();
