<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUsuarioStore } from '@/stores/usuario'
import api from '@/services/api'
import * as XLSX from 'xlsx'
import { agregarGraficos, descargarBlob } from '@/utils/excelGraficos'
import { useNotificaciones } from '@/composables/useNotificaciones'

const route = useRoute()
const router = useRouter()
const usuarioStore = useUsuarioStore()
const { mostrarToast, confirmar } = useNotificaciones()

const modulos = [
  { 
    id: 'cualitativo', 
    nombre: 'Frecuencia cualitativa', 
    desc: 'Tablas de frecuencias absolutas, relativas y acumuladas',
    icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' 
  },
  { 
    id: 'cuantitativo', 
    nombre: 'Frecuencia cuantitativa', 
    desc: 'Intervalos de clase, marcas de clase y agrupaciones',
    icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' 
  },
  { 
    id: 'diagrama_cajas', 
    nombre: 'Diagrama de cajas', 
    desc: 'Cuartiles (Q1, Q2, Q3), límites e intervalo intercuartílico',
    icon: 'M5 8h14M5 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V8zM12 6v12' 
  },
  { 
    id: 'tendencia_central', 
    nombre: 'Tendencia central', 
    desc: 'Cálculo exacto de Media, Mediana y Moda sin redondeo',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 022 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' 
  },
  { 
    id: 'tendencia_agrupada', 
    nombre: 'Tendencia agrupada', 
    desc: 'Matriz estilo Excel para datos en intervalos',
    icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' 
  },
  { 
    id: 'puntuacion_z', 
    nombre: 'Puntuación Z', 
    desc: 'Desviación estándar, área acumulada y probabilidad puntual',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z' 
  }
]

const idConjunto = route.params.id
const conjunto = ref(null)
const filas = ref([])
const cargando = ref(true)
const errorFilas = ref('')

// Estados de formularios y modals para crear filas
const modalFormularioAbierto = ref(false)
const modoFormulario = ref('crear')
const filaEditando = ref(null)
const camposFormulario = ref([])
const nuevoNombreCampo = ref('')
const guardandoFila = ref(false)

// Estado para la herramienta activa
const herramientaActiva = ref(null)
const vistaModo = ref('datos') // 'datos' | 'calculos'

// Referencias para cerrar desplegables y desmarcar celdas
const refDropdownCualitativo = ref(null)
const refDropdownCuantitativo = ref(null)
const refDropdownCajas = ref(null)
const refDropdownTendencia = ref(null)
const refSpreadsheetContainer = ref(null)

// Estados para Frecuencia Cualitativa
const dropdownCualitativoAbierto = ref(false)
const columnasCualitativasSeleccionadas = ref([])

// Estados para Frecuencia Cuantitativa
const dropdownCuantitativoAbierto = ref(false)
const columnasCuantitativasSeleccionadas = ref([])
const numeroClases = ref(6)

// Estados para Diagrama de Cajas
const dropdownCajasAbierto = ref(false)
const columnasCajasSeleccionadas = ref([])

// Estados para Tendencia Central
const dropdownTendenciaAbierto = ref(false)
const columnasTendenciaSeleccionadas = ref([])

// --- ESTADOS PARA PUNTUACIÓN Z ---
const columnaZSeleccionada = ref('')
const valorCalcularZ = ref('')

// --- ESTADOS PARA TENDENCIA CENTRAL AGRUPADA ---
const celdaSeleccionada = ref({ fila: -1, col: -1 })
const modoEdicion = ref(false)
const inputsMatriz = ref({})
const celdasContenedor = ref({})

const crearFilaVaciaAgrupada = () => ({
  limiteInferior: '',
  limiteSuperior: '',
  frecuenciaAbsoluta: ''
})

const filasAgrupadas = ref([crearFilaVaciaAgrupada()])

// Columnas manuales añadidias dinámicamente y control de cambios pendientes
const columnasManuales = ref([])
const hayCambiosPendientes = ref(false)
const guardandoCambios = ref(false)

// Modal para Nuevo Encabezado
const modalNuevoEncabezadoAbierto = ref(false)
const nombreNuevoEncabezado = ref('')
const errorNuevoEncabezado = ref('')
const inputNuevoEncabezado = ref(null)

const campos = computed(() => {
  const nombres = new Set()
  filas.value.forEach((fila) => {
    Object.keys(fila.datos_json || {}).forEach((nombre) => {
      nombres.add(nombre)
    })
  })
  columnasManuales.value.forEach((nombre) => {
    nombres.add(nombre)
  })
  return [...nombres]
})

const todosLosEncabezados = computed(() => [...campos.value])

// Handler global para cerrar comboboxes y desmarcar celdas
const manejarClickFueraGlobal = (event) => {
  if (refDropdownCualitativo.value && !refDropdownCualitativo.value.contains(event.target)) {
    dropdownCualitativoAbierto.value = false
  }
  if (refDropdownCuantitativo.value && !refDropdownCuantitativo.value.contains(event.target)) {
    dropdownCuantitativoAbierto.value = false
  }
  if (refDropdownCajas.value && !refDropdownCajas.value.contains(event.target)) {
    dropdownCajasAbierto.value = false
  }
  if (refDropdownTendencia.value && !refDropdownTendencia.value.contains(event.target)) {
    dropdownTendenciaAbierto.value = false
  }
  
  if (refSpreadsheetContainer.value && !refSpreadsheetContainer.value.contains(event.target)) {
    celdaSeleccionada.value = { fila: -1, col: -1 }
    modoEdicion.value = false
  }
}

// Selecciones Múltiples
const todoCualitativoSeleccionado = computed(() => {
  return todosLosEncabezados.value.length > 0 && 
         columnasCualitativasSeleccionadas.value.length === todosLosEncabezados.value.length
})
const toggleSeleccionarTodoCualitativo = () => {
  columnasCualitativasSeleccionadas.value = todoCualitativoSeleccionado.value ? [] : [...todosLosEncabezados.value]
}

const todoCuantitativoSeleccionado = computed(() => {
  return todosLosEncabezados.value.length > 0 && 
         columnasCuantitativasSeleccionadas.value.length === todosLosEncabezados.value.length
})
const toggleSeleccionarTodoCuantitativo = () => {
  columnasCuantitativasSeleccionadas.value = todoCuantitativoSeleccionado.value ? [] : [...todosLosEncabezados.value]
}

const todoCajasSeleccionado = computed(() => {
  return todosLosEncabezados.value.length > 0 && 
         columnasCajasSeleccionadas.value.length === todosLosEncabezados.value.length
})
const toggleSeleccionarTodoCajas = () => {
  columnasCajasSeleccionadas.value = todoCajasSeleccionado.value ? [] : [...todosLosEncabezados.value]
}

const todoTendenciaSeleccionado = computed(() => {
  return todosLosEncabezados.value.length > 0 && 
         columnasTendenciaSeleccionadas.value.length === todosLosEncabezados.value.length
})
const toggleSeleccionarTodoTendencia = () => {
  columnasTendenciaSeleccionadas.value = todoTendenciaSeleccionado.value ? [] : [...todosLosEncabezados.value]
}

const validarNumeroClases = (e) => {
  const val = parseInt(e.target.value)
  numeroClases.value = isNaN(val) || val < 1 ? 1 : val
}

const cargarDatos = async () => {
  cargando.value = true
  errorFilas.value = ''
  try {
    const idUsuario = usuarioStore.usuario?.id_usuario
    if (!idUsuario) {
      router.replace('/login')
      return
    }

    const respConjuntos = await api.post('/conjunto', { id_usuario: idUsuario })
    const lista = respConjuntos.data.data || []
    conjunto.value = lista.find(c => String(c.id_conjunto) === String(idConjunto))

    if (!conjunto.value) {
      errorFilas.value = 'El conjunto no existe o no tienes acceso a él.'
      return
    }

    const response = await api.post('/conjunto/filas-id', {
      id_usuario: idUsuario,
      id_conjunto: idConjunto
    })

    filas.value = (response.data.data || []).map((fila) => ({
      ...fila,
      datos_json: typeof fila.datos_json === 'string' ? JSON.parse(fila.datos_json) : (fila.datos_json || {}),
      _modificada: false,
      esNueva: false
    }))
    columnasManuales.value = []
    hayCambiosPendientes.value = false
  } catch (err) {
    console.error('Error al cargar datos:', err)
    errorFilas.value = 'No se pudieron cargar los datos del conjunto.'
  } finally {
    cargando.value = false
  }
}

const abrirFormulario = (modo, fila = null) => {
  modoFormulario.value = modo
  filaEditando.value = fila
  if (modo === 'editar' && fila) {
    camposFormulario.value = campos.value.map((nombre) => ({
      nombre,
      valor: fila.datos_json?.[nombre] == null ? '' : String(fila.datos_json[nombre])
    }))
  } else {
    camposFormulario.value = campos.value.map((nombre) => ({ nombre, valor: '' }))
    if (camposFormulario.value.length === 0) {
      camposFormulario.value.push({ nombre: '', valor: '' })
    }
  }
  nuevoNombreCampo.value = ''
  modalFormularioAbierto.value = true
}

const agregarCampo = () => {
  const nombre = nuevoNombreCampo.value.trim()
  if (!nombre) return
  if (camposFormulario.value.some((campo) => campo.nombre.trim() === nombre)) {
    errorFilas.value = `El campo "${nombre}" ya existe.`
    return
  }
  camposFormulario.value.push({ nombre, valor: '' })
  nuevoNombreCampo.value = ''
  errorFilas.value = ''
}

const quitarCampo = (indice) => {
  camposFormulario.value.splice(indice, 1)
}

const guardarFila = async () => {
  errorFilas.value = ''
  const datos = {}
  for (const campo of camposFormulario.value) {
    const nombre = campo.nombre.trim()
    if (!nombre) {
      errorFilas.value = 'Escribe un nombre para cada campo.'
      return
    }
    if (Object.hasOwn(datos, nombre)) {
      errorFilas.value = `El campo "${nombre}" está repetido.`
      return
    }
    datos[nombre] = campo.valor
  }
  if (Object.keys(datos).length === 0) {
    errorFilas.value = 'Agrega al menos un campo para guardar la fila.'
    return
  }

  if (modoFormulario.value === 'editar' && filaEditando.value) {
    filaEditando.value.datos_json = { ...filaEditando.value.datos_json, ...datos }
    filaEditando.value._modificada = true
    hayCambiosPendientes.value = true

    if (filaEditando.value.id_fila) {
      guardandoFila.value = true
      try {
        await api.put('/conjunto/fila', {
          id_fila: filaEditando.value.id_fila,
          datos_json: filaEditando.value.datos_json
        })
        filaEditando.value._modificada = false
        mostrarToast('Fila actualizada correctamente.')
      } catch (err) {
        console.error('Error al guardar fila:', err)
        errorFilas.value = err.response?.data?.message || 'No se pudo guardar la fila.'
        guardandoFila.value = false
        return
      } finally {
        guardandoFila.value = false
      }
    }
    modalFormularioAbierto.value = false
    return
  }

  guardandoFila.value = true
  try {
    if (modoFormulario.value === 'crear') {
      await api.post('/conjunto/fila', { id_conjunto: idConjunto, datos_json: datos })
    }
    modalFormularioAbierto.value = false
    await cargarDatos()
  } catch (err) {
    console.error('Error al guardar fila:', err)
    errorFilas.value = err.response?.data?.message || 'No se pudo guardar la fila.'
  } finally {
    guardandoFila.value = false
  }
}

