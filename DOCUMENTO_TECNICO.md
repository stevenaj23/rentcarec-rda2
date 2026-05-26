# Documento Técnico — RentCar EC
**Sistema de Alquiler de Vehículos · Arquitectura de Microservicios**
**Autor:** Steven Ariel Rosero · **Fecha:** Mayo 2026

---

## 1. Arquitectura de Microservicios

El sistema está compuesto por **7 microservicios independientes**, cada uno con su propia base de datos (patrón Database per Service), desplegados en **Azure Container Apps**.

### 1.1 Diagrama de Arquitectura

```
                          INTERNET
                             │
                    ┌────────▼────────┐
                    │   API Gateway   │
                    │     (Nginx)     │
                    │   Puerto 80     │
                    └────────┬────────┘
                             │  Path-based routing
         ┌───────────────────┼───────────────────────┐
         │                   │                       │
┌────────▼───────┐  ┌────────▼───────┐  ┌───────────▼──────┐
│  auth-service  │  │inventario-srv  │  │   org-service    │
│   Puerto 3001  │  │  Puerto 3002   │  │   Puerto 3003    │
│   PostgreSQL   │  │  PostgreSQL    │  │   PostgreSQL     │
│   (Supabase)   │  │  (Supabase)   │  │   (Supabase)     │
└────────────────┘  └────────┬───────┘  └──────────────────┘
                             │ gRPC :5002
         ┌───────────────────┼───────────────────────┐
         │                   │                       │
┌────────▼───────┐  ┌────────▼───────┐  ┌───────────▼──────┐
│operaciones-srv │  │financiero-srv  │  │mantenimiento-srv │
│  Puerto 3004   │  │  Puerto 3005   │  │   Puerto 3006    │
│  PostgreSQL    │  │  PostgreSQL    │  │   PostgreSQL     │
│  gRPC :5004    │  │  gRPC :5005    │  │   (Supabase)     │
└────────┬───────┘  └────────────────┘  └──────────────────┘
         │ gRPC
┌────────▼───────┐
│  bus-service   │  ──── Azure Service Bus ────▶ (eventos asíncronos)
│  Puerto 3007   │
└────────────────┘

         ┌────────────────────────────────────────────┐
         │        Frontend (Vue 3 + Vite)             │
         │  Servido por Nginx · Azure Container Apps  │
         └────────────────────────────────────────────┘
```

### 1.2 Descripción de Servicios

| Servicio | Puerto HTTP | Puerto gRPC | Responsabilidad |
|---|---|---|---|
| **auth-service** | 3001 | — | Autenticación, registro, JWT, gestión de usuarios |
| **inventario-service** | 3002 | 5002 | Vehículos, marcas, modelos, categorías, extras |
| **org-service** | 3003 | 5003 | Empresas, agencias, provincias, ciudades |
| **operaciones-service** | 3004 | 5004 | Reservas, alquileres, devoluciones, seguros, tarifas |
| **financiero-service** | 3005 | 5005 | Pagos, facturas, conciliación |
| **mantenimiento-service** | 3006 | — | Mantenimientos, kardex de vehículos |
| **bus-service** | 3007 | — | Orquestador de eventos con Azure Service Bus |

### 1.3 Tecnologías

- **Runtime:** Node.js 20 + TypeScript
- **Framework:** Express 5
- **ORM:** Prisma 5 (PostgreSQL en Supabase)
- **Comunicación síncrona:** REST HTTP + gRPC (`@grpc/grpc-js`)
- **Comunicación asíncrona:** Azure Service Bus
- **Validación:** Zod
- **Logging:** Pino (JSON estructurado)
- **Infraestructura:** Docker + Azure Container Apps + Azure Container Registry
- **CI/CD:** GitHub Actions (8 pipelines independientes)

---

## 2. Diagrama de Integración con Booking Prototipo

El Booking Prototipo consume los endpoints públicos del sistema RentCar EC sin necesidad de autenticación JWT.

