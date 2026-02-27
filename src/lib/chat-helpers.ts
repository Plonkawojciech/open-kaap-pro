import type { ModelConfig } from '@/lib/constants';
import type { ChatMessage } from '@/lib/chat-types';
import type { ChatAnalytics, ChatSession, ModelProfile } from '@/lib/chat-state';

export function getMessageText(message: ChatMessage) {
  if (Array.isArray(message.parts) && message.parts.length > 0) {
    const text = message.parts
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join('');
    if (text) return text;
  }
  return message.content || '';
}

export function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function getNow() {
  return Date.now();
}

export function getMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

export function detectProvider(modelId: string) {
  if (modelId.startsWith('gpt') || modelId.startsWith('o1')) return 'openai';
  if (modelId.startsWith('gemini')) return 'google';
  if (modelId.startsWith('deepseek')) return 'deepseek';
  return 'anthropic';
}

export function normalizeStoredModelId(modelId: string) {
  if (modelId === 'gemini-1.5-pro') return 'gemini-pro-latest';
  if (modelId === 'gemini-1.5-flash') return 'gemini-flash-latest';
  return modelId;
}

export function mapError(rawMessage: string) {
  const lower = rawMessage.toLowerCase();
  const errorMap = [
    { match: (m: string) => m.includes('openai_api_key'), code: 'E_AUTH_OPENAI', description: 'Brak lub nieprawidłowy klucz OpenAI.' },
    { match: (m: string) => m.includes('google_api_key') || m.includes('google_ai_studio_api_key'), code: 'E_AUTH_GOOGLE', description: 'Brak lub nieprawidłowy klucz Google AI.' },
    { match: (m: string) => m.includes('anthropic_api_key'), code: 'E_AUTH_ANTHROPIC', description: 'Brak lub nieprawidłowy klucz Anthropic.' },
    { match: (m: string) => m.includes('deepseek_api_key'), code: 'E_AUTH_DEEPSEEK', description: 'Brak lub nieprawidłowy klucz DeepSeek.' },
    { match: (m: string) => m.includes('insufficient') || m.includes('quota'), code: 'E_QUOTA', description: 'Brak środków lub przekroczony limit konta.' },
    { match: (m: string) => m.includes('context length') || m.includes('maximum context'), code: 'E_CONTEXT', description: 'Za długi kontekst. Skróć wiadomość lub usuń załączniki.' },
    { match: (m: string) => m.includes('model') && m.includes('not found'), code: 'E_MODEL_NOT_FOUND', description: 'Wybrany model nie istnieje lub nie jest dostępny dla tego klucza.' },
    { match: (m: string) => m.includes('400'), code: 'E_BAD_REQUEST', description: 'Nieprawidłowe żądanie. Sprawdź model i treść.' },
    { match: (m: string) => m.includes('401') || m.includes('unauthorized'), code: 'E_UNAUTHORIZED', description: 'Brak autoryzacji. Sprawdź klucz API.' },
    { match: (m: string) => m.includes('403') || m.includes('forbidden'), code: 'E_FORBIDDEN', description: 'Brak uprawnień do tego modelu.' },
    { match: (m: string) => m.includes('404'), code: 'E_NOT_FOUND', description: 'Nie znaleziono zasobu (sprawdź model i dostawcę).' },
    { match: (m: string) => m.includes('413'), code: 'E_TOO_LARGE', description: 'Za duże zapytanie lub pliki.' },
    { match: (m: string) => m.includes('429') || m.includes('rate'), code: 'E_RATE_LIMIT', description: 'Limit zapytań został przekroczony. Spróbuj ponownie za chwilę.' },
    { match: (m: string) => m.includes('timeout'), code: 'E_TIMEOUT', description: 'Przekroczono czas oczekiwania. Spróbuj ponownie.' },
    { match: (m: string) => m.includes('502') || m.includes('bad gateway'), code: 'E_BAD_GATEWAY', description: 'Problem po stronie dostawcy. Spróbuj ponownie.' },
    { match: (m: string) => m.includes('503') || m.includes('service unavailable'), code: 'E_UNAVAILABLE', description: 'Usługa chwilowo niedostępna. Spróbuj później.' },
    { match: (m: string) => m.includes('504') || m.includes('gateway timeout'), code: 'E_GATEWAY_TIMEOUT', description: 'Serwer nie odpowiedział na czas. Spróbuj ponownie.' },
    { match: (m: string) => m.includes('500') || m.includes('internal server error'), code: 'E_SERVER', description: 'Błąd serwera. Spróbuj ponownie później.' },
  ];
  const fallback = { code: 'E_UNKNOWN', description: 'Wystąpił nieznany błąd. Spróbuj ponownie.' };
  return errorMap.find((entry) => entry.match(lower)) ?? fallback;
}