const eliminarFila = async (fila) => {
  if (fila.esNueva) {
    filas.value = filas.value.filter((f) => f !== fila)
    hayCambiosPendientes.value =
      filas.value.some((f) => f.esNueva || f._modificada) ||
      columnasManuales.value.length > 0
    return
  }
  const confirmado = await confirmar({
    titulo: '¿Eliminar esta fila?',
    mensaje: 'Esta acción no se puede deshacer.'
  })
  if (!confirmado) return
  try {
    await api.delete('/conjunto/fila', { data: { id_fila: fila.id_fila } })
    mostrarToast('¡Fila eliminada con éxito!')
    await cargarDatos()
  } catch (err) {
    console.error('Error al eliminar fila:', err)
    mostrarToast(err.response?.data?.message || 'No se pudo eliminar la fila.', 'error')
  }
}

const abrirModalNuevoEncabezado = () => {
  nombreNuevoEncabezado.value = ''
  errorNuevoEncabezado.value = ''
  modalNuevoEncabezadoAbierto.value = true
  nextTick(() => {
    if (inputNuevoEncabezado.value) {
      inputNuevoEncabezado.value.focus()
    }
  })
}

const confirmarNuevoEncabezado = () => {
  const nombre = nombreNuevoEncabezado.value.trim()
  if (!nombre) {
    errorNuevoEncabezado.value = 'Ingresa el nombre del encabezado.'
    return
  }
  if (nombre === '#') {
    errorNuevoEncabezado.value = 'No puedes usar "#" como nombre de encabezado ya que está reservado para el correlativo.'
    return
  }
  if (campos.value.some((c) => c.toLowerCase() === nombre.toLowerCase())) {
    errorNuevoEncabezado.value = `La columna "${nombre}" ya existe en la tabla.`
    return
  }

  columnasManuales.value.push(nombre)

  filas.value.forEach((fila) => {
    if (!fila.datos_json) fila.datos_json = {}
    fila.datos_json[nombre] = ''
    fila._modificada = true
  })

  hayCambiosPendientes.value = true
  modalNuevoEncabezadoAbierto.value = false
  nombreNuevoEncabezado.value = ''
  errorNuevoEncabezado.value = ''
}

const quitarColumna = async (nombre) => {
  const confirmado = await confirmar({
    titulo: `¿Eliminar la columna "${nombre}"?`,
    mensaje: 'Se quitarán la columna y sus datos. Recuerda guardar los cambios para aplicarlo.'
  })
  if (!confirmado) return
  columnasManuales.value = columnasManuales.value.filter((c) => c !== nombre)
  filas.value.forEach((f) => {
    if (f.datos_json && Object.hasOwn(f.datos_json, nombre)) {
      delete f.datos_json[nombre]
      f._modificada = true
    }
  })
  hayCambiosPendientes.value = true
}

const agregarFilaDirecta = () => {
  const nuevosDatos = {}
  campos.value.forEach((c) => {
    nuevosDatos[c] = ''
  })

  const nuevaFila = {
    id_fila: null,
    _tempId: 'nueva_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    esNueva: true,
    _modificada: true,
    datos_json: nuevosDatos
  }

  filas.value.push(nuevaFila)
  hayCambiosPendientes.value = true

  nextTick(() => {
    const contenedor = document.querySelector('.table-scroll-wrapper')
    if (contenedor) {
      contenedor.scrollTop = contenedor.scrollHeight
    }
  })
}

const marcarFilaModificada = (fila) => {
  fila._modificada = true
  hayCambiosPendientes.value = true
}

const guardarCambios = async () => {
  guardandoCambios.value = true
  errorFilas.value = ''

  try {
    const filasParaEditar = filas.value.filter(
      (f) => !f.esNueva && (f._modificada || columnasManuales.value.length > 0)
    )
    const filasParaCrear = filas.value.filter((f) => f.esNueva)

    if (filasParaEditar.length === 0 && filasParaCrear.length === 0) {
      mostrarToast('No hay cambios pendientes para guardar.', 'info')
      guardandoCambios.value = false
      return
    }

    try {
      await api.put('/conjunto/filas-batch', {
        id_conjunto: Number(idConjunto),
        filas: filasParaEditar.map((f) => ({
          id_fila: f.id_fila,
          datos_json: f.datos_json
        })),
        filas_nuevas: filasParaCrear.map((f) => ({
          datos_json: f.datos_json
        }))
      })
    } catch (batchErr) {
      console.warn('Endpoint batch no respondió, ejecutando fallback individual:', batchErr)
      for (const f of filasParaEditar) {
        await api.put('/conjunto/fila', {
          id_fila: f.id_fila,
          datos_json: f.datos_json
        })
      }
      for (const f of filasParaCrear) {
        await api.post('/conjunto/fila', {
          id_conjunto: Number(idConjunto),
          datos_json: f.datos_json
        })
      }
    }

    columnasManuales.value = []
    hayCambiosPendientes.value = false
    mostrarToast('¡Cambios guardados con éxito!')
    await cargarDatos()
  } catch (err) {
    console.error('Error al guardar cambios:', err)
    errorFilas.value = err.response?.data?.message || 'Error al guardar los cambios en la base de datos.'
  } finally {
    guardandoCambios.value = false
  }
}

const volver = () => {
  router.push('/conjuntos')
}

// 1. Frecuencia CUALITATIVA
const calcularFrecuenciasCualitativas = (columna) => {
  const conteo = {}
  let totalMuestras = 0

  filas.value.forEach((fila) => {
    let val = fila.datos_json?.[columna]
    val = (val === null || val === undefined || val === '') ? '(Vacío)' : String(val)
    conteo[val] = (conteo[val] || 0) + 1
    totalMuestras++
  })

  let absAcumulada = 0
  let relAcumulada = 0

  const filasTabla = Object.entries(conteo).map(([valor, abs]) => {
    absAcumulada += abs
    const rel = totalMuestras > 0 ? abs / totalMuestras : 0
    relAcumulada += rel

    return {
      valor,
      frecAbsoluta: abs,
      frecAbsAcumulada: absAcumulada,
      frecRelativa: rel,
      frecRelAcumulada: Math.min(relAcumulada, 1)
    }
  })

  return { filasTabla, totalMuestras }
}

const generarExcelCualitativo = async () => {
  if (columnasCualitativasSeleccionadas.value.length === 0) {
    mostrarToast('Por favor selecciona al menos un campo cualitativo.', 'error')
    return
  }

  const wb = XLSX.utils.book_new()
  const graficos = []

  columnasCualitativasSeleccionadas.value.forEach((columna, idx) => {
    const { filasTabla, totalMuestras } = calcularFrecuenciasCualitativas(columna)

    const datosHoja = [
      [columna, 'Frecuencia Absoluta (f)', 'Frecuencia Absoluta Acum. (F)', 'Frecuencia Relativa (fr)', 'Frecuencia Relativa Acum. (Fr)']
    ]

    filasTabla.forEach((f) => {
      datosHoja.push([f.valor, f.frecAbsoluta, f.frecAbsAcumulada, Number(f.frecRelativa.toFixed(4)), Number(f.frecRelAcumulada.toFixed(4))])
    })

    datosHoja.push(['Total', totalMuestras, '-', 1, '-'])

    const ws = XLSX.utils.aoa_to_sheet(datosHoja)
    let nombreHoja = `${columna}`.replace(/[\\/?*:[\]]/g, '').slice(0, 26)
    const nombreFinalHoja = `H${idx + 1}_${nombreHoja}`

    XLSX.utils.book_append_sheet(wb, ws, nombreFinalHoja)

    // Gráfico de pastel con la frecuencia relativa (columna D), sin la fila Total
    if (filasTabla.length > 0) {
      graficos.push({
        tipo: 'pastel',
        indiceHoja: idx,
        nombreHoja: nombreFinalHoja,
        titulo: `Frecuencia relativa - ${columna}`,
        nombreSerie: 'Frecuencia Relativa (fr)',
        columnaCategorias: 'A',
        columnaValores: 'D',
        ancla: { col: 7, fila: 1 }, // índice 0 = A, 7 = H
        filaInicio: 2,
        filaFin: filasTabla.length + 1,
        categorias: filasTabla.map((f) => f.valor),
        valores: filasTabla.map((f) => Number(f.frecRelativa.toFixed(4)))
      })
    }
  })

  const nombreArchivo = `${conjunto.value?.nombre_conjunto || 'Conjunto'}_Frecuencias_Cualitativas.xlsx`
  try {
    const archivo = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = await agregarGraficos(archivo, graficos)
    descargarBlob(blob, nombreArchivo)
  } catch (err) {
    console.error('Error al generar el gráfico de pastel:', err)
    mostrarToast('No se pudo agregar el gráfico; se descargó el Excel sin gráfico.', 'error')
    XLSX.writeFile(wb, nombreArchivo)
  }
}

// 2. Frecuencia CUANTITATIVA
const calcularFrecuenciasCuantitativas = (columna, numClases) => {
  const valoresNumericos = []

  filas.value.forEach((fila) => {
    let val = fila.datos_json?.[columna]
    let num = parseFloat(val)
    if (!isNaN(num)) valoresNumericos.push(num)
  })

  if (valoresNumericos.length === 0) {
    return { error: `La columna "${columna}" no contiene datos numéricos válidos.` }
  }

  const min = Math.min(...valoresNumericos)
  const max = Math.max(...valoresNumericos)
  const rango = Math.round((max - min) * 100) / 100

  let amplitudSinRedondear = numClases > 0 ? rango / numClases : 0
  let amplitud = Math.ceil(amplitudSinRedondear * 10) / 10
  if (amplitud === 0) amplitud = 0.1

  const totalMuestras = valoresNumericos.length
  const intervalos = []

  let limInfActual = min
  let absAcumulada = 0
  let relAcumulada = 0

  for (let i = 0; i < numClases; i++) {
    const limSupActual = Math.round((limInfActual + amplitud) * 10) / 10
    const puntoMedio = Math.round(((limInfActual + limSupActual) / 2) * 100) / 100

    // Primera clase cerrada [LI, LS]; las demás (LI, LS]. Así ningún dato queda fuera
    let abs = i === 0
      ? valoresNumericos.filter(v => v >= limInfActual && v <= limSupActual).length
      : valoresNumericos.filter(v => v > limInfActual && v <= limSupActual).length

    absAcumulada += abs
    const rel = totalMuestras > 0 ? abs / totalMuestras : 0
    relAcumulada += rel

    intervalos.push({
      clase: i + 1,
      limInf: limInfActual,
      limSup: limSupActual,
      puntoMedio,
      frecAbsoluta: abs,
      frecAbsAcumulada: absAcumulada,
      frecRelativa: rel,
      frecRelAcumulada: Math.min(relAcumulada, 1)
    })

    limInfActual = limSupActual
  }

  return { intervalos, totalMuestras, min, max, rango, amplitud }
}

