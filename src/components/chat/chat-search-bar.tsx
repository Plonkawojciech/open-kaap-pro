import { Search, X } from 'lucide-react';

type ChatSearchBarProps = {
  isVisible: boolean;
  query: string;
  resultCount: number;
  onQueryChange: (value: string) => void;
  onClose: () => void;
};

export function ChatSearchBar({ isVisible, query, resultCount, onQueryChange, onClose }: ChatSearchBarProps) {
  if (!isVisible) return null;

  return (
    <div className="px-4 py-2 bg-secondary/30 border-b border-border/40 shrink-0 animate-in slide-in-from-top-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Szukaj w rozmowie..."
          className="w-full bg-background pl-9 pr-8 py-2 rounded-xl text-sm border-none focus:ring-1 focus:ring-primary/20 transition-all shadow-sm"
          autoFocus
        />
        {query && (
          <button
            onClick={() => onQueryChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded-full"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>
      <div className="flex justify-between items-center mt-2 px-1">
        <span className="text-[10px] text-muted-foreground">Znaleziono: {resultCount}</span>
        <button onClick={onClose} className="text-[10px] font-medium text-primary">
          Zamknij
        </button>
      </div>
    </div>
  );
}
