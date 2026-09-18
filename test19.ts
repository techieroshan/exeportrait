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
        message: "What is this image about?",
        image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
      })
    });
    console.log("v0-image", res.status, (await res.text()).slice(0, 500));
  } catch(e: any) {
    console.error(e.message);
  }
}
run();
