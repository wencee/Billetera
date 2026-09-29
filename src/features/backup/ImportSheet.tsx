import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Segmented } from '@/components/form/Segmented'
import { Button } from '@/components/Pressable'
import { Sheet } from '@/components/Sheet'
import { BACKUP_TABLES, TABLE_LABEL, backupCounts, diffBackup, type Backup } from '@/core/backup'
import { existingIds } from '@/db'

interface Props {
  backup: Backup | null
  onClose: () => void
  onConfirm: (mode: 'replace' | 'merge') => void
}

/** Vista previa del backup antes de tocar nada: qué trae y qué pasaría en cada modo. */
export function ImportSheet({ backup, onClose, onConfirm }: Props) {
  const [mode, setMode] = useState<'replace' | 'merge'>('replace')
  const ids = useLiveQuery(() => existingIds(), [])
  useEffect(() => {
    if (backup) setMode('replace')
  }, [backup])

  const counts = backup ? backupCounts(backup) : null
  const diff = backup && ids ? diffBackup(backup, ids) : null
  const exported = backup ? new Date(backup.exportedAt) : null
  const rows = BACKUP_TABLES.filter((t) => (counts?.[t] ?? 0) > 0 || (ids?.[t].size ?? 0) > 0)

  return (
    <Sheet
      open={backup !== null}
      onClose={onClose}
      title="Importar backup"
      footer={
        <Button variant={mode === 'replace' ? 'destructive' : 'primary'} className="w-full" onClick={() => onConfirm(mode)}>
          {mode === 'replace' ? 'Reemplazar mis datos' : 'Fusionar con mis datos'}
        </Button>
      }
    >
      {backup && counts && (
        <div className="flex flex-col gap-4">
          <p className="text-subhead text-label-2">
            Backup del {exported && !Number.isNaN(exported.getTime()) ? exported.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : backup.exportedAt}
            {backup.appVersion ? ` · versión ${backup.appVersion}` : ''}
          </p>
          <Segmented<'replace' | 'merge'>
            aria-label="Cómo importar"
            value={mode}
            onChange={setMode}
            options={[{ value: 'replace', label: 'Reemplazar todo' }, { value: 'merge', label: 'Fusionar' }]}
          />
          <p className="text-footnote text-label-2">
            {mode === 'replace'
              ? 'Borra lo que hay en este teléfono y deja exactamente lo del backup. Tu PIN se mantiene.'
              : 'Agrega lo del backup a lo que ya tenés. Si un dato está en los dos, queda la versión del backup.'}
          </p>
          <div className="card overflow-hidden">
            <table className="w-full text-footnote">
              <thead>
                <tr className="text-label-2">
                  <th scope="col" className="px-3 py-2 text-left font-normal">Datos</th>
                  <th scope="col" className="px-3 py-2 text-right font-normal">En el teléfono</th>
                  <th scope="col" className="px-3 py-2 text-right font-normal">En el backup</th>
                  {mode === 'merge' && <th scope="col" className="px-3 py-2 text-right font-normal">Nuevos</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t} className="border-t border-separator/40">
                    <td className="px-3 py-1.5">{TABLE_LABEL[t]}</td>
                    <td className="tabular px-3 py-1.5 text-right">{ids?.[t].size ?? '…'}</td>
                    <td className="tabular px-3 py-1.5 text-right">{counts[t]}</td>
                    {mode === 'merge' && <td className="tabular px-3 py-1.5 text-right">{diff?.[t].added ?? '…'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Sheet>
  )
}
