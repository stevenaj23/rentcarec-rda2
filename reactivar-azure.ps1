# ============================================================
#  reactivar-azure.ps1  — Reactiva todos los servicios RentCar EC
#  Ejecutar: .\reactivar-azure.ps1
# ============================================================

$RESOURCE_GROUP = "rg-urbancar"
$APPS = @("rentcar-auth","rentcar-inventario","rentcar-org","rentcar-operaciones","rentcar-financiero","rentcar-mantenimiento","rentcar-bus","rentcar-gateway","rentcar-ec-frontend")

Write-Host "`nReactivando RentCar EC en '$RESOURCE_GROUP'...`n" -ForegroundColor Yellow

foreach ($app in $APPS) {
    Write-Host "  $app" -NoNewline
    $latestRev = az containerapp show `
        --name $app --resource-group $RESOURCE_GROUP `
        --query "properties.latestRevisionName" --output tsv 2>&1
    if (-not $latestRev -or $latestRev -match "ERROR") {
        Write-Host "  (no encontrada)" -ForegroundColor DarkGray
        continue
    }
    az containerapp revision activate `
        --name $app --resource-group $RESOURCE_GROUP `
        --revision $latestRev --output none 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host "  OK  ($latestRev)" -ForegroundColor Green }
    else { Write-Host "  ERROR" -ForegroundColor Red }
}

Write-Host "`nTodos los servicios activos. Arrancan en ~30 segundos." -ForegroundColor Cyan
Write-Host "Gateway: https://rentcar-gateway.whiteisland-027d7f3d.canadacentral.azurecontainerapps.io`n" -ForegroundColor Cyan
