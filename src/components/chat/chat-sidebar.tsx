import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatFolder, ChatSession } from '@/lib/chat-state';

type ChatSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  folders: ChatFolder[];
  chats: ChatSession[];
  activeChatId: string;
  newChatName: string;
  newChatFolderId: string;
  newFolderName: string;
  editingChatId: string | null;
  editingChatName: string;
  editingFolderId: string | null;
  editingFolderName: string;
  setNewChatName: (value: string) => void;
  setNewChatFolderId: (value: string) => void;
  setNewFolderName: (value: string) => void;
  setEditingChatId: (value: string | null) => void;
  setEditingChatName: (value: string) => void;
  setEditingFolderId: (value: string | null) => void;
  setEditingFolderName: (value: string) => void;
  createChat: (folderId?: string | null, name?: string) => void;
  renameChat: (chatId: string, name: string) => void;
  renameFolder: (folderId: string, name: string) => void;
  deleteChat: (chatId: string) => void;
  selectChat: (chatId: string) => void;
  moveChatToFolder: (chatId: string, folderId: string | null) => void;
  deleteFolder: (folderId: string) => void;
  createFolder: (name: string) => void;
};

export function ChatSidebar({
  isOpen,
  onClose,
  folders,
  chats,
  activeChatId,
  newChatName,
  newChatFolderId,
  newFolderName,
  editingChatId,
  editingChatName,
  editingFolderId,
  editingFolderName,
  setNewChatName,
  setNewChatFolderId,
  setNewFolderName,
  setEditingChatId,
  setEditingChatName,
  setEditingFolderId,
  setEditingFolderName,
  createChat,
  renameChat,
  renameFolder,
  deleteChat,
  selectChat,
  moveChatToFolder,
  deleteFolder,
  createFolder,
}: ChatSidebarProps) {
  const ungroupedChats = chats.filter((chat) => !chat.folderId);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 bg-background border-r border-border shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 border-b border-border/40 flex items-center justify-between">
          <span className="font-bold text-lg">Twoje chaty</span>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="grid gap-2 p-3 rounded-xl border border-border/50 bg-secondary/20">
            <input
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const folderId = newChatFolderId === 'none' ? null : newChatFolderId;
                  createChat(folderId, newChatName);
                  setNewChatName('');
                  setNewChatFolderId('none');
                }
              }}
              placeholder="Nazwa chatu (opcjonalnie)"
              className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary/20 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <select
                value={newChatFolderId}
                onChange={(e) => setNewChatFolderId(e.target.value)}
                className="flex-1 bg-background border border-border/50 rounded-lg px-2 py-2 text-xs focus:ring-1 focus:ring-primary/20 focus:outline-none"
              >
                <option value="none">Bez folderu</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const folderId = newChatFolderId === 'none' ? null : newChatFolderId;
                  createChat(folderId, newChatName);
                  setNewChatName('');
                  setNewChatFolderId('none');
                }}
                className="px-3 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                Dodaj chat
              </button>
            </div>
            <div className="text-[10px] text-muted-foreground">Enter tworzy chat. Nazwa i folder są opcjonalne.</div>
          </div>

          <div className="space-y-4">
            {folders.map((folder) => {
              const folderChats = chats.filter((chat) => chat.folderId === folder.id);
              return (
                <div key={folder.id} className="space-y-2">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground font-semibold px-2 gap-2">
                    {editingFolderId === folder.id ? (
                      <input
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onBlur={() => {
                          renameFolder(folder.id, editingFolderName);
                          setEditingFolderId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            renameFolder(folder.id, editingFolderName);
                            setEditingFolderId(null);
                          }
                          if (e.key === 'Escape') {
                            setEditingFolderId(null);
                          }
                        }}
                        className="flex-1 bg-background border border-border/50 rounded px-2 py-1 text-[10px] focus:ring-1 focus:ring-primary/20 focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate">{folder.name}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground/70">{folderChats.length}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => createChat(folder.id)} className="p-1 rounded hover:bg-secondary/60">
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingFolderId(folder.id);
                          setEditingFolderName(folder.name);
                        }}
                        className="p-1 rounded hover:bg-secondary/60"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => deleteFolder(folder.id)} className="p-1 rounded hover:bg-secondary/60">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {folderChats.length === 0 && (
                    <div className="px-3 text-[10px] text-muted-foreground">Brak chatów w folderze.</div>
                  )}
                  {folderChats.map((chat) => (
                    <div key={chat.id} className="group flex items-center gap-2">
                      {editingChatId === chat.id ? (
                        <input
                          value={editingChatName}
                          onChange={(e) => setEditingChatName(e.target.value)}
                          onBlur={() => {
                            renameChat(chat.id, editingChatName);
                            setEditingChatId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              renameChat(chat.id, editingChatName);
                              setEditingChatId(null);
                            }
                            if (e.key === 'Escape') {
                              setEditingChatId(null);
                            }
                          }}
                          className="flex-1 bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary/20 focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => selectChat(chat.id)}
                          className={cn(
                            "flex-1 text-left p-3 rounded-xl text-sm transition-all truncate",
                            chat.id === activeChatId
                              ? "bg-secondary font-medium text-foreground"
                              : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {chat.name}
                        </button>
                      )}
                      <select
                        value={chat.folderId ?? 'none'}
                        onChange={(e) => moveChatToFolder(chat.id, e.target.value === 'none' ? null : e.target.value)}
                        className="w-24 bg-background border border-border/50 rounded-lg px-2 py-2 text-[10px] focus:ring-1 focus:ring-primary/20 focus:outline-none"
                      >
                        <option value="none">Bez folderu</option>
                        {folders.map((target) => (
                          <option key={target.id} value={target.id}>
                            {target.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          setEditingChatId(chat.id);
                          setEditingChatName(chat.name);
                        }}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-secondary/60"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-secondary/60"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground font-semibold px-2">
                <span>Ostatnie</span>
                <span className="text-[10px] text-muted-foreground/70">{ungroupedChats.length}</span>
              </div>
              {ungroupedChats.map((chat) => (
                <div key={chat.id} className="group flex items-center gap-2">
                  {editingChatId === chat.id ? (
                    <input
                      value={editingChatName}
                      onChange={(e) => setEditingChatName(e.target.value)}
                      onBlur={() => {
                        renameChat(chat.id, editingChatName);
                        setEditingChatId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          renameChat(chat.id, editingChatName);
                          setEditingChatId(null);
                        }
                        if (e.key === 'Escape') {
                          setEditingChatId(null);
                        }
                      }}
                      className="flex-1 bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary/20 focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => selectChat(chat.id)}
                      className={cn(
                        "flex-1 text-left p-3 rounded-xl text-sm transition-all truncate",
                        chat.id === activeChatId
                          ? "bg-secondary font-medium"
                          : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {chat.name}
                    </button>
                  )}
                  <select
                    value={chat.folderId ?? 'none'}
                    onChange={(e) => moveChatToFolder(chat.id, e.target.value === 'none' ? null : e.target.value)}
                    className="w-24 bg-background border border-border/50 rounded-lg px-2 py-2 text-[10px] focus:ring-1 focus:ring-primary/20 focus:outline-none"
                  >
                    <option value="none">Bez folderu</option>
                    {folders.map((target) => (
                      <option key={target.id} value={target.id}>
                        {target.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setEditingChatId(chat.id);
                      setEditingChatName(chat.name);
                    }}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-secondary/60"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(chat.id);
                    }}
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-secondary/60"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {ungroupedChats.length === 0 && (
                <div className="px-3 text-[10px] text-muted-foreground">Brak chatów bez folderu.</div>
              )}
            </div>
            {folders.length === 0 && ungroupedChats.length === 0 && (
              <div className="text-[10px] text-muted-foreground text-center py-6">
                Brak chatów. Dodaj pierwszy chat lub folder.
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border/40">
          <div className="flex items-center gap-2">
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const name = newFolderName.trim();
                  if (!name) return;
                  createFolder(name);
                  setNewFolderName('');
                }
              }}
              placeholder="Nowy folder"
              className="flex-1 bg-background border border-border/50 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary/20 focus:outline-none"
            />
            <button
              onClick={() => {
                const name = newFolderName.trim();
                if (!name) return;
                createFolder(name);
                setNewFolderName('');
              }}
              className="px-3 py-2 text-xs font-medium bg-secondary/70 hover:bg-secondary rounded-lg transition-colors"
            >
              Dodaj
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
