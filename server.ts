import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Lazy-initialized Claude Client
let aiClient: Anthropic | null = null;

function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not configured. Please add it via Settings > Secrets.');
    }
    aiClient = new Anthropic({ apiKey });
  }
  return aiClient;
}

// REST route — Gemini /api/generate → Claude /api/generate (same endpoint, same response shape)
app.post('/api/generate', async (req, res) => {
  try {
    const {
      prompt,
      systemInstruction,
      temperature,
    } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required.' });
      return;
    }

    const ai = getAiClient();

    const response = await ai.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      temperature: typeof temperature === 'number' ? Math.min(temperature, 1) : 0.7,
      ...(systemInstruction ? { system: systemInstruction } : {}),
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const textContent = response.content.find(block => block.type === 'text');
    const text = textContent?.text || '';

    res.json({
      success: true,
      text,
      fullResponse: response
    });

  } catch (error: any) {
    console.error('Claude API error:', error);
    res.status(500).json({
      error: error.message || 'An error occurred during content generation.'
    });
  }
});

// Vite dev / production static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting in DEVELOPMENT mode with Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Starting in PRODUCTION mode serving /dist statics...');
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`🍱 Gourmet Bento Server running on port ${port}`);
  });
}

startServer();
