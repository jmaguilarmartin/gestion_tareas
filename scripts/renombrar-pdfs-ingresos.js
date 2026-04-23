#!/usr/bin/env node
/*
 * Renombra ficheros PDF de la hoja "Ingresos" de un libro Excel.
 *
 * Para cada fila:
 *   - Columna G contiene un número. El PDF a renombrar es aquel cuyo nombre
 *     (sin extensión) termina con ese número (comparación numérica, así
 *     "factura_5.pdf" y "005.pdf" coinciden con G=5, pero "factura_15.pdf" no).
 *   - Columna H contiene el nuevo nombre. El script añade ".pdf" si no lo
 *     incluye.
 *
 * - El .xlsx debe estar en la misma carpeta que los PDFs.
 * - Por defecto se ejecuta en modo dry-run (no toca disco). Pasa --apply
 *   para ejecutar los renombrados de verdad.
 * - Si el destino ya existe, añade sufijo "_1", "_2", ... hasta encontrar
 *   un nombre libre.
 * - Si para un mismo G hay más de un PDF candidato, omite la fila con aviso.
 *
 * Uso:
 *   node scripts/renombrar-pdfs-ingresos.js <carpeta> [--xlsx <archivo>] [--hoja <nombre>] [--apply]
 *
 * Ejemplos:
 *   node scripts/renombrar-pdfs-ingresos.js "C:\\Facturas\\2026"
 *   node scripts/renombrar-pdfs-ingresos.js "C:\\Facturas\\2026" --xlsx libro.xlsx --apply
 */

const fs = require('fs');
const path = require('path');

const HOJA_DEFECTO = 'Ingresos';
const COL_NUMERO = 6;  // G
const COL_DESTINO = 7; // H

function parseArgs(argv) {
  const args = { carpeta: null, xlsx: null, hoja: HOJA_DEFECTO, apply: false };
  const positionals = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--xlsx') args.xlsx = argv[++i];
    else if (a === '--hoja') args.hoja = argv[++i];
    else if (a === '--help' || a === '-h') { args.help = true; }
    else positionals.push(a);
  }
  args.carpeta = positionals[0];
  return args;
}

function imprimirAyuda() {
  console.log(
    'Uso: node scripts/renombrar-pdfs-ingresos.js <carpeta> [--xlsx <archivo>] [--hoja <nombre>] [--apply]\n' +
    '\nOpciones:\n' +
    '  --xlsx <archivo>   Nombre del .xlsx dentro de la carpeta (autodetecta si solo hay uno).\n' +
    '  --hoja <nombre>    Nombre de la hoja a procesar (por defecto: Ingresos).\n' +
    '  --apply            Ejecuta los renombrados. Sin esta opción es dry-run.\n'
  );
}

function localizarXlsx(carpeta, nombreXlsx) {
  if (nombreXlsx) {
    const ruta = path.join(carpeta, nombreXlsx);
    if (!fs.existsSync(ruta)) throw new Error(`No existe el .xlsx indicado: ${ruta}`);
    return ruta;
  }
  const candidatos = fs.readdirSync(carpeta).filter((f) => f.toLowerCase().endsWith('.xlsx') && !f.startsWith('~$'));
  if (candidatos.length === 0) throw new Error(`No se encontró ningún .xlsx en ${carpeta}. Usa --xlsx <archivo>.`);
  if (candidatos.length > 1) {
    throw new Error(
      `Hay varios .xlsx en ${carpeta}: ${candidatos.join(', ')}. Especifica cuál usar con --xlsx <archivo>.`
    );
  }
  return path.join(carpeta, candidatos[0]);
}

function normalizarCelda(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).trim();
}

function asegurarExtensionPdf(nombre) {
  if (!nombre) return nombre;
  return nombre.toLowerCase().endsWith('.pdf') ? nombre : `${nombre}.pdf`;
}

function parsearNumero(valor) {
  const s = normalizarCelda(valor);
  if (!s) return null;
  // Acepta enteros. Quitamos separadores de miles típicos; rechazamos decimales.
  const limpio = s.replace(/[\s.]/g, '').replace(/,/g, '');
  if (!/^-?\d+$/.test(limpio)) return null;
  return parseInt(limpio, 10);
}

function extraerNumeroFinal(nombreBase) {
  const m = nombreBase.match(/(\d+)$/);
  if (!m) return null;
  return parseInt(m[1], 10);
}

function indexarPdfsPorNumero(carpeta) {
  const ficheros = fs.readdirSync(carpeta).filter((f) => f.toLowerCase().endsWith('.pdf'));
  const indice = new Map(); // numero -> [nombres...]
  for (const f of ficheros) {
    const base = path.basename(f, path.extname(f));
    const num = extraerNumeroFinal(base);
    if (num === null) continue;
    if (!indice.has(num)) indice.set(num, []);
    indice.get(num).push(f);
  }
  return indice;
}

function resolverDestinoLibre(carpeta, nombreDestino, ocupadosEnEstaSesion) {
  const ext = path.extname(nombreDestino);
  const base = path.basename(nombreDestino, ext);
  let candidato = nombreDestino;
  let n = 0;
  while (
    fs.existsSync(path.join(carpeta, candidato)) ||
    ocupadosEnEstaSesion.has(candidato.toLowerCase())
  ) {
    n += 1;
    candidato = `${base}_${n}${ext}`;
  }
  return candidato;
}

