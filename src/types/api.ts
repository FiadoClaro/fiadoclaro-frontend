/**
 * Tipos de la API de FiadoClaro, generados desde docs/openapi.json.
 * NO editar a mano: si cambia el backend, vuelve a descargar openapi.json y regenera.
 *
 * Regla del proyecto: montos y tasas llegan como TEXTO ("108.44", "3.5000000").
 * Por eso se tipan como `Decimal` (= string). Nunca convertirlos a number para operar;
 * solo formatearlos con utils/format.ts.
 */

/** Número decimal exacto enviado como texto (montos con 2 decimales, tasas con hasta 7). */
export type Decimal = string
/** Fecha ISO `YYYY-MM-DD`. */
export type IsoDate = string
/** Fecha y hora ISO `YYYY-MM-DDTHH:mm:ss±hh:mm`. */
export type IsoDateTime = string
/** Hora ISO `HH:mm:ss`. */
export type IsoTime = string

/** Roles del sistema. */
export type Rol = 'ADMIN_SISTEMA' | 'ADMIN_TIENDA' | 'CLIENTE'

/** Respuesta paginada de las listas: `{items, total, limit, offset, conteos?}`. */
export interface Pagina<T> {
  items: T[]
  /** Registros que cumplen los filtros, en todas las páginas */
  total: number
  limit: number
  offset: number
  /** Facetas: cantidad de registros por cada valor de un filtro */
  conteos?: Record<string, Record<string, number>> | null
}

/** Forma de todos los errores del backend. */
export interface ApiErrorBody {
  /** Mensaje en español (o lista de errores de validación de FastAPI). */
  detail: string | ValidationError[]
  /** Código estable, p. ej. `tasa_supera_tope`, `excede_credito`. */
  code?: string
  errores?: unknown
  datos?: unknown
}

/** Acceso del vecino al portal. El usuario es su DNI seguido del dominio de la tienda (ej. 08765432@bodegadonlucho.com). Si no se envía, el sistema lo arma solo. El vecino puede cambiar la contraseña desde su perfil. */
export interface AccesoCliente {
  /** Opcional. Por defecto <DNI>@<dominio de la tienda> */
  username?: string | null
  /** Contraseña provisional, mínimo 8 caracteres */
  password: string
}

/** Administrador / representante del negocio que se crea junto con la tienda. */
export interface AdminTiendaIn {
  /** Usuario de acceso: letras, números, punto, guion, guion bajo o @ */
  username: string
  /** Mínimo 8 caracteres */
  password: string
  /** Nombre del administrador del negocio */
  nombre: string
  /** Teléfono celular personal */
  telefono: string
  /** Correo electrónico personal */
  correo: string
}

export interface AdministradorOut {
  id: number
  username: string
  nombre: string
  telefono: string | null
  correo: string | null
  activo: boolean
  ultimo_acceso: IsoDateTime | null
}

export interface AdministradorUpdate {
  nombre?: string | null
  telefono?: string | null
  correo?: string | null
}

export interface BitacoraOut {
  id: number
  usuario_id: number | null
  tienda_id: number | null
  accion: string
  entidad: string
  entidad_id: number | null
  detalle: Record<string, unknown> | null
  ip: string | null
  created_at: IsoDateTime
}

export interface LoginForm {
  /** Usuario o correo, ej. dlucho o 08765432@bodegadonlucho.com */
  username: string
  /** Contraseña */
  password: string
}

export interface CambioPassword {
  password_actual: string
  password_nueva: string
  /** Opcional: si se envía, debe coincidir con la nueva */
  confirmacion?: string | null
}

export interface ClienteCreate {
  nombres: string
  apellidos: string
  telefono?: string | null
  correo?: string | null
  direccion?: string | null
  /** DNI de 8 dígitos */
  dni: string
  condicion: CondicionIn
  /** Acceso al portal: usuario <DNI>@<dominio de la tienda> y contraseña provisional */
  acceso: AccesoCliente
}

export interface ClienteOut {
  nombres: string
  apellidos: string
  telefono?: string | null
  correo?: string | null
  direccion?: string | null
  id: number
  tienda_id: number
  dni: string
  estado: string
  usuario: string
  created_at: IsoDateTime
  condicion: CondicionOut
  resumen: ResumenCredito
}

