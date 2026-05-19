#!/bin/bash
set -e

DOMAIN="whiteisland-027d7f3d.canadacentral.azurecontainerapps.io"
PREFIX="api/v1/stevenariel"
BASE_INV="https://rentcar-inventario.${DOMAIN}/${PREFIX}"
BASE_ORG="https://rentcar-org.${DOMAIN}/${PREFIX}"
BASE_OPS="https://rentcar-operaciones.${DOMAIN}/${PREFIX}"

# Token JWT de admin (válido 2h desde emisión)
TOKEN=$(cd "$(dirname "$0")/auth-service" && node -e "
const jwt = require('./node_modules/jsonwebtoken');
const token = jwt.sign(
  { id: '00000000-0000-0000-0000-000000000001', email: 'seed@rentcar.ec', role: 'ADMIN' },
  'uRb4nC4r_S3cr3t_K3y_2026_xK9mQ2nL7vR4wZ1jF8cT3hY',
  { expiresIn: '2h' }
);
console.log(token);
")
H="Authorization: Bearer $TOKEN"

post() {
  local URL="$1"
  local BODY="$2"
  local LABEL="$3"
  RESP=$(curl -s -w "\n%{http_code}" -X POST "$URL" -H "Content-Type: application/json" -H "$H" -d "$BODY" --max-time 20)
  CODE=$(echo "$RESP" | tail -1)
  BODY_RESP=$(echo "$RESP" | head -n -1)
  if [ "$CODE" = "201" ] || [ "$CODE" = "200" ]; then
    echo "  ✓ $LABEL"
    echo "$BODY_RESP"
  elif [ "$CODE" = "409" ]; then
    echo "  ~ $LABEL (ya existe)"
    echo "$BODY_RESP"
  else
    echo "  ✗ $LABEL [HTTP $CODE]: $BODY_RESP"
    echo ""
  fi
}

get_id() {
  echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null || \
  echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null
}

echo ""
echo "════════════════════════════════════════════"
echo "  RentCar EC — Seed de datos"
echo "════════════════════════════════════════════"

# ─────────────────────────────────────────────
echo ""
echo "▶ [1/5] Tipos de combustible y transmisión"
# ─────────────────────────────────────────────
post "$BASE_INV/tipos-combustible" '{"nombre":"Gasolina"}'   "Gasolina"
post "$BASE_INV/tipos-combustible" '{"nombre":"Diesel"}'     "Diesel"
post "$BASE_INV/tipos-combustible" '{"nombre":"Híbrido"}'    "Híbrido"
post "$BASE_INV/tipos-combustible" '{"nombre":"Eléctrico"}' "Eléctrico"

post "$BASE_INV/tipos-transmision" '{"nombre":"Manual"}'     "Manual"
post "$BASE_INV/tipos-transmision" '{"nombre":"Automático"}' "Automático"
post "$BASE_INV/tipos-transmision" '{"nombre":"CVT"}'        "CVT"

# ─────────────────────────────────────────────
echo ""
echo "▶ [2/5] Categorías de vehículos"
# ─────────────────────────────────────────────
R_SEDAN=$(post "$BASE_INV/categorias" '{"nombre":"Sedán","descripcion":"Vehículo familiar de 4 puertas"}' "Sedán")
R_SUV=$(post "$BASE_INV/categorias" '{"nombre":"SUV","descripcion":"Vehículo deportivo utilitario"}' "SUV")
R_CAMIONETA=$(post "$BASE_INV/categorias" '{"nombre":"Camioneta","descripcion":"Camioneta de carga y pasajeros"}' "Camioneta")
post "$BASE_INV/categorias" '{"nombre":"Hatchback","descripcion":"Vehículo compacto versátil"}' "Hatchback"
post "$BASE_INV/categorias" '{"nombre":"Van/Minivan","descripcion":"Vehículo de 7 o más pasajeros"}' "Van/Minivan"
post "$BASE_INV/categorias" '{"nombre":"Lujo","descripcion":"Vehículo de alta gama"}' "Lujo"

CAT_SEDAN=$(get_id "$R_SEDAN")
CAT_SUV=$(get_id "$R_SUV")
CAT_CAMIONETA=$(get_id "$R_CAMIONETA")
echo "  IDs → Sedán:$CAT_SEDAN | SUV:$CAT_SUV | Camioneta:$CAT_CAMIONETA"

# ─────────────────────────────────────────────
echo ""
echo "▶ [3/5] Marcas y modelos"
# ─────────────────────────────────────────────
R_TOYOTA=$(post "$BASE_INV/marcas" '{"nombre":"Toyota"}' "Toyota")
R_CHEVROLET=$(post "$BASE_INV/marcas" '{"nombre":"Chevrolet"}' "Chevrolet")
R_KIA=$(post "$BASE_INV/marcas" '{"nombre":"Kia"}' "Kia")
R_NISSAN=$(post "$BASE_INV/marcas" '{"nombre":"Nissan"}' "Nissan")
R_HYUNDAI=$(post "$BASE_INV/marcas" '{"nombre":"Hyundai"}' "Hyundai")
R_MAZDA=$(post "$BASE_INV/marcas" '{"nombre":"Mazda"}' "Mazda")
R_FORD=$(post "$BASE_INV/marcas" '{"nombre":"Ford"}' "Ford")
R_RENAULT=$(post "$BASE_INV/marcas" '{"nombre":"Renault"}' "Renault")

M_TOYOTA=$(get_id "$R_TOYOTA")
M_CHEVROLET=$(get_id "$R_CHEVROLET")
M_KIA=$(get_id "$R_KIA")
M_NISSAN=$(get_id "$R_NISSAN")
M_HYUNDAI=$(get_id "$R_HYUNDAI")
M_MAZDA=$(get_id "$R_MAZDA")
M_FORD=$(get_id "$R_FORD")
M_RENAULT=$(get_id "$R_RENAULT")

echo "  Marcas creadas. Agregando modelos..."
[ -n "$M_TOYOTA" ]    && post "$BASE_INV/modelos" "{\"marcaId\":\"$M_TOYOTA\",\"nombre\":\"Corolla\"}"    "Toyota Corolla"
[ -n "$M_TOYOTA" ]    && post "$BASE_INV/modelos" "{\"marcaId\":\"$M_TOYOTA\",\"nombre\":\"Hilux\"}"      "Toyota Hilux"
[ -n "$M_TOYOTA" ]    && post "$BASE_INV/modelos" "{\"marcaId\":\"$M_TOYOTA\",\"nombre\":\"RAV4\"}"       "Toyota RAV4"
[ -n "$M_TOYOTA" ]    && post "$BASE_INV/modelos" "{\"marcaId\":\"$M_TOYOTA\",\"nombre\":\"Fortuner\"}"   "Toyota Fortuner"
[ -n "$M_CHEVROLET" ] && post "$BASE_INV/modelos" "{\"marcaId\":\"$M_CHEVROLET\",\"nombre\":\"Sail\"}"    "Chevrolet Sail"
[ -n "$M_CHEVROLET" ] && post "$BASE_INV/modelos" "{\"marcaId\":\"$M_CHEVROLET\",\"nombre\":\"D-Max\"}"   "Chevrolet D-Max"
[ -n "$M_CHEVROLET" ] && post "$BASE_INV/modelos" "{\"marcaId\":\"$M_CHEVROLET\",\"nombre\":\"Tracker\"}" "Chevrolet Tracker"
[ -n "$M_KIA" ]       && post "$BASE_INV/modelos" "{\"marcaId\":\"$M_KIA\",\"nombre\":\"Rio\"}"           "Kia Rio"
[ -n "$M_KIA" ]       && post "$BASE_INV/modelos" "{\"marcaId\":\"$M_KIA\",\"nombre\":\"Sportage\"}"      "Kia Sportage"
[ -n "$M_KIA" ]       && post "$BASE_INV/modelos" "{\"marcaId\":\"$M_KIA\",\"nombre\":\"Sorento\"}"       "Kia Sorento"
[ -n "$M_NISSAN" ]    && post "$BASE_INV/modelos" "{\"marcaId\":\"$M_NISSAN\",\"nombre\":\"Frontier\"}"   "Nissan Frontier"
[ -n "$M_NISSAN" ]    && post "$BASE_INV/modelos" "{\"marcaId\":\"$M_NISSAN\",\"nombre\":\"X-Trail\"}"    "Nissan X-Trail"
[ -n "$M_HYUNDAI" ]   && post "$BASE_INV/modelos" "{\"marcaId\":\"$M_HYUNDAI\",\"nombre\":\"Tucson\"}"    "Hyundai Tucson"
[ -n "$M_HYUNDAI" ]   && post "$BASE_INV/modelos" "{\"marcaId\":\"$M_HYUNDAI\",\"nombre\":\"i10\"}"       "Hyundai i10"
[ -n "$M_MAZDA" ]     && post "$BASE_INV/modelos" "{\"marcaId\":\"$M_MAZDA\",\"nombre\":\"CX-5\"}"        "Mazda CX-5"
[ -n "$M_MAZDA" ]     && post "$BASE_INV/modelos" "{\"marcaId\":\"$M_MAZDA\",\"nombre\":\"Mazda3\"}"      "Mazda 3"
[ -n "$M_FORD" ]      && post "$BASE_INV/modelos" "{\"marcaId\":\"$M_FORD\",\"nombre\":\"Ranger\"}"       "Ford Ranger"
[ -n "$M_FORD" ]      && post "$BASE_INV/modelos" "{\"marcaId\":\"$M_FORD\",\"nombre\":\"EcoSport\"}"     "Ford EcoSport"
[ -n "$M_RENAULT" ]   && post "$BASE_INV/modelos" "{\"marcaId\":\"$M_RENAULT\",\"nombre\":\"Duster\"}"    "Renault Duster"
[ -n "$M_RENAULT" ]   && post "$BASE_INV/modelos" "{\"marcaId\":\"$M_RENAULT\",\"nombre\":\"Stepway\"}"   "Renault Stepway"

# ─────────────────────────────────────────────
echo ""
echo "▶ [4/5] Provincias y ciudades de Ecuador"
# ─────────────────────────────────────────────
R_PIC=$(post "$BASE_ORG/provincias" '{"nombre":"Pichincha","codigo":"P"}'     "Pichincha")
R_GUA=$(post "$BASE_ORG/provincias" '{"nombre":"Guayas","codigo":"G"}'        "Guayas")
R_AZU=$(post "$BASE_ORG/provincias" '{"nombre":"Azuay","codigo":"A"}'         "Azuay")
R_MAN=$(post "$BASE_ORG/provincias" '{"nombre":"Manabí","codigo":"M"}'        "Manabí")
R_TUN=$(post "$BASE_ORG/provincias" '{"nombre":"Tungurahua","codigo":"T"}'    "Tungurahua")
R_LRO=$(post "$BASE_ORG/provincias" '{"nombre":"El Oro","codigo":"O"}'        "El Oro")
R_IMB=$(post "$BASE_ORG/provincias" '{"nombre":"Imbabura","codigo":"I"}'      "Imbabura")
R_CHI=$(post "$BASE_ORG/provincias" '{"nombre":"Chimborazo","codigo":"CH"}'   "Chimborazo")
R_CAN=$(post "$BASE_ORG/provincias" '{"nombre":"Cañar","codigo":"CA"}'        "Cañar")
R_ESM=$(post "$BASE_ORG/provincias" '{"nombre":"Esmeraldas","codigo":"E"}'    "Esmeraldas")

P_PIC=$(get_id "$R_PIC"); P_GUA=$(get_id "$R_GUA"); P_AZU=$(get_id "$R_AZU")
P_MAN=$(get_id "$R_MAN"); P_TUN=$(get_id "$R_TUN"); P_LRO=$(get_id "$R_LRO")
P_IMB=$(get_id "$R_IMB"); P_CHI=$(get_id "$R_CHI"); P_CAN=$(get_id "$R_CAN")
P_ESM=$(get_id "$R_ESM")

echo "  Provincias listas. Agregando ciudades..."
[ -n "$P_PIC" ] && post "$BASE_ORG/ciudades" "{\"nombre\":\"Quito\",\"provinciaId\":\"$P_PIC\"}"         "Quito"
[ -n "$P_PIC" ] && post "$BASE_ORG/ciudades" "{\"nombre\":\"Cayambe\",\"provinciaId\":\"$P_PIC\"}"       "Cayambe"
[ -n "$P_PIC" ] && post "$BASE_ORG/ciudades" "{\"nombre\":\"Sangolquí\",\"provinciaId\":\"$P_PIC\"}"     "Sangolquí"
[ -n "$P_GUA" ] && post "$BASE_ORG/ciudades" "{\"nombre\":\"Guayaquil\",\"provinciaId\":\"$P_GUA\"}"     "Guayaquil"
[ -n "$P_GUA" ] && post "$BASE_ORG/ciudades" "{\"nombre\":\"Durán\",\"provinciaId\":\"$P_GUA\"}"         "Durán"
[ -n "$P_GUA" ] && post "$BASE_ORG/ciudades" "{\"nombre\":\"Samborondón\",\"provinciaId\":\"$P_GUA\"}"   "Samborondón"
[ -n "$P_AZU" ] && post "$BASE_ORG/ciudades" "{\"nombre\":\"Cuenca\",\"provinciaId\":\"$P_AZU\"}"        "Cuenca"
[ -n "$P_AZU" ] && post "$BASE_ORG/ciudades" "{\"nombre\":\"Gualaceo\",\"provinciaId\":\"$P_AZU\"}"      "Gualaceo"
[ -n "$P_MAN" ] && post "$BASE_ORG/ciudades" "{\"nombre\":\"Portoviejo\",\"provinciaId\":\"$P_MAN\"}"    "Portoviejo"
[ -n "$P_MAN" ] && post "$BASE_ORG/ciudades" "{\"nombre\":\"Manta\",\"provinciaId\":\"$P_MAN\"}"         "Manta"
[ -n "$P_TUN" ] && post "$BASE_ORG/ciudades" "{\"nombre\":\"Ambato\",\"provinciaId\":\"$P_TUN\"}"        "Ambato"
[ -n "$P_LRO" ] && post "$BASE_ORG/ciudades" "{\"nombre\":\"Machala\",\"provinciaId\":\"$P_LRO\"}"       "Machala"
[ -n "$P_IMB" ] && post "$BASE_ORG/ciudades" "{\"nombre\":\"Ibarra\",\"provinciaId\":\"$P_IMB\"}"        "Ibarra"
[ -n "$P_IMB" ] && post "$BASE_ORG/ciudades" "{\"nombre\":\"Otavalo\",\"provinciaId\":\"$P_IMB\"}"       "Otavalo"
[ -n "$P_CHI" ] && post "$BASE_ORG/ciudades" "{\"nombre\":\"Riobamba\",\"provinciaId\":\"$P_CHI\"}"      "Riobamba"
[ -n "$P_CAN" ] && post "$BASE_ORG/ciudades" "{\"nombre\":\"Azogues\",\"provinciaId\":\"$P_CAN\"}"       "Azogues"
[ -n "$P_ESM" ] && post "$BASE_ORG/ciudades" "{\"nombre\":\"Esmeraldas\",\"provinciaId\":\"$P_ESM\"}"    "Esmeraldas"

# ─────────────────────────────────────────────
echo ""
echo "▶ [5/5] Seguros, canales de venta y tarifas"
# ─────────────────────────────────────────────
post "$BASE_OPS/seguros" '{"nombre":"Básico","descripcion":"Cobertura básica contra choques","precioDia":5.00,"cobertura":"Daños propios hasta $5,000"}' "Seguro Básico"
post "$BASE_OPS/seguros" '{"nombre":"Completo","descripcion":"Cobertura total con robo incluido","precioDia":12.00,"cobertura":"Daños propios, robo total, responsabilidad civil"}' "Seguro Completo"
post "$BASE_OPS/seguros" '{"nombre":"Premium","descripcion":"Cobertura sin franquicia","precioDia":20.00,"cobertura":"Sin franquicia, asistencia 24h, vehículo de reemplazo"}' "Seguro Premium"

post "$BASE_OPS/canales-venta" '{"nombre":"Web","codigo":"WEB"}'       "Canal Web"
post "$BASE_OPS/canales-venta" '{"nombre":"Teléfono","codigo":"TEL"}'  "Canal Teléfono"
post "$BASE_OPS/canales-venta" '{"nombre":"Agencia","codigo":"AGE"}'   "Canal Agencia"
post "$BASE_OPS/canales-venta" '{"nombre":"App Móvil","codigo":"APP"}' "Canal App"

[ -n "$CAT_SEDAN" ]    && post "$BASE_OPS/tarifas" "{\"categoriaId\":\"$CAT_SEDAN\",\"nombre\":\"Sedán Estándar\",\"precioDia\":35.00,\"diasMinimos\":1}"    "Tarifa Sedán Estándar"
[ -n "$CAT_SEDAN" ]    && post "$BASE_OPS/tarifas" "{\"categoriaId\":\"$CAT_SEDAN\",\"nombre\":\"Sedán Semanal\",\"precioDia\":28.00,\"diasMinimos\":7}"     "Tarifa Sedán Semanal"
[ -n "$CAT_SUV" ]      && post "$BASE_OPS/tarifas" "{\"categoriaId\":\"$CAT_SUV\",\"nombre\":\"SUV Estándar\",\"precioDia\":55.00,\"diasMinimos\":1}"        "Tarifa SUV Estándar"
[ -n "$CAT_SUV" ]      && post "$BASE_OPS/tarifas" "{\"categoriaId\":\"$CAT_SUV\",\"nombre\":\"SUV Semanal\",\"precioDia\":45.00,\"diasMinimos\":7}"         "Tarifa SUV Semanal"
[ -n "$CAT_CAMIONETA" ] && post "$BASE_OPS/tarifas" "{\"categoriaId\":\"$CAT_CAMIONETA\",\"nombre\":\"Camioneta Estándar\",\"precioDia\":65.00,\"diasMinimos\":1}" "Tarifa Camioneta Estándar"

echo ""
echo "════════════════════════════════════════════"
echo "  ✓ Seed completado"
echo "════════════════════════════════════════════"
echo ""
