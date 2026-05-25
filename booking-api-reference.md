# RentCar EC — Booking Integration API Reference

## Base URLs (Producción)

| Servicio | URL Base |
|---|---|
| Vehículos | `https://rentcar-inventario.whiteisland-027d7f3d.canadacentral.azurecontainerapps.io` |
| Reservas / Alquileres / Devoluciones | `https://rentcar-operaciones.whiteisland-027d7f3d.canadacentral.azurecontainerapps.io` |
| Pagos | `https://rentcar-financiero.whiteisland-027d7f3d.canadacentral.azurecontainerapps.io` |

Todos los endpoints tienen el prefijo `/api/v1/stevenariel`. Las rutas de integración llevan adicionalmente `/booking`.

> **Sin autenticación:** Todos los endpoints de esta referencia son públicos — no requieren token JWT.

Ejemplo completo:
```
GET https://rentcar-inventario.whiteisland-027d7f3d.canadacentral.azurecontainerapps.io/api/v1/stevenariel/vehiculos/booking
```

---

## Vehículos

### Listar vehículos

```
GET /api/v1/stevenariel/vehiculos/booking
```

**Query parameters:**

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `agenciaId` | string | — | Filtra por agencia |
| `categoriaId` | string | — | Filtra por categoría |
| `status` | string | `DISPONIBLE` | `DISPONIBLE`, `EN_USO`, `MANTENIMIENTO` |
| `page` | number | `1` | Número de página |
| `limit` | number | `20` | Resultados por página |

**Respuesta `200 OK`:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "nombre": "Chevrolet Sail 2023",
        "descripcion": "Auto ideal para ciudad, muy económico en consumo.",
        "precioPorDia": 25.50,
        "moneda": "USD",
        "categoria": "Económico",
        "agenciaId": "uuid",
        "disponible": true,
        "status": "DISPONIBLE",
        "imagenUrl": "https://..."
      }
    ],
    "total": 10,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

> **Nota:** La respuesta envuelve el array en `data.data`. El campo de precio es `precioPorDia`. La paginación incluye el campo adicional `totalPages`.

---

### Obtener vehículo por ID

```
GET /api/v1/stevenariel/vehiculos/booking/:id
```

**Respuesta `200 OK`:** Objeto vehículo (misma estructura que el listado).

**Respuesta `404 Not Found`:**
```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "Vehiculo {id} no encontrado" }
}
```

---

### Verificar disponibilidad

```
GET /api/v1/stevenariel/vehiculos/booking/:id/disponibilidad
```

> **Nota:** La disponibilidad se basa en el estado actual del vehículo. La validación por rango de fechas no está implementada en esta versión.

**Respuesta `200 OK`:**
```json
{
  "success": true,
  "data": {
    "vehiculoId": "uuid",
    "disponible": true,
    "status": "DISPONIBLE",
    "mensaje": "El vehículo está disponible para alquiler"
  }
}
```

---

## Reservas

Hay dos formas de crear una reserva según el flujo de integración:

| Ruta | Descripción |
|---|---|
| `POST /reservas/booking` | Flujo booking simplificado — calcula precio automáticamente |
| `POST /reservas` | Flujo completo — soporta extras, seguros y canal de venta |

---

### Crear reserva (flujo booking)

```
POST /api/v1/stevenariel/reservas/booking
Content-Type: application/json
```

