import { defineConfig, devices } from '@playwright/test'

/**
 * Tests de punta a punta contra el build de producción (`vite preview`),
 * emulando un iPhone 17 Pro con WebKit (el motor de Safari). El test de modo
 * sin conexión corre en Chromium porque Playwright solo controla service
 * workers de forma confiable ahí.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // Cada test levanta un WebKit entero: más de dos a la vez satura una PC común.
  workers: process.env.CI ? 1 : 2,
  expect: { timeout: 10_000 },
  // En GitHub, cada falla aparece como anotación del workflow (se ve sin abrir los logs).
  reporter: process.env.CI ? [['github'], ['list'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 17 Pro'] }, testIgnore: /offline/ },
    { name: 'offline', use: { ...devices['iPhone 17 Pro'], browserName: 'chromium' }, testMatch: /offline/ },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
})
