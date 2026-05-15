type Step = { id: string; label: string; done: boolean };

export default function FormProgressBar({ steps, currentId }: { steps: Step[]; currentId: string | null }) {
  const doneCount = steps.filter((s) => s.done).length;

  function scrollTo(id: string) {
    const el = document.getElementById(`section-${id}`);
    if (!el) return;
    const offset = 80; // account for sticky header + this progress bar
    const y = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 -mx-4 px-4 py-2 mb-4">
      <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
        <span>Step {Math.min(doneCount + 1, steps.length)} of {steps.length}</span>
        <span className="font-medium">{doneCount}/{steps.length} done</span>
      </div>
      <div className="flex gap-1.5">
        {steps.map((s) => {
          const active = currentId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              className={
                'flex-1 flex flex-col items-center gap-1 py-1.5 rounded-md transition-colors ' +
                (active ? 'bg-brand-blue/10' : 'hover:bg-slate-100')
              }
            >
              <div
                className={
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ' +
                  (s.done
                    ? 'bg-brand-blue text-white'
                    : active
                      ? 'bg-white border-2 border-brand-blue text-brand-blue'
                      : 'bg-slate-200 text-slate-500')
                }
              >
                {s.done ? '✓' : steps.indexOf(s) + 1}
              </div>
              <span
                className={
                  'text-[10px] sm:text-xs leading-tight text-center ' +
                  (active || s.done ? 'text-brand-blue font-medium' : 'text-slate-500')
                }
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
