async function run() {
  try {
    const res = await fetch("https://api.straico.com/v0/prompt/completion", {
      method: "POST",
      headers: {
        "Authorization": "Bearer U3-W8WNQDnR4dOuFI5Li55R5SMG738V9cHvxtqoLkXOt8XcimY4",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        models: ["google/gemini-3-flash-preview"], // some apis take an array?
        message: "Tell me a joke"
      })
    });
    console.log("v0-array", res.status, await res.text());
    
    // what about Straico's multi model capabilities
    const res2 = await fetch("https://api.straico.com/v0/prompt/completion", {
      method: "POST",
      headers: {
        "Authorization": "Bearer U3-W8WNQDnR4dOuFI5Li55R5SMG738V9cHvxtqoLkXOt8XcimY4",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        message: "Tell me a joke"
      })
    });
    console.log("v0-string", res2.status, (await res2.text()).slice(0, 500));
  } catch(e: any) {
    console.error(e.message);
  }
}
run();
