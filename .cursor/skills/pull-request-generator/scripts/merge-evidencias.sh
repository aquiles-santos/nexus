#!/usr/bin/env bash
# merge-evidencias.sh — preserva a seção Evidências do body atual da PR no body novo.
# Uso: echo "$NEW_BODY" | merge-evidencias.sh "$CURRENT_BODY"
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: merge-evidencias.sh <current-pr-body>" >&2
  exit 1
fi

CURRENT_BODY="$1"
NEW_BODY=$(cat)

extract_evidencias() {
  awk '
    /^## Evidências/ { found=1; print; next }
    found && /^## / { exit }
    found { print }
  ' <<< "$1"
}

strip_evidencias() {
  awk '
    /^## Evidências/ { skip=1; next }
    skip && /^## / { skip=0 }
    skip { next }
    { print }
  ' <<< "$1"
}

EVIDENCIAS=$(extract_evidencias "$CURRENT_BODY")

if [[ -z "$EVIDENCIAS" ]]; then
  echo "Aviso: seção Evidências não encontrada no body atual; usando body novo sem alteração." >&2
  echo "$NEW_BODY"
  exit 0
fi

STRIPPED=$(strip_evidencias "$NEW_BODY")

# Garante linha em branco antes da seção Evidências preservada
printf '%s\n\n%s\n' "${STRIPPED%"${STRIPPED##*[![:space:]]}"}" "$EVIDENCIAS"
