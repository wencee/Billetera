import { expect, test } from '@playwright/test'
import { goToTab, loadSampleData, openApp } from './helpers'

test('en Safari sin instalar muestra cómo instalarla, y se puede seguir igual', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Instalá Billetera en tu iPhone' })).toBeVisible()
  await expect(page.getByText('Agregar a pantalla de inicio').first()).toBeVisible()
  await page.getByRole('button', { name: 'Seguir en Safari igual' }).click()
  await expect(page.getByRole('heading', { name: 'Inicio', level: 1 })).toBeVisible()
})

test('primera apertura: Inicio vacío invita a cargar un gasto', async ({ page }) => {
  await openApp(page)
  await expect(page.getByText('Disponible en', { exact: false })).toBeVisible()
  await expect(page.getByText('Empezá cargando un gasto')).toBeVisible()
})

test('carga rápida de un gasto, borrado y deshacer', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'Cargar un gasto' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByRole('textbox', { name: 'Monto' }).fill('2350,50')
  await sheet.getByRole('radio', { name: '🍔 Comida afuera' }).click()
  await sheet.getByRole('button', { name: 'Guardar gasto' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Gasto cargado' })).toBeVisible()

  await goToTab(page, 'Movimientos')
  const row = page.getByText('Comida afuera', { exact: true }).first()
  await expect(row).toBeVisible()
  await expect(page.getByText('−$ 2.350,50')).toBeVisible()

  await row.click()
  await expect(page.getByRole('heading', { name: 'Editar gasto', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Borrar gasto' }).click()
  await expect(page.getByText('−$ 2.350,50')).toHaveCount(0)
  await page.getByRole('status').filter({ hasText: 'Gasto borrado' }).getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByText('−$ 2.350,50')).toBeVisible()
})

test('deslizar un movimiento a la izquierda muestra Editar y Borrar', async ({ page }) => {
  await openApp(page)
  await loadSampleData(page)
  await goToTab(page, 'Movimientos')
  const row = page.getByText('SUBE', { exact: true })
  await expect(row).toBeVisible()
  const box = (await row.boundingBox())!
  const y = box.y + box.height / 2
  await page.mouse.move(360, y)
  await page.mouse.down()
  for (let x = 360; x >= 200; x -= 20) await page.mouse.move(x, y)
  await page.mouse.up()
  const borrar = page.getByRole('button', { name: 'Borrar' }).filter({ visible: true })
  await expect(borrar).toHaveCount(1)
  await borrar.click()
  await expect(page.getByText('SUBE', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Movimiento borrado' })).toBeVisible()
})

test('buscar en movimientos sin tildes y por monto', async ({ page }) => {
  await openApp(page)
  await loadSampleData(page)
  await goToTab(page, 'Movimientos')
  const search = page.getByRole('searchbox')
  await search.fill('fravega')
  await expect(page.getByText('Heladera Samsung')).toBeVisible()
  await expect(page.getByText('SUBE', { exact: true })).toHaveCount(0)
  await search.fill('89900')
  await expect(page.getByText('Supermercado', { exact: true }).first()).toBeVisible()
})
