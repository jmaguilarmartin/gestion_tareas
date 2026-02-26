function crearEmailNuevaActividad(actividad, destinatario) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4285f4; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; margin: 20px 0; }
        .details { background: white; padding: 15px; margin: 10px 0; }
        .label { font-weight: bold; color: #666; }
        .footer { text-align: center; font-size: 12px; color: #999; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Nueva Actividad Programada</h2>
        </div>
        <div class="content">
          <p>Hola ${destinatario.nombre},</p>
          <p>Has sido invitado a la siguiente actividad:</p>
          
          <div class="details">
            <p><span class="label">Título:</span> ${actividad.titulo}</p>
            <p><span class="label">Fecha:</span> ${actividad.fecha_inicio}</p>
            <p><span class="label">Hora:</span> ${actividad.hora_inicio}</p>
            <p><span class="label">Duración:</span> ${actividad.duracion_min} minutos</p>
            <p><span class="label">Descripción:</span> ${actividad.descripcion}</p>
          </div>
          
          <p>Por favor, confirma tu asistencia y agenda esta actividad.</p>
        </div>
        <div class="footer">
          <p>Sistema de Gestión de Actividades - JMA Consultores</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function crearEmailModificacion(actividad, destinatario) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ff9800; color: white; padding: 20px; text-align: center; }
        .content { background: #fff3e0; padding: 20px; margin: 20px 0; }
        .details { background: white; padding: 15px; margin: 10px 0; }
        .label { font-weight: bold; color: #666; }
        .alert { background: #ff9800; color: white; padding: 10px; margin: 10px 0; text-align: center; }
        .footer { text-align: center; font-size: 12px; color: #999; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>⚠️ Actividad Modificada</h2>
        </div>
        <div class="content">
          <div class="alert">
            Se han realizado cambios en una actividad programada
          </div>
          <p>Hola ${destinatario.nombre},</p>
          <p>La siguiente actividad ha sido modificada:</p>
          
          <div class="details">
            <p><span class="label">Título:</span> ${actividad.titulo}</p>
            <p><span class="label">Nueva Fecha:</span> ${actividad.fecha_inicio}</p>
            <p><span class="label">Nueva Hora:</span> ${actividad.hora_inicio}</p>
            <p><span class="label">Duración:</span> ${actividad.duracion_min} minutos</p>
            <p><span class="label">Descripción:</span> ${actividad.descripcion}</p>
          </div>
          
          <p>Por favor, actualiza tu agenda con estos cambios.</p>
        </div>
        <div class="footer">
          <p>Sistema de Gestión de Actividades - JMA Consultores</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function crearEmailCancelacion(actividad, destinatario) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f44336; color: white; padding: 20px; text-align: center; }
        .content { background: #ffebee; padding: 20px; margin: 20px 0; }
        .details { background: white; padding: 15px; margin: 10px 0; text-decoration: line-through; opacity: 0.7; }
        .label { font-weight: bold; color: #666; }
        .alert { background: #f44336; color: white; padding: 10px; margin: 10px 0; text-align: center; font-weight: bold; }
        .footer { text-align: center; font-size: 12px; color: #999; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>❌ Actividad Cancelada</h2>
        </div>
        <div class="content">
          <div class="alert">
            Esta actividad ha sido CANCELADA
          </div>
          <p>Hola ${destinatario.nombre},</p>
          <p>La siguiente actividad ha sido cancelada:</p>
          
          <div class="details">
            <p><span class="label">Título:</span> ${actividad.titulo}</p>
            <p><span class="label">Fecha:</span> ${actividad.fecha_inicio}</p>
            <p><span class="label">Hora:</span> ${actividad.hora_inicio}</p>
          </div>
          
          <p>Por favor, elimina esta actividad de tu agenda.</p>
        </div>
        <div class="footer">
          <p>Sistema de Gestión de Actividades - JMA Consultores</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  crearEmailNuevaActividad,
  crearEmailModificacion,
  crearEmailCancelacion
};