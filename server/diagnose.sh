#!/usr/bin/env bash
# Diagnose voor golf.kapital.nl. Draai op de server in /opt/golf/server:
#   bash diagnose.sh
# en stuur de uitvoer door. Er wordt niets gewijzigd; er staan geen wachtwoorden in de uitvoer.

DOMAIN="${DOMAIN:-golf.kapital.nl}"
line() { printf '\n=== %s ===\n' "$1"; }

line "Docker-containers"
docker compose ps 2>&1 || docker-compose ps 2>&1

line "API rechtstreeks op de server (127.0.0.1:3080)"
curl -sS -m 5 http://127.0.0.1:3080/api/health 2>&1; echo

line "Wie luistert er op poort 80 en 443"
(ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null) | grep -E ':(80|443)\s' || echo "niets op 80/443"

line "Firewall"
command -v ufw >/dev/null && ufw status 2>&1 | head -20
command -v firewall-cmd >/dev/null && firewall-cmd --list-all 2>&1 | head -20
command -v nft >/dev/null && nft list ruleset 2>/dev/null | grep -E 'dport (80|443)' | head -5
iptables -S INPUT 2>/dev/null | head -15

line "DNS van $DOMAIN tegenover het IP-adres van deze server"
echo "DNS:    $(getent hosts "$DOMAIN" | awk '{print $1}' | tr '\n' ' ')"
echo "Server: $(curl -sS -m 5 https://ifconfig.me 2>/dev/null || echo onbekend) (publiek IPv4)"
echo "Server: $(curl -sS -6 -m 5 https://ifconfig.me 2>/dev/null || echo geen IPv6)"

line "HTTP en HTTPS via de domeinnaam (vanaf de server)"
curl -sS -m 10 -o /dev/null -w "http  -> %{http_code} %{redirect_url}\n" "http://$DOMAIN/" 2>&1
curl -sS -m 10 -o /dev/null -w "https -> %{http_code}\n" "https://$DOMAIN/api/health" 2>&1
curl -sS -m 10 -D - -o /dev/null -X OPTIONS -H "Origin: https://kaprudy.github.io" -H "Access-Control-Request-Method: POST" "https://$DOMAIN/api/register" 2>&1 | grep -iE '^(HTTP|access-control)'

line "Certificaat"
echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -subject -issuer -dates 2>/dev/null || echo "geen geldig certificaat gevonden"

line "Laatste meldingen van Caddy (als die draait)"
docker compose logs --tail 25 caddy 2>/dev/null | grep -viE 'debug' | tail -25

line "Laatste meldingen van de API"
docker compose logs --tail 10 api 2>&1 | tail -10

line "nginx (als die draait)"
command -v nginx >/dev/null && nginx -t 2>&1 | tail -3
ls /etc/nginx/sites-enabled 2>/dev/null
