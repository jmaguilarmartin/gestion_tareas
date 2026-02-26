const sheetsService = require('../../src/services/sheets-service');
const calendarService = require('../../src/services/calendar-service');
const gmailService = require('../../src/services/gmail-service');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    const actividad = JSON.parse(event.body);

    if (!actividad.titulo || !actividad.fecha_inicio || !actividad.participantes) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Faltan campos requeridos' })
      };
    }

    const resultado = await sheetsService.crearActividad(actividad);
    const eventId = await calendarService.crearEvento(actividad);
    await sheetsService.actualizarEventId(resultado.id, eventId);

    const personas = await sheetsService.obtenerPersonas();

    for (const email of actividad.participantes) {
      const persona = personas.find(p => p.email === email);
      if (persona && persona.activo) {
        try {
          await gmailService.enviarNotificacion('nueva', actividad, persona);
          await sheetsService.registrarLog({
            id_actividad: resultado.id,
            email_destinatario: email,
            tipo_notificacion: 'Nueva actividad',
            estado_envio: 'Enviado'
          });
        } catch (error) {
          await sheetsService.registrarLog({
            id_actividad: resultado.id,
            email_destinatario: email,
            tipo_notificacion: 'Nueva actividad',
            estado_envio: 'Error',
            error: error.message
          });
        }
      }
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        id: resultado.id,
        eventId: eventId,
        message: 'Actividad creada exitosamente'
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error al crear actividad',
        details: error.message 
      })
    };
  }
};