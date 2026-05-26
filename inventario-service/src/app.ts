import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { createVehiculoRouter }        from './modules/vehiculos/vehiculo.routes.js';
import { createMarcaRouter }           from './modules/marcas/marca.routes.js';
import { createModeloRouter }          from './modules/modelos/modelo.routes.js';
import { createCategoriaRouter }       from './modules/categorias/categoria.routes.js';
import { createTipoCombustibleRouter } from './modules/tipos-combustible/tipo-combustible.routes.js';
import { createTipoTransmisionRouter } from './modules/tipos-transmision/tipo-transmision.routes.js';
import { createExtraRouter }           from './modules/extras/extra.routes.js';
import {
  vehiculoRepository,
  vehiculoController,
  marcaController,
  modeloController,
  categoriaController,
  tipoCombustibleController,
  tipoTransmisionController,
  extraController,
} from './shared/container.js';
import { createVehiculoBookingRouter } from './modules/booking-integration/vehiculo-booking.routes.js';
import { errorHandler } from './shared/errors/error.middleware.js';
import { swaggerSpec } from './shared/swagger.js';
import pinoHttp from 'pino-http';
import { logger } from './shared/logger.js';

const app = express();

app.set('trust proxy', 1);
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json());
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

app.get('/health', (_req, res) => {
  res.json({ service: 'inventario-service', status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/api/v1/stevenariel/estados-vehiculo', (_req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'DISPONIBLE',    nombre: 'Disponible' },
      { id: 'EN_USO',        nombre: 'En uso' },
      { id: 'MANTENIMIENTO', nombre: 'Mantenimiento' },
      { id: 'RESERVADO',     nombre: 'Reservado' },
      { id: 'INACTIVO',      nombre: 'Inactivo' },
    ],
  });
});

app.use('/api/v1/stevenariel/vehiculos/booking', createVehiculoBookingRouter(vehiculoRepository));
app.use('/api/v1/stevenariel/vehiculos',         createVehiculoRouter(vehiculoController));
app.use('/api/v1/stevenariel/marcas',            createMarcaRouter(marcaController));
app.use('/api/v1/stevenariel/modelos',           createModeloRouter(modeloController));
app.use('/api/v1/stevenariel/categorias',        createCategoriaRouter(categoriaController));
app.use('/api/v1/stevenariel/tipos-combustible', createTipoCombustibleRouter(tipoCombustibleController));
app.use('/api/v1/stevenariel/tipos-transmision', createTipoTransmisionRouter(tipoTransmisionController));
app.use('/api/v1/stevenariel/extras',            createExtraRouter(extraController));

app.use(errorHandler);

export default app;
