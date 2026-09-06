import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { RadioTower } from 'lucide-react'

function LegalShell({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="min-h-full bg-ink">
      <header className="border-b border-line px-6 py-4">
        <Link to="/login" className="inline-flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-emerald-400/20 text-emerald-300 ring-1 ring-white/10">
            <RadioTower className="size-4" />
          </span>
          <span>
            <p className="text-sm font-semibold text-snow">Tu Ruta</p>
            <p className="text-xs text-mist">Human-in-the-Loop · B2B</p>
          </span>
        </Link>
      </header>
      <article className="mx-auto max-w-xl px-6 py-10 pb-16">
        <h1 className="text-2xl font-semibold tracking-tight text-snow">{title}</h1>
        {children}
      </article>
      <footer className="border-t border-line px-6 py-4 text-xs text-mist">
        <div className="mx-auto flex max-w-xl flex-wrap gap-x-4 gap-y-2">
          <Link to="/privacidad" className="text-signal hover:underline">
            Privacidad
          </Link>
          <Link to="/eliminar-datos" className="text-signal hover:underline">
            Eliminar datos
          </Link>
          <Link to="/login" className="hover:text-snow">
            Iniciar sesión
          </Link>
        </div>
      </footer>
    </div>
  )
}

const metaClass = 'mt-2 mb-8 text-sm text-mist'
const h2Class = 'mt-8 mb-2 text-sm font-semibold text-snow'
const pClass = 'mb-3 text-sm leading-relaxed text-snow/85'
const listClass = 'mb-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-snow/85'
const linkClass = 'text-signal underline underline-offset-2 hover:text-emerald-300'

export function PrivacidadPage() {
  return (
    <LegalShell title="Política de privacidad">
      <p className={metaClass}>
        App <strong className="text-snow">Tu-Ruta - Conductores</strong> · Desarrollador{' '}
        <strong className="text-snow">ulisac19</strong> · Servicio{' '}
        <strong className="text-snow">Tu Ruta</strong> · Última actualización: 5 de septiembre de 2026
      </p>
      <p className={pClass}>
        Tu Ruta es una plataforma B2B de despacho logístico. Esta política describe cómo tratamos datos
        en la app móvil <strong>Tu-Ruta - Conductores</strong> y en este panel de operadores. No hay
        registro libre: las cuentas las crea la empresa (el operador) y el conductor entra con un código
        de invitación.
      </p>
      <h2 className={h2Class}>Responsable</h2>
      <p className={pClass}>
        Desarrollador en Google Play: <strong>ulisac19</strong>. Contacto:{' '}
        <a className={linkClass} href="mailto:contacto@tu-ruta.app">
          contacto@tu-ruta.app
        </a>
        .
      </p>
      <h2 className={h2Class}>Qué datos usamos</h2>
      <ul className={listClass}>
        <li>
          <strong>Ubicación precisa</strong>, incluso con la pantalla apagada, cuando el conductor se
          pone en línea. Se usa un servicio en primer plano con notificación visible para transmitir la
          posición a la central de su flota. Si está fuera de servicio, no se envía GPS.
        </li>
        <li>
          <strong>Código de invitación</strong> y datos de la ficha (nombre, identificador, empresa).
        </li>
        <li>
          <strong>Notificaciones push</strong> (token FCM) para avisar de un servicio asignado.
        </li>
        <li>
          <strong>Datos del viaje</strong> que la empresa ya tiene en el panel (dirección, contacto del
          cliente, estado del servicio). La app puede abrir WhatsApp para coordinar con el cliente.
        </li>
      </ul>
      <h2 className={h2Class}>Para qué</h2>
      <p className={pClass}>
        Operar la flota: mostrar al conductor en el mapa, asignar servicios y mantener el despacho. No
        vendemos estos datos ni los usamos para publicidad.
      </p>
      <h2 className={h2Class}>Con quién se comparte</h2>
      <p className={pClass}>
        Con la empresa (tenant) a la que pertenece el conductor. Infraestructura de alojamiento, mapas y
        notificaciones (por ejemplo Firebase Cloud Messaging) cuando hace falta para prestar el servicio.
      </p>
      <h2 className={h2Class}>Conservación y eliminación</h2>
      <p className={pClass}>
        La presencia GPS se mantiene mientras el conductor está en línea y un tiempo breve después.
        Puedes pedir el borrado de tu ficha y de los datos asociados en{' '}
        <Link className={linkClass} to="/eliminar-datos">
          la página de eliminación de datos
        </Link>
        .
      </p>
    </LegalShell>
  )
}

export function EliminarDatosPage() {
  return (
    <LegalShell title="Eliminación de datos">
      <p className={metaClass}>
        App <strong className="text-snow">Tu-Ruta - Conductores</strong> · Desarrollador{' '}
        <strong className="text-snow">ulisac19</strong> · Última actualización: 5 de septiembre de 2026
      </p>
      <p className={pClass}>
        La aplicación móvil <strong>Tu-Ruta - Conductores</strong> no permite crear una cuenta por cuenta
        propia. El operador de tu empresa te da de alta y te envía un código de invitación. Esta página
        explica cómo pedir que borremos los datos asociados a tu ficha de conductor.
      </p>
      <h2 className={h2Class}>Cómo solicitarlo</h2>
      <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-snow/85">
        <li>
          Escribe a{' '}
          <a
            className={linkClass}
            href="mailto:contacto@tu-ruta.app?subject=Eliminar%20datos%20Tu-Ruta%20Conductores"
          >
            contacto@tu-ruta.app
          </a>{' '}
          indicando tu nombre, la empresa o el código de flota y, si lo tienes, el identificador de
          conductor.
        </li>
        <li>
          O pide a tu operador que elimine tu ficha en el{' '}
          <Link className={linkClass} to="/login">
            panel de Tu Ruta
          </Link>
          .
        </li>
      </ol>
      <p className={pClass}>
        Atendemos las solicitudes en un plazo de <strong>30 días</strong>.
      </p>
      <h2 className={h2Class}>Qué se elimina</h2>
      <ul className={listClass}>
        <li>La sesión en el teléfono (código de empresa, identificador y datos guardados en la app).</li>
        <li>Pings de GPS y presencia en tiempo real.</li>
        <li>Token de notificaciones push (FCM).</li>
        <li>La ficha de conductor en la flota (nombre y estado operativo).</li>
      </ul>
      <h2 className={h2Class}>Qué se puede conservar un tiempo</h2>
      <ul className={listClass}>
        <li>
          Historial de servicios o viajes de la empresa, si hace falta para operación o cumplimiento. Se
          conserva como máximo <strong>90 días</strong>, salvo que la flota pida un plazo distinto, y
          después se borra o se anonimiza.
        </li>
      </ul>
      <p className={pClass}>
        Política de privacidad:{' '}
        <Link className={linkClass} to="/privacidad">
          tu-ruta.app/privacidad
        </Link>
      </p>
    </LegalShell>
  )
}

export function LegalFooterLinks() {
  return (
    <p className="mt-6 text-center text-xs text-mist">
      <Link to="/privacidad" className="text-signal hover:underline">
        Privacidad
      </Link>
      <span className="mx-2 text-line">·</span>
      <Link to="/eliminar-datos" className="text-signal hover:underline">
        Eliminar datos
      </Link>
    </p>
  )
}
