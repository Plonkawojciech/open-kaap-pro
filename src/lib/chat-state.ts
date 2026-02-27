import type { ChatMessage } from '@/lib/chat-types';

export type ChatFolder = {
  id: string;
  name: string;
};

export type ChatSession = {
  id: string;
  name: string;
  folderId: string | null;
  messages: ChatMessage[];
  createdAt: number;
  memory?: string;
  pinnedFacts?: string;
  privateNotes?: string;
};

export type UsageTotals = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD: number;
};

export type ApiKeys = {
  openai: string;
  google: string;
  anthropic: string;
  deepseek: string;
};

export type ModelPrompts = Record<string, string>;

export type ModelProfile = {
  temperature?: number;
  topP?: number;
  fallbacks?: string[];
};

export type ModelProfiles = Record<string, ModelProfile>;

export type ProviderTestStatus = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  checkedAt?: number;
};

export type ProviderStatuses = Record<'openai' | 'google' | 'anthropic' | 'deepseek', ProviderTestStatus>;

export type BudgetSettings = {
  monthlyBudgetUSD: number;
  alertThreshold: number;
  perModelLimitUSD: Record<string, number>;
};

export type AuditEntry = {
  id: string;
  timestamp: number;
  model: string;
  provider: string;
  mode: string;
  temperature?: number;
  topP?: number;
  hasFiles: boolean;
  fileNames: string[];
  memoryIncluded: boolean;
  pinnedFactsIncluded: boolean;
  usedModel?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  costUSD?: number;
  error?: string;
};

export type ChatModelUsage = {
  modelId: string;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  messagesCount: number;
  costUSD: number;
};

export type ChatAnalytics = {
  chatId: string;
  chatName: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  perModel: ChatModelUsage[];
};

export type PromptUsage = {
  id: string;
  prompt: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD: number;
  costPLN: number;
};
