
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUsuarioStore = defineStore('usuario', () => {
  const usuario = ref(null)

  const guardarUsuario = (datosUsuario) => {
    usuario.value = datosUsuario
  }

  const cerrarSesion = () => {
    usuario.value = null
  }

  return {
    usuario,
    guardarUsuario,
    cerrarSesion
  }
})