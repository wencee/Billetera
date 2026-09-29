# Billetera

App de finanzas personales para iPhone, hecha como PWA: tarjetas de crédito con cuotas e intereses, gastos, ingresos, cuentas, fijos y suscripciones, presupuestos, metas de ahorro, inversiones y estadísticas. **Todos los datos viven en el teléfono** (IndexedDB): no hay backend, ni login, ni analytics, ni pedidos a servidores externos.

> **Sobre la privacidad del sitio publicado:** la app es un sitio estático. Cualquiera que tenga el link ve la app *vacía* y la puede usar con sus propios datos, en su propio dispositivo. Tus datos nunca salen de tu teléfono; la única copia que existe es la que vos exportás como backup.

## Qué hace

- **Inicio**: cuánto te queda disponible en el mes (ingresos − gastos − resúmenes que vencen), avisos (resúmenes por vencer o vencidos, cierres, presupuestos pasados, metas cerca de la fecha, plazos fijos, backup pendiente), presupuesto, metas y últimos movimientos.
- **Tarjetas**: carrusel de tarjetas, compras en 1 a 24 cuotas (o las que quieras) sin o con interés (cargando el valor de la cuota, el total o la TNA), comparación contado vs. financiado con TNA/TEA, cronograma de cuotas, resúmenes con cierre y vencimiento (se pueden corregir las fechas reales), pagos total/parcial/mínimo y límite disponible.
- **Movimientos**: lista unificada con búsqueda (sin tildes, también por monto) y filtros; deslizar para editar o borrar, con deshacer.
- **Carga rápida** (botón +): monto, categoría y guardar; "¿con tarjeta?" despliega tarjeta, cuotas e interés.
- **Metas y ahorros**: metas con aporte mensual sugerido y proyección según tu ritmo; plazos fijos (interés, vencimiento, renovación), FCI, dólares y cripto con valuación manual; patrimonio total.
- **Estadísticas**: gasto por categoría, últimos 6 meses, gastos vs. ingresos y compromisos en cuotas de los próximos 12 resúmenes. Cada gráfico tiene su tabla de datos.
- **Ajustes**: cuentas, categorías, fijos y suscripciones (se cargan solos), presupuestos, cotización del dólar, avisos, número en el ícono, modo privado, PIN y backups.

Pesos y dólares; formato argentino ($ 1.234,56 y dd/mm/aaaa); modo claro y oscuro automático.

## Backups (importante)

Como los datos están solo en el teléfono, si lo perdés o borrás la app, se pierden. En **Ajustes → Backup y datos**:

- **Exportar backup**: abre la hoja de compartir de iOS para guardarlo en Archivos / iCloud Drive o mandarlo por WhatsApp o mail. Es un `.json` con todo menos el PIN: guardalo en un lugar privado.
- **Importar un backup**: valida el archivo entero antes de tocar nada, muestra qué trae y deja elegir entre **reemplazar** todo o **fusionar**. Se puede deshacer.
- **Exportar movimientos (CSV)**: para Excel, Numbers o Google Sheets (separado por `;`, coma decimal).

Inicio avisa cuando pasaron más de 7 días del último backup.

## PIN y modo privado

- **PIN** de 4 a 6 números: se pide al abrir la app y al volver después de un minuto; al pasar a segundo plano se tapa la pantalla. Se guarda solo un hash (PBKDF2 con sal), nunca el PIN. Aclaración honesta: frena a alguien que agarra tu teléfono desbloqueado, pero **no cifra los datos**. Si te olvidás el PIN, la única salida es borrar todo e importar un backup.
- **Modo privado**: el ojo de Inicio tapa todos los montos ($ ••••).
- Nunca se pide ni se guarda el número completo de la tarjeta ni el código de seguridad: solo los últimos 4 dígitos.

## Correrla en la PC

Requisitos: Node 22+ (probado con Node 24).

```bash
npm install
npm run dev
```

Abre en `http://localhost:5173`. Para verla desde el iPhone en la misma Wi-Fi usá la URL con la IP de la PC que muestra Vite (`http://192.168.x.x:5173`). Sin HTTPS no hay service worker ni instalación: eso se prueba en el sitio publicado.

| Comando | Qué hace |
| --- | --- |
| `npm test` | Tests unitarios de la lógica (Vitest) |
| `npm run test:e2e` | Tests de punta a punta emulando un iPhone 17 Pro con WebKit (Playwright) |
| `npm run typecheck` | TypeScript en modo estricto |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve `dist/` en `http://localhost:4173` |
| `npm run icons` | Regenera los íconos a partir de `public/logo.svg` |
| `npm run splash` | Regenera las pantallas de arranque de iOS |

La primera vez que corras los tests de Playwright hay que bajar los navegadores: `npx playwright install webkit chromium`.

## Publicarla en GitHub Pages

1. Creá un repositorio **público** en GitHub (en el plan gratuito, Pages no funciona con repos privados). El workflow usa el nombre del repo para la URL.
2. Subí el código:

   ```bash
   git remote add origin https://github.com/TU-USUARIO/billetera.git
   git push -u origin main
   ```

3. En el repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Cada push a `main` corre los tests, hace el build y publica en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/` (la URL respeta mayúsculas). Tarda 1-2 minutos; se ve en la pestaña **Actions**.

## Instalarla en el iPhone

1. Abrí la URL publicada en **Safari**.
2. Tocá **Compartir** → **Agregar a pantalla de inicio**.
3. Abrila desde el ícono: pantalla completa y funciona sin conexión.

Cuando hay una versión nueva, la app muestra "Hay una versión nueva, tocá para actualizar".

## Calidad

- **215 tests unitarios** de la lógica financiera (cuotas, intereses con sistema francés, asignación a resúmenes con febrero y cierres corridos, proyecciones, presupuestos, metas, plazo fijo, backup, CSV, PIN…).
- **16 tests de punta a punta** con Playwright: instalación, carga rápida, deslizar para editar o borrar, búsqueda, compras en cuotas, metas, estadísticas, PIN, backup completo y funcionamiento sin conexión.
- **Lighthouse** (móvil): rendimiento 94, accesibilidad 100, buenas prácticas 100. El SEO da 63 a propósito: `robots.txt` le pide a los buscadores que no indexen una app personal (si la querés en Google, borrá `public/robots.txt`). Lighthouse 12 ya no tiene categoría "PWA"; la instalación y el modo sin conexión los verifican los tests de Playwright.

## Estructura

```
src/core        lógica pura + tests (dinero, fechas, resúmenes, cuotas, intereses, metas, inversiones, backup…)
src/db          Dexie: esquema, seeds, datos de ejemplo, repositorios, hooks reactivos
src/features    una carpeta por pantalla o dominio
src/components  UI reutilizable (Sheet, SwipeRow, Carousel, TabBar, GlassHeader, formularios…)
src/motion      resortes, física de gestos (proyección de impulso, resistencia elástica)
src/app         router, shell, instalación, aviso de actualización, toasts
tests/e2e       tests de Playwright
```

Los montos se guardan como enteros en centavos y las fechas como `aaaa-mm-dd` sin hora, para evitar errores de redondeo y de zona horaria.
