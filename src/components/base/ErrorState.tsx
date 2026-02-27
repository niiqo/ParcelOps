type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="base-error-state">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry}>
          Reintentar
        </button>
      ) : null}
    </div>
  );
}