const generarExcelCuantitativo = async () => {
  if (columnasCuantitativasSeleccionadas.value.length === 0) {
    mostrarToast('Por favor selecciona al menos un campo cuantitativo.', 'error')
    return
  }

  const k = parseInt(numeroClases.value) || 1
  const wb = XLSX.utils.book_new()
  const graficos = []
  let hubosErrores = false

  columnasCuantitativasSeleccionadas.value.forEach((columna, idx) => {
    const res = calcularFrecuenciasCuantitativas(columna, k)

    if (res.error) {
      mostrarToast(res.error, 'error')
      hubosErrores = true
      return
    }

    const { intervalos, totalMuestras, min, max, rango, amplitud } = res

    const datosHoja = [
      [`Análisis Cuantitativo: ${columna}`],
      [`Dato Mínimo`, min],
      [`Dato Máximo`, max],
      [`Rango`, rango],
      [`Número de Clases`, k],
      [`Amplitud de Clase`, amplitud],
      [],
      ['Clase', 'Límite Inferior', 'Límite Superior', 'Punto Medio (Xi)', 'Frecuencia Absoluta (f)', 'Frecuencia Absoluta Acum. (F)', 'Frecuencia Relativa (fr)', 'Frecuencia Relativa Acum. (Fr)']
    ]

    intervalos.forEach((item) => {
      datosHoja.push([item.clase, item.limInf, item.limSup, item.puntoMedio, item.frecAbsoluta, item.frecAbsAcumulada, Number(item.frecRelativa.toFixed(4)), Number(item.frecRelAcumulada.toFixed(4))])
    })

    datosHoja.push(['Total', '-', '-', '-', totalMuestras, '-', 1, '-'])

    const ws = XLSX.utils.aoa_to_sheet(datosHoja)
    let nombreHoja = `${columna}`.replace(/[\\/?*:[\]]/g, '').slice(0, 26)
    const nombreFinalHoja = `H${idx + 1}_${nombreHoja}`

    XLSX.utils.book_append_sheet(wb, ws, nombreFinalHoja)

    // Histograma y polígono de frecuencia: Punto Medio (columna D) vs Frecuencia Absoluta (columna E).
    // La tabla empieza en la fila 8 (encabezados), así que las clases van de la fila 9 a la 8 + k.
    const indiceHoja = wb.SheetNames.length - 1
    const baseGrafico = {
      indiceHoja,
      nombreHoja: nombreFinalHoja,
      nombreSerie: 'Frecuencia Absoluta (f)',
      columnaCategorias: 'D',
      columnaValores: 'E',
      filaInicio: 9,
      filaFin: 8 + intervalos.length,
      categorias: intervalos.map((item) => item.puntoMedio),
      valores: intervalos.map((item) => item.frecAbsoluta),
      tituloEjeX: 'Punto Medio de Clase (Xi)',
      tituloEjeY: 'Frecuencia Absoluta (f)'
    }
    graficos.push(
      { ...baseGrafico, tipo: 'histograma', titulo: `Histograma - ${columna}`, ancla: { col: 10, fila: 1, ancho: 8, alto: 19 } },
      { ...baseGrafico, tipo: 'poligono', titulo: `Polígono de Frecuencia - ${columna}`, ancla: { col: 10, fila: 21, ancho: 8, alto: 19 } }
    )
  })

  if (!hubosErrores) {
    const nombreArchivo = `${conjunto.value?.nombre_conjunto || 'Conjunto'}_Frecuencias_Cuantitativas.xlsx`
    try {
      const archivo = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = await agregarGraficos(archivo, graficos)
      descargarBlob(blob, nombreArchivo)
    } catch (err) {
      console.error('Error al generar el histograma / polígono:', err)
      mostrarToast('No se pudieron agregar los gráficos; se descargó el Excel sin gráficos.', 'error')
      XLSX.writeFile(wb, nombreArchivo)
    }
  }
}

// 3. DIAGRAMA DE CAJAS
const calcularCuartil = (arrOrdenado, p) => {
  const pos = p * (arrOrdenado.length - 1)
  const base = Math.floor(pos)
  const resto = pos - base
  return arrOrdenado[base + 1] !== undefined 
    ? arrOrdenado[base] + resto * (arrOrdenado[base + 1] - arrOrdenado[base]) 
    : arrOrdenado[base]
}

const calcularDiagramaCajas = (columna) => {
  const valoresNumericos = []
  filas.value.forEach((fila) => {
    let val = fila.datos_json?.[columna]
    let num = parseFloat(val)
    if (!isNaN(num)) valoresNumericos.push(num)
  })

  if (valoresNumericos.length === 0) {
    return { error: `La columna "${columna}" no contiene datos numéricos válidos.` }
  }

  valoresNumericos.sort((a, b) => a - b)

  const min = valoresNumericos[0]
  const max = valoresNumericos[valoresNumericos.length - 1]
  const q1 = calcularCuartil(valoresNumericos, 0.25)
  const q2 = calcularCuartil(valoresNumericos, 0.50)
  const q3 = calcularCuartil(valoresNumericos, 0.75)
  const iqr = q3 - q1

  return { totalMuestras: valoresNumericos.length, min, max, q1, q2, q3, iqr }
}

const generarExcelDiagramaCajas = async () => {
  if (columnasCajasSeleccionadas.value.length === 0) {
    mostrarToast('Por favor selecciona al menos un campo para el diagrama de cajas.', 'error')
    return
  }

  const wb = XLSX.utils.book_new()
  const graficos = []
  let hubosErrores = false

  columnasCajasSeleccionadas.value.forEach((columna, idx) => {
    const res = calcularDiagramaCajas(columna)

    if (res.error) {
      mostrarToast(res.error, 'error')
      hubosErrores = true
      return
    }

    const { totalMuestras, min, max, q1, q2, q3, iqr } = res

    const datosHoja = [
      [`Diagrama de Cajas y Bigotes - Campo: ${columna}`],
      [],
      ['Métrica Estadística', 'Valor'],
      ['Total de Muestras (n)', totalMuestras],
      ['Valor Mínimo', min],
      ['Cuartil 1 (Q1)', q1],
      ['Cuartil 2 / Mediana (Q2)', q2],
      ['Cuartil 3 (Q3)', q3],
      ['Valor Máximo', max],
      ['Rango Intercuartílico (IQR)', iqr]
    ]

    const ws = XLSX.utils.aoa_to_sheet(datosHoja)
    let nombreHoja = `${columna}`.replace(/[\\/?*:[\]]/g, '').slice(0, 26)
    const nombreFinalHoja = `H${idx + 1}_${nombreHoja}`

    XLSX.utils.book_append_sheet(wb, ws, nombreFinalHoja)

    // Diagrama de cajas y bigotes enlazado a las celdas de la tabla:
    // B5 = Mínimo, B6 = Q1, B7 = Mediana, B8 = Q3, B9 = Máximo
    graficos.push({
      tipo: 'cajas',
      indiceHoja: wb.SheetNames.length - 1,
      nombreHoja: nombreFinalHoja,
      titulo: `Diagrama de Cajas y Bigotes - ${columna}`,
      categoria: columna,
      tituloEjeY: 'Valores',
      valores: {
        min: { celda: 'B5', valor: min },
        q1: { celda: 'B6', valor: q1 },
        q2: { celda: 'B7', valor: q2 },
        q3: { celda: 'B8', valor: q3 },
        max: { celda: 'B9', valor: max }
      },
      ancla: { col: 5, fila: 1, ancho: 7, alto: 22 } // índice 0 = A, 5 = F
    })
  })

  if (!hubosErrores) {
    const nombreArchivo = `${conjunto.value?.nombre_conjunto || 'Conjunto'}_Diagrama_Cajas.xlsx`
    try {
      const archivo = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = await agregarGraficos(archivo, graficos)
      descargarBlob(blob, nombreArchivo)
    } catch (err) {
      console.error('Error al generar el diagrama de cajas:', err)
      mostrarToast('No se pudo agregar el gráfico; se descargó el Excel sin gráfico.', 'error')
      XLSX.writeFile(wb, nombreArchivo)
    }
  }
}

// 4. TENDENCIA CENTRAL SIMPLE
const calcularTendenciaCentral = (columna) => {
  const valoresNumericos = []
  filas.value.forEach((fila) => {
    let val = fila.datos_json?.[columna]
    let num = parseFloat(val)
    if (!isNaN(num)) valoresNumericos.push(num)
  })

  if (valoresNumericos.length === 0) {
    return { error: `La columna "${columna}" no contiene datos numéricos válidos.` }
  }

  const n = valoresNumericos.length
  const suma = valoresNumericos.reduce((acc, curr) => acc + curr, 0)
  const media = suma / n

  const ordenados = [...valoresNumericos].sort((a, b) => a - b)
  const mitad = Math.floor(n / 2)
  const mediana = n % 2 === 0 ? (ordenados[mitad - 1] + ordenados[mitad]) / 2 : ordenados[mitad]

  const frecuencias = {}
  let maxFrec = 0
  ordenados.forEach((val) => {
    frecuencias[val] = (frecuencias[val] || 0) + 1
    if (frecuencias[val] > maxFrec) maxFrec = frecuencias[val]
  })

  let modas = []
  if (maxFrec > 1) {
    modas = Object.keys(frecuencias).filter((key) => frecuencias[key] === maxFrec).map(Number)
  }

  const modaTexto = modas.length === 0 || modas.length === Object.keys(frecuencias).length ? 'No hay moda' : modas.join(', ')

  return { totalMuestras: n, media, mediana, moda: modaTexto }
}

