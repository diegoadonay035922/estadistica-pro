<script setup>
import NotificacionesGlobales from '@/components/NotificacionesGlobales.vue'
</script>

<template>
  <RouterView />
  <NotificacionesGlobales />
</template>

<style>
:root { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-synthesis: none; text-rendering: optimizeLegibility; }
* { box-sizing: border-box; }
body { min-width: 320px; min-height: 100vh; margin: 0; }
button, input { font: inherit; }
button:focus-visible, input:focus-visible { outline: 3px solid rgba(32, 170, 160, .35); outline-offset: 2px; }
::selection { background: #b8eee5; color: #14243a; }
</style>
