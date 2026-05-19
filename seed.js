#!/usr/bin/env node
'use strict';

const jwt = require('./auth-service/node_modules/jsonwebtoken');
const https = require('https');

const DOMAIN = 'whiteisland-027d7f3d.canadacentral.azurecontainerapps.io';
const PREFIX = '/api/v1/stevenariel';
const URLS = {
  inv: `https://rentcar-inventario.${DOMAIN}${PREFIX}`,
  org: `https://rentcar-org.${DOMAIN}${PREFIX}`,
  ops: `https://rentcar-operaciones.${DOMAIN}${PREFIX}`,
};

const TOKEN = jwt.sign(
  { id: '00000000-0000-0000-0000-000000000001', email: 'seed@rentcar.ec', role: 'ADMIN' },
  'uRb4nC4r_S3cr3t_K3y_2026_xK9mQ2nL7vR4wZ1jF8cT3hY',
  { expiresIn: '2h' }
);

function post(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const opts = new URL(url);
    const req = https.request({
      hostname: opts.hostname,
      path: opts.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Length': Buffer.byteLength(payload, 'utf8'),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(payload, 'utf8');
    req.end();
  });
}

async function seed(base, endpoint, body, label) {
  const r = await post(`${base}/${endpoint}`, body);
  const id = r.body?.data?.id;
  if (r.status === 201 || r.status === 200) {
    console.log(`  ✓ ${label} [${id}]`);
    return id;
  } else if (r.status === 409) {
    console.log(`  ~ ${label} (ya existe)`);
    return null;
  } else {
    console.log(`  ✗ ${label} [HTTP ${r.status}]: ${JSON.stringify(r.body)}`);
    return null;
  }
}

