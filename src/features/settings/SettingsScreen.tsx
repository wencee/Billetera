import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Screen } from '@/components/Screen'
import { Sheet } from '@/components/Sheet'
import { Button } from '@/components/Pressable'
import { ListGroup, ListRow } from '@/components/List'
import { clearAllData, db, loadSampleData } from '@/db'
import { isStandalone } from '@/lib/platform'
import { formatBytes, getStorageInfo, type StorageInfo } from '@/lib/storage'
import { InstallScreen } from '@/app/InstallScreen'

export function SettingsScreen() {
  const settings = useLiveQuery(() => db.settings.get('main'))
  const cardCount = useLiveQuery(() => db.cards.count())
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [showInstall, setShowInstall] = useState(false)

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

  return (
    <Screen title="Ajustes" back="Inicio">
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

      <ListGroup title="Próximas fases">
        <ListRow label="Categorías y cuentas" value="fase 3" />
        <ListRow label="Cotización del dólar" value="fase 3" />
        <ListRow label="Backups, PIN y modo privado" value="fase 6" last />
      </ListGroup>

      <Sheet open={confirmClear} onClose={() => setConfirmClear(false)} title="¿Borrar todos los datos?">
        <p className="text-body text-label-2">
          Se eliminan {cardCount ?? 0} tarjetas y todos los movimientos, metas y ajustes de este teléfono. Esta acción no se puede deshacer.
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
