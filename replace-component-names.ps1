# Script para reemplazar nombres de componentes Patient por User
$files = Get-ChildItem -Path "src" -Recurse -Include *.jsx,*.js,*.tsx,*.ts

$replacements = @{
    'PatientDashboard' = 'UserDashboard'
    'PatientHome' = 'UserHome'
    'PatientProfile' = 'UserProfile'
    'PatientLayout' = 'UserLayout'
    'PatientPaymentAlert' = 'UserPaymentAlert'
    'PatientPaymentButton' = 'UserPaymentButton'
}

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $modified = $false

    foreach ($old in $replacements.Keys) {
        $new = $replacements[$old]
        if ($content -match $old) {
            $content = $content -replace $old, $new
            $modified = $true
        }
    }

    if ($modified) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "Updated: $($file.FullName)"
    }
}

Write-Host "Component name replacement complete!"
