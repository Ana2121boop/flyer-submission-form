import { useEffect, useRef } from 'react';

export type LightboxItem = { url: string; caption?: string };

export default function Lightbox({
  items,
  index,
  onIndexChange,
  onClose,
}: {
  items: LightboxItem[];
  index: number;
  onIndexChange: (next: number) => void;
  onClose: () => void;
}) {
  const thumbStripRef = useRef<HTMLDivElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndexChange((index + 1) % items.length);
      if (e.key === 'ArrowLeft') onIndexChange((index - 1 + items.length) % items.length);
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [index, items.length, onIndexChange, onClose]);

  // Keep the active thumbnail in view as user navigates
  useEffect(() => {
    if (activeThumbRef.current) {
      activeThumbRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [index]);

  if (!items.length) return null;
  const current = items[index];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col animate-[fadeIn_0.15s_ease-out]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between p-3 text-white shrink-0">
        <div className="text-sm min-w-0">
          {current.caption && <span className="font-medium truncate">{current.caption}</span>}
          <span className="ml-3 opacity-60 whitespace-nowrap">{index + 1} of {items.length}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-2 hover:bg-white/10 rounded-lg text-2xl leading-none shrink-0"
        >
          ×
        </button>
      </div>

      {/* Center image area */}
      <div
        className="flex-1 flex items-center justify-center px-4 relative min-h-0"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {items.length > 1 && (
          <button
            type="button"
            onClick={() => onIndexChange((index - 1 + items.length) % items.length)}
            aria-label="Previous"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white text-3xl w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center backdrop-blur-sm z-10"
          >
            ‹
          </button>
        )}

        {/* The image card — bounded so it doesn't take the whole screen */}
        <div className="bg-white rounded-2xl shadow-2xl p-2 sm:p-3 max-w-[min(900px,calc(100vw-6rem))] max-h-[min(70vh,calc(100vh-220px))] flex">
          <img
            src={current.url}
            alt={current.caption ?? ''}
            className="rounded-lg max-w-full max-h-full object-contain"
            style={{ maxHeight: 'calc(min(70vh, 100vh - 240px))' }}
          />
        </div>

        {items.length > 1 && (
          <button
            type="button"
            onClick={() => onIndexChange((index + 1) % items.length)}
            aria-label="Next"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 text-white text-3xl w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center backdrop-blur-sm z-10"
          >
            ›
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {items.length > 1 && (
        <div className="shrink-0 pb-4 pt-3 px-3">
          <div ref={thumbStripRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin max-w-full justify-start sm:justify-center">
            {items.map((item, i) => (
              <button
                key={i}
                ref={i === index ? activeThumbRef : undefined}
                type="button"
                onClick={() => onIndexChange(i)}
                className={
                  'w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ' +
                  (i === index
                    ? 'border-white scale-105 shadow-lg'
                    : 'border-transparent opacity-50 hover:opacity-100')
                }
                aria-label={item.caption ?? `Photo ${i + 1}`}
              >
                <img src={item.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-white/30 text-[10px] sm:text-xs pb-2 shrink-0">
        Esc to close · ← → to navigate
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </div>
  );
}
