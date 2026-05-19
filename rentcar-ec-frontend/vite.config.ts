import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const DOMAIN = 'whiteisland-027d7f3d.canadacentral.azurecontainerapps.io';

export default defineConfig({
  plugins: [vue()],
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api/v1/stevenariel/auth':              { target: `https://rentcar-auth.${DOMAIN}`,          changeOrigin: true, secure: true },
      '/api/v1/stevenariel/usuarios':          { target: `https://rentcar-auth.${DOMAIN}`,          changeOrigin: true, secure: true },
      '/api/v1/stevenariel/vehiculos':         { target: `https://rentcar-inventario.${DOMAIN}`,    changeOrigin: true, secure: true },
      '/api/v1/stevenariel/marcas':            { target: `https://rentcar-inventario.${DOMAIN}`,    changeOrigin: true, secure: true },
      '/api/v1/stevenariel/modelos':           { target: `https://rentcar-inventario.${DOMAIN}`,    changeOrigin: true, secure: true },
      '/api/v1/stevenariel/categorias':        { target: `https://rentcar-inventario.${DOMAIN}`,    changeOrigin: true, secure: true },
      '/api/v1/stevenariel/tipos-combustible': { target: `https://rentcar-inventario.${DOMAIN}`,    changeOrigin: true, secure: true },
      '/api/v1/stevenariel/tipos-transmision': { target: `https://rentcar-inventario.${DOMAIN}`,    changeOrigin: true, secure: true },
      '/api/v1/stevenariel/extras':            { target: `https://rentcar-inventario.${DOMAIN}`,    changeOrigin: true, secure: true },
      '/api/v1/stevenariel/estados-vehiculo':  { target: `https://rentcar-inventario.${DOMAIN}`,    changeOrigin: true, secure: true },
      '/api/v1/stevenariel/reservas':          { target: `https://rentcar-operaciones.${DOMAIN}`,   changeOrigin: true, secure: true },
      '/api/v1/stevenariel/alquileres':        { target: `https://rentcar-operaciones.${DOMAIN}`,   changeOrigin: true, secure: true },
      '/api/v1/stevenariel/devoluciones':      { target: `https://rentcar-operaciones.${DOMAIN}`,   changeOrigin: true, secure: true },
      '/api/v1/stevenariel/admin':             { target: `https://rentcar-operaciones.${DOMAIN}`,   changeOrigin: true, secure: true },
      '/api/v1/stevenariel/historial':         { target: `https://rentcar-operaciones.${DOMAIN}`,   changeOrigin: true, secure: true },
      '/api/v1/stevenariel/outbox-events':     { target: `https://rentcar-operaciones.${DOMAIN}`,   changeOrigin: true, secure: true },
      '/api/v1/stevenariel/seguros':           { target: `https://rentcar-operaciones.${DOMAIN}`,   changeOrigin: true, secure: true },
      '/api/v1/stevenariel/tarifas':           { target: `https://rentcar-operaciones.${DOMAIN}`,   changeOrigin: true, secure: true },
      '/api/v1/stevenariel/canales-venta':     { target: `https://rentcar-operaciones.${DOMAIN}`,   changeOrigin: true, secure: true },
      '/api/v1/stevenariel/pagos':             { target: `https://rentcar-financiero.${DOMAIN}`,    changeOrigin: true, secure: true },
      '/api/v1/stevenariel/facturas':          { target: `https://rentcar-financiero.${DOMAIN}`,    changeOrigin: true, secure: true },
      '/api/v1/stevenariel/mantenimientos':    { target: `https://rentcar-mantenimiento.${DOMAIN}`, changeOrigin: true, secure: true },
      '/api/v1/stevenariel/kardex':            { target: `https://rentcar-mantenimiento.${DOMAIN}`, changeOrigin: true, secure: true },
      '/api/v1/stevenariel/sistemas-externos': { target: `https://rentcar-mantenimiento.${DOMAIN}`, changeOrigin: true, secure: true },
      '/api/v1/stevenariel/agencias':          { target: `https://rentcar-org.${DOMAIN}`,           changeOrigin: true, secure: true },
      '/api/v1/stevenariel/empresas':          { target: `https://rentcar-org.${DOMAIN}`,           changeOrigin: true, secure: true },
      '/api/v1/stevenariel/provincias':        { target: `https://rentcar-org.${DOMAIN}`,           changeOrigin: true, secure: true },
      '/api/v1/stevenariel/ciudades':          { target: `https://rentcar-org.${DOMAIN}`,           changeOrigin: true, secure: true },
    },
  },
});
