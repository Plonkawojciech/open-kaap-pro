"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowUp, Menu, Plus, Settings, Paperclip, X, Copy, Check, Edit2, Search } from 'lucide-react';
import { AVAILABLE_MODELS, DEFAULT_MODEL, USD_TO_PLN, type ModelConfig } from '@/lib/constants';
import { messageMetadataSchema, type ChatMessage } from '@/lib/chat-types';
import { cn } from '@/lib/utils';
import { ChatEmptyState } from '@/components/chat/chat-empty-state';
import { ChatSearchBar } from '@/components/chat/chat-search-bar';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatSettingsModal } from '@/components/chat/chat-settings-modal';
import type {
  ApiKeys,
  AuditEntry,
  BudgetSettings,
  ChatFolder,
  ChatSession,
  ChatModelUsage,
  ModelProfiles,
  ModelPrompts,
  ProviderStatuses,
  UsageTotals,
  PromptUsage,
  ModelProfile,
} from '@/lib/chat-state';
import {
  computeChatAnalytics,
  createId,
  detectProvider,
  getMessageText,
  getMonthKey,
  getNow,
  mapError,
  normalizeStoredModelId,
  suggestCostOptimizations,
} from '@/lib/chat-helpers';
import {
  readActiveChatId,
  readAuditLog,
  readMonthlyModelUsage,
  readMonthlyUsage,
  readStoredApiKeys,
  readStoredBudget,
  readStoredChats,
  readStoredFolders,
  readStoredModelProfiles,
  readStoredModelPrompts,
  readStoredTemperature,
  readStoredUserModels,
  writeActiveChatId,
  writeAuditLog,
  writeMonthlyModelUsage,
  writeMonthlyUsage,
  writeStoredApiKeys,
  writeStoredBudget,
  writeStoredChats,
  writeStoredFolders,
  writeStoredModelProfiles,
  writeStoredUserModels,
} from '@/lib/chat-storage';

export default dynamic(() => Promise.resolve(App), { ssr: false });

// --- Types ---

type CodeProps = HTMLAttributes<HTMLElement> & {
  inline?: boolean;
  children?: ReactNode;
};

type AttachedFile = {
  name: string;
  type: 'text' | 'image';
  content: string;
  mimeType?: string;
  lineCount: number;
  startLine: number;
  endLine: number;
  included: boolean;
};

type AttachmentPayload = {
  name: string;
  contentType: string;
  url: string;
};

type ChatMessageWithAttachments = ChatMessage & {
  experimental_attachments?: AttachmentPayload[];
};


// --- Main Component ---