export interface ClienteUpdate {
  nombres?: string | null
  apellidos?: string | null
  telefono?: string | null
  correo?: string | null
  direccion?: string | null
}

export interface CompraEnCuotasOut {
  id: number
  fecha_hora: IsoDateTime
  descripcion: string
  atendido_por: string
  monto: string
  num_cuotas: number
  valor_cuota: string
  /** Suma de las cuotas que faltan pagar */
  saldo_pendiente: string
  cuotas_pagadas: number
  cuotas: CuotaPortalOut[]
}

export interface CompraFinDeMesOut {
  id: number
  fecha_hora: IsoDateTime
  /** Productos de la compra, ej. '3x Leche Gloria Azul 400g, 1x Arroz...' */
  descripcion: string
  atendido_por: string
  monto: string
  /** Días entre la compra y la fecha de pago */
  dias: number
  interes: string
  total: string
  fecha_pago: IsoDate
  /** True si ya está en un listado generado */
  en_listado: boolean
}

export interface CompraIn {
  cliente_id: number
  items: ItemIn[]
  modalidad: "FIN_MES" | "CUOTAS"
  /** Solo para CUOTAS */
  num_cuotas?: number
  /** Opcional, para pasar al sistema compras del cuaderno; por defecto, ahora */
  fecha_hora?: IsoDateTime | null
}

export interface CompraOut {
  cliente_id: number
  modalidad: string
  num_cuotas: number
  moneda: string
  fecha_hora: IsoDateTime
  /** Ciclo al que pertenece la compra */
  fecha_corte: IsoDate
  /** Fecha de pago del ciclo */
  fecha_pago: IsoDate
  /** Días entre la compra y la fecha de pago */
  dias_gracia: number
  detalles: DetalleOut[]
  monto_total: string
  tasa: TasaPactadaOut
  interes_total: string
  monto_capitalizado: string
  valor_cuota: string
  total_a_pagar: string
  tcea_pct: string | null
  cronograma: CuotaOut[]
  credito_disponible_antes?: string | null
  credito_disponible_despues?: string | null
  /** True si el monto supera el crédito disponible */
  excede_credito?: boolean
  /** Cuánto falta de crédito para poder registrarla */
  deficit?: string
  /** Aviso para mostrar cuando la compra no se puede registrar */
  mensaje?: string | null
  id: number
  estado: string
  registrado_por: number
}

export interface CompraResumenOut {
  id: number
  cliente_id: number
  fecha_hora: IsoDateTime
  modalidad: string
  num_cuotas: number
  moneda: string
  monto_total: string
  interes_total: string
  fecha_corte: IsoDate
  fecha_pago: IsoDate
  estado: string
}

/** Condiciones del fiado (enunciado, punto 3). */
export interface CondicionIn {
  moneda?: "PEN" | "USD"
  /** Tasa compensatoria pactada (nominal o efectiva) */
  tasa: TasaIn
  /** Tasa moratoria pactada (nominal o efectiva) */
  tasa_mora: TasaIn
  limite_credito: Decimal
  /** Máximo de meses en cuotas para este cliente */
  max_meses: number
  /** Día del mes en que se cierra el ciclo (1 a 28) */
  dia_corte: number
  /** Hora de corte; compras posteriores pasan al ciclo siguiente */
  hora_corte?: IsoTime
  /** Día del mes en que el cliente se compromete a pagar */
  dia_pago: number
}

export interface CondicionOut {
  moneda: string
  tasa: TasaOut
  tasa_mora: TasaOut
  limite_credito: string
  max_meses: number
  dia_corte: number
  hora_corte: IsoTime
  dia_pago: number
}

/** Lo que el cliente debe pagar si paga en `fecha_pago` (incluye la mora si hay atraso). */
export interface CotizacionOut {
  estado_cuenta_id: number
  fecha_pago_pactada: IsoDate
  fecha_pago: IsoDate
  dias_mora: number
  interes_moratorio: string
  /** Compensatorio por los días de atraso */
  interes_compensatorio_mora: string
  /** Compensatorio del listado (compra -> fecha de pago) */
  interes_compensatorio: string
  capital: string
  total_exigible: string
  prelacion: ImputacionOut[]
}

export interface CuotaOut {
  numero: number
  fecha_vencimiento: IsoDate
  saldo_inicial: string
  interes: string
  amortizacion: string
  cuota: string
  saldo_final: string
  estado?: string
}

