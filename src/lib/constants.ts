
export const USD_TO_PLN = 4.0; // Przybliżony kurs

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'google' | 'deepseek';
  inputPrice: number; // USD per 1M tokens
  outputPrice: number; // USD per 1M tokens
  maxOutputTokens?: number; // Maksymalna liczba tokenów odpowiedzi
  description: string;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  // --- OpenAI ---
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    inputPrice: 2.50,
    outputPrice: 10.00,
    maxOutputTokens: 16384,
    description: 'Najszybszy i najbardziej wszechstronny model OpenAI.'
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    inputPrice: 10.00,
    outputPrice: 30.00,
    maxOutputTokens: 4096,
    description: 'Poprzedni flagowiec OpenAI z szeroką wiedzą.'
  },
  {
    id: 'o1-preview',
    name: 'OpenAI o1 Preview',
    provider: 'openai',
    inputPrice: 15.00,
    outputPrice: 60.00,
    maxOutputTokens: 32768,
    description: 'Nowy model "rozumujący" (reasoning) do najtrudniejszych zadań.'
  },
  {
    id: 'o1-mini',
    name: 'OpenAI o1 Mini',
    provider: 'openai',
    inputPrice: 3.00,
    outputPrice: 12.00,
    maxOutputTokens: 65536,
    description: 'Szybsza i tańsza wersja modelu rozumującego.'
  },
  
  // --- Google ---
  {
    id: 'gemini-pro-latest',
    name: 'Gemini Pro (latest)',
    provider: 'google',
    inputPrice: 3.50,
    outputPrice: 10.50,
    maxOutputTokens: 8192,
    description: 'Stabilny Pro — dobre wyjścia tekstowe, szeroka kompatybilność.'
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash (latest)',
    provider: 'google',
    inputPrice: 0.35,
    outputPrice: 1.05,
    maxOutputTokens: 8192,
    description: 'Ekspresowy i tani — świetny do szybkich odpowiedzi.'
  },
  // --- Anthropic ---
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku (Legacy)',
    provider: 'anthropic',
    inputPrice: 0.25,
    outputPrice: 1.25,
    maxOutputTokens: 4096,
    description: 'Najtańszy i najszybszy. Działa ze starszymi kluczami API.'
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet (New)',
    provider: 'anthropic',
    inputPrice: 3.00,
    outputPrice: 15.00,
    maxOutputTokens: 8192,
    description: 'Zaktualizowany Sonnet. Najlepszy balans inteligencji i ceny.'
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    inputPrice: 1.00,
    outputPrice: 5.00,
    maxOutputTokens: 8192,
    description: 'Najnowszy mały model Anthropic.'
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    inputPrice: 15.00,
    outputPrice: 75.00,
    maxOutputTokens: 4096,
    description: 'Potężny model do zadań kreatywnych i złożonych.'
  },
  {
    id: 'claude-opus-4-6',
    name: 'Claude Opus 4.6',
    provider: 'anthropic',
    inputPrice: 15.00,
    outputPrice: 75.00,
    maxOutputTokens: 4096,
    description: 'Tryb premium: dogłębna analiza i długoterminowa strategia.'
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    inputPrice: 8.00,
    outputPrice: 24.00,
    maxOutputTokens: 8192,
    description: 'Zbalansowany model Anthropic. Szybki i dokładny do większości zadań.'
  },
  // --- DeepSeek (OpenAI‑compatible endpoint) ---
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    inputPrice: 0.50,
    outputPrice: 0.80,
    maxOutputTokens: 8192,
    description: 'Szybki, tani model konwersacyjny od DeepSeek.'
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    provider: 'deepseek',
    inputPrice: 2.00,
    outputPrice: 3.00,
    maxOutputTokens: 8192,
    description: 'Model rozumujący do bardziej złożonych zadań.'
  },
];

// Domyślny model (bezpieczny wybór)
export const DEFAULT_MODEL = 'claude-sonnet-4-6';
