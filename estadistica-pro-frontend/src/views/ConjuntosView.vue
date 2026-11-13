<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUsuarioStore } from '@/stores/usuario'
import api from '@/services/api'
import fondoPagina from '@/assets/images/fondohome.jpg'
import { useNotificaciones } from '@/composables/useNotificaciones'

const { mostrarToast, confirmar } = useNotificaciones()

const usuarioStore = useUsuarioStore()
const router = useRouter()
const conjuntos = ref([])
const error = ref('')
const cargando = ref(true)

// Estados exclusivos para crear/editar conjuntos
const modalConjuntoFormulario = ref(false)
const modoConjuntoFormulario = ref('crear')
const conjuntoEditando = ref(null)
const nombreConjunto = ref('')
const errorConjunto = ref('')
const guardandoConjunto = ref(false)

const obtenerConjuntos = async () => {
  try {
    const idUsuario = usuarioStore.usuario?.id_usuario
    if (!idUsuario) {
      router.replace('/login')
      return
    }
    const response = await api.post('/conjunto', { id_usuario: idUsuario })
    conjuntos.value = response.data.data || []
  } catch (err) {
    console.error('Error al cargar conjuntos:', err)
    error.value = 'No se pudieron cargar los conjuntos.'
  } finally {
    cargando.value = false
  }
}

const abrirFormularioConjunto = (modo, conjunto = null) => {
  modoConjuntoFormulario.value = modo
  conjuntoEditando.value = conjunto
  nombreConjunto.value = conjunto?.nombre_conjunto || ''
  errorConjunto.value = ''
  modalConjuntoFormulario.value = true
}

const guardarConjunto = async () => {
  const nombre = nombreConjunto.value.trim()
  if (!nombre) {
    errorConjunto.value = 'Escribe un nombre para el conjunto.'
    return
  }

  guardandoConjunto.value = true
  errorConjunto.value = ''
  try {
    if (modoConjuntoFormulario.value === 'crear') {
      await api.post('/conjunto/crear', {
        id_usuario: usuarioStore.usuario?.id_usuario,
        nombre_conjunto: nombre
      })
    } else {
      await api.put('/conjunto/editar', {
        id_conjunto: conjuntoEditando.value.id_conjunto,
        nombre_conjunto: nombre
      })
    }
    modalConjuntoFormulario.value = false
    mostrarToast(modoConjuntoFormulario.value === 'crear' ? '¡Conjunto creado con éxito!' : '¡Conjunto renombrado con éxito!')
    await obtenerConjuntos()
  } catch (err) {
    console.error('Error al guardar conjunto:', err)
    errorConjunto.value = err.response?.data?.message || 'No se pudo guardar el conjunto.'
  } finally {
    guardandoConjunto.value = false
  }
}

const eliminarConjunto = async (conjunto) => {
  const confirmado = await confirmar({
    titulo: `¿Eliminar "${conjunto.nombre_conjunto}"?`,
    mensaje: 'Se eliminarán el conjunto y todas sus filas. Esta acción no se puede deshacer.'
  })
  if (!confirmado) return
  try {
    await api.delete('/conjunto', { data: { id_conjunto: conjunto.id_conjunto } })
    conjuntos.value = conjuntos.value.filter((item) => item.id_conjunto !== conjunto.id_conjunto)
    mostrarToast('¡Conjunto eliminado con éxito!')
  } catch (err) {
    console.error('Error al eliminar conjunto:', err)
    mostrarToast(err.response?.data?.message || 'No se pudo eliminar el conjunto.', 'error')
  }
}

// Redirección hacia la ruta de la vista detalle
const abrirConjunto = (conjunto) => {
  router.push(`/conjuntos/${conjunto.id_conjunto}`)
}

const cerrarSesion = () => {
  usuarioStore.cerrarSesion()
  router.replace('/login')
}

onMounted(obtenerConjuntos)
</script>

