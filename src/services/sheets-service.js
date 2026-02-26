const { sheets } = require('../config/google-config');

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

class SheetsService {
  
  async crearActividad(actividad) {
    const values = [[
      actividad.id || this.generarId(),
      actividad.titulo,
      actividad.fecha_inicio,
      actividad.hora_inicio,
      actividad.duracion_min,
      actividad.participantes.join(', '),
      actividad.descripcion,
      'Activa',
      '',
      actividad.creado_por,
      new Date().toISOString()
    ]];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Actividades!A:K',
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    });

    return {
      success: true,
      id: values[0][0],
      row: response.data.updates.updatedRange
    };
  }

  async listarActividades() {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Actividades!A2:K'
    });

    const rows = response.data.values || [];
    return rows.map(row => ({
      id: row[0],
      titulo: row[1],
      fecha_inicio: row[2],
      hora_inicio: row[3],
      duracion_min: row[4],
      participantes: row[5] ? row[5].split(', ') : [],
      descripcion: row[6],
      estado: row[7],
      eventId: row[8],
      creado_por: row[9],
      fecha_creacion: row[10]
    }));
  }

  async actualizarActividad(id, datos) {
    const actividades = await this.listarActividades();
    const index = actividades.findIndex(act => act.id === id);
    
    if (index === -1) {
      throw new Error('Actividad no encontrada');
    }

    const rowNumber = index + 2;
    const actividad = actividades[index];

    const values = [[
      id,
      datos.titulo || actividad.titulo,
      datos.fecha_inicio || actividad.fecha_inicio,
      datos.hora_inicio || actividad.hora_inicio,
      datos.duracion_min || actividad.duracion_min,
      datos.participantes ? datos.participantes.join(', ') : actividad.participantes.join(', '),
      datos.descripcion || actividad.descripcion,
      datos.estado || actividad.estado,
      actividad.eventId,
      actividad.creado_por,
      actividad.fecha_creacion
    ]];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Actividades!A${rowNumber}:K${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    });

    return { success: true, id };
  }

  async actualizarEventId(actividadId, eventId) {
    const actividades = await this.listarActividades();
    const index = actividades.findIndex(act => act.id === actividadId);
    const rowNumber = index + 2;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Actividades!I${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[eventId]] }
    });
  }

  async registrarLog(log) {
    const values = [[
      new Date().toISOString(),
      log.id_actividad,
      log.email_destinatario,
      log.tipo_notificacion,
      log.estado_envio,
      log.error || ''
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Log_Notificaciones!A:F',
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    });
  }

  async obtenerPersonas() {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Personas!A2:E'
    });

    const rows = response.data.values || [];
    return rows.map(row => ({
      email: row[0],
      nombre: row[1],
      departamento: row[2],
      cargo: row[3],
      activo: row[4] === 'TRUE'
    }));
  }

  generarId() {
    return 'ACT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

module.exports = new SheetsService();