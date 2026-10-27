# Golfscore-server (golf.kapital.nl)

Een kleine server voor de Golfscore-app:

- **API** (`/api/...`): inloggen met e-mail en wachtwoord, en per gebruiker de app-gegevens
  bewaren. Node.js zonder externe pakketten, met een **SQLite**-database in een Docker-volume.
- **Infopagina** (`/`): uitleg over de app, een link naar de app en wat er met je gegevens gebeurt.
- **HTTPS**: via Caddy (zet zelf een Let's Encrypt-certificaat neer), of via je bestaande nginx.

```
 telefoon (app)  ──HTTPS──▶  golf.kapital.nl
                              ├─ /        infopagina (statisch)
                              └─ /api/*   API-container ──▶ SQLite (volume golf-data)
```

## Beveiliging

- Alleen HTTPS; de API-container luistert alleen op `127.0.0.1` en is niet direct van buiten bereikbaar.
- Wachtwoorden worden opgeslagen als **scrypt**-hash; sessietokens alleen als SHA-256-hash.
- Iedere gebruiker ziet alleen zijn eigen gegevens (alles hangt aan de ingelogde gebruiker).
- Beperking op inlogpogingen (per IP-adres en per e-mailadres).
- CORS alleen voor de app (`https://kaprudy.github.io`) en `https://golf.kapital.nl`.
- De container draait niet als root. De Claude API-sleutel van de app komt nooit op de server.

## Installeren

Je hebt nodig: SSH-toegang tot de server, en **Docker** met **Docker Compose**
(`docker compose version` moet werken; zo niet: https://docs.docker.com/engine/install/).

**Tip:** werk liever niet als `root`. Maak een gewone gebruiker met `sudo` en log in met een
SSH-sleutel in plaats van een wachtwoord.

### 1. DNS

Maak bij je DNS-beheer een **A-record** `golf.kapital.nl` dat wijst naar het IP-adres van de server
(en eventueel een AAAA-record voor IPv6). Controleer met `dig +short golf.kapital.nl`.

### 2. Code op de server zetten

```bash
sudo mkdir -p /opt/golf && sudo chown "$USER" /opt/golf
git clone https://github.com/kaprudy/Golf.git /opt/golf
cd /opt/golf/server
```

### 3a. Starten – server zonder bestaande webserver

Draait er nog niets op poort 80 en 443 (controleer met `sudo ss -tlnp | grep -E ':80|:443'`):

```bash
docker compose --profile caddy up -d --build
```

Caddy vraagt het HTTPS-certificaat zelf aan. Na een minuut werkt https://golf.kapital.nl.

### 3b. Starten – er draait al nginx

```bash
docker compose up -d --build
sudo cp nginx-golf.conf /etc/nginx/sites-available/golf.kapital.nl
sudo ln -s /etc/nginx/sites-available/golf.kapital.nl /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d golf.kapital.nl
```

Gebruikt je server Apache: laat Apache `/api/` doorsturen naar `http://127.0.0.1:3080` en de map
`server/site` serveren; vraag gerust om een voorbeeldconfiguratie.

### 4. Controleren

```bash
curl https://golf.kapital.nl/api/health      # {"ok":true}
docker compose ps                             # api: healthy
```

De infopagina toont rechtsboven *"Opslagdienst werkt"*.

### 5. De app laten verbinden

Zet in `js/config.js` van de app `API_URL = 'https://golf.kapital.nl'` en publiceer de app
(of vraag het aan Claude). In de app verschijnt dan bij Instellingen **Account en cloud**.

## Beheer

| Wat | Opdracht (in `/opt/golf/server`) |
|---|---|
| Logboek bekijken | `docker compose logs -f api` |
| Bijwerken | `git pull && docker compose up -d --build` (met `--profile caddy` als je Caddy gebruikt) |
| Back-up maken | `docker compose exec api node --disable-warning=ExperimentalWarning backup.js` |
| Back-ups naar de server kopiëren | `docker compose cp api:/data/backups ./backups` |
| Stoppen | `docker compose down` (de gegevens blijven in het volume `golf-data`) |

Dagelijkse back-up via cron (`crontab -e`):

```
15 3 * * * cd /opt/golf/server && docker compose exec -T api node --disable-warning=ExperimentalWarning backup.js >/dev/null
```

Ruim oude back-ups af en toe op, en kopieer ze ook naar een andere plek dan de server zelf.

## Lokaal testen

```bash
cd server/api
npm test                                   # tests van de API
DB_PATH=./golf.db ALLOWED_ORIGINS=http://localhost:8080 npm start
```
