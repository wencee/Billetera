import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

test('funciona sin conexión después de la primera carga', async ({ page, context }) => {
  await openApp(page)
  // Esperar a que el service worker quede activo y controlando la página.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }))
    }
  })
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Inicio', level: 1 })).toBeVisible()
  // Una ruta profunda también (la sirve el service worker con index.html).
  await page.goto('/metas')
  await expect(page.getByRole('heading', { name: 'Metas y ahorros', level: 1 })).toBeVisible()
})
