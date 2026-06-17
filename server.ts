import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

// Standard ESM replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Lazy-initialized Gemini Client to prevent crash if key is loaded later
let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured. Please add it via Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// REST route for code generation and visual prompt executing
app.post('/api/generate', async (req, res) => {
  try {
    const { 
      prompt, 
      systemInstruction, 
      temperature, 
      responseMimeType, 
      responseSchema, 
      useGrounding,
      model = 'gemini-3.5-flash' 
    } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required.' });
      return;
    }

    const ai = getAiClient();
    
    // Construct configuration
    const config: any = {
      systemInstruction: systemInstruction || undefined,
      temperature: typeof temperature === 'number' ? temperature : 1,
    };

    if (responseMimeType) {
      config.responseMimeType = responseMimeType;
    }

    if (responseSchema) {
      config.responseSchema = responseSchema;
    }

    // Grounding (Google Search tool) if requested
    if (useGrounding) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config,
    });

    res.json({
      text: response.text || '',
      groundingMetadata: response.candidates?.[0]?.groundingMetadata || null,
      fullResponse: response
    });
  } catch (error: any) {
    console.error('Gemini generateContent error:', error);
    res.status(500).json({ 
      error: error.message || 'An error occurred during content generation on the server.' 
    });
  }
});

// Preset API to serve core personas and pre-structured instruction configurations
app.get('/api/personas', (req, res) => {
  const presets = [
    {
      id: 'ux-critic',
      name: 'UX & UI Auditor',
      emoji: '🎨',
      description: 'Roasts and refines user layouts, styling patterns, and spacing hierarchies.',
      systemInstruction: 'You are an aggressive UX Critic and Lead Product Designer. Assess layout logic, padding, visual balance, color contrast, and font scale. Output structure must be highly actionable, starting with a 3-bullet critical review, followed by constructive spacing or stylistic fixes.',
      temperature: 0.8,
      responseSchema: null,
      samplePrompt: 'Review a desktop-first layout consisting of 12-column grid cards with `p-16 border-2 border-slate`, centering a tracking-wider display text in royal-purple with bright mustard-yellow buttons.'
    },
    {
      id: 'tailwind-artisan',
      name: 'Tailwind CSS Artisan',
      emoji: '🪄',
      description: 'Transforms layouts into premium Tailwind designs with custom aesthetic configurations.',
      systemInstruction: 'You are a veteran Tailwind CSS Artisan. Refactor code and aesthetic properties into high-performance utility elements. Adopt slate/charcoal dark canvases, off-white and charcoal pairings, custom subtle border accents, and meticulous margins. Ensure no purples, generic blue gradients, or heavy shadows are used.',
      temperature: 0.6,
      responseSchema: null,
      samplePrompt: 'Provide high-quality class declarations to style a multi-tab bento-grid card container that feels professional, spacious, and tactile.'
    },
    {
      id: 'mock-generator',
      name: 'Structured Schema Architect',
      emoji: '📦',
      description: 'Generates robust mock datasets under strict, custom validation schemas.',
      systemInstruction: 'You are a Schema Architect. Synthesize reliable, beautiful mock dataset records aligned strictly to the requested responseSchema constraints. Provide diverse details and human-friendly content. NEVER inject formatting descriptions or markdown syntax; output pure conforming JSON fields.',
      temperature: 1.0,
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            category: { type: Type.STRING },
            metricName: { type: Type.STRING },
            status: { type: Type.STRING },
            completionPercent: { type: Type.INTEGER }
          },
          required: ['id', 'category', 'metricName', 'status', 'completionPercent']
        }
      },
      samplePrompt: 'List 4 high-fidelity dev metric indicators for our server deployment status.'
    },
    {
      id: 'specologist',
      name: 'API Spec Architect',
      emoji: '⚙️',
      description: 'Specifies elegant OpenAPI paths, JSON schemas, or mock definitions.',
      systemInstruction: 'You are a Senior Systems and OpenAPI Architect. Design clean, semantic REST resources, parameter definitions, and robust data representations using YAML structures. Optimize for developer ergonomics, caching headers, and state verification.',
      temperature: 0.4,
      responseSchema: null,
      samplePrompt: 'Draft an API resource definition path `/api/v1/projects` to manage nested playground sessions with custom template state filters.'
    }
  ];

  res.json(presets);
});

// Setup development as Vite middleware vs production serving static /dist
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting server in DEVELOPMENT mode with Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Starting server in PRODUCTION mode serving /dist statics...');
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer();
