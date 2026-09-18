async function run() {
  try {
    const res = await fetch("https://api.straico.com/v0/prompt/completion", {
      method: "POST",
      headers: {
        "Authorization": "Bearer U3-W8WNQDnR4dOuFI5Li55R5SMG738V9cHvxtqoLkXOt8XcimY4",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "amazon/nova-lite-v1",
        message: "hello"
      })
    });
    console.log("v0", res.status, await res.text());
    
    const res1 = await fetch("https://api.straico.com/v1/prompt/completion", {
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
    console.log("v1", res1.status, await res1.text());
    
  } catch(e: any) {
    console.error(e.message);
  }
}
run();
