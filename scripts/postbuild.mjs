// GitHub Pages sirve 404.html para rutas desconocidas: copiando index.html
// la app (SPA) arranca en cualquier URL, por ejemplo /billetera/tarjetas.
import { copyFileSync } from 'node:fs'
copyFileSync('dist/index.html', 'dist/404.html')
console.log('postbuild: dist/404.html creado')
