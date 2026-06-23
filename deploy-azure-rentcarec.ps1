# ============================================================
#  deploy-azure-rentcarec.ps1
#  Despliega RentCar EC completo en Azure Container Apps
#  Ejecutar: .\deploy-azure-rentcarec.ps1
# ============================================================

$ErrorActionPreference = "Stop"

# ── Configuración ─────────────────────────────────────────────────────────────
$RG       = "rg-rentcarec"
$ACR      = "acrrentcarec"
$CAE      = "cae-rentcarec"
$LOCATION = "eastus"
$ROOT     = $PSScriptRoot

# ── Variables de entorno (leídas del .env local) ──────────────────────────────
$JWT_SECRET             = "uRb4nC4r_S3cr3t_K3y_2026_xK9mQ2nL7vR4wZ1jF8cT3hY"
$JWT_EXPIRES_IN         = "7d"
$AUTH_DATABASE_URL      = "postgresql://postgres.kkqlniegfxzujkltvwow:Stevenrosero2323@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
$AUTH_DIRECT_URL        = "postgresql://postgres.kkqlniegfxzujkltvwow:Stevenrosero2323@aws-1-us-west-2.pooler.supabase.com:5432/postgres"
$INVENTARIO_DATABASE_URL= "postgresql://postgres.lbqyzvdongzxdbidwdcg:Stevenrosero2323@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
$INVENTARIO_DIRECT_URL  = "postgresql://postgres.lbqyzvdongzxdbidwdcg:Stevenrosero2323@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
$ORG_DATABASE_URL       = "postgresql://postgres.hoauywddkwommhknuoyv:Stevenrosero2323@aws-1-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
$ORG_DIRECT_URL         = "postgresql://postgres.hoauywddkwommhknuoyv:Stevenrosero2323@aws-1-us-west-1.pooler.supabase.com:5432/postgres"
$OPERACIONES_DATABASE_URL="postgresql://postgres.lpmmxmyhzxbvjyeatmxi:Stevenrosero2323@aws-1-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
$OPERACIONES_DIRECT_URL = "postgresql://postgres.lpmmxmyhzxbvjyeatmxi:Stevenrosero2323@aws-1-us-west-1.pooler.supabase.com:5432/postgres"
$FINANCIERO_DATABASE_URL= "postgresql://postgres.miqlilcfzsbfxciyfrzp:Stevenrosero2323@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
$FINANCIERO_DIRECT_URL  = "postgresql://postgres.miqlilcfzsbfxciyfrzp:Stevenrosero2323@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
$MANTENIMIENTO_DATABASE_URL="postgresql://postgres.gcixjpcjurxolfpxvijw:Stevenrosero2323@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
$MANTENIMIENTO_DIRECT_URL="postgresql://postgres.gcixjpcjurxolfpxvijw:Stevenrosero2323@aws-1-us-west-2.pooler.supabase.com:5432/postgres"

# ── FASE 1: Infraestructura ───────────────────────────────────────────────────
Write-Host "`n[1/4] Creando infraestructura Azure...`n" -ForegroundColor Yellow

Write-Host "  Resource Group: $RG" -NoNewline
az group create --name $RG --location $LOCATION --output none
Write-Host "  OK" -ForegroundColor Green

Write-Host "  ACR: $ACR" -NoNewline
az acr create --resource-group $RG --name $ACR --sku Basic --output none 2>$null
Write-Host "  OK" -ForegroundColor Green

$ACR_SERVER = "$ACR.azurecr.io"
$ACR_CREDS  = az acr credential show --name $ACR | ConvertFrom-Json
$ACR_USER   = $ACR_CREDS.username
$ACR_PASS   = $ACR_CREDS.passwords[0].value

Write-Host "  Container Apps Environment: $CAE" -NoNewline
az containerapp env create --name $CAE --resource-group $RG --location $LOCATION --output none 2>$null
Write-Host "  OK" -ForegroundColor Green

# ── FASE 2: RabbitMQ via Azure Container Instances ───────────────────────────
Write-Host "`n[2/4] Desplegando RabbitMQ (ACI)..." -ForegroundColor Yellow

