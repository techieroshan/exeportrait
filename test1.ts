import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: "U3-W8WNQDnR4dOuFI5Li55R5SMG738V9cHvxtqoLkXOt8XcimY4",
  httpOptions: { baseUrl: "https://api.straico.com" }
});

async function run() {
  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "hello"
    });
    console.log("Success with httpOptions!", res.text);
  } catch (e: any) {
    console.error("httpOptions error:", e.message);
  }
}
run();
