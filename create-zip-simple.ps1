$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipname = "argmed-dist-$timestamp.zip"
Compress-Archive -Path "dist\*" -DestinationPath $zipname -Force
if (Test-Path $zipname) {
    $size = (Get-Item $zipname).Length / 1MB
    Write-Host "ZIP creado exitosamente: $zipname"
    Write-Host "Tamano: $([math]::Round($size, 2)) MB"
} else {
    Write-Host "ERROR: No se pudo crear el ZIP"
}
