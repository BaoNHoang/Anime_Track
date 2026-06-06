export function LoadingState({ cards = 6 }: { cards?: number }) {
  return (
    <div className="anime-grid" aria-label="Loading anime">
      {Array.from({ length: cards }, (_, index) => (
        <div className="skeleton-card" key={index}>
          <div className="skeleton skeleton--poster" />
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--meta" />
        </div>
      ))}
    </div>
  );
}
