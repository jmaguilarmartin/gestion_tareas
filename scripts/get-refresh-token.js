const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.send'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent'
});

console.log('\n==============================================');
console.log('OBTENER REFRESH TOKEN - GOOGLE OAUTH');
console.log('==============================================\n');
console.log('1. Abre esta URL en tu navegador:\n');
console.log(authUrl);
console.log('\n2. Autoriza la aplicacion');
console.log('3. Copia el codigo de la URL de redireccion\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Pega el codigo aqui: ', async (code) => {
  rl.close();
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('\n==============================================');
    console.log('EXITO');
    console.log('==============================================\n');
    console.log(tokens.refresh_token);
    console.log('\n==============================================');
    console.log('Agrega esta linea a tu archivo .env:');
    console.log('==============================================\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\n');
    
  } catch (error) {
    console.error('\nError obteniendo el token:', error.message);
  }
});