function leerFilas(rutaXlsx, nombreHoja) {
  let XLSX;
  try {
    XLSX = require('xlsx');
  } catch (err) {
    throw new Error('Falta la dependencia "xlsx". Ejecuta: npm install');
  }
  const wb = XLSX.readFile(rutaXlsx);
  const hoja = wb.Sheets[nombreHoja];
  if (!hoja) {
    throw new Error(
      `No se encontró la hoja "${nombreHoja}" en ${rutaXlsx}. Hojas disponibles: ${wb.SheetNames.join(', ')}`
    );
  }
  return XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '', blankrows: false, raw: true });
}

function procesar({ carpeta, xlsx, hoja, apply }) {
  const carpetaAbs = path.resolve(carpeta);
  if (!fs.existsSync(carpetaAbs) || !fs.statSync(carpetaAbs).isDirectory()) {
    throw new Error(`La carpeta no existe o no es un directorio: ${carpetaAbs}`);
  }

  const rutaXlsx = localizarXlsx(carpetaAbs, xlsx);
  console.log(`Carpeta : ${carpetaAbs}`);
  console.log(`Excel   : ${path.basename(rutaXlsx)}`);
  console.log(`Hoja    : ${hoja}`);
  console.log(`Modo    : ${apply ? 'APPLY (renombrando)' : 'DRY-RUN (sin cambios)'}`);
  console.log('');

  const filas = leerFilas(rutaXlsx, hoja);
  const indicePdfs = indexarPdfsPorNumero(carpetaAbs);

  const resumen = { renombrados: 0, omitidos: 0, errores: 0, conSufijo: 0, ambiguos: 0 };
  const destinosOcupados = new Set();
  // Ficheros ya consumidos en esta sesión (para no reutilizarlos si otra fila tuviera el mismo G).
  const ficherosConsumidos = new Set();

  for (let i = 1; i < filas.length; i++) {
    const fila = filas[i];
    const numeroFila = i + 1; // 1-based como en Excel
    const etiqueta = `Fila ${numeroFila} [G→H]`;
    const numero = parsearNumero(fila[COL_NUMERO]);
    const destino = normalizarCelda(fila[COL_DESTINO]);

    if (numero === null && !destino) continue; // fila vacía

    if (numero === null) {
      console.log(`${etiqueta}: OMITIDO — G no es un número válido ("${normalizarCelda(fila[COL_NUMERO])}")`);
      resumen.omitidos++;
      continue;
    }
    if (!destino) {
      console.log(`${etiqueta}: OMITIDO — falta destino en H (G=${numero})`);
      resumen.omitidos++;
      continue;
    }

    const candidatos = (indicePdfs.get(numero) || []).filter((n) => !ficherosConsumidos.has(n.toLowerCase()));
    if (candidatos.length === 0) {
      console.log(`${etiqueta}: OMITIDO — ningún PDF termina en ${numero}`);
      resumen.omitidos++;
      continue;
    }
    if (candidatos.length > 1) {
      console.log(`${etiqueta}: OMITIDO — ambiguo, varios PDFs terminan en ${numero}: ${candidatos.join(', ')}`);
      resumen.ambiguos++;
      resumen.omitidos++;
      continue;
    }

    const nombreOrigen = candidatos[0];
    const nombreDestinoBase = asegurarExtensionPdf(destino);

    if (nombreOrigen.toLowerCase() === nombreDestinoBase.toLowerCase()) {
      console.log(`${etiqueta}: OMITIDO — origen y destino coinciden ("${nombreOrigen}")`);
      resumen.omitidos++;
      continue;
    }

    const nombreDestinoFinal = resolverDestinoLibre(carpetaAbs, nombreDestinoBase, destinosOcupados);
    if (nombreDestinoFinal !== nombreDestinoBase) resumen.conSufijo++;

    const accion = apply ? 'RENOMBRADO' : 'DRY-RUN';
    console.log(`${etiqueta}: ${accion} "${nombreOrigen}" → "${nombreDestinoFinal}"  (G=${numero})`);

    if (apply) {
      try {
        fs.renameSync(path.join(carpetaAbs, nombreOrigen), path.join(carpetaAbs, nombreDestinoFinal));
        resumen.renombrados++;
      } catch (err) {
        console.error(`${etiqueta}: ERROR al renombrar — ${err.message}`);
        resumen.errores++;
        continue;
      }
    } else {
      resumen.renombrados++;
    }
    destinosOcupados.add(nombreDestinoFinal.toLowerCase());
    ficherosConsumidos.add(nombreOrigen.toLowerCase());
  }

  console.log('');
  console.log('Resumen:');
  console.log(`  ${apply ? 'Renombrados' : 'Renombrados (simulados)'}: ${resumen.renombrados}`);
  console.log(`  Con sufijo por colisión   : ${resumen.conSufijo}`);
  console.log(`  Ambiguos (varios candidatos): ${resumen.ambiguos}`);
  console.log(`  Omitidos (total)          : ${resumen.omitidos}`);
  console.log(`  Errores                   : ${resumen.errores}`);
  if (!apply) {
    console.log('');
    console.log('Nota: ningún fichero ha sido modificado. Vuelve a ejecutar añadiendo --apply para aplicar los cambios.');
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.carpeta) {
    imprimirAyuda();
    process.exit(args.help ? 0 : 1);
  }
  try {
    procesar(args);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
