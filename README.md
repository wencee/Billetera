# Billetera

App de finanzas personales para iPhone, hecha como PWA. Tarjetas de crédito con cuotas e intereses, gastos, ingresos, metas de ahorro, presupuestos y estadísticas. **Todos los datos viven en el teléfono** (IndexedDB): no hay backend, ni login, ni servicios externos.

> **Sobre la privacidad del sitio publicado:** la app es un sitio estático. Cualquiera que tenga el link ve la app *vacía* y la puede usar con sus propios datos, en su propio dispositivo. Tus datos nunca salen de tu teléfono; la única copia que existe es la que vos exportás como backup.

## Stack

Vite · React · TypeScript (strict) · Tailwind CSS · Dexie (IndexedDB) · Motion · vite-plugin-pwa (Workbox) · Zod · date-fns · Recharts · Vitest · Playwright.

Toda la lógica financiera (cuotas, intereses, asignación a resúmenes, proyecciones, presupuestos, metas) está en `src/core` como funciones puras, sin React ni base de datos, con tests unitarios. Los montos se guardan como enteros en centavos.

## Correrla en la PC

Requisitos: Node 22+ (probado con Node 24).

```bash
npm install
npm run dev
```

Abre en `http://localhost:5173`. Para verla desde el iPhone en la misma Wi-Fi usá la URL con la IP de la PC que muestra Vite (`http://192.168.x.x:5173`). Sin HTTPS no hay service worker ni instalación: eso se prueba en el sitio publicado.

Otros comandos:

```bash
npm test          # tests unitarios (Vitest)
npm run typecheck # TypeScript
npm run build     # build de producción en dist/
npm run preview   # sirve dist/ en http://localhost:4173
npm run icons     # regenera los íconos a partir de public/logo.svg
```

## Publicarla en GitHub Pages

1. Creá una cuenta en [github.com](https://github.com) si no tenés.
2. Creá un repositorio **público** llamado `billetera` (o el nombre que quieras; el workflow usa el nombre del repo para la URL). No agregues README ni .gitignore desde la web.
3. En la carpeta del proyecto:

   ```bash
   git add -A
   git commit -m "Fase 1: base del proyecto"
   git remote add origin https://github.com/TU-USUARIO/billetera.git
   git push -u origin main
   ```

4. En el repo, en **Settings → Pages → Build and deployment → Source**, elegí **GitHub Actions**.
5. Cada push a `main` corre los tests, hace el build y publica en `https://TU-USUARIO.github.io/billetera/`. El primer deploy tarda 1-2 minutos; lo ves en la pestaña **Actions**.

## Instalarla en el iPhone

1. Abrí la URL publicada en **Safari** (no en Chrome).
2. Tocá el botón **Compartir** y elegí **Agregar a pantalla de inicio**.
3. Abrila desde el ícono. Desde ahí funciona sin conexión y a pantalla completa.

Cuando hay una versión nueva, la app muestra "Hay una versión nueva, tocá para actualizar".

## Estructura

```
src/core        lógica pura + tests (dinero, fechas, resúmenes, cuotas, intereses, proyección…)
src/db          Dexie: esquema, migraciones, seeds, datos de ejemplo, repositorios
src/features    una carpeta por pantalla/dominio
src/components  UI reutilizable (Sheet, TabBar, GlassHeader, Pressable, List…)
src/motion      resortes, física de gestos, hook de arrastre de hojas
src/app         router, shell, instalación, aviso de actualización
```

## Estado del proyecto

- [x] Fase 1 — Proyecto base, PWA instalable, navegación, base de datos, core con tests, deploy
- [ ] Fase 2 — Tarjetas y compras en cuotas
- [ ] Fase 3 — Gastos, ingresos, cuentas, categorías, presupuestos, carga rápida
- [ ] Fase 4 — Metas y ahorros
- [ ] Fase 5 — Inicio, avisos y estadísticas
- [ ] Fase 6 — Backups, PIN, modo privado
- [ ] Fase 7 — Playwright, pulido para iPhone, Lighthouse
