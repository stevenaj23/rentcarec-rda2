# RentCar EC — Booking API Contract

## Información general

| | |
|---|---|
| **Base URL** | `https://rentcar-gateway.ambitiousglacier-2be69817.canadacentral.azurecontainerapps.io/api/v1` |
| **Autenticación** | Ninguna (endpoints internos, sin JWT) |
| **Content-Type** | `application/json` |
| **Trazabilidad** | Enviar `X-Correlation-ID: <uuid>` para rastrear el flujo; si no se envía, el servidor genera uno |

---

## Formato de error estándar

Todos los errores siguen este esquema:

```json
{
  "success": false,
  "error": {
    "code": "CODIGO_ERROR",
    "message": "Descripción legible del error"
  }
}
```

---

## Flujo completo

```
1. POST /reservas/booking        → crea reserva (status: CONFIRMADA)
2. POST /alquileres/booking      → inicia alquiler (reserva pasa a ACTIVA)
3. POST /devoluciones/booking    → registra devolución (reserva pasa a COMPLETADA)
```

Para cancelar: `PATCH /reservas/booking/:id` con `{ "status": "CANCELADA" }`

---

## 1. Crear reserva

### `POST /reservas/booking`

**Request body:**
```json
{
  "vehiculoId":    "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "clienteId":     "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "fechaInicio":   "2026-07-01",
  "fechaFin":      "2026-07-05",
  "agenciaId":     "opcional — se toma del vehículo si se omite",
  "clienteNombre": "Juan Pérez (opcional)",
  "clienteEmail":  "juan@email.com (opcional)"
}
```

**Campos requeridos:** `vehiculoId`, `clienteId`, `fechaInicio`, `fechaFin`

**Response 201 — Éxito:**
```json
{
  "success": true,
  "data": {
    "id":            "a1b2c3d4-...",
    "codigoReserva": "RES-M8X3A-K9F",
    "vehiculoId":    "3fa85f64-...",
    "clienteId":     "7c9e6679-...",
    "agenciaId":     "5b4a3c2d-...",
    "fechaInicio":   "2026-07-01T00:00:00.000Z",
    "fechaFin":      "2026-07-05T00:00:00.000Z",
    "diasTotal":     4,
    "totalAmount":   240.00,
    "status":        "CONFIRMADA"
  }
}
```

**Errores posibles:**
| HTTP | code | Cuándo ocurre |
|------|------|---------------|
| 400 | `VALIDATION_ERROR` | Falta un campo requerido, fechas con formato inválido, fechaInicio en el pasado, o fechaFin ≤ fechaInicio |
| 404 | `NOT_FOUND` | El `vehiculoId` no existe |
| 409 | `CONFLICT` | El vehículo ya tiene una reserva activa |
| 422 | `VEHICLE_NOT_AVAILABLE` | El vehículo no está en status `DISPONIBLE` |
| 422 | `VEHICLE_PRICE_MISSING` | El vehículo no tiene precio por día configurado |

---

## 2. Consultar reserva

### `GET /reservas/booking/:id`

**Parámetro:** `id` — UUID de la reserva

**Response 200 — Éxito:**
```json
{
  "success": true,
  "data": {
    "id":            "a1b2c3d4-...",
    "codigoReserva": "RES-M8X3A-K9F",
    "vehiculoId":    "3fa85f64-...",
    "clienteId":     "7c9e6679-...",
    "agenciaId":     "5b4a3c2d-...",
    "fechaInicio":   "2026-07-01T00:00:00.000Z",
    "fechaFin":      "2026-07-05T00:00:00.000Z",
    "diasTotal":     4,
    "totalAmount":   240.00,
    "status":        "CONFIRMADA"
  }
}
```

**Errores posibles:**
| HTTP | code | Cuándo ocurre |
|------|------|---------------|
| 404 | `NOT_FOUND` | El `id` no existe |

---

## 3. Actualizar estado de reserva

### `PATCH /reservas/booking/:id`

**Request body:**
```json
{ "status": "CANCELADA" }
```

**Valores válidos para `status`:** `PENDIENTE`, `CONFIRMADA`, `ACTIVA`, `COMPLETADA`, `CANCELADA`

**Máquina de estados (transiciones permitidas):**
```
PENDIENTE  ──► CONFIRMADA
           ──► CANCELADA

CONFIRMADA ──► ACTIVA
           ──► CANCELADA

ACTIVA     ──► COMPLETADA
           ──► CANCELADA

COMPLETADA ──► (estado terminal, sin transiciones)
CANCELADA  ──► (estado terminal, sin transiciones)
```

> **Idempotencia:** Si la reserva ya está en el `status` que se solicita, devuelve 200 con el objeto actual sin generar error.

**Response 200 — Éxito:** mismo schema del `data` descrito en el GET.

