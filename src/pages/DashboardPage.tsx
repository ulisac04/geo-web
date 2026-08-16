import { lazy, Suspense } from 'react'
import SidebarDispatch from '../components/SidebarDispatch'
import { DispatchProvider, useDispatchFlow } from '../context/DispatchContext'

const MapViewer = lazy(() => import('../components/MapViewer'))

export default function DashboardPage() {
  return (
    <DispatchProvider>
      <DashboardLayout />
    </DispatchProvider>
  )
}

function DashboardLayout() {
  const { fleet, order, hoveredDriverId, selectedDriver } = useDispatchFlow()

  return (
    <div className="flex h-full overflow-hidden bg-ink">
      <SidebarDispatch />
      <Suspense
        fallback={
          <section className="flex w-[70%] items-center justify-center text-sm text-mist">
            Cargando mapa…
          </section>
        }
      >
        <MapViewer
          drivers={fleet}
          order={order}
          hoveredDriverId={hoveredDriverId}
          selectedDriver={selectedDriver}
        />
      </Suspense>
    </div>
  )
}
