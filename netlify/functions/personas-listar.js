exports.handler = async (event) => {
  console.log('=================================');
  console.log('🔧 personas-listar.js INICIANDO');
  console.log('=================================');
  console.log('📊 Método HTTP:', event.httpMethod);
  console.log('📍 Path:', event.path);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    console.log('✅ Respondiendo a OPTIONS');
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    console.log('❌ Método no permitido:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Método no permitido' 
      })
    };
  }

  try {
    console.log('📦 Intentando cargar sheetsService...');
    const sheetsService = require('../../src/services/sheets-service');
    console.log('✅ sheetsService cargado correctamente');
    
    console.log('📋 Llamando a sheetsService.obtenerPersonas()...');
    const personas = await sheetsService.obtenerPersonas();
    console.log(`✅ Personas obtenidas: ${personas.length}`);
    
    console.log('📤 Enviando respuesta exitosa');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: personas,
        count: personas.length
      })
    };

  } catch (error) {
    console.error('=================================');
    console.error('❌ ERROR EN PERSONAS-LISTAR');
    console.error('=================================');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Stack trace:', error.stack);
    console.error('=================================');
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Error al obtener personas',
        details: error.message,
        errorName: error.name,
        errorCode: error.code
      })
    };
  }
};