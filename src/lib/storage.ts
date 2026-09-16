export interface StorageInfo {
  persisted: boolean | null
  usage: number | null
  quota: number | null
}

/** Pide almacenamiento persistente para que iOS no borre IndexedDB si la app no se usa por un tiempo. */
export async function requestPersistentStorage(): Promise<boolean | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return null
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return null
  }
}

export async function getStorageInfo(): Promise<StorageInfo> {
  const info: StorageInfo = { persisted: null, usage: null, quota: null }
  try {
    if (typeof navigator === 'undefined' || !navigator.storage) return info
    if (navigator.storage.persisted) info.persisted = await navigator.storage.persisted()
    if (navigator.storage.estimate) {
      const { usage, quota } = await navigator.storage.estimate()
      info.usage = usage ?? null
      info.quota = quota ?? null
    }
  } catch {
    // Safari puede tirar en contextos raros; la info es solo informativa.
  }
  return info
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