export interface CuotaPortalOut {
  numero: number
  fecha_vencimiento: IsoDate
  monto: string
  estado: "PAGADA" | "PENDIENTE" | "VENCIDA"
}

export interface DetalleOut {
  producto_id: number
  descripcion: string
  cantidad: string
  precio_unitario: string
  subtotal: string
}

export interface EquivalenciasOut {
  ted_pct: string
  tem_pct: string
  tea_pct: string
}

export interface EstadoCuentaOut {
  id: number
  cliente_id: number
  cliente: string
  dni: string
  fecha_corte: IsoDate
  fecha_pago: IsoDate
  moneda: string
  total_a_pagar: string
  estado: string
  vencido: boolean
  /** Compras ordenadas por fecha; la mora va en un ítem aparte */
  items: ItemListado[]
  total_capital: string
  total_interes: string
  fecha_consulta: IsoDate
  dias_mora: number
  interes_moratorio: string
  /** Compensatorio por los días de atraso */
  interes_compensatorio_mora: string
  /** Total a pagar a la fecha de consulta (incluye mora) */
  total_exigible: string
}

export interface EstadoCuentaResumen {
  id: number
  cliente_id: number
  cliente: string
  dni: string
  fecha_corte: IsoDate
  fecha_pago: IsoDate
  moneda: string
  total_a_pagar: string
  estado: string
  vencido: boolean
}

export interface GeneracionOut {
  fecha_corte: IsoDate
  generados: EstadoCuentaResumen[]
  omitidos: Omitido[]
}

export interface GenerarIn {
  /** Fecha de corte del ciclo que se cierra */
  fecha_corte: IsoDate
  /** Opcional: solo para un cliente */
  cliente_id?: number | null
}

export interface HTTPValidationError {
  detail?: ValidationError[]
}

export interface ImputacionOut {
  orden: number
  concepto: string
  exigible: string
  imputado: string
  saldo: string
}

export interface ItemIn {
  producto_id: number
  cantidad: Decimal
}

export interface ItemListado {
  tipo: "COMPRA_FIN_MES" | "CUOTA" | "INTERES_MORA" | "INTERES_COMP_MORA"
  compra_id: number | null
  fecha_compra: IsoDateTime | null
  descripcion: string
  /** Ej. 1/3 */
  cuota?: string | null
  fecha_vencimiento: IsoDate
  capital: string
  /** Interés compensatorio */
  interes: string
  /** Días entre la compra y la fecha de pago (fin de mes) o días de atraso (ítems de mora) */
  dias_interes?: number | null
  mora?: string
  total: string
}

/** Listado de pago aún no pagado, con la mora calculada a hoy. */
export interface ListadoPendienteOut {
  id: number
  fecha_corte: IsoDate
  fecha_pago: IsoDate
  vencido: boolean
  /** Compras e intereses del listado, sin mora */
  total_a_pagar: string
  dias_mora: number
  interes_moratorio: string
  interes_compensatorio_mora: string
  /** Lo que debe pagar hoy por este listado (incluye mora) */
  total_exigible: string
}

/** Lo que el administrador de la tienda puede editar de su propio negocio (el RUC no se cambia). */
export interface MiTiendaUpdate {
  razon_social?: string | null
  nombre_comercial?: string | null
  giro?: string | null
  direccion?: string | null
  telefono?: string | null
  correo?: string | null
}

export interface Omitido {
  cliente_id: number
  motivo: string
}

export type PaginaBitacoraOut = Pagina<BitacoraOut>

export type PaginaClienteOut = Pagina<ClienteOut>

export type PaginaCompraResumenOut = Pagina<CompraResumenOut>

export type PaginaEstadoCuentaResumen = Pagina<EstadoCuentaResumen>

export type PaginaPagoOut = Pagina<PagoOut>

export type PaginaProductoOut = Pagina<ProductoOut>

export type PaginaTiendaOut = Pagina<TiendaOut>

export interface PagoIn {
  estado_cuenta_id: number
  /** Por defecto, hoy */
  fecha_pago?: IsoDate | null
  /** Debe ser igual al total exigible: no se aceptan pagos parciales */
  monto: Decimal
}

