#!/usr/bin/env bash
# Turns on the To.Be voice line in one go. Run it yourself from web/ after putting
# ELEVENLABS_API_KEY=... in .env.local:
#
#   bash scripts/voice/activate.sh
#
# It creates VOICE_TOOL_SECRET (if missing), creates/updates the ElevenLabs agent, stores the agent id
# in .env.local, uploads the variables to Vercel production and redeploys. Secrets are never printed.
set -euo pipefail
cd "$(dirname "$0")/../.."
ENV=.env.local

get() { grep -E "^$1=" "$ENV" | tail -1 | cut -d= -f2- || true; }
put() { # replace or append KEY=VALUE in .env.local without echoing the value
  if grep -qE "^$1=" "$ENV"; then
    tmp=$(mktemp) && grep -vE "^$1=" "$ENV" >"$tmp" && mv "$tmp" "$ENV"
  fi
  printf '%s=%s\n' "$1" "$2" >>"$ENV"
}
vercel_set() { # name value type
  vercel env rm "$1" production --yes >/dev/null 2>&1 || true
  vercel env add "$1" production --type "$3" --value "$2" --yes >/dev/null
  echo "  ✓ Vercel: $1"
}

[ -n "$(get ELEVENLABS_API_KEY)" ] || { echo "✗ Metti prima ELEVENLABS_API_KEY=... in web/.env.local"; exit 1; }

if [ -z "$(get VOICE_TOOL_SECRET)" ]; then
  put VOICE_TOOL_SECRET "$(openssl rand -hex 32)"
  echo "✓ VOICE_TOOL_SECRET generato in .env.local"
fi

echo "→ Carico il segreto su Vercel (serve al webhook in produzione)"
vercel_set VOICE_TOOL_SECRET "$(get VOICE_TOOL_SECRET)" secret

echo "→ Creo/aggiorno l'agente ElevenLabs"
out=$(node --env-file="$ENV" scripts/voice/setup-elevenlabs.mjs)
echo "$out" | grep -v '^AGENT_ID='
agent=$(echo "$out" | grep '^AGENT_ID=' | cut -d= -f2)
[ -n "$agent" ] || { echo "✗ Nessun id agente ricevuto"; exit 1; }
put ELEVENLABS_AGENT_ID "$agent"
put NEXT_PUBLIC_ELEVENLABS_AGENT_ID "$agent"
vercel_set NEXT_PUBLIC_ELEVENLABS_AGENT_ID "$agent" config

number=$(get NEXT_PUBLIC_VOICE_NUMBER)
[ -z "$number" ] || vercel_set NEXT_PUBLIC_VOICE_NUMBER "$number" config

echo "→ Ripubblico il sito"
vercel deploy --prod --yes >/dev/null && echo "✓ Fatto: su /segnala compare «Parla con l'assistente»"
