# RentCar EC — API Reference para Integración Booking

## Base URL

```
https://rentcar-ec-frontend.whiteisland-027d7f3d.canadacentral.azurecontainerapps.io/api/v1/stevenariel
```

Todas las rutas listadas en este documento se anteponen con esa base.

---

## Autenticación

El sistema usa **JWT (HS256)**. Para los endpoints de integración `/booking` **no se requiere token** — son rutas server-to-server. Para los endpoints estándar sí se requiere.

### Obtener token (si se necesita)

**Registro de usuario nuevo**
```http
POST /auth/register
Content-Type: application/json

{
  "email":     "usuario@ejemplo.com",
  "password":  "MinPass2026!",
  "nombres":   "Juan",
  "apellidos": "Pérez"
}
```

**Login**
```http
POST /auth/login
Content-Type: application/json

{
  "email":    "usuario@ejemplo.com",
  "password": "MinPass2026!"
}
```
Respuesta:
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "...", "role": "CLIENTE" },
    "token": "eyJ..."
  }
}
```

**Uso del token en requests:**
```http
Authorization: Bearer <token>
```

**Generar token directamente** (integración server-to-server):
- Algoritmo: `HS256`
- Secret: `uRb4nC4r_S3cr3t_K3y_2026_xK9mQ2nL7vR4wZ1jF8cT3hY`
- Payload: `{ "id": "<uuid-usuario>", "email": "...", "role": "ADMIN" }`

---

## Respuesta estándar

Todos los endpoints responden con el mismo envelope:

```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

Códigos de error comunes: `NOT_FOUND`, `VALIDATION_ERROR`, `VEHICLE_NOT_AVAILABLE`, `CONFLICT`, `INVALID_STATUS`, `INVALID_TRANSITION`, `FORBIDDEN`.

---

## Catálogo de Vehículos (Público — sin auth)

### Listar vehículos disponibles
```http
GET /vehiculos/booking
```
Query params opcionales: `?agenciaId=uuid&categoriaId=uuid&status=DISPONIBLE&page=1&limit=20`

Respuesta `data`:
```json
{
  "data": [
    {
      "id":           "uuid",
      "nombre":       "Toyota RAV4 2023",
      "descripcion":  "SUV ideal para viajes familiares",
      "precioPorDia": 75.00,
      "moneda":       "USD",
      "categoria":    "SUV",
      "agenciaId":    "uuid",
      "disponible":   true,
      "status":       "DISPONIBLE",
      "imagenUrl":    "https://..."
    }
  ],
  "total": 10, "page": 1, "limit": 20, "totalPages": 1
}
```

### Detalle de vehículo
```http
GET /vehiculos/booking/:vehiculoId
```

### Verificar disponibilidad
```http
GET /vehiculos/booking/:vehiculoId/disponibilidad
```
Respuesta `data`:
```json
{
  "vehiculoId": "uuid",
  "disponible": true,
  "status":     "DISPONIBLE",
  "mensaje":    "El vehículo está disponible para alquiler"
}
```

---

## Reservas (Integración — sin auth)

### Crear reserva
```http
POST /reservas/booking
Content-Type: application/json

{
  "vehiculoId":  "uuid",
  "clienteId":   "uuid",
  "agenciaId":   "uuid",        // opcional — se toma del vehículo si se omite
  "fechaInicio": "2026-06-01",  // YYYY-MM-DD o ISO 8601
  "fechaFin":    "2026-06-04"
}
```
Respuesta `data`:
```json
{
  "id":            "uuid",
  "codigoReserva": "RES-XXXXXXXX-XXX",
  "vehiculoId":    "uuid",
  "clienteId":     "uuid",
  "agenciaId":     "uuid",
  "fechaInicio":   "2026-06-01T00:00:00.000Z",
  "fechaFin":      "2026-06-04T00:00:00.000Z",
  "diasTotal":     3,
  "totalAmount":   225.00,
  "status":        "PENDIENTE"
}
```

Errores posibles:
| HTTP | code | Motivo |
|------|------|--------|
| 400 | `VALIDATION_ERROR` | Campos faltantes o fechas inválidas |
| 404 | `NOT_FOUND` | vehiculoId no existe |
| 409 | `CONFLICT` | El vehículo ya tiene una reserva activa |
| 422 | `VEHICLE_NOT_AVAILABLE` | El vehículo no está en estado DISPONIBLE |
| 422 | `VEHICLE_PRICE_MISSING` | El vehículo no tiene precio configurado |

