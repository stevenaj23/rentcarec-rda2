#!/usr/bin/env node
'use strict';

const jwt = require('./auth-service/node_modules/jsonwebtoken');
const https = require('https');

const DOMAIN = 'whiteisland-027d7f3d.canadacentral.azurecontainerapps.io';
const PREFIX = '/api/v1/stevenariel';
const URLS = {
  inv: `https://rentcar-inventario.${DOMAIN}${PREFIX}`,
  org: `https://rentcar-org.${DOMAIN}${PREFIX}`,
};

const TOKEN = jwt.sign(
  { id: '00000000-0000-0000-0000-000000000001', email: 'seed@rentcar.ec', role: 'ADMIN' },
  'uRb4nC4r_S3cr3t_K3y_2026_xK9mQ2nL7vR4wZ1jF8cT3hY',
  { expiresIn: '2h' }
);

function request(method, url, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = new URL(url);
    const headers = {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json; charset=utf-8',
    };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload, 'utf8');
    const req = https.request({ hostname: opts.hostname, path: opts.pathname, method, headers }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload, 'utf8');
    req.end();
  });
}

async function getAll(url) {
  const r = await request('GET', url);
  return r.body?.data || [];
}

async function post(base, endpoint, body, label) {
  const r = await request('POST', `${base}/${endpoint}`, body);
  const id = r.body?.data?.id;
  if (r.status === 201 || r.status === 200) {
    console.log(`  ✓ ${label} [${id}]`);
    return id;
  } else if (r.status === 409) {
    console.log(`  ~ ${label} (ya existe)`);
    return null;
  } else {
    console.log(`  ✗ ${label} [${r.status}]: ${JSON.stringify(r.body).slice(0,120)}`);
    return null;
  }
}

async function main() {
  console.log('\n════════════════════════════════════════════');
  console.log('  RentCar EC — Seed complementario');
  console.log('════════════════════════════════════════════\n');

  // ── [1] Modelos faltantes ─────────────────────────────────────────────────
  console.log('▶ [1/2] Modelos faltantes por marca');

  const marcas = await getAll(`${URLS.inv}/marcas`);
  const byName = Object.fromEntries(marcas.map(m => [m.nombre, m.id]));

  const modelosFaltantes = [
    [byName['Toyota'],     'Fortuner'],
    [byName['Toyota'],     'Yaris'],
    [byName['Toyota'],     'Land Cruiser'],
    [byName['Chevrolet'],  'Sail'],
    [byName['Chevrolet'],  'D-Max'],
    [byName['Chevrolet'],  'Tracker'],
    [byName['Chevrolet'],  'Traverse'],
    [byName['Kia'],        'Sorento'],
    [byName['Kia'],        'Carnival'],
    [byName['Nissan'],     'X-Trail'],
    [byName['Nissan'],     'Kicks'],
    [byName['Hyundai'],    'i10'],
    [byName['Hyundai'],    'Santa Fe'],
    [byName['Mazda'],      'Mazda3'],
    [byName['Mazda'],      'Mazda6'],
    [byName['Ford'],       'EcoSport'],
    [byName['Ford'],       'Explorer'],
    [byName['Renault'],    'Logan'],
    [byName['Volkswagen'], 'Tiguan'],
    [byName['Volkswagen'], 'Polo'],
  ];

  for (const [marcaId, nombre] of modelosFaltantes) {
    if (marcaId) await post(URLS.inv, 'modelos', { marcaId, nombre }, `${nombre}`);
    else console.log(`  ✗ ${nombre} — marca no encontrada`);
  }

  // ── [2] Empresa y Agencias ────────────────────────────────────────────────
  console.log('\n▶ [2/2] Empresa y agencias');

  const empresaId = await post(URLS.org, 'empresas', {
    nombre:   'RentCar EC S.A.',
    ruc:      '1793245678001',
    email:    'info@rentcar.ec',
    telefono: '+593 2 234 5678',
  }, 'RentCar EC S.A.');

  // Si ya existe, buscarla por GET
  let eid = empresaId;
  if (!eid) {
    const empresas = await getAll(`${URLS.org}/empresas`);
    const rc = empresas.find(e => e.nombre?.includes('RentCar') || e.ruc === '1793245678001');
    if (rc) { eid = rc.id; console.log(`  ~ empresa existente: ${rc.id}`); }
  }

  if (!eid) { console.log('  ✗ No se pudo obtener empresa ID'); return; }

  // Ciudades para las agencias
  const ciudades = await getAll(`${URLS.org}/ciudades`);
  const ciudad = (nombre) => ciudades.find(c => c.nombre === nombre)?.id;

  const agencias = [
    { nombre: 'Agencia Quito Norte', direccion: 'Av. Amazonas N35-17 y Juan Pablo Sanz', ciudadId: ciudad('Quito') },
    { nombre: 'Agencia Quito Sur',   direccion: 'Av. Maldonado y Morán Valverde',        ciudadId: ciudad('Quito') },
    { nombre: 'Agencia Guayaquil',   direccion: 'Av. Francisco de Orellana y Justino Cornejo', ciudadId: ciudad('Guayaquil') },
    { nombre: 'Agencia Cuenca',      direccion: 'Av. de las Américas y Turuhuaico',      ciudadId: ciudad('Cuenca') },
    { nombre: 'Agencia Manta',       direccion: 'Av. 2 y calle 13',                      ciudadId: ciudad('Manta') },
    { nombre: 'Agencia Ambato',      direccion: 'Av. Cevallos y Lalama',                 ciudadId: ciudad('Ambato') },
  ];

  for (const ag of agencias) {
    const body = { empresaId: eid, nombre: ag.nombre, direccion: ag.direccion };
    if (ag.ciudadId) body.ciudadId = ag.ciudadId;
    await post(URLS.org, 'agencias', body, ag.nombre);
  }

  console.log('\n════════════════════════════════════════════');
  console.log('  ✓ Seed complementario completado');
  console.log('════════════════════════════════════════════\n');

  console.log('RESUMEN:');
  const mFinal = await getAll(`${URLS.inv}/modelos`);
  const aFinal = await getAll(`${URLS.org}/agencias`);
  console.log(`  Modelos totales:  ${mFinal.length}`);
  console.log(`  Agencias totales: ${aFinal.length}`);
}

main().catch(console.error);