**Errores posibles:**
| HTTP | code | Cuándo ocurre |
|------|------|---------------|
| 400 | `INVALID_STATUS` | El valor de `status` no es uno de los permitidos |
| 404 | `NOT_FOUND` | El `id` no existe |
| 422 | `INVALID_TRANSITION` | La transición solicitada no está permitida (ej: COMPLETADA → ACTIVA) |

---

## 4. Iniciar alquiler

### `POST /alquileres/booking`

**Precondición:** la reserva debe estar en status `CONFIRMADA`.

**Request body:**
```json
{
  "reservaId":     "a1b2c3d4-...",
  "kmSalida":      15000,
  "fechaInicio":   "2026-07-01T09:00:00.000Z",
  "observaciones": "Entrega en agencia norte (opcional)"
}
```

**Campos requeridos:** `reservaId`

**Efectos al crear:**
- La reserva pasa de `CONFIRMADA` → `ACTIVA`
- El vehículo pasa a status `EN_USO`

**Response 201 — Éxito:**
```json
{
  "success": true,
  "data": {
    "id":            "b2c3d4e5-...",
    "reservaId":     "a1b2c3d4-...",
    "kmSalida":      15000,
    "fechaInicio":   "2026-07-01T09:00:00.000Z",
    "status":        "ACTIVO",
    "observaciones": "Entrega en agencia norte"
  }
}
```

**Errores posibles:**
| HTTP | code | Cuándo ocurre |
|------|------|---------------|
| 400 | `VALIDATION_ERROR` | Falta `reservaId` |
| 404 | `NOT_FOUND` | La `reservaId` no existe |
| 409 | `CONFLICT` | Ya existe un alquiler para esta reserva |
| 422 | `INVALID_STATUS` | La reserva no está en status `CONFIRMADA` |

---

## 5. Registrar devolución

### `POST /devoluciones/booking`

**Precondición:** el alquiler debe estar en status `ACTIVO`.

**Request body:**
```json
{
  "alquilerId":    "b2c3d4e5-...",
  "kmEntrada":     15380,
  "estadoVehiculo":"BUENO",
  "cargoExtra":    0,
  "observaciones": "Sin novedades (opcional)"
}
```

**Campos requeridos:** `alquilerId`

**Efectos al crear:**
- El alquiler pasa a status `FINALIZADO`
- La reserva pasa a status `COMPLETADA`
- El vehículo vuelve a status `DISPONIBLE`

**Response 201 — Éxito:**
```json
{
  "success": true,
  "data": {
    "id":            "c3d4e5f6-...",
    "alquilerId":    "b2c3d4e5-...",
    "kmEntrada":     15380,
    "estadoVehiculo":"BUENO",
    "cargoExtra":    0,
    "observaciones": "Sin novedades"
  }
}
```

**Errores posibles:**
| HTTP | code | Cuándo ocurre |
|------|------|---------------|
| 400 | `VALIDATION_ERROR` | Falta `alquilerId` |
| 404 | `NOT_FOUND` | El `alquilerId` no existe |
| 409 | `CONFLICT` | Ya existe una devolución para este alquiler |
| 422 | `INVALID_STATUS` | El alquiler no está en status `ACTIVO` |

---

## Ejemplo de flujo completo (curl)

```bash
BASE="https://rentcar-gateway.ambitiousglacier-2be69817.canadacentral.azurecontainerapps.io/api/v1"

# 1. Crear reserva
curl -s -X POST "$BASE/reservas/booking" \
  -H "Content-Type: application/json" \
  -d '{
    "vehiculoId":  "<UUID_DEL_VEHICULO>",
    "clienteId":   "<UUID_DEL_CLIENTE>",
    "fechaInicio": "2026-07-01",
    "fechaFin":    "2026-07-05"
  }'
# → guarda el "id" de la reserva

# 2. Iniciar alquiler
curl -s -X POST "$BASE/alquileres/booking" \
  -H "Content-Type: application/json" \
  -d '{
    "reservaId": "<ID_RESERVA>",
    "kmSalida":  15000
  }'
# → guarda el "id" del alquiler

# 3. Registrar devolución
curl -s -X POST "$BASE/devoluciones/booking" \
  -H "Content-Type: application/json" \
  -d '{
    "alquilerId":    "<ID_ALQUILER>",
    "kmEntrada":     15380,
    "estadoVehiculo":"BUENO"
  }'

# Para cancelar una reserva
curl -s -X PATCH "$BASE/reservas/booking/<ID_RESERVA>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "CANCELADA" }'
```

---

## Endpoints de monitoreo (sin autenticación)

```bash
GET /health                # gateway nginx
GET /health/auth           # auth-service
GET /health/inventario     # inventario-service
GET /health/org            # org-service
GET /health/operaciones    # operaciones-service
GET /health/financiero     # financiero-service
GET /health/mantenimiento  # mantenimiento-service
GET /health/bus            # bus-service
```

Todos responden:
```json
{ "service": "nombre-service", "status": "ok", "timestamp": "2026-06-17T..." }
```
