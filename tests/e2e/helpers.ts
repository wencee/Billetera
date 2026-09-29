import { expect, type Page } from '@playwright/test'

/**
 * Abre la app salteando la pantalla "Instalá en tu iPhone" (el navegador de
 * los tests es Safari sin instalar) y espera a que aparezca la tab bar.
 */
export async function openApp(page: Page, path = '/'): Promise<void> {
  await page.addInitScript(() => sessionStorage.setItem('billetera:install-dismissed', '1'))
  await page.goto(path)
  await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible()
}

export async function loadSampleData(page: Page): Promise<void> {
  await page.goto('/ajustes')
  await page.getByRole('button', { name: 'Cargar datos de ejemplo' }).click()
  await expect(page.getByText('Datos de ejemplo ya cargados')).toBeVisible({ timeout: 15_000 })
}

/** Toca una pestaña de la barra inferior. */
export async function goToTab(page: Page, name: 'Inicio' | 'Tarjetas' | 'Movimientos' | 'Metas' | 'Estadísticas'): Promise<void> {
  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('link', { name }).click()
}

/** Teclado del PIN: los botones responden al apoyar el dedo. */
export async function typePin(page: Page, pin: string): Promise<void> {
  for (const d of pin) await page.getByRole('button', { name: d, exact: true }).click()
}
