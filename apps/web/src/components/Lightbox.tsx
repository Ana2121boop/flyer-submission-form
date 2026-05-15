import { useEffect } from 'react';

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

  if (!items.length) return null;
  const current = items[index];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex items-center justify-between p-3 text-white">
        <div className="text-sm">
          {current.caption && <span className="font-medium">{current.caption}</span>}
          <span className="ml-3 opacity-60">{index + 1} of {items.length}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-2 hover:bg-white/10 rounded-lg text-2xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative">
        <img
          src={current.url}
          alt={current.caption ?? ''}
          className="max-w-full max-h-full object-contain"
        />

        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => onIndexChange((index - 1 + items.length) % items.length)}
              aria-label="Previous"
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white text-3xl w-12 h-12 rounded-full flex items-center justify-center"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => onIndexChange((index + 1) % items.length)}
              aria-label="Next"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white text-3xl w-12 h-12 rounded-full flex items-center justify-center"
            >
              ›
            </button>
          </>
        )}
      </div>

      <div className="text-center text-white/40 text-xs pb-3">
        Click outside, press Esc, or tap × to close
      </div>
    </div>
  );
}
