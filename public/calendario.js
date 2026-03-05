// Estado del calendario
let calendarioFecha = new Date();
let actividadesDelMes = [];
let vistaCalendario = 'mensual';

// Inicializar calendario
function inicializarCalendario() {
  configurarEventosCalendario();
  renderizarCalendario();
  cargarActividadesDelMes();
}

function cambiarVista(vista) {
  vistaCalendario = vista;
  document.getElementById('btn-vista-mensual').classList.toggle('active', vista === 'mensual');
  document.getElementById('btn-vista-anual').classList.toggle('active', vista === 'anual');
  // En vista anual se oculta el panel de eventos del día
  const panelEventos = document.getElementById('calendar-events');
  if (panelEventos) panelEventos.style.display = vista === 'mensual' ? '' : 'none';
  renderizarCalendario();
  if (vista === 'mensual') cargarActividadesDelMes();
}

function configurarEventosCalendario() {
  const btnPrev = document.getElementById('btn-prev-month');
  const btnNext = document.getElementById('btn-next-month');
  const btnToday = document.getElementById('btn-today');

  // Remover listeners previos
  const newBtnPrev = btnPrev.cloneNode(true);
  const newBtnNext = btnNext.cloneNode(true);
  const newBtnToday = btnToday.cloneNode(true);

  btnPrev.parentNode.replaceChild(newBtnPrev, btnPrev);
  btnNext.parentNode.replaceChild(newBtnNext, btnNext);
  btnToday.parentNode.replaceChild(newBtnToday, btnToday);

  newBtnPrev.addEventListener('click', () => {
    if (vistaCalendario === 'anual') {
      calendarioFecha.setFullYear(calendarioFecha.getFullYear() - 1);
    } else {
      calendarioFecha.setMonth(calendarioFecha.getMonth() - 1);
    }
    renderizarCalendario();
    if (vistaCalendario === 'mensual') cargarActividadesDelMes();
  });

  newBtnNext.addEventListener('click', () => {
    if (vistaCalendario === 'anual') {
      calendarioFecha.setFullYear(calendarioFecha.getFullYear() + 1);
    } else {
      calendarioFecha.setMonth(calendarioFecha.getMonth() + 1);
    }
    renderizarCalendario();
    if (vistaCalendario === 'mensual') cargarActividadesDelMes();
  });

  newBtnToday.addEventListener('click', () => {
    calendarioFecha = new Date();
    renderizarCalendario();
    if (vistaCalendario === 'mensual') cargarActividadesDelMes();
  });
}

function renderizarCalendario() {
  if (vistaCalendario === 'anual') {
    renderizarCalendarioAnual();
    return;
  }

  const mes = calendarioFecha.getMonth();
  const año = calendarioFecha.getFullYear();

  // Actualizar título del mes
  const nombreMes = calendarioFecha.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric'
  });
  document.getElementById('current-month').textContent =
    nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

  // Crear grid del calendario
  const calendarView = document.getElementById('calendar-view');

  const calendarHTML = `
    <div class="calendar-grid">
      ${crearHeaderDias()}
      ${crearDiasDelMes(mes, año)}
    </div>
  `;

  calendarView.innerHTML = calendarHTML;
}

function renderizarCalendarioAnual() {
  const año = calendarioFecha.getFullYear();
  document.getElementById('current-month').textContent = String(año);

  const mesesHTML = [];
  for (let m = 0; m < 12; m++) {
    mesesHTML.push(crearMesMini(m, año));
  }

  const tiposColores = window.TIPO_COLORES || {};
  const tiposIconos  = window.TIPO_ICONOS  || {};
  const leyendaItems = Object.entries(tiposColores).map(([tipo, color]) =>
    `<span class="leyenda-item"><span class="leyenda-dot" style="background:${color}"></span>${tiposIconos[tipo] ? tiposIconos[tipo] + ' ' : ''}${tipo}</span>`
  ).join('');
  const leyendaHTML = `<div class="calendario-leyenda">
    <span class="leyenda-titulo">Tipo de actividad:</span>
    ${leyendaItems}
    <span class="leyenda-item"><span class="leyenda-dot" style="background:#607d8b"></span>Otros / Sin tipo</span>
  </div>`;

  const calendarView = document.getElementById('calendar-view');
  calendarView.innerHTML = `<div class="calendar-anual-grid">${mesesHTML.join('')}</div>${leyendaHTML}`;
}

