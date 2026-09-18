async function run() {
  try {
    const res = await fetch("https://api.straico.com/v0/image/generation", {
        method: "POST",
        headers: {
          "Authorization": "Bearer U3-W8WNQDnR4dOuFI5Li55R5SMG738V9cHvxtqoLkXOt8XcimY4",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "fal-ai/nano-banana/edit",
          description: "A beautiful cat",
          size: "square",
          variations: 1,
          image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        })
      });
      console.log(res.status, await res.text());
  } catch(e: any) {
    console.error(e.message);
  }
}
run();
