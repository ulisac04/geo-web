import { X } from 'lucide-react'

interface TakeOfflineButtonProps {
  driverName: string
  onClick: () => void | Promise<void>
  compact?: boolean
}

export default function TakeOfflineButton({
  driverName,
  onClick,
  compact = false,
}: TakeOfflineButtonProps) {
  const label = `Sacar a ${driverName} de servicio`
  return (
    <button
      type="button"
      title={label}
      onClick={(event) => {
        event.stopPropagation()
        void onClick()
      }}
      className={
        compact
          ? 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-rose-300 hover:bg-danger/15'
          : 'inline-flex items-center gap-1.5 rounded-md border border-danger/40 bg-danger/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-danger/20'
      }
    >
      <X className="size-3.5 shrink-0 text-red-500" />
      {label}
    </button>
  )
}
