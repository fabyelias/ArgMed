# Script para reemplazar todas las rutas /patient/ por /user/
$files = Get-ChildItem -Path "src" -Recurse -Include *.jsx,*.js,*.tsx,*.ts

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($content -match "/patient") {
        $newContent = $content -replace '/patient', '/user'
        Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8 -NoNewline
        Write-Host "Updated: $($file.FullName)"
    }
}

Write-Host "Route replacement complete!"
