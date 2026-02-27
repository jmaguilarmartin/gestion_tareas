#!/bin/bash
# sync-env-netlify.sh
# Lee el archivo .env y sube todas las variables a Netlify de una vez

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: no se encontró el archivo $ENV_FILE"
  exit 1
fi

echo "Sincronizando variables de entorno con Netlify..."

while IFS= read -r line || [ -n "$line" ]; do
  # Ignorar líneas vacías y comentarios
  [[ -z "$line" || "$line" =~ ^# ]] && continue

  # Separar KEY=VALUE
  key="${line%%=*}"
  value="${line#*=}"

  echo "  → Subiendo: $key"
  netlify env:set "$key" "$value"

done < "$ENV_FILE"

echo ""
echo "Listo. Desplegando a producción..."
netlify deploy --prod
