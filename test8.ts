async function run() {
  try {
    const res = await fetch("https://api.straico.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer U3-W8WNQDnR4dOuFI5Li55R5SMG738V9cHvxtqoLkXOt8XcimY4",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: "Tell me a joke" }]
      })
    });
    console.log(res.status);
    console.log(await res.text());
  } catch(e: any) {
    console.error(e.message);
  }
}
run();
