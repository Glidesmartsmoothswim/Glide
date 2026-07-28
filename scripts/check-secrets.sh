#!/usr/bin/env bash
# Guardia segreti (S-2): dopo `next build`, verifica che nessun segreto
# privilegiato sia finito nel bundle client (.next/). Esce 1 se ne trova uno.
# Da eseguire come step obbligatorio PRIMA del deploy.
#
# Regola permanente: nessuna variabile che dia accesso privilegiato può
# iniziare con NEXT_PUBLIC_.
set -euo pipefail

DIR="${1:-.next}"
if [ ! -d "$DIR" ]; then
  echo "check-secrets: '$DIR' non trovato — esegui prima 'next build'." >&2
  exit 2
fi

fail=0

# 1) Valori reali dei segreti (se presenti nell'ambiente) nel bundle.
for var in SUPABASE_SERVICE_ROLE_KEY STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET RESEND_API_KEY CRON_SECRET; do
  val="${!var:-}"
  # Ignora placeholder e valori troppo corti per essere un segreto vero.
  if [ -n "$val" ] && [ "$val" != "placeholder" ] && [ "${#val}" -ge 12 ]; then
    if grep -rqF -- "$val" "$DIR" 2>/dev/null; then
      echo "❌ LEAK: il valore di $var è presente in $DIR/" >&2
      fail=1
    fi
  fi
done

# 2) Nessuna variabile privilegiata deve iniziare con NEXT_PUBLIC_ nel codice.
if grep -rqE "NEXT_PUBLIC_[A-Z_]*(SERVICE_ROLE|SECRET|WEBHOOK|PRIVATE)" src 2>/dev/null; then
  echo "❌ Una variabile privilegiata usa il prefisso NEXT_PUBLIC_." >&2
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "✅ check-secrets: nessun segreto nel bundle."
fi
exit "$fail"
