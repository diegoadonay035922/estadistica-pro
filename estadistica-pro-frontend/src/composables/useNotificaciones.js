import { reactive } from 'vue'

// Estado global compartido por toda la app
const estado = reactive({
  toasts: [],
  confirmacion: null
})

let siguienteId = 1

/**
 * Muestra un toast flotante.
 * @param {string} mensaje
 * @param {'exito'|'error'|'info'} tipo
 * @param {number} duracion milisegundos
 */
const mostrarToast = (mensaje, tipo = 'exito', duracion = 3500) => {
  const id = siguienteId++
  estado.toasts.push({ id, mensaje, tipo })
  setTimeout(() => cerrarToast(id), duracion)
}

const cerrarToast = (id) => {
  estado.toasts = estado.toasts.filter((t) => t.id !== id)
}

/**
 * Abre un diálogo de confirmación con el estilo de la app.
 * Devuelve una promesa que resuelve true (confirmar) o false (cancelar).
 */
const confirmar = ({ titulo = '¿Estás seguro?', mensaje = '', textoConfirmar = 'Eliminar', peligro = true } = {}) => {
  return new Promise((resolve) => {
    estado.confirmacion = { titulo, mensaje, textoConfirmar, peligro, resolve }
  })
}

const responderConfirmacion = (valor) => {
  estado.confirmacion?.resolve(valor)
  estado.confirmacion = null
}

export function useNotificaciones() {
  return { estado, mostrarToast, cerrarToast, confirmar, responderConfirmacion }
}