export function computeChatAnalytics(chats: ChatSession[], models: ModelConfig[]): ChatAnalytics[] {
  const priceById = new Map(models.map((m) => [m.id, m]));
  return chats.map((chat) => {
    const usageMap = new Map<string, { modelId: string; tokens: number; inputTokens: number; outputTokens: number; messagesCount: number; costUSD: number }>();
    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;
    let costUSD = 0;
    for (const msg of chat.messages) {
      const m = msg.metadata;
      if (!m) continue;
      const inTok = Number(m.inputTokens ?? 0);
      const outTok = Number(m.outputTokens ?? 0);
      const totTok = Number(m.totalTokens ?? inTok + outTok);
      const modelId = String(m.model ?? '');
      if (inTok || outTok || totTok) {
        inputTokens += inTok;
        outputTokens += outTok;
        totalTokens += totTok;
        const modelCfg = priceById.get(modelId);
        const inCost = modelCfg ? (inTok / 1000000) * modelCfg.inputPrice : 0;
        const outCost = modelCfg ? (outTok / 1000000) * modelCfg.outputPrice : 0;
        const msgCost = inCost + outCost;
        costUSD += msgCost;
        if (!usageMap.has(modelId)) {
          usageMap.set(modelId, {
            modelId,
            tokens: 0,
            inputTokens: 0,
            outputTokens: 0,
            messagesCount: 0,
            costUSD: 0,
          });
        }
        const entry = usageMap.get(modelId)!;
        entry.tokens += totTok;
        entry.inputTokens += inTok;
        entry.outputTokens += outTok;
        entry.costUSD += msgCost;
        entry.messagesCount += 1;
      }
    }
    const perModel = Array.from(usageMap.values()).sort((a, b) => b.costUSD - a.costUSD);
    return {
      chatId: chat.id,
      chatName: chat.name,
      totalTokens,
      inputTokens,
      outputTokens,
      costUSD,
      perModel,
    };
  }).sort((a, b) => b.costUSD - a.costUSD);
}

export function suggestCostOptimizations(analytics: ChatAnalytics, models: ModelConfig[], activeProfile: ModelProfile) {
  const priceById = new Map(models.map((m) => [m.id, m]));
  const suggestions: string[] = [];
  const dominant = analytics.perModel[0];
  if (dominant && dominant.costUSD > 2) {
    const cfg = priceById.get(dominant.modelId);
    const cheaper = models
      .filter((m) => m.provider === cfg?.provider && m.id !== dominant.modelId)
      .sort((a, b) => (a.inputPrice + a.outputPrice) - (b.inputPrice + b.outputPrice))[0];
    if (cheaper) {
      suggestions.push(`Rozważ użycie ${cheaper.name} jako tańszego zamiennika dla ${cfg?.name}.`);
    }
  }
  if (typeof activeProfile.temperature === 'number' && activeProfile.temperature > 0.8) {
    suggestions.push('Obniż temperaturę dla stabilniejszych i tańszych odpowiedzi.');
  }
  if (!activeProfile.fallbacks || activeProfile.fallbacks.length === 0) {
    suggestions.push('Dodaj fallbacki do profilu modelu, aby ograniczyć błędy i koszty.');
  }
  return suggestions.slice(0, 3);
}
