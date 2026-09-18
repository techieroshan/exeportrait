async function run() {
  try {
    const res = await fetch("https://api.straico.com/v0/prompt/completion", {
      method: "POST",
      headers: {
        "Authorization": "Bearer U3-W8WNQDnR4dOuFI5Li55R5SMG738V9cHvxtqoLkXOt8XcimY4",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        message: "Draw a cat"
      })
    });
    console.log("prompt/completion image generation", res.status, (await res.text()).slice(0, 500));
  } catch(e: any) {
    console.error(e.message);
  }
}
run();
