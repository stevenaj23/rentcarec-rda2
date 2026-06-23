# ============================================================
#  pausar-azure.ps1  — Pausa todos los servicios RentCar EC
#  Ejecutar: .\pausar-azure.ps1
# ============================================================

$RESOURCE_GROUP = "rg-urbancar"
$APPS = @("rentcar-auth","rentcar-inventario","rentcar-org","rentcar-operaciones","rentcar-financiero","rentcar-mantenimiento","rentcar-bus","rentcar-gateway","rentcar-ec-frontend")

Write-Host "`nPausando RentCar EC en '$RESOURCE_GROUP'...`n" -ForegroundColor Yellow

foreach ($app in $APPS) {
    Write-Host "  $app" -NoNewline
    $latestRev = az containerapp show `
        --name $app --resource-group $RESOURCE_GROUP `
        --query "properties.latestRevisionName" --output tsv 2>&1
    if (-not $latestRev -or $latestRev -match "ERROR") {
        Write-Host "  (no encontrada)" -ForegroundColor DarkGray
        continue
    }
    az containerapp revision deactivate `
        --name $app --resource-group $RESOURCE_GROUP `
        --revision $latestRev --output none 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host "  OK" -ForegroundColor Green }
    else { Write-Host "  ERROR" -ForegroundColor Red }
}

Write-Host "`nTodos los servicios pausados. Replicas = 0, sin costo de computo." -ForegroundColor Cyan
Write-Host "Para reactivar ejecuta: .\reactivar-azure.ps1`n" -ForegroundColor Cyan