const generarExcelTendenciaCentral = () => {
  if (columnasTendenciaSeleccionadas.value.length === 0) {
    mostrarToast('Por favor selecciona al menos un campo para analizar la tendencia central.', 'error')
    return
  }

  const wb = XLSX.utils.book_new()
  let hubosErrores = false

  columnasTendenciaSeleccionadas.value.forEach((columna, idx) => {
    const res = calcularTendenciaCentral(columna)

    if (res.error) {
      mostrarToast(res.error, 'error')
      hubosErrores = true
      return
    }

    const { totalMuestras, media, mediana, moda } = res

    const datosHoja = [
      [`Medidas de Tendencia Central - Campo: ${columna}`],
      [],
      ['Métrica Estadística', 'Valor'],
      ['Total de Muestras (n)', totalMuestras],
      ['Media (Promedio)', media],
      ['Mediana', mediana],
      ['Moda', moda]
    ]

    const ws = XLSX.utils.aoa_to_sheet(datosHoja)
    let nombreHoja = `${columna}`.replace(/[\\/?*:[\]]/g, '').slice(0, 26)
    const nombreFinalHoja = `H${idx + 1}_${nombreHoja}`

    XLSX.utils.book_append_sheet(wb, ws, nombreFinalHoja)
  })

  if (!hubosErrores) {
    const nombreArchivo = `${conjunto.value?.nombre_conjunto || 'Conjunto'}_Tendencia_Central.xlsx`
    XLSX.writeFile(wb, nombreArchivo)
  }
}

// 6. PUNTUACIÓN Z
const funcionErf = (x) => {
  const a1 =  0.254829592, a2 = -0.284496736, a3 =  1.421413741
  const a4 = -1.453152027, a5 =  1.061405429, p  =  0.3275911
  const sign = x < 0 ? -1 : 1
  x = Math.abs(x)
  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  return sign * y
}

const cdfNorm = (z) => 0.5 * (1 + funcionErf(z / Math.sqrt(2)))

const pdfNorm = (x, media, desv) => {
  if (desv <= 0) return 0
  return (1 / (desv * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - media) / desv, 2))
}

const calcularPuntuacionZModulo = computed(() => {
  if (!columnaZSeleccionada.value) return null

  const valoresNumericos = []
  filas.value.forEach((fila) => {
    let val = fila.datos_json?.[columnaZSeleccionada.value]
    let num = parseFloat(val)
    if (!isNaN(num)) valoresNumericos.push(num)
  })

  if (valoresNumericos.length === 0) return null

  const n = valoresNumericos.length
  const suma = valoresNumericos.reduce((acc, curr) => acc + curr, 0)
  const media = suma / n

  const ordenados = [...valoresNumericos].sort((a, b) => a - b)
  const min = ordenados[0]
  const max = ordenados[ordenados.length - 1]
  const rango = max - min

  const mitad = Math.floor(n / 2)
  const mediana = n % 2 === 0 ? (ordenados[mitad - 1] + ordenados[mitad]) / 2 : ordenados[mitad]

  const frecuencias = {}
  let maxFrec = 0
  ordenados.forEach((val) => {
    frecuencias[val] = (frecuencias[val] || 0) + 1
    if (frecuencias[val] > maxFrec) maxFrec = frecuencias[val]
  })

  let modas = []
  if (maxFrec > 1) {
    modas = Object.keys(frecuencias).filter((key) => frecuencias[key] === maxFrec).map(Number)
  }
  const modaTexto = modas.length === 0 || modas.length === Object.keys(frecuencias).length ? 'No hay moda' : modas.join(', ')

  const varianza = n > 1 
    ? ordenados.reduce((acc, v) => acc + Math.pow(v - media, 2), 0) / (n - 1)
    : 0
  const desviacionEstandar = Math.sqrt(varianza)

  const xEval = parseFloat(valorCalcularZ.value)
  const xEsValido = !isNaN(xEval)
  const zScore = (xEsValido && desviacionEstandar > 0) ? (xEval - media) / desviacionEstandar : 0
  const porcentaje = xEsValido ? cdfNorm(zScore) * 100 : 0

  const desgloseMuestra = ordenados.map((val) => {
    const zInd = desviacionEstandar > 0 ? (val - media) / desviacionEstandar : 0
    return {
      valor: val,
      zScore: zInd,
      distribucionNormal: pdfNorm(val, media, desviacionEstandar)
    }
  })

  return {
    n, media, mediana, moda: modaTexto, min, max, rango, desviacionEstandar,
    xEval: xEsValido ? xEval : '', zScore, porcentaje, desgloseMuestra
  }
})

const seleccionarCampoZ = (col) => {
  columnaZSeleccionada.value = col
  valorCalcularZ.value = ''
}

const generarExcelPuntuacionZ = async () => {
  const calc = calcularPuntuacionZModulo.value
  if (!columnaZSeleccionada.value || !calc) {
    mostrarToast('Por favor selecciona un campo numérico válido.', 'error')
    return
  }

  const wb = XLSX.utils.book_new()

  const wsData = [
    [`ANÁLISIS DE PUNTUACIÓN Z: ${columnaZSeleccionada.value}`],
    [],
    ['Métrica Estadística', 'Valor'],
    ['Muestra (n)', calc.n],
    ['Media (x̄)', calc.media],
    ['Mediana', calc.mediana],
    ['Moda', calc.moda],
    ['Mínimo', calc.min],
    ['Máximo', calc.max],
    ['Rango', calc.rango],
    ['Desviación Estándar (s)', calc.desviacionEstandar],
    [],
    ['PANEL DE EVALUACIÓN DE Z'],
    [columnaZSeleccionada.value, calc.xEval !== '' ? calc.xEval : '-'],
    ['Z', calc.zScore],
    ['%', `${Math.round(calc.porcentaje)}%`],
    [],
    [columnaZSeleccionada.value, 'Distribución normal']
  ]

  calc.desgloseMuestra.forEach((item) => {
    wsData.push([
      item.valor,
      item.distribucionNormal
    ])
  })

  const ws = XLSX.utils.aoa_to_sheet(wsData)

  let nombreHoja = `${columnaZSeleccionada.value}`.replace(/[\\/?*:[\]]/g, '').slice(0, 26)
  const nombreFinalHoja = `H1_Z_${nombreHoja}`

  XLSX.utils.book_append_sheet(wb, ws, nombreFinalHoja)

  // Campana de Gauss: valores (columna A) vs distribución normal (columna B).
  // La tabla tiene su encabezado en la fila 18, así que los datos van de la fila 19 a la 18 + n.
  const FILA_ENCABEZADO_DISTRIBUCION = 18
  const xEvaluado = calc.xEval !== '' ? calc.xEval : null

  // Escala del eje X redondeada a un paso "bonito" (incluye el valor evaluado si lo hay)
  const extremos = [calc.min, calc.max, ...(xEvaluado !== null ? [xEvaluado] : [])]
  const rangoX = Math.max(...extremos) - Math.min(...extremos) || Math.abs(calc.max) || 1
  const potencia = 10 ** Math.floor(Math.log10(rangoX / 6))
  const pasoX = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => rangoX / p <= 8)
  const xMin = Math.floor(Math.min(...extremos) / pasoX) * pasoX
  const xMax = Math.ceil(Math.max(...extremos) / pasoX) * pasoX
  const margen = xMin === xMax ? pasoX : 0

  const grafico = {
    tipo: 'campana',
    indiceHoja: 0,
    nombreHoja: nombreFinalHoja,
    titulo: `Campana de Gauss - ${columnaZSeleccionada.value}`,
    nombreSerie: 'Distribución normal',
    columnaCategorias: 'A',
    columnaValores: 'B',
    filaInicio: FILA_ENCABEZADO_DISTRIBUCION + 1,
    filaFin: FILA_ENCABEZADO_DISTRIBUCION + calc.desgloseMuestra.length,
    categorias: calc.desgloseMuestra.map((item) => item.valor),
    valores: calc.desgloseMuestra.map((item) => item.distribucionNormal),
    tituloEjeX: columnaZSeleccionada.value,
    tituloEjeY: 'Distribución normal f(x)',
    ejeXMin: Number((xMin - margen).toFixed(4)),
    ejeXMax: Number((xMax + margen).toFixed(4)),
    puntoEvaluado: xEvaluado !== null && calc.desviacionEstandar > 0
      ? {
          nombre: `Valor evaluado (x = ${xEvaluado})`,
          x: xEvaluado,
          y: pdfNorm(xEvaluado, calc.media, calc.desviacionEstandar),
          etiqueta: `x = ${xEvaluado} | Z = ${calc.zScore.toFixed(2)} | ${calc.porcentaje.toFixed(2)}%`
        }
      : null,
    ancla: { col: 4, fila: 1, ancho: 9, alto: 22 } // índice 0 = A, 4 = E
  }

  const nombreArchivo = `${conjunto.value?.nombre_conjunto || 'Conjunto'}_Puntuacion_Z.xlsx`
  try {
    const archivo = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = await agregarGraficos(archivo, [grafico])
    descargarBlob(blob, nombreArchivo)
  } catch (err) {
    console.error('Error al generar la campana de Gauss:', err)
    mostrarToast('No se pudo agregar el gráfico; se descargó el Excel sin gráfico.', 'error')
    XLSX.writeFile(wb, nombreArchivo)
  }
}

// --- TENDENCIA CENTRAL AGRUPADA ---
const columnasClaves = ['limiteInferior', 'limiteSuperior', 'frecuenciaAbsoluta']

const tablaCalculadaAgrupada = computed(() => {
  let acumuladaFrecuencia = 0
  let totalFi = 0

  filasAgrupadas.value.forEach((f) => {
    const fi = parseFloat(f.frecuenciaAbsoluta) || 0
    totalFi += fi
  })

  return filasAgrupadas.value.map((f) => {
    const li = parseFloat(f.limiteInferior)
    const ls = parseFloat(f.limiteSuperior)
    const fi = parseFloat(f.frecuenciaAbsoluta) || 0

    const tieneLimites = !isNaN(li) && !isNaN(ls)
    const puntoMedio = tieneLimites ? (li + ls) / 2 : null
    const fr = totalFi > 0 ? (fi / totalFi) * 100 : 0

    acumuladaFrecuencia += fi

    return {
      limiteInferior: f.limiteInferior,
      limiteSuperior: f.limiteSuperior,
      puntoMedio,
      frecuenciaAbsoluta: fi,
      frecuenciaRelativa: fr,
      frecuenciaAcumulada: acumuladaFrecuencia,
      frecuenciaRelativaAcumulada: totalFi > 0 ? (acumuladaFrecuencia / totalFi) * 100 : 0
    }
  })
})

const totalFrecuenciaAbsolutaAgrupada = computed(() => {
  return tablaCalculadaAgrupada.value.reduce((acc, f) => acc + f.frecuenciaAbsoluta, 0)
})

const agregarFilaAgrupada = () => {
  filasAgrupadas.value.push(crearFilaVaciaAgrupada())
}

