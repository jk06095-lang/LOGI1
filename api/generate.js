
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // 1. Verify API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server Configuration Error: API Key is missing." });
  }

  // 2. Extract Data
  const { prompt, image, mimeType, schema } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt." });
  }

  try {
    // 3. Initialize Gemini Client
    const ai = new GoogleGenAI({ apiKey });

    const parts = [];

    // Add Image if present
    if (image && mimeType) {
      parts.push({ inlineData: { data: image, mimeType } });
    }

    // Add Prompt
    parts.push({ text: prompt });

    // Config
    const config = {
      temperature: 0.1,
    };

    // Add Schema if provided (for JSON mode)
    if (schema) {
      config.responseMimeType = "application/json";
      config.responseSchema = schema;
    }

    // 4. Generate Content
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: config
    });

    // 5. Return result
    return res.status(200).json({ result: response.text });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: "AI Generation Failed: " + error.message });
  }
}
