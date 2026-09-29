import { expect, test } from '@playwright/test'
import { goToTab, loadSampleData, openApp, typePin } from './helpers'

test('PIN: activarlo, bloquear al abrir, rechazar uno incorrecto y desbloquear', async ({ page }) => {
  await openApp(page, '/ajustes')
  await page.getByRole('switch', { name: 'Bloqueo con PIN' }).click()
  await expect(page.getByText('Elegí un PIN')).toBeVisible()
  await typePin(page, '2580')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByText('Repetilo')).toBeVisible()
  await typePin(page, '2580')
  await expect(page.getByRole('status').filter({ hasText: 'PIN activado' })).toBeVisible()

  await page.reload()
  await expect(page.getByText('Ingresá tu PIN')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Secciones' })).toHaveCount(0)
  await typePin(page, '1111')
  await expect(page.getByText('PIN incorrecto')).toBeVisible()
  await typePin(page, '2580')
  await expect(page.getByRole('heading', { name: 'Ajustes', level: 1 })).toBeVisible()
})

test('backup: exportar, borrar todo e importar lo deja como estaba', async ({ page }, testInfo) => {
  // Sin hoja de compartir (como en la PC): el backup se descarga.
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }))
  await openApp(page)
  await loadSampleData(page)
  await page.goto('/ajustes/backup')
  await expect(page.getByText('Nunca hiciste un backup')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar backup' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^billetera-backup-\d{4}-\d{2}-\d{2}\.json$/)
  const file = testInfo.outputPath('backup.json')
  await download.saveAs(file)
  await expect(page.getByText(/Último backup: hoy/)).toBeVisible()

  await page.getByRole('button', { name: 'Borrar todos los datos' }).click()
  await page.getByRole('button', { name: 'Borrar todo', exact: true }).click()
  await goToTab(page, 'Tarjetas')
  await expect(page.getByText('Agregá tu primera tarjeta')).toBeVisible()

  await page.goto('/ajustes/backup')
  await page.locator('input[type=file]').setInputFiles(file)
  const sheet = page.getByRole('dialog', { name: 'Importar backup' })
  await expect(sheet.getByRole('cell', { name: 'Tarjetas' })).toBeVisible()
  await sheet.getByRole('button', { name: 'Reemplazar mis datos' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Backup restaurado' })).toBeVisible()
  await goToTab(page, 'Tarjetas')
  await expect(page.getByText('Visa Galicia', { exact: true })).toBeVisible()
})

test('backup: un archivo que no es backup se rechaza sin tocar nada', async ({ page }, testInfo) => {
  await openApp(page, '/ajustes/backup')
  const bad = testInfo.outputPath('malo.json')
  const fs = await import('node:fs')
  fs.writeFileSync(bad, '{"hola": "mundo"}')
  await page.locator('input[type=file]').setInputFiles(bad)
  await expect(page.getByRole('status').filter({ hasText: 'no es un backup de Billetera' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
