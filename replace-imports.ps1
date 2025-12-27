# Script para reemplazar imports de patient por user
$files = Get-ChildItem -Path "src" -Recurse -Include *.jsx,*.js,*.tsx,*.ts

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($content -match "@/pages/patient|from '@/pages/patient|from ""@/pages/patient") {
        $newContent = $content -replace '@/pages/patient', '@/pages/user'
        Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8 -NoNewline
        Write-Host "Updated: $($file.FullName)"
    }
}

Write-Host "Import replacement complete!"
