export default function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 animate-fade-in">
      <div className="h-10 rounded-xl bg-hawker-border animate-pulse" />
      <div className="flex gap-2">
        {[72, 56, 64, 48, 40].map(w => (
          <div key={w} className="h-7 rounded-full bg-hawker-border animate-pulse" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl bg-hawker-border animate-pulse"
          style={{ height: 62, animationDelay: `${i * 0.04}s` }}
        />
      ))}
    </div>
  )
}