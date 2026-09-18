async function run() {
  try {
    const res = await fetch("https://api.straico.com/v0/image/edit", {
      method: "POST",
      headers: {
        "Authorization": "Bearer U3-W8WNQDnR4dOuFI5Li55R5SMG738V9cHvxtqoLkXOt8XcimY4",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "fal-ai/nano-banana/edit",
        description: "A beautiful cat",
        size: "1024x1024"
      })
    });
    console.log("image/edit", res.status, await res.text());
  } catch(e: any) {
    console.error(e.message);
  }
}
run();
