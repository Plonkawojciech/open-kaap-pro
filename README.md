# Open-Kaap Pro

A chat client for models from OpenAI, Anthropic, Google and DeepSeek in one interface. You can send the same prompt to several models at once and compare the answers, set a master prompt and per-model system prompts, and see the estimated cost of each model (in PLN) before you pick it.

Built with Next.js, TypeScript and the Vercel AI SDK. Conversations, settings and usage counters are kept in the browser's local storage.

## Running locally

```bash
npm install
npm run dev
```

API keys come from the settings panel in the app, or from environment variables on the server: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` (or `GOOGLE_AI_STUDIO_API_KEY`) and `DEEPSEEK_API_KEY`. A key entered in the app takes precedence over the server one.

The model list and prices live in `src/lib/constants.ts`; prices are approximate.
