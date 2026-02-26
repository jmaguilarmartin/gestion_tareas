const { sheets } = require('../../src/config/google-config');

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

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
    const { email, ...datos } = JSON.parse(event.body);

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email es requerido' })
      };
    }

    // Obtener todas las personas
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Personas!A2:E'
    });

    const rows = response.data.values || [];
    const index = rows.findIndex(row => row[0] === email);

    if (index === -1) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Persona no encontrada' })
      };
    }

    const rowNumber = index + 2;
    const personaActual = rows[index];

    const values = [[
      email,
      datos.nombre || personaActual[1],
      datos.departamento !== undefined ? datos.departamento : personaActual[2],
      datos.cargo !== undefined ? datos.cargo : personaActual[3],
      datos.activo !== undefined ? (datos.activo ? 'TRUE' : 'FALSE') : personaActual[4]
    ]];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Personas!A${rowNumber}:E${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Persona actualizada exitosamente'
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error al actualizar persona',
        details: error.message 
      })
    };
  }
};