function crearMesMini(mes, año) {
  const nombreMes = new Date(año, mes, 1).toLocaleDateString('es-ES', { month: 'long' });
  const titulo = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

  const diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const headersHTML = diasSemana.map(d => `<div class="mini-header-dia">${d}</div>`).join('');

  const primerDia = new Date(año, mes, 1);
  const offsetInicio = (primerDia.getDay() + 6) % 7; // lunes = 0
  const diasEnMes = new Date(año, mes + 1, 0).getDate();

  const hoyString = formatearFechaISO(new Date());

  let celdas = '';
  for (let i = 0; i < offsetInicio; i++) {
    celdas += `<div class="calendar-dia-mini vacio"></div>`;
  }

  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = new Date(año, mes, d);
    const fechaStr = formatearFechaISO(fecha);
    const esHoy = fechaStr === hoyString;

    const actsDelDia = actividades.filter(act => actividadOcupaDia(act, fechaStr));
    const dotsHTML = actsDelDia.length > 0
      ? `<div class="dia-dots">${actsDelDia.slice(0, 3).map(act =>
          `<span class="dia-dot" style="background:${getTipoColor(act.tipo)}"></span>`).join('')}</div>`
      : '';

    celdas += `<div class="calendar-dia-mini${esHoy ? ' hoy' : ''}${actsDelDia.length > 0 ? ' con-actividad' : ''}"
                    onclick="irADia('${fechaStr}')"
                    title="${fechaStr}">${d}${dotsHTML}</div>`;
  }

  return `
    <div class="calendar-mes-mini">
      <div class="calendar-mes-mini-header">${titulo}</div>
      <div class="calendar-mes-mini-grid">
        ${headersHTML}
        ${celdas}
      </div>
    </div>
  `;
}

function irADia(fechaStr) {
  calendarioFecha = new Date(fechaStr + 'T00:00:00');
  cambiarVista('mensual');
  setTimeout(() => seleccionarDia(fechaStr), 50);
}

function crearHeaderDias() {
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return dias.map(dia => `
    <div class="calendar-header">${dia}</div>
  `).join('');
}

function crearDiasDelMes(mes, año) {
  const primerDia = new Date(año, mes, 1).getDay();
  const ultimoDia = new Date(año, mes + 1, 0).getDate();
  const ultimoDiaMesAnterior = new Date(año, mes, 0).getDate();

  let html = '';
  let diaActual = 1;
  let diaProximoMes = 1;

  // Total de celdas (6 semanas)
  for (let i = 0; i < 42; i++) {
    if (i < primerDia) {
      // Días del mes anterior
      const dia = ultimoDiaMesAnterior - primerDia + i + 1;
      html += crearCeldaDia(dia, mes - 1, año, true);
    } else if (diaActual <= ultimoDia) {
      // Días del mes actual
      html += crearCeldaDia(diaActual, mes, año, false);
      diaActual++;
    } else {
      // Días del próximo mes
      html += crearCeldaDia(diaProximoMes, mes + 1, año, true);
      diaProximoMes++;
    }
  }

  return html;
}

function actividadOcupaDia(act, fechaString) {
  const fin = act.fecha_fin || act.fecha_inicio;
  return fechaString >= act.fecha_inicio && fechaString <= fin;
}

function posicionEnActividad(act, fechaString) {
  const fin = act.fecha_fin || act.fecha_inicio;
  if (act.fecha_inicio === fin) return 'unico';
  if (fechaString === act.fecha_inicio) return 'inicio';
  if (fechaString === fin) return 'fin';
  return 'medio';
}