const quitarFilaAgrupada = (index) => {
  if (filasAgrupadas.value.length > 1) {
    filasAgrupadas.value.splice(index, 1)
  } else {
    filasAgrupadas.value = [crearFilaVaciaAgrupada()]
  }
}

const limpiarTablaAgrupada = () => {
  filasAgrupadas.value = [crearFilaVaciaAgrupada()]
  celdaSeleccionada.value = { fila: -1, col: -1 }
  modoEdicion.value = false
}

const seleccionarCelda = (filaIndex, colIndex) => {
  celdaSeleccionada.value = { fila: filaIndex, col: colIndex }
  modoEdicion.value = false
  nextTick(() => {
    const elContenedor = celdasContenedor.value[`${filaIndex}-${colIndex}`]
    if (elContenedor) elContenedor.focus()
  })
}

const activarEdicion = (filaIndex, colIndex) => {
  celdaSeleccionada.value = { fila: filaIndex, col: colIndex }
  modoEdicion.value = true
  nextTick(() => {
    const elInput = inputsMatriz.value[`${filaIndex}-${colIndex}`]
    if (elInput) elInput.focus()
  })
}

const manejarTecladoTabla = (e) => {
  const { fila, col } = celdaSeleccionada.value
  if (fila === -1 || col === -1) return

  const numFilas = filasAgrupadas.value.length
  const numCols = columnasClaves.length

  if (!modoEdicion.value) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (fila < numFilas - 1) seleccionarCelda(fila + 1, col)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (fila > 0) seleccionarCelda(fila - 1, col)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      if (col < numCols - 1) seleccionarCelda(fila, col + 1)
      else if (fila < numFilas - 1) seleccionarCelda(fila + 1, 0)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (col > 0) seleccionarCelda(fila, col - 1)
      else if (fila > 0) seleccionarCelda(fila - 1, numCols - 1)
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault()
      activarEdicion(fila, col)
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      activarEdicion(fila, col)
    }
  } else {
    if (e.key === 'Enter') {
      e.preventDefault()
      modoEdicion.value = false
      if (fila < numFilas - 1) seleccionarCelda(fila + 1, col)
      else seleccionarCelda(fila, col)
    } else if (e.key === 'Escape') {
      modoEdicion.value = false
      seleccionarCelda(fila, col)
    }
  }
}

const calcularYGenerarExcelAgrupado = () => {
  const datos = tablaCalculadaAgrupada.value
  const n = totalFrecuenciaAbsolutaAgrupada.value

  if (n === 0) {
    mostrarToast('Ingresa datos válidos con frecuencias absolutas mayores a cero.', 'error')
    return
  }

  let sumaXiFi = 0
  let todosLosPuntosMediosValidos = true

  datos.forEach((f) => {
    if (f.puntoMedio === null) todosLosPuntosMediosValidos = false
    else sumaXiFi += f.puntoMedio * f.frecuenciaAbsoluta
  })

  if (!todosLosPuntosMediosValidos) {
    mostrarToast('Asegúrate de ingresar Límites Inferiores y Superiores válidos en todas las filas.', 'error')
    return
  }

  const media = sumaXiFi / n

  const posicionMediana = n / 2
  let idxMediano = datos.findIndex((f) => f.frecuenciaAcumulada >= posicionMediana)
  if (idxMediano === -1) idxMediano = datos.length - 1

  const filaMediana = datos[idxMediano]
  const liMediano = parseFloat(filaMediana.limiteInferior)
  const lsMediano = parseFloat(filaMediana.limiteSuperior)
  const fiMediano = filaMediana.frecuenciaAbsoluta
  const fAnteriorMediano = idxMediano > 0 ? datos[idxMediano - 1].frecuenciaAcumulada : 0
  const amplitudMediana = lsMediano - liMediano

  let mediana = liMediano
  if (fiMediano > 0) {
    mediana = liMediano + ((posicionMediana - fAnteriorMediano) / fiMediano) * amplitudMediana
  }

  let maxFi = -1
  let idxModal = 0

  datos.forEach((f, idx) => {
    if (f.frecuenciaAbsoluta > maxFi) {
      maxFi = f.frecuenciaAbsoluta
      idxModal = idx
    }
  })

  const filaModal = datos[idxModal]
  const liModal = parseFloat(filaModal.limiteInferior)
  const lsModal = parseFloat(filaModal.limiteSuperior)
  const fiModal = filaModal.frecuenciaAbsoluta
  const fiAnterior = idxModal > 0 ? datos[idxModal - 1].frecuenciaAbsoluta : 0
  const fiSiguiente = idxModal < datos.length - 1 ? datos[idxModal + 1].frecuenciaAbsoluta : 0
  const amplitudModal = lsModal - liModal

  const d1 = fiModal - fiAnterior
  const d2 = fiModal - fiSiguiente

  let moda = liModal
  if (d1 + d2 > 0) {
    moda = liModal + (d1 / (d1 + d2)) * amplitudModal
  }

  const wb = XLSX.utils.book_new()

  const datosHoja = [
    ['Límite inferior', 'Límite superior', 'Punto medio de clase', 'Frecuencia absoluta', 'Frecuencia relativa', 'Frecuencia acumulada', 'Frecuencia relativa acumulada']
  ]

  datos.forEach((f) => {
    datosHoja.push([
      parseFloat(f.limiteInferior) || 0,
      parseFloat(f.limiteSuperior) || 0,
      f.puntoMedio,
      f.frecuenciaAbsoluta,
      `${f.frecuenciaRelativa.toFixed(2)}%`,
      f.frecuenciaAcumulada,
      `${f.frecuenciaRelativaAcumulada.toFixed(2)}%`
    ])
  })

  datosHoja.push(['Total', '', '', n, '100.00%', '', ''])
  datosHoja.push([])
  datosHoja.push(['MÉTRICAS DE TENDENCIA CENTRAL AGRUPADA'])
  datosHoja.push(['Posición Mediana (n / 2)', posicionMediana])
  datosHoja.push(['Media Agrupada (x̄)', media])
  datosHoja.push(['Mediana Agrupada (Me)', mediana])
  datosHoja.push(['Moda Agrupada (Mo)', moda])

  const ws = XLSX.utils.aoa_to_sheet(datosHoja)
  XLSX.utils.book_append_sheet(wb, ws, 'Tendencia Central Agrupada')

  const nombreArchivo = `${conjunto.value?.nombre_conjunto || 'Conjunto'}_Tendencia_Central_Agrupada.xlsx`
  XLSX.writeFile(wb, nombreArchivo)
}

const seleccionarModulo = (id) => {
  herramientaActiva.value = id
  vistaModo.value = 'calculos'
}

onMounted(() => {
  cargarDatos()
  window.addEventListener('click', manejarClickFueraGlobal)
})

onUnmounted(() => {
  window.removeEventListener('click', manejarClickFueraGlobal)
})
</script>

