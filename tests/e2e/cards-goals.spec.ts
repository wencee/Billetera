import { expect, test } from '@playwright/test'
import { goToTab, loadSampleData, openApp } from './helpers'

test('tarjetas: carrusel, compra en 6 cuotas con interés y cronograma', async ({ page }) => {
  await openApp(page)
  await loadSampleData(page)
  await goToTab(page, 'Tarjetas')
  await expect(page.getByText('Mastercard Santander', { exact: true })).toBeVisible()
  await expect(page.getByText('Resúmenes', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Nueva compra' }).click()
  await page.getByPlaceholder('Heladera').fill('Televisor')
  await page.getByRole('radio', { name: '💻 Tecnología' }).click()
  await page.getByRole('textbox', { name: 'Monto' }).first().fill('600000')
  await page.getByRole('radio', { name: '6', exact: true }).click()
  await page.getByRole('radio', { name: 'Con interés' }).click()
  await page.getByRole('textbox', { name: 'Monto' }).nth(1).fill('120000')
  // La comparación contado vs. financiado se calcula mientras se escribe.
  await expect(page.getByText('Interés total')).toBeVisible()
  await page.getByRole('button', { name: 'Agregar compra' }).click()

  await expect(page.getByText('Cronograma de cuotas', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Cuota \d de 6/ })).toHaveCount(6)
  await expect(page.getByText('6 cuotas de')).toBeVisible()
})

test('metas: crear una meta y aportar', async ({ page }) => {
  await openApp(page, '/metas/nueva')
  await page.getByPlaceholder('Viaje a Brasil').fill('Bici')
  await page.getByRole('textbox', { name: 'Monto objetivo' }).fill('300000')
  await page.getByRole('button', { name: 'Crear meta' }).click()
  await expect(page.getByRole('heading', { name: 'Bici', level: 1 })).toBeVisible()
  await expect(page.getByText('0 %', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Aportar' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByRole('textbox', { name: 'Monto' }).fill('100000')
  await sheet.getByRole('radio', { name: 'Solo registro' }).click()
  await sheet.getByRole('button', { name: 'Aportar' }).click()
  await expect(page.getByText('33 %', { exact: true })).toBeVisible()
})

test('estadísticas: gráficos con tabla de datos', async ({ page }) => {
  await openApp(page)
  await loadSampleData(page)
  await goToTab(page, 'Estadísticas')
  await expect(page.getByRole('heading', { name: /En qué se fue en/ })).toBeVisible()
  await expect(page.locator('.recharts-wrapper')).toHaveCount(3)
  await page.getByRole('button', { name: 'Ver datos' }).first().click()
  await expect(page.getByRole('columnheader', { name: 'Gastado' })).toBeVisible()
})

test('inicio con datos: disponible del mes y avisos', async ({ page }) => {
  await openApp(page)
  await loadSampleData(page)
  await goToTab(page, 'Inicio')
  await expect(page.getByText('Tarjetas que vencen')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Avisos' })).toBeVisible()
  await expect(page.getByText('Hacé un backup')).toBeVisible()
  // Modo privado con un toque
  await page.getByRole('button', { name: 'Ocultar montos' }).click()
  await expect(page.getByText('$ ••••').first()).toBeVisible()
})
