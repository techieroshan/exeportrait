async function run() {
  const sizes = ["1:1", "square", "1024x1024", "1024x1024px", "portrait", "landscape"];
  for (const size of sizes) {
      const res = await fetch("https://api.straico.com/v0/image/generation", {
        method: "POST",
        headers: {
          "Authorization": "Bearer U3-W8WNQDnR4dOuFI5Li55R5SMG738V9cHvxtqoLkXOt8XcimY4",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "fal-ai/nano-banana/edit", // also try "fal-ai/nano-banana"
          description: "A beautiful cat",
          size: size,
          image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        })
      });
      console.log(size, res.status, (await res.text()).slice(0, 100));
      await new Promise(r => setTimeout(r, 1000));
  }
}
run();
