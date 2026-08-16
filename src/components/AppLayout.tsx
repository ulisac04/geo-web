import { Outlet } from 'react-router-dom'
import { FleetProvider } from '../context/FleetContext'
import AppNav from './AppNav'

export default function AppLayout() {
  return (
    <FleetProvider>
      <div className="flex h-full overflow-hidden bg-ink">
        <AppNav />
        <div className="flex h-full min-w-0 flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </FleetProvider>
  )
}