export interface PagoOut {
  id: number
  estado_cuenta_id: number
  cliente_id: number
  fecha_pago: IsoDate
  dias_mora: number
  monto_total: string
  imputacion: ImputacionOut[]
  created_at: IsoDateTime
}

/** Datos que cada usuario puede editar en su perfil. */
export interface PerfilUpdate {
  /** Solo administradores; el nombre del vecino lo administra la tienda */
  nombre?: string | null
  telefono?: string | null
  correo?: string | null
}

/** Todo lo que muestra la pantalla 'Mi estado de cuenta' del vecino, ya calculado. */
export interface PortalResumenOut {
  cliente: string
  dni: string
  tienda: string
  tienda_ruc: string
  /** Límite, utilizado, disponible, próximo corte y pago */
  credito: ResumenCredito
  estado_pago: "AL_DIA" | "EN_MORA"
  /** Días de atraso del listado vencido más antiguo (0 si está al día) */
  dias_mora: number
  /** Fecha de pago del listado vencido más antiguo */
  vencio_el: IsoDate | null
  /** Próxima fecha de pago que aún no vence */
  proxima_fecha_limite: IsoDate
  /** Suma de los listados pendientes con su mora a hoy */
  total_a_pagar_hoy: string
  /** Parte de lo anterior que viene de listados previos al más reciente */
  saldo_anterior: string
  /** Cuotas y compras aún no incluidas en ningún listado */
  deuda_por_vencer: string
  /** Toda la deuda: total a pagar hoy + deuda por vencer */
  saldo_total: string
  listados_pendientes: ListadoPendienteOut[]
  /** Compras a fin de mes aún no pagadas */
  compras_fin_de_mes: CompraFinDeMesOut[]
  /** Compras en cuotas con saldo pendiente */
  compras_en_cuotas: CompraEnCuotasOut[]
}

export interface ProductoCreate {
  nombre: string
  descripcion?: string | null
  marca?: string | null
  proveedor?: string | null
  /** Unidad, Kilo (kg), Botella 1.5 L... */
  unidad_medida: string
  imagen_url?: string | null
  moneda?: "PEN" | "USD"
  precio_contado: Decimal
  /** Precio de lista a crédito (fiado) */
  precio_lista_credito: Decimal
  /** Se puede fiar en un solo pago a la fecha de pago */
  permite_fin_mes?: boolean
  /** Se puede fiar en meses (cuotas) */
  permite_cuotas?: boolean
  /** Máximo de meses si permite cuotas */
  max_meses?: number | null
}

export interface ProductoOut {
  nombre: string
  descripcion?: string | null
  marca?: string | null
  proveedor?: string | null
  /** Unidad, Kilo (kg), Botella 1.5 L... */
  unidad_medida: string
  imagen_url?: string | null
  moneda?: "PEN" | "USD"
  precio_contado: string
  /** Precio de lista a crédito (fiado) */
  precio_lista_credito: string
  /** Se puede fiar en un solo pago a la fecha de pago */
  permite_fin_mes?: boolean
  /** Se puede fiar en meses (cuotas) */
  permite_cuotas?: boolean
  /** Máximo de meses si permite cuotas */
  max_meses?: number | null
  id: number
  tienda_id: number
  estado: string
  created_at: IsoDateTime
}

/** Reemplazo completo (PUT): así las reglas entre campos siempre se validan juntas. */
export interface ProductoUpdate {
  nombre: string
  descripcion?: string | null
  marca?: string | null
  proveedor?: string | null
  /** Unidad, Kilo (kg), Botella 1.5 L... */
  unidad_medida: string
  imagen_url?: string | null
  moneda?: "PEN" | "USD"
  precio_contado: Decimal
  /** Precio de lista a crédito (fiado) */
  precio_lista_credito: Decimal
  /** Se puede fiar en un solo pago a la fecha de pago */
  permite_fin_mes?: boolean
  /** Se puede fiar en meses (cuotas) */
  permite_cuotas?: boolean
  /** Máximo de meses si permite cuotas */
  max_meses?: number | null
}

export interface ResumenCredito {
  limite: string
  /** Capital pendiente de pago */
  utilizado: string
  disponible: string
  porcentaje_utilizado: string
  estado_pago: "AL_DIA" | "EN_MORA"
  proximo_corte: IsoDate
  proximo_pago: IsoDate
  listados_pendientes: number
}

