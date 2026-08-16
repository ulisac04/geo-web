interface DriverAvatarProps {
  src: string
  name: string
  size?: 'sm' | 'md'
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export default function DriverAvatar({ src, name, size = 'md' }: DriverAvatarProps) {
  const box = size === 'sm' ? 'size-8 text-[10px]' : 'size-10 text-xs'

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${box} shrink-0 rounded-full border border-line object-cover`}
      />
    )
  }

  return (
    <span
      className={`${box} inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-elevated font-semibold text-mist`}
    >
      {initials(name)}
    </span>
  )
}