<template>
  <div class="layout-app">
    <!-- Navbar Superior estilo Hero Banner Dark -->
    <header class="navbar-pro">
      <div class="nav-brand">
        <button class="btn-back" @click="volver" title="Volver a mis conjuntos">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div class="brand-text">
          <span class="brand-title">Estadística<span class="accent">Pro</span></span>
        </div>
      </div>

      <div class="nav-actions">
        <!-- Switcher de Pestañas -->
        <div class="tabs-switcher">
          <button 
            :class="['tab-btn', { active: vistaModo === 'datos' }]" 
            @click="vistaModo = 'datos'"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <span>Tabla de datos</span>
            <span class="badge-count" v-if="filas.length">{{ filas.length }}</span>
          </button>
          <button 
            :class="['tab-btn', { active: vistaModo === 'calculos' }]" 
            @click="vistaModo = 'calculos'"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 7h6m-6 4h6m-6 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg>
            <span>Módulos de análisis</span>
            <span class="badge-dot" v-if="herramientaActiva"></span>
          </button>
        </div>
      </div>
    </header>

    <!-- Contenido Principal -->
    <main class="main-workspace">
      <!-- VISTA 1: TABLA DE DATOS -->
      <section v-show="vistaModo === 'datos'" class="view-container">
        <div class="table-card">
          <div class="table-toolbar">
            <div class="toolbar-info">
              <h3>{{ conjunto?.nombre_conjunto || 'Cargando...' }}</h3>
              <p>Gestiona, edita y revisa la estructura de campos guardada.</p>
            </div>
            <div class="toolbar-actions">
              <!-- Botón Nueva Fila superior -->
              <div class="inline-action-btn" @click="agregarFilaDirecta" title="Añadir una nueva fila a la tabla">
                <button class="btn-add-class-inline" type="button" @click.stop="agregarFilaDirecta" title="Añadir fila">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </button>
                <span class="btn-action-text">Nueva Fila</span>
              </div>

              <!-- Botón Nuevo encabezado -->
              <button class="btn-nuevo-encabezado" type="button" @click="abrirModalNuevoEncabezado" title="Añadir una nueva columna con celdas vacías">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                <span>Nuevo encabezado</span>
              </button>

              <!-- Botón Guardar cambios -->
              <button 
                class="btn-guardar-cambios" 
                type="button" 
                @click="guardarCambios" 
                :disabled="guardandoCambios"
                :class="{ 'btn-pending': hayCambiosPendientes }"
                title="Guardar todos los cambios realizados"
              >
                <svg v-if="!guardandoCambios" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                <span v-else class="spinner-tiny"></span>
                <span>{{ guardandoCambios ? 'Guardando...' : 'Guardar cambios' }}</span>
                <span v-if="hayCambiosPendientes && !guardandoCambios" class="badge-dot" title="Hay cambios pendientes sin guardar"></span>
              </button>
            </div>
          </div>

          <div v-if="cargando" class="state-container">
            <div class="spinner-sm"></div>
            <span>Cargando datos del servidor…</span>
          </div>

          <p v-else-if="errorFilas" class="alert-danger">{{ errorFilas }}</p>

          <div v-else-if="filas.length || campos.length" class="table-scroll-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="col-num">#</th>
                  <th v-for="campo in campos" :key="campo">
                    <div class="th-header-content">
                      <span>{{ campo }}</span>
                      <button 
                        class="btn-remove-column" 
                        type="button" 
                        @click.stop="quitarColumna(campo)" 
                        title="Eliminar columna"
                      >
                        &times;
                      </button>
                    </div>
                  </th>
                  <th class="col-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(fila, index) in filas" 
                  :key="fila.id_fila || fila._tempId"
                  :class="{ 'fila-nueva': fila.esNueva, 'fila-modificada': fila._modificada }"
                >
                  <td class="col-num-cell">{{ index + 1 }}</td>
                  <td v-for="campo in campos" :key="campo" class="data-cell">
                    <input 
                      type="text" 
                      class="table-cell-input"
                      v-model="fila.datos_json[campo]"
                      placeholder="-"
                      @input="marcarFilaModificada(fila)"
                    />
                  </td>
                  <td class="col-actions-cell">
                    <button class="btn-action-delete" @click="eliminarFila(fila)" title="Eliminar registro">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="state-container empty-state">
            <div class="empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
            </div>
            <h4>Sin datos en este conjunto</h4>
            <p>Comienza agregando tu primera fila de datos estadísticos.</p>
          </div>
        </div>
      </section>

      <!-- VISTA 2: MÓDULOS DE ANÁLISIS -->
      <section v-show="vistaModo === 'calculos'" class="view-container">
        <div class="calculo-layout">
          <!-- Sidebar de Módulos -->
          <aside class="modules-sidebar">
            <div class="sidebar-header">
              <span class="sidebar-title">Herramientas disponibles</span>
            </div>
            <nav class="modules-list">
              <button
                v-for="mod in modulos"
                :key="mod.id"
                :class="['module-nav-item', { active: herramientaActiva === mod.id }]"
                @click="seleccionarModulo(mod.id)"
              >
                <div class="module-item-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path :d="mod.icon"/>
                  </svg>
                </div>
                <div class="module-item-text">
                  <span class="module-item-name">{{ mod.nombre }}</span>
                  <span class="module-item-desc">{{ mod.desc }}</span>
                </div>
              </button>
            </nav>
          </aside>

          <!-- Área Central del Cálculo -->
          <div class="calculo-content-area">
            <!-- Estado sin módulo seleccionado -->
            <div v-if="!herramientaActiva" class="no-module-selected">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <h3>Selecciona un módulo de análisis</h3>
              <p>Elige cualquiera de las opciones del menú lateral para procesar los datos de tu conjunto.</p>
            </div>

            <!-- Frecuencia Cualitativa -->
            <div v-else-if="herramientaActiva === 'cualitativo'" class="tool-panel">
              <div class="tool-header">
                <div>
                  <h2>Frecuencia Cualitativa</h2>
                  <p>Obtén frecuencias absolutas, relativas y acumuladas para variables categóricas.</p>
                </div>
              </div>

              <div class="tool-body">
                <div class="form-group">
                  <label class="form-label">Campos a incluir en el reporte</label>
                  <div class="dropdown-custom" ref="refDropdownCualitativo">
                    <button class="btn-dropdown" type="button" @click.stop="dropdownCualitativoAbierto = !dropdownCualitativoAbierto">
                      <span>{{ columnasCualitativasSeleccionadas.length === 0 ? 'Selecciona campos...' : `${columnasCualitativasSeleccionadas.length} campo(s) seleccionado(s)` }}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    <div v-if="dropdownCualitativoAbierto" class="dropdown-menu">
                      <label class="checkbox-item item-all">
                        <span>Seleccionar todos</span>
                        <input type="checkbox" :checked="todoCualitativoSeleccionado" @change="toggleSeleccionarTodoCualitativo" />
                      </label>
                      <div class="dropdown-divider"></div>
                      <div class="dropdown-scroll">
                        <label v-for="col in todosLosEncabezados" :key="col" class="checkbox-item">
                          <span>{{ col }}</span>
                          <input v-model="columnasCualitativasSeleccionadas" type="checkbox" :value="col" />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="tool-footer">
                  <button class="btn-primary-excel" :disabled="!columnasCualitativasSeleccionadas.length" @click="generarExcelCualitativo">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    <span>Generar y Exportar Excel (.xlsx)</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Frecuencia Cuantitativa -->
            <div v-else-if="herramientaActiva === 'cuantitativo'" class="tool-panel">
              <div class="tool-header">
                <div>
                  <h2>Frecuencia Cuantitativa</h2>
                  <p>Calcula rangos, intervalos de clase, marca de clase (Xi) y acumulación de datos.</p>
                </div>
              </div>

              <div class="tool-body">
                <div class="form-group">
                  <label class="form-label">Campos numéricos a analizar</label>
                  <div class="dropdown-custom" ref="refDropdownCuantitativo">
                    <button class="btn-dropdown" type="button" @click.stop="dropdownCuantitativoAbierto = !dropdownCuantitativoAbierto">
                      <span>{{ columnasCuantitativasSeleccionadas.length === 0 ? 'Selecciona campos...' : `${columnasCuantitativasSeleccionadas.length} campo(s) seleccionado(s)` }}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    <div v-if="dropdownCuantitativoAbierto" class="dropdown-menu">
                      <label class="checkbox-item item-all">
                        <span>Seleccionar todos</span>
                        <input type="checkbox" :checked="todoCuantitativoSeleccionado" @change="toggleSeleccionarTodoCuantitativo" />
                      </label>
                      <div class="dropdown-divider"></div>
                      <div class="dropdown-scroll">
                        <label v-for="col in todosLosEncabezados" :key="col" class="checkbox-item">
                          <span>{{ col }}</span>
                          <input v-model="columnasCuantitativasSeleccionadas" type="checkbox" :value="col" />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Número de clases (K)</label>
                  <input type="number" min="1" v-model.number="numeroClases" @input="validarNumeroClases" class="form-input" placeholder="Ej. 6" />
                </div>

                <div class="tool-footer">
                  <button class="btn-primary-excel" :disabled="!columnasCuantitativasSeleccionadas.length" @click="generarExcelCuantitativo">
                    <span>Exportar Análisis Cuantitativo (.xlsx)</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Diagrama de Cajas -->
            <div v-else-if="herramientaActiva === 'diagrama_cajas'" class="tool-panel">
              <div class="tool-header">
                <div>
                  <h2>Diagrama de Cajas y Bigotes</h2>
                  <p>Obtén el resumen de 5 números: Mínimo, Q1, Mediana (Q2), Q3, Máximo e IQR.</p>
                </div>
              </div>

              <div class="tool-body">
                <div class="form-group">
                  <label class="form-label">Campos a procesar</label>
                  <div class="dropdown-custom" ref="refDropdownCajas">
                    <button class="btn-dropdown" type="button" @click.stop="dropdownCajasAbierto = !dropdownCajasAbierto">
                      <span>{{ columnasCajasSeleccionadas.length === 0 ? 'Selecciona campos...' : `${columnasCajasSeleccionadas.length} campo(s) seleccionado(s)` }}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    <div v-if="dropdownCajasAbierto" class="dropdown-menu">
                      <label class="checkbox-item item-all">
                        <span>Seleccionar todos</span>
                        <input type="checkbox" :checked="todoCajasSeleccionado" @change="toggleSeleccionarTodoCajas" />
                      </label>
                      <div class="dropdown-divider"></div>
                      <div class="dropdown-scroll">
                        <label v-for="col in todosLosEncabezados" :key="col" class="checkbox-item">
                          <span>{{ col }}</span>
                          <input v-model="columnasCajasSeleccionadas" type="checkbox" :value="col" />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="tool-footer">
                  <button class="btn-primary-excel" :disabled="!columnasCajasSeleccionadas.length" @click="generarExcelDiagramaCajas">
                    <span>Exportar Cuartiles a Excel (.xlsx)</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Tendencia Central -->
            <div v-else-if="herramientaActiva === 'tendencia_central'" class="tool-panel">
              <div class="tool-header">
                <div>
                  <h2>Medidas de Tendencia Central</h2>
                  <p>Cálculo directo sin redondeos de Media Aritmética, Mediana y Moda(s).</p>
                </div>
              </div>

              <div class="tool-body">
                <div class="form-group">
                  <label class="form-label">Campos a analizar</label>
                  <div class="dropdown-custom" ref="refDropdownTendencia">
                    <button class="btn-dropdown" type="button" @click.stop="dropdownTendenciaAbierto = !dropdownTendenciaAbierto">
                      <span>{{ columnasTendenciaSeleccionadas.length === 0 ? 'Selecciona campos...' : `${columnasTendenciaSeleccionadas.length} campo(s) seleccionado(s)` }}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    <div v-if="dropdownTendenciaAbierto" class="dropdown-menu">
                      <label class="checkbox-item item-all">
                        <span>Seleccionar todos</span>
                        <input type="checkbox" :checked="todoTendenciaSeleccionado" @change="toggleSeleccionarTodoTendencia" />
                      </label>
                      <div class="dropdown-divider"></div>
                      <div class="dropdown-scroll">
                        <label v-for="col in todosLosEncabezados" :key="col" class="checkbox-item">
                          <span>{{ col }}</span>
                          <input v-model="columnasTendenciaSeleccionadas" type="checkbox" :value="col" />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="tool-footer">
                  <button class="btn-primary-excel" :disabled="!columnasTendenciaSeleccionadas.length" @click="generarExcelTendenciaCentral">
                    <span>Exportar Tendencia Central (.xlsx)</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Puntuación Z -->
            <div v-else-if="herramientaActiva === 'puntuacion_z'" class="tool-panel">
              <div class="tool-header">
                <div>
                  <h2>Puntuación Z y Distribución Normal</h2>
                  <p>Evalúa el z-score individual y calcula la densidad de probabilidad de la muestra.</p>
                </div>
              </div>

              <div class="tool-body">
                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label">Campo numérico objetivo</label>
                    <select class="form-select" :value="columnaZSeleccionada" @change="seleccionarCampoZ($event.target.value)">
                      <option value="" disabled>Selecciona columna...</option>
                      <option v-for="col in todosLosEncabezados" :key="col" :value="col">{{ col }}</option>
                    </select>
                  </div>

                  <div class="form-group" v-if="columnaZSeleccionada && calcularPuntuacionZModulo">
                    <label class="form-label">Valor X a evaluar</label>
                    <input type="number" step="any" v-model="valorCalcularZ" class="form-input" placeholder="Ingresa valor..." />
                  </div>
                </div>

                <template v-if="columnaZSeleccionada && calcularPuntuacionZModulo">
                  <div class="metrics-strip">
                    <div class="metric-card">
                      <span class="m-label">Z-Score</span>
                      <span class="m-value bold-teal">{{ calcularPuntuacionZModulo.zScore.toFixed(4) }}</span>
                    </div>
                    <div class="metric-card">
                      <span class="m-label">Percentil (%)</span>
                      <span class="m-value">{{ calcularPuntuacionZModulo.porcentaje.toFixed(1) }}%</span>
                    </div>
                    <div class="metric-card">
                      <span class="m-label">Media</span>
                      <span class="m-value">{{ calcularPuntuacionZModulo.media.toFixed(3) }}</span>
                    </div>
                    <div class="metric-card">
                      <span class="m-label">Desv. Estándar</span>
                      <span class="m-value">{{ calcularPuntuacionZModulo.desviacionEstandar.toFixed(3) }}</span>
                    </div>
                  </div>

                  <div class="tool-footer">
                    <button class="btn-primary-excel" @click="generarExcelPuntuacionZ">
                      <span>Exportar Análisis de Z en Excel</span>
                    </button>
                  </div>
                </template>
              </div>
            </div>

            <!-- Tendencia Agrupada -->
            <div v-else-if="herramientaActiva === 'tendencia_agrupada'" class="tool-panel full-width-panel">
              <div class="tool-header">
                <div>
                  <h2>Tendencia Central para Datos Agrupados</h2>
                  <p>Ingresa límites de clase y frecuencias en la matriz interactiva tipo hoja de cálculo.</p>
                </div>
                <div class="header-actions">
                  <button class="btn-ghost-danger" @click="limpiarTablaAgrupada">Limpiar Tabla</button>
                  <button class="btn-primary-sm" @click="calcularYGenerarExcelAgrupado">Calcular y Exportar Excel</button>
                </div>
              </div>

              <div class="spreadsheet-container" ref="refSpreadsheetContainer">
                <table class="spreadsheet-table">
                  <thead>
                    <tr>
                      <th class="col-num">#</th>
                      <th>Límite Inferior</th>
                      <th>Límite Superior</th>
                      <th>Punto Medio (Xi)</th>
                      <th>Frecuencia (fi)</th>
                      <th>Relativa (fr)</th>
                      <th>Acumulada (Fi)</th>
                      <th>Relativa Acum.</th>
                      <th class="col-del"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(f, i) in tablaCalculadaAgrupada" :key="i">
                      <td class="col-num">{{ i + 1 }}</td>
                      
                      <!-- Lim Inf -->
                      <td 
                        tabindex="0"
                        :ref="(el) => { if (el) celdasContenedor[`${i}-0`] = el }"
                        class="cell-editable" 
                        :class="{ 'cell-active': celdaSeleccionada.fila === i && celdaSeleccionada.col === 0 }"
                        @click.stop="seleccionarCelda(i, 0)" 
                        @dblclick.stop="activarEdicion(i, 0)"
                        @keydown="manejarTecladoTabla"
                      >
                        <input 
                          v-if="modoEdicion && celdaSeleccionada.fila === i && celdaSeleccionada.col === 0" 
                          :ref="(el) => { if (el) inputsMatriz[`${i}-0`] = el }"
                          v-model="filasAgrupadas[i].limiteInferior" 
                          type="text" 
                          @blur="modoEdicion = false" 
                          @keydown="manejarTecladoTabla" 
                        />
                        <span v-else>{{ filasAgrupadas[i].limiteInferior || '-' }}</span>
                      </td>

                      <!-- Lim Sup -->
                      <td 
                        tabindex="0"
                        :ref="(el) => { if (el) celdasContenedor[`${i}-1`] = el }"
                        class="cell-editable" 
                        :class="{ 'cell-active': celdaSeleccionada.fila === i && celdaSeleccionada.col === 1 }"
                        @click.stop="seleccionarCelda(i, 1)" 
                        @dblclick.stop="activarEdicion(i, 1)"
                        @keydown="manejarTecladoTabla"
                      >
                        <input 
                          v-if="modoEdicion && celdaSeleccionada.fila === i && celdaSeleccionada.col === 1" 
                          :ref="(el) => { if (el) inputsMatriz[`${i}-1`] = el }"
                          v-model="filasAgrupadas[i].limiteSuperior" 
                          type="text" 
                          @blur="modoEdicion = false" 
                          @keydown="manejarTecladoTabla" 
                        />
                        <span v-else>{{ filasAgrupadas[i].limiteSuperior || '-' }}</span>
                      </td>

                      <td class="cell-computed">{{ f.puntoMedio !== null ? f.puntoMedio : '-' }}</td>

                      <!-- Frecuencia -->
                      <td 
                        tabindex="0"
                        :ref="(el) => { if (el) celdasContenedor[`${i}-2`] = el }"
                        class="cell-editable" 
                        :class="{ 'cell-active': celdaSeleccionada.fila === i && celdaSeleccionada.col === 2 }"
                        @click.stop="seleccionarCelda(i, 2)" 
                        @dblclick.stop="activarEdicion(i, 2)"
                        @keydown="manejarTecladoTabla"
                      >
                        <input 
                          v-if="modoEdicion && celdaSeleccionada.fila === i && celdaSeleccionada.col === 2" 
                          :ref="(el) => { if (el) inputsMatriz[`${i}-2`] = el }"
                          v-model="filasAgrupadas[i].frecuenciaAbsoluta" 
                          type="text" 
                          @blur="modoEdicion = false" 
                          @keydown="manejarTecladoTabla" 
                        />
                        <span v-else>{{ filasAgrupadas[i].frecuenciaAbsoluta || '0' }}</span>
                      </td>

                      <td class="cell-computed">{{ f.frecuenciaRelativa > 0 ? f.frecuenciaRelativa.toFixed(2) + '%' : '-' }}</td>
                      <td class="cell-computed">{{ f.frecuenciaAcumulada > 0 ? f.frecuenciaAcumulada : '-' }}</td>
                      <td class="cell-computed">{{ f.frecuenciaRelativaAcumulada > 0 ? f.frecuenciaRelativaAcumulada.toFixed(2) + '%' : '-' }}</td>

                      <td class="col-del">
                        <button class="btn-icon-del" @click="quitarFilaAgrupada(i)">&times;</button>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="4" class="tfoot-label">
                        <div class="tfoot-flex">
                          <button class="btn-add-class-inline" @click="agregarFilaAgrupada" title="Añadir clase">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                              <path d="M12 5v14M5 12h14"/>
                            </svg>                           
                          </button>
                          <span>Nueva Clase</span>
                        </div>
                      </td>
                      <td class="tfoot-value">{{ totalFrecuenciaAbsolutaAgrupada }}</td>
                      <td class="tfoot-value">{{ totalFrecuenciaAbsolutaAgrupada > 0 ? '100%' : '0%' }}</td>
                      <td colspan="3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Modal para Agregar Registros -->
    <div v-if="modalFormularioAbierto" class="modal-backdrop" @click.self="modalFormularioAbierto = false">
      <div class="modal-dialog">
        <header class="modal-header">
          <div>
            <span class="modal-subtitle">{{ modoFormulario === 'crear' ? 'Nuevo Registro' : 'Edición de Datos' }}</span>
            <h2>{{ modoFormulario === 'crear' ? 'Agregar Fila' : 'Editar Fila' }}</h2>
          </div>
          <button class="btn-close-modal" @click="modalFormularioAbierto = false">&times;</button>
        </header>

        <form @submit.prevent="guardarFila" class="modal-form">
          <div class="form-fields-scroll">
            <div v-for="(campo, indice) in camposFormulario" :key="indice" class="form-field-row">
              <template v-if="modoFormulario === 'crear' && campos.length === 0">
                <label>Nombre del Campo nuevo</label>
                <div class="input-with-btn">
                  <input v-model="campo.nombre" type="text" placeholder="Ej. Ventas, Edad, Categoria" required class="form-input" />
                  <button v-if="camposFormulario.length > 1" class="btn-remove-field" type="button" @click="quitarCampo(indice)">&times;</button>
                </div>
              </template>
              <label class="form-label">{{ campo.nombre || 'Valor' }}</label>
              <input v-model="campo.valor" type="text" :placeholder="`Ingresa ${campo.nombre || 'el valor'}`" class="form-input" />
            </div>

            <div v-if="modoFormulario === 'crear' && campos.length === 0" class="add-extra-field">
              <input v-model="nuevoNombreCampo" type="text" placeholder="+ Nombre de otra columna" class="form-input-sm" @keydown.enter.prevent="agregarCampo" />
              <button class="btn-ghost" type="button" @click="agregarCampo">Añadir</button>
            </div>
          </div>

          <p v-if="errorFilas" class="alert-danger-sm">{{ errorFilas }}</p>

          <footer class="modal-footer">
            <button class="btn-ghost" type="button" @click="modalFormularioAbierto = false">Cancelar</button>
            <button class="btn-primary-sm" type="submit" :disabled="guardandoFila">
              {{ guardandoFila ? 'Guardando...' : 'Guardar Fila' }}
            </button>
          </footer>
        </form>
      </div>
    </div>

    <!-- Modal para Nuevo Encabezado -->
    <div v-if="modalNuevoEncabezadoAbierto" class="modal-backdrop" @click.self="modalNuevoEncabezadoAbierto = false">
      <div class="modal-dialog modal-dialog-sm">
        <header class="modal-header">
          <div>
            <span class="modal-subtitle">Estructura de la tabla</span>
            <h2>Nuevo encabezado</h2>
          </div>
          <button class="btn-close-modal" @click="modalNuevoEncabezadoAbierto = false">&times;</button>
        </header>

        <form @submit.prevent="confirmarNuevoEncabezado" class="modal-form">
          <div class="form-fields-scroll">
            <div class="form-field-row">
              <label class="form-label">Nombre del nuevo encabezado / columna</label>
              <input 
                ref="inputNuevoEncabezado"
                v-model="nombreNuevoEncabezado" 
                type="text" 
                placeholder="Ej. Tiempo de Uso, Calificación, etc." 
                required 
                class="form-input" 
              />
              <p v-if="errorNuevoEncabezado" class="alert-danger-sm" style="margin-top: 8px;">{{ errorNuevoEncabezado }}</p>
            </div>
          </div>

          <footer class="modal-footer">
            <button class="btn-ghost" type="button" @click="modalNuevoEncabezadoAbierto = false">Cancelar</button>
            <button class="btn-primary-sm" type="submit">Agregar columna</button>
          </footer>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ========================================================
   ESTILOS GENERALES Y RESET INTEGRADOS CON HOME
   ======================================================== */
