import { expect, test } from '@playwright/test'
import { loadSampleData, openApp } from './helpers'

/**
 * Capturas de las pantallas principales en WebKit, claro y oscuro, para
 * revisar a ojo el diseño en tamaño iPhone (quedan en test-results/screens).
 */
const SCREENS = [
  ['inicio', '/', 'Inicio'],
  ['tarjetas', '/tarjetas', 'Tarjetas'],
  ['movimientos', '/movimientos', 'Movimientos'],
  ['metas', '/metas', 'Metas y ahorros'],
  ['estadisticas', '/estadisticas', 'Estadísticas'],
] as const

for (const scheme of ['light', 'dark'] as const) {
  test(`capturas en modo ${scheme === 'light' ? 'claro' : 'oscuro'}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
    await openApp(page)
    await loadSampleData(page)
    for (const [name, path, title] of SCREENS) {
      await page.goto(path)
      await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible()
      await page.waitForTimeout(600)
      await page.screenshot({ path: `test-results/screens/${name}-${scheme}.png` })
    }
    await page.getByRole('button', { name: 'Cargar un gasto' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.waitForTimeout(600)
    await page.screenshot({ path: `test-results/screens/carga-rapida-${scheme}.png` })
  })
}
