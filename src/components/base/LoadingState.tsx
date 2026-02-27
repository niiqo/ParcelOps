type LoadingStateProps = {
  lines?: number;
};

export default function LoadingState({ lines = 3 }: LoadingStateProps) {
  return (
    <div className="base-loading-state" aria-live="polite" aria-busy="true">
      {Array.from({ length: lines }).map((_, idx) => (
        <div key={`skeleton-${idx}`} className="base-loading-state__line" />
      ))}
    </div>
  );
}