/** Resultado del cálculo, antes o después de registrar la compra. */
export interface SimulacionOut {
  cliente_id: number
  modalidad: string
  num_cuotas: number
  moneda: string
  fecha_hora: IsoDateTime
  /** Ciclo al que pertenece la compra */
  fecha_corte: IsoDate
  /** Fecha de pago del ciclo */
  fecha_pago: IsoDate
  /** Días entre la compra y la fecha de pago */
  dias_gracia: number
  detalles: DetalleOut[]
  monto_total: string
  tasa: TasaPactadaOut
  interes_total: string
  monto_capitalizado: string
  valor_cuota: string
  total_a_pagar: string
  tcea_pct: string | null
  cronograma: CuotaOut[]
  credito_disponible_antes?: string | null
  credito_disponible_despues?: string | null
  /** True si el monto supera el crédito disponible */
  excede_credito?: boolean
  /** Cuánto falta de crédito para poder registrarla */
  deficit?: string
  /** Aviso para mostrar cuando la compra no se puede registrar */
  mensaje?: string | null
}

/** Tasa tal como la pacta la tienda. El valor va en porcentaje (3.5 = 3.5 %). */
export interface TasaIn {
  tipo: "NOMINAL" | "EFECTIVA"
  /** Porcentaje, hasta 7 decimales */
  valor: Decimal
  /** 30 = mensual, 360 = anual (año comercial) */
  periodo_dias?: number
  /** Solo para nominal. Por defecto 1 (diaria), regla del curso */
  capitalizacion_dias?: number | null
}

export interface TasaOut {
  tipo: string
  valor: string
  periodo_dias: number
  capitalizacion_dias: number | null
  equivalencias: EquivalenciasOut
}

export interface TasaPactadaOut {
  tipo: string
  valor: string
  periodo_dias: number
  capitalizacion_dias: number | null
  tem_pct: string
  tea_pct: string
}

export interface TiendaCreate {
  razon_social: string
  nombre_comercial: string
  /** Bodega, Frutería, Carnicería, Peluquería, Spa... */
  giro: string
  direccion?: string | null
  telefono?: string | null
  correo?: string | null
  /** RUC de 11 dígitos */
  ruc: string
  administrador: AdminTiendaIn
}

export interface TiendaOut {
  razon_social: string
  nombre_comercial: string
  /** Bodega, Frutería, Carnicería, Peluquería, Spa... */
  giro: string
  direccion?: string | null
  telefono?: string | null
  correo?: string | null
  id: number
  ruc: string
  estado: string
  created_at: IsoDateTime
  updated_at: IsoDateTime
  fecha_baja: IsoDateTime | null
  /** Dominio del usuario de los vecinos: <DNI>@<dominio_portal> */
  dominio_portal: string
  administrador?: AdministradorOut | null
}

/** Lo que puede editar el administrador del sistema (el RUC no se cambia). */
export interface TiendaUpdate {
  razon_social?: string | null
  nombre_comercial?: string | null
  giro?: string | null
  direccion?: string | null
  telefono?: string | null
  correo?: string | null
  /** Datos de contacto del administrador */
  administrador?: AdministradorUpdate | null
}

export interface TokenOut {
  access_token: string
  token_type?: string
  usuario: UsuarioOut
}

export interface TopeIn {
  tipo: "COMPENSATORIA" | "MORATORIA"
  /** PEN = soles, USD = dólares */
  moneda?: "PEN" | "USD"
  /** TEA máxima en % */
  tea_maxima: Decimal
  vigente_desde: IsoDate
  fuente?: string | null
}

export interface TopeOut {
  tipo: "COMPENSATORIA" | "MORATORIA"
  /** PEN = soles, USD = dólares */
  moneda?: "PEN" | "USD"
  /** TEA máxima en % */
  tea_maxima: string
  vigente_desde: IsoDate
  fuente?: string | null
  id: number
}

export interface UsuarioOut {
  id: number
  username: string
  nombre: string
  rol: string
  tienda_id: number | null
  telefono?: string | null
  correo?: string | null
  activo: boolean
  ultimo_acceso?: IsoDateTime | null
}

export interface ValidationError {
  loc: (string | number)[]
  msg: string
  type: string
  input?: unknown
  ctx?: Record<string, unknown>
}
