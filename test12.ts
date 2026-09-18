async function run() {
  try {
    const res = await fetch("https://api.straico.com/v0/image/generation", {
      method: "POST",
      headers: {
        "Authorization": "Bearer U3-W8WNQDnR4dOuFI5Li55R5SMG738V9cHvxtqoLkXOt8XcimY4",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/dall-e-3", // maybe model instead of models?
        description: "A beautiful cat" // prompt or description?
      })
    });
    console.log("v0 model/description", res.status, await res.text());
    
    const res2 = await fetch("https://api.straico.com/v0/image/generation", {
      method: "POST",
      headers: {
        "Authorization": "Bearer U3-W8WNQDnR4dOuFI5Li55R5SMG738V9cHvxtqoLkXOt8XcimY4",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        models: ["openai/dall-e-3"],
        prompt: "A beautiful cat"
      })
    });
    console.log("v0 models/prompt", res2.status, await res2.text());
  } catch(e: any) {
    console.error(e.message);
  }
}
run();
