export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">Bu bo'lim keyingi bosqichda to'ldiriladi.</p>
    </div>
  );
}
