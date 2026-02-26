const { calendar } = require('../config/google-config');

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

class CalendarService {
  
  async crearEvento(actividad) {
    const fechaHora = `${actividad.fecha_inicio}T${actividad.hora_inicio}:00`;
    const fechaInicio = new Date(fechaHora);
    const fechaFin = actividad.fecha_fin && actividad.hora_fin
      ? new Date(`${actividad.fecha_fin}T${actividad.hora_fin}:00`)
      : new Date(fechaInicio.getTime() + (actividad.duracion_min || 60) * 60000);

    const evento = {
      summary: actividad.titulo,
      description: actividad.descripcion,
      start: {
        dateTime: fechaInicio.toISOString(),
        timeZone: 'Europe/Madrid'
      },
      end: {
        dateTime: fechaFin.toISOString(),
        timeZone: 'Europe/Madrid'
      },
      attendees: actividad.participantes.map(email => ({ 
        email,
        responseStatus: 'needsAction'
      })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 15 }
        ]
      },
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: true
    };

    console.log('📅 Creando evento en Google Calendar...');
    console.log('📧 Participantes:', actividad.participantes);

    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      resource: evento,
      sendUpdates: 'all'  // ← CAMBIADO: Envía invitaciones a todos
    });

    console.log(`✅ Evento creado: ${response.data.id}`);
    console.log('📧 Invitaciones de Google Calendar enviadas');

    return response.data.id;
  }

  async actualizarEvento(eventId, actividad) {
    const fechaHora = `${actividad.fecha_inicio}T${actividad.hora_inicio}:00`;
    const fechaInicio = new Date(fechaHora);
    const fechaFin = actividad.fecha_fin && actividad.hora_fin
      ? new Date(`${actividad.fecha_fin}T${actividad.hora_fin}:00`)
      : new Date(fechaInicio.getTime() + (actividad.duracion_min || 60) * 60000);

    const evento = {
      summary: actividad.titulo,
      description: actividad.descripcion,
      start: {
        dateTime: fechaInicio.toISOString(),
        timeZone: 'Europe/Madrid'
      },
      end: {
        dateTime: fechaFin.toISOString(),
        timeZone: 'Europe/Madrid'
      },
      attendees: actividad.participantes.map(email => ({ 
        email,
        responseStatus: 'needsAction'
      }))
    };

    console.log('📅 Actualizando evento en Google Calendar...');

    await calendar.events.update({
      calendarId: CALENDAR_ID,
      eventId: eventId,
      resource: evento,
      sendUpdates: 'all'  // ← CAMBIADO: Notifica cambios a todos
    });

    console.log('✅ Evento actualizado y notificaciones enviadas');
  }

  async eliminarEvento(eventId) {
    console.log('🗑️ Eliminando evento de Google Calendar...');
    
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: eventId,
      sendUpdates: 'all'  // ← CAMBIADO: Notifica cancelación a todos
    });

    console.log('✅ Evento eliminado y cancelaciones enviadas');
  }
}

module.exports = new CalendarService();