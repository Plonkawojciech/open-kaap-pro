export function ChatEmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-8 space-y-4">
      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
        <div className="w-8 h-8 bg-foreground rounded-full" />
      </div>
      <div>
        <h3 className="text-lg font-bold">Witaj w Open Kaap</h3>
        <p className="text-sm text-muted-foreground mt-1">Wybierz model i zacznij pisać.</p>
      </div>
    </div>
  );
}
