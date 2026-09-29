export type ShareResult = 'shared' | 'downloaded' | 'cancelled'

/**
 * Comparte un archivo con la hoja de compartir de iOS (Guardar en Archivos,
 * iCloud Drive, WhatsApp, Mail…). Si el navegador no puede compartir archivos
 * (PC), lo descarga. Tiene que llamarse directo desde el toque del usuario:
 * iOS rechaza `share()` si antes hubo un `await` largo.
 */
export async function shareOrDownload(file: File, title: string): Promise<ShareResult> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      // NotAllowedError u otro: probamos con descarga.
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}

export function readFileText(file: File): Promise<string> {
  return file.text()
}
