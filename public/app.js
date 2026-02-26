// ==================== AUTENTICACIÓN ====================
const TIMEOUT_INACTIVIDAD_HORAS = 8; // Horas de inactividad antes de logout
const TIMEOUT_SESION_HORAS = 24; // Horas máximas de sesión

function verificarSesion() {
  // Buscar sesión en localStorage O sessionStorage
  const usuarioLocal = localStorage.getItem('usuario_actual');
  const usuarioSession = sessionStorage.getItem('usuario_actual');
  const usuarioActual = usuarioLocal || usuarioSession;
  
  if (!usuarioActual) {
    window.location.href = 'login.html';
    return null;
  }

  const usuario = JSON.parse(usuarioActual);
  
  // Indicar tipo de sesión en consola
  if (usuarioLocal) {
    console.log('🔒 Sesión persistente (localStorage) - Se mantiene al cerrar navegador');
  } else {
    console.log('🔓 Sesión temporal (sessionStorage) - Se borra al cerrar navegador');
  }
  
  // Mostrar info del usuario en el header
  const userNameEl = document.getElementById('user-name');
  const userEmailEl = document.getElementById('user-email');
  
  if (userNameEl) userNameEl.textContent = usuario.nombre;
  if (userEmailEl) userEmailEl.textContent = usuario.email;
  
  return usuario;
}

function verificarTimeoutSesion() {
  const usuario = obtenerUsuarioActual();
  if (!usuario) return;
  
  const loginTime = new Date(usuario.loginTime);
  const lastActivity = usuario.lastActivity ? new Date(usuario.lastActivity) : loginTime;
  const ahora = new Date();
  
  // Calcular tiempo transcurrido
  const horasDesdeLogin = (ahora - loginTime) / (1000 * 60 * 60);
  const horasInactivo = (ahora - lastActivity) / (1000 * 60 * 60);
  
  console.log(`⏰ Sesión iniciada hace: ${horasDesdeLogin.toFixed(2)} horas`);
  console.log(`⏰ Última actividad hace: ${horasInactivo.toFixed(2)} horas`);
  
  // Si la sesión total excede el límite
  if (horasDesdeLogin > TIMEOUT_SESION_HORAS) {
    alert(`Tu sesión ha expirado después de ${TIMEOUT_SESION_HORAS} horas. Por favor, vuelve a iniciar sesión.`);
    cerrarSesion();
    return false;
  }
  
  // Si la inactividad excede el límite
  if (horasInactivo > TIMEOUT_INACTIVIDAD_HORAS) {
    alert(`Tu sesión se cerró por inactividad (${TIMEOUT_INACTIVIDAD_HORAS} horas sin uso). Por favor, vuelve a iniciar sesión.`);
    cerrarSesion();
    return false;
  }
  
  return true;
}

function actualizarUltimaActividad() {
  const usuarioLocal = localStorage.getItem('usuario_actual');
  const usuarioSession = sessionStorage.getItem('usuario_actual');
  
  let usuario;
  let esLocal = false;
  
  if (usuarioLocal) {
    usuario = JSON.parse(usuarioLocal);
    esLocal = true;
  } else if (usuarioSession) {
    usuario = JSON.parse(usuarioSession);
    esLocal = false;
  } else {
    return;
  }
  
  usuario.lastActivity = new Date().toISOString();
  
  // Guardar en el mismo storage que se está usando
  if (esLocal) {
    localStorage.setItem('usuario_actual', JSON.stringify(usuario));
  } else {
    sessionStorage.setItem('usuario_actual', JSON.stringify(usuario));
  }
  
  console.log('✅ Última actividad actualizada:', new Date().toLocaleTimeString());
}
function iniciarMonitoreoActividad() {
  // Actualizar en eventos importantes
  const eventos = [
    'click',
    'keydown',
    'scroll',
    'mousemove',
    'touchstart'
  ];
  
  // Debounce: solo actualiza cada 30 segundos máximo
  let ultimaActualizacion = Date.now();
  const DEBOUNCE_MS = 30000; // 30 segundos
  
  eventos.forEach(evento => {
    document.addEventListener(evento, () => {
      const ahora = Date.now();
      if (ahora - ultimaActualizacion > DEBOUNCE_MS) {
        actualizarUltimaActividad();
        ultimaActualizacion = ahora;
      }
    });
  });
  
  // Verificar timeout cada 5 minutos
  setInterval(() => {
    verificarTimeoutSesion();
  }, 5 * 60 * 1000); // 5 minutos
}

