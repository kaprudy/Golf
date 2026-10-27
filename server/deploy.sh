#!/usr/bin/env bash
# Wordt op de server gestart door GitHub Actions (via een SSH-sleutel die alleen dit script mag
# draaien). Haalt de laatste versie van main op en bouwt de containers opnieuw.
# Met de hand kan ook:  bash /opt/golf/server/deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

exec 9>/tmp/golf-deploy.lock
flock -w 600 9   # nooit twee keer tegelijk

echo "== code ophalen"
git -C .. fetch --quiet origin main
git -C .. checkout --quiet -B main origin/main   # .env en de database blijven staan (niet in git)
git -C .. log --oneline -1

echo "== containers bouwen en starten"
FILES=(-f docker-compose.yml)
if grep -q '^NPM_NETWORK=' .env 2>/dev/null; then FILES+=(-f docker-compose.npm.yml); fi
docker compose "${FILES[@]}" up -d --build --remove-orphans 2>&1 | tail -15
docker image prune -f >/dev/null

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
