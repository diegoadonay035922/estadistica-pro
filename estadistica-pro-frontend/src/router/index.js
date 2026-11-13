import { createRouter, createWebHistory } from 'vue-router'
import { useUsuarioStore } from '@/stores/usuario'
import LoginView from '@/views/LoginView.vue'
import ConjuntosView from '@/views/ConjuntosView.vue'
import DetalleConjuntoView from '@/views/DetalleConjuntoView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true }
    },
    {
      path: '/conjuntos',
      name: 'conjuntos',
      component: ConjuntosView,
      meta: { requiresAuth: true }
    },
    {
      path: '/conjuntos/:id',
      name: 'detalle-conjunto',
      component: DetalleConjuntoView,
      meta: { requiresAuth: true }
    },
    {
      path: '/',
      redirect: () => useUsuarioStore().usuario ? '/conjuntos' : '/login'
    }
  ]
})

router.beforeEach((to) => {
  const usuarioStore = useUsuarioStore()
  const tieneSesion = Boolean(usuarioStore.usuario?.id_usuario)

  if (to.meta.requiresAuth && !tieneSesion) {
    return { name: 'login', replace: true }
  }

  if (to.meta.guestOnly && tieneSesion) {
    return { name: 'conjuntos', replace: true }
  }

  return true
})

export default router