function cerrarSesion() {
  if (confirm('¿Cerrar sesión?')) {
    console.log('🚪 Cerrando sesión...');
    
    // Limpiar ambos storages
    localStorage.removeItem('usuario_actual');
    sessionStorage.removeItem('usuario_actual');
    
    // Redirigir con parámetro de logout
    window.location.href = 'login.html?logout=true';
  }
}
function obtenerUsuarioActual() {
  const usuarioLocal = localStorage.getItem('usuario_actual');
  const usuarioSession = sessionStorage.getItem('usuario_actual');
  const usuario = usuarioLocal || usuarioSession;
  return usuario ? JSON.parse(usuario) : null;
}

// Exponer funciones globalmente
window.cerrarSesion = cerrarSesion;
// API Base URL
const API_BASE = '/.netlify/functions';

const TIPO_ICONOS = {
  'Concierto': '🎵',
  'Viaje': '✈️',
  'Comida/Cena': '🍽️',
  'Teatro/Musical': '🎭'
};

function getTipoIcon(tipo) {
  return TIPO_ICONOS[tipo] || '📌';
}
window.getTipoIcon = getTipoIcon;

// Estado global
let actividades = [];
let personas = [];
let actividadSeleccionada = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM cargado - iniciando app');
  inicializarApp();
  configurarEventListeners();
});

async function inicializarApp() {
  console.log('🚀 inicializarApp() ejecutándose...');
  
  // Verificar sesión
  const usuario = verificarSesion();
  if (!usuario) {
    console.log('❌ No hay usuario - deteniendo inicialización');
    return;
  }
  
  console.log('✅ Usuario verificado:', usuario.email);
  
  // Verificar timeout
  const sesionValida = verificarTimeoutSesion();
  if (!sesionValida) {
    console.log('❌ Sesión no válida - deteniendo inicialización');
    return;
  }
  
  console.log('✅ Sesión válida');
  
  // Iniciar monitoreo de actividad
  iniciarMonitoreoActividad();
  
  // Actualizar última actividad al cargar
  actualizarUltimaActividad();
  
  console.log('📋 Cargando personas...');
  await cargarPersonas();
  
  console.log('📋 Cargando actividades...');
  await cargarActividades();
  
  console.log('✅ Inicialización completa');
  mostrarTab('dashboard');
}

function configurarEventListeners() {
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      mostrarTab(tab);
    });
  });

  // Formulario crear actividad
  document.getElementById('form-actividad').addEventListener('submit', crearActividad);

  // Auto-rellenar fecha_fin y hora_fin con los valores de inicio
  document.getElementById('fecha_inicio').addEventListener('change', (e) => {
    const fechaFin = document.getElementById('fecha_fin');
    if (!fechaFin.value) fechaFin.value = e.target.value;
  });
  document.getElementById('hora_inicio').addEventListener('change', (e) => {
    const horaFin = document.getElementById('hora_fin');
    if (!horaFin.value) horaFin.value = e.target.value;
  });

  // Formulario editar actividad
  document.getElementById('form-editar-actividad').addEventListener('submit', actualizarActividad);

  // Botón cancelar actividad en modal
  document.getElementById('btn-cancelar-actividad').addEventListener('click', () => cambiarEstadoActividad('Cancelada'));
  
  // Botón completar actividad en modal
  document.getElementById('btn-completar-actividad').addEventListener('click', () => cambiarEstadoActividad('Completada'));

  // Refresh actividades
  document.getElementById('btn-refresh').addEventListener('click', cargarActividades);

  // Filtro estado
  document.getElementById('filter-estado').addEventListener('change', filtrarActividades);

  // Modales
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', cerrarModales);
  });

  // Nueva persona
  document.getElementById('btn-nueva-persona').addEventListener('click', () => {
    document.getElementById('modal-persona').classList.add('active');
    // Limpiar formulario
    document.getElementById('form-nueva-persona').reset();
    document.getElementById('persona-id').value = '';
  });

  // Formulario persona
  document.getElementById('form-nueva-persona').addEventListener('submit', guardarPersona);

  // Cerrar modal al hacer clic fuera
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      cerrarModales();
    }
  });
}

