const { gmail } = require('../config/google-config');
const { crearEmailNuevaActividad, crearEmailModificacion, crearEmailCancelacion } = require('../utils/email-templates');

class GmailService {
  
  async enviarNotificacion(tipo, actividad, destinatario) {
    console.log(`📧 Intentando enviar email a: ${destinatario.email}`);
    
    let htmlContent;
    let subject;

    switch(tipo) {
      case 'nueva':
        htmlContent = crearEmailNuevaActividad(actividad, destinatario);
        subject = `Nueva actividad: ${actividad.titulo}`;
        break;
      case 'modificacion':
        htmlContent = crearEmailModificacion(actividad, destinatario);
        subject = `Cambio en actividad: ${actividad.titulo}`;
        break;
      case 'cancelacion':
        htmlContent = crearEmailCancelacion(actividad, destinatario);
        subject = `Cancelada: ${actividad.titulo}`;
        break;
      default:
        throw new Error(`Tipo de notificación desconocido: ${tipo}`);
    }

    const mensaje = this.crearMensaje(destinatario.email, subject, htmlContent);
    
    try {
      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: mensaje
        }
      });
      
      console.log(`✅ Email enviado exitosamente a ${destinatario.email}`, result.data);
      return result.data;
      
    } catch (error) {
      console.error(`❌ Error enviando email a ${destinatario.email}:`, error.message);
      throw error;
    }
  }

  crearMensaje(to, subject, html) {
    // Codificar el asunto en Base64 para soportar caracteres especiales
    const subjectEncoded = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
    
    const email = [
      `To: ${to}`,
      `Subject: ${subjectEncoded}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(html).toString('base64')
    ].join('\r\n');

    // Codificar todo el mensaje en base64url
    return Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}

module.exports = new GmailService();