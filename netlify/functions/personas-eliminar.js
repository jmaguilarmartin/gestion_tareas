const { sheets } = require('../../src/config/google-config');

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    const { email } = JSON.parse(event.body);

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

    // Eliminar la fila
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: await getSheetIdByName('Personas'),
              dimension: 'ROWS',
              startIndex: rowNumber - 1,
              endIndex: rowNumber
            }
          }
        }]
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Persona eliminada exitosamente'
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error al eliminar persona',
        details: error.message 
      })
    };
  }
};

async function getSheetIdByName(sheetName) {
  const { sheets } = require('../../src/config/google-config');
  const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
  
  const response = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID
  });

  const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
  return sheet ? sheet.properties.sheetId : 0;
}