// ==================== TABS ====================
function mostrarTab(tabId) {
  // Actualizar botones
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tabId) {
      btn.classList.add('active');
    }
  });

  // Mostrar contenido
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(tabId).classList.add('active');

  // Acciones específicas por tab
  if (tabId === 'calendario') {
    inicializarCalendario();
  }
}

// ==================== ACTIVIDADES ====================
async function cargarActividades() {
  const loading = document.getElementById('loading');
  const listaContainer = document.getElementById('actividades-list');
  const noActividades = document.getElementById('no-actividades');

  loading.style.display = 'block';
  listaContainer.innerHTML = '';

  try {
    const response = await fetch(`${API_BASE}/actividades-listar`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    actividades = data.data;

    if (actividades.length === 0) {
      noActividades.style.display = 'block';
    } else {
      noActividades.style.display = 'none';
      renderizarActividades(actividades);
    }

  } catch (error) {
    console.error('Error cargando actividades:', error);
    mostrarMensaje('error', 'Error al cargar actividades: ' + error.message);
  } finally {
    loading.style.display = 'none';
  }
}

function renderizarActividades(actividadesAMostrar) {
  const container = document.getElementById('actividades-list');
  container.innerHTML = '';

  actividadesAMostrar.forEach(actividad => {
    const card = crearActividadCard(actividad);
    container.appendChild(card);
  });
}

function crearActividadCard(actividad) {
  const card = document.createElement('div');
  card.className = `actividad-card ${actividad.estado.toLowerCase()}`;

  const participantesBadges = actividad.participantes
    .slice(0, 3)
    .map(email => `<span class="participante-badge">${email.split('@')[0]}</span>`)
    .join('');

  const masParticipantes = actividad.participantes.length > 3 
    ? `<span class="participante-badge">+${actividad.participantes.length - 3}</span>` 
    : '';

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
        👁️ Ver
      </button>
    `;
  }

  const horaFin = actividad.hora_fin || actividad.hora_inicio;
  const fechaFinMostrar = actividad.fecha_fin && actividad.fecha_fin !== actividad.fecha_inicio
    ? ` – ${formatearFecha(actividad.fecha_fin)}`
    : '';

  card.innerHTML = `
    <div class="actividad-header">
      <div>
        <div class="actividad-titulo">${actividad.titulo}</div>
        <span class="actividad-estado ${actividad.estado.toLowerCase()}">${actividad.estado}</span>
        ${actividad.tipo ? `<span class="actividad-estado" style="background:#6c757d;color:#fff;margin-left:4px;">${getTipoIcon(actividad.tipo)} ${actividad.tipo}</span>` : ''}
      </div>
    </div>

    <div class="actividad-info">
      <div class="actividad-info-item">
        📅 ${formatearFecha(actividad.fecha_inicio)}${fechaFinMostrar}
      </div>
      <div class="actividad-info-item">
        🕒 ${actividad.hora_inicio} – ${horaFin}
      </div>
    </div>

    <div class="actividad-descripcion">
      ${actividad.descripcion || 'Sin descripción'}
    </div>

    <div class="actividad-participantes">
      <strong>Participantes (${actividad.participantes.length}):</strong>
      <div class="participantes-badges">
        ${participantesBadges}
        ${masParticipantes}
      </div>
    </div>

    <div class="actividad-actions">
      ${botonesAccion}
    </div>
  `;

  return card;
}

async function crearActividad(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const participantesSeleccionados = Array.from(
    document.querySelectorAll('input[name="participantes"]:checked')
  ).map(input => input.value);

  if (participantesSeleccionados.length === 0) {
    mostrarMensajeForm('error', 'Debes seleccionar al menos un participante');
    return;
  }

  const usuario = obtenerUsuarioActual(); // ← OBTENER USUARIO DE LA SESIÓN

  const actividad = {
    titulo: formData.get('titulo'),
    tipo: formData.get('tipo'),
    fecha_inicio: formData.get('fecha_inicio'),
    hora_inicio: formData.get('hora_inicio'),
    fecha_fin: formData.get('fecha_fin') || formData.get('fecha_inicio'),
    hora_fin: formData.get('hora_fin') || formData.get('hora_inicio'),
    descripcion: formData.get('descripcion'),
    participantes: participantesSeleccionados,
    creado_por: usuario.email
  };

  try {
    mostrarMensajeForm('info', 'Creando actividad...');

    const response = await fetch(`${API_BASE}/actividades-crear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actividad)
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    mostrarMensajeForm('success', '✅ Actividad creada exitosamente. Notificaciones enviadas.');
    
    // Reset form
    e.target.reset();
    
    // Recargar actividades
    await cargarActividades();

    // Volver al dashboard después de 2 segundos
    setTimeout(() => {
      mostrarTab('dashboard');
    }, 2000);

  } catch (error) {
    console.error('Error:', error);
    mostrarMensajeForm('error', 'Error al crear actividad: ' + error.message);
  }
}

