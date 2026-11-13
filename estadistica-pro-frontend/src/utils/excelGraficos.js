import JSZip from 'jszip'

// SheetJS (versión community) no permite crear gráficos, así que el archivo
// .xlsx generado se abre con JSZip y se le agregan las partes de gráficos
// nativos de Excel (drawing + chart). El resultado son gráficos editables
// y enlazados a las celdas de la hoja.

const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const TIPO_REL_DRAWING = `${NS_REL}/drawing`
const TIPO_REL_CHART = `${NS_REL}/chart`

const escaparXml = (texto) =>
  String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const referenciaHoja = (nombreHoja) => `'${nombreHoja.replace(/'/g, "''")}'`

const xmlRelaciones = (relaciones) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relaciones
  .map((r) => `<Relationship Id="${r.id}" Type="${r.tipo}" Target="${r.destino}"/>`)
  .join('')}</Relationships>`

// ---------- Piezas comunes del XML de gráficos ----------

const xmlTitulo = (texto, tamano = 1400) =>
  `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${tamano}" b="1"/></a:pPr><a:r><a:rPr lang="es-ES" sz="${tamano}" b="1"/><a:t>${escaparXml(texto)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`

const xmlCacheTexto = (valores) =>
  `<c:strCache><c:ptCount val="${valores.length}"/>${valores
    .map((v, i) => `<c:pt idx="${i}"><c:v>${escaparXml(v)}</c:v></c:pt>`)
    .join('')}</c:strCache>`

const xmlCacheNumeros = (valores) =>
  `<c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${valores.length}"/>${valores
    .map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`)
    .join('')}</c:numCache>`

// Categorías: si todas son números se enlazan como numéricas, si no como texto
const xmlCategorias = (ref, categorias) =>
  categorias.every((c) => typeof c === 'number')
    ? `<c:cat><c:numRef><c:f>${escaparXml(ref)}</c:f>${xmlCacheNumeros(categorias)}</c:numRef></c:cat>`
    : `<c:cat><c:strRef><c:f>${escaparXml(ref)}</c:f>${xmlCacheTexto(categorias)}</c:strRef></c:cat>`

const xmlValores = (ref, valores) =>
  `<c:val><c:numRef><c:f>${escaparXml(ref)}</c:f>${xmlCacheNumeros(valores)}</c:numRef></c:val>`

const xmlEtiquetasDatos = ({ formato, posicion }) =>
  `<c:dLbls>${formato ? `<c:numFmt formatCode="${formato}" sourceLinked="0"/>` : ''}<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr><c:dLblPos val="${posicion}"/><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>`

const xmlEjes = (tituloEjeX, tituloEjeY, { minimoCero = true } = {}) => `
<c:catAx><c:axId val="10"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/>${tituloEjeX ? xmlTitulo(tituloEjeX, 1000) : ''}<c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="${minimoCero ? 'nextTo' : 'low'}"/><c:crossAx val="20"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>
<c:valAx><c:axId val="20"/><c:scaling><c:orientation val="minMax"/>${minimoCero ? '<c:min val="0"/>' : ''}</c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="D9D9D9"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>${tituloEjeY ? xmlTitulo(tituloEjeY, 1000) : ''}<c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="10"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`

const envolverGrafico = (titulo, contenidoPlotArea, leyenda) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${NS_REL}">
<c:roundedCorners val="0"/>
<c:chart>
${xmlTitulo(titulo)}
<c:autoTitleDeleted val="0"/>
<c:plotArea><c:layout/>${contenidoPlotArea}</c:plotArea>
${leyenda ? `<c:legend><c:legendPos val="${leyenda === true ? 'r' : leyenda}"/><c:overlay val="0"/></c:legend>` : ''}
<c:plotVisOnly val="1"/>
<c:dispBlanksAs val="gap"/>
</c:chart>
</c:chartSpace>`

// ---------- Tipos de gráfico ----------

