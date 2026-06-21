import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // onnxruntime-web ships large prebuilt wasm/jsep bundles; keep them out of the
  // dep-optimizer so the WebGPU backend loads correctly. It is only imported from
  // ondevice.ts, so Rollup already code-splits it into its own lazy chunk.
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
})
