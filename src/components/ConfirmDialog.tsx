import type { ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={() => {
        if (!busy) onCancel()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-2xl border border-line bg-panel p-5 shadow-none"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-snow">
          {title}
        </h2>
        <div className="mt-2 text-sm leading-relaxed text-mist">{description}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-line bg-card px-3 py-2 text-sm text-snow hover:border-mist/50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onConfirm()}
            className="rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
          >
            {busy ? 'Sacando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
