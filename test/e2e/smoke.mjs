/**
 * Headless Chrome e2e smoke test (chromium --headless=new semantics via
 * puppeteer-core driving the system Chrome in new-headless mode).
 *
 * Verifies against the REAL production builds + REAL local stack
 * (postgres via docker compose + NestJS API on :3000 + built Angular bundle):
 *   1. Dashboard loads and renders all 4 metric tiles.
 *   2. Navigation shell switches between Dashboard, Habits and Tasks without errors.
 *   3. A habit can be toggled (check-in) and a task can be filtered via the SQL-side filters.
 *
 * Run: node test/e2e/smoke.mjs
 * Prereqs: docker compose up -d && pnpm db:migrate && pnpm --filter api build &&
 *          pnpm --filter web build && API running on :3000
 */

import { spawn } from 'node:child_process';
import { accessSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const WEB_DIST = join(ROOT, 'apps', 'web', 'dist', 'web', 'browser');
const STATIC_PORT = 4173;
const API_PORT = process.env['API_PORT'] ?? 3000;
const CHROME_PATHS = [
  process.env['CHROME_PATH'],
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// ---------------------------------------------------------------------------
// Static server for the built Angular bundle with an /api/v1 reverse proxy.
// ---------------------------------------------------------------------------
function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');

      if (url.pathname.startsWith('/api/')) {
        const proxyReq = fetch(`http://localhost:${API_PORT}${url.pathname}${url.search}`, {
          method: req.method,
          headers: { 'Content-Type': 'application/json' },
          body: ['GET', 'HEAD'].includes(req.method ?? '')
            ? undefined
            : await new Promise((r) => {
                let body = '';
                req.on('data', (c) => (body += c));
                req.on('end', () => r(body || undefined));
              }),
        });
        const apiRes = await proxyReq;
        const text = await apiRes.text();
        res.writeHead(apiRes.status, { 'Content-Type': apiRes.headers.get('content-type') ?? 'application/json' });
        res.end(text);
        return;
      }

      let filePath = normalize(join(WEB_DIST, url.pathname === '/' ? 'index.html' : url.pathname));
      if (!filePath.startsWith(WEB_DIST)) {
        res.writeHead(403);
        res.end();
        return;
      }
      try {
        await stat(filePath);
      } catch {
        // Angular SPA history fallback
        filePath = join(WEB_DIST, 'index.html');
      }
      const content = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream' });
      res.end(content);
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });
  return new Promise((res) => server.listen(STATIC_PORT, () => res(server)));
}

// ---------------------------------------------------------------------------
// API seed helpers (exercise the real endpoints incl. SQL-side filters).
// ---------------------------------------------------------------------------
const API = `http://localhost:${API_PORT}/api/v1`;

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(`API ${method} ${path} failed: ${JSON.stringify(json.error)}`);
  return json.data;
}

async function waitFor(url, tries = 30, delayMs = 1000) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`Target not reachable: ${url}`);
}

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------
let failures = 0;
function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  if (!ok) failures++;
  process.stdout.write(`${ok ? '✔' : '✖'} ${name}${ok || !detail ? '' : ` — ${detail}`}\n`);
}

// ---------------------------------------------------------------------------
// Smoke test
// ---------------------------------------------------------------------------
let apiProcess;
const isApiRunning = await fetch(`${API}/health`).then((r) => r.ok).catch(() => false);
if (!isApiRunning) {
  const apiDist = join(ROOT, 'apps', 'api', 'dist', 'main.js');
  apiProcess = spawn('node', [apiDist], {
    cwd: join(ROOT, 'apps', 'api'),
    stdio: 'ignore',
    env: { ...process.env, PORT: String(API_PORT) },
  });
}

