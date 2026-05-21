import { AlertTriangle } from 'lucide-react'

interface Props {
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: Props) {
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.72)' }}
      onClick={onCancel}
    >
      <div
        className="card-elevated max-w-md w-full mx-6 flex flex-col gap-6"
        style={{ borderColor: 'var(--color-danger)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <AlertTriangle size={28} className="text-danger shrink-0 mt-0.5" />
          <p className="text-text text-lg leading-snug">{message}</p>
        </div>
        <div className="flex gap-3 justify-end">
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