function App() {
  // -- Refs & Memo --
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastUserMessageRef = useRef<string | null>(null);
  const lastFilesRef = useRef<AttachedFile[]>([]);

  const chatTransport = useMemo(() => new DefaultChatTransport({ api: '/api/chat' }), []);

  // -- State --
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile drawer
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Settings modal
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [newChatFolderId, setNewChatFolderId] = useState<string>('none');
  const [newFolderName, setNewFolderName] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatName, setEditingChatName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const monthLabel = useMemo(() => new Date().toLocaleString('pl-PL', { month: 'short' }), []);
  const [userModels, setUserModels] = useState<ModelConfig[]>(() => readStoredUserModels());
  const allModels = useMemo(() => [...AVAILABLE_MODELS, ...userModels], [userModels]);
  const [customModelId, setCustomModelId] = useState(() => {
    if (typeof window === 'undefined') return '';
    const stored = localStorage.getItem('selectedModel');
    const normalized = stored ? normalizeStoredModelId(stored) : '';
    const existing = [...AVAILABLE_MODELS, ...readStoredUserModels()].some(m => m.id === normalized);
    if (normalized && !existing) return normalized;
    return '';
  });
  const [selectedModel, setSelectedModel] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_MODEL;
    const stored = localStorage.getItem('selectedModel');
    return stored ? normalizeStoredModelId(stored) : DEFAULT_MODEL;
  });
  const [masterPrompt, setMasterPrompt] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('masterPrompt') ?? '';
  });
  const [apiKeys, setApiKeys] = useState<ApiKeys>(() => readStoredApiKeys());
  const [temperature, setTemperature] = useState(() => readStoredTemperature());
  const [modelSystemPrompts, setModelSystemPrompts] = useState<ModelPrompts>(() => readStoredModelPrompts());
  const [modelProfiles, setModelProfiles] = useState<ModelProfiles>(() => readStoredModelProfiles());
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatuses>({
    openai: { status: 'idle' },
    google: { status: 'idle' },
    anthropic: { status: 'idle' },
    deepseek: { status: 'idle' },
  });
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings>(() => readStoredBudget());
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(() => readAuditLog());
  const [workMode, setWorkMode] = useState(() => {
    if (typeof window === 'undefined') return 'analityczny';
    return localStorage.getItem('work-mode') ?? 'analityczny';
  });
  const [multiModeEnabled, setMultiModeEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('multi-mode-enabled') === 'true';
  });
  const [multiModeModels, setMultiModeModels] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('multi-mode-models');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [folders, setFolders] = useState<ChatFolder[]>(() => readStoredFolders());
  const [chats, setChats] = useState<ChatSession[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = readStoredChats();
    if (stored.length > 0) return stored;
    const newChat: ChatSession = {
      id: createId(),
      name: 'Nowy chat',
      folderId: null,
      messages: [],
      createdAt: getNow(),
    };
    writeStoredChats([newChat]);
    return [newChat];
  });
  const [activeChatId, setActiveChatId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const storedChats = readStoredChats();
    const storedId = readActiveChatId();
    if (storedId && storedChats.some((chat) => chat.id === storedId)) {
      return storedId;
    }
    return storedChats[0]?.id ?? '';
  });

  // Message Editing / Copying
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [expandedErrorIds, setExpandedErrorIds] = useState<string[]>([]);

  // Usage & Files
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [lastUsage, setLastUsage] = useState({ inputTokens: 0, outputTokens: 0, totalTokens: 0, costUSD: 0 });
  const [monthlyUsage, setMonthlyUsage] = useState<UsageTotals>(() => readMonthlyUsage(getMonthKey()));
  const [monthlyModelUsage, setMonthlyModelUsage] = useState<Record<string, UsageTotals>>(() => readMonthlyModelUsage(getMonthKey()));
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [localInput, setLocalInput] = useState('');

  // -- Derived --
  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? null;
  const initialMessages = useMemo(() => activeChat?.messages ?? [], [activeChat]);
  const isCustomModel = !allModels.some(m => m.id === selectedModel);
  const safeInput = typeof localInput === 'string' ? localInput : '';
  const selectedModelLabel = isCustomModel
    ? (customModelId || selectedModel)
    : (allModels.find(m => m.id === selectedModel)?.name ?? selectedModel);
  const providerByModel = useMemo(() => new Map(allModels.map((m) => [m.id, m.provider])), [allModels]);
  const resolveProvider = (modelId: string) => providerByModel.get(modelId) ?? detectProvider(modelId);
  const activeModelSystemPrompt = modelSystemPrompts[selectedModel] ?? '';
  const activeProfile = useMemo(() => modelProfiles[selectedModel] ?? {}, [modelProfiles, selectedModel]);
  const fallbackCandidates = allModels.filter((model) => model.id !== selectedModel);
  const selectedFallbacks = activeProfile.fallbacks ?? [];
  const chatAnalytics = useMemo(() => computeChatAnalytics(chats, allModels), [chats, allModels]);
  const topChats = chatAnalytics.slice(0, 6);
  const totalUsageByModel = useMemo(() => {
    const map = new Map<string, ChatModelUsage>();
    for (const entry of chatAnalytics) {
      for (const modelUsage of entry.perModel) {
        if (!map.has(modelUsage.modelId)) {
          map.set(modelUsage.modelId, {
            modelId: modelUsage.modelId,
            tokens: 0,
            inputTokens: 0,
            outputTokens: 0,
            messagesCount: 0,
            costUSD: 0,
          });
        }
        const agg = map.get(modelUsage.modelId)!;
        agg.tokens += modelUsage.tokens;
        agg.inputTokens += modelUsage.inputTokens;
        agg.outputTokens += modelUsage.outputTokens;
        agg.costUSD += modelUsage.costUSD;
        agg.messagesCount += modelUsage.messagesCount;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.costUSD - a.costUSD);
  }, [chatAnalytics]);
  const cheapestModel = useMemo(() => {
    const sorted = allModels
      .filter((m) => m.inputPrice > 0 || m.outputPrice > 0)
      .sort((a, b) => (a.inputPrice + a.outputPrice) - (b.inputPrice + b.outputPrice));
    return sorted[0] ?? null;
  }, [allModels]);
  const expensiveModel = totalUsageByModel[0];
  const activeChatAnalytics = useMemo(
    () => chatAnalytics.find((entry) => entry.chatId === activeChatId) ?? null,
    [chatAnalytics, activeChatId]
  );
  const costHints = useMemo(() => {
    const active = activeChatAnalytics;
    if (!active) return [];
    return suggestCostOptimizations(active, allModels, activeProfile);
  }, [activeChatAnalytics, allModels, activeProfile]);
  const activePromptUsage = useMemo<PromptUsage[]>(() => {
    if (!activeChat) return [];
    const priceById = new Map(allModels.map((m) => [m.id, m]));
    const items: PromptUsage[] = [];
    let lastUserPrompt = '';
    for (const msg of activeChat.messages) {
      if (msg.role === 'user') {
        lastUserPrompt = getMessageText(msg);
        continue;
      }
      if (msg.role !== 'assistant') continue;
      const metadata = msg.metadata;
      if (!metadata) continue;
      const inputTokens = metadata.inputTokens ?? 0;
      const outputTokens = metadata.outputTokens ?? 0;
      const totalTokens = metadata.totalTokens ?? inputTokens + outputTokens;
      if (!inputTokens && !outputTokens && !totalTokens) continue;
      const modelId = metadata.model ?? selectedModel;
      const modelCfg = priceById.get(modelId);
      const costUSD = modelCfg
        ? (inputTokens / 1000000) * modelCfg.inputPrice + (outputTokens / 1000000) * modelCfg.outputPrice
        : 0;
      items.push({
        id: msg.id,
        prompt: lastUserPrompt,
        modelId,
        inputTokens,
        outputTokens,
        totalTokens,
        costUSD,
        costPLN: costUSD * USD_TO_PLN,
      });
    }
    return items.slice(-20).reverse();
  }, [activeChat, allModels, selectedModel]);
  
  const chatId = activeChatId || 'default';

  const syncActiveChatMessages = (nextMessages: ChatMessage[]) => {
    if (!activeChatId) return;
    setChats((prev) =>
      prev.map((chat) => (chat.id === activeChatId ? { ...chat, messages: nextMessages } : chat))
    );
  };

  const { messages, stop, status, setMessages, sendMessage } = useChat<ChatMessage>({
    transport: chatTransport,
    messageMetadataSchema,
    messages: initialMessages,
    id: chatId,
    onError: (error: Error) => {
      const rawMessage = error?.message || '';
      const matched = mapError(rawMessage);
      const attemptedText = lastUserMessageRef.current ?? '';
      const provider = resolveProvider(selectedModel);
      const auditEntry: AuditEntry = {
        id: createId(),
        timestamp: getNow(),
        model: selectedModel,
        provider,
        mode: workMode,
        temperature,
        topP: modelProfiles[selectedModel]?.topP,
        hasFiles: attachedFiles.length > 0,
        fileNames: attachedFiles.map((f) => f.name),
        memoryIncluded: !!activeChat?.memory,
        pinnedFactsIncluded: !!activeChat?.pinnedFacts,
        error: rawMessage,
      };
      setAuditLog((prev) => {
        const next = [auditEntry, ...prev].slice(0, 500);
        writeAuditLog(next);
        return next;
      });
      setMessages((prev: ChatMessage[]) => {
        const nextMessages: ChatMessage[] = [
          ...prev,
          {
            id: createId(),
            role: 'assistant',
            parts: [{ type: 'text', text: `⚠️ ${matched.description}\nKod: ${matched.code}` }],
            metadata: { 
              error: true, 
              errorMessage: rawMessage || matched.description, 
              errorCode: matched.code, 
              errorDescription: matched.description,
              attemptedText,
              errorModel: selectedModel,
              errorProvider: provider,
            },
          },
        ];
        syncActiveChatMessages(nextMessages);
        return nextMessages;
      });
    },
    onFinish: ({ message, messages }) => {
      syncActiveChatMessages(messages);
      const metadata = message.metadata;
      if (metadata && (metadata.inputTokens || metadata.outputTokens)) {
        const inputTokens = Number(metadata.inputTokens ?? 0);
        const outputTokens = Number(metadata.outputTokens ?? 0);
        const totalTokens = Number(metadata.totalTokens ?? inputTokens + outputTokens);
        const modelId = metadata.model || selectedModel;
        const modelConfig = allModels.find(m => m.id === modelId);
        if (modelConfig) {
          const inputCost = (inputTokens / 1000000) * modelConfig.inputPrice;
          const outputCost = (outputTokens / 1000000) * modelConfig.outputPrice;
          const costUSD = inputCost + outputCost;

          setLastUsage({
            inputTokens,
            outputTokens,
            totalTokens,
            costUSD,
          });

          setMonthlyUsage(prev => {
            const newUsage = {
              inputTokens: prev.inputTokens + inputTokens,
              outputTokens: prev.outputTokens + outputTokens,
              totalTokens: prev.totalTokens + totalTokens,
              costUSD: prev.costUSD + costUSD
            };
            writeMonthlyUsage(getMonthKey(), newUsage);
            return newUsage;
          });
          setMonthlyModelUsage(prev => {
            const monthKey = getMonthKey();
            const prevModelUsage = prev[modelId] ?? { inputTokens: 0, outputTokens: 0, totalTokens: 0, costUSD: 0 };
            const nextModelUsage = {
              inputTokens: prevModelUsage.inputTokens + inputTokens,
              outputTokens: prevModelUsage.outputTokens + outputTokens,
              totalTokens: prevModelUsage.totalTokens + totalTokens,
              costUSD: prevModelUsage.costUSD + costUSD,
            };
            const next = { ...prev, [modelId]: nextModelUsage };
            writeMonthlyModelUsage(monthKey, next);
            return next;
          });
          const provider = resolveProvider(modelId);
          const auditEntry: AuditEntry = {
            id: createId(),
            timestamp: getNow(),
            model: modelId,
            provider,
            mode: workMode,
            temperature,
            topP: modelProfiles[modelId]?.topP,
            hasFiles: attachedFiles.length > 0,
            fileNames: attachedFiles.map((f) => f.name),
            memoryIncluded: !!activeChat?.memory,
            pinnedFactsIncluded: !!activeChat?.pinnedFacts,
            usedModel: modelId,
            inputTokens,
            outputTokens,
            totalTokens,
            costUSD,
          };
          setAuditLog((prev) => {
            const next = [auditEntry, ...prev].slice(0, 500);
            writeAuditLog(next);
            return next;
          });
          if (budgetSettings.monthlyBudgetUSD > 0) {
            const remaining = budgetSettings.monthlyBudgetUSD - (monthlyUsage.costUSD + costUSD);
            const threshold = budgetSettings.monthlyBudgetUSD * budgetSettings.alertThreshold;
            if (remaining <= threshold) {
              setMessages((prev: ChatMessage[]) => {
                const nextMessages: ChatMessage[] = [
                  ...prev,
                  {
                    id: createId(),
                    role: 'assistant',
                    parts: [{ type: 'text', text: `⚠️ Zbliżasz się do limitu budżetu miesięcznego. Pozostało około $${remaining.toFixed(2)}.` }],
                    metadata: { warning: true },
                  },
                ];
                syncActiveChatMessages(nextMessages);
                return nextMessages;
              });
            }
            const perModelLimit = budgetSettings.perModelLimitUSD[modelId];
            if (perModelLimit && (monthlyModelUsage[modelId]?.costUSD ?? 0) + costUSD >= perModelLimit) {
              setMessages((prev: ChatMessage[]) => {
                const nextMessages: ChatMessage[] = [
                  ...prev,
                  {
                    id: createId(),
                    role: 'assistant',
                    parts: [{ type: 'text', text: `⛔ Osiągnięto limit kosztów dla modelu ${modelId}. Zmień model lub zwiększ limit.` }],
                    metadata: { warning: true },
                  },
                ];
                syncActiveChatMessages(nextMessages);
                return nextMessages;
              });
            }
          }
        }
      }
    }
  });

  // -- Effects --
  // Auto-scroll
  useEffect(() => {
    if (!shouldAutoScroll) return;
    if (isUserScrollingRef.current) return;
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, shouldAutoScroll, status]);

  // Persistence
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('masterPrompt', masterPrompt);
  }, [masterPrompt]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('selectedModel', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    writeStoredUserModels(userModels);
  }, [userModels]);

  useEffect(() => {
    writeStoredApiKeys(apiKeys);
  }, [apiKeys]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('chat-temperature', String(temperature));
  }, [temperature]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('model-system-prompts', JSON.stringify(modelSystemPrompts));
  }, [modelSystemPrompts]);

  useEffect(() => {
    lastFilesRef.current = attachedFiles;
  }, [attachedFiles]);

  useEffect(() => {
    writeStoredModelProfiles(modelProfiles);
  }, [modelProfiles]);

  useEffect(() => {
    writeStoredBudget(budgetSettings);
  }, [budgetSettings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('work-mode', workMode);
  }, [workMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('multi-mode-enabled', String(multiModeEnabled));
    localStorage.setItem('multi-mode-models', JSON.stringify(multiModeModels));
  }, [multiModeEnabled, multiModeModels]);

  useEffect(() => {
    writeAuditLog(auditLog);
  }, [auditLog]);

  useEffect(() => {
    writeStoredChats(chats);
  }, [chats]);

  useEffect(() => {
    writeStoredFolders(folders);
  }, [folders]);

  useEffect(() => {
    if (!activeChatId) return;
    writeActiveChatId(activeChatId);
  }, [activeChatId]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [localInput]);

  // -- Handlers --

  const handleFilesChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const nextFiles = await Promise.all(
      fileArray.map(async (file) => {
        const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|tiff|tif|heic|heif|svg|ico|raw|arw|cr2|nrw|k25|dng|nef|orf|rw2|pef|raf|sr2|srf)$/i.test(file.name);
        const mimeType = file.type || (isImage ? 'image/jpeg' : 'text/plain');
        let content = '';
        if (isImage) {
           content = await new Promise<string>((resolve, reject) => {
             const reader = new FileReader();
             reader.onload = () => resolve(reader.result as string);
             reader.onerror = reject;
             reader.readAsDataURL(file);
           });
        } else {
           if (file.size > 2 * 1024 * 1024) {
             const chunk = file.slice(0, 2 * 1024 * 1024);
             content = await chunk.text();
             content += '\n\n[...Plik przycięty (max 2MB)...]';
           } else {
             content = await file.text();
           }
        }

        return {
          name: file.name,
          type: isImage ? 'image' as const : 'text' as const,
          mimeType,
          content,
          lineCount: 0,
          startLine: 1,
          endLine: 0,
          included: true,
        };
      })
    );
    setAttachedFiles((prev) => {
      const enriched = nextFiles.map((f) => {
        if (f.type === 'image') return f;
        const lines = f.content.split('\n');
        const lineCount = lines.length;
        return { ...f, lineCount, endLine: lineCount };
      });
      return [...prev, ...enriched];
    });
  };

  const createChat = (folderId: string | null = null, name?: string) => {
    const trimmedName = name?.trim();
    const newChat: ChatSession = {
      id: createId(),
      name: trimmedName || (chats.length ? `Nowy chat ${chats.length + 1}` : 'Nowy chat'),
      folderId,
      messages: [],
      createdAt: getNow(),
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setMessages([]);
    setLocalInput('');
    setAttachedFiles([]);
    setIsSidebarOpen(false); // Close sidebar on mobile
  };

  const selectChat = (chatId: string) => {
    // Always close sidebar on mobile first
    setIsSidebarOpen(false);
    
    const selected = chats.find((chat) => chat.id === chatId);
    if (!selected) return;
    setActiveChatId(chatId);
    setMessages(selected.messages);
    setLocalInput('');
    setAttachedFiles([]);
  };

  const deleteChat = (chatId: string) => {
    if (!window.confirm('Usunąć chat?')) return;
    setChats((prev) => {
      const next = prev.filter((chat) => chat.id !== chatId);
      if (chatId === activeChatId) {
        const nextActive = next[0];
        setActiveChatId(nextActive?.id ?? '');
        setMessages(nextActive?.messages ?? []);
      }
      return next;
    });
  };

  const deleteFolder = (folderId: string) => {
    if (!window.confirm('Usunąć folder?')) return;
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setChats((prev) => prev.map((c) => (c.folderId === folderId ? { ...c, folderId: null } : c)));
  };

  const renameChat = (chatId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setChats((prev) => prev.map((chat) => (chat.id === chatId ? { ...chat, name: trimmed } : chat)));
  };

  const renameFolder = (folderId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setFolders((prev) => prev.map((folder) => (folder.id === folderId ? { ...folder, name: trimmed } : folder)));
  };

  const moveChatToFolder = (chatId: string, folderId: string | null) => {
    setChats((prev) => prev.map((chat) => (chat.id === chatId ? { ...chat, folderId } : chat)));
  };

  const removeFile = (fileName: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.name !== fileName));
  };

  const updateFileRange = (fileName: string, startLine: number, endLine: number) => {
    setAttachedFiles((prev) =>
      prev.map((file) =>
        file.name === fileName
          ? {
              ...file,
              startLine: Math.max(1, Math.min(startLine, file.lineCount)),
              endLine: Math.max(1, Math.min(endLine, file.lineCount)),
            }
          : file
      )
    );
  };

  const toggleFileIncluded = (fileName: string) => {
    setAttachedFiles((prev) =>
      prev.map((file) => (file.name === fileName ? { ...file, included: !file.included } : file))
    );
  };

  const updateActiveChatField = (field: 'memory' | 'pinnedFacts' | 'privateNotes', value: string) => {
    if (!activeChatId) return;
    setChats((prev) =>
      prev.map((chat) => (chat.id === activeChatId ? { ...chat, [field]: value } : chat))
    );
  };

  const updateModelProfile = (modelId: string, updates: Partial<ModelProfile>) => {
    setModelProfiles((prev) => ({
      ...prev,
      [modelId]: { ...prev[modelId], ...updates },
    }));
  };

  const toggleFallbackModel = (modelId: string, fallbackId: string) => {
    setModelProfiles((prev) => {
      const current = prev[modelId] ?? {};
      const fallbacks = new Set(current.fallbacks ?? []);
      if (fallbacks.has(fallbackId)) fallbacks.delete(fallbackId);
      else fallbacks.add(fallbackId);
      return { ...prev, [modelId]: { ...current, fallbacks: Array.from(fallbacks) } };
    });
  };

  const toggleMultiModel = (modelId: string) => {
    setMultiModeModels((prev) => {
      const set = new Set(prev);
      if (set.has(modelId)) set.delete(modelId);
      else set.add(modelId);
      return Array.from(set);
    });
  };

  const exportBackup = () => {
    const payload = {
      chats,
      folders,
      apiKeys,
      userModels,
      modelProfiles,
      modelSystemPrompts,
      budgetSettings,
      workMode,
      multiModeEnabled,
      multiModeModels,
      auditLog,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'open-kaap-backup.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Partial<{
        chats: ChatSession[];
        folders: ChatFolder[];
        apiKeys: ApiKeys;
        userModels: ModelConfig[];
        modelProfiles: ModelProfiles;
        modelSystemPrompts: ModelPrompts;
        budgetSettings: BudgetSettings;
        workMode: string;
        multiModeEnabled: boolean;
        multiModeModels: string[];
        auditLog: AuditEntry[];
      }>;
      if (data.chats) setChats(data.chats);
      if (data.folders) setFolders(data.folders);
      if (data.apiKeys) setApiKeys(data.apiKeys);
      if (data.userModels) setUserModels(data.userModels);
      if (data.modelProfiles) setModelProfiles(data.modelProfiles);
      if (data.modelSystemPrompts) setModelSystemPrompts(data.modelSystemPrompts);
      if (data.budgetSettings) setBudgetSettings(data.budgetSettings);
      if (data.workMode) setWorkMode(data.workMode);
      if (typeof data.multiModeEnabled === 'boolean') setMultiModeEnabled(data.multiModeEnabled);
      if (data.multiModeModels) setMultiModeModels(data.multiModeModels);
      if (data.auditLog) setAuditLog(data.auditLog);
    } catch {
      setMessages((prev: ChatMessage[]) => {
        const nextMessages: ChatMessage[] = [
          ...prev,
          {
            id: createId(),
            role: 'assistant',
            parts: [{ type: 'text', text: '⚠️ Nie udało się zaimportować backupu.' }],
            metadata: { error: true },
          },
        ];
        syncActiveChatMessages(nextMessages);
        return nextMessages;
      });
    }
  };

  const handleSubmit = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    
    // Allow stopping if streaming
    if (status === 'streaming') {
      stop();
      return;
    }

     const resolvedInput = safeInput;
     if (!resolvedInput.trim() && attachedFiles.length === 0) {
      setMessages((prev: ChatMessage[]) => {
        const nextMessages: ChatMessage[] = [
          ...prev,
          {
            id: createId(),
            role: 'assistant',
            parts: [{ type: 'text', text: '⚠️ Wiadomość jest pusta. Dodaj treść lub plik.\nKod: E_EMPTY' }],
            metadata: { error: true, errorMessage: 'Wiadomość jest pusta', errorCode: 'E_EMPTY', errorDescription: 'Wiadomość jest pusta' },
          },
        ];
        syncActiveChatMessages(nextMessages);
        return nextMessages;
      });
       return;
     }

    const textFiles = attachedFiles.filter((file) => file.included && file.type !== 'image');
    const imageFiles = attachedFiles.filter((file) => file.included && file.type === 'image');

    const fileContext = textFiles
      .map((file) => {
        const lines = file.content.split('\n');
        const start = Math.max(1, Math.min(file.startLine, file.lineCount));
        const end = Math.max(start, Math.min(file.endLine, file.lineCount));
        const slice = lines.slice(start - 1, end).join('\n');
        return `\n\n[Plik: ${file.name} | Linie: ${start}-${end}]\n${slice}`;
      })
      .join('');
    
     let fullText = fileContext ? `${resolvedInput}\n\nZałączone pliki:${fileContext}` : resolvedInput;
     
     // Ensure text is not empty if we have images but no text
     if (!fullText.trim() && imageFiles.length > 0) {
        fullText = ' '; // Space to satisfy required content
     }
     
     const imageAttachments = imageFiles.map(f => ({
        name: f.name,
        contentType: f.mimeType || 'image/jpeg',
        url: f.content
     }));
    
     lastUserMessageRef.current = fullText;
    setAttachedFiles([]);
    setLocalInput('');
    
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const modelProfile = modelProfiles[selectedModel] ?? {};
    const modeTemperatureMap: Record<string, number> = {
      szybki: 0.3,
      analityczny: 0.5,
      kreatywny: 0.9,
      oszczedny: 0.2,
    };
    const effectiveTemperature =
      typeof modelProfile.temperature === 'number'
        ? modelProfile.temperature
        : modeTemperatureMap[workMode] ?? temperature;

    const overBudget =
      budgetSettings.monthlyBudgetUSD > 0 && monthlyUsage.costUSD >= budgetSettings.monthlyBudgetUSD;
    const perModelLimit = budgetSettings.perModelLimitUSD[selectedModel];
    const perModelCost = monthlyModelUsage[selectedModel]?.costUSD ?? 0;
    if (overBudget || (perModelLimit && perModelCost >= perModelLimit)) {
      setMessages((prev: ChatMessage[]) => {
        const nextMessages: ChatMessage[] = [
          ...prev,
          {
            id: createId(),
            role: 'assistant',
            parts: [
              {
                type: 'text',
                text: overBudget
                  ? '⛔ Osiągnięto miesięczny limit kosztów. Zmień limit lub odczekaj do nowego miesiąca.'
                  : `⛔ Osiągnięto limit kosztów dla modelu ${selectedModel}. Zmień model lub zwiększ limit.`,
              },
            ],
            metadata: { warning: true },
          },
        ];
        syncActiveChatMessages(nextMessages);
        return nextMessages;
      });
      return;
    }

     try {
       if (multiModeEnabled && multiModeModels.length > 0) {
         const userMessage: ChatMessage = {
           id: createId(),
           role: 'user',
          parts: [{ type: 'text', text: fullText }],
         };
         const nextMessages = [...messages, userMessage];
         setMessages(nextMessages);
         syncActiveChatMessages(nextMessages);
         const res = await fetch('/api/chat', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             action: 'multi',
             models: [selectedModel, ...multiModeModels.filter((id) => id !== selectedModel)],
             messages: nextMessages,
             masterPrompt,
             temperature: effectiveTemperature,
             topP: modelProfile.topP,
             modelSystemPrompts,
             memory: activeChat?.memory,
             pinnedFacts: activeChat?.pinnedFacts,
             mode: workMode,
             apiKeys,
           }),
         });
         const json = await res.json();
         const results = Array.isArray(json.results) ? json.results : [];
         const mergedText = json.mergedText ? String(json.mergedText) : '';
         const responseText = [
           '### Porównanie modeli',
           ...results.map((r: { model: string; text?: string; error?: string }) =>
             r.text
               ? `#### ${r.model}\n${r.text}`
               : `#### ${r.model}\nBłąd: ${r.error || 'Nieznany błąd'}`
           ),
           mergedText ? `### Scalone\n${mergedText}` : '',
         ]
           .filter(Boolean)
           .join('\n\n');
         const assistantMessage: ChatMessage = {
           id: createId(),
           role: 'assistant',
           parts: [{ type: 'text', text: responseText }],
         };
         const finalMessages = [...nextMessages, assistantMessage];
         setMessages(finalMessages);
         syncActiveChatMessages(finalMessages);
       } else {
        const messagePayload: ChatMessageWithAttachments = {
          id: createId(),
          role: 'user',
          parts: [{ type: 'text', text: fullText }],
          experimental_attachments: imageAttachments,
        };
        await sendMessage(messagePayload, {
          body: {
            model: selectedModel,
            masterPrompt,
            temperature: effectiveTemperature,
            topP: modelProfile.topP,
            modelSystemPrompt: activeModelSystemPrompt,
            modelSystemPrompts,
            memory: activeChat?.memory,
            pinnedFacts: activeChat?.pinnedFacts,
            fallbackModels: modelProfile.fallbacks ?? [],
            mode: workMode,
            apiKeys,
          },
        });
       }
     } catch (err: unknown) {
       const rawMessage = err instanceof Error ? err.message : '';
       const matched = mapError(rawMessage);
       const provider = detectProvider(selectedModel);
      setMessages((prev: ChatMessage[]) => {
        const nextMessages: ChatMessage[] = [
          ...prev,
          {
            id: createId(),
            role: 'assistant',
            parts: [{ type: 'text', text: `⚠️ ${matched.description}\nKod: ${matched.code}` }],
            metadata: { 
              error: true, 
              errorMessage: rawMessage || matched.description, 
              errorCode: matched.code, 
              errorDescription: matched.description,
              attemptedText: fullText,
              errorModel: selectedModel,
              errorProvider: provider,
            },
          },
        ];
        syncActiveChatMessages(nextMessages);
        return nextMessages;
      });
     }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Search Filtering
  const visibleMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return (messages as ChatMessage[]).filter(m => getMessageText(m).toLowerCase().includes(q));
  }, [messages, searchQuery]);

  const isLoading = status === 'streaming' || status === 'submitted';
  const lastPromptCostPLN = lastUsage.costUSD * USD_TO_PLN;

  // -- Render --

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground font-sans overflow-hidden">
      
      {/* --- Mobile Header --- */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors"
              aria-label="Twoje czaty"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 text-[10px] rounded bg-background border border-border/50 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              Twoje czaty
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold leading-tight">Open Kaap Pro</h1>
              <button
                onClick={() => setIsSettingsOpen(true)}
                aria-label="Zobacz statystyki miesiąca"
                className="flex items-center gap-1.5 text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded-md text-muted-foreground font-mono hover:bg-secondary"
              >
                <span className="uppercase">{monthLabel}</span>
                <span className="opacity-30">·</span>
                <span>{(monthlyUsage.costUSD * USD_TO_PLN).toFixed(2)} PLN</span>
                <span className="opacity-30">|</span>
                <span>{(monthlyUsage.totalTokens / 1000).toFixed(1)}k</span>
              </button>
            </div>
            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
              {selectedModelLabel}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <div className="relative group">
            <button 
              onClick={() => setIsSearchVisible(!isSearchVisible)}
              className={cn("p-2 rounded-full transition-colors", isSearchVisible ? "bg-secondary" : "hover:bg-secondary")}
              aria-label="Szukaj w czacie"
            >
              <Search className="w-5 h-5" />
            </button>
            <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 text-[10px] rounded bg-background border border-border/50 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              Szukaj w czacie
            </span>
          </div>
          <div className="relative group">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
              aria-label="Ustawienia"
            >
              <Settings className="w-5 h-5" />
            </button>
            <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 text-[10px] rounded bg-background border border-border/50 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              Ustawienia
            </span>
          </div>
          <div className="relative group">
            <button 
              onClick={() => createChat()}
              className="p-2 hover:bg-secondary rounded-full transition-colors text-primary"
              aria-label="Nowy chat"
            >
              <Plus className="w-5 h-5" />
            </button>
            {isNewChatOpening && (
              <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary/40 animate-ping" />
            )}
            <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 text-[10px] rounded bg-background border border-border/50 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              Nowy chat
            </span>
          </div>
        </div>
      </header>

      <ChatSearchBar
        isVisible={isSearchVisible}
        query={searchQuery}
        resultCount={visibleMessages.length}
        onQueryChange={setSearchQuery}
        onClose={() => setIsSearchVisible(false)}
      />

      {/* --- Chat Area --- */}
      <main 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth"
        onScroll={() => {
          const container = messagesContainerRef.current;
          if (!container) return;
          const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
          const isNearBottom = distanceToBottom < 100;
          setShouldAutoScroll(isNearBottom);
          isUserScrollingRef.current = !isNearBottom;
        }}
      >
        {visibleMessages.length === 0 ? (
          <ChatEmptyState />
        ) : (
          visibleMessages.map((m) => {
            const isUser = m.role === 'user';
            const displayText = getMessageText(m);
            const isError = !!m.metadata?.error;
            return (
              <div 
                key={m.id} 
                className={cn(
                  "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300", 
                  isUser ? "justify-end" : "justify-start"
                )}
              >
                <div className={cn(
                  "max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3.5 text-sm md:text-base shadow-sm break-words leading-relaxed",
                  isUser 
                    ? "bg-primary text-primary-foreground rounded-tr-sm" 
                    : isError 
                      ? "bg-red-50 dark:bg-rose-900 border border-red-300 text-red-700 dark:text-red-100 rounded-tl-sm"
                      : "bg-white dark:bg-zinc-900 border border-border/50 text-foreground rounded-tl-sm"
                )}>
                  {/* Message Content */}
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-2 prose-pre:bg-secondary/50 prose-pre:p-3 prose-pre:rounded-xl">
                    {m.parts && m.parts.length > 0 ? (
                      m.parts.map((part, i) => (
                        <div key={i}>
                          {part.type === 'text' && (
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                code({ className, children, ...props }: CodeProps) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const isInline = !match && props.inline;
                                  return !isInline ? (
                                    <div className="relative group">
                                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => navigator.clipboard.writeText(String(children))}
                                          className="p-1 bg-background/80 backdrop-blur rounded text-xs border border-border/40"
                                        >
                                          Kopiuj
                                        </button>
                                      </div>
                                      <code className={cn(className, "block overflow-x-auto text-xs sm:text-sm font-mono")} {...props}>
                                        {children}
                                      </code>
                                    </div>
                                  ) : (
                                    <code className="bg-secondary/50 px-1 py-0.5 rounded text-[0.9em] font-mono" {...props}>
                                      {children}
                                    </code>
                                  );
                                }
                              }}
                            >
                              {part.text}
                            </ReactMarkdown>
                          )}
                        </div>
                      ))
                    ) : (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ className, children, ...props }: CodeProps) {
                            const match = /language-(\w+)/.exec(className || '');
                            const isInline = !match && props.inline;
                            return !isInline ? (
                              <div className="relative group">
                                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => navigator.clipboard.writeText(String(children))}
                                    className="p-1 bg-background/80 backdrop-blur rounded text-xs border border-border/40"
                                  >
                                    Kopiuj
                                  </button>
                                </div>
                                <code className={cn(className, "block overflow-x-auto text-xs sm:text-sm font-mono")} {...props}>
                                  {children}
                                </code>
                              </div>
                            ) : (
                              <code className="bg-secondary/50 px-1 py-0.5 rounded text-[0.9em] font-mono" {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {displayText}
                      </ReactMarkdown>
                    )}
                    {!isUser && isError && (
                      <div className="mt-3 text-[10px] font-mono">
                        <div className="flex items-center gap-2">
                          {m.metadata?.errorCode && (
                            <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-rose-800 text-red-700 dark:text-red-100 border border-red-300">
                              {m.metadata?.errorCode}
                            </span>
                          )}
                          <button
                            onClick={() => {
                              const id = m.id;
                              setExpandedErrorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                            }}
                            className="underline decoration-dotted hover:opacity-80"
                          >
                            Szczegóły
                          </button>
                        </div>
                        {expandedErrorIds.includes(m.id) && (
                          <div className="mt-2 p-2 rounded bg-white/50 dark:bg-black/20 border border-red-200 dark:border-rose-700">
                            {m.metadata?.errorMessage}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Message Actions */}
                  <div className={cn("flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity", isUser ? "text-primary-foreground/60" : "text-muted-foreground")}>
                    <button 
                      onClick={() => {
                         navigator.clipboard.writeText(displayText);
                         setCopiedMessageId(m.id);
                         setTimeout(() => setCopiedMessageId(null), 1500);
                      }}
                      className="text-[10px] hover:underline flex items-center gap-1"
                    >
                      {copiedMessageId === m.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedMessageId === m.id ? 'Skopiowano' : 'Kopiuj'}
                    </button>
                    {isError && m.metadata?.attemptedText && (
                      <button
                        onClick={() => {
                          const attemptedText = m.metadata?.attemptedText;
                          if (!attemptedText || status === 'streaming') return;
                          lastUserMessageRef.current = attemptedText;
                          const modelProfile = modelProfiles[selectedModel] ?? {};
                          const modeTemperatureMap: Record<string, number> = {
                            szybki: 0.3,
                            analityczny: 0.5,
                            kreatywny: 0.9,
                            oszczedny: 0.2,
                          };
                          const effectiveTemperature =
                            typeof modelProfile.temperature === 'number'
                              ? modelProfile.temperature
                              : modeTemperatureMap[workMode] ?? temperature;
                          sendMessage(
                            { text: attemptedText },
                            {
                              body: {
                                model: selectedModel,
                                masterPrompt,
                                temperature: effectiveTemperature,
                                topP: modelProfile.topP,
                                modelSystemPrompt: activeModelSystemPrompt,
                                modelSystemPrompts,
                                memory: activeChat?.memory,
                                pinnedFacts: activeChat?.pinnedFacts,
                                fallbackModels: modelProfile.fallbacks ?? [],
                                mode: workMode,
                                apiKeys,
                              },
                            }
                          );
                        }}
                        className="text-[10px] hover:underline flex items-center gap-1"
                      >
                        <ArrowUp className="w-3 h-3" />
                        Ponów
                      </button>
                    )}
                    {isUser && (
                      <button 
                        onClick={() => {
                          // Ideally open a modal or replace content inline. For simplicity, just populate input?
                          // Let's populate the main input for now as a "quote/edit" behavior or separate mode.
                          // Actually, let's keep it simple: populate main input
                          setLocalInput(displayText);
                          if(textareaRef.current) textareaRef.current.focus();
                        }}
                        className="text-[10px] hover:underline flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edytuj
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {isLoading && (
          <div className="flex justify-start animate-in fade-in">
             <div className="bg-secondary/50 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
                <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
             </div>
          </div>
        )}
        
        <div ref={messagesEndRef} className="h-4" />
      </main>

      {/* --- Input Area --- */}
      <div className="p-3 bg-background/80 backdrop-blur-md border-t border-border/40 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex items-end gap-2">
          
          <button
            type="button"
            className="p-3 text-muted-foreground hover:bg-secondary rounded-full transition-colors shrink-0"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <Paperclip className="w-5 h-5" />
            <input 
              id="file-upload" 
              type="file" 
              multiple 
              className="hidden" 
              onChange={(e) => handleFilesChange(e.target.files)}
            />
          </button>

          <div className="flex-1 bg-secondary/50 rounded-3xl border border-transparent focus-within:border-primary/20 focus-within:bg-background transition-all flex flex-col min-h-[48px]">
            {attachedFiles.length > 0 && (
              <div className="px-4 pt-3 space-y-2">
                {attachedFiles.map((file) => {
                  if (file.type === 'image') {
                    return (
                      <div key={file.name} className="bg-background text-[10px] rounded-md border border-border/50 shadow-sm p-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={file.included}
                          onChange={() => toggleFileIncluded(file.name)}
                        />
                         {/* Thumbnail */}
                        <div className="w-10 h-10 shrink-0 rounded overflow-hidden bg-secondary border border-border/50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={file.content} alt={file.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium" title={file.name}>{file.name}</div>
                          <div className="text-muted-foreground text-[9px] uppercase">{file.mimeType?.split('/')[1] || 'IMG'}</div>
                        </div>
                        <button onClick={() => removeFile(file.name)} className="ml-auto text-muted-foreground hover:text-destructive p-1">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  }

                  const start = Math.max(1, Math.min(file.startLine, file.lineCount));
                  const end = Math.max(start, Math.min(file.endLine, file.lineCount));
                  const previewLines = file.content.split('\n').slice(start - 1, end).slice(0, 20);
                  const preview = previewLines.map(line => line.length > 300 ? line.slice(0, 300) + '... (przycięto)' : line).join('\n');
                  return (
                    <div key={file.name} className="bg-background text-[10px] rounded-md border border-border/50 shadow-sm p-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={file.included}
                          onChange={() => toggleFileIncluded(file.name)}
                        />
                        <span className="truncate max-w-[160px] font-medium">{file.name}</span>
                        <span className="text-muted-foreground">{file.lineCount} linii</span>
                        <button onClick={() => removeFile(file.name)} className="ml-auto text-muted-foreground hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-muted-foreground">Zakres</span>
                        <input
                          type="number"
                          min={1}
                          max={file.lineCount}
                          value={start}
                          onChange={(e) => updateFileRange(file.name, Number(e.target.value), end)}
                          className="w-16 bg-secondary/40 border border-border/50 rounded px-1 py-0.5"
                        />
                        <span className="text-muted-foreground">–</span>
                        <input
                          type="number"
                          min={1}
                          max={file.lineCount}
                          value={end}
                          onChange={(e) => updateFileRange(file.name, start, Number(e.target.value))}
                          className="w-16 bg-secondary/40 border border-border/50 rounded px-1 py-0.5"
                        />
                      </div>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-muted-foreground">Podgląd (pierwsze 20 linii zakresu)</summary>
                        <pre className="mt-2 max-h-32 overflow-auto bg-secondary/40 rounded p-2 whitespace-pre-wrap">{preview || 'Brak treści w zakresie.'}</pre>
                      </details>
                    </div>
                  );
                })}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={safeInput}
              onChange={(e) => {
                const val = e.target.value;
                setLocalInput(val);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Napisz wiadomość..."
              rows={1}
              className="w-full bg-transparent px-4 py-3 text-sm md:text-base focus:outline-none resize-none max-h-[150px] overflow-y-auto rounded-3xl"
              disabled={status === 'streaming'}
            />
          </div>

          <button
            type="submit"
            className={cn(
              "p-3 rounded-full transition-all shrink-0 shadow-sm",
              (status === 'streaming')
                ? "bg-destructive text-destructive-foreground hover:opacity-90 shadow-md"
                : ((safeInput.trim()) || attachedFiles.length > 0)
                  ? "bg-primary text-primary-foreground hover:opacity-90 shadow-md"
                   : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            )}
          >
            {status === 'streaming' ? (
               <div className="w-3 h-3 bg-current rounded-sm" />
            ) : (
              <ArrowUp className="w-5 h-5" />
            )}
          </button>
        </form>
        <div className="text-[10px] text-center text-muted-foreground mt-2 opacity-60">
           Koszt ost. zapytania: {lastPromptCostPLN.toFixed(2)} PLN
        </div>
      </div>

      <ChatSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        folders={folders}
        chats={chats}
        activeChatId={activeChatId}
        newChatName={newChatName}
        newChatFolderId={newChatFolderId}
        newFolderName={newFolderName}
        editingChatId={editingChatId}
        editingChatName={editingChatName}
        editingFolderId={editingFolderId}
        editingFolderName={editingFolderName}
        setNewChatName={setNewChatName}
        setNewChatFolderId={setNewChatFolderId}
        setNewFolderName={setNewFolderName}
        setEditingChatId={setEditingChatId}
        setEditingChatName={setEditingChatName}
        setEditingFolderId={setEditingFolderId}
        setEditingFolderName={setEditingFolderName}
        createChat={createChat}
        renameChat={renameChat}
        renameFolder={renameFolder}
        deleteChat={deleteChat}
        selectChat={selectChat}
        moveChatToFolder={moveChatToFolder}
        deleteFolder={deleteFolder}
        createFolder={(name) => setFolders((prev) => [...prev, { id: createId(), name }])}
      />

      <ChatSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        allModels={allModels}
        selectedModel={selectedModel}
        selectedModelLabel={selectedModelLabel}
        setSelectedModel={setSelectedModel}
        isCustomModel={isCustomModel}
        customModelId={customModelId}
        setCustomModelId={setCustomModelId}
        apiKeys={apiKeys}
        setApiKeys={setApiKeys}
        masterPrompt={masterPrompt}
        setMasterPrompt={setMasterPrompt}
        resolveProvider={resolveProvider}
        providerStatuses={providerStatuses}
        setProviderStatuses={setProviderStatuses}
        workMode={workMode}
        setWorkMode={setWorkMode}
        activeProfile={activeProfile}
        updateModelProfile={updateModelProfile}
        fallbackCandidates={fallbackCandidates}
        selectedFallbacks={selectedFallbacks}
        toggleFallbackModel={toggleFallbackModel}
        multiModeEnabled={multiModeEnabled}
        setMultiModeEnabled={setMultiModeEnabled}
        multiModeModels={multiModeModels}
        toggleMultiModel={toggleMultiModel}
        budgetSettings={budgetSettings}
        setBudgetSettings={setBudgetSettings}
        activeChat={activeChat}
        updateActiveChatField={updateActiveChatField}
        temperature={temperature}
        setTemperature={setTemperature}
        activeModelSystemPrompt={activeModelSystemPrompt}
        setModelSystemPrompts={setModelSystemPrompts}
        monthlyUsage={monthlyUsage}
        expensiveModel={expensiveModel}
        cheapestModel={cheapestModel}
        costHints={costHints}
        totalUsageByModel={totalUsageByModel}
        topChats={topChats}
        activeChatAnalytics={activeChatAnalytics}
        activePromptUsage={activePromptUsage}
        auditLog={auditLog}
        exportBackup={exportBackup}
        importBackup={importBackup}
      />

    </div>
  );
}
