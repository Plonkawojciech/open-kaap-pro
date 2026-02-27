import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { USD_TO_PLN, type ModelConfig } from '@/lib/constants';
import type {
  ApiKeys,
  AuditEntry,
  BudgetSettings,
  ChatAnalytics,
  ChatModelUsage,
  ChatSession,
  ModelProfile,
  ModelPrompts,
  PromptUsage,
  ProviderStatuses,
  UsageTotals,
} from '@/lib/chat-state';

type ChatSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  allModels: ModelConfig[];
  selectedModel: string;
  selectedModelLabel: string;
  setSelectedModel: (value: string) => void;
  isCustomModel: boolean;
  customModelId: string;
  setCustomModelId: (value: string) => void;
  apiKeys: ApiKeys;
  setApiKeys: (updater: (prev: ApiKeys) => ApiKeys) => void;
  masterPrompt: string;
  setMasterPrompt: (value: string) => void;
  resolveProvider: (modelId: string) => string;
  providerStatuses: ProviderStatuses;
  setProviderStatuses: (updater: (prev: ProviderStatuses) => ProviderStatuses) => void;
  workMode: string;
  setWorkMode: (value: string) => void;
  activeProfile: ModelProfile;
  updateModelProfile: (modelId: string, updates: Partial<ModelProfile>) => void;
  fallbackCandidates: ModelConfig[];
  selectedFallbacks: string[];
  toggleFallbackModel: (modelId: string, fallbackId: string) => void;
  multiModeEnabled: boolean;
  setMultiModeEnabled: (value: boolean) => void;
  multiModeModels: string[];
  toggleMultiModel: (modelId: string) => void;
  budgetSettings: BudgetSettings;
  setBudgetSettings: (updater: (prev: BudgetSettings) => BudgetSettings) => void;
  activeChat: ChatSession | null;
  updateActiveChatField: (field: 'memory' | 'pinnedFacts' | 'privateNotes', value: string) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  activeModelSystemPrompt: string;
  setModelSystemPrompts: (updater: (prev: ModelPrompts) => ModelPrompts) => void;
  monthlyUsage: UsageTotals;
  expensiveModel: ChatModelUsage | null;
  cheapestModel: ModelConfig | null;
  costHints: string[];
  totalUsageByModel: ChatModelUsage[];
  topChats: ChatAnalytics[];
  activeChatAnalytics: ChatAnalytics | null;
  activePromptUsage: PromptUsage[];
  auditLog: AuditEntry[];
  exportBackup: () => void;
  importBackup: (file: File | null) => void;
};

