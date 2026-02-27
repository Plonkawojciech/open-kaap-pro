import { convertToModelMessages, streamText, generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { AVAILABLE_MODELS, DEFAULT_MODEL } from '@/lib/constants';
import type { ChatMessage } from '@/lib/chat-types';

export const maxDuration = 30;

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type GoogleModelsCache = {
  apiKey: string;
  expiresAt: number;
  models: string[];
} | null;

let googleModelsCache: GoogleModelsCache = null;

function normalizeModelId(rawModel: string) {
  return rawModel
    .trim()
    .toLowerCase()
    .replace(/^models\//, '')
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/gemini-1-5/g, 'gemini-1.5')
    .replace(/gemini-1-0/g, 'gemini-1.0');
}

function resolveProviderModelId(modelId: string) {
  return modelId;
}

async function getGoogleModels(apiKey: string) {
  const now = Date.now();
  if (googleModelsCache && googleModelsCache.expiresAt > now && googleModelsCache.apiKey === apiKey) {
    return googleModelsCache.models;
  }
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  if (!res.ok) {
    return [];
  }
  const json = (await res.json()) as { models?: Array<{ name?: string }> };
  const models = (json.models ?? [])
    .map((m) => m.name ?? '')
    .filter(Boolean)
    .map((name) => name.replace(/^models\//, ''));
  googleModelsCache = { apiKey, expiresAt: now + 5 * 60 * 1000, models };
  return models;
}

function resolveProvider(modelId: string) {
  const modelConfig = AVAILABLE_MODELS.find((entry) => entry.id === modelId);
  if (modelConfig?.provider) return modelConfig.provider;
  if (modelId.startsWith('gpt') || modelId.startsWith('o1')) return 'openai';
  if (modelId.startsWith('gemini')) return 'google';
  if (modelId.startsWith('deepseek')) return 'deepseek';
  return 'anthropic';
}

function buildSystemInstruction({
  modelId,
  masterPrompt,
  modelSystemPrompt,
  memory,
  pinnedFacts,
  mode,
}: {
  modelId: string;
  masterPrompt?: string;
  modelSystemPrompt?: string;
  memory?: string;
  pinnedFacts?: string;
  mode?: string;
}) {
  const basePrompt = `Jesteś "Open Kaap Pro" — profesjonalnym asystentem dla kolarzy, sportowców wytrzymałościowych oraz osób dbających o zdrowie.

Twoje zasady:
- Odpowiadasz po polsku, chyba że użytkownik poprosi inaczej.
- Jesteś konkretny, rzeczowy i nastawiony na praktyczne decyzje.
- Opierasz się na danych: moc, tętno, HRV, sen, objętość, intensywność, RPE, masa ciała, odżywianie.
- Łączysz trening, regenerację, dietę i profilaktykę urazów.
- Stosujesz czytelne formatowanie Markdown, krótkie akapity i listy.
- Gdy brakuje kluczowych danych, prosisz o nie.
- Unikasz diagnoz medycznych; przy ryzyku zdrowotnym sugerujesz konsultację z lekarzem lub fizjoterapeutą.
- Podajesz praktyczne kroki, wskazując priorytety i ryzyka.
- Nie przymilasz się do użytkownika; mówisz wprost, konkretnie i nie wahasz się podważać błędnych założeń lub teorii.`;

  const modelPrompts: Record<string, string> = {
    'claude-opus-4-6': `Tryb premium: dogłębna analiza, scenariusze i długoterminowa strategia. Precyzyjnie uzasadniaj rekomendacje i pokazuj wpływ decyzji na formę, zmęczenie i adaptację.`,
    'claude-sonnet-4-6': `Zbalansowany tryb Sonnet 4.6: szybkie, dokładne odpowiedzi z naciskiem na praktyczne rekomendacje. Podawaj konkretne kroki, wyjaśniaj ryzyka i wpływ na formę oraz regenerację.`,
    'claude-sonnet-4-5-20250929': `Tryb zbalansowany: łącz precyzję z szybkością. Dawaj jasne rekomendacje, a szczegóły podawaj wtedy, gdy wpływają na wynik.`,
    'claude-haiku-4-5-20251001': `Tryb szybki: krótkie, konkretne odpowiedzi i checklisty. Koncentruj się na tym, co natychmiast użyteczne.`,
    'claude-3-haiku-20240307': `Tryb oszczędny: maksymalnie zwięzłe odpowiedzi, 2–5 punktów, bez zbędnych dygresji.`,
    'claude-3-5-sonnet-20240620': `Tryb analityczny: struktura, kompromisy i krótkie uzasadnienie wyborów.`,
    'claude-3-opus-20240229': `Tryb pogłębiony: szeroki kontekst, dokładna analiza i scenariusze treningowo-zdrowotne.`,
    default: `Tryb profesjonalny: precyzja, praktyczność i klarowna struktura.`
  };

  const modePrompts: Record<string, string> = {
    szybki: 'Tryb szybki: maksymalnie zwięzłe odpowiedzi i szybkie decyzje.',
    analityczny: 'Tryb analityczny: pokaż rozumowanie, kompromisy i uzasadnienie.',
    kreatywny: 'Tryb kreatywny: więcej wariantów i świeżych pomysłów.',
    oszczedny: 'Tryb oszczędny: krótkie odpowiedzi, minimum tokenów.',
  };

  let systemInstruction = `${basePrompt}\n\n${modelPrompts[modelId] ?? modelPrompts.default}`;

  if (mode && modePrompts[mode]) {
    systemInstruction += `\n\n${modePrompts[mode]}`;
  }

  if (masterPrompt) {
    systemInstruction += `\n\n=== MASTER CONTEXT / INSTRUKCJE UŻYTKOWNIKA ===\n${masterPrompt}\n==============================================`;
  }
  if (modelSystemPrompt) {
    systemInstruction += `\n\n=== SYSTEM PROMPT (MODEL) ===\n${modelSystemPrompt}\n=============================`;
  }
  if (memory) {
    systemInstruction += `\n\n=== PAMIĘĆ KONWERSACJI ===\n${memory}\n==========================`;
  }
  if (pinnedFacts) {
    systemInstruction += `\n\n=== PINOWANE FAKTY ===\n${pinnedFacts}\n======================`;
  }
  return systemInstruction;
}

async function resolveProviderModel({
  modelId,
  apiKeys,
}: {
  modelId: string;
  apiKeys?: {
    openai?: string;
    google?: string;
    anthropic?: string;
    deepseek?: string;
  };
}) {
  const provider = resolveProvider(modelId);
  const providerModelId = resolveProviderModelId(modelId);

  if (provider === 'openai') {
    const openAiKey = apiKeys?.openai || process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      throw new HttpError(401, 'Brak klucza OPENAI_API_KEY w pliku .env');
    }
    const openaiProvider = createOpenAI({ apiKey: openAiKey });
    return { provider, model: openaiProvider(providerModelId) };
  }

  if (provider === 'google') {
    const googleKey = apiKeys?.google || process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY;
    if (!googleKey) {
      throw new HttpError(401, 'Brak klucza GOOGLE_API_KEY (lub GOOGLE_AI_STUDIO_API_KEY) w pliku .env');
    }
    const availableModels = await getGoogleModels(googleKey);
    if (availableModels.length > 0 && !availableModels.includes(modelId)) {
      throw new HttpError(400, `Model "${modelId}" nie jest dostępny dla tego klucza.`);
    }
    const googleProvider = createGoogleGenerativeAI({ apiKey: googleKey });
    return { provider, model: googleProvider(providerModelId) };
  }

  if (provider === 'deepseek') {
    const deepseekKey = apiKeys?.deepseek || process.env.DEEPSEEK_API_KEY;
    if (!deepseekKey) {
      throw new HttpError(401, 'Brak klucza DEEPSEEK_API_KEY w pliku .env');
    }
    const deepseekProvider = createOpenAI({ apiKey: deepseekKey, baseURL: 'https://api.deepseek.com' });
    return { provider, model: deepseekProvider(providerModelId) };
  }

  const anthropicKey = apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    throw new HttpError(401, 'Brak klucza ANTHROPIC_API_KEY w pliku .env');
  }
  const anthropicProvider = createAnthropic({ apiKey: anthropicKey });
  return { provider: 'anthropic', model: anthropicProvider(providerModelId) };
}

export async function POST(req: Request) {
  try {
    const json = (await req.json()) as {
      messages: ChatMessage[];
      model?: string;
      masterPrompt?: string;
      temperature?: number;
      topP?: number;
      modelSystemPrompt?: string;
      modelSystemPrompts?: Record<string, string>;
      memory?: string;
      pinnedFacts?: string;
      mode?: string;
      fallbackModels?: string[];
      action?: 'chat' | 'test' | 'multi';
      models?: string[];
      apiKeys?: {
        openai?: string;
        google?: string;
        anthropic?: string;
        deepseek?: string;
      };
    };
    const {
      messages,
      model,
      masterPrompt,
      temperature,
      topP,
      modelSystemPrompt,
      modelSystemPrompts,
      memory,
      pinnedFacts,
      mode,
      fallbackModels,
      action,
      models,
      apiKeys,
    } = json;

    const rawModel = model || DEFAULT_MODEL;
    const selectedModel = normalizeModelId(rawModel);
    if (action === 'test') {
      const { model: providerModel } = await resolveProviderModel({ modelId: selectedModel, apiKeys });
      const modelConfig = AVAILABLE_MODELS.find(m => m.id === selectedModel);
      const systemInstruction = buildSystemInstruction({
        modelId: selectedModel,
        masterPrompt,
        modelSystemPrompt,
        memory,
        pinnedFacts,
        mode,
      });
      const result = await generateText({
        model: providerModel,
        prompt: 'ping',
        system: systemInstruction,
        temperature: 0,
        maxOutputTokens: modelConfig?.maxOutputTokens,
      });
      return Response.json({ ok: true, model: selectedModel, text: result.text });
    }

    if (action === 'multi') {
      const requestedModels = (models ?? []).map(normalizeModelId).filter(Boolean);
      if (requestedModels.length === 0) {
        return Response.json({ error: 'Brak modeli do porównania.' }, { status: 400 });
      }
      const preparedMessages = await convertToModelMessages(messages || []);
      const results = [];
      for (const candidate of requestedModels) {
        try {
          const { model: providerModel } = await resolveProviderModel({ modelId: candidate, apiKeys });
          const candidateConfig = AVAILABLE_MODELS.find(m => m.id === candidate);
          const systemInstruction = buildSystemInstruction({
            modelId: candidate,
            masterPrompt,
            modelSystemPrompt: modelSystemPrompts?.[candidate] ?? modelSystemPrompt,
            memory,
            pinnedFacts,
            mode,
          });
          const response = await generateText({
            model: providerModel,
            messages: preparedMessages,
            system: systemInstruction,
            temperature: typeof temperature === 'number' ? temperature : undefined,
            topP: typeof topP === 'number' ? topP : undefined,
            maxOutputTokens: candidateConfig?.maxOutputTokens,
          });
          results.push({ model: candidate, text: response.text, usage: response.usage ?? null });
        } catch (err) {
          results.push({ model: candidate, error: err instanceof Error ? err.message : String(err) });
        }
      }
      const mergeModelId = selectedModel;
      const mergeConfig = AVAILABLE_MODELS.find(m => m.id === mergeModelId);
      let mergedText = '';
      try {
        const { model: mergeModel } = await resolveProviderModel({ modelId: mergeModelId, apiKeys });
        const summaryPrompt = `Połącz najlepsze fragmenty poniższych odpowiedzi w jedną, spójną i praktyczną odpowiedź. Jeśli odpowiedzi są sprzeczne, krótko wyjaśnij rozbieżność i wybierz najbardziej prawdopodobną opcję.\n\n${results
          .map((r) => (r.text ? `Model ${r.model}:\n${r.text}` : `Model ${r.model} błąd: ${r.error}`))
          .join('\n\n')}`;
        const systemInstruction = buildSystemInstruction({
          modelId: mergeModelId,
          masterPrompt,
          modelSystemPrompt: modelSystemPrompts?.[mergeModelId] ?? modelSystemPrompt,
          memory,
          pinnedFacts,
          mode,
        });
        const merged = await generateText({
          model: mergeModel,
          prompt: summaryPrompt,
          system: systemInstruction,
          temperature: typeof temperature === 'number' ? temperature : undefined,
          topP: typeof topP === 'number' ? topP : undefined,
          maxOutputTokens: mergeConfig?.maxOutputTokens,
        });
        mergedText = merged.text;
      } catch (err) {
        mergedText = `Nie udało się scalić odpowiedzi: ${err instanceof Error ? err.message : String(err)}`;
      }
      return Response.json({ ok: true, results, mergedText });
    }

    const fallbackList = (fallbackModels ?? []).map(normalizeModelId).filter(Boolean);
    const candidateModels = [selectedModel, ...fallbackList].filter(Boolean);
    const preparedMessages = await convertToModelMessages(messages || []);

    let lastError: unknown;
    for (const candidate of candidateModels) {
      try {
        const { model: providerModel } = await resolveProviderModel({ modelId: candidate, apiKeys });
        const candidateConfig = AVAILABLE_MODELS.find(m => m.id === candidate);
        const systemInstruction = buildSystemInstruction({
          modelId: candidate,
          masterPrompt,
          modelSystemPrompt: modelSystemPrompts?.[candidate] ?? modelSystemPrompt,
          memory,
          pinnedFacts,
          mode,
        });
        const result = streamText({
          model: providerModel,
          messages: preparedMessages,
          system: systemInstruction,
          temperature: typeof temperature === 'number' ? temperature : undefined,
          topP: typeof topP === 'number' ? topP : undefined,
          maxOutputTokens: candidateConfig?.maxOutputTokens,
        });
        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          messageMetadata: ({ part }) => {
            if (part.type === 'start') {
              return { model: candidate };
            }
            if (part.type === 'finish') {
              return {
                model: candidate,
                inputTokens: part.totalUsage.inputTokens ?? 0,
                outputTokens: part.totalUsage.outputTokens ?? 0,
                totalTokens: part.totalUsage.totalTokens ?? 0,
              };
            }
          },
        });
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError instanceof HttpError) {
      return new Response(JSON.stringify({ error: lastError.message, details: lastError.message }), {
        status: lastError.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        error: 'Nie udało się wygenerować odpowiedzi.',
        details: lastError instanceof Error ? lastError.message : String(lastError),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return new Response(JSON.stringify({ error: error.message, details: error.message }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
