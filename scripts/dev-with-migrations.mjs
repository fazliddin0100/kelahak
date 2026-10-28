import 'dotenv/config';

import { spawn, spawnSync } from 'node:child_process';
import {
  createCipheriv,
  randomBytes,
} from 'node:crypto';
import {
  appendFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import {
  createReadStream,
  createWriteStream,
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prismaCli = path.join(root, 'node_modules', 'prisma', 'build', 'index.js');
const baselineName = '20261028000000_baseline';
const baselineSchema = path.join(
  root,
  'prisma',
  'migrations',
  baselineName,
  'schema.prisma'
);
const encryptionKeyPath = path.resolve(
  root,
  process.env.APP_ENCRYPTION_KEY_FILE ?? 'secrets/app-encryption-key'
);
const backupDirectory = path.resolve(
  root,
  process.env.DEV_MIGRATION_BACKUP_DIR ?? 'backups/dev-migrations'
);

function fail(message) {
  throw new Error(message);
}

async function assertDevPortAvailable(port = 3001) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        reject(
          new Error(
            `127.0.0.1:${port} portida server ishlab turibdi. ` +
              'Avval oldingi npm run dev oynasida Ctrl+C bosing, so‘ng qayta ishga tushiring.'
          )
        );
        return;
      }
      reject(error);
    });
    server.listen(port, '127.0.0.1', () => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });
}

function runNode(args, { capture = false } = {}) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return result;
}

function findPgDump() {
  const command = process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump';
  const fromPath = spawnSync(command, ['--version'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (fromPath.status === 0) return command;

  if (process.platform === 'win32') {
    const programFiles = process.env.ProgramFiles ?? 'C:\\Program Files';
    const postgresRoot = path.join(programFiles, 'PostgreSQL');
    try {
      const versions = (readdirSyncSafe(postgresRoot) ?? [])
        .filter((name) => /^\d+(?:\.\d+)*$/.test(name))
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      for (const version of versions) {
        const candidate = path.join(postgresRoot, version, 'bin', command);
        if (existsSync(candidate)) return candidate;
      }
    } catch {
      // Use the clear missing-tool message below.
    }
  }
  return null;
}

// Synchronous helpers keep pg_dump discovery independent of optional packages.
function readdirSyncSafe(directory) {
  try {
    return readdirSync(directory);
  } catch {
    return null;
  }
}

function pgDumpEnvironment() {
  let url;
  try {
    url = new URL(process.env.DATABASE_URL);
  } catch {
    fail('DATABASE_URL noto‘g‘ri. .env dagi PostgreSQL manzilini tekshiring.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    fail('DATABASE_URL PostgreSQL ulanish manzili bo‘lishi kerak.');
  }

  const env = { ...process.env };
  env.PGHOST = decodeURIComponent(url.hostname);
  env.PGPORT = url.port || '5432';
  env.PGUSER = decodeURIComponent(url.username);
  env.PGDATABASE = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (url.password) env.PGPASSWORD = decodeURIComponent(url.password);
  const sslmode = url.searchParams.get('sslmode');
  if (sslmode) env.PGSSLMODE = sslmode;
  return env;
}

function readEncryptionKey() {
  let raw;
  try {
    raw = readFileSync(encryptionKeyPath, 'utf8').trim();
  } catch {
    fail(
      `Shifrlash kaliti topilmadi: ${encryptionKeyPath}. ` +
        'Secrets faylini sozlang; kalit yaratmasdan yoki almashtirmasdan davom etilmaydi.'
    );
  }
  if (!/^[a-f\d]{64}$/i.test(raw)) {
    fail('APP_ENCRYPTION_KEY_FILE ichida 32 baytli (64 hex) kalit bo‘lishi kerak.');
  }
  return Buffer.from(raw, 'hex');
}

async function encryptFileToBackup(sourcePath, destinationPath, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await writeFile(destinationPath, Buffer.concat([Buffer.from('MXD1'), iv]));
  await pipeline(
    createReadStream(sourcePath),
    cipher,
    createWriteStream(destinationPath, { flags: 'a' })
  );
  await appendFile(destinationPath, cipher.getAuthTag());
}

async function backupLegacyUploads(destination, key) {
  const source = path.join(root, 'public', 'uploads');
  try {
    await stat(source);
  } catch {
    return [];
  }

  const saved = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile()) {
        const relative = path.relative(source, fullPath);
        const encrypted = path.join(destination, 'uploads', `${relative}.mxf`);
        const bytes = await readFile(fullPath);
        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', key, iv);
        const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
        await mkdir(path.dirname(encrypted), { recursive: true });
        await writeFile(
          encrypted,
          Buffer.concat([Buffer.from('MXF1'), iv, cipher.getAuthTag(), ciphertext]),
          { mode: 0o600 }
        );
        saved.push(relative);
      }
    }
  }
  await visit(source);
  return saved;
}

