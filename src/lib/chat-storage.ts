import type { ModelConfig } from '@/lib/constants';
import type {
  ApiKeys,
  AuditEntry,
  BudgetSettings,
  ChatFolder,
  ChatSession,
  ModelProfiles,
  ModelPrompts,
  UsageTotals,
} from '@/lib/chat-state';

export function readMonthlyUsage(key: string): UsageTotals {
  if (typeof window === 'undefined') return { inputTokens: 0, outputTokens: 0, totalTokens: 0, costUSD: 0 };
  const raw = localStorage.getItem(`usage-${key}`);
  if (!raw) return { inputTokens: 0, outputTokens: 0, totalTokens: 0, costUSD: 0 };
  try {
    const parsed = JSON.parse(raw) as Partial<UsageTotals>;
    return {
      inputTokens: Number(parsed.inputTokens ?? 0),
      outputTokens: Number(parsed.outputTokens ?? 0),
      totalTokens: Number(parsed.totalTokens ?? 0),
      costUSD: Number(parsed.costUSD ?? 0),
    };
  } catch {
    return { inputTokens: 0, outputTokens: 0, totalTokens: 0, costUSD: 0 };
  }
}

export function writeMonthlyUsage(key: string, usage: UsageTotals) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`usage-${key}`, JSON.stringify(usage));
}

export function readMonthlyModelUsage(key: string): Record<string, UsageTotals> {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(`usage-model-${key}`);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, UsageTotals>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeMonthlyModelUsage(key: string, usage: Record<string, UsageTotals>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`usage-model-${key}`, JSON.stringify(usage));
}

export function readStoredChats(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('chat-sessions');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ChatSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeStoredChats(chats: ChatSession[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('chat-sessions', JSON.stringify(chats));
}

export function readStoredFolders(): ChatFolder[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('chat-folders');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ChatFolder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeStoredFolders(folders: ChatFolder[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('chat-folders', JSON.stringify(folders));
}

export function readStoredUserModels(): ModelConfig[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('user-models');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ModelConfig[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeStoredUserModels(models: ModelConfig[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user-models', JSON.stringify(models));
}

export function readStoredApiKeys(): ApiKeys {
  if (typeof window === 'undefined') return { openai: '', google: '', anthropic: '', deepseek: '' };
  const raw = localStorage.getItem('user-api-keys');
  if (!raw) return { openai: '', google: '', anthropic: '', deepseek: '' };
  try {
    const parsed = JSON.parse(raw) as Partial<ApiKeys>;
    return {
      openai: String(parsed.openai ?? ''),
      google: String(parsed.google ?? ''),
      anthropic: String(parsed.anthropic ?? ''),
      deepseek: String(parsed.deepseek ?? ''),
    };
  } catch {
    return { openai: '', google: '', anthropic: '', deepseek: '' };
  }
}

export function writeStoredApiKeys(keys: ApiKeys) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user-api-keys', JSON.stringify(keys));
}

export function readStoredTemperature() {
  if (typeof window === 'undefined') return 0.7;
  const raw = localStorage.getItem('chat-temperature');
  if (!raw) return 0.7;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0.7;
}

export function readStoredModelPrompts(): ModelPrompts {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem('model-system-prompts');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as ModelPrompts;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function readStoredModelProfiles(): ModelProfiles {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem('model-profiles');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as ModelProfiles;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeStoredModelProfiles(profiles: ModelProfiles) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('model-profiles', JSON.stringify(profiles));
}

export function readStoredBudget(): BudgetSettings {
  if (typeof window === 'undefined') return { monthlyBudgetUSD: 0, alertThreshold: 0.8, perModelLimitUSD: {} };
  const raw = localStorage.getItem('budget-settings');
  if (!raw) return { monthlyBudgetUSD: 0, alertThreshold: 0.8, perModelLimitUSD: {} };
  try {
    const parsed = JSON.parse(raw) as BudgetSettings;
    return parsed && typeof parsed === 'object' ? parsed : { monthlyBudgetUSD: 0, alertThreshold: 0.8, perModelLimitUSD: {} };
  } catch {
    return { monthlyBudgetUSD: 0, alertThreshold: 0.8, perModelLimitUSD: {} };
  }
}

export function writeStoredBudget(budget: BudgetSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('budget-settings', JSON.stringify(budget));
}

export function readAuditLog(): AuditEntry[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('audit-log');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AuditEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeAuditLog(entries: AuditEntry[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('audit-log', JSON.stringify(entries));
}

export function readActiveChatId() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('active-chat-id');
}

export function writeActiveChatId(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('active-chat-id', id);
}
