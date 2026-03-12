# sync-env-netlify.ps1
# Lee el archivo .env y sube todas las variables a Netlify de una vez

$envFile = ".env"

if (-Not (Test-Path $envFile)) {
    Write-Error "Error: no se encontró el archivo $envFile"
    exit 1
}

Write-Host "Sincronizando variables de entorno con Netlify..."

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()

    # Ignorar líneas vacías y comentarios
    if ($line -eq "" -or $line.StartsWith("#")) { return }

    # Separar KEY=VALUE
    $parts = $line -split "=", 2
    $key   = $parts[0].Trim()
    $value = $parts[1].Trim()

    Write-Host "  → Subiendo: $key"
    netlify env:set $key $value
}

Write-Host ""
Write-Host "Listo. Desplegando a producción..."
netlify deploy --prod
