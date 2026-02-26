// Estado del calendario
let calendarioFecha = new Date();
let actividadesDelMes = [];

// Inicializar calendario
function inicializarCalendario() {
  configurarEventosCalendario();
  renderizarCalendario();
  cargarActividadesDelMes();
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
    calendarioFecha.setMonth(calendarioFecha.getMonth() - 1);
    renderizarCalendario();
    cargarActividadesDelMes();
  });

  newBtnNext.addEventListener('click', () => {
    calendarioFecha.setMonth(calendarioFecha.getMonth() + 1);
    renderizarCalendario();
    cargarActividadesDelMes();
  });

  newBtnToday.addEventListener('click', () => {
    calendarioFecha = new Date();
    renderizarCalendario();
    cargarActividadesDelMes();
  });
}

function renderizarCalendario() {
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
  
  // Contar actividades de este día usando la fecha correcta
  const actividadesDelDia = actividades.filter(act => {
    return act.fecha_inicio === fechaString;
  });

  const clases = ['calendar-day'];
  if (otroMes) clases.push('other-month');
  if (fechaString === hoyString) clases.push('today');

  // Crear mini-eventos (máximo 3 visibles)
  const maxEventosVisibles = 3;
  const eventosHTML = actividadesDelDia
    .slice(0, maxEventosVisibles)
    .map(act => crearMiniEvento(act))
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

function crearMiniEvento(actividad) {
  const estadoClass = actividad.estado.toLowerCase();
  
  return `
    <div class="calendar-mini-event ${estadoClass}"
         title="${actividad.titulo} - ${actividad.hora_inicio}${actividad.tipo ? ' · ' + actividad.tipo : ''}">
      <span class="event-status-badge ${estadoClass}"></span>
      <span class="event-time">${actividad.hora_inicio}</span>
      <span class="event-title">${actividad.tipo ? getTipoIcon(actividad.tipo) + ' ' : ''}${actividad.titulo}</span>
    </div>
  `;
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
  const actividadesDelDia = actividades.filter(act => {
    return act.fecha_inicio === fecha;
  });

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
    `;
  } else {
    botonesAccion = `
      <button class="btn btn-secondary btn-small" onclick="verDetalles('${actividad.id}')">
        👁️ Ver detalles
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

// Exponer funciones globales
window.inicializarCalendario = inicializarCalendario;
window.seleccionarDia = seleccionarDia;
// Exponer función para crear mini eventos
window.crearMiniEvento = crearMiniEvento;