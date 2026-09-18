async function run() {
  try {
    const res = await fetch("https://api.straico.com/v0/image/generation", {
      method: "POST",
      headers: {
        "Authorization": "Bearer U3-W8WNQDnR4dOuFI5Li55R5SMG738V9cHvxtqoLkXOt8XcimY4",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        models: ["openai/dall-e-3"], // models array?
        prompt: "A beautiful cat"
      })
    });
    console.log("image/generation models", res.status, await res.text());
  } catch(e: any) {
    console.error(e.message);
  }
}
run();
