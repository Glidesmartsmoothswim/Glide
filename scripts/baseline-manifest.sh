#!/usr/bin/env bash
# SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
# Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
# Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
# l'addestramento di sistemi di intelligenza artificiale sono vietati
# senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

#
# GLIDE — genera la "fotografia" del repository da sottoporre a marca temporale.
#
# Produce un manifest deterministico: elenco ordinato di tutti i file tracciati
# con il loro SHA-256, più l'impronta complessiva del manifest stesso. Chiunque,
# in futuro, può rieseguire lo script sullo stesso commit e ottenere lo stesso
# identico hash. È quella riproducibilità a rendere la prova utilizzabile.
#
# Uso:
#   ./scripts/baseline-manifest.sh                 # → baseline/AAAA-MM-GG/
#   ./scripts/baseline-manifest.sh /percorso/dove  # destinazione esplicita
#
set -euo pipefail

# --- sha256 portabile (Linux: sha256sum · macOS: shasum -a 256) -------------
if command -v sha256sum >/dev/null 2>&1; then
  SHA() { sha256sum "$@"; }
elif command -v shasum >/dev/null 2>&1; then
  SHA() { shasum -a 256 "$@"; }
else
  echo "Serve sha256sum oppure shasum." >&2
  exit 1
fi

cd "$(git rev-parse --show-toplevel)"

DATE=$(date +%Y-%m-%d)
DEST=${1:-"baseline/$DATE"}

# Rifiuta di lavorare su un albero sporco: il manifest deve corrispondere a un
# commit preciso, altrimenti non è verificabile da nessuno.
if ! git diff-index --quiet HEAD --; then
  echo "ERRORE: ci sono modifiche non committate. Committa o stasha prima." >&2
  git status --short >&2
  exit 1
fi

mkdir -p "$DEST"

COMMIT=$(git rev-parse HEAD)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
NFILES=$(git ls-files | wc -l | tr -d ' ')
MANIFEST="$DEST/MANIFEST.txt"

{
  echo "GLIDE — BASELINE DI TITOLARITA"
  echo "=============================="
  echo
  echo "Titolare:        Alessio Coppola — P.IVA 02381880505"
  echo "Opera:           GLIDE — piattaforma di coaching per il nuoto"
  echo "Data manifest:   $DATE"
  echo "Commit:          $COMMIT"
  echo "Branch:          $BRANCH"
  echo "File tracciati:  $NFILES"
  echo "Algoritmo:       SHA-256"
  echo
  echo "Elenco dei file tracciati da git, ordinati per percorso (byte a byte,"
  echo "LC_ALL=C), con impronta SHA-256 di ciascuno."
  echo
  echo "== FILE =="
} > "$MANIFEST"

# LC_ALL=C: ordinamento identico su qualsiasi macchina e locale.
while IFS= read -r -d '' f; do
  SHA "$f"
done < <(git ls-files -z | LC_ALL=C sort -z) >> "$MANIFEST"

# L'impronta si calcola sul manifest ORA COMPLETO: dopo questo punto il file
# non va più toccato, o la verifica fallisce.
( cd "$DEST" && SHA MANIFEST.txt > MANIFEST.sha256 )
ROOT_HASH=$(awk '{print $1}' "$DEST/MANIFEST.sha256")

echo
echo "Baseline creata in: $DEST"
echo "  MANIFEST.txt      elenco completo ($NFILES file)"
echo "  MANIFEST.sha256   impronta complessiva"
echo
echo "  SHA-256: $ROOT_HASH"
echo
echo "Verifica in qualsiasi momento con:"
echo "  cd $DEST && sha256sum -c MANIFEST.sha256"
echo
echo "Prossimi passi:"
echo "  1. git tag -a baseline-$DATE -m \"Baseline di titolarita $DATE\" $COMMIT"
echo "  2. marca temporale qualificata su MANIFEST.txt"
echo "     (procedura in docs/legal/baseline-temporale.md)"
echo "  3. archivia MANIFEST.txt + MANIFEST.tsr fuori dal repo, in due copie"
