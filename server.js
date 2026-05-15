const path = require('path');
const fs = require('fs');
const express = require('express');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const FUNCTIONS_DIR = path.join(__dirname, 'netlify', 'functions');

function loadHandler(name) {
  const file = path.join(FUNCTIONS_DIR, `${name}.js`);
  if (!fs.existsSync(file)) return null;
  const mod = require(file);
  return mod.handler;
}

function buildEvent(req) {
  let body = req.body;
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
    body = JSON.stringify(body);
  } else if (body == null) {
    body = '';
  } else if (Buffer.isBuffer(body)) {
    body = body.toString('utf8');
  }

  return {
    httpMethod: req.method,
    path: req.path,
    headers: req.headers,
    queryStringParameters: req.query || {},
    body,
    isBase64Encoded: false,
  };
}

async function invokeFunction(name, req, res) {
  const handler = loadHandler(name);
  if (!handler) {
    return res.status(404).json({ success: false, error: `Function not found: ${name}` });
  }

  try {
    const event = buildEvent(req);
    const result = await handler(event, {});
    const statusCode = result.statusCode || 200;
    const headers = result.headers || {};
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(statusCode).send(result.body || '');
  } catch (err) {
    console.error(`Error invoking function ${name}:`, err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

app.all('/.netlify/functions/:name', (req, res) => invokeFunction(req.params.name, req, res));
app.all('/api/:name', (req, res) => invokeFunction(req.params.name, req, res));

app.get('/', (req, res) => res.redirect('/login.html'));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`gestion_tareas server listening on port ${PORT}`);
});
