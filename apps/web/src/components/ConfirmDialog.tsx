import Modal from './Modal';

type Variant = 'primary' | 'danger' | 'warning';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: Variant;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmClass: Record<Variant, string> = {
    primary: 'bg-brand-blue hover:bg-brand-blue-dark text-white',
    danger: 'bg-brand-red hover:opacity-90 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
  };

  return (
    <Modal open={open} onClose={pending ? () => {} : onCancel}>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        {description && <p className="text-slate-600 mb-6 whitespace-pre-line">{description}</p>}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="px-4 py-3 sm:py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 font-medium"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`px-4 py-3 sm:py-2 rounded-lg font-semibold disabled:opacity-50 ${confirmClass[confirmVariant]}`}
          >
            {pending ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