const constructores = {
  // Gráfico de pastel (porcentajes)
  pastel: (g, refCat, refVal) => envolverGrafico(g.titulo, `
<c:pieChart><c:varyColors val="1"/>
<c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>${escaparXml(g.nombreSerie)}</c:v></c:tx>
<c:dLbls><c:numFmt formatCode="0.00%" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr><c:dLblPos val="bestFit"/><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/><c:showLeaderLines val="1"/></c:dLbls>
${xmlCategorias(refCat, g.categorias)}${xmlValores(refVal, g.valores)}
</c:ser><c:firstSliceAng val="0"/></c:pieChart>`, true),

  // Histograma: columnas pegadas (sin espacio entre barras)
  histograma: (g, refCat, refVal) => envolverGrafico(g.titulo, `
<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>
<c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>${escaparXml(g.nombreSerie)}</c:v></c:tx>
<c:spPr><a:solidFill><a:srgbClr val="2E86AB"/></a:solidFill><a:ln w="12700"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr>
<c:invertIfNegative val="0"/>
${xmlEtiquetasDatos({ posicion: 'outEnd' })}
${xmlCategorias(refCat, g.categorias)}${xmlValores(refVal, g.valores)}
</c:ser>
<c:gapWidth val="0"/><c:overlap val="0"/><c:axId val="10"/><c:axId val="20"/></c:barChart>
${xmlEjes(g.tituloEjeX, g.tituloEjeY)}`, false),

  // Diagrama de cajas y bigotes (compatible con cualquier versión de Excel).
  // Se arma con dos grupos de líneas sin trazo que usan "barras arriba/abajo":
  //   - Grupo 1 (eje principal): Q1 → Mediana = mitad inferior de la caja, y sus
  //     "líneas de máximos y mínimos" dibujan los bigotes de Mín a Máx.
  //   - Grupo 2 (eje secundario, oculto): Mediana → Q3 = mitad superior de la caja.
  // El borde entre ambas mitades es la línea de la mediana. Los dos ejes usan la
  // misma escala para que las mitades coincidan.
  cajas: (g) => {
    const cat = `<c:cat><c:strLit><c:ptCount val="1"/><c:pt idx="0"><c:v>${escaparXml(g.categoria)}</c:v></c:pt></c:strLit></c:cat>`
    const sinLinea = '<c:spPr><a:ln w="28575"><a:noFill/></a:ln></c:spPr>'
    const marcador = (simbolo, tamano, color) => simbolo === 'none'
      ? '<c:marker><c:symbol val="none"/></c:marker>'
      : `<c:marker><c:symbol val="${simbolo}"/><c:size val="${tamano}"/><c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln w="28575"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:ln></c:spPr></c:marker>`
    const opcionesEtiqueta = (posicion) => `<c:numFmt formatCode="0.00" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"/></a:pPr><a:endParaRPr lang="es-ES"/></a:p></c:txPr><c:dLblPos val="${posicion}"/><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="1"/><c:showPercent val="0"/><c:showBubbleSize val="0"/><c:separator>: </c:separator>`
    // desplazamiento: fracción del ancho del gráfico para sacar la etiqueta fuera de la caja
    const etiqueta = (desplazamiento) => desplazamiento
      ? `<c:dLbls><c:dLbl><c:idx val="0"/><c:layout><c:manualLayout><c:x val="${desplazamiento}"/><c:y val="0"/></c:manualLayout></c:layout>${opcionesEtiqueta('r')}</c:dLbl>${opcionesEtiqueta('r')}</c:dLbls>`
      : `<c:dLbls>${opcionesEtiqueta('r')}</c:dLbls>`
    const sinEtiqueta = '<c:dLbls><c:delete val="1"/></c:dLbls>'

    const serie = (i, s) => {
      const { ref, valor } = g.valores[s.clave]
      return `<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:v>${s.nombre}</c:v></c:tx>${sinLinea}${s.marcador ?? marcador('none')}${s.etiqueta}${cat}${xmlValores(ref, [valor])}<c:smooth val="0"/></c:ser>`
    }

    // Grupo 1: primera serie Q1, última Mediana (las barras van entre la primera y la última)
    const grupo1 = [
      { clave: 'q1', nombre: 'Q1', etiqueta: etiqueta(0.1) },
      { clave: 'min', nombre: 'Mín', marcador: marcador('dash', 20, '1F2937'), etiqueta: etiqueta() },
      { clave: 'max', nombre: 'Máx', marcador: marcador('dash', 20, '1F2937'), etiqueta: etiqueta() },
      { clave: 'q2', nombre: 'Mediana', etiqueta: etiqueta(0.1) }
    ].map((s, i) => serie(i, s)).join('\n')
    // Grupo 2: Mediana → Q3 (la mediana ya tiene etiqueta en el grupo 1)
    const grupo2 = [
      { clave: 'q2', nombre: 'Mediana ', etiqueta: sinEtiqueta },
      { clave: 'q3', nombre: 'Q3', etiqueta: etiqueta(0.1) }
    ].map((s, i) => serie(i + 4, s)).join('\n')

    const relleno = (color) => `<c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="1F2937"/></a:solidFill></a:ln></c:spPr>`
    const barras = (color) => `<c:upDownBars><c:gapWidth val="300"/><c:upBars>${relleno(color)}</c:upBars><c:downBars>${relleno(color)}</c:downBars></c:upDownBars>`

    // Escala común para ambos ejes, con un margen sobre Mín y Máx
    const min = g.valores.min.valor
    const max = g.valores.max.valor
    const rango = max - min || Math.abs(max) || 1
    const potencia = 10 ** Math.floor(Math.log10(rango / 6))
    const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => rango / p <= 8)
    let ejeMin = Math.floor(min / paso) * paso
    let ejeMax = Math.ceil(max / paso) * paso
    if (ejeMin >= min) ejeMin -= paso
    if (ejeMax <= max) ejeMax += paso
    if (min >= 0 && ejeMin < 0) ejeMin = 0
    const redondear = (n) => Number(n.toFixed(10))
    const escala = `<c:scaling><c:orientation val="minMax"/><c:max val="${redondear(ejeMax)}"/><c:min val="${redondear(ejeMin)}"/></c:scaling>`

    return envolverGrafico(g.titulo, `
<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>
${grupo1}
<c:hiLowLines><c:spPr><a:ln w="19050"><a:solidFill><a:srgbClr val="1F2937"/></a:solidFill></a:ln></c:spPr></c:hiLowLines>
${barras('9BD3E0')}
<c:marker val="1"/><c:axId val="10"/><c:axId val="20"/></c:lineChart>
<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>
${grupo2}
${barras('C9E9F0')}
<c:marker val="1"/><c:axId val="30"/><c:axId val="40"/></c:lineChart>
<c:catAx><c:axId val="10"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="low"/><c:crossAx val="20"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>
<c:valAx><c:axId val="20"/>${escala}<c:delete val="0"/><c:axPos val="l"/><c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="D9D9D9"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>${g.tituloEjeY ? xmlTitulo(g.tituloEjeY, 1000) : ''}<c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="10"/><c:crosses val="autoZero"/><c:crossBetween val="between"/><c:majorUnit val="${redondear(paso)}"/></c:valAx>
<c:catAx><c:axId val="30"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="1"/><c:axPos val="b"/><c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="40"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>
<c:valAx><c:axId val="40"/>${escala}<c:delete val="1"/><c:axPos val="r"/><c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="30"/><c:crosses val="max"/><c:crossBetween val="between"/><c:majorUnit val="${redondear(paso)}"/></c:valAx>`, false)
  },

  // Campana de Gauss: dispersión con línea suavizada (x = valor, y = densidad normal).
  // Opcionalmente marca un punto evaluado (x, f(x)) con su etiqueta.
  campana: (g, refX, refY) => {
    const numLit = (valores) => `<c:numLit><c:formatCode>General</c:formatCode><c:ptCount val="${valores.length}"/>${valores
      .map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('')}</c:numLit>`
    const serieCurva = `<c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>${escaparXml(g.nombreSerie)}</c:v></c:tx>
<c:spPr><a:ln w="31750" cap="rnd"><a:solidFill><a:srgbClr val="2E86AB"/></a:solidFill><a:round/></a:ln></c:spPr>
<c:marker><c:symbol val="circle"/><c:size val="4"/><c:spPr><a:solidFill><a:srgbClr val="2E86AB"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr></c:marker>
<c:xVal><c:numRef><c:f>${escaparXml(refX)}</c:f>${xmlCacheNumeros(g.categorias)}</c:numRef></c:xVal>
<c:yVal><c:numRef><c:f>${escaparXml(refY)}</c:f>${xmlCacheNumeros(g.valores)}</c:numRef></c:yVal>
<c:smooth val="1"/></c:ser>`
    const p = g.puntoEvaluado
    const seriePunto = p ? `<c:ser><c:idx val="1"/><c:order val="1"/><c:tx><c:v>${escaparXml(p.nombre)}</c:v></c:tx>
<c:spPr><a:ln w="19050"><a:solidFill><a:srgbClr val="E4572E"/></a:solidFill><a:prstDash val="dash"/></a:ln></c:spPr>
<c:marker><c:symbol val="circle"/><c:size val="9"/><c:spPr><a:solidFill><a:srgbClr val="E4572E"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:marker>
<c:dPt><c:idx val="0"/><c:marker><c:symbol val="none"/></c:marker><c:bubble3D val="0"/></c:dPt>
<c:dLbls><c:dLbl><c:idx val="0"/><c:delete val="1"/></c:dLbl><c:dLbl><c:idx val="1"/><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="es-ES" sz="900" b="1"/><a:t>${escaparXml(p.etiqueta)}</a:t></a:r></a:p></c:rich></c:tx><c:dLblPos val="r"/><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbl><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>
<c:xVal>${numLit([p.x, p.x])}</c:xVal><c:yVal>${numLit([0, p.y])}</c:yVal><c:smooth val="0"/></c:ser>` : ''

    const escalaX = g.ejeXMin !== undefined ? `<c:max val="${g.ejeXMax}"/><c:min val="${g.ejeXMin}"/>` : ''
    return envolverGrafico(g.titulo, `
<c:scatterChart><c:scatterStyle val="smoothMarker"/><c:varyColors val="0"/>
${serieCurva}
${seriePunto}
<c:axId val="10"/><c:axId val="20"/></c:scatterChart>
<c:valAx><c:axId val="10"/><c:scaling><c:orientation val="minMax"/>${escalaX}</c:scaling><c:delete val="0"/><c:axPos val="b"/>${g.tituloEjeX ? xmlTitulo(g.tituloEjeX, 1000) : ''}<c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="low"/><c:crossAx val="20"/><c:crosses val="autoZero"/><c:crossBetween val="midCat"/></c:valAx>
<c:valAx><c:axId val="20"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="D9D9D9"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>${g.tituloEjeY ? xmlTitulo(g.tituloEjeY, 1000) : ''}<c:numFmt formatCode="0.0000" sourceLinked="0"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="10"/><c:crosses val="autoZero"/><c:crossBetween val="midCat"/></c:valAx>`, p ? 'b' : false)
  },

  // Polígono de frecuencia: línea con marcadores
  poligono: (g, refCat, refVal) => envolverGrafico(g.titulo, `
<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>
<c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>${escaparXml(g.nombreSerie)}</c:v></c:tx>
<c:spPr><a:ln w="28575" cap="rnd"><a:solidFill><a:srgbClr val="E4572E"/></a:solidFill><a:round/></a:ln></c:spPr>
<c:marker><c:symbol val="circle"/><c:size val="7"/><c:spPr><a:solidFill><a:srgbClr val="E4572E"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:marker>
${xmlEtiquetasDatos({ posicion: 't' })}
${xmlCategorias(refCat, g.categorias)}${xmlValores(refVal, g.valores)}
<c:smooth val="0"/></c:ser>
<c:marker val="1"/><c:axId val="10"/><c:axId val="20"/></c:lineChart>
${xmlEjes(g.tituloEjeX, g.tituloEjeY)}`, false)
}

