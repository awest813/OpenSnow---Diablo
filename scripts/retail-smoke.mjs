#!/usr/bin/env node

import { spawn, spawnSync } from 'child_process';
import { createWriteStream, existsSync } from 'fs';
import { mkdir, rm, writeFile } from 'fs/promises';
import http from 'http';
import https from 'https';
import net from 'net';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const GAME_CANVAS_SELECTOR = '.Body canvas[width="640"][height="480"]';

function printHelp() {
  console.log(`Usage: npm run smoke:retail -- --mpq /path/to/DIABDAT.MPQ [options]

Options:
  --mpq <path>           Required retail MPQ path (or set DIABDAT_MPQ)
  --host <host>          Dev server host (default: 127.0.0.1)
  --port <port>          Dev server port (default: 5174)
  --timeout <ms>         Overall timeout budget (default: 120000)
  --artifact-dir <path>  Output directory for screenshots/logs
  --browser-path <path>  Explicit Chromium/Chrome executable path
  --headed               Run with a visible browser window
  --keep-artifacts       Preserve any previous smoke-test artifacts
`);
}

function parseArgs(argv) {
  const options = {
    host: '127.0.0.1',
    port: 5174,
    timeoutMs: 120000,
    headed: false,
    keepArtifacts: false,
    mpqPath: process.env.DIABDAT_MPQ || '',
    artifactDir: path.join(repoRoot, 'output', 'playwright', 'retail-smoke'),
    browserPath: process.env.BROWSER_EXECUTABLE_PATH || '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
    case '--mpq':
      options.mpqPath = argv[++i] || '';
      break;
    case '--host':
      options.host = argv[++i] || options.host;
      break;
    case '--port':
      options.port = Number(argv[++i] || options.port);
      break;
    case '--timeout':
      options.timeoutMs = Number(argv[++i] || options.timeoutMs);
      break;
    case '--artifact-dir':
      options.artifactDir = path.resolve(argv[++i] || options.artifactDir);
      break;
    case '--browser-path':
      options.browserPath = path.resolve(argv[++i] || options.browserPath);
      break;
    case '--headed':
      options.headed = true;
      break;
    case '--keep-artifacts':
      options.keepArtifacts = true;
      break;
    case '--help':
      printHelp();
      process.exit(0);
      break;
    default:
      if (arg.startsWith('--')) {
        throw new Error(`Unknown option: ${arg}`);
      }
    }
  }

  return options;
}

function requireMpqPath(mpqPath) {
  if (!mpqPath) {
    throw new Error('Missing MPQ path. Pass --mpq <path> or set DIABDAT_MPQ.');
  }
  const resolved = path.resolve(mpqPath);
  if (!existsSync(resolved)) {
    throw new Error(`MPQ file not found: ${resolved}`);
  }
  return resolved;
}

function findBrowserExecutable(explicitPath) {
  if (explicitPath) {
    if (!existsSync(explicitPath)) {
      throw new Error(`Browser executable not found: ${explicitPath}`);
    }
    return explicitPath;
  }

  const browserCandidates = {
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Chromium\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ],
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ],
    linux: [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
      '/usr/bin/microsoft-edge',
    ],
  };

  const candidates = browserCandidates[process.platform] || [];
  const found = candidates.find(candidate => existsSync(candidate));
  if (!found) {
    throw new Error(
      'Unable to find a local Chromium/Chrome-family browser. ' +
      'Pass --browser-path <path> or set BROWSER_EXECUTABLE_PATH.'
    );
  }
  return found;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureArtifactDir(artifactDir, keepArtifacts) {
  if (!keepArtifacts) {
    await rm(artifactDir, {recursive: true, force: true});
  }
  await mkdir(artifactDir, {recursive: true});
}

function canListenOnPort(host, port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function findAvailablePort(host, startingPort) {
  let port = startingPort;
  while (!(await canListenOnPort(host, port))) {
    port += 1;
  }
  return port;
}

function startDevServer({host, port, artifactDir}) {
  const stdoutPath = path.join(artifactDir, 'vite.stdout.log');
  const stderrPath = path.join(artifactDir, 'vite.stderr.log');
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', `npm.cmd start -- --host ${host} --port ${port}`]
    : ['start', '--', '--host', host, '--port', String(port)];
  const child = spawn(command, args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      CI: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.pipe(createWriteStream(stdoutPath));
  child.stderr.pipe(createWriteStream(stderrPath));

  return child;
}

function stopChild(child) {
  if (!child || child.killed) {
    return;
  }
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {stdio: 'ignore'});
    return;
  }
  child.kill('SIGTERM');
}