$RMQ_NAME = "rentcar-rmq"
az container create `
  --resource-group $RG `
  --name $RMQ_NAME `
  --image rabbitmq:3.13-management-alpine `
  --ports 5672 15672 `
  --environment-variables `
    RABBITMQ_DEFAULT_USER=rentcar `
    RABBITMQ_DEFAULT_PASS=rentcar2024 `
    RABBITMQ_DEFAULT_VHOST=rentcar `
  --dns-name-label $RMQ_NAME `
  --location $LOCATION `
  --cpu 0.5 --memory 1 `
  --output none 2>$null

$RMQ_HOST = "$RMQ_NAME.$LOCATION.azurecontainer.io"
$RMQ_URL  = "amqp://rentcar:rentcar2024@$RMQ_HOST:5672/rentcar"
Write-Host "  RabbitMQ: $RMQ_HOST  OK" -ForegroundColor Green

# ── FASE 3: Build & Push imágenes ─────────────────────────────────────────────
Write-Host "`n[3/4] Build & Push de imágenes a ACR...`n" -ForegroundColor Yellow

docker login $ACR_SERVER -u $ACR_USER -p $ACR_PASS --output none

$SERVICES = @(
  @{ Name="rentcar-auth";         Dir="auth-service" },
  @{ Name="rentcar-inventario";   Dir="inventario-service" },
  @{ Name="rentcar-org";          Dir="org-service" },
  @{ Name="rentcar-operaciones";  Dir="operaciones-service" },
  @{ Name="rentcar-financiero";   Dir="financiero-service" },
  @{ Name="rentcar-mantenimiento";Dir="mantenimiento-service" },
  @{ Name="rentcar-bus";          Dir="bus-service" }
)

foreach ($svc in $SERVICES) {
  $TAG = "$ACR_SERVER/$($svc.Name):latest"
  Write-Host "  Building $($svc.Name)..." -NoNewline
  docker build -t $TAG "$ROOT/$($svc.Dir)" --quiet
  docker push $TAG --quiet
  Write-Host "  OK" -ForegroundColor Green
}

# Gateway (nginx + frontend) — usa nginx-azure.conf
Write-Host "  Building rentcar-gateway..." -NoNewline
$GW_TAG = "$ACR_SERVER/rentcar-gateway:latest"
# Copia temporalmente el config de azure como default.conf
Copy-Item "$ROOT\nginx\nginx-azure.conf" "$ROOT\nginx\nginx-azure.conf.bak" -ErrorAction SilentlyContinue

$dockerfileContent = @"
FROM node:20-slim AS frontend-builder
WORKDIR /frontend
COPY rentcar-ec-frontend/package*.json ./
RUN npm install
COPY rentcar-ec-frontend/ .
RUN npm run build

FROM nginx:alpine
COPY --from=frontend-builder /frontend/dist /usr/share/nginx/html
COPY nginx/nginx-azure.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
"@
$dockerfileContent | Out-File -FilePath "$ROOT\Dockerfile.nginx.azure" -Encoding UTF8
docker build -t $GW_TAG -f "$ROOT\Dockerfile.nginx.azure" "$ROOT" --quiet
docker push $GW_TAG --quiet
Write-Host "  OK" -ForegroundColor Green

# ── FASE 4: Desplegar Container Apps ──────────────────────────────────────────
Write-Host "`n[4/4] Desplegando Container Apps...`n" -ForegroundColor Yellow