async function actualizarActividad(e) {
  e.preventDefault();

  const id = document.getElementById('edit-id').value;
  
  // Obtener participantes seleccionados
  const participantesSeleccionados = Array.from(
    document.querySelectorAll('input[name="edit-participantes"]:checked')
  ).map(input => input.value);

  const fechaInicio = document.getElementById('edit-fecha').value;
  const horaInicio = document.getElementById('edit-hora').value;
  const datos = {
    id: id,
    titulo: document.getElementById('edit-titulo').value,
    tipo: document.getElementById('edit-tipo').value,
    fecha_inicio: fechaInicio,
    hora_inicio: horaInicio,
    fecha_fin: document.getElementById('edit-fecha-fin').value || fechaInicio,
    hora_fin: document.getElementById('edit-hora-fin').value || horaInicio,
    descripcion: document.getElementById('edit-descripcion').value,
    estado: document.getElementById('edit-estado').value,
    participantes: participantesSeleccionados
  };

  try {
    const response = await fetch(`${API_BASE}/actividades-actualizar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    mostrarMensaje('success', 'Actividad actualizada exitosamente');
    cerrarModales();
    await cargarActividades();

  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('error', 'Error al actualizar: ' + error.message);
  }
}

async function cambiarEstadoActividad(nuevoEstado) {
  if (!confirm(`¿Estás seguro de marcar esta actividad como ${nuevoEstado}?`)) {
    return;
  }

  const id = document.getElementById('edit-id').value;
  
  try {
    const response = await fetch(`${API_BASE}/actividades-actualizar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado: nuevoEstado })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    mostrarMensaje('success', `Actividad marcada como ${nuevoEstado}. Notificaciones enviadas.`);
    cerrarModales();
    await cargarActividades();

  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('error', 'Error al cambiar estado: ' + error.message);
  }
}

async function completarActividadDirecto(id) {
  if (!confirm('¿Marcar esta actividad como Completada?')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/actividades-actualizar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado: 'Completada' })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    mostrarMensaje('success', 'Actividad completada exitosamente');
    await cargarActividades();

  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('error', 'Error: ' + error.message);
  }
}

async function cancelarActividadDirecto(id) {
  if (!confirm('¿Cancelar esta actividad? Se notificará a todos los participantes.')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/actividades-actualizar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado: 'Cancelada' })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    mostrarMensaje('success', 'Actividad cancelada. Notificaciones enviadas.');
    await cargarActividades();

  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('error', 'Error: ' + error.message);
  }
}

function abrirEditarActividad(id) {
  const actividad = actividades.find(a => a.id === id);
  if (!actividad) return;

  document.getElementById('edit-id').value = actividad.id;
  document.getElementById('edit-titulo').value = actividad.titulo;
  document.getElementById('edit-tipo').value = actividad.tipo || '';
  document.getElementById('edit-fecha').value = actividad.fecha_inicio;
  document.getElementById('edit-hora').value = actividad.hora_inicio;
  document.getElementById('edit-fecha-fin').value = actividad.fecha_fin || actividad.fecha_inicio;
  document.getElementById('edit-hora-fin').value = actividad.hora_fin || actividad.hora_inicio;
  document.getElementById('edit-descripcion').value = actividad.descripcion;
  document.getElementById('edit-estado').value = actividad.estado;

  // Renderizar participantes con checkboxes
  renderizarParticipantesEdicion(actividad.participantes);

  document.getElementById('modal-editar').classList.add('active');
}

function renderizarParticipantesEdicion(participantesActuales) {
  const container = document.getElementById('edit-participantes-container');
  container.innerHTML = '';

  personas.filter(p => p.activo).forEach(persona => {
    const estaSeleccionado = participantesActuales.includes(persona.email);
    
    const div = document.createElement('div');
    div.className = 'participante-checkbox';
    div.innerHTML = `
      <input type="checkbox" 
             name="edit-participantes" 
             value="${persona.email}" 
             id="edit_part_${persona.email.replace(/[^a-zA-Z0-9]/g, '_')}"
             ${estaSeleccionado ? 'checked' : ''}>
      <label for="edit_part_${persona.email.replace(/[^a-zA-Z0-9]/g, '_')}" style="cursor: pointer; flex: 1;">
        <div class="participante-info">
          <div class="participante-nombre">${persona.nombre}</div>
          <div class="participante-email">${persona.email}</div>
        </div>
      </label>
    `;
    container.appendChild(div);
  });
}

