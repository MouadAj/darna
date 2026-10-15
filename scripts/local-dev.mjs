import {accessSync, appendFileSync, existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawn, spawnSync} from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const dataDirectory = join(root, '.postgres-data');
const logFile = join(dataDirectory, 'postgres.log');
const databasePort = '55432';
const databaseUser = 'housefamily';
const databasePassword = 'housefamily';
const databaseName = 'housefamily';
const databaseUrl = `postgresql://${databaseUser}:${databasePassword}@127.0.0.1:${databasePort}/${databaseName}?schema=public`;

function findPostgresBin() {
  const candidates = [];
  const systemRoot = '/usr/lib/postgresql';
  if (existsSync(systemRoot)) {
    const versions = readdirSync(systemRoot).sort((left, right) => right.localeCompare(left, undefined, {numeric: true}));
    candidates.push(...versions.map((version) => join(systemRoot, version, 'bin')));
  }
  candidates.push('/usr/local/bin', '/usr/bin');
  for (const candidate of candidates) {
    try {
      accessSync(join(candidate, 'initdb'));
      accessSync(join(candidate, 'pg_ctl'));
      accessSync(join(candidate, 'psql'));
      return candidate;
    } catch {
      // Try the next standard PostgreSQL installation directory.
    }
  }
  throw new Error('PostgreSQL tools were not found. Install PostgreSQL 16, then run npm run dev again.');
}

const postgresBin = findPostgresBin();
const binary = (name) => join(postgresBin, name);
const postgresEnvironment = {...process.env, PGPASSWORD: databasePassword};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: options.env ?? process.env,
    encoding: 'utf8',
    stdio: options.quiet ? 'pipe' : 'inherit',
  });
  if (result.status !== 0 && !options.allowFailure) {
    const detail = options.quiet ? `\n${result.stderr || result.stdout}` : '';
    throw new Error(`${command} failed with exit code ${result.status}.${detail}`);
  }
  return result;
}

function databaseServerIsRunning() {
  if (!existsSync(join(dataDirectory, 'PG_VERSION'))) return false;
  return run(binary('pg_ctl'), ['status', '-D', dataDirectory], {quiet: true, allowFailure: true}).status === 0;
}

function portHasPostgres() {
  return run(binary('pg_isready'), ['-h', '127.0.0.1', '-p', databasePort], {quiet: true, allowFailure: true}).status === 0;
}

function initializeDatabase() {
  if (existsSync(join(dataDirectory, 'PG_VERSION'))) return;
  console.log('Preparing the Darna database for the first time…');
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'housefamily-postgres-'));
  const passwordFile = join(temporaryDirectory, 'password');
  try {
    writeFileSync(passwordFile, `${databasePassword}\n`, {mode: 0o600});
    run(binary('initdb'), [
      '-D', dataDirectory,
      '--username', databaseUser,
      '--pwfile', passwordFile,
      '--auth-local', 'trust',
      '--auth-host', 'scram-sha-256',
      '--encoding', 'UTF8',
      '--no-locale',
    ]);
    appendFileSync(
      join(dataDirectory, 'postgresql.conf'),
      `\n# Darna local development\nlisten_addresses = '127.0.0.1'\nport = ${databasePort}\n`,
    );
  } finally {
    rmSync(temporaryDirectory, {recursive: true, force: true});
  }
}

function startDatabase() {
  initializeDatabase();
  if (databaseServerIsRunning()) return false;
  if (portHasPostgres()) {
    throw new Error(`Port ${databasePort} is already used by another PostgreSQL server. Stop it, then run npm run dev again.`);
  }
  console.log(`Starting Darna PostgreSQL on port ${databasePort}…`);
  run(binary('pg_ctl'), ['start', '-D', dataDirectory, '-l', logFile, '-o', `-k ${dataDirectory}`, '-w']);
  return true;
}

function ensureDatabaseExists() {
  const lookup = run(binary('psql'), [
    '-h', '127.0.0.1', '-p', databasePort, '-U', databaseUser, '-d', 'postgres',
    '-Atqc', `SELECT 1 FROM pg_database WHERE datname = '${databaseName}'`,
  ], {quiet: true, env: postgresEnvironment});
  if (lookup.stdout.trim() === '1') return;
  run(binary('createdb'), ['-h', '127.0.0.1', '-p', databasePort, '-U', databaseUser, databaseName], {env: postgresEnvironment});
}

function databaseHasUsers() {
  const result = run(binary('psql'), [
    '-h', '127.0.0.1', '-p', databasePort, '-U', databaseUser, '-d', databaseName,
    '-Atqc', 'SELECT EXISTS (SELECT 1 FROM "User" LIMIT 1)',
  ], {quiet: true, env: postgresEnvironment});
  return result.stdout.trim() === 't';
}

function stopDatabase() {
  if (!databaseServerIsRunning()) {
    console.log('Darna PostgreSQL is already stopped.');
    return;
  }
  run(binary('pg_ctl'), ['stop', '-D', dataDirectory, '-m', 'fast', '-w']);
}

async function startWebWhenApiIsReady() {
  const deadline = Date.now() + 60_000;
  let apiReady = false;
  while (Date.now() < deadline) {
    try {
      const response = await fetch('http://127.0.0.1:4000/api/health');
      if (response.ok) {
        apiReady = true;
        break;
      }
    } catch {
      // The API watcher is still compiling.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  if (!apiReady) throw new Error('The API did not become ready within 60 seconds.');

  const web = spawn('npm', ['run', 'dev', '-w', '@housefamily/web'], {cwd: root, env: process.env, stdio: 'inherit'});
  const forward = (signal) => web.kill(signal);
  process.on('SIGINT', () => forward('SIGINT'));
  process.on('SIGTERM', () => forward('SIGTERM'));
  const exitCode = await new Promise((resolveExit) => web.once('exit', (code, signal) => resolveExit(signal ? 1 : (code ?? 0))));
  process.exit(exitCode);
}

if (process.argv.includes('--stop-db')) {
  stopDatabase();
  process.exit(0);
}

if (process.argv.includes('--web-after-api')) {
  await startWebWhenApiIsReady();
}

let startedDatabase = false;
try {
  startedDatabase = startDatabase();
  ensureDatabaseExists();

  const developmentEnvironment = {...process.env, DATABASE_URL: databaseUrl};
  run('npm', ['run', 'db:generate'], {env: developmentEnvironment});
  run('npm', ['run', 'db:migrate'], {env: developmentEnvironment});
  if (!databaseHasUsers()) run('npm', ['run', 'db:seed'], {env: developmentEnvironment});
  run('npm', ['run', 'build', '-w', '@housefamily/shared'], {env: developmentEnvironment});

  const applications = spawn('npm', ['run', 'dev:apps'], {
    cwd: root,
    env: developmentEnvironment,
    stdio: 'inherit',
    detached: process.platform !== 'win32',
  });

  let stopping = false;
  const stopApplications = (signal) => {
    if (stopping) return;
    stopping = true;
    if (process.platform === 'win32') applications.kill(signal);
    else process.kill(-applications.pid, signal);
  };
  process.on('SIGINT', () => stopApplications('SIGINT'));
  process.on('SIGTERM', () => stopApplications('SIGTERM'));

  const exitCode = await new Promise((resolveExit) => {
    applications.once('exit', (code, signal) => resolveExit(signal ? 1 : (code ?? 0)));
  });
  if (startedDatabase) stopDatabase();
  process.exit(exitCode);
} catch (error) {
  if (startedDatabase) stopDatabase();
  console.error(`\nDarna could not start: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
