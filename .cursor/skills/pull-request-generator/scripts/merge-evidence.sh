#!/usr/bin/env bash
# merge-evidence.sh — preserves the Evidências section from the current PR body in the new body.
# Usage: echo "$NEW_BODY" | merge-evidence.sh "$CURRENT_BODY"
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: merge-evidence.sh <current-pr-body>" >&2
  exit 1
fi

CURRENT_BODY="$1"
NEW_BODY=$(cat)

extract_evidence() {
  awk '
    /^## Evidências/ { found=1; print; next }
    found && /^## / { exit }
    found { print }
  ' <<< "$1"
}

strip_evidence() {
  awk '
    /^## Evidências/ { skip=1; next }
    skip && /^## / { skip=0 }
    skip { next }
    { print }
  ' <<< "$1"
}

EVIDENCE=$(extract_evidence "$CURRENT_BODY")

if [[ -z "$EVIDENCE" ]]; then
  echo "Aviso: seção Evidências não encontrada no body atual; usando body novo sem alteração." >&2
  echo "$NEW_BODY"
  exit 0
fi

STRIPPED=$(strip_evidence "$NEW_BODY")

# Garante linha em branco antes da seção Evidências preservada
printf '%s\n\n%s\n' "${STRIPPED%"${STRIPPED##*[![:space:]]}"}" "$EVIDENCE"