async function waitForUrl(url, timeoutMs) {
  const client = url.startsWith('https:') ? https : http;
  const end = Date.now() + timeoutMs;

  while (Date.now() < end) {
    const ready = await new Promise(resolve => {
      const request = client.get(url, response => {
        response.resume();
        resolve(response.statusCode && response.statusCode >= 200 && response.statusCode < 500);
      });
      request.on('error', () => resolve(false));
      request.setTimeout(1500, () => {
        request.destroy();
        resolve(false);
      });
    });

    if (ready) {
      return;
    }
    await sleep(500);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForCondition(check, {timeoutMs, intervalMs = 250, description}) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const value = await check();
    if (value) {
      return value;
    }
    await sleep(intervalMs);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

function sampleScreenshot(buffer, points) {
  const png = PNG.sync.read(buffer);
  return points.map(({x, y}) => {
    const clampedX = Math.min(Math.max(0, x), png.width - 1);
    const clampedY = Math.min(Math.max(0, y), png.height - 1);
    const index = (png.width * clampedY + clampedX) << 2;
    return {
      x: clampedX,
      y: clampedY,
      r: png.data[index],
      g: png.data[index + 1],
      b: png.data[index + 2],
      a: png.data[index + 3],
    };
  });
}

function brightness(pixel) {
  return pixel ? pixel.r + pixel.g + pixel.b : 0;
}

function isClassSelectFrame(samples) {
  if (!samples || samples.length < 3) {
    return false;
  }
  const brightSamples = samples.filter(sample => brightness(sample) > 70);
  return brightSamples.length >= 2;
}

async function assertBannerNeverAppears(page, durationMs) {
  const end = Date.now() + durationMs;
  while (Date.now() < end) {
    const visible = await page.locator('.multiplayerBanner').isVisible().catch(() => false);
    if (visible) {
      throw new Error('Unexpected multiplayer banner appeared during retail single-player startup.');
    }
    await sleep(250);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const mpqPath = requireMpqPath(options.mpqPath);
  const browserExecutable = findBrowserExecutable(options.browserPath);
  const artifactDir = options.artifactDir;
  const port = await findAvailablePort(options.host, options.port);
  const appUrl = `http://${options.host}:${port}/diabloweb/`;

  await ensureArtifactDir(artifactDir, options.keepArtifacts);

  const devServer = startDevServer({...options, port, artifactDir});
  let browser = null;
  let context = null;

  const cleanup = async () => {
    try {
      if (context) {
        await context.close();
      }
    } catch (error) {
      // Ignore cleanup failures.
    }
    try {
      if (browser) {
        await browser.close();
      }
    } catch (error) {
      // Ignore cleanup failures.
    }
    stopChild(devServer);
  };

  try {
    await waitForUrl(appUrl, 30000);

    browser = await chromium.launch({
      executablePath: browserExecutable,
      headless: !options.headed,
    });
    context = await browser.newContext({
      viewport: {width: 1280, height: 720},
    });

    const page = await context.newPage();
    const consoleMessages = [];

    page.on('console', message => {
      const type = message.type();
      if (type === 'warning' || type === 'error') {
        consoleMessages.push(`[${type}] ${message.text()}`);
      }
    });
    page.on('pageerror', error => {
      consoleMessages.push(`[pageerror] ${error.stack || error.message}`);
    });

    await page.goto(appUrl, {waitUntil: 'networkidle', timeout: 30000});
    await page.screenshot({path: path.join(artifactDir, '01-start-screen.png')});

    await page.locator('input[type="file"]').setInputFiles(mpqPath);
    await page.waitForSelector(GAME_CANVAS_SELECTOR, {state: 'visible', timeout: 30000});

    await assertBannerNeverAppears(page, 10000);
    await page.screenshot({path: path.join(artifactDir, '02-after-import.png')});

    const classSelectSignature = [
      {x: 325, y: 365},
      {x: 635, y: 258},
      {x: 674, y: 658},
    ];

    try {
      await waitForCondition(async () => {
        await page.mouse.click(640, 320);
        await page.keyboard.press('Escape').catch(() => {});
        await page.keyboard.press('Enter').catch(() => {});
        await sleep(1000);
        const screenshot = await page.screenshot();
        const samples = sampleScreenshot(screenshot, classSelectSignature);
        return isClassSelectFrame(samples) ? {samples, screenshot} : null;
      }, {
        timeoutMs: Math.min(options.timeoutMs, 90000),
        intervalMs: 500,
        description: 'the New Single Player Hero class selection screen',
      });
    } catch (error) {
      const screenshot = await page.screenshot({path: path.join(artifactDir, '04-class-timeout.png')});
      const sampledPixels = sampleScreenshot(screenshot, classSelectSignature);
      await writeFile(
        path.join(artifactDir, '04-class-timeout-samples.json'),
        JSON.stringify(sampledPixels, null, 2),
        'utf8'
      );
      throw error;
    }

    await page.screenshot({path: path.join(artifactDir, '03-class-select.png')});

    if (consoleMessages.length > 0) {
      await writeFile(path.join(artifactDir, 'console.log'), `${consoleMessages.join('\n')}\n`, 'utf8');
      throw new Error(`Retail smoke test logged browser warnings/errors. See ${path.join(artifactDir, 'console.log')}`);
    }

    console.log(`Retail smoke test passed.\nArtifacts: ${artifactDir}`);
  } finally {
    await cleanup();
  }
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
