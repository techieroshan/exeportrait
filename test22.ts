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
        messages: [{ role: "user", content: [
          { type: "text", text: "What is this image?" },
          { type: "image_url", image_url: { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" } }
        ]}]
      })
    });
    console.log("v1 openai compatible", res.status, (await res.text()).slice(0, 500));
  } catch(e: any) {
    console.error(e.message);
  }
}
run();
