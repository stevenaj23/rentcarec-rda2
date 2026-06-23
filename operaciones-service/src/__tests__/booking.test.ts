/**
 * Tests de integración para los endpoints de Booking.
 * Cubren el contrato HTTP que el Booking Prototipo consume:
 *   POST   /reservas/booking
 *   GET    /reservas/booking/:id
 *   PATCH  /reservas/booking/:id
 *   POST   /alquileres/booking
 *   POST   /devoluciones/booking
 */

// ── Mocks (deben declararse antes de los imports que los usan) ───────────────

const mockInvClient = {
  getVehiculo:          jest.fn(),
  updateVehiculoStatus: jest.fn().mockResolvedValue({}),
  getExtra:             jest.fn(),
};

jest.mock('../grpc/inventario.grpc-client', () => ({
  getInventarioClient: () => mockInvClient,
}));

// Objetos tx reutilizables dentro de $transaction
const mockTxAlquiler   = { create: jest.fn(), update: jest.fn() };
const mockTxReserva    = { update: jest.fn() };
const mockTxDevolucion = { create: jest.fn() };

const mockPrisma = {
  reserva: {
    findFirst:  jest.fn(),
    findUnique: jest.fn(),
    update:     jest.fn(),
  },
  alquiler: {
    create: jest.fn(),
    update: jest.fn(),
  },
  devolucion: {
    create: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation(async (fn: any) =>
    fn({ alquiler: mockTxAlquiler, reserva: mockTxReserva, devolucion: mockTxDevolucion }),
  ),
};

jest.mock('../shared/database/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

// ── Imports (después de los mocks) ───────────────────────────────────────────

import request from 'supertest';
import express, { Application, Request, Response, NextFunction } from 'express';
import {
  createReservaBookingRouter,
  createAlquilerBookingRouter,
  createDevolucionBookingRouter,
} from '../modules/booking-integration/booking.routes';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0]!;
}

const VEHICULO_DISPONIBLE = {
  found:      true,
  id:         'v-1',
  status:     'DISPONIBLE',
  precio_dia: 50,
  agencia_id: 'ag-1',
  placa:      'ABC-123',
};

const RESERVA_BASE = {
  id:            'r-1',
  codigoReserva: 'RES-XXX',
  vehiculoId:    'v-1',
  usuarioId:     'u-1',
  agenciaId:     'ag-1',
  fechaInicio:   futureDate(1),
  fechaFin:      futureDate(3),
  diasTotal:     2,
  totalAmount:   100,
  status:        'CONFIRMADA',
};

const ALQUILER_ACTIVO = { id: 'al-1', reservaId: 'r-1', status: 'ACTIVO' };

// ── App mínima para tests ─────────────────────────────────────────────────────

const mockReservaRepo: any = {
  findById: jest.fn(),
  create:   jest.fn(),
  update:   jest.fn(),
};

const mockAlquilerRepo: any = {
  findById:        jest.fn(),
  findByReservaId: jest.fn(),
  findDevolucion:  jest.fn(),
};

function buildTestApp(): Application {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/stevenariel/reservas/booking',     createReservaBookingRouter(mockReservaRepo));
  app.use('/api/v1/stevenariel/alquileres/booking',   createAlquilerBookingRouter(mockAlquilerRepo));
  app.use('/api/v1/stevenariel/devoluciones/booking', createDevolucionBookingRouter(mockAlquilerRepo));
  // Error handler genérico para tests
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.statusCode ?? err.status ?? 500;
    res.status(status).json({
      success: false,
      error: { code: err.code ?? 'INTERNAL_ERROR', message: err.message },
    });
  });
  return app;
}

const app = buildTestApp();

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // clearMocks:true en jest.config limpia los .mock.calls entre tests;
  // restauramos las implementaciones por defecto que se necesitan en varios casos
  mockInvClient.updateVehiculoStatus.mockResolvedValue({});
  mockPrisma.$transaction.mockImplementation(async (fn: any) =>
    fn({ alquiler: mockTxAlquiler, reserva: mockTxReserva, devolucion: mockTxDevolucion }),
  );
});