async function main() {
  console.log('\n════════════════════════════════════════════');
  console.log('  RentCar EC — Seed de datos (Node.js)');
  console.log('════════════════════════════════════════════\n');

  // ── [1] Tipos combustible y transmisión ──────────────────────────────────
  console.log('▶ [1/5] Tipos de combustible y transmisión');
  await seed(URLS.inv, 'tipos-combustible', { nombre: 'Gasolina' },   'Gasolina');
  await seed(URLS.inv, 'tipos-combustible', { nombre: 'Diésel' },     'Diésel');
  await seed(URLS.inv, 'tipos-combustible', { nombre: 'Híbrido' },    'Híbrido');
  await seed(URLS.inv, 'tipos-combustible', { nombre: 'Eléctrico' },  'Eléctrico');

  await seed(URLS.inv, 'tipos-transmision', { nombre: 'Manual' },     'Manual');
  await seed(URLS.inv, 'tipos-transmision', { nombre: 'Automático' }, 'Automático');
  await seed(URLS.inv, 'tipos-transmision', { nombre: 'CVT' },        'CVT');

  // ── [2] Categorías ───────────────────────────────────────────────────────
  console.log('\n▶ [2/5] Categorías de vehículos');
  const catSedan    = await seed(URLS.inv, 'categorias', { nombre: 'Sedán',      descripcion: 'Vehículo familiar de 4 puertas' },     'Sedán');
  const catSuv      = await seed(URLS.inv, 'categorias', { nombre: 'SUV',        descripcion: 'Vehículo deportivo utilitario' },       'SUV');
  const catCamion   = await seed(URLS.inv, 'categorias', { nombre: 'Camioneta',  descripcion: 'Camioneta de carga y pasajeros' },      'Camioneta');
  await seed(URLS.inv, 'categorias', { nombre: 'Hatchback',  descripcion: 'Vehículo compacto versátil' },     'Hatchback');
  await seed(URLS.inv, 'categorias', { nombre: 'Van/Minivan', descripcion: 'Vehículo de 7 o más pasajeros' }, 'Van/Minivan');
  await seed(URLS.inv, 'categorias', { nombre: 'Lujo',        descripcion: 'Vehículo de alta gama' },         'Lujo');

  // ── [3] Marcas y modelos ─────────────────────────────────────────────────
  console.log('\n▶ [3/5] Marcas y modelos');
  const mToyota    = await seed(URLS.inv, 'marcas', { nombre: 'Toyota' },     'Toyota');
  const mChev      = await seed(URLS.inv, 'marcas', { nombre: 'Chevrolet' },  'Chevrolet');
  const mKia       = await seed(URLS.inv, 'marcas', { nombre: 'Kia' },        'Kia');
  const mNissan    = await seed(URLS.inv, 'marcas', { nombre: 'Nissan' },     'Nissan');
  const mHyundai   = await seed(URLS.inv, 'marcas', { nombre: 'Hyundai' },    'Hyundai');
  const mMazda     = await seed(URLS.inv, 'marcas', { nombre: 'Mazda' },      'Mazda');
  const mFord      = await seed(URLS.inv, 'marcas', { nombre: 'Ford' },       'Ford');
  const mRenault   = await seed(URLS.inv, 'marcas', { nombre: 'Renault' },    'Renault');

  console.log('  Marcas listas. Creando modelos...');
  const modelos = [
    [mToyota,  'Corolla'], [mToyota,  'Hilux'], [mToyota,  'RAV4'], [mToyota,  'Fortuner'],
    [mChev,    'Sail'],    [mChev,    'D-Max'], [mChev,    'Tracker'],
    [mKia,     'Rio'],     [mKia,     'Sportage'], [mKia,  'Sorento'],
    [mNissan,  'Frontier'], [mNissan, 'X-Trail'],
    [mHyundai, 'Tucson'],  [mHyundai, 'i10'],
    [mMazda,   'CX-5'],    [mMazda,   'Mazda3'],
    [mFord,    'Ranger'],  [mFord,    'EcoSport'],
    [mRenault, 'Duster'],  [mRenault, 'Stepway'],
  ];
  for (const [marcaId, nombre] of modelos) {
    if (marcaId) await seed(URLS.inv, 'modelos', { marcaId, nombre }, `${nombre}`);
  }

  // ── [4] Provincias y ciudades ────────────────────────────────────────────
  console.log('\n▶ [4/5] Provincias y ciudades de Ecuador');
  const pPic = await seed(URLS.org, 'provincias', { nombre: 'Pichincha',   codigo: 'P'  }, 'Pichincha');
  const pGua = await seed(URLS.org, 'provincias', { nombre: 'Guayas',      codigo: 'G'  }, 'Guayas');
  const pAzu = await seed(URLS.org, 'provincias', { nombre: 'Azuay',       codigo: 'A'  }, 'Azuay');
  const pMan = await seed(URLS.org, 'provincias', { nombre: 'Manabí',      codigo: 'M'  }, 'Manabí');
  const pTun = await seed(URLS.org, 'provincias', { nombre: 'Tungurahua',  codigo: 'T'  }, 'Tungurahua');
  const pLro = await seed(URLS.org, 'provincias', { nombre: 'El Oro',      codigo: 'O'  }, 'El Oro');
  const pImb = await seed(URLS.org, 'provincias', { nombre: 'Imbabura',    codigo: 'I'  }, 'Imbabura');
  const pChi = await seed(URLS.org, 'provincias', { nombre: 'Chimborazo', codigo: 'CH' }, 'Chimborazo');
  const pCan = await seed(URLS.org, 'provincias', { nombre: 'Cañar',       codigo: 'CA' }, 'Cañar');
  const pEsm = await seed(URLS.org, 'provincias', { nombre: 'Esmeraldas', codigo: 'E'  }, 'Esmeraldas');

  console.log('  Provincias listas. Creando ciudades...');
  const ciudades = [
    [pPic, 'Quito'], [pPic, 'Cayambe'], [pPic, 'Sangolquí'],
    [pGua, 'Guayaquil'], [pGua, 'Durán'], [pGua, 'Samborondón'],
    [pAzu, 'Cuenca'], [pAzu, 'Gualaceo'],
    [pMan, 'Portoviejo'], [pMan, 'Manta'],
    [pTun, 'Ambato'],
    [pLro, 'Machala'],
    [pImb, 'Ibarra'], [pImb, 'Otavalo'],
    [pChi, 'Riobamba'],
    [pCan, 'Azogues'],
    [pEsm, 'Esmeraldas'],
  ];
  for (const [provinciaId, nombre] of ciudades) {
    if (provinciaId) await seed(URLS.org, 'ciudades', { nombre, provinciaId }, nombre);
    else await seed(URLS.org, 'ciudades', { nombre }, nombre);
  }

  // ── [5] Seguros, canales de venta y tarifas ──────────────────────────────
  console.log('\n▶ [5/5] Seguros, canales de venta y tarifas');
  await seed(URLS.ops, 'seguros', { nombre: 'Básico',    descripcion: 'Cobertura básica contra choques',      precioDia: 5,  cobertura: 'Daños propios hasta $5,000' }, 'Seguro Básico');
  await seed(URLS.ops, 'seguros', { nombre: 'Completo',  descripcion: 'Cobertura total con robo incluido',    precioDia: 12, cobertura: 'Daños propios, robo total, responsabilidad civil' }, 'Seguro Completo');
  await seed(URLS.ops, 'seguros', { nombre: 'Premium',   descripcion: 'Cobertura sin franquicia',             precioDia: 20, cobertura: 'Sin franquicia, asistencia 24h, vehículo de reemplazo' }, 'Seguro Premium');

  await seed(URLS.ops, 'canales-venta', { nombre: 'Web',       codigo: 'WEB' }, 'Canal Web');
  await seed(URLS.ops, 'canales-venta', { nombre: 'Teléfono',  codigo: 'TEL' }, 'Canal Teléfono');
  await seed(URLS.ops, 'canales-venta', { nombre: 'Agencia',   codigo: 'AGE' }, 'Canal Agencia');
  await seed(URLS.ops, 'canales-venta', { nombre: 'App Móvil', codigo: 'APP' }, 'Canal App');

  // Tarifas necesitan IDs de categorías del inventario-service
  // Si el catSedan/catSuv/catCamion son null (ya existían), los obtenemos de la API
  let idSedan = catSedan, idSuv = catSuv, idCamion = catCamion;
  if (!idSedan || !idSuv || !idCamion) {
    const r = await new Promise((res) => {
      https.get(`${URLS.inv}/categorias`, (resp) => {
        let d = ''; resp.on('data', c => d += c);
        resp.on('end', () => res(JSON.parse(d)));
      });
    });
    for (const c of r.data || []) {
      if (c.nombre === 'Sedán')     idSedan  = c.id;
      if (c.nombre === 'SUV')       idSuv    = c.id;
      if (c.nombre === 'Camioneta') idCamion = c.id;
    }
    console.log(`  IDs obtenidos → Sedán:${idSedan} | SUV:${idSuv} | Camioneta:${idCamion}`);
  }

  const tarifas = [
    [idSedan,  'Sedán Estándar',    35, 1],
    [idSedan,  'Sedán Semanal',     28, 7],
    [idSuv,    'SUV Estándar',      55, 1],
    [idSuv,    'SUV Semanal',       45, 7],
    [idCamion, 'Camioneta Estándar',65, 1],
  ];
  for (const [categoriaId, nombre, precioDia, diasMinimos] of tarifas) {
    if (categoriaId) await seed(URLS.ops, 'tarifas', { categoriaId, nombre, precioDia, diasMinimos }, nombre);
  }

  console.log('\n════════════════════════════════════════════');
  console.log('  ✓ Seed completado');
  console.log('════════════════════════════════════════════\n');
}

main().catch(console.error);