.layout-app {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background: #f1f5f9;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #0f172a;
  overflow: hidden;
  position: relative;
}

/* NAVBAR PRO */
.navbar-pro {
  height: 60px;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.brand-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 24px;
}

.brand-title {
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.3px;
}

.accent {
  color: #14b8a6;
}

/* NAV ACTIONS & TABS SWITCHER */
.nav-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.tabs-switcher {
  display: flex;
  background: rgba(15, 23, 42, 0.6);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  gap: 4px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  color: #f8fafc;
}

.tab-btn.active {
  background: #147f82;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.3);
}

.badge-count {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 10px;
}

.badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #38bdf8;
}

/* MAIN WORKSPACE */
.main-workspace {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.view-container {
  width: 100%;
  height: 100%;
  padding: 24px 32px;
  box-sizing: border-box;
}

/* ========================================================
   TOAST FLOTANTE (ESQUINA INFERIOR DERECHA)
   ======================================================== */
.toast-dialog {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #065f46;
  color: #ffffff;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 600;
  box-shadow: 0 10px 25px -5px rgba(6, 95, 70, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border: 1px solid #059669;
}

.toast-icon {
  flex-shrink: 0;
  color: #a7f3d0;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* ========================================================
   VISTA 1: TABLA DE DATOS
   ======================================================== */
.table-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.01);
}

.table-toolbar {
  padding: 18px 24px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.inline-action-btn {
  cursor: pointer;
  user-select: none;
  padding: 4px 14px 4px 6px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 9999px;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.inline-action-btn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.btn-action-text {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.btn-nuevo-encabezado {
  background: #192338;
  color: #ffffff;
  border: none;
  border-radius: 9999px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-nuevo-encabezado:hover {
  background: #293952;
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.15);
}

.btn-guardar-cambios {
  background: #0d9488;
  color: #ffffff;
  border: none;
  border-radius: 9999px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.btn-guardar-cambios:hover:not(:disabled) {
  background: #0f766e;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
}

.btn-guardar-cambios:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn-guardar-cambios.btn-pending {
  background: #059669;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
}

.badge-dot {
  width: 8px;
  height: 8px;
  background: #f59e0b;
  border: 2px solid #ffffff;
  border-radius: 50%;
}

.spinner-tiny {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.toolbar-info h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.toolbar-info p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #64748b;
}

.table-scroll-wrapper {
  flex: 1;
  overflow: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;
}

.data-table th {
  position: sticky;
  top: 0;
  background: #192338;
  color: #ffffff;
  font-weight: 700;
  padding: 12px 20px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 13px;
  letter-spacing: 0.6px;
  z-index: 10;
}

.col-num {
  width: 48px;
  text-align: center;
}

.col-num-cell {
  text-align: center;
  font-weight: 600;
  color: #64748b;
  background: #f8fafc;
}

.th-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.btn-remove-column {
  background: transparent;
  border: none;
  color: #f87171;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0 4px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.btn-remove-column:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.data-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
}

.table-cell-input {
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  padding: 6px 8px;
  font-size: 13px;
  font-family: inherit;
  color: #1e293b;
  border-radius: 4px;
  transition: all 0.15s ease;
  box-sizing: border-box;
}

.table-cell-input:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.table-cell-input:focus {
  background: #ffffff;
  border-color: #2563eb;
  outline: none;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.data-table tr:hover td {
  background: #f0fdfa;
}

.fila-nueva {
  background: #f0fdf4 !important;
}

.fila-modificada {
  background: #fbfcfe;
}

.col-actions, .col-actions-cell {
  text-align: right;
  width: 60px;
  min-width: 60px;
  white-space: nowrap;
}

.col-actions-cell {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

/* ACCIONES DE LA TABLA */
.btn-action-delete {
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(225, 29, 72, 0.12);
  border: 1px solid rgba(225, 29, 72, 0.3);
  color: #e11d48;
}

.btn-action-delete:hover {
  background: #e11d48;
  border-color: #e11d48;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(225, 29, 72, 0.25);
}

/* ========================================================
   VISTA 2: CÁLCULOS
   ======================================================== */
.calculo-layout {
  display: flex;
  height: 100%;
  gap: 24px;
}

.modules-sidebar {
  width: 300px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);
}

.sidebar-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;
}

.sidebar-title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.modules-list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
}

.module-nav-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 1px solid transparent;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
}

.module-nav-item:hover {
  background: #f8fafc;
  border-color: #e2e8f0;
}

.module-nav-item.active {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

.module-item-icon {
  color: #64748b;
  margin-top: 2px;
}

.module-nav-item.active .module-item-icon {
  color: #ffffff;
}

.module-item-name {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  color: #0f172a;
}

.module-nav-item.active .module-item-name {
  color: #ffffff;
}

.module-item-desc {
  display: block;
  font-size: 11.5px;
  margin-top: 2px;
  line-height: 1.35;
  color: #64748b;
}

.module-nav-item.active .module-item-desc {
  color: #94a3b8;
}

.calculo-content-area {
  flex: 1;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: auto;
  padding: 32px;
  box-sizing: border-box;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);
}

.no-module-selected {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  text-align: center;
}

.no-module-selected h3 {
  margin: 14px 0 6px;
  color: #0f172a;
  font-size: 18px;
  font-weight: 700;
}

.no-module-selected p {
  font-size: 13.5px;
  max-width: 340px;
  margin: 0;
  color: #64748b;
}

.tool-panel {
  max-width: 680px;
  margin: 0 auto;
}

.tool-panel.full-width-panel {
  max-width: 100%;
}

.tool-header {
  margin-bottom: 28px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.tool-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.tool-header p {
  margin: 6px 0 0;
  font-size: 13.5px;
  color: #64748b;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.form-group {
  margin-bottom: 22px;
}

.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.form-label {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
}

.form-input, .form-select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 13.5px;
  background: #ffffff;
  box-sizing: border-box;
  transition: all 0.15s ease;
}

.form-input:focus, .form-select:focus {
  outline: none;
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
}

/* ========================================================
   ESTILOS COMBOBOX / DROPDOWNS
   ======================================================== */
.dropdown-custom {
  position: relative;
  width: 100%;
}

.btn-dropdown {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13.5px;
  cursor: pointer;
  color: #334155;
  transition: all 0.15s ease;
  box-sizing: border-box;
}

.btn-dropdown:hover {
  border-color: #0d9488;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
  z-index: 50;
  padding: 6px 0;
  box-sizing: border-box;
}

.checkbox-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  font-size: 13px;
  color: #334155;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease;
}

.checkbox-item:hover {
  background: #f0fdfa;
}

.checkbox-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #0d9488;
  cursor: pointer;
  margin: 0;
}

.item-all {
  font-weight: 700;
  color: #0d9488;
}

.dropdown-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 4px 0;
}