async function createPreMigrationBackup(key) {
  const pgDump = findPgDump();
  if (!pgDump) {
    fail(
      'Migratsiyadan oldin backup olish uchun pg_dump topilmadi. ' +
        'PostgreSQL client tools o‘rnating va PATH ga qo‘shing; migratsiya xavfsizlik uchun to‘xtatildi.'
    );
  }

  await mkdir(backupDirectory, { recursive: true });
  const backupId = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDirectory, backupId);
  await mkdir(backupPath, { recursive: true, mode: 0o700 });
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'mexon-pg-'));
  const dumpPath = path.join(tempDirectory, 'database.dump');
  try {
    const result = spawnSync(
      pgDump,
      ['--format=custom', '--no-owner', '--no-acl', `--file=${dumpPath}`],
      { cwd: root, env: pgDumpEnvironment(), encoding: 'utf8', windowsHide: true }
    );
    if (result.status !== 0) {
      fail(`pg_dump backup yaratolmadi. ${result.stderr || result.stdout || ''}`.trim());
    }
    await encryptFileToBackup(dumpPath, path.join(backupPath, 'database.dump.mxd'), key);
    const uploads = await backupLegacyUploads(backupPath, key);
    await writeFile(
      path.join(backupPath, 'manifest.json'),
      JSON.stringify(
        { createdAt: new Date().toISOString(), database: 'AES-256-GCM encrypted', uploads },
        null,
        2
      ),
      { mode: 0o600 }
    );
    console.info(`Pre-migration encrypted backup saved: ${backupPath}`);
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

async function main() {
  await assertDevPortAvailable();
  if (!process.env.DATABASE_URL) {
    fail('.env ichida DATABASE_URL topilmadi. PostgreSQL manzilini sozlang.');
  }
  if (!readdirSyncSafe(path.dirname(prismaCli))) {
    fail('Prisma CLI topilmadi. Avval npm install bajaring.');
  }
  if (!existsSync(baselineSchema)) {
    fail(`Baseline schema topilmadi: ${baselineSchema}`);
  }

  readEncryptionKey();
  console.info('1/5 Prisma Client generatsiyasi...');
  const generate = runNode(['generate']);
  if (generate.status !== 0) fail('Prisma Client generatsiyasi muvaffaqiyatsiz tugadi.');

  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  let hasAppSchema;
  let hasMigrationTable;
  let appliedMigrations = 0;
  let appliedNames = [];
  let needsMigration = false;
  try {
    if (!prisma.userSession || !prisma.pendingUpload) {
      fail(
        'Prisma Client’da UserSession/PendingUpload modellari yo‘q. ' +
          'Joriy npm run dev jarayonini to‘xtatib, npm run dev’ni qayta boshlang.'
      );
    }
    console.info('2/5 PostgreSQL ulanishi va migration holati tekshirilmoqda...');
    const [state] = await prisma.$queryRawUnsafe(`
      SELECT
        (to_regclass('public.users') IS NOT NULL OR to_regclass('public.documents') IS NOT NULL) AS "hasAppSchema",
        (to_regclass('public._prisma_migrations') IS NOT NULL) AS "hasMigrationTable"
    `);
    hasAppSchema = state.hasAppSchema;
    hasMigrationTable = state.hasMigrationTable;
    if (hasMigrationTable) {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT migration_name
        FROM public._prisma_migrations
        WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      `);
      appliedNames = rows.map((row) => row.migration_name);
      appliedMigrations = appliedNames.length;
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Prisma Client’da')) {
      throw error;
    }
    fail(
      `PostgreSQL ga ulanib bo‘lmadi (${error.code ?? error.message}). ` +
        'DATABASE_URL, server holati va portni tekshiring.'
    );
  } finally {
    await prisma.$disconnect();
  }

  const migrationDirectories = (await readdir(path.join(root, 'prisma', 'migrations'), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  needsMigration =
    !hasMigrationTable ||
    migrationDirectories.some((name) => !appliedNames.includes(name));

  const shouldBaselineExistingDb =
    hasAppSchema && (!hasMigrationTable || appliedMigrations === 0);
  if (shouldBaselineExistingDb) {
    console.info('Mavjud DB baseline bilan solishtirilmoqda (faqat o‘qish)...');
    const diff = runNode(
      [
        'migrate',
        'diff',
        '--from-url',
        process.env.DATABASE_URL,
        '--to-schema-datamodel',
        baselineSchema,
        '--script',
      ],
      { capture: true }
    );
    if (diff.status !== 0) {
      fail(`DB baseline taqqoslash xatosi: ${diff.stderr || diff.stdout}`.trim());
    }
    if (/^\s*(CREATE|ALTER|DROP|COMMENT|GRANT|REVOKE|DO)\s/im.test(diff.stdout)) {
      fail(
        'Mavjud DB baseline sxemadan farq qiladi. Hech qanday migratsiya qo‘llanmadi; ' +
          'drift’ni alohida tekshirish kerak.'
      );
    }
  }

  const key = readEncryptionKey();
  if (needsMigration && hasAppSchema) {
    console.info('3/5 O‘zgarishdan oldin DB va eski uploadlar backup qilinmoqda...');
    await createPreMigrationBackup(key);
  } else {
    console.info('3/5 Yangi DB yoki migratsiya yo‘q; alohida pre-migration backup shart emas.');
  }

  if (shouldBaselineExistingDb) {
    console.info('Eski DB baseline migration’iga biriktirilmoqda...');
    const resolve = runNode(['migrate', 'resolve', '--applied', baselineName]);
    if (resolve.status !== 0) fail('Baseline migration’ni belgilash muvaffaqiyatsiz tugadi.');
  }

  console.info('4/5 Prisma migratsiyalari va mavjud ma’lumotlar shifrlanmoqda...');
  const deploy = runNode(['migrate', 'deploy']);
  if (deploy.status !== 0) fail('Prisma migratsiyasi muvaffaqiyatsiz tugadi; Next.js ishga tushirilmadi.');

  const encryptionEnv = {
    ...process.env,
    APP_ENCRYPTION_KEY_FILE: encryptionKeyPath,
    LEGACY_UPLOADS_DIR:
      process.env.LEGACY_UPLOADS_DIR ?? path.join(root, 'public', 'uploads'),
  };
  const dataMigration = spawnSync(
    process.execPath,
    [path.join(root, 'scripts', 'encrypt-existing-document-content.mjs')],
    { cwd: root, env: encryptionEnv, stdio: 'inherit', windowsHide: true }
  );
  if (dataMigration.status !== 0) {
    fail('Mavjud kontent/fayllarni shifrlash migratsiyasi muvaffaqiyatsiz tugadi.');
  }

  const performance = runNode([
    'db',
    'execute',
    '--file',
    path.join(root, 'prisma', 'sql', 'init-performance.sql'),
    '--schema',
    path.join(root, 'prisma', 'schema.prisma'),
  ]);
  if (performance.status !== 0) fail('DB indeks va optimizatsiyalarini qo‘llash muvaffaqiyatsiz tugadi.');

  console.info('5/5 Tayyor. Next.js development server ishga tushmoqda...');
  const nextCli = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
  const child = spawn(
    process.execPath,
    [nextCli, 'dev', '--webpack', '-H', '127.0.0.1', '-p', '3001'],
    { cwd: root, env: process.env, stdio: 'inherit', windowsHide: false }
  );
  const stop = () => child.kill('SIGINT');
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
  process.exitCode = exitCode;
}

main().catch((error) => {
  console.error(`\nMezon start tekshiruvi to‘xtadi: ${error.message}`);
  process.exitCode = 1;
});
