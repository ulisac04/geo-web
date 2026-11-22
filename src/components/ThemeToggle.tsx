import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle({ nav = false }: { nav?: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const toLight = theme === 'dark'
  const label = toLight ? 'Claro' : 'Oscuro'
  const Icon = toLight ? Sun : Moon

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={toLight ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={toLight ? 'Modo claro' : 'Modo oscuro'}
      className={
        nav
          ? 'flex w-[60px] flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-[10px] font-medium text-mist transition hover:bg-elevated hover:text-snow'
          : 'inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-mist transition hover:bg-elevated hover:text-snow'
      }
    >
      <Icon className={nav ? 'size-5' : 'size-3.5'} />
      {label}
    </button>
  )
}