<template>
  <div class="pagina" :style="{ backgroundImage: `linear-gradient(rgba(243, 246, 250, 0.40), rgba(243, 246, 250, 0.40)), url(${fondoPagina})` }">
    <div class="contenedor">
      <section class="bienvenida">
        <div>
          <h1>¡Bienvenido a Estadística Pro, {{ usuarioStore.usuario?.correo_usuario }}!</h1>
          <p>Administra y consulta tus conjuntos de datos desde un solo lugar.</p>
          <button class="boton-cerrar-sesion" type="button" @click="cerrarSesion">Cerrar sesión</button>
        </div>
      </section>

      <section class="seccion-conjuntos">
        <div class="encabezado">
          <div>
            <h2>Mis conjuntos de datos</h2>
            <p>Tus conjuntos de datos se mostrarán acá</p>
          </div>
          <div class="acciones-conjuntos">
            <span v-if="!cargando" class="contador">{{ conjuntos.length }} conjuntos</span>
            <button class="boton-primario" type="button" @click="abrirFormularioConjunto('crear')">+ Nuevo conjunto</button>
          </div>
        </div>

        <div v-if="cargando" class="cargando-conjuntos">
          <span class="spinner" aria-hidden="true"></span>
          <p>Cargando conjuntos…</p>
        </div>
        <p v-else-if="error" class="mensaje-error">{{ error }}</p>
        <div v-else-if="conjuntos.length > 0" class="grid-conjuntos">
          <article v-for="conjunto in conjuntos" :key="conjunto.id_conjunto" class="tarjeta-conjunto"
            role="button" tabindex="0" @click="abrirConjunto(conjunto)" @keydown.enter="abrirConjunto(conjunto)">
            <span class="icono-conjunto">📋</span>
            <span class="informacion-conjunto">
              <strong>{{ conjunto.nombre_conjunto }}</strong>
              <small>Conjunto de datos</small>
            </span>
            <span class="acciones-tarjeta" @click.stop>
              <button class="boton-mini" type="button" :aria-label="`Renombrar ${conjunto.nombre_conjunto}`" title="Renombrar"
                @click="abrirFormularioConjunto('editar', conjunto)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="boton-mini boton-mini-peligro" type="button" :aria-label="`Eliminar ${conjunto.nombre_conjunto}`" title="Eliminar"
                @click="eliminarConjunto(conjunto)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </span>
            <span class="flecha">→</span>
          </article>
        </div>
        <div v-else class="sin-conjuntos">
          <div class="icono-vacio">📂</div>
          <h3>Aún no tienes conjuntos de datos</h3>
          <p>Crea tu primer conjunto para empezar a organizar tus datos.</p>
          <button class="boton-primario boton-crear-vacio" type="button" @click="abrirFormularioConjunto('crear')">+ Crear mi primer conjunto</button>
        </div>
      </section>
    </div>

    <!-- Modal únicamente para Crear o Renombrar Conjunto -->
    <div v-if="modalConjuntoFormulario" class="fondo-modal fondo-formulario-conjunto" @click.self="modalConjuntoFormulario = false">
      <section class="modal modal-formulario modal-formulario-conjunto" role="dialog" aria-modal="true"
        :aria-label="modoConjuntoFormulario === 'crear' ? 'Crear conjunto' : 'Renombrar conjunto'">
        <header class="modal-encabezado">
          <div>
            <span class="etiqueta-modal">{{ modoConjuntoFormulario === 'crear' ? 'Nuevo espacio de datos' : 'Administrar conjunto' }}</span>
            <h2>{{ modoConjuntoFormulario === 'crear' ? 'Crear conjunto' : 'Cambiar nombre' }}</h2>
          </div>
          <button class="boton-icono" type="button" aria-label="Cerrar" @click="modalConjuntoFormulario = false">×</button>
        </header>
        <form @submit.prevent="guardarConjunto">
          <div class="campo-formulario">
            <label for="nombre-conjunto">Nombre del conjunto</label>
            <input id="nombre-conjunto" v-model="nombreConjunto" type="text" maxlength="100"
              placeholder="Ej. Encuesta socioeconómica" required autofocus />
          </div>
          <p v-if="errorConjunto" class="mensaje-error">{{ errorConjunto }}</p>
          <footer class="pie-formulario">
            <button class="boton-secundario" type="button" @click="modalConjuntoFormulario = false">Cancelar</button>
            <button class="boton-primario" type="submit" :disabled="guardandoConjunto">
              {{ guardandoConjunto ? 'Guardando…' : (modoConjuntoFormulario === 'crear' ? 'Crear conjunto' : 'Guardar cambios') }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.pagina {
  min-height: 100vh;
  width: 100%;
  padding: 30px 28px 56px;
  background-color: #f3f6fa;
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  color: #19283e;
  box-sizing: border-box;
}

.contenedor {
  max-width: 1180px;
  margin: 0 auto;
}

.bienvenida {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 236px;
  padding: 38px 44px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 22px;
  background: radial-gradient(ellipse at 83% 20%, rgba(52, 201, 185, .22), transparent 31%), linear-gradient(120deg, #14233b 0%, #1b3554 66%, #15505b 130%);
  color: white;
  box-shadow: 0 18px 42px rgba(24, 48, 76, .13);
}

.bienvenida::after {
  position: absolute;
  right: 100px;
  bottom: -195px;
  width: 360px;
  height: 360px;
  border: 1px solid rgba(126, 226, 212, .14);
  border-radius: 50%;
  content: "";
  box-shadow: 0 0 0 36px rgba(126, 226, 212, .025), 0 0 0 74px rgba(126, 226, 212, .025);
}

.bienvenida>div:first-child {
  position: relative;
  z-index: 1;
}

.saludo {
  color: #7cdbcf;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.8px;
  text-transform: uppercase;
}

.bienvenida h1 {
  max-width: 750px;
  margin: 12px 0 10px;
  font-size: clamp(25px, 3.2vw, 36px);
  font-weight: 650;
  letter-spacing: -1.1px;
  line-height: 1.2;
}

.bienvenida p {
  margin: 0;
  color: #c0cddd;
  font-size: 14px;
  line-height: 1.6;
}

.icono-bienvenida {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 76px;
  height: 76px;
  flex: 0 0 auto;
  border: 1px solid rgba(152, 230, 219, .3);
  border-radius: 20px;
  background: rgba(117, 218, 207, .12);
  color: #8ce5d6;
  font-size: 32px;
}

.boton-cerrar-sesion {
  margin-top: 20px;
  padding: 9px 13px;
  border: 1px solid rgba(206, 226, 237, .28);
  border-radius: 8px;
  background: rgba(255, 255, 255, .08);
  color: #e6f0f4;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
  transition: background .2s, border-color .2s;
}

.boton-cerrar-sesion:hover {
  border-color: rgba(206, 226, 237, .55);
  background: rgba(255, 255, 255, .15);
}

.seccion-conjuntos {
  margin-top: 24px;
  padding: 30px;
  border: 1px solid #e7ebf0;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.90);
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 26px rgba(26, 44, 67, .045);
}

.encabezado {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  margin-bottom: 22px;
}

.encabezado h2 {
  margin: 0 0 6px;
  color: #1d2c41;
  font-size: 20px;
  letter-spacing: -.35px;
}

.encabezado p {
  margin: 0;
  color: #8290a2;
  font-size: 13px;
}

.contador {
  padding: 8px 12px;
  border: 1px solid #d9f0ec;
  border-radius: 20px;
  background: #eff9f7;
  color: #16857f;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.grid-conjuntos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 14px;
}

.tarjeta-conjunto {
  width: 100%;
  display: flex;
  align-items: center;
  min-height: 90px;
  padding: 16px;
  border: 1px solid #e7ecf1;
  border-radius: 13px;
  background: #fff;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform .18s, border-color .18s, box-shadow .18s, background .18s;
  position: relative;
}

.tarjeta-conjunto:hover {
  transform: translateY(-2px);
  border-color: #a9ddd6;
  background: #fcfffe;
  box-shadow: 0 10px 24px rgba(21, 114, 115, .09);
}

.icono-conjunto {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  margin-right: 14px;
  border-radius: 12px;
  background: #eef8f7;
  color: #178a83;
  font-size: 20px;
}

.informacion-conjunto {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.informacion-conjunto strong {
  overflow: hidden;
  color: #26364b;
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.informacion-conjunto small {
  color: #929eac;
  font-size: 12px;
}

.flecha {
  color: #198e88;
  font-size: 20px;
  transition: transform .18s;
}

.tarjeta-conjunto:hover .flecha {
  transform: translateX(4px);
}

.sin-conjuntos {
  padding: 62px 20px;
  border: 1px dashed #d9e1e8;
  border-radius: 13px;
  background: #fbfcfd;
  text-align: center;
}

.icono-vacio {
  margin-bottom: 14px;
  color: #42a89e;
  font-size: 34px;
}

.sin-conjuntos h3 {
  margin: 0 0 8px;
  color: #334258;
  font-size: 16px;
}

.sin-conjuntos p {
  margin: 0;
  color: #8995a5;
  font-size: 13px;
}

.mensaje-error {
  padding: 12px 15px;
  border: 1px solid #f4d2d0;
  border-radius: 10px;
  background: #fff6f5;
  color: #b33e38;
  font-size: 13px;
}

.fondo-modal {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(13, 26, 44, .62);
  backdrop-filter: blur(5px);
}

.modal {
  width: min(100%, 500px);
  padding: 28px;
  border: 1px solid rgba(255, 255, 255, .65);
  border-radius: 19px;
  background: #fff;
  box-shadow: 0 28px 90px rgba(8, 20, 36, .34);
}

.modal-encabezado {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
  padding-bottom: 18px;
  border-bottom: 1px solid #edf0f4;
}

.modal-encabezado h2 {
  margin: 5px 0 0;
  color: #1b2a40;
  font-size: 23px;
  letter-spacing: -.55px;
}

.etiqueta-modal {
  color: #198b85;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.4px;
  text-transform: uppercase;
}

.boton-icono {
  width: 36px;
  height: 36px;
  border: 1px solid #e6ebf0;
  border-radius: 10px;
  background: #f8fafc;
  color: #647286;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.boton-icono:hover {
  background: #edf4f5;
  color: #1b7778;
}

.boton-primario,
.boton-secundario {
  border: 0;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.boton-primario {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  color: white;
}

.boton-primario:hover {
  background: #116d73;
}

.boton-primario:disabled {
  opacity: .65;
  cursor: wait;
}

.boton-secundario {
  background: #edf7f6;
  color: #147f82;
}

.boton-secundario:hover {
  background: #ddf0ed;
}

.campo-formulario {
  display: grid;
  gap: 7px;
  margin-bottom: 16px;
}

.campo-formulario label {
  color: #46556a;
  font-size: 11px;
  font-weight: 750;
}

.campo-formulario input {
  width: 100%;
  padding: 11px 12px;
  border: 1px solid #dce4eb;
  border-radius: 8px;
  background: #fbfcfd;
  color: #27374c;
  font-size: 13px;
  box-sizing: border-box;
}

.campo-formulario input:focus {
  border-color: #28a99e;
  background: white;
  box-shadow: 0 0 0 3px rgba(40, 169, 158, .1);
}

.pie-formulario {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 22px;
}

.acciones-conjuntos { display: flex; align-items: center; gap: 10px; }
.acciones-tarjeta {
  display: flex;
  gap: 6px;
  margin-left: 8px;
}

.boton-mini {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Botón Renombrar/Editar (#147f82) */
.boton-mini {
  background: rgba(20, 127, 130, 0.12);
  border: 1px solid rgba(20, 127, 130, 0.3);
  color: #147f82;
}

.boton-mini:hover {
  background: #147f82;
  border-color: #147f82;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(20, 127, 130, 0.25);
}

/* Botón Eliminar (Rojo Rose #e11d48) */
.boton-mini-peligro {
  background: rgba(225, 29, 72, 0.12);
  border: 1px solid rgba(225, 29, 72, 0.3);
  color: #e11d48;
}

.boton-mini-peligro:hover {
  background: #e11d48;
  border-color: #e11d48;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(225, 29, 72, 0.25);
}

.boton-crear-vacio { margin-top: 20px; }

.cargando-conjuntos {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 62px 20px;
  color: #8995a5;
  font-size: 13px;
}

.cargando-conjuntos p { margin: 0; }

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #d9f0ec;
  border-top-color: #16857f;
  border-radius: 50%;
  animation: girar .8s linear infinite;
}

@keyframes girar {
  to { transform: rotate(360deg); }
}

@media (max-width: 700px) {
  .pagina { padding: 15px 13px 32px; }
  .bienvenida { min-height: 0; padding: 26px 23px; border-radius: 17px; }
  .bienvenida h1 { max-width: calc(100% - 6px); font-size: 25px; }
  .bienvenida p { max-width: 420px; font-size: 13px; }
  .icono-bienvenida { width: 48px; height: 48px; border-radius: 14px; font-size: 21px; }
  .seccion-conjuntos { margin-top: 15px; padding: 20px 16px; border-radius: 15px; }
  .encabezado { align-items: flex-start; flex-direction: column; gap: 12px; }
  .grid-conjuntos { grid-template-columns: 1fr; }
  .fondo-modal { padding: 11px; }
  .modal { padding: 20px 15px; border-radius: 15px; }
}

@media (max-width: 420px) {
  .icono-bienvenida { display: none; }
  .bienvenida h1 { font-size: 22px; }
  .contador { align-self: flex-start; }
}
</style>