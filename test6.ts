async function run() {
  try {
    const res = await fetch("https://api.straico.com/v1/models", {
      headers: {
        "Authorization": "Bearer U3-W8WNQDnR4dOuFI5Li55R5SMG738V9cHvxtqoLkXOt8XcimY4"
      }
    });
    const data = await res.json();
    console.log("All image models:", JSON.stringify(data.data.image.map((m: any) => m.model)));
  } catch(e: any) {
    console.error(e.message);
  }
}
run();