const server = await startServer();
let browser;
try {
  await waitFor(`${API}/tasks`);

  // --- Seed through the real API (SQL-side filter data) ---
  await api('POST', '/tasks', { title: 'E2E filtered task', priority: 'CRITICAL', status: 'TODO' });
  await api('POST', '/tasks', { title: 'E2E background task', priority: 'LOW', status: 'BACKLOG' });
  const habit = await api('POST', '/habits', { title: 'E2E toggle habit', frequency: 'DAILY' });

  // --- Launch headless Chrome ---
  const executablePath = CHROME_PATHS.find((p) => {
    try {
      accessSync(p);
      return true;
    } catch {
      return false;
    }
  });
  browser = await puppeteer.launch({
    executablePath,
    headless: true, // puppeteer >= 22 maps this to the new headless (--headless=new)
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto(`http://localhost:${STATIC_PORT}/dashboard`, { waitUntil: 'networkidle0', timeout: 30_000 });

  // 1. Dashboard renders all 4 metric tiles
  await page.waitForSelector('app-metric-tile', { timeout: 15_000 });
  await new Promise((r) => setTimeout(r, 1000));
  const tileCount = await page.$$eval('app-metric-tile', (els) => els.length);
  check('dashboard renders all 4 metric tiles', tileCount === 4, `found ${tileCount}`);

  // 2. Navigation shell switches between Dashboard, Habits and Tasks
  for (const [label, selector, path] of [
    ['Habits', 'app-habits-page app-habit-card', '/habits'],
    ['Tasks', 'app-tasks-page app-task-card', '/tasks'],
    ['Dashboard', 'app-metric-tile', '/dashboard'],
  ]) {
    await page.goto(`http://localhost:${STATIC_PORT}${path}`, { waitUntil: 'networkidle0', timeout: 30_000 });
    try {
      await page.waitForSelector(selector, { timeout: 15_000 });
      check(`navigation to ${label} (${path}) renders without errors`, true);
    } catch {
      check(`navigation to ${label} (${path}) renders without errors`, false, `missing ${selector}`);
    }
  }
  check(
    'no uncaught page errors during navigation',
    pageErrors.length === 0,
    pageErrors.slice(0, 3).join(' | '),
  );

  // 3a. Habit toggle: click the check-in button on the first habit card
  await page.goto(`http://localhost:${STATIC_PORT}/habits`, { waitUntil: 'networkidle0', timeout: 30_000 });
  await page.waitForSelector('app-habit-card button[type="button"]', { timeout: 15_000 });
  const habitCountBefore = await page.$$eval('app-habit-card', (els) => els.length);
  // Click via DOM dispatch: some headless viewports report zero-size
  // clickable points for SVG-bearing round buttons.
  const clicked = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('app-habit-card button[type="button"]')];
    const target =
      buttons.find((b) => (b.getAttribute('aria-label') ?? '').startsWith('Check in')) ?? buttons[0];
    if (!target) return false;
    target.click();
    return true;
  });
  check('habit check-in button is present and clickable', clicked && habitCountBefore > 0);
  await new Promise((r) => setTimeout(r, 1500));
  const habitAfterToggle = await api('GET', `/habits/${habit.id}`);
  check(
    'habit toggling issues a check-in through the UI',
    habitCountBefore > 0 && habitAfterToggle.totalLogsThisPeriod >= 1,
    `totalLogsThisPeriod=${habitAfterToggle.totalLogsThisPeriod}`,
  );

  // 3b. Task filter: set the priority filter select to LOW and observe the list
  await page.goto(`http://localhost:${STATIC_PORT}/tasks`, { waitUntil: 'networkidle0', timeout: 30_000 });
  // The page renders a mobile list (md:hidden) and a desktop kanban grid
  // (hidden md:grid); scope all counts to the desktop grid to avoid double counts.
  const DESKTOP_CARDS = '.hidden.md\\:grid app-task-card';
  await page.waitForSelector(DESKTOP_CARDS, { timeout: 15_000 });
  const allTasks = await page.$$eval(DESKTOP_CARDS, (els) => els.length);

  // The toolbar renders status + priority selects; pick the priority one (second select).
  const selects = await page.$$('app-task-filter-toolbar select');
  await selects[1].select('LOW');
  await new Promise((r) => setTimeout(r, 1500));
  const filteredTasks = await page.$$eval(DESKTOP_CARDS, (els) => els.length);
  const serverFiltered = await api('GET', '/tasks?priority=LOW');
  check(
    'task priority filter narrows the list via the SQL-side filter',
    filteredTasks < allTasks && filteredTasks === serverFiltered.length,
    `all=${allTasks} filtered=${filteredTasks} server=${serverFiltered.length}`,
  );

  // 4. Mobile viewport (360px) responsive layout verification
  await page.setViewport({ width: 360, height: 740 });
  await page.goto(`http://localhost:${STATIC_PORT}/tasks`, { waitUntil: 'networkidle0', timeout: 30_000 });
  const mobileNav = await page.$('nav.md\\:hidden');
  const mobileCards = await page.$$eval('.grid.grid-cols-1.md\\:hidden app-task-card', (els) => els.length);
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check(
    'mobile 360px layout renders single-column tasks with zero horizontal overflow',
    !horizontalOverflow && mobileCards > 0 && mobileNav !== null,
    `overflow=${horizontalOverflow} cards=${mobileCards}`,
  );

  process.exitCode = failures === 0 ? 0 : 1;
  process.stdout.write(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}\n`);
} catch (err) {
  failures++;
  process.exitCode = 1;
  process.stdout.write(`FATAL: ${err?.stack ?? err}\n`);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (apiProcess) apiProcess.kill('SIGTERM');
  server.close();
}
