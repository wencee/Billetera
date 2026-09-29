import { useLiveQuery } from 'dexie-react-hooks'
import { FolderTree, Minus, PiggyBank, Plus, Repeat, Target, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { InstallScreen } from '@/app/InstallScreen'
import { AmountInput } from '@/components/form/AmountInput'
import { ListGroup, ListRow } from '@/components/List'
import { Button } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { Sheet } from '@/components/Sheet'
import { todayISO } from '@/core/dates'
import { formatDate, formatMoney } from '@/core/format'
import { clearAllData, db, loadSampleData, updateSettings } from '@/db'
import { useSettings } from '@/db/hooks'
import { isStandalone } from '@/lib/platform'
import { badgeSupported, enableBadge } from '@/lib/badge'
import { Toggle } from '@/components/form/Toggle'
import { toast } from '@/app/toast'
import { formatBytes, getStorageInfo, type StorageInfo } from '@/lib/storage'

export function SettingsScreen() {
  const navigate = useNavigate()
  const settings = useSettings()
  const counts = useLiveQuery(async () => ({
    cards: await db.cards.count(),
    accounts: await db.accounts.filter((a) => !a.archived).count(),
    recurring: await db.recurring.filter((r) => r.active).count(),
    budgets: await db.budgets.count(),
  }))
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [rateOpen, setRateOpen] = useState(false)

  useEffect(() => {
    void getStorageInfo().then(setStorage)
  }, [busy])

  const runSample = async () => {
    setBusy(true)
    try {
      await loadSampleData()
    } finally {
      setBusy(false)
    }
  }

  const runClear = async () => {
    setBusy(true)
    try {
      await clearAllData()
    } finally {
      setBusy(false)
      setConfirmClear(false)
    }
  }

  const persisted = storage?.persisted === null || storage?.persisted === undefined ? 'no disponible' : storage.persisted ? 'sí' : 'no'
  const alertDays = settings?.alertDaysAhead ?? 3
  const setAlertDays = (n: number) => void updateSettings({ alertDaysAhead: Math.max(0, Math.min(15, n)) })
  const toggleBadge = async (on: boolean) => {
    if (!on) {
      await updateSettings({ appBadge: false })
      return
    }
    if (await enableBadge()) await updateSettings({ appBadge: true })
    else toast(isStandalone() ? 'Sin permiso de notificaciones no se puede mostrar el número' : 'Instalá la app en la pantalla de inicio para ver el número en el ícono')
  }

  return (
    <Screen title="Ajustes" back="Inicio" backTo="/">
      <ListGroup title="Finanzas">
        <ListRow icon={<Wallet size={22} className="text-tint" />} label="Cuentas" value={counts?.accounts ?? ''} chevron onPress={() => navigate('/ajustes/cuentas')} />
        <ListRow icon={<FolderTree size={22} className="text-purple" />} label="Categorías" chevron onPress={() => navigate('/ajustes/categorias')} />
        <ListRow icon={<Repeat size={22} className="text-orange" />} label="Fijos y suscripciones" value={counts?.recurring || ''} chevron onPress={() => navigate('/ajustes/fijos')} />
        <ListRow icon={<Target size={22} className="text-green" />} label="Presupuestos" value={counts?.budgets || ''} chevron onPress={() => navigate('/ajustes/presupuestos')} last />
      </ListGroup>

      <ListGroup
        title="Dólar"
        footer="Se usa para ver totales convertidos, el límite disponible de las tarjetas y los presupuestos. No se actualiza sola: cargala cuando cambie."
      >
        <ListRow
          icon={<PiggyBank size={22} className="text-green" />}
          label="Cotización"
          value={settings && settings.usdRate > 0 ? `${formatMoney(settings.usdRate)}${settings.usdRateDate ? ` · ${formatDate(settings.usdRateDate).slice(0, 5)}` : ''}` : 'sin cargar'}
          chevron
          onPress={() => setRateOpen(true)}
          last
        />
      </ListGroup>

      <ListGroup title="Avisos" footer={`Con cuántos días de anticipación avisar cierres, vencimientos y plazos fijos en Inicio.${badgeSupported() ? ' El número en el ícono cuenta los avisos que piden acción; iOS pide permiso de notificaciones para mostrarlo (la app no manda notificaciones).' : ''}`}>
        <div className="flex min-h-12 items-center px-4">
          <span className="flex-1 text-body">Avisar antes</span>
          <div className="flex items-center gap-1 rounded-lg bg-fill">
            <button type="button" aria-label="Menos días" onClick={() => setAlertDays(alertDays - 1)} className="flex h-9 w-11 items-center justify-center text-label active:opacity-50">
              <Minus size={18} />
            </button>
            <span className="tabular w-16 text-center text-body">{alertDays === 1 ? '1 día' : `${alertDays} días`}</span>
            <button type="button" aria-label="Más días" onClick={() => setAlertDays(alertDays + 1)} className="flex h-9 w-11 items-center justify-center text-label active:opacity-50">
              <Plus size={18} />
            </button>
          </div>
        </div>
        {badgeSupported() && (
          <div className="flex min-h-12 items-center border-t border-separator/60 px-4">
            <span className="flex-1 text-body">Número en el ícono</span>
            <Toggle checked={settings?.appBadge ?? false} onChange={(on) => void toggleBadge(on)} aria-label="Número en el ícono de la app" />
          </div>
        )}
      </ListGroup>

      <ListGroup title="Datos" footer="Los datos de ejemplo sirven para ver la app con contenido. Se borran con «Borrar todos los datos».">
        <ListRow
          label={settings?.sampleDataLoaded ? 'Datos de ejemplo ya cargados' : 'Cargar datos de ejemplo'}
          onPress={settings?.sampleDataLoaded || busy ? undefined : () => void runSample()}
          chevron={!settings?.sampleDataLoaded}
        />
        <ListRow label="Borrar todos los datos" destructive onPress={busy ? undefined : () => setConfirmClear(true)} last />
      </ListGroup>

      <ListGroup
        title="Dispositivo"
        footer="Con almacenamiento persistente, iOS no borra la base de datos aunque no uses la app por un tiempo. Igual hacé backups: los datos viven solo en este teléfono."
      >
        <ListRow label="Instalada en pantalla de inicio" value={isStandalone() ? 'sí' : 'no'} />
        <ListRow label="Almacenamiento persistente" value={persisted} />
        <ListRow label="Espacio usado" value={storage?.usage != null ? formatBytes(storage.usage) : '—'} />
        <ListRow label="Versión" value={__APP_VERSION__} />
        <ListRow label="Cómo instalar en tu iPhone" chevron onPress={() => setShowInstall(true)} last />
      </ListGroup>

      <ListGroup title="Próximamente">
        <ListRow label="Backups, PIN y modo privado" value="fase 6" last />
      </ListGroup>

      <UsdRateSheet open={rateOpen} onClose={() => setRateOpen(false)} current={settings?.usdRate ?? 0} />

      <Sheet open={confirmClear} onClose={() => setConfirmClear(false)} title="¿Borrar todos los datos?">
        <p className="text-body text-label-2">
          Se eliminan {counts?.cards ?? 0} tarjetas y todos los movimientos, metas y ajustes de este teléfono. Esta acción no se puede deshacer.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button variant="destructive" onClick={() => void runClear()} disabled={busy}>
            Borrar todo
          </Button>
          <Button variant="secondary" onClick={() => setConfirmClear(false)}>
            Cancelar
          </Button>
        </div>
      </Sheet>

      <Sheet open={showInstall} onClose={() => setShowInstall(false)} title="Instalar en el iPhone">
        <InstallScreen embedded />
      </Sheet>
    </Screen>
  )
}

function UsdRateSheet({ open, onClose, current }: { open: boolean; onClose: () => void; current: number }) {
  const [value, setValue] = useState<number | null>(current || null)
  useEffect(() => {
    if (open) setValue(current || null)
  }, [open, current])
  const save = async () => {
    await updateSettings(value && value > 0 ? { usdRate: value, usdRateDate: todayISO() } : { usdRate: 0 })
    onClose()
  }
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Cotización del dólar"
      footer={
        <Button className="w-full" onClick={() => void save()}>
          Guardar
        </Button>
      }
    >
      <p className="pb-2 text-center text-footnote uppercase text-label-2">Pesos por 1 dólar</p>
      <AmountInput size="hero" value={value} onChange={setValue} autoFocus />
      <p className="pt-3 text-center text-footnote text-label-2">Usá la que te sirva de referencia (MEP, tarjeta, blue). Se guarda con la fecha de hoy.</p>
    </Sheet>
  )
}
