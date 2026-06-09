export const typeDefs = `#graphql

  # ── Auth ────────────────────────────────────────────────────────────────────

  type Usuario {
    id: ID!
    email: String!
    nombres: String!
    apellidos: String!
    role: String!
    telefono: String
  }

  type AuthPayload {
    token: String!
    user: Usuario!
  }

  input RegisterInput {
    email: String!
    password: String!
    nombres: String!
    apellidos: String!
    telefono: String
  }

  # ── Inventario ───────────────────────────────────────────────────────────────

  type Marca {
    id: ID!
    nombre: String!
  }

  type Modelo {
    id: ID!
    nombre: String!
    marca: Marca
  }

  type Categoria {
    id: ID!
    nombre: String!
  }

  type Vehiculo {
    id: ID!
    placa: String!
    anio: Int
    precio_dia: Float!
    status: String!
    descripcion: String
    imagen: String
    nombre: String
    modelo: Modelo
    categoria: Categoria
  }

  type VehiculoPaginado {
    data: [Vehiculo!]!
    total: Int!
    page: Int!
    limit: Int!
    totalPages: Int!
  }

  # ── Org ──────────────────────────────────────────────────────────────────────

  type Ciudad {
    id: ID!
    nombre: String!
    provincia: String
  }

  type Empresa {
    id: ID!
    nombre: String!
    ruc: String
    email: String
    telefono: String
  }

  type Agencia {
    id: ID!
    nombre: String!
    direccion: String
    ciudad: Ciudad
  }

  # ── Operaciones ──────────────────────────────────────────────────────────────

  type ReservaVehiculo {
    id: ID!
    nombre: String
    placa: String
    precio_dia: Float
  }

  type ReservaUsuario {
    id: ID!
    nombres: String!
    apellidos: String!
    email: String!
  }

  type Pago {
    id: ID!
    monto: Float!
    metodoPago: String!
    status: String!
    referencia: String
    createdAt: String!
  }

  type Factura {
    id: ID!
    numeroFactura: String!
    total: Float!
    subtotal: Float!
    iva: Float!
    razonSocial: String
    ruc: String
    createdAt: String!
  }

  type Reserva {
    id: ID!
    codigoReserva: String
    status: String!
    fechaInicio: String!
    fechaFin: String!
    diasTotal: Int!
    totalAmount: Float!
    precioBase: Float!
    precioExtras: Float
    precioSeguro: Float
    notas: String
    createdAt: String!
    vehiculo: ReservaVehiculo
    usuario: ReservaUsuario
    pagos: [Pago!]
    facturas: [Factura!]
  }

  input ExtraReservaInput {
    extraId: ID!
    cantidad: Int!
  }

  input CrearReservaInput {
    vehiculoId: ID!
    agenciaId: ID!
    fechaInicio: String!
    fechaFin: String!
    seguroId: ID
    notas: String
    extras: [ExtraReservaInput!]
  }

  input PagoInput {
    reservaId: ID!
    monto: Float!
    metodoPago: String!
    referencia: String
  }

  input FacturaInput {
    reservaId: ID!
    razonSocial: String!
    ruc: String!
    direccion: String
  }

  # ── Queries y Mutations ──────────────────────────────────────────────────────

  type Query {
    # Vehículos (público)
    vehiculos(page: Int, limit: Int, status: String): VehiculoPaginado!
    vehiculo(id: ID!): Vehiculo

    # Reservas (autenticado)
    reservas(page: Int, limit: Int, status: String): [Reserva!]!
    reserva(id: ID!): Reserva
    misReservas: [Reserva!]!

    # Financiero (autenticado)
    pagosPorReserva(reservaId: ID!): [Pago!]!
    facturasPorReserva(reservaId: ID!): [Factura!]!

    # Org (público)
    agencias: [Agencia!]!
    empresas: [Empresa!]!
  }

  type Mutation {
    # Auth
    login(email: String!, password: String!): AuthPayload!
    register(input: RegisterInput!): AuthPayload!

    # Reservas
    crearReserva(input: CrearReservaInput!): Reserva!
    cancelarReserva(id: ID!): Reserva!
    actualizarEstadoReserva(id: ID!, status: String!): Reserva!

    # Financiero
    registrarPago(input: PagoInput!): Pago!
    generarFactura(input: FacturaInput!): Factura!
  }
`;
