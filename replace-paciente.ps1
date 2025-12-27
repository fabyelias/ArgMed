# Script para reemplazar "Paciente" por "Usuario" en todos los archivos JSX/JS/TSX/TS
$files = Get-ChildItem -Path "src" -Recurse -Include *.jsx,*.js,*.tsx,*.ts

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($content -match "Paciente|paciente") {
        $newContent = $content -replace 'Paciente', 'Usuario' -replace 'paciente', 'usuario'
        Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8 -NoNewline
        Write-Host "Updated: $($file.FullName)"
    }
}

Write-Host "Replacement complete!"