// ---------- Dibujo (ubicación de los gráficos en la hoja) ----------

const xmlAncla = ({ col, fila, ancho, alto }, idRel, idForma) => `<xdr:twoCellAnchor>
<xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${fila}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
<xdr:to><xdr:col>${col + ancho}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${fila + alto}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
<xdr:graphicFrame macro="">
<xdr:nvGraphicFramePr><xdr:cNvPr id="${idForma}" name="Gráfico ${idForma - 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart r:id="${idRel}"/></a:graphicData></a:graphic>
</xdr:graphicFrame>
<xdr:clientData/>
</xdr:twoCellAnchor>`

const xmlDrawing = (anclas) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${NS_REL}" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
${anclas.join('\n')}
</xdr:wsDr>`

/**
 * Agrega gráficos nativos a un libro generado con SheetJS.
 * @param {ArrayBuffer|Uint8Array} archivoXlsx salida de XLSX.write({ type: 'array' })
 * @param {Array<{
 *   tipo: 'pastel'|'histograma'|'poligono',
 *   indiceHoja: number,          // posición de la hoja en el libro (0 = primera)
 *   nombreHoja: string,
 *   titulo: string,
 *   nombreSerie: string,
 *   columnaCategorias: string,   // letra de columna, p. ej. 'A'
 *   columnaValores: string,
 *   filaInicio: number,          // filas de Excel (1 = primera)
 *   filaFin: number,
 *   categorias: Array<string|number>,
 *   valores: number[],
 *   tituloEjeX?: string,
 *   tituloEjeY?: string,
 *   ancla?: { col: number, fila: number, ancho?: number, alto?: number } // índices desde 0
 * }>} graficos
 * @param {'blob'|'nodebuffer'|'uint8array'} tipoSalida
 */
export async function agregarGraficos(archivoXlsx, graficos, tipoSalida = 'blob') {
  const zip = await JSZip.loadAsync(archivoXlsx)
  let contentTypes = await zip.file('[Content_Types].xml').async('string')
  const overrides = []

  // Agrupar los gráficos por hoja: cada hoja lleva un solo drawing
  const porHoja = new Map()
  for (const g of graficos) {
    if (!porHoja.has(g.indiceHoja)) porHoja.set(g.indiceHoja, [])
    porHoja.get(g.indiceHoja).push(g)
  }

  let numeroGrafico = 0
  let numeroDrawing = 0

  for (const [indiceHoja, graficosHoja] of porHoja) {
    numeroDrawing++
    const anclas = []
    const relsDrawing = []

    graficosHoja.forEach((g, i) => {
      numeroGrafico++
      const hoja = (ref) => `${referenciaHoja(g.nombreHoja)}!${ref}`
      let refCat = null
      let refVal = null
      if (g.columnaCategorias) {
        refCat = hoja(`$${g.columnaCategorias}$${g.filaInicio}:$${g.columnaCategorias}$${g.filaFin}`)
        refVal = hoja(`$${g.columnaValores}$${g.filaInicio}:$${g.columnaValores}$${g.filaFin}`)
      }
      // Para el diagrama de cajas, cada valor apunta a una celda: { q1: { celda: 'B6', valor } }
      if (g.valores && !Array.isArray(g.valores)) {
        g = {
          ...g,
          valores: Object.fromEntries(Object.entries(g.valores).map(([clave, v]) => [
            clave, { ref: hoja(v.celda.replace(/^([A-Z]+)(\d+)$/, '$$$1$$$2')), valor: v.valor }
          ]))
        }
      }

      zip.file(`xl/charts/chart${numeroGrafico}.xml`, constructores[g.tipo](g, refCat, refVal))
      overrides.push(`<Override PartName="/xl/charts/chart${numeroGrafico}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`)

      const idRel = `rId${i + 1}`
      relsDrawing.push({ id: idRel, tipo: TIPO_REL_CHART, destino: `../charts/chart${numeroGrafico}.xml` })
      const ancla = { col: 6, fila: 1, ancho: 8, alto: 19, ...g.ancla }
      anclas.push(xmlAncla(ancla, idRel, i + 2))
    })

    zip.file(`xl/drawings/drawing${numeroDrawing}.xml`, xmlDrawing(anclas))
    zip.file(`xl/drawings/_rels/drawing${numeroDrawing}.xml.rels`, xmlRelaciones(relsDrawing))
    overrides.push(`<Override PartName="/xl/drawings/drawing${numeroDrawing}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`)

    // Relación hoja → dibujo
    const rutaHoja = `xl/worksheets/sheet${indiceHoja + 1}.xml`
    const rutaRelsHoja = `xl/worksheets/_rels/sheet${indiceHoja + 1}.xml.rels`
    let idRelDrawing = 'rId1'
    const relsExistentes = zip.file(rutaRelsHoja)
    if (relsExistentes) {
      let rels = await relsExistentes.async('string')
      const ids = [...rels.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]))
      idRelDrawing = `rId${Math.max(0, ...ids) + 1}`
      rels = rels.replace('</Relationships>',
        `<Relationship Id="${idRelDrawing}" Type="${TIPO_REL_DRAWING}" Target="../drawings/drawing${numeroDrawing}.xml"/></Relationships>`)
      zip.file(rutaRelsHoja, rels)
    } else {
      zip.file(rutaRelsHoja, xmlRelaciones([
        { id: idRelDrawing, tipo: TIPO_REL_DRAWING, destino: `../drawings/drawing${numeroDrawing}.xml` }
      ]))
    }

    // Referencia al dibujo dentro de la hoja
    let xmlHoja = await zip.file(rutaHoja).async('string')
    if (!/xmlns:r=/.test(xmlHoja)) {
      xmlHoja = xmlHoja.replace('<worksheet ', `<worksheet xmlns:r="${NS_REL}" `)
    }
    xmlHoja = xmlHoja.replace('</worksheet>', `<drawing r:id="${idRelDrawing}"/></worksheet>`)
    zip.file(rutaHoja, xmlHoja)
  }

  contentTypes = contentTypes.replace('</Types>', `${overrides.join('')}</Types>`)
  zip.file('[Content_Types].xml', contentTypes)

  return zip.generateAsync({
    type: tipoSalida,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}

export function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