```
BOOKING PROTOTIPO                      RENTCAR EC
      │
      │── GET /vehiculos/booking ──────▶ inventario-service
      │      (listar vehículos)
      │
      │── GET /vehiculos/booking/:id ──▶ inventario-service
      │      (detalle de vehículo)
      │
      │── GET /vehiculos/booking/:id ──▶ inventario-service
      │        /disponibilidad
      │
      │── POST /reservas/booking ───────▶ operaciones-service
      │      (crear reserva)                    │
      │                                         │── gRPC ──▶ inventario-service
      │                                         │   (verifica disponibilidad)
      │
      │── POST /pagos ─────────────────▶ financiero-service
      │      (registrar pago)
      │
      │── PATCH /reservas/booking/:id ─▶ operaciones-service
      │      (confirmar reserva)
      │
      │── POST /alquileres/booking ─────▶ operaciones-service
      │      (iniciar alquiler)
      │
      │── POST /devoluciones/booking ───▶ operaciones-service
      │      (registrar devolución)
      │
      │── GET /payment/booking/:id ─────▶ financiero-service
             (consultar pagos)
```

**Base URL producción:**
- Vehículos: `https://rentcar-inventario.whiteisland-027d7f3d.canadacentral.azurecontainerapps.io`
- Reservas/Alquileres/Devoluciones: `https://rentcar-operaciones.whiteisland-027d7f3d.canadacentral.azurecontainerapps.io`
- Pagos: `https://rentcar-financiero.whiteisland-027d7f3d.canadacentral.azurecontainerapps.io`

Todos los endpoints tienen el prefijo `/api/v1/stevenariel`.

---

## 3. Contratos entre Servicios

### 3.1 Contrato de Integración Booking (HTTP REST)

Documentado en [`booking-api-reference.md`](./booking-api-reference.md) en la raíz del repositorio. Incluye:
- Endpoints públicos de vehículos, reservas, alquileres, devoluciones y pagos
- Ejemplos de request/response
- Códigos de error y sus descripciones
- Flujo completo de integración paso a paso

### 3.2 Contratos Internos (gRPC / Protobuf)

La comunicación interna entre servicios usa Protocol Buffers:

| Archivo Proto | Servicio Proveedor | Operaciones |
|---|---|---|
| `inventario.proto` | inventario-service:5002 | `GetVehiculo`, `UpdateVehiculoStatus`, `GetExtra` |
| `operaciones.proto` | operaciones-service:5004 | `CrearReserva`, `CancelarReserva`, `IniciarAlquiler`, `RegistrarDevolucion` |
| `financiero.proto` | financiero-service:5005 | `GetPagosByReserva` |
| `org.proto` | org-service:5003 | `GetAgencia` |

### 3.3 Documentación OpenAPI

Cada servicio expone su especificación OpenAPI 3.0 en `/api-docs`:

| Servicio | URL Swagger |
|---|---|
| auth-service | `https://rentcar-auth.../api-docs` |
| inventario-service | `https://rentcar-inventario.../api-docs` |
| operaciones-service | `https://rentcar-operaciones.../api-docs` |
| financiero-service | `https://rentcar-financiero.../api-docs` |

### 3.4 Versionamiento

Los contratos usan versionamiento por URL (`/api/v1/stevenariel/...`). La versión `v1` garantiza compatibilidad hacia atrás: los endpoints existentes no se modifican, nuevas funcionalidades se agregan sin romper consumidores existentes.

---

## 4. Estrategia de Pruebas

### 4.1 Verificación de Endpoints Booking

Todos los endpoints de integración fueron verificados manualmente con herramientas HTTP (Postman / curl) contra el entorno de producción en Azure:

| Endpoint | Método | Resultado |
|---|---|---|
| `/vehiculos/booking` | GET | 200 OK — lista de vehículos |
| `/vehiculos/booking/:id` | GET | 200 OK — detalle de vehículo |
| `/vehiculos/booking/:id/disponibilidad` | GET | 200 OK — estado disponible |
| `/reservas/booking` | POST | 201 Created — reserva creada |
| `/reservas/booking/:id` | GET | 200 OK — detalle de reserva |
| `/reservas/booking/:id` | PATCH | 200 OK — estado actualizado |
| `/reservas/:id/cancelar` | PATCH | 200 OK — reserva cancelada |
| `/alquileres/booking` | POST | 201 Created — alquiler iniciado |
| `/devoluciones/booking` | POST | 201 Created — devolución registrada |
| `/pagos` | POST | 201 Created — pago registrado |
| `/payment/booking/:id` | GET | 200 OK — pagos de reserva |

### 4.2 Verificación de Tipado

Todos los servicios pasan la verificación estática de TypeScript (`tsc --noEmit`) sin errores antes de cada despliegue.

### 4.3 Health Checks

Cada servicio expone `GET /health` que retorna:
```json
{ "service": "nombre-service", "status": "ok", "timestamp": "..." }
```
Azure Container Apps usa este endpoint para verificar disponibilidad antes de enrutar tráfico.

