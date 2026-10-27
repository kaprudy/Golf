// Maakt een consistente kopie van de database in /data/backups (ook terwijl de API draait).
// Gebruik: docker compose exec api node --disable-warning=ExperimentalWarning backup.js
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(process.env.DB_PATH ?? '/data/golf.db');
const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
const target = `${process.env.BACKUP_DIR ?? '/data/backups'}/golf-${stamp}.db`;
db.exec(`VACUUM INTO '${target}'`);
console.log(`Back-up gemaakt: ${target}`);