.dropdown-scroll {
  max-height: 200px;
  overflow-y: auto;
}

.tool-footer {
  border-top: 1px solid #f1f5f9;
  padding-top: 20px;
}

/* METRICS STRIP EN Z */
.metrics-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}

.metric-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 12px 14px;
  border-radius: 8px;
}

.m-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.m-value {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin-top: 2px;
}

.bold-teal {
  color: #0d9488;
}

/* SPREADSHEET TENDENCIA AGRUPADA CON SCROLL PROPIO */
.spreadsheet-container {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  max-height: 700px;
  overflow-y: auto;
  position: relative;
}

.spreadsheet-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.spreadsheet-table th {
  position: sticky;
  top: 0;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  padding: 10px;
  font-weight: 600;
  color: #334155;
  z-index: 2;
}

.spreadsheet-table tfoot {
  position: sticky;
  bottom: 0;
  background: #ffffff;
  z-index: 2;
}

.spreadsheet-table td {
  border: 1px solid #e2e8f0;
  padding: 0;
  height: 34px;
  text-align: center;
}

.cell-editable {
  cursor: pointer;
  position: relative;
  outline: none;
}

.cell-editable input {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  text-align: center;
  font-size: 12.5px;
  background: #ffffff;
  padding: 0;
  box-sizing: border-box;
}

.cell-active {
  outline: 2px solid #0d9488 !important;
  background: #f0fdfa;
  z-index: 1;
}

.cell-computed {
  background: #f8fafc;
  color: #64748b;
}

.col-del {
  width: 36px;
}

.btn-icon-del {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 18px;
}

/* CONTENEDOR FLEX EN EL TFOOT PARA EL BOTÓN AZUL Y LA ETIQUETA */
.tfoot-flex {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: 10px;
}

.btn-add-class-inline {
  background: #2563eb;
  border: none;
  color: #ffffff;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
}

.btn-add-class-inline:hover {
  background: #1d4ed8;
  transform: scale(1.08);
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.4);
}

.tfoot-label {
  text-align: right;
  padding-right: 14px;
  font-weight: 600;
  border-top: 2px solid #cbd5e1;
}

.tfoot-value {
  font-weight: 700;
  color: #0d9488;
  border-top: 2px solid #cbd5e1;
}

/* BOTONES GLOBALES */
.btn-primary-sm {
  background: #192338;
  color: #ffffff;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.btn-primary-sm:hover {
  background: #293952;
}

.btn-primary-excel {
  width: 100%;
  background: #147f82;
  color: #ffffff;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
  transition: all 0.2s ease;
}

.btn-primary-excel:hover:not(:disabled) {
  background: #0f766e;
  box-shadow: 0 6px 16px rgba(13, 148, 136, 0.35);
}

.btn-primary-excel:disabled {
  background: #cbd5e1;
  box-shadow: none;
  cursor: not-allowed;
}

.btn-ghost {
  background: #147f82;
  border: 1px solid #cbd5e1;
  color: #ffffff;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-ghost:hover {
  background: #0d9488;
  border-color: #0d9488;
  color: #ffffff;
}

.btn-ghost-danger {
  background: #dc2626;
  border: 1px solid #fecaca;
  color: #ffffff;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-ghost-danger:hover {
  background: #ee4646;
  border-color: #ee4646;
  color: #ffffff;
}

/* ESTADOS DE CARGA Y VACÍOS */
.state-container {
  padding: 48px;
  text-align: center;
  color: #64748b;
  font-size: 13.5px;
}

.spinner-sm {
  width: 24px;
  height: 24px;
  border: 2px solid #e2e8f0;
  border-top-color: #0d9488;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state h4 {
  margin: 10px 0 4px;
  color: #0f172a;
  font-size: 16px;
}

.empty-state p {
  margin: 0 0 18px;
}

.empty-icon {
  color: #cbd5e1;
}

.alert-danger {
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  border-radius: 8px;
  font-size: 13.5px;
  margin: 20px;
}

/* MODALES */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-dialog {
  background: #ffffff;
  border-radius: 12px;
  width: min(92vw, 480px);
  max-height: 85vh;
  padding: 24px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  box-sizing: border-box;
  overflow: hidden;
}

.modal-dialog-sm {
  width: min(92vw, 420px);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 18px;
  flex-shrink: 0;
}

.modal-subtitle {
  font-size: 11px;
  font-weight: 700;
  color: #0d9488;
  text-transform: uppercase;
}

.modal-header h2 {
  margin: 3px 0 0;
  font-size: 18px;
}

.btn-close-modal {
  border: none;
  background: transparent;
  font-size: 22px;
  cursor: pointer;
  color: #64748b;
}

.modal-form {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.form-fields-scroll {
  flex: 1;
  max-height: 52vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-fields-scroll::-webkit-scrollbar {
  width: 6px;
}

.form-fields-scroll::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.form-fields-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.form-fields-scroll::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
  flex-shrink: 0;
}

.input-with-btn {
  display: flex;
  gap: 8px;
}

.btn-remove-field {
  background: #fef2f2;
  border: none;
  color: #ef4444;
  padding: 0 12px;
  border-radius: 8px;
  cursor: pointer;
}

.add-extra-field {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.form-input-sm {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 12.5px;
}
</style>