**Body:**
```json
{
  "vehiculoId":  "uuid",
  "clienteId":   "uuid",
  "agenciaId":   "uuid",
  "fechaInicio": "2026-06-01T10:00:00Z",
  "fechaFin":    "2026-06-05T10:00:00Z"
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `vehiculoId` | string (uuid) | Sí | ID del vehículo |
| `clienteId` | string (uuid) | Sí | ID del cliente/usuario |
| `agenciaId` | string (uuid) | No | Se obtiene del vehículo si no se envía |
| `fechaInicio` | string (ISO 8601) | Sí | Fecha de inicio del alquiler |
| `fechaFin` | string (ISO 8601) | Sí | Fecha de fin del alquiler |

**Respuesta `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "codigoReserva": "RES-ABC123-XYZ",
    "vehiculoId": "uuid",
    "clienteId": "uuid",
    "agenciaId": "uuid",
    "fechaInicio": "2026-06-01T10:00:00Z",
    "fechaFin": "2026-06-05T10:00:00Z",
    "diasTotal": 4,
    "totalAmount": 180.00,
    "status": "PENDIENTE"
  }
}
```

**Errores:**
| Código | Descripción |
|---|---|
| `400` | Campos requeridos faltantes |
| `404` | Vehículo no encontrado |
| `409` | El vehículo ya tiene una reserva activa |
| `422` | Vehículo no disponible o precio no configurado |

---

### Crear reserva (flujo completo)

```
POST /api/v1/stevenariel/reservas
Content-Type: application/json
```

**Body:**
```json
{
  "vehiculoId":   "uuid",
  "agenciaId":    "uuid",
  "usuarioId":    "uuid",
  "fechaInicio":  "2026-06-01",
  "fechaFin":     "2026-06-05",
  "seguroId":     "uuid",
  "canalVentaId": "uuid",
  "notas":        "Cliente solicita silla de bebé",
  "extras": [
    { "extraId": "uuid", "cantidad": 1 }
  ]
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `vehiculoId` | string (uuid) | Sí | ID del vehículo |
| `agenciaId` | string (uuid) | No | ID de la agencia |
| `usuarioId` | string (uuid) | Sí | ID del cliente (también acepta `clienteId`) |
| `fechaInicio` | string (`YYYY-MM-DD`) | Sí | Fecha de inicio |
| `fechaFin` | string (`YYYY-MM-DD`) | Sí | Fecha de fin |
| `seguroId` | string (uuid) | No | ID del seguro opcional |
| `canalVentaId` | string (uuid) | No | Canal de venta |
| `notas` | string | No | Observaciones libres |
| `extras` | array | No | Lista de extras adicionales |

> **Diferencia clave:** Las fechas se envían como `YYYY-MM-DD` (sin hora), a diferencia del flujo `/booking` que acepta ISO 8601 completo.

**Respuesta `201 Created`:** Objeto reserva con todos los campos calculados.

---

### Obtener reserva por ID

```
GET /api/v1/stevenariel/reservas/booking/:id
```

**Respuesta `200 OK`:** Objeto reserva.

---

### Actualizar estado de reserva

```
PATCH /api/v1/stevenariel/reservas/booking/:id
Content-Type: application/json
```

**Body:**
```json
{ "status": "CONFIRMADA" }
```

**Valores válidos para `status`:**

| Valor | Descripción |
|---|---|
| `PENDIENTE` | Reserva creada, pendiente de confirmación |
| `CONFIRMADA` | Reserva confirmada, lista para iniciar alquiler |
| `ACTIVA` | Alquiler en curso |
| `COMPLETADA` | Alquiler finalizado y devuelto |
| `CANCELADA` | Reserva cancelada |

> Solo se permiten transiciones válidas: `PENDIENTE → CONFIRMADA → ACTIVA → COMPLETADA`. Cualquier estado puede cancelarse (`→ CANCELADA`).

**Respuesta `200 OK`:** Objeto reserva actualizado.

---

### Cancelar reserva

```
PATCH /api/v1/stevenariel/reservas/:id/cancelar
```

No requiere body. Cancela la reserva y libera el vehículo a estado `DISPONIBLE`.

**Respuesta `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "CANCELADA"
  }
}
```

**Errores:**
| Código | Descripción |
|---|---|
| `404` | Reserva no encontrada |
| `422` | La reserva ya está `COMPLETADA` o `CANCELADA` |

---

## Alquileres

### Iniciar alquiler

```
POST /api/v1/stevenariel/alquileres/booking
Content-Type: application/json
```

Requiere que la reserva esté en estado `CONFIRMADA`. Al crear el alquiler el vehículo pasa a estado `EN_USO`.

**Body:**
```json
{
  "reservaId":     "uuid",
  "kmSalida":      15230,
  "fechaInicio":   "2026-06-01T10:00:00Z",
  "observaciones": "Sin novedades al momento de salida"
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `reservaId` | string (uuid) | Sí | ID de la reserva en estado CONFIRMADA |
| `kmSalida` | number | No | Kilometraje del vehículo al salir |
| `fechaInicio` | string (ISO 8601) | No | Si se omite, usa la fecha/hora actual |
| `observaciones` | string | No | Notas de salida |

**Respuesta `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "reservaId": "uuid",
    "kmSalida": 15230,
    "fechaInicio": "2026-06-01T10:00:00Z",
    "status": "ACTIVO"
  }
}
```

**Errores:**
| Código | Descripción |
|---|---|
| `400` | `reservaId` faltante |
| `404` | Reserva no encontrada |
| `409` | Ya existe un alquiler para esta reserva |
| `422` | La reserva no está en estado `CONFIRMADA` |

---

## Devoluciones

### Registrar devolución

```
POST /api/v1/stevenariel/devoluciones/booking
Content-Type: application/json
```

Cierra el alquiler, marca la reserva como `COMPLETADA` y libera el vehículo a estado `DISPONIBLE`.

**Body:**
```json
{
  "alquilerId":     "uuid",
  "kmEntrada":      15890,
  "estadoVehiculo": "BUENO",
  "cargoExtra":     25.00,
  "observaciones":  "Rayón leve en puerta trasera derecha"
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `alquilerId` | string (uuid) | Sí | ID del alquiler activo |
| `kmEntrada` | number | No | Kilometraje al devolver |
| `estadoVehiculo` | string | No | Estado físico del vehículo |
| `cargoExtra` | number | No | Cargo adicional (default `0`) |
| `observaciones` | string | No | Notas de entrada |

**Respuesta `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "alquilerId": "uuid",
    "kmEntrada": 15890,
    "estadoVehiculo": "BUENO",
    "cargoExtra": 25.00,
    "observaciones": "Rayón leve en puerta trasera derecha"
  }
}
```

**Errores:**
| Código | Descripción |
|---|---|
| `400` | `alquilerId` faltante |
| `404` | Alquiler no encontrado |
| `409` | Este alquiler ya tiene una devolución registrada |
| `422` | El alquiler no está en estado `ACTIVO` |

---

## Pagos

> Servicio en host: `rentcar-financiero.whiteisland-027d7f3d.canadacentral.azurecontainerapps.io`

### Registrar pago

```
POST /api/v1/stevenariel/pagos
Content-Type: application/json
```

**Body:**
```json
{
  "reservaId":  "uuid",
  "monto":      180.00,
  "metodoPago": "TARJETA",
  "referencia": "TXN-20260601-001"
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `reservaId` | string (uuid) | Sí | ID de la reserva asociada |
| `monto` | number | Sí | Monto a pagar (mínimo `0.01`) |
| `metodoPago` | string | Sí | `TARJETA`, `EFECTIVO`, `TRANSFERENCIA` |
| `referencia` | string | No | Código de transacción externo |

**Respuesta `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "reservaId": "uuid",
    "monto": 180.00,
    "metodoPago": "TARJETA",
    "referencia": "TXN-20260601-001",
    "status": "PENDIENTE",
    "creadoEn": "2026-06-01T10:05:00Z"
  }
}
```

**Errores:**
| Código | Descripción |
|---|---|
| `400` | Campos requeridos faltantes o `monto` inválido |
| `404` | Reserva no encontrada |

---

### Consultar pagos de una reserva

```
GET /api/v1/stevenariel/payment/booking/:reservaId
```

**Respuesta `200 OK`:**
```json
{
  "success": true,
  "data": {
    "reservaId": "uuid",
    "pagos": [
      {
        "id": "uuid",
        "monto": 180.00,
        "metodoPago": "TARJETA",
        "status": "COMPLETADO",
        "referencia": "TXN-20260601-001",
        "creadoEn": "2026-06-01T10:05:00Z"
      }
    ],
    "totalPagado": 180.00,
    "statusConsolidado": "COMPLETADO"
  }
}
```

---

## Flujo completo de integración

```
1. GET  /vehiculos/booking                      → Buscar vehículo disponible
2. GET  /vehiculos/booking/:id/disponibilidad   → Confirmar que está disponible
3. POST /reservas/booking                       → Crear reserva  (status: PENDIENTE)
4. POST /pagos                                  → Registrar pago de la reserva
5. PATCH /reservas/booking/:id                  → { "status": "CONFIRMADA" }
6. POST /alquileres/booking                     → Iniciar alquiler (vehículo → EN_USO)
7. POST /devoluciones/booking                   → Registrar devolución (vehículo → DISPONIBLE)
8. GET  /payment/booking/:reservaId             → Verificar estado de pago

── Cancelación (cualquier momento antes de COMPLETADA) ──
   PATCH /reservas/:id/cancelar                 → Cancela y libera el vehículo
```

---

## Formato de errores

Todos los errores siguen la misma estructura:

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

## Notas importantes

1. **Sin autenticación:** Todos los endpoints de esta referencia son públicos — no requieren token JWT.
2. **`usuarioId` / `clienteId`:** Ambos campos son equivalentes. Debe corresponder a un ID de usuario registrado en el sistema RentCar EC.
3. **Fechas en `/reservas/booking`:** ISO 8601 completo (`YYYY-MM-DDTHH:mm:ssZ`).
4. **Fechas en `/reservas`:** Solo fecha (`YYYY-MM-DD`), sin hora.
5. **Disponibilidad por fechas:** El endpoint `GET /vehiculos/booking/:id/disponibilidad` verifica el estado actual del vehículo. La validación por rango de fechas no está implementada en esta versión.
6. **Campo `status` en PATCH:** El campo para actualizar el estado de una reserva es `status`, no `estado`.
7. **Paginación:** Las listas devuelven `data.data` (array), `total`, `page`, `limit` y `totalPages`.
