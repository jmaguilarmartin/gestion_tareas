const sheetsService = require('../../src/services/sheets-service');
const calendarService = require('../../src/services/calendar-service');
const gmailService = require('../../src/services/gmail-service');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    const { id, ...datos } = JSON.parse(event.body);

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'ID de actividad requerido' })
      };
    }

    const actividades = await sheetsService.listarActividades();
    const actividadActual = actividades.find(act => act.id === id);

    if (!actividadActual) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Actividad no encontrada' })
      };
    }

    await sheetsService.actualizarActividad(id, datos);

    if (actividadActual.eventId) {
      const actividadActualizada = { ...actividadActual, ...datos };
      await calendarService.actualizarEvento(actividadActual.eventId, actividadActualizada);
    }

    const personas = await sheetsService.obtenerPersonas();
    const participantes = datos.participantes || actividadActual.participantes;

    for (const email of participantes) {
      const persona = personas.find(p => p.email === email);
      if (persona && persona.activo) {
        try {
          await gmailService.enviarNotificacion('modificacion', { ...actividadActual, ...datos }, persona);
          await sheetsService.registrarLog({
            id_actividad: id,
            email_destinatario: email,
            tipo_notificacion: 'Modificación',
            estado_envio: 'Enviado'
          });
        } catch (error) {
          await sheetsService.registrarLog({
            id_actividad: id,
            email_destinatario: email,
            tipo_notificacion: 'Modificación',
            estado_envio: 'Error',
            error: error.message
          });
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Actividad actualizada exitosamente'
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error al actualizar actividad',
        details: error.message 
      })
    };
  }
};