function Deploy-App {
  param($Name, $Image, $Port, $EnvVars)
  Write-Host "  $Name" -NoNewline
  $envStr = ($EnvVars | ForEach-Object { $_ }) -join " "
  az containerapp create `
    --name $Name `
    --resource-group $RG `
    --environment $CAE `
    --image $Image `
    --registry-server $ACR_SERVER `
    --registry-username $ACR_USER `
    --registry-password $ACR_PASS `
    --ingress internal `
    --target-port $Port `
    --transport auto `
    --min-replicas 1 `
    --max-replicas 2 `
    --cpu 0.25 --memory 0.5Gi `
    --env-vars $EnvVars `
    --output none 2>$null
  Write-Host "  OK" -ForegroundColor Green
}

# auth-service
Deploy-App -Name "rentcar-auth" -Image "$ACR_SERVER/rentcar-auth:latest" -Port 3001 -EnvVars @(
  "DATABASE_URL=$AUTH_DATABASE_URL"
  "DIRECT_URL=$AUTH_DIRECT_URL"
  "JWT_SECRET=$JWT_SECRET"
  "JWT_EXPIRES_IN=$JWT_EXPIRES_IN"
  "PORT=3001"
  "NODE_ENV=production"
  "CORS_ORIGIN=*"
)

# inventario-service
Deploy-App -Name "rentcar-inventario" -Image "$ACR_SERVER/rentcar-inventario:latest" -Port 3002 -EnvVars @(
  "DATABASE_URL=$INVENTARIO_DATABASE_URL"
  "DIRECT_URL=$INVENTARIO_DIRECT_URL"
  "JWT_SECRET=$JWT_SECRET"
  "PORT=3002"
  "GRPC_PORT=5002"
  "NODE_ENV=production"
  "CORS_ORIGIN=*"
  "RABBITMQ_URL=$RMQ_URL"
  "RABBITMQ_EXCHANGE=rentcar.eventos"
)

# inventario gRPC (mismo imagen, ingress en puerto gRPC con HTTP/2)
Write-Host "  rentcar-inventario-grpc" -NoNewline
az containerapp create `
  --name "rentcar-inventario-grpc" `
  --resource-group $RG `
  --environment $CAE `
  --image "$ACR_SERVER/rentcar-inventario:latest" `
  --registry-server $ACR_SERVER `
  --registry-username $ACR_USER `
  --registry-password $ACR_PASS `
  --ingress internal `
  --target-port 5002 `
  --transport http2 `
  --allow-insecure `
  --min-replicas 1 --max-replicas 2 `
  --cpu 0.25 --memory 0.5Gi `
  --env-vars `
    "DATABASE_URL=$INVENTARIO_DATABASE_URL" `
    "DIRECT_URL=$INVENTARIO_DIRECT_URL" `
    "JWT_SECRET=$JWT_SECRET" `
    "PORT=3002" `
    "GRPC_PORT=5002" `
    "NODE_ENV=production" `
    "CORS_ORIGIN=*" `
    "RABBITMQ_URL=$RMQ_URL" `
    "RABBITMQ_EXCHANGE=rentcar.eventos" `
  --output none 2>$null
Write-Host "  OK" -ForegroundColor Green

# org-service
Deploy-App -Name "rentcar-org" -Image "$ACR_SERVER/rentcar-org:latest" -Port 3003 -EnvVars @(
  "DATABASE_URL=$ORG_DATABASE_URL"
  "DIRECT_URL=$ORG_DIRECT_URL"
  "JWT_SECRET=$JWT_SECRET"
  "PORT=3003"
  "GRPC_PORT=5003"
  "NODE_ENV=production"
  "CORS_ORIGIN=*"
)

# org gRPC
Write-Host "  rentcar-org-grpc" -NoNewline
az containerapp create `
  --name "rentcar-org-grpc" `
  --resource-group $RG `
  --environment $CAE `
  --image "$ACR_SERVER/rentcar-org:latest" `
  --registry-server $ACR_SERVER `
  --registry-username $ACR_USER `
  --registry-password $ACR_PASS `
  --ingress internal `
  --target-port 5003 `
  --transport http2 `
  --allow-insecure `
  --min-replicas 1 --max-replicas 2 `
  --cpu 0.25 --memory 0.5Gi `
  --env-vars `
    "DATABASE_URL=$ORG_DATABASE_URL" `
    "DIRECT_URL=$ORG_DIRECT_URL" `
    "JWT_SECRET=$JWT_SECRET" `
    "PORT=3003" `
    "GRPC_PORT=5003" `
    "NODE_ENV=production" `
    "CORS_ORIGIN=*" `
  --output none 2>$null
Write-Host "  OK" -ForegroundColor Green

# financiero-service
Deploy-App -Name "rentcar-financiero" -Image "$ACR_SERVER/rentcar-financiero:latest" -Port 3005 -EnvVars @(
  "DATABASE_URL=$FINANCIERO_DATABASE_URL"
  "DIRECT_URL=$FINANCIERO_DIRECT_URL"
  "JWT_SECRET=$JWT_SECRET"
  "PORT=3005"
  "GRPC_PORT=5005"
  "NODE_ENV=production"
  "CORS_ORIGIN=*"
  "RABBITMQ_URL=$RMQ_URL"
  "RABBITMQ_EXCHANGE=rentcar.eventos"
)

# financiero gRPC
Write-Host "  rentcar-financiero-grpc" -NoNewline
az containerapp create `
  --name "rentcar-financiero-grpc" `
  --resource-group $RG `
  --environment $CAE `
  --image "$ACR_SERVER/rentcar-financiero:latest" `
  --registry-server $ACR_SERVER `
  --registry-username $ACR_USER `
  --registry-password $ACR_PASS `
  --ingress internal `
  --target-port 5005 `
  --transport http2 `
  --allow-insecure `
  --min-replicas 1 --max-replicas 2 `
  --cpu 0.25 --memory 0.5Gi `
  --env-vars `
    "DATABASE_URL=$FINANCIERO_DATABASE_URL" `
    "DIRECT_URL=$FINANCIERO_DIRECT_URL" `
    "JWT_SECRET=$JWT_SECRET" `
    "PORT=3005" `
    "GRPC_PORT=5005" `
    "NODE_ENV=production" `
    "CORS_ORIGIN=*" `
    "RABBITMQ_URL=$RMQ_URL" `
    "RABBITMQ_EXCHANGE=rentcar.eventos" `
  --output none 2>$null
Write-Host "  OK" -ForegroundColor Green

# operaciones-service (llama a inventario-grpc, org-grpc, financiero-grpc via gRPC)
Deploy-App -Name "rentcar-operaciones" -Image "$ACR_SERVER/rentcar-operaciones:latest" -Port 3004 -EnvVars @(
  "DATABASE_URL=$OPERACIONES_DATABASE_URL"
  "DIRECT_URL=$OPERACIONES_DIRECT_URL"
  "JWT_SECRET=$JWT_SECRET"
  "PORT=3004"
  "GRPC_PORT=5004"
  "NODE_ENV=production"
  "CORS_ORIGIN=*"
  "INVENTARIO_GRPC_HOST=rentcar-inventario-grpc:80"
  "ORG_GRPC_HOST=rentcar-org-grpc:80"
  "FINANCIERO_GRPC_HOST=rentcar-financiero-grpc:80"
  "AUTH_SERVICE_URL=http://rentcar-auth"
  "INVENTARIO_SERVICE_URL=http://rentcar-inventario"
  "RABBITMQ_URL=$RMQ_URL"
  "RABBITMQ_EXCHANGE=rentcar.eventos"
)

# mantenimiento-service
Deploy-App -Name "rentcar-mantenimiento" -Image "$ACR_SERVER/rentcar-mantenimiento:latest" -Port 3006 -EnvVars @(
  "DATABASE_URL=$MANTENIMIENTO_DATABASE_URL"
  "DIRECT_URL=$MANTENIMIENTO_DIRECT_URL"
  "JWT_SECRET=$JWT_SECRET"
  "PORT=3006"
  "NODE_ENV=production"
  "CORS_ORIGIN=*"
)

# bus-service
Deploy-App -Name "rentcar-bus" -Image "$ACR_SERVER/rentcar-bus:latest" -Port 3007 -EnvVars @(
  "JWT_SECRET=$JWT_SECRET"
  "PORT=3007"
  "NODE_ENV=production"
  "CORS_ORIGIN=*"
  "RABBITMQ_URL=$RMQ_URL"
  "RABBITMQ_EXCHANGE=rentcar.eventos"
)

# gateway (nginx) — EXTERNO
Write-Host "  rentcar-gateway (externo)" -NoNewline
az containerapp create `
  --name "rentcar-gateway" `
  --resource-group $RG `
  --environment $CAE `
  --image "$ACR_SERVER/rentcar-gateway:latest" `
  --registry-server $ACR_SERVER `
  --registry-username $ACR_USER `
  --registry-password $ACR_PASS `
  --ingress external `
  --target-port 80 `
  --transport auto `
  --min-replicas 1 --max-replicas 2 `
  --cpu 0.25 --memory 0.5Gi `
  --output none 2>$null
Write-Host "  OK" -ForegroundColor Green

# ── Resultado ─────────────────────────────────────────────────────────────────
$GW_URL = az containerapp show `
  --name rentcar-gateway `
  --resource-group $RG `
  --query "properties.configuration.ingress.fqdn" `
  --output tsv

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  DESPLIEGUE COMPLETADO" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Gateway URL: https://$GW_URL"
Write-Host "  API Base:    https://$GW_URL/api/v1"
Write-Host "  Health:      https://$GW_URL/health"
Write-Host "============================================================`n" -ForegroundColor Cyan