### 4.4 Pipeline CI/CD

GitHub Actions ejecuta automáticamente build, push a Azure Container Registry y deploy en cada `push` a `master`, garantizando que solo código compilado correctamente llega a producción.

---

## 5. Estrategia de Seguridad

### 5.1 Autenticación con JWT

El sistema usa **JSON Web Tokens (JWT)** firmados con `HS256`:

```
Cliente ──POST /auth/login──▶ auth-service ──▶ { token: "eyJ..." }
                                                         │
Cliente ──GET /reservas ──▶ auth.middleware ────────────▶│ verifica firma
         Authorization: Bearer eyJ...                    │ extrae payload
                                                         ▼
                                                   req.user = { id, rol }
```

**Configuración:**
- Secreto compartido entre todos los servicios vía variable de entorno `JWT_SECRET`
- Expiración: 7 días (`JWT_EXPIRES_IN=7d`)
- Algoritmo: HS256

### 5.2 Roles y Autorización

| Rol | Acceso |
|---|---|
| `ADMIN` | Acceso completo: CRUD vehículos, gestión reservas, panel dashboard |
| `CLIENTE` | Acceso propio: ver sus reservas, cancelar |
| Sin token | Solo endpoints `/booking` públicos |

### 5.3 Clasificación de Endpoints

**Endpoints públicos (sin JWT)** — para integración Booking:
- `GET /vehiculos/booking*`
- `POST /reservas/booking`
- `GET /reservas/booking/:id`
- `PATCH /reservas/booking/:id`
- `PATCH /reservas/:id/cancelar`
- `POST /alquileres/booking`
- `POST /devoluciones/booking`
- `POST /pagos`
- `GET /payment/booking/:id`

**Endpoints protegidos (requieren JWT)**:
- `GET /reservas` — requiere token de usuario
- `GET /reservas/my` — requiere token de usuario
- `PATCH /reservas/:id` — requiere JWT + rol ADMIN
- `POST /reservas/:id/extras` — requiere JWT + rol ADMIN
- `GET /admin/dashboard` — requiere JWT + rol ADMIN

### 5.4 Medidas Adicionales

- **Rate Limiting:** `express-rate-limit` en auth-service (protege contra fuerza bruta en login)
- **CORS:** Configurado en todos los servicios vía variable `CORS_ORIGIN`
- **Trust Proxy:** Activado para obtener IP real detrás de Nginx
- **Variables de entorno:** Credenciales y secretos gestionados como secrets en Azure Container Apps, nunca en código fuente

### 5.5 Observabilidad y Trazabilidad

Todos los servicios usan **Pino** para logging estructurado en formato JSON:

```json
{
  "level": 30,
  "time": "2026-05-25T14:32:05.456Z",
  "service": "operaciones-service",
  "req": { "method": "POST", "url": "/api/v1/stevenariel/reservas/booking", "remoteAddress": "10.0.0.1" },
  "res": { "statusCode": 201 },
  "responseTime": 87,
  "msg": "request completed"
}
```

Los logs son recogidos automáticamente por **Azure Monitor** en Azure Container Apps, permitiendo:
- Consulta de logs por servicio, nivel de severidad y rango de tiempo
- Alertas automáticas en errores 500
- Trazabilidad de cada request con método, URL, status code y tiempo de respuesta

---

## 6. Despliegue

### 6.1 Infraestructura

| Componente | Servicio Azure |
|---|---|
| Contenedores | Azure Container Apps |
| Registro de imágenes | Azure Container Registry |
| Bases de datos | Supabase PostgreSQL (6 proyectos independientes) |
| Bus de eventos | Azure Service Bus |
| CI/CD | GitHub Actions |

### 6.2 Pipeline de Despliegue

```
git push master
      │
      ▼
GitHub Actions (por servicio)
      │
      ├── Build imagen Docker
      ├── Push a Azure Container Registry
      └── Deploy a Azure Container Apps
                  │
                  ▼
           Health Check /health
                  │
                  ▼
           Tráfico enrutado
```

Cada servicio tiene su propio workflow independiente en `.github/workflows/deploy-{servicio}.yml`. El deploy solo se dispara si hubo cambios en la carpeta del servicio correspondiente.

---

*Repositorio: [https://github.com/StevenAJ23/RentCarEc-RDA2](https://github.com/StevenAJ23/RentCarEc-RDA2)*
