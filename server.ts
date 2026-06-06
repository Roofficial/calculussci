import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Gemini Math Tutor Guidance
  app.post("/api/tutor/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      
      if (!apiKey) {
        return res.status(502).json({
          error: "GEMINI_API_KEY is not configured in Settings > Secrets. Please add your key to proceed.",
        });
      }

      const systemInstruction = 
        "You are 'Calculus Sci Tutor', an elite mathematical tutor and STEM guide. " +
        "Your mission is to help students learn and solve math problems, ranging from high school algebra " +
        "to college-level single/multivariable calculus, linear algebra, and complex statistics. " +
        "Use friendly, precise, and concise language. Provide clear step-by-step math breakdowns. " +
        "Format math expressions beautifully using standard Markdown. Under no circumstances should you " +
        "hallucinate answers; if a question is totally unrelated to math/STEM, politely redirect the student to math topics. " +
        "Feel free to suggest related formulas and equations.";

      // Build context history
      let finalPrompt = "";
      if (history && Array.isArray(history)) {
        const historyText = history
          .slice(-10) // Only look at last 10 messages for context size limit friendliness
          .map((item: any) => `${item.role === "user" ? "Student" : "Tutor"}: ${item.text}`)
          .join("\n");
        finalPrompt = `${historyText}\nStudent: ${message}\nTutor:`;
      } else {
        finalPrompt = message;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: finalPrompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      const reply = response.text || "I was unable to process that math issue. Let's try formatting it again.";
      return res.json({ reply });
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      return res.status(500).json({ error: err.message || "Internal server error during math tutor processing." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Calculus Sci Server with AI Tutor running on port ${PORT}`);
  });
}

startServer();
