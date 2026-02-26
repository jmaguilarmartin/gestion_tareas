const { sheets } = require('../../src/config/google-config');

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

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
    const persona = JSON.parse(event.body);

    if (!persona.email || !persona.nombre) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email y nombre son requeridos' })
      };
    }

    const values = [[
      persona.email,
      persona.nombre,
      persona.departamento || '',
      persona.cargo || '',
      persona.activo ? 'TRUE' : 'FALSE'
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Personas!A:E',
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    });

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Persona creada exitosamente'
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error al crear persona',
        details: error.message 
      })
    };
  }
};