function verDetalles(id) {
  const actividad = actividades.find(a => a.id === id);
  if (!actividad) return;

  alert(`
Título: ${actividad.titulo}
Tipo: ${actividad.tipo ? getTipoIcon(actividad.tipo) + ' ' + actividad.tipo : 'Sin tipo'}
Inicio: ${actividad.fecha_inicio} a las ${actividad.hora_inicio}
Fin: ${actividad.fecha_fin || actividad.fecha_inicio} a las ${actividad.hora_fin || actividad.hora_inicio}
Estado: ${actividad.estado}
Descripción: ${actividad.descripcion}
Participantes: ${actividad.participantes.join(', ')}
  `);
}

function filtrarActividades() {
  const filtro = document.getElementById('filter-estado').value;
  
  if (!filtro) {
    renderizarActividades(actividades);
  } else {
    const filtradas = actividades.filter(a => a.estado === filtro);
    renderizarActividades(filtradas);
  }
}

// ==================== PERSONAS ====================
async function cargarPersonas() {
  try {
    console.log('📋 Cargando personas desde Google Sheets...');
    
    const response = await fetch(`${API_BASE}/personas-listar`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    personas = data.data;
    console.log(`✅ Personas cargadas: ${personas.length}`);

    // Agregar IDs si no existen (para compatibilidad)
    personas = personas.map((p) => ({
      ...p,
      id: p.email // Usar email como ID único
    }));

    renderizarCheckboxesParticipantes();
    renderizarTablaPersonas();

  } catch (error) {
    console.error('❌ Error cargando personas:', error);
    mostrarMensaje('error', 'Error al cargar personas: ' + error.message);
    
    // Fallback: usar personas vacías
    personas = [];
  }
}

function renderizarCheckboxesParticipantes() {
  const container = document.getElementById('participantes-container');
  if (!container) return;
  
  container.innerHTML = '';

  personas.filter(p => p.activo).forEach(persona => {
    const div = document.createElement('div');
    div.className = 'participante-checkbox';
    div.innerHTML = `
      <input type="checkbox" name="participantes" value="${persona.email}" id="part_${persona.email.replace(/[^a-zA-Z0-9]/g, '_')}">
      <label for="part_${persona.email.replace(/[^a-zA-Z0-9]/g, '_')}" style="cursor: pointer; flex: 1;">
        <div class="participante-info">
          <div class="participante-nombre">${persona.nombre}</div>
          <div class="participante-email">${persona.email}</div>
        </div>
      </label>
    `;
    container.appendChild(div);
  });
}

function renderizarTablaPersonas() {
  const container = document.getElementById('personas-list');
  if (!container) return;
  
  const table = `
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Email</th>
          <th>Departamento</th>
          <th>Cargo</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${personas.map(p => `
          <tr>
            <td>${p.nombre}</td>
            <td>${p.email}</td>
            <td>${p.departamento || '-'}</td>
            <td>${p.cargo || '-'}</td>
            <td>
              <span class="status-badge ${p.activo ? 'active' : 'inactive'}">
                ${p.activo ? 'Activo' : 'Inactivo'}
              </span>
            </td>
            <td>
              <button class="btn btn-primary btn-small" onclick="editarPersona('${p.email}')">
                ✏️ Editar
              </button>
              <button class="btn btn-danger btn-small" onclick="eliminarPersona('${p.email}')">
                🗑️ Eliminar
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = table;
}

function editarPersona(email) {
  const persona = personas.find(p => p.email === email);
  if (!persona) return;

  document.getElementById('persona-id').value = persona.email;
  document.getElementById('persona-email').value = persona.email;
  document.getElementById('persona-nombre').value = persona.nombre;
  document.getElementById('persona-departamento').value = persona.departamento || '';
  document.getElementById('persona-cargo').value = persona.cargo || '';
  document.getElementById('persona-activo').checked = persona.activo;

  document.getElementById('modal-persona').classList.add('active');
}

async function eliminarPersona(email) {
  if (!confirm('¿Eliminar esta persona? No podrás asignarla a nuevas actividades.')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/personas-eliminar`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    mostrarMensaje('success', 'Persona eliminada exitosamente');
    await cargarPersonas();

  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('error', 'Error: ' + error.message);
  }
}

async function guardarPersona(e) {
  e.preventDefault();

  const emailOriginal = document.getElementById('persona-id').value;
  const persona = {
    email: document.getElementById('persona-email').value,
    nombre: document.getElementById('persona-nombre').value,
    departamento: document.getElementById('persona-departamento').value,
    cargo: document.getElementById('persona-cargo').value,
    activo: document.getElementById('persona-activo').checked
  };

  try {
    if (emailOriginal) {
      // Editar existente
      const response = await fetch(`${API_BASE}/personas-actualizar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailOriginal, ...persona })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      mostrarMensaje('success', 'Persona actualizada exitosamente');
    } else {
      // Crear nueva
      const response = await fetch(`${API_BASE}/personas-crear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(persona)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      mostrarMensaje('success', 'Persona agregada exitosamente');
    }

    await cargarPersonas();
    cerrarModales();
    e.target.reset();

  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('error', 'Error: ' + error.message);
  }
}

// ==================== UTILIDADES ====================
function formatearFecha(fecha) {
  const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', opciones);
}

function mostrarMensaje(tipo, mensaje) {
  alert(mensaje);
}

function mostrarMensajeForm(tipo, mensaje) {
  const messageDiv = document.getElementById('form-message');
  messageDiv.className = `form-message ${tipo}`;
  messageDiv.textContent = mensaje;
  messageDiv.style.display = 'block';

  if (tipo === 'success') {
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 5000);
  }
}

function cerrarModales() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.remove('active');
  });
}

function resetForm() {
  document.getElementById('form-actividad').reset();
  document.querySelectorAll('input[name="participantes"]').forEach(input => {
    input.checked = false;
  });
}


function verificarSesion() {
  // Buscar sesión en localStorage O sessionStorage
  const usuarioLocal = localStorage.getItem('usuario_actual');
  const usuarioSession = sessionStorage.getItem('usuario_actual');
  const usuarioActual = usuarioLocal || usuarioSession;
  
  if (!usuarioActual) {
    console.log('❌ No hay sesión - redirigiendo a login');
    window.location.href = 'login.html';
    return null;
  }

  const usuario = JSON.parse(usuarioActual);
  
  // Indicar tipo de sesión en consola
  if (usuarioLocal) {
    console.log('🔒 Sesión persistente (localStorage) - Se mantiene al cerrar navegador');
  } else {
    console.log('🔓 Sesión temporal (sessionStorage) - Se borra al cerrar navegador');
  }
  
  // Mostrar info del usuario en el header (PROTEGIDO)
  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      actualizarHeaderUsuario(usuario, usuarioLocal);
    });
  } else {
    actualizarHeaderUsuario(usuario, usuarioLocal);
  }
  
  return usuario;
}

function actualizarHeaderUsuario(usuario, esLocal) {
  const userNameEl = document.getElementById('user-name');
  const userEmailEl = document.getElementById('user-email');
  const sessionTypeEl = document.getElementById('session-type');
  
  if (userNameEl) {
    userNameEl.textContent = usuario.nombre;
  }
  
  if (userEmailEl) {
    userEmailEl.textContent = usuario.email;
  }
  
  // Mostrar tipo de sesión
  if (sessionTypeEl) {
    if (esLocal) {
      sessionTypeEl.textContent = '🔒 Persistente';
      sessionTypeEl.title = 'Sesión guardada - permanecerá activa al cerrar navegador';
    } else {
      sessionTypeEl.textContent = '🔓 Temporal';
      sessionTypeEl.title = 'Sesión temporal - se cerrará al cerrar navegador';
    }
  }
}

// Exponer funciones globales
window.mostrarTab = mostrarTab;
window.abrirEditarActividad = abrirEditarActividad;
window.verDetalles = verDetalles;
window.resetForm = resetForm;
window.completarActividadDirecto = completarActividadDirecto;
window.cancelarActividadDirecto = cancelarActividadDirecto;
window.editarPersona = editarPersona;
window.eliminarPersona = eliminarPersona;
window.renderizarParticipantesEdicion = renderizarParticipantesEdicion;