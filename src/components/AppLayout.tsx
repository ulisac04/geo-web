import { Outlet } from 'react-router-dom'
import { CostsProvider } from '../context/CostsContext'
import { FleetProvider } from '../context/FleetContext'
import { ServicesProvider } from '../context/ServicesContext'
import { SettingsProvider } from '../context/SettingsContext'
import AppNav from './AppNav'

export default function AppLayout() {
  return (
    <SettingsProvider>
      <ServicesProvider>
        <CostsProvider>
          <FleetProvider>
            <div className="flex h-full overflow-hidden bg-ink">
              <AppNav />
              <div className="flex h-full min-w-0 flex-1 flex-col">
                <Outlet />
              </div>
            </div>
          </FleetProvider>
        </CostsProvider>
      </ServicesProvider>
    </SettingsProvider>
  )
}