// ════════════════════════════════════════════════════════════════════════════
// POST /reservas/booking — crear reserva
// ════════════════════════════════════════════════════════════════════════════

describe('POST /api/v1/stevenariel/reservas/booking', () => {
  const URL   = '/api/v1/stevenariel/reservas/booking';
  const INICIO = futureDate(1);
  const FIN    = futureDate(3);
  const BODY   = { vehiculoId: 'v-1', clienteId: 'u-1', fechaInicio: INICIO, fechaFin: FIN };

  it('201 — crea reserva cuando el vehículo está DISPONIBLE', async () => {
    mockInvClient.getVehiculo.mockResolvedValue(VEHICULO_DISPONIBLE);
    mockPrisma.reserva.findFirst.mockResolvedValue(null);
    mockReservaRepo.create.mockResolvedValue(RESERVA_BASE);

    const res = await request(app).post(URL).send(BODY);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vehiculoId).toBe('v-1');
    expect(mockInvClient.updateVehiculoStatus).toHaveBeenCalledWith('v-1', 'RESERVADO', 0);
  });

  it('400 — vehiculoId faltante', async () => {
    const res = await request(app).post(URL).send({ clienteId: 'u-1', fechaInicio: INICIO, fechaFin: FIN });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('400 — clienteId faltante', async () => {
    const res = await request(app).post(URL).send({ vehiculoId: 'v-1', fechaInicio: INICIO, fechaFin: FIN });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('400 — fechaInicio en el pasado', async () => {
    const res = await request(app).post(URL).send({ ...BODY, fechaInicio: '2020-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('400 — fechaFin no posterior a fechaInicio', async () => {
    const res = await request(app).post(URL).send({ ...BODY, fechaInicio: FIN, fechaFin: INICIO });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('404 — vehículo no encontrado en inventario', async () => {
    mockInvClient.getVehiculo.mockResolvedValue({ found: false });
    const res = await request(app).post(URL).send(BODY);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('422 — vehículo no DISPONIBLE (estado RESERVADO)', async () => {
    mockInvClient.getVehiculo.mockResolvedValue({ ...VEHICULO_DISPONIBLE, status: 'RESERVADO' });
    const res = await request(app).post(URL).send(BODY);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VEHICLE_NOT_AVAILABLE');
  });

  it('422 — vehículo en uso (estado EN_USO)', async () => {
    mockInvClient.getVehiculo.mockResolvedValue({ ...VEHICULO_DISPONIBLE, status: 'EN_USO' });
    const res = await request(app).post(URL).send(BODY);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VEHICLE_NOT_AVAILABLE');
  });

  it('409 — ya existe una reserva activa para el vehículo', async () => {
    mockInvClient.getVehiculo.mockResolvedValue(VEHICULO_DISPONIBLE);
    mockPrisma.reserva.findFirst.mockResolvedValue({ id: 'r-existing' });
    const res = await request(app).post(URL).send(BODY);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('no llama a updateVehiculoStatus si el vehículo no está disponible', async () => {
    mockInvClient.getVehiculo.mockResolvedValue({ ...VEHICULO_DISPONIBLE, status: 'EN_USO' });
    await request(app).post(URL).send(BODY);
    expect(mockInvClient.updateVehiculoStatus).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// GET /reservas/booking/:id — obtener reserva
// ════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/stevenariel/reservas/booking/:id', () => {
  it('200 — retorna la reserva existente', async () => {
    mockReservaRepo.findById.mockResolvedValue(RESERVA_BASE);
    const res = await request(app).get('/api/v1/stevenariel/reservas/booking/r-1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('r-1');
    expect(res.body.data.status).toBe('CONFIRMADA');
  });

  it('404 — reserva inexistente', async () => {
    mockReservaRepo.findById.mockResolvedValue(null);
    const res = await request(app).get('/api/v1/stevenariel/reservas/booking/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// PATCH /reservas/booking/:id — cambiar estado (máquina de estados)
// ════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/v1/stevenariel/reservas/booking/:id', () => {
  const URL = '/api/v1/stevenariel/reservas/booking/r-1';

  it('200 — transición válida PENDIENTE → CONFIRMADA', async () => {
    mockReservaRepo.findById.mockResolvedValue({ ...RESERVA_BASE, status: 'PENDIENTE' });
    mockReservaRepo.update.mockResolvedValue({ ...RESERVA_BASE, status: 'CONFIRMADA' });
    const res = await request(app).patch(URL).send({ status: 'CONFIRMADA' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONFIRMADA');
    expect(mockReservaRepo.update).toHaveBeenCalledWith('r-1', { status: 'CONFIRMADA' });
  });

  it('200 — transición válida CONFIRMADA → ACTIVA', async () => {
    mockReservaRepo.findById.mockResolvedValue({ ...RESERVA_BASE, status: 'CONFIRMADA', vehiculoId: 'v-1' });
    mockReservaRepo.update.mockResolvedValue({ ...RESERVA_BASE, status: 'ACTIVA' });
    const res = await request(app).patch(URL).send({ status: 'ACTIVA' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACTIVA');
  });

  it('200 — idempotente: ya está en el estado CANCELADA', async () => {
    mockReservaRepo.findById.mockResolvedValue({ ...RESERVA_BASE, status: 'CANCELADA' });
    const res = await request(app).patch(URL).send({ status: 'CANCELADA' });
    expect(res.status).toBe(200);
    expect(mockReservaRepo.update).not.toHaveBeenCalled();
  });

  it('sincroniza vehículo a DISPONIBLE al cancelar', async () => {
    mockReservaRepo.findById.mockResolvedValue({ ...RESERVA_BASE, status: 'CONFIRMADA', vehiculoId: 'v-1' });
    mockReservaRepo.update.mockResolvedValue({ ...RESERVA_BASE, status: 'CANCELADA' });
    await request(app).patch(URL).send({ status: 'CANCELADA' });
    expect(mockInvClient.updateVehiculoStatus).toHaveBeenCalledWith('v-1', 'DISPONIBLE', 0);
  });

  it('400 — status inválido (no pertenece a la máquina de estados)', async () => {
    const res = await request(app).patch(URL).send({ status: 'INVENTADO' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  it('404 — reserva inexistente', async () => {
    mockReservaRepo.findById.mockResolvedValue(null);
    const res = await request(app).patch(URL).send({ status: 'CANCELADA' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('422 — transición no permitida: COMPLETADA → CONFIRMADA', async () => {
    mockReservaRepo.findById.mockResolvedValue({ ...RESERVA_BASE, status: 'COMPLETADA' });
    const res = await request(app).patch(URL).send({ status: 'CONFIRMADA' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('422 — transición no permitida: CANCELADA → ACTIVA', async () => {
    mockReservaRepo.findById.mockResolvedValue({ ...RESERVA_BASE, status: 'CANCELADA' });
    const res = await request(app).patch(URL).send({ status: 'ACTIVA' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// POST /alquileres/booking — iniciar alquiler
// ════════════════════════════════════════════════════════════════════════════

describe('POST /api/v1/stevenariel/alquileres/booking', () => {
  const URL = '/api/v1/stevenariel/alquileres/booking';

  it('201 — crea alquiler desde reserva CONFIRMADA', async () => {
    mockPrisma.reserva.findUnique.mockResolvedValue({ ...RESERVA_BASE, vehiculoId: 'v-1' });
    mockAlquilerRepo.findByReservaId.mockResolvedValue(null);
    mockTxAlquiler.create.mockResolvedValue(ALQUILER_ACTIVO);
    mockTxReserva.update.mockResolvedValue({});
    mockAlquilerRepo.findById.mockResolvedValue(ALQUILER_ACTIVO);

    const res = await request(app).post(URL).send({ reservaId: 'r-1', kmSalida: 10000 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('al-1');
    expect(mockInvClient.updateVehiculoStatus).toHaveBeenCalledWith('v-1', 'EN_USO', 0);
  });

  it('400 — reservaId faltante', async () => {
    const res = await request(app).post(URL).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('404 — reserva no existe', async () => {
    mockPrisma.reserva.findUnique.mockResolvedValue(null);
    const res = await request(app).post(URL).send({ reservaId: 'no-existe' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('422 — reserva no está en estado CONFIRMADA', async () => {
    mockPrisma.reserva.findUnique.mockResolvedValue({ ...RESERVA_BASE, status: 'PENDIENTE' });
    const res = await request(app).post(URL).send({ reservaId: 'r-1' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  it('409 — ya existe un alquiler para esta reserva', async () => {
    mockPrisma.reserva.findUnique.mockResolvedValue(RESERVA_BASE);
    mockAlquilerRepo.findByReservaId.mockResolvedValue({ id: 'al-existing' });
    const res = await request(app).post(URL).send({ reservaId: 'r-1' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// POST /devoluciones/booking — registrar devolución
// ════════════════════════════════════════════════════════════════════════════

describe('POST /api/v1/stevenariel/devoluciones/booking', () => {
  const URL = '/api/v1/stevenariel/devoluciones/booking';

  it('201 — registra devolución de alquiler ACTIVO', async () => {
    mockAlquilerRepo.findById.mockResolvedValue(ALQUILER_ACTIVO);
    mockAlquilerRepo.findDevolucion.mockResolvedValue(null);
    mockPrisma.reserva.findUnique.mockResolvedValue({ ...RESERVA_BASE, vehiculoId: 'v-1' });
    mockTxDevolucion.create.mockResolvedValue({ id: 'dev-1', alquilerId: 'al-1' });
    mockTxAlquiler.update.mockResolvedValue({});
    mockTxReserva.update.mockResolvedValue({});

    const res = await request(app).post(URL).send({ alquilerId: 'al-1', kmEntrada: 12000 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(mockInvClient.updateVehiculoStatus).toHaveBeenCalledWith('v-1', 'DISPONIBLE', 12000);
  });

  it('400 — alquilerId faltante', async () => {
    const res = await request(app).post(URL).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('404 — alquiler no existe', async () => {
    mockAlquilerRepo.findById.mockResolvedValue(null);
    const res = await request(app).post(URL).send({ alquilerId: 'no-existe' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('422 — alquiler no está ACTIVO', async () => {
    mockAlquilerRepo.findById.mockResolvedValue({ ...ALQUILER_ACTIVO, status: 'FINALIZADO' });
    const res = await request(app).post(URL).send({ alquilerId: 'al-1' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  it('409 — devolución ya registrada para este alquiler', async () => {
    mockAlquilerRepo.findById.mockResolvedValue(ALQUILER_ACTIVO);
    mockAlquilerRepo.findDevolucion.mockResolvedValue({ id: 'dev-existing' });
    const res = await request(app).post(URL).send({ alquilerId: 'al-1' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('libera el vehículo sin kilometraje cuando kmEntrada es 0', async () => {
    mockAlquilerRepo.findById.mockResolvedValue(ALQUILER_ACTIVO);
    mockAlquilerRepo.findDevolucion.mockResolvedValue(null);
    mockPrisma.reserva.findUnique.mockResolvedValue({ ...RESERVA_BASE, vehiculoId: 'v-1' });
    mockTxDevolucion.create.mockResolvedValue({ id: 'dev-2', alquilerId: 'al-1' });
    mockTxAlquiler.update.mockResolvedValue({});
    mockTxReserva.update.mockResolvedValue({});

    await request(app).post(URL).send({ alquilerId: 'al-1' });

    expect(mockInvClient.updateVehiculoStatus).toHaveBeenCalledWith('v-1', 'DISPONIBLE', 0);
  });
});