export function ChatSettingsModal({
  isOpen,
  onClose,
  allModels,
  selectedModel,
  selectedModelLabel,
  setSelectedModel,
  isCustomModel,
  customModelId,
  setCustomModelId,
  apiKeys,
  setApiKeys,
  masterPrompt,
  setMasterPrompt,
  resolveProvider,
  providerStatuses,
  setProviderStatuses,
  workMode,
  setWorkMode,
  activeProfile,
  updateModelProfile,
  fallbackCandidates,
  selectedFallbacks,
  toggleFallbackModel,
  multiModeEnabled,
  setMultiModeEnabled,
  multiModeModels,
  toggleMultiModel,
  budgetSettings,
  setBudgetSettings,
  activeChat,
  updateActiveChatField,
  temperature,
  setTemperature,
  activeModelSystemPrompt,
  setModelSystemPrompts,
  monthlyUsage,
  expensiveModel,
  cheapestModel,
  costHints,
  totalUsageByModel,
  topChats,
  activeChatAnalytics,
  activePromptUsage,
  auditLog,
  exportBackup,
  importBackup,
}: ChatSettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 duration-300">
        <div className="p-4 border-b border-border/40 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-lg">Ustawienia</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Model AI</label>
            <div className="grid gap-2">
              {allModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                    selectedModel === model.id ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 hover:bg-secondary/50"
                  )}
                >
                  <div>
                    <div className="font-semibold text-sm">{model.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{model.description}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Dostawca: <span className="font-mono uppercase">{model.provider}</span>
                    </div>
                    <div className="text-[10px] font-mono text-primary/70 mt-1">
                      In: {(model.inputPrice * USD_TO_PLN).toFixed(2)} zł / Out: {(model.outputPrice * USD_TO_PLN).toFixed(2)} zł (za 1M)
                    </div>
                  </div>
                  {selectedModel === model.id && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}

              <button
                onClick={() => {
                  if (!isCustomModel) {
                    const custom = customModelId || 'gpt-4o';
                    setCustomModelId(custom);
                    setSelectedModel(custom);
                  }
                }}
                className={cn(
                  "flex flex-col p-4 rounded-xl border transition-all text-left",
                  isCustomModel ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 hover:bg-secondary/50"
                )}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="font-semibold text-sm">Inny (Własny ID)</div>
                  {isCustomModel && <Check className="w-4 h-4 text-primary" />}
                </div>
                {isCustomModel && (
                  <input
                    value={customModelId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomModelId(val);
                      setSelectedModel(val);
                    }}
                    placeholder="np. gpt-4-turbo, gemini-1.5-pro..."
                    className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-primary/20 focus:outline-none"
                    autoFocus
                  />
                )}
                {!isCustomModel && (
                  <div className="text-[10px] text-muted-foreground">Wpisz ręcznie ID modelu (np. nowe modele OpenAI/Google)</div>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Klucze API użytkownika</label>
            <div className="grid gap-2">
              <input
                type="password"
                value={apiKeys.openai}
                onChange={(e) => setApiKeys((prev) => ({ ...prev, openai: e.target.value }))}
                placeholder="OpenAI API Key"
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-primary/20 focus:outline-none"
              />
              <input
                type="password"
                value={apiKeys.google}
                onChange={(e) => setApiKeys((prev) => ({ ...prev, google: e.target.value }))}
                placeholder="Google AI API Key"
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-primary/20 focus:outline-none"
              />
              <input
                type="password"
                value={apiKeys.anthropic}
                onChange={(e) => setApiKeys((prev) => ({ ...prev, anthropic: e.target.value }))}
                placeholder="Anthropic API Key"
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-primary/20 focus:outline-none"
              />
              <input
                type="password"
                value={apiKeys.deepseek}
                onChange={(e) => setApiKeys((prev) => ({ ...prev, deepseek: e.target.value }))}
                placeholder="DeepSeek API Key"
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-primary/20 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'test',
                          model: selectedModel,
                          masterPrompt,
                          apiKeys,
                          mode: workMode,
                        }),
                      });
                      const json = await res.json();
                      setProviderStatuses((prev) => ({
                        ...prev,
                        [resolveProvider(selectedModel) as keyof ProviderStatuses]: {
                          status: json.ok ? 'success' : 'error',
                          message: json.ok ? 'Połączenie OK' : json.error || 'Błąd',
                          checkedAt: Date.now(),
                        },
                      }));
                    } catch (err: unknown) {
                      setProviderStatuses((prev) => ({
                        ...prev,
                        [resolveProvider(selectedModel) as keyof ProviderStatuses]: {
                          status: 'error',
                          message: err instanceof Error ? err.message : String(err),
                          checkedAt: Date.now(),
                        },
                      }));
                    }
                  }}
                  className="py-2 text-sm font-medium bg-secondary rounded-lg hover:opacity-90 transition-opacity"
                >
                  Test połączenia dla wybranego modelu
                </button>
                <div className="text-[10px] text-muted-foreground">
                  Status: {providerStatuses[resolveProvider(selectedModel) as keyof ProviderStatuses]?.status ?? 'idle'}
                  {providerStatuses[resolveProvider(selectedModel) as keyof ProviderStatuses]?.message
                    ? ` — ${providerStatuses[resolveProvider(selectedModel) as keyof ProviderStatuses]?.message}`
                    : ''}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Statusy dostawców</label>
            <div className="grid gap-2">
              {(['openai', 'google', 'anthropic', 'deepseek'] as const).map((provider) => {
                const status = providerStatuses[provider];
                const providerModel = allModels.find((model) => model.provider === provider)?.id ?? selectedModel;
                return (
                  <div key={provider} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-secondary/20">
                    <div>
                      <div className="text-xs font-semibold uppercase">{provider}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {status.status}
                        {status.message ? ` — ${status.message}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/chat', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'test',
                              model: providerModel,
                              masterPrompt,
                              apiKeys,
                              mode: workMode,
                            }),
                          });
                          const json = await res.json();
                          setProviderStatuses((prev) => ({
                            ...prev,
                            [provider]: {
                              status: json.ok ? 'success' : 'error',
                              message: json.ok ? 'Połączenie OK' : json.error || 'Błąd',
                              checkedAt: Date.now(),
                            },
                          }));
                        } catch (err: unknown) {
                          setProviderStatuses((prev) => ({
                            ...prev,
                            [provider]: {
                              status: 'error',
                              message: err instanceof Error ? err.message : String(err),
                              checkedAt: Date.now(),
                            },
                          }));
                        }
                      }}
                      className="px-3 py-2 text-xs font-medium bg-secondary rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Test
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Tryb pracy</label>
            <select
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value)}
              className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary/20 focus:outline-none"
            >
              <option value="szybki">Szybki</option>
              <option value="analityczny">Analityczny</option>
              <option value="kreatywny">Kreatywny</option>
              <option value="oszczedny">Oszczędny</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Profil modelu</label>
            <div className="grid gap-2">
              <input
                type="number"
                min={0}
                max={2}
                step={0.05}
                value={activeProfile.temperature ?? ''}
                onChange={(e) => updateModelProfile(selectedModel, { temperature: e.target.value === '' ? undefined : Number(e.target.value) })}
                placeholder="Temperatura (nadpisuje globalną)"
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-primary/20 focus:outline-none"
              />
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={activeProfile.topP ?? ''}
                onChange={(e) => updateModelProfile(selectedModel, { topP: e.target.value === '' ? undefined : Number(e.target.value) })}
                placeholder="top_p (0–1)"
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-primary/20 focus:outline-none"
              />
            </div>
            <div className="grid gap-2">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Fallbacki dla {selectedModelLabel}</div>
              <div className="grid grid-cols-2 gap-2">
                {fallbackCandidates.map((model) => (
                  <label key={model.id} className="flex items-center gap-2 text-[10px]">
                    <input
                      type="checkbox"
                      checked={selectedFallbacks.includes(model.id)}
                      onChange={() => toggleFallbackModel(selectedModel, model.id)}
                    />
                    <span className="truncate">{model.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Tryb multi‑model</label>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Porównuj odpowiedzi i scalaj</span>
              <input type="checkbox" checked={multiModeEnabled} onChange={() => setMultiModeEnabled(!multiModeEnabled)} />
            </div>
            {multiModeEnabled && (
              <div className="grid grid-cols-2 gap-2">
                {allModels.map((model) => (
                  <label key={model.id} className="flex items-center gap-2 text-[10px]">
                    <input type="checkbox" checked={multiModeModels.includes(model.id)} onChange={() => toggleMultiModel(model.id)} />
                    <span className="truncate">{model.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Budżet i limity</label>
            <div className="grid gap-2">
              <input
                type="number"
                min={0}
                step={0.1}
                value={budgetSettings.monthlyBudgetUSD}
                onChange={(e) => setBudgetSettings((prev) => ({ ...prev, monthlyBudgetUSD: Number(e.target.value) }))}
                placeholder="Budżet miesięczny (USD)"
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-primary/20 focus:outline-none"
              />
              <input
                type="number"
                min={0.1}
                max={1}
                step={0.05}
                value={budgetSettings.alertThreshold}
                onChange={(e) => setBudgetSettings((prev) => ({ ...prev, alertThreshold: Number(e.target.value) }))}
                placeholder="Próg alertu (0–1)"
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-primary/20 focus:outline-none"
              />
              <input
                type="number"
                min={0}
                step={0.1}
                value={budgetSettings.perModelLimitUSD[selectedModel] ?? 0}
                onChange={(e) =>
                  setBudgetSettings((prev) => ({
                    ...prev,
                    perModelLimitUSD: { ...prev.perModelLimitUSD, [selectedModel]: Number(e.target.value) },
                  }))
                }
                placeholder={`Limit kosztu dla ${selectedModelLabel} (USD)`}
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-primary/20 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Pamięć i notatki (ten chat)</label>
            <textarea
              value={activeChat?.memory ?? ''}
              onChange={(e) => updateActiveChatField('memory', e.target.value)}
              placeholder="Pamięć konwersacji wysyłana do modelu"
              className="w-full bg-secondary/30 border border-border/50 rounded-xl p-3 text-sm min-h-[80px] focus:ring-1 focus:ring-primary/20 focus:outline-none resize-none"
            />
            <textarea
              value={activeChat?.pinnedFacts ?? ''}
              onChange={(e) => updateActiveChatField('pinnedFacts', e.target.value)}
              placeholder="Pinowane fakty (wysyłane do modelu)"
              className="w-full bg-secondary/30 border border-border/50 rounded-xl p-3 text-sm min-h-[80px] focus:ring-1 focus:ring-primary/20 focus:outline-none resize-none"
            />
            <textarea
              value={activeChat?.privateNotes ?? ''}
              onChange={(e) => updateActiveChatField('privateNotes', e.target.value)}
              placeholder="Prywatne notatki (nie są wysyłane)"
              className="w-full bg-secondary/30 border border-border/50 rounded-xl p-3 text-sm min-h-[80px] focus:ring-1 focus:ring-primary/20 focus:outline-none resize-none"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Temperatura</label>
            <div className="grid gap-2">
              <input type="range" min={0} max={2} step={0.05} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="w-full" />
              <input
                type="number"
                min={0}
                max={2}
                step={0.05}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-primary/20 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">System Prompt (Model)</label>
            <textarea
              value={activeModelSystemPrompt}
              onChange={(e) =>
                setModelSystemPrompts((prev) => ({
                  ...prev,
                  [selectedModel]: e.target.value,
                }))
              }
              placeholder={`Instrukcje systemowe dla: ${selectedModelLabel}`}
              className="w-full bg-secondary/30 border border-border/50 rounded-xl p-3 text-sm min-h-[100px] focus:ring-1 focus:ring-primary/20 focus:outline-none resize-none"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Master Prompt</label>
            <textarea
              value={masterPrompt}
              onChange={(e) => setMasterPrompt(e.target.value)}
              placeholder="Instrukcje systemowe dla każdego chatu..."
              className="w-full bg-secondary/30 border border-border/50 rounded-xl p-3 text-sm min-h-[100px] focus:ring-1 focus:ring-primary/20 focus:outline-none resize-none"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Statystyki (Ten miesiąc)</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-secondary/30 rounded-xl border border-border/50">
                <div className="text-xs text-muted-foreground">Koszt całkowity</div>
                <div className="text-lg font-mono font-bold mt-1">{(monthlyUsage.costUSD * USD_TO_PLN).toFixed(2)} PLN</div>
              </div>
              <div className="p-3 bg-secondary/30 rounded-xl border border-border/50">
                <div className="text-xs text-muted-foreground">Tokeny</div>
                <div className="text-lg font-mono font-bold mt-1">{(monthlyUsage.totalTokens / 1000).toFixed(1)}k</div>
              </div>
            </div>
            <div className="grid gap-3 mt-3">
              <div className="p-3 rounded-xl border border-border/50 bg-secondary/20">
                <div className="text-xs font-medium">Najdroższy model</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {expensiveModel
                    ? `${expensiveModel.modelId} · ${(expensiveModel.tokens / 1000).toFixed(1)}k · ${(expensiveModel.costUSD * USD_TO_PLN).toFixed(2)} PLN`
                    : 'Brak danych'}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-border/50 bg-secondary/20">
                <div className="text-xs font-medium">Najtańszy model</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {cheapestModel
                    ? `${cheapestModel.name} · In ${(cheapestModel.inputPrice * USD_TO_PLN).toFixed(2)} zł / Out ${(cheapestModel.outputPrice * USD_TO_PLN).toFixed(2)} zł (1M)`
                    : 'Brak danych'}
                </div>
              </div>
              {costHints.length > 0 && (
                <div className="p-3 rounded-xl border border-border/50 bg-secondary/20">
                  <div className="text-xs font-medium">Optymalizacja kosztów</div>
                  <ul className="text-[10px] text-muted-foreground mt-1 space-y-1">
                    {costHints.map((hint, idx) => (
                      <li key={`${hint}-${idx}`}>{hint}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="grid gap-2 mt-2">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Top modele</div>
              <div className="grid gap-2 max-h-36 overflow-auto">
                {totalUsageByModel.slice(0, 6).map((item) => (
                  <div key={item.modelId} className="p-2 rounded-lg border border-border/50 bg-secondary/20">
                    <div className="text-xs font-semibold">{item.modelId}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {(item.tokens / 1000).toFixed(1)}k · {(item.costUSD * USD_TO_PLN).toFixed(2)} PLN
                    </div>
                  </div>
                ))}
                {totalUsageByModel.length === 0 && <div className="text-[10px] text-muted-foreground">Brak danych o modelach.</div>}
              </div>
            </div>
            <div className="grid gap-2 mt-2">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Top chaty</div>
              <div className="grid gap-2 max-h-36 overflow-auto">
                {topChats.map((chat) => (
                  <div key={chat.chatId} className="p-2 rounded-lg border border-border/50 bg-secondary/20">
                    <div className="text-xs font-semibold truncate">{chat.chatName}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {(chat.totalTokens / 1000).toFixed(1)}k · {(chat.costUSD * USD_TO_PLN).toFixed(2)} PLN
                    </div>
                  </div>
                ))}
                {topChats.length === 0 && <div className="text-[10px] text-muted-foreground">Brak danych o chatach.</div>}
              </div>
            </div>
            {activeChatAnalytics && (
              <div className="grid gap-2 mt-2">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Aktywny chat</div>
                <div className="p-3 rounded-xl border border-border/50 bg-secondary/20">
                  <div className="text-xs font-semibold">{activeChatAnalytics.chatName}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {(activeChatAnalytics.totalTokens / 1000).toFixed(1)}k · {(activeChatAnalytics.costUSD * USD_TO_PLN).toFixed(2)} PLN
                  </div>
                  <div className="mt-2 grid gap-2 max-h-28 overflow-auto">
                    {activeChatAnalytics.perModel.map((model) => (
                      <div key={model.modelId} className="text-[10px] text-muted-foreground">
                        {model.modelId} · {(model.tokens / 1000).toFixed(1)}k · {(model.costUSD * USD_TO_PLN).toFixed(2)} PLN
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="grid gap-2 mt-2">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Prompty (ostatnie 20)</div>
              <div className="grid gap-2 max-h-40 overflow-auto">
                {activePromptUsage.map((entry) => (
                  <div key={entry.id} className="p-2 rounded-lg border border-border/50 bg-secondary/20">
                    <div className="text-xs font-semibold">{entry.modelId}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {entry.prompt ? entry.prompt.slice(0, 120) : 'Brak treści promptu'}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {entry.totalTokens} tok · ${entry.costUSD.toFixed(4)} · {entry.costPLN.toFixed(2)} PLN
                    </div>
                  </div>
                ))}
                {activePromptUsage.length === 0 && <div className="text-[10px] text-muted-foreground">Brak danych o promptach.</div>}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Audyt prywatności</label>
            <div className="grid gap-2 max-h-40 overflow-auto text-[10px]">
              {auditLog.length === 0 && <div className="text-muted-foreground">Brak wpisów.</div>}
              {auditLog.slice(0, 50).map((entry) => (
                <div key={entry.id} className="p-2 rounded border border-border/50 bg-secondary/20">
                  <div className="flex justify-between">
                    <span>{new Date(entry.timestamp).toLocaleString('pl-PL')}</span>
                    <span className="uppercase">{entry.provider}</span>
                  </div>
                  <div className="mt-1">
                    {entry.model} · {entry.mode} · {entry.hasFiles ? 'pliki' : 'brak plików'}
                  </div>
                  {entry.error && <div className="text-rose-500 mt-1">Błąd: {entry.error}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Eksport / Backup</label>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={exportBackup}
                className="w-full py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                Eksportuj dane
              </button>
              <input
                type="file"
                accept="application/json"
                onChange={(e) => importBackup(e.target.files?.[0] ?? null)}
                className="w-full text-xs text-muted-foreground"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
