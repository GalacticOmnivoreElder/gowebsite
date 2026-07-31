const SIGNAL_FRAGMENTS = [
  { left: "5%", top: "28%", size: "h-1 w-5", tone: "opacity-30" },
  { left: "14%", top: "67%", size: "h-2 w-8", tone: "opacity-50" },
  { left: "27%", top: "48%", size: "h-1.5 w-3", tone: "opacity-40" },
  { left: "39%", top: "76%", size: "h-3 w-10", tone: "opacity-[.65]" },
  { left: "54%", top: "58%", size: "h-1 w-6", tone: "opacity-[.35]" },
  { left: "68%", top: "82%", size: "h-2 w-12", tone: "opacity-70" },
  { left: "82%", top: "64%", size: "h-1.5 w-5", tone: "opacity-[.45]" },
  { left: "93%", top: "86%", size: "h-2 w-7", tone: "opacity-60" },
  {
    left: "9%",
    top: "88%",
    size: "h-1.5 w-4",
    tone: "hidden opacity-60 sm:block",
  },
  {
    left: "33%",
    top: "38%",
    size: "h-2 w-6",
    tone: "hidden opacity-[.35] sm:block",
  },
  {
    left: "61%",
    top: "72%",
    size: "h-1 w-4",
    tone: "hidden opacity-50 sm:block",
  },
  {
    left: "76%",
    top: "42%",
    size: "h-3 w-7",
    tone: "hidden opacity-30 sm:block",
  },
  {
    left: "20%",
    top: "80%",
    size: "h-2 w-14",
    tone: "hidden opacity-[.55] lg:block",
  },
  {
    left: "47%",
    top: "90%",
    size: "h-1 w-5",
    tone: "hidden opacity-[.45] lg:block",
  },
  {
    left: "88%",
    top: "34%",
    size: "h-2 w-9",
    tone: "hidden opacity-30 lg:block",
  },
];

export function PixelSectionDivider({ className = "" }) {
  return (
    <div
      data-signal-divider
      className={`relative isolate h-[88px] overflow-hidden bg-[#090809] sm:h-[120px] lg:h-[160px] ${className}`}
      style={{
        background:
          "linear-gradient(180deg, #090809 0%, #0d090c 52%, #0a090a 100%)",
      }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 112%, hsl(var(--primary) / 0.28), transparent 68%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-px bg-primary/35" />
      {SIGNAL_FRAGMENTS.map((fragment, index) => (
        <span
          key={`${fragment.left}-${fragment.top}`}
          className={`absolute block bg-primary ${fragment.size} ${fragment.tone}`}
          style={{ left: fragment.left, top: fragment.top }}
          data-signal-fragment={index}
        />
      ))}
    </div>
  );
}
