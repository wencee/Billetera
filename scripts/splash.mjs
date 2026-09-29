// Pantallas de arranque de iOS: lo que se ve mientras la app instalada abre.
// Fondo del color del sistema (claro u oscuro) y el ícono redondeado al centro.
// Uso: npm run splash (regenera public/splash/*.png e imprime los <link> para index.html)
import { mkdirSync, readFileSync } from 'node:fs'
import sharp from 'sharp'

// Tamaño en puntos y factor de escala de cada pantalla (vertical).
const DEVICES = [
  { name: 'iphone-17-pro', width: 402, height: 874, scale: 3 },
  { name: 'iphone-17-pro-max', width: 440, height: 956, scale: 3 },
  { name: 'iphone-air', width: 420, height: 912, scale: 3 },
  { name: 'iphone-16', width: 393, height: 852, scale: 3 },
]
const SCHEMES = { light: '#f2f2f7', dark: '#000000' }
const ICON_POINTS = 96

// El logo con esquinas redondeadas como un ícono de iOS (radio ≈ 22 % del lado).
const svg = readFileSync('public/logo.svg', 'utf8').replace('<rect width="512" height="512"', '<rect width="512" height="512" rx="114"')
mkdirSync('public/splash', { recursive: true })

const links = []
for (const d of DEVICES) {
  const icon = await sharp(Buffer.from(svg)).resize(ICON_POINTS * d.scale, ICON_POINTS * d.scale).png().toBuffer()
  for (const [scheme, background] of Object.entries(SCHEMES)) {
    const file = `splash/${d.name}-${scheme}.png`
    await sharp({ create: { width: d.width * d.scale, height: d.height * d.scale, channels: 4, background } })
      .composite([{ input: icon, gravity: 'centre' }])
      .png({ compressionLevel: 9, palette: true })
      .toFile(`public/${file}`)
    links.push(
      `<link rel="apple-touch-startup-image" media="screen and (device-width: ${d.width}px) and (device-height: ${d.height}px) and (-webkit-device-pixel-ratio: ${d.scale}) and (orientation: portrait) and (prefers-color-scheme: ${scheme})" href="/${file}" />`,
    )
  }
}
console.log(links.join('\n'))
