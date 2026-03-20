export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center animate-fade-in">
      <span className="text-5xl mb-4 select-none">🍜</span>
      <h3 className="font-display text-xl text-hawker-dark mb-2">Couldn't load data</h3>
      <p className="text-sm text-hawker-muted leading-relaxed mb-6">
        {message ?? 'Something went wrong fetching hawker centre data.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2.5 bg-hawker-red text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  )
}