### Obtener reserva
```http
GET /reservas/booking/:reservaId
```

### Actualizar estado de reserva
```http
PATCH /reservas/booking/:reservaId
Content-Type: application/json

{ "status": "CONFIRMADA" }
```
Transiciones válidas:
```
PENDIENTE  → CONFIRMADA | CANCELADA
CONFIRMADA → ACTIVA     | CANCELADA
ACTIVA     → COMPLETADA | CANCELADA
COMPLETADA → (terminal)
CANCELADA  → (terminal)
```

---

## Alquileres — Inicio de entrega (sin auth)

```http
POST /alquileres/booking
Content-Type: application/json

{
  "reservaId":     "uuid",
  "kmSalida":      18000,
  "fechaInicio":   "2026-06-01T08:00:00Z",   // opcional, default: now
  "observaciones": "Entrega en agencia Quito Norte"
}
```
Prerequisito: la reserva debe estar en estado `CONFIRMADA`.

---

## Devoluciones (sin auth)

```http
POST /devoluciones/booking
Content-Type: application/json

{
  "alquilerId":     "uuid",
  "kmEntrada":      18350,
  "estadoVehiculo": "Buen estado, sin daños",
  "cargoExtra":     0,
  "observaciones":  "Devolución sin inconvenientes"
}
```
Al registrar la devolución:
- El alquiler pasa a `FINALIZADO`
- La reserva pasa a `COMPLETADA`
- El vehículo vuelve a `DISPONIBLE`

---

## Pagos

### Consultar estado de pagos de una reserva (sin auth)
```http
GET /payment/booking/:reservaId
```
Respuesta `data`:
```json
{
  "reservaId":   "uuid",
  "pagos":       [ { "id": "uuid", "monto": "225.00", "status": "COMPLETADO", ... } ],
  "totalPagado": 225.00,
  "status":      "COMPLETADO"    // SIN_PAGOS | PENDIENTE | COMPLETADO | PARCIAL
}
```

### Registrar pago (requiere token JWT)
```http
POST /pagos
Authorization: Bearer <token>
Content-Type: application/json

{
  "reservaId":  "uuid",
  "monto":      225.00,
  "metodoPago": "TARJETA",       // EFECTIVO | TARJETA_CREDITO | TARJETA_DEBITO | TRANSFERENCIA | PAYPAL
  "referencia": "TXN-123456"     // opcional
}
```

---

## Catálogos de Apoyo (sin auth)

```http
GET /marcas
GET /modelos
GET /categorias
GET /tipos-combustible
GET /tipos-transmision
GET /extras
GET /seguros
GET /tarifas
GET /canales-venta
GET /provincias
GET /ciudades
GET /agencias
```

---

## Flujo completo de integración

```
1. GET  /vehiculos/booking?status=DISPONIBLE   → Listar vehículos
2. GET  /vehiculos/booking/:id/disponibilidad  → Verificar disponibilidad puntual
3. POST /reservas/booking                      → Crear reserva  → status: PENDIENTE
4. POST /pagos  (con token)                    → Registrar pago → status pago: PENDIENTE
5. PATCH /reservas/booking/:id  {"status":"CONFIRMADA"}  → Confirmar → status: CONFIRMADA
6. POST /alquileres/booking                    → Entregar vehículo → vehículo: EN_USO
7. POST /devoluciones/booking                  → Devolver → vehículo: DISPONIBLE
8. GET  /payment/booking/:reservaId            → Verificar estado de pago final
```

---

## Notas importantes

- Las rutas `/booking` son **server-to-server** y no requieren JWT. El sistema confía en que el caller ya autenticó al usuario de su lado.
- `clienteId` en `POST /reservas/booking` debe ser un UUID válido del usuario en el sistema RentCar. Si el usuario no existe aún, registrarlo primero con `POST /auth/register`.
- El precio se calcula automáticamente: `precioDia × diasTotal`. No se acepta un precio externo.
- Las fechas en formato `YYYY-MM-DD` o ISO 8601 (`2026-06-01T00:00:00Z`) son aceptadas.
- El sistema **no permite** crear dos reservas activas para el mismo vehículo.

---

*RentCar EC — API v1 — canadacentral.azurecontainerapps.io*
