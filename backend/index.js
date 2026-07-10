import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAIAdapter } from './adapters/openai.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Swappable LLM Provider selection
let llm;
const provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase();

switch (provider) {
  case 'gemini':
    console.log('[Backend] Initializing Gemini LLM Provider.');
    llm = new GeminiAdapter();
    break;
  case 'ollama':
    console.log('[Backend] Initializing Ollama (Local) LLM Provider.');
    llm = new OllamaAdapter();
    break;
  case 'openai':
  default:
    console.log('[Backend] Initializing OpenAI LLM Provider.');
    llm = new OpenAIAdapter();
    break;
}

const llm = new OpenAIAdapter();

// Health check
app.get('/api/health', (req, res) => {
  const activeModel = provider === 'ollama' ? (process.env.OLLAMA_MODEL || 'llama3') : (provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini');
  res.json({ status: 'ok', provider, model: activeModel, time: new Date().toISOString() });
});

// Grounded Query route
app.post('/api/query', async (req, res) => {
  const { pageContent, history, userQuery } = req.body;

  if (!pageContent || typeof pageContent.textContent !== 'string') {
    return res.status(420).json({ error: 'Missing or invalid pageContent' });
  }

  const systemPrompt = `You are an AI Browser Companion. Answer queries about the webpage.
Ground your responses strictly in the context text provided. If you cannot find the answer, say "I cannot find this information in the page content."`;

  try {
    const result = await llm.complete({
      systemPrompt,
      pageContent: pageContent.textContent,
      history: history || [],
      userQuery: userQuery
    });

    res.json({
      text: result.text,
      isInterpretation: result.isInterpretation,
      groundedInPage: true
    });
  } catch (err) {
    res.status(500).json({
      error: {
        code: 'LLM_ERROR',
        message: err.message
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
