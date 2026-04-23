#!/usr/bin/env node
/*
 * Renombra ficheros PDF de la hoja "Gastos" de un libro Excel.
 *
 * Para cada fila procesa dos pares de columnas:
 *   H -> J  (renombra el PDF cuyo nombre coincide con H al nombre de J)
 *   I -> K  (renombra el PDF cuyo nombre coincide con I al nombre de K)
 *
 * - Los nombres en el Excel NO incluyen extensión: el script añade ".pdf".
 * - El .xlsx debe estar en la misma carpeta que los PDFs.
 * - Por defecto se ejecuta en modo dry-run (no toca disco). Pasa --apply
 *   para ejecutar los renombrados de verdad.
 * - Si el destino ya existe, añade sufijo "_1", "_2", ... hasta encontrar
 *   un nombre libre.
 *
 * Uso:
 *   node scripts/renombrar-pdfs-gastos.js <carpeta> [--xlsx <archivo>] [--hoja <nombre>] [--apply]
 *
 * Ejemplos:
 *   node scripts/renombrar-pdfs-gastos.js "C:\\Facturas\\2026"
 *   node scripts/renombrar-pdfs-gastos.js "C:\\Facturas\\2026" --xlsx libro.xlsx --apply
 */

const fs = require('fs');
const path = require('path');

const HOJA_DEFECTO = 'Gastos';
const COL_ORIGEN_1 = 7;  // H
const COL_ORIGEN_2 = 8;  // I
const COL_DESTINO_1 = 9;  // J
const COL_DESTINO_2 = 10; // K

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
    'Uso: node scripts/renombrar-pdfs-gastos.js <carpeta> [--xlsx <archivo>] [--hoja <nombre>] [--apply]\n' +
    '\nOpciones:\n' +
    '  --xlsx <archivo>   Nombre del .xlsx dentro de la carpeta (autodetecta si solo hay uno).\n' +
    '  --hoja <nombre>    Nombre de la hoja a procesar (por defecto: Gastos).\n' +
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

  const tareas = [];
  // Saltamos la fila 0 asumiendo que es la cabecera.
  for (let i = 1; i < filas.length; i++) {
    const fila = filas[i];
    const numeroFila = i + 1; // 1-based como en Excel
    const pares = [
      { origen: normalizarCelda(fila[COL_ORIGEN_1]), destino: normalizarCelda(fila[COL_DESTINO_1]), columnas: 'H→J' },
      { origen: normalizarCelda(fila[COL_ORIGEN_2]), destino: normalizarCelda(fila[COL_DESTINO_2]), columnas: 'I→K' },
    ];
    for (const par of pares) {
      if (!par.origen && !par.destino) continue;
      tareas.push({ fila: numeroFila, ...par });
    }
  }

  const resumen = { renombrados: 0, omitidos: 0, errores: 0, conSufijo: 0 };
  const destinosOcupados = new Set();

  for (const t of tareas) {
    const etiqueta = `Fila ${t.fila} [${t.columnas}]`;

    if (!t.origen || !t.destino) {
      console.log(`${etiqueta}: OMITIDO — falta ${!t.origen ? 'origen' : 'destino'} (origen="${t.origen}", destino="${t.destino}")`);
      resumen.omitidos++;
      continue;
    }

    const nombreOrigen = asegurarExtensionPdf(t.origen);
    const nombreDestinoBase = asegurarExtensionPdf(t.destino);
    const rutaOrigen = path.join(carpetaAbs, nombreOrigen);

    if (!fs.existsSync(rutaOrigen)) {
      console.log(`${etiqueta}: OMITIDO — no existe origen "${nombreOrigen}"`);
      resumen.omitidos++;
      continue;
    }

    if (nombreOrigen.toLowerCase() === nombreDestinoBase.toLowerCase()) {
      console.log(`${etiqueta}: OMITIDO — origen y destino coinciden ("${nombreOrigen}")`);
      resumen.omitidos++;
      continue;
    }

    const nombreDestinoFinal = resolverDestinoLibre(carpetaAbs, nombreDestinoBase, destinosOcupados);
    if (nombreDestinoFinal !== nombreDestinoBase) resumen.conSufijo++;

    const accion = apply ? 'RENOMBRADO' : 'DRY-RUN';
    console.log(`${etiqueta}: ${accion} "${nombreOrigen}" → "${nombreDestinoFinal}"`);

    if (apply) {
      try {
        fs.renameSync(rutaOrigen, path.join(carpetaAbs, nombreDestinoFinal));
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
  }

  console.log('');
  console.log('Resumen:');
  console.log(`  ${apply ? 'Renombrados' : 'Renombrados (simulados)'}: ${resumen.renombrados}`);
  console.log(`  Con sufijo por colisión   : ${resumen.conSufijo}`);
  console.log(`  Omitidos                  : ${resumen.omitidos}`);
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
