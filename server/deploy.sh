#!/usr/bin/env bash
# Wordt op de server gestart door GitHub Actions (via een SSH-sleutel die alleen dit script mag
# draaien). Haalt de geteste versie op en bouwt de containers opnieuw.
# Met de hand kan ook:  bash /opt/golf/server/deploy.sh
set -euo pipefail
cd "$(dirname "$0")"
# Git kan dit bestand tijdens het uitrollen vervangen; draai daarom een kopie.
if [[ -z "${GOLF_DEPLOY_COPY:-}" ]]; then
  cp "$0" /tmp/golf-deploy.sh
  GOLF_DEPLOY_COPY="$PWD" exec bash /tmp/golf-deploy.sh "$@"
fi
cd "$GOLF_DEPLOY_COPY"

exec 9>/tmp/golf-deploy.lock
flock -w 600 9   # nooit twee keer tegelijk

echo "== code ophalen"
# GitHub geeft de geteste commit mee (via SSH_ORIGINAL_COMMAND); met de hand: de standaardbranch.
REV="${1:-${SSH_ORIGINAL_COMMAND:-}}"
git -C .. fetch --quiet origin
if [[ "$REV" =~ ^[0-9a-f]{40}$ ]]; then
  git -C .. checkout --quiet --detach "$REV"
else
  git -C .. remote set-head origin --auto >/dev/null
  git -C .. checkout --quiet --detach origin/HEAD
fi
git -C .. log --oneline -1   # .env en de database blijven staan (niet in git)

echo "== containers bouwen en starten"
FILES=(-f docker-compose.yml)
if grep -q '^NPM_NETWORK=' .env 2>/dev/null; then FILES+=(-f docker-compose.npm.yml); fi
docker compose "${FILES[@]}" up -d --build --remove-orphans 2>&1 | tail -15
docker image prune -f >/dev/null
# nginx-instellingen zijn een gekoppeld bestand: opnieuw inlezen (geen herstart nodig)
docker compose "${FILES[@]}" exec -T web nginx -s reload 2>/dev/null || true

echo "== controleren"
for i in $(seq 1 20); do
  if wget -qO- http://127.0.0.1:3080/api/health 2>/dev/null || curl -fsS http://127.0.0.1:3080/api/health 2>/dev/null; then
    echo; echo "API werkt"
    docker compose "${FILES[@]}" logs --tail 5 api
    exit 0
  fi
  sleep 2
done
echo "API reageert niet na 40 seconden:"
docker compose "${FILES[@]}" logs --tail 40 api
exit 1