function crearCeldaDia(dia, mes, año, otroMes) {
  // Ajustar mes y año para fechas fuera del mes actual
  let mesAjustado = mes;
  let añoAjustado = año;

  if (mes < 0) {
    mesAjustado = 11;
    añoAjustado = año - 1;
  } else if (mes > 11) {
    mesAjustado = 0;
    añoAjustado = año + 1;
  }

  const fecha = new Date(añoAjustado, mesAjustado, dia);
  const fechaString = formatearFechaISO(fecha);

  const hoy = new Date();
  const hoyString = formatearFechaISO(hoy);

  // Actividades que incluyen este día (inicio, continuación o fin)
  const actividadesDelDia = actividades.filter(act => actividadOcupaDia(act, fechaString));

  const clases = ['calendar-day'];
  if (otroMes) clases.push('other-month');
  if (fechaString === hoyString) clases.push('today');

  // Crear mini-eventos (máximo 3 visibles)
  const maxEventosVisibles = 3;
  const eventosHTML = actividadesDelDia
    .slice(0, maxEventosVisibles)
    .map(act => crearMiniEvento(act, posicionEnActividad(act, fechaString)))
    .join('');

  // Mostrar contador si hay más eventos
  const masEventosHTML = actividadesDelDia.length > maxEventosVisibles
    ? `<div class="calendar-more-events" onclick="seleccionarDia('${fechaString}'); event.stopPropagation();">
         +${actividadesDelDia.length - maxEventosVisibles} más
       </div>`
    : '';

  return `
    <div class="${clases.join(' ')}" 
         onclick="seleccionarDia('${fechaString}')" 
         data-fecha="${fechaString}">
      <div class="calendar-day-number">${dia}</div>
      <div class="calendar-day-content">
        ${eventosHTML}
        ${masEventosHTML}
      </div>
    </div>
  `;
}

function crearMiniEvento(actividad, posicion = 'unico') {
  const estadoClass = actividad.estado.toLowerCase();
  const esContinuacion = posicion === 'medio';
  const esUltimoDia = posicion === 'fin';

  const leftContent = esContinuacion
    ? `<span class="event-cont-arrow">›</span>`
    : `<span class="event-status-badge ${estadoClass}"></span>
       <span class="event-time">${actividad.hora_inicio}</span>`;

  const tooltipFechas = actividad.fecha_fin && actividad.fecha_fin !== actividad.fecha_inicio
    ? ` (${formatearFechaCorta(actividad.fecha_inicio)} – ${formatearFechaCorta(actividad.fecha_fin)})`
    : '';

  const extraClass = esContinuacion ? ' event-continuation' : esUltimoDia ? ' event-end' : '';

  return `
    <div class="calendar-mini-event ${estadoClass}${extraClass}"
         title="${actividad.titulo} - ${actividad.hora_inicio}${actividad.tipo ? ' · ' + actividad.tipo : ''}${tooltipFechas}"
         onclick="abrirEditarActividad('${actividad.id}'); event.stopPropagation();"
         style="cursor:pointer;">
      ${leftContent}
      <span class="event-title">${actividad.tipo ? getTipoIcon(actividad.tipo) + ' ' : ''}${actividad.titulo}</span>
    </div>
  `;
}
function formatearFechaCorta(fechaISO) {
  if (!fechaISO) return '';
  const [año, mes, dia] = fechaISO.split('-');
  return `${dia}/${mes}/${año}`;
}

