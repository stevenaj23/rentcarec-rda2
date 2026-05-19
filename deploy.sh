#!/bin/bash
set -e

# ── Configuración ─────────────────────────────────────────────────────────────
RESOURCE_GROUP="rg-urbancar"
LOCATION="canadacentral"
ACR_NAME="acrurbancar"
ENVIRONMENT_NAME="cae-urbancar"
DOMAIN="whiteisland-027d7f3d.canadacentral.azurecontainerapps.io"
FRONTEND_URL="https://rentcar-ec-frontend.${DOMAIN}"

# Carga las variables del .env
source .env

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   RentCar EC — Deploy en Azure Container  ║"
echo "╚══════════════════════════════════════════╝"
echo ""

ACR_SERVER="${ACR_NAME}.azurecr.io"
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" --output tsv)

# ── Build de imágenes localmente y push a ACR ─────────────────────────────────
echo "▶ [1/3] Construyendo imágenes Docker y subiendo a ACR..."
az acr login --name $ACR_NAME

build_and_push() {
  local IMAGE=$1
  local CONTEXT=$2
  docker build -t $ACR_SERVER/$IMAGE $CONTEXT
  docker push $ACR_SERVER/$IMAGE
  echo "    $IMAGE ✓"
}

build_and_push rentcar-auth:latest          ./auth-service
build_and_push rentcar-inventario:latest    ./inventario-service
build_and_push rentcar-org:latest           ./org-service
build_and_push rentcar-operaciones:latest   ./operaciones-service
build_and_push rentcar-financiero:latest    ./financiero-service
build_and_push rentcar-mantenimiento:latest ./mantenimiento-service
build_and_push rentcar-bus:latest           ./bus-service

# ── Deploy de microservicios ──────────────────────────────────────────────────
echo ""
echo "▶ [2/3] Desplegando microservicios..."

deploy_service() {
  local NAME=$1
  local IMAGE=$2
  local PORT=$3
  shift 3
  local ENVVARS=("$@")

  az containerapp create \
    --name $NAME \
    --resource-group $RESOURCE_GROUP \
    --environment $ENVIRONMENT_NAME \
    --image $ACR_SERVER/$IMAGE \
    --registry-server $ACR_SERVER \
    --registry-username $ACR_NAME \
    --registry-password $ACR_PASSWORD \
    --ingress external \
    --target-port $PORT \
    --min-replicas 1 \
    --max-replicas 2 \
    --env-vars "${ENVVARS[@]}" \
    --output none
  echo "    $NAME ✓"
}

deploy_service rentcar-auth rentcar-auth:latest 3001 \
  "DATABASE_URL=$AUTH_DATABASE_URL" \
  "DIRECT_URL=$AUTH_DIRECT_URL" \
  "JWT_SECRET=$JWT_SECRET" \
  "JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-7d}" \
  "PORT=3001" \
  "NODE_ENV=production" \
  "CORS_ORIGIN=$FRONTEND_URL"

deploy_service rentcar-inventario rentcar-inventario:latest 3002 \
  "DATABASE_URL=$INVENTARIO_DATABASE_URL" \
  "DIRECT_URL=$INVENTARIO_DIRECT_URL" \
  "JWT_SECRET=$JWT_SECRET" \
  "PORT=3002" \
  "NODE_ENV=production" \
  "CORS_ORIGIN=$FRONTEND_URL"

deploy_service rentcar-org rentcar-org:latest 3003 \
  "DATABASE_URL=$ORG_DATABASE_URL" \
  "DIRECT_URL=$ORG_DIRECT_URL" \
  "JWT_SECRET=$JWT_SECRET" \
  "PORT=3003" \
  "NODE_ENV=production" \
  "CORS_ORIGIN=$FRONTEND_URL"

deploy_service rentcar-operaciones rentcar-operaciones:latest 3004 \
  "DATABASE_URL=$OPERACIONES_DATABASE_URL" \
  "DIRECT_URL=$OPERACIONES_DIRECT_URL" \
  "JWT_SECRET=$JWT_SECRET" \
  "PORT=3004" \
  "NODE_ENV=production" \
  "CORS_ORIGIN=$FRONTEND_URL" \
  "INVENTARIO_SERVICE_URL=https://rentcar-inventario.${DOMAIN}"

deploy_service rentcar-financiero rentcar-financiero:latest 3005 \
  "DATABASE_URL=$FINANCIERO_DATABASE_URL" \
  "DIRECT_URL=$FINANCIERO_DIRECT_URL" \
  "JWT_SECRET=$JWT_SECRET" \
  "PORT=3005" \
  "NODE_ENV=production" \
  "CORS_ORIGIN=$FRONTEND_URL"

deploy_service rentcar-mantenimiento rentcar-mantenimiento:latest 3006 \
  "DATABASE_URL=$MANTENIMIENTO_DATABASE_URL" \
  "DIRECT_URL=$MANTENIMIENTO_DIRECT_URL" \
  "JWT_SECRET=$JWT_SECRET" \
  "PORT=3006" \
  "NODE_ENV=production" \
  "CORS_ORIGIN=$FRONTEND_URL"

deploy_service rentcar-bus rentcar-bus:latest 3007 \
  "JWT_SECRET=$JWT_SECRET" \
  "PORT=3007" \
  "NODE_ENV=production" \
  "CORS_ORIGIN=$FRONTEND_URL" \
  "AZURE_SERVICEBUS_CONNECTION_STRING=$AZURE_SERVICEBUS_CONNECTION_STRING" \
  "AZURE_SERVICEBUS_TOPIC=${AZURE_SERVICEBUS_TOPIC:-rentcar-ec-eventos}" \
  "OPERACIONES_SERVICE_URL=https://rentcar-operaciones.${DOMAIN}" \
  "INVENTARIO_SERVICE_URL=https://rentcar-inventario.${DOMAIN}" \
  "FINANCIERO_SERVICE_URL=https://rentcar-financiero.${DOMAIN}"

# ── Deploy frontend ───────────────────────────────────────────────────────────
echo ""
echo "▶ [3/3] Desplegando frontend Vue + Nginx..."

cd "$(dirname "$0")/../Documents/SISTEMA_ALQUILER_AUTOS_V0.1/rentcar-ec-frontend" 2>/dev/null || true
build_and_push rentcar-ec-frontend:latest .

az containerapp create \
  --name rentcar-ec-frontend \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT_NAME \
  --image $ACR_SERVER/rentcar-ec-frontend:latest \
  --registry-server $ACR_SERVER \
  --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --ingress external \
  --target-port 80 \
  --min-replicas 1 \
  --max-replicas 3 \
  --output none

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   ✓ DEPLOY COMPLETO                                      ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║   URL: $FRONTEND_URL"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
