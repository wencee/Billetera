import { useLiveQuery } from 'dexie-react-hooks'
import { FileDown, FileUp, Share, Table2, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from '@/app/toast'
import { ListGroup, ListRow } from '@/components/List'
import { Button } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { Sheet } from '@/components/Sheet'
import { backupFileName, parseBackup, type Backup } from '@/core/backup'
import { CSV_BOM, movementsToCsv } from '@/core/csv'
import { todayISO } from '@/core/dates'
import { formatDate } from '@/core/format'
import { clearAllData, exportBackup, importBackup, markBackupDone } from '@/db'
import { useCategoryMap, useMovements, useSettings } from '@/db/hooks'
import { shareOrDownload } from '@/lib/share'
import { ImportSheet } from './ImportSheet'

function sinceText(iso: string | undefined): { text: string; stale: boolean } {
  if (!iso) return { text: 'Nunca hiciste un backup', stale: true }
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  const when = new Date(iso)
  const hour = when.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const date = formatDate(todayISO(when))
  const ago = days === 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`
  return { text: `Último backup: ${ago} (${date} ${hour})`, stale: days > 7 }
}

export function BackupScreen() {
  const settings = useSettings()
  const movements = useMovements()
  const categories = useCategoryMap()
  // El archivo se arma antes del toque: iOS solo abre la hoja de compartir si
  // `share()` se llama enseguida del toque, sin esperar a la base de datos.
  const backup = useLiveQuery(() => exportBackup())
  const backupFile = useMemo(
    () => (backup ? new File([JSON.stringify(backup, null, 1)], backupFileName(todayISO()), { type: 'application/json' }) : null),
    [backup],
  )
  const csvFile = useMemo(() => {
    if (!movements) return null
    const csv = movementsToCsv(movements, (id) => categories?.get(id)?.name)
    return new File([CSV_BOM + csv], `billetera-movimientos-${todayISO()}.csv`, { type: 'text/csv' })
  }, [movements, categories])
  const inputRef = useRef<HTMLInputElement>(null)
  const [incoming, setIncoming] = useState<Backup | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const since = sinceText(settings?.lastBackupAt)

  const exportNow = async () => {
    if (!backupFile) return
    const result = await shareOrDownload(backupFile, 'Backup de Billetera')
    if (result === 'cancelled') return
    await markBackupDone()
    toast(result === 'shared' ? 'Backup listo' : 'Backup descargado')
  }

  const exportCsv = async () => {
    if (!csvFile) return
    await shareOrDownload(csvFile, 'Movimientos de Billetera')
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    const result = parseBackup(await file.text())
    if (inputRef.current) inputRef.current.value = ''
    if (!result.ok) {
      toast(result.error, { duration: 8000 })
      return
    }
    setIncoming(result.backup)
  }

  const confirmImport = async (mode: 'replace' | 'merge') => {
    if (!incoming) return
    // Copia de lo que había, para poder deshacer.
    const previous = await exportBackup()
    await importBackup(incoming, mode)
    setIncoming(null)
    toast(mode === 'replace' ? 'Backup restaurado' : 'Backup fusionado', {
      actionLabel: 'Deshacer',
      duration: 10000,
      onAction: () => importBackup(previous, 'replace'),
    })
  }

  return (
    <Screen title="Backup y datos" back="Ajustes" backTo="/ajustes">
      <div className="card mx-4 p-4">
        <p className={`text-headline ${since.stale ? 'text-orange' : ''}`}>{since.text}</p>
        <p className="mt-1 text-subhead text-label-2">
          Tus datos viven solo en este teléfono. Si lo perdés o borrás la app, se pierden. Guardá un backup en Archivos o iCloud Drive, o mandátelo por WhatsApp o mail.
        </p>
        <Button className="mt-4 w-full" disabled={!backupFile} onClick={() => void exportNow()}>
          <Share size={18} className="mr-2" aria-hidden />
          Exportar backup
        </Button>
      </div>

      <ListGroup title="Restaurar" footer="Antes de cambiar nada te muestro qué trae el backup. Después de importar podés deshacer.">
        <ListRow icon={<FileUp size={22} className="text-tint" />} label="Importar un backup" chevron onPress={() => inputRef.current?.click()} last />
      </ListGroup>
      <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />

      <ListGroup title="Planilla" footer="Todos los movimientos en un CSV para Excel, Numbers o Google Sheets (separado por ; y con coma decimal).">
        <ListRow icon={<Table2 size={22} className="text-green" />} label="Exportar movimientos (CSV)" value={movements ? String(movements.length) : ''} chevron onPress={() => void exportCsv()} last />
      </ListGroup>

      <ListGroup title="Zona peligrosa">
        <ListRow icon={<Trash2 size={22} className="text-red" />} label="Borrar todos los datos" destructive onPress={() => setConfirmClear(true)} last />
      </ListGroup>

      <p className="flex items-start gap-2 px-8 pt-4 text-footnote text-label-2">
        <FileDown size={14} className="mt-0.5 shrink-0" aria-hidden />
        El backup es un archivo .json con todo menos el PIN. Guardalo en un lugar privado: tiene tus movimientos.
      </p>

      <ImportSheet backup={incoming} onClose={() => setIncoming(null)} onConfirm={(mode) => void confirmImport(mode)} />

      <Sheet open={confirmClear} onClose={() => setConfirmClear(false)} title="¿Borrar todos los datos?">
        <p className="text-body text-label-2">Se borra todo lo de este teléfono. Si no tenés un backup, no hay forma de recuperarlo.</p>
        <div className="mt-6 flex flex-col gap-3">
          <Button
            variant="destructive"
            onClick={async () => {
              await clearAllData()
              setConfirmClear(false)
              toast('Datos borrados')
            }}
          >
            Borrar todo
          </Button>
          <Button variant="secondary" onClick={() => setConfirmClear(false)}>
            Cancelar
          </Button>
        </div>
      </Sheet>
    </Screen>
  )
}