function formatearFechaISO(fecha) {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

function cargarActividadesDelMes() {
  const mes = calendarioFecha.getMonth();
  const año = calendarioFecha.getFullYear();
  
  actividadesDelMes = actividades.filter(act => {
    const actFecha = new Date(act.fecha_inicio + 'T00:00:00');
    return actFecha.getMonth() === mes && actFecha.getFullYear() === año;
  });

  // Re-renderizar para mostrar los puntos de eventos
  renderizarCalendario();
}

function seleccionarDia(fecha) {
  // Remover selección previa
  document.querySelectorAll('.calendar-day').forEach(day => {
    day.classList.remove('selected');
  });

  // Agregar selección al día clickeado
  const diaElement = document.querySelector(`[data-fecha="${fecha}"]`);
  if (diaElement && !diaElement.classList.contains('other-month')) {
    diaElement.classList.add('selected');
  }

  // Mostrar actividades del día
  mostrarActividadesDelDia(fecha);
}

function mostrarActividadesDelDia(fecha) {
  const actividadesDelDia = actividades.filter(act => actividadOcupaDia(act, fecha));

  const container = document.getElementById('selected-day-events');

  if (actividadesDelDia.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <p>No hay actividades programadas para este día</p>
      </div>
    `;
    return;
  }

  const fechaObj = new Date(fecha + 'T00:00:00');
  const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  container.innerHTML = `
    <h4 style="margin-bottom: 15px; color: var(--primary-color);">
      ${fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1)}
    </h4>
    ${actividadesDelDia.map(act => crearTarjetaActividadDia(act)).join('')}
  `;
}

function crearTarjetaActividadDia(actividad) {
  // Botones según estado
  let botonesAccion = '';
  if (actividad.estado === 'Activa') {
    botonesAccion = `
      <button class="btn btn-primary btn-small" onclick="abrirEditarActividad('${actividad.id}')">
        ✏️ Editar
      </button>
      <button class="btn btn-success btn-small" onclick="completarActividadDirecto('${actividad.id}')">
        ✅ Completar
      </button>
      <button class="btn btn-danger btn-small" onclick="cancelarActividadDirecto('${actividad.id}')">
        ❌ Cancelar
      </button>
      <button class="btn btn-danger btn-small" onclick="eliminarActividad('${actividad.id}')">
        🗑️ Eliminar
      </button>
    `;
  } else {
    botonesAccion = `
      <button class="btn btn-secondary btn-small" onclick="verDetalles('${actividad.id}')">
        👁️ Ver detalles
      </button>
      <button class="btn btn-danger btn-small" onclick="eliminarActividad('${actividad.id}')">
        🗑️ Eliminar
      </button>
    `;
  }

  return `
    <div class="actividad-card ${actividad.estado.toLowerCase()}" style="margin-bottom: 15px;">
      <div class="actividad-header">
        <div>
          <div class="actividad-titulo">${actividad.titulo}</div>
          <span class="actividad-estado ${actividad.estado.toLowerCase()}">
            ${actividad.estado}
          </span>
        </div>
      </div>
      
      <div class="actividad-info">
        ${actividad.fecha_fin && actividad.fecha_fin !== actividad.fecha_inicio ? `
        <div class="actividad-info-item">
          📅 ${formatearFechaCorta(actividad.fecha_inicio)} – ${formatearFechaCorta(actividad.fecha_fin)}
        </div>` : ''}
        <div class="actividad-info-item">
          🕒 ${actividad.hora_inicio} – ${actividad.hora_fin || calcularHoraFin(actividad.hora_inicio, actividad.duracion_min)}
        </div>
        ${actividad.tipo ? `<div class="actividad-info-item">${getTipoIcon(actividad.tipo)} ${actividad.tipo}</div>` : ''}
      </div>

      <div class="actividad-descripcion">
        ${actividad.descripcion || 'Sin descripción'}
      </div>

      <div class="actividad-participantes">
        <strong>Participantes:</strong> ${actividad.participantes.join(', ')}
      </div>

      <div class="actividad-actions" style="margin-top: 15px;">
        ${botonesAccion}
      </div>
    </div>
  `;
}

function calcularHoraFin(horaInicio, duracionMin) {
  const [horas, minutos] = horaInicio.split(':').map(Number);
  const inicio = new Date();
  inicio.setHours(horas, minutos, 0);
  
  const fin = new Date(inicio.getTime() + duracionMin * 60000);
  
  return fin.toTimeString().slice(0, 5);
}

function exportarExcel() {
  const año = calendarioFecha.getFullYear();
  let actsExportar, nombreArchivo, periodoLabel;

  if (vistaCalendario === 'anual') {
    actsExportar = actividades.filter(a => a.fecha_inicio.startsWith(String(año)));
    nombreArchivo = `actividades_${año}.xls`;
    periodoLabel = String(año);
  } else {
    const mes = String(calendarioFecha.getMonth() + 1).padStart(2, '0');
    actsExportar = actividades.filter(a => a.fecha_inicio.startsWith(`${año}-${mes}`));
    nombreArchivo = `actividades_${año}-${mes}.xls`;
    const nombreMes = calendarioFecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    periodoLabel = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
  }

  if (actsExportar.length === 0) {
    alert('No hay actividades para exportar en el periodo seleccionado.');
    return;
  }

  const ordenadas = [...actsExportar].sort((a, b) =>
    a.fecha_inicio.localeCompare(b.fecha_inicio) || a.hora_inicio.localeCompare(b.hora_inicio)
  );

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cell(value, type = 'String', bold = false) {
    const style = bold ? ' ss:StyleID="bold"' : '';
    return `<Cell${style}><Data ss:Type="${type}">${esc(value)}</Data></Cell>`;
  }

  const cabeceras = ['ID', 'Título', 'Tipo', 'Fecha inicio', 'Hora inicio', 'Fecha fin', 'Hora fin', 'Duración (min)', 'Estado', 'Descripción', 'Participantes', 'Creado por'];
  const headerRow = '<Row>' + cabeceras.map(h => cell(h, 'String', true)).join('') + '</Row>';

  const dataRows = ordenadas.map(a => {
    const duracion = a.duracion_min != null ? a.duracion_min : '';
    return '<Row>' + [
      cell(a.id),
      cell(a.titulo),
      cell(a.tipo || ''),
      cell(a.fecha_inicio),
      cell(a.hora_inicio),
      cell(a.fecha_fin || a.fecha_inicio),
      cell(a.hora_fin || a.hora_inicio),
      duracion !== '' ? cell(duracion, 'Number') : cell(''),
      cell(a.estado),
      cell(a.descripcion || ''),
      cell((a.participantes || []).join('; ')),
      cell(a.creado_por || '')
    ].join('') + '</Row>';
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:x="urn:schemas-microsoft-com:office:excel">
  <Styles>
    <Style ss:ID="bold">
      <Font ss:Bold="1"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${esc(periodoLabel)}">
    <Table>
      ${headerRow}
      ${dataRows}
    </Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <FreezePanes/>
      <FrozenNoSplit/>
      <SplitHorizontal>1</SplitHorizontal>
      <TopRowBottomPane>1</TopRowBottomPane>
    </WorksheetOptions>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  link.click();
  URL.revokeObjectURL(url);
}

function exportarCSV() {
  const año = calendarioFecha.getFullYear();
  let actsExportar, nombreArchivo;

  if (vistaCalendario === 'anual') {
    actsExportar = actividades.filter(a => a.fecha_inicio.startsWith(String(año)));
    nombreArchivo = `actividades_${año}.csv`;
  } else {
    const mes = String(calendarioFecha.getMonth() + 1).padStart(2, '0');
    actsExportar = actividades.filter(a => a.fecha_inicio.startsWith(`${año}-${mes}`));
    nombreArchivo = `actividades_${año}-${mes}.csv`;
  }

  if (actsExportar.length === 0) {
    alert('No hay actividades para exportar en el periodo seleccionado.');
    return;
  }

  const cabeceras = ['ID', 'Título', 'Tipo', 'Fecha inicio', 'Hora inicio', 'Fecha fin', 'Hora fin', 'Estado', 'Descripción', 'Participantes', 'Creado por'];
  const filas = actsExportar.map(a =>
    [
      a.id,
      a.titulo,
      a.tipo || '',
      a.fecha_inicio,
      a.hora_inicio,
      a.fecha_fin || a.fecha_inicio,
      a.hora_fin || a.hora_inicio,
      a.estado,
      a.descripcion || '',
      (a.participantes || []).join('; '),
      a.creado_por || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  );

  const csv = [cabeceras.join(','), ...filas].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  link.click();
  URL.revokeObjectURL(url);
}

// Exponer funciones globales
window.inicializarCalendario = inicializarCalendario;
window.seleccionarDia = seleccionarDia;
window.cambiarVista = cambiarVista;
window.irADia = irADia;
window.exportarExcel = exportarExcel;
window.exportarCSV = exportarCSV;
// Exponer función para crear mini eventos
window.crearMiniEvento = crearMiniEvento;