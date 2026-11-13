<script setup>
import { useNotificaciones } from '@/composables/useNotificaciones'

const { estado, cerrarToast, responderConfirmacion } = useNotificaciones()
</script>

<template>
  <!-- Toasts flotantes (esquina inferior derecha) -->
  <div class="toast-contenedor">
    <TransitionGroup name="toast-fade">
      <div v-for="toast in estado.toasts" :key="toast.id" class="toast-dialog" :class="`toast-${toast.tipo}`"
        role="status" @click="cerrarToast(toast.id)">
        <svg v-if="toast.tipo === 'exito'" class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <svg v-else-if="toast.tipo === 'error'" class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <svg v-else class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>{{ toast.mensaje }}</span>
      </div>
    </TransitionGroup>
  </div>

  <!-- Diálogo de confirmación -->
  <Transition name="confirmacion-fade">
    <div v-if="estado.confirmacion" class="confirmacion-fondo" @click.self="responderConfirmacion(false)"
      @keydown.esc="responderConfirmacion(false)">
      <section class="confirmacion-modal" role="alertdialog" aria-modal="true" :aria-label="estado.confirmacion.titulo">
        <h2>{{ estado.confirmacion.titulo }}</h2>
        <p v-if="estado.confirmacion.mensaje">{{ estado.confirmacion.mensaje }}</p>
        <footer>
          <button class="boton-cancelar" type="button" @click="responderConfirmacion(false)">Cancelar</button>
          <button class="boton-confirmar" :class="{ 'boton-peligro': estado.confirmacion.peligro }" type="button"
            autofocus @click="responderConfirmacion(true)">
            {{ estado.confirmacion.textoConfirmar }}
          </button>
        </footer>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.toast-contenedor {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  pointer-events: none;
}

.toast-dialog {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(420px, calc(100vw - 32px));
  padding: 12px 20px;
  border-radius: 10px;
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  pointer-events: auto;
}

.toast-exito {
  background: #065f46;
  border: 1px solid #059669;
  box-shadow: 0 10px 25px -5px rgba(6, 95, 70, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
}

.toast-exito .toast-icon { color: #a7f3d0; }

.toast-error {
  background: #9f1239;
  border: 1px solid #e11d48;
  box-shadow: 0 10px 25px -5px rgba(159, 18, 57, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
}

.toast-error .toast-icon { color: #fecdd3; }

.toast-info {
  background: #1e293b;
  border: 1px solid #334155;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
}

.toast-info .toast-icon { color: #93c5fd; }

.toast-icon { flex-shrink: 0; }

.toast-fade-enter-active,
.toast-fade-leave-active { transition: all 0.3s ease; }

.toast-fade-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.confirmacion-fondo {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(13, 26, 44, .62);
  backdrop-filter: blur(5px);
}

.confirmacion-modal {
  width: min(100%, 420px);
  padding: 24px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 28px 90px rgba(8, 20, 36, .34);
}

.confirmacion-modal h2 {
  margin: 0 0 8px;
  color: #1b2a40;
  font-size: 18px;
  letter-spacing: -.3px;
}

.confirmacion-modal p {
  margin: 0;
  color: #5d6b7e;
  font-size: 13.5px;
  line-height: 1.5;
}

.confirmacion-modal footer {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 22px;
}

.boton-cancelar,
.boton-confirmar {
  padding: 9px 14px;
  border: 0;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.boton-cancelar {
  background: #edf2f6;
  color: #46556a;
}

.boton-cancelar:hover { background: #e1e8ee; }

.boton-confirmar {
  background: #1e293b;
  color: #fff;
}

.boton-confirmar.boton-peligro { background: #e11d48; }
.boton-confirmar.boton-peligro:hover { background: #be123c; }

.confirmacion-fade-enter-active,
.confirmacion-fade-leave-active { transition: opacity .2s ease; }

.confirmacion-fade-enter-from,
.confirmacion-fade-leave-to { opacity: 0; }
</style>
