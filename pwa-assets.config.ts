import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { sizes: [512], padding: 0.25, resizeOptions: { background: '#3a7bff' } },
    apple: { sizes: [180], padding: 0, resizeOptions: { background: '#3a7bff' } },
  },
  images: ['public/logo.svg'],
})
