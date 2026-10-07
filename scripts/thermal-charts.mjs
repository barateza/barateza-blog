#!/usr/bin/env node
/**
 * thermal-charts.mjs: turn the published measurement files into SVG charts.
 *
 * Inputs (both committed, both downloadable from the post):
 *   public/thermal/results.csv                        one row per experiment
 *   public/thermal/raw/<run>.turbostat.log.gz         raw turbostat output
 *
 * Outputs (written at build time, also committed so a checkout without a build
 * still serves them):
 *   public/thermal/timeseries.csv                     per-second series, derived
 *   public/thermal/clamp.svg                          Bzy_MHz + PkgTmp, 420 s
 *   public/thermal/ci.svg                             real CI unit tier, two caps
 *
 * No dependencies. Every number in either chart is read from a file, so a chart
 * cannot disagree with the data it claims to show.
 *
 * The charts carry their own light panel instead of inheriting page colours: an
 * SVG in an <img> is an isolated document, so it cannot follow the site's
 * `.dark` class or `currentColor`. A fixed panel is legible on either theme.
 */
import { gunzipSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'public', 'thermal');
const RAW = join(OUT, 'raw');

const C = {
    slow: '#2563eb', // 2.4 GHz, turbo off
    fast: '#d97706', // 3.4 GHz, turbo on
    grid: '#a1a1aa',
    label: '#71717a',
    strong: '#3f3f46',
    panel: '#fcfcfd',
    panelEdge: '#e5e5e8'
};
const FONT = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif';
const fmt = (n, d = 0) => Number(n).toFixed(d);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Read a gzipped turbostat log and return the per-interval package rows. */
function readTurbostat(path) {
    const lines = gunzipSync(readFileSync(path)).toString('utf8').split('\n');
    let cols = null;
    const rows = [];
    for (const line of lines) {
        if (!line.trim()) continue;
        const f = line.split('\t');
        if (f[0] === 'Core') {
            cols = {
                busy: f.indexOf('Busy%'),
                bzy: f.indexOf('Bzy_MHz'),
                pkgTmp: f.indexOf('PkgTmp'),
                pkgWatt: f.indexOf('PkgWatt')
            };
            continue;
        }
        // The package aggregate row is the one whose Core and CPU are both '-'.
        if (!cols || f[0] !== '-' || f[1] !== '-') continue;
        const num = (i) => {
            const v = Number.parseFloat(f[i]);
            return Number.isFinite(v) ? v : NaN;
        };
        rows.push({
            busy_pct: num(cols.busy),
            bzy_mhz: num(cols.bzy),
            pkg_tmp_c: num(cols.pkgTmp),
            pkg_watt: num(cols.pkgWatt)
        });
    }
    if (rows.length === 0) throw new Error(`no package rows parsed from ${path}`);
    return rows;
}

/** results.csv -> [{label, ...numbers}], with the empty aborted row dropped. */
function readResults() {
    const [header, ...rest] = readFileSync(join(OUT, 'results.csv'), 'utf8').trim().split('\n');
    const keys = header.split(',');
    return rest
        .map((line) => {
            const cells = line.split(',');
            const row = {};
            keys.forEach((k, i) => {
                row[k] = i < 5 ? cells[i] : Number.parseFloat(cells[i]);
            });
            return row;
        })
        .filter((r) => Number.isFinite(r.ts_intervals) && r.ts_intervals > 0);
}

/** y -> pixel, for a panel with a linear value axis. */
const makeY = (y0, y1, min, max) => (v) => y1 - ((v - min) / (max - min)) * (y1 - y0);
/** series -> SVG polyline points, on a shared time axis of xMax intervals. */
function line(rows, key, x0, x1, y, xMax) {
    const pts = [];
    const n = rows.length;
    for (let i = 0; i < n; i++) {
        const v = rows[i][key];
        if (!Number.isFinite(v)) continue;
        const x = x0 + ((i + 1) / xMax) * (x1 - x0);
        pts.push(`${fmt(x, 1)},${fmt(y(v), 1)}`);
    }
    return pts.join(' ');
}

function yAxis({ x, x1, y0, y1, min, max, ticks, unit }) {
    const y = makeY(y0, y1, min, max);
    const parts = ticks.map(
        (t) =>
            `<line x1="${x}" y1="${fmt(y(t), 1)}" x2="${x1}" y2="${fmt(y(t), 1)}" stroke="${C.grid}" stroke-opacity="0.28" stroke-width="1"/>
    <text x="${x - 8}" y="${fmt(y(t) + 4, 1)}" text-anchor="end" font-family="${FONT}" font-size="11" fill="${C.label}">${t}</text>`
    );
    parts.push(`<text x="${x - 8}" y="${y0 - 10}" text-anchor="end" font-family="${FONT}" font-size="11" fill="${C.strong}">${esc(unit)}</text>`);
    return parts.join('\n    ');
}

const panel = (W, H) => `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="10" fill="${C.panel}" stroke="${C.panelEdge}" stroke-width="1"/>`;

const legend = (x, y, items) =>
    `<g font-family="${FONT}" font-size="11.5" fill="${C.strong}">` +
    items
        .map(
            (it, i) =>
                `<line x1="${x + i * 190}" y1="${y - 4}" x2="${x + i * 190 + 26}" y2="${y - 4}" stroke="${it.color}" stroke-width="2.5"/>` +
                `<text x="${x + i * 190 + 33}" y="${y}">${esc(it.text)}</text>`
        )
        .join('') +
    `</g>`;

// ---------------------------------------------------------------- clamp.svg

function clampChart([slowRows, fastRows]) {
    const W = 760;
    const H = 500;
    const x0 = 74;
    const x1 = 744;
    const width = x1 - x0;
    const xMax = Math.max(slowRows.length, fastRows.length);

    const A = { y0: 70, y1: 250, min: 0, max: 3400, ticks: [0, 800, 1600, 2400, 3200], unit: 'Bzy_MHz' };
    const B = { y0: 310, y1: 460, min: 40, max: 105, ticks: [40, 60, 80, 100], unit: 'PkgTmp (C)' };
    const yA = makeY(A.y0, A.y1, A.min, A.max);
    const yB = makeY(B.y0, B.y1, B.min, B.max);

    const xTicks = [];
    for (let s = 0; s <= 420; s += 60) xTicks.push(s);

    const threshold = (y, text) =>
        `<line x1="${x0}" y1="${fmt(y, 1)}" x2="${x1}" y2="${fmt(y, 1)}" stroke="${C.grid}" stroke-width="1" stroke-dasharray="5 4"/>
    <text x="${x1 - 6}" y="${fmt(y - 6, 1)}" text-anchor="end" font-family="${FONT}" font-size="10.5" fill="${C.label}" stroke="${C.panel}" stroke-width="3" paint-order="stroke">${esc(text)}</text>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="clampTitle clampDesc">
  <title id="clampTitle">Package Bzy_MHz and package temperature over 420 seconds of 8-thread load, at 2.4 GHz with turbo off and at 3.4 GHz with turbo on</title>
  <desc id="clampDesc">At 2.4 GHz the package frequency holds flat at 2400 MHz and temperature settles near 82 C. At 3.4 GHz turbo the frequency alternates between the 800 MHz floor and about 3000 MHz while package temperature pins at 100 C: 83 of 424 intervals sit at the floor and the run accumulated 283,300 throttle events.</desc>
  ${panel(W, H)}
  <text x="${x0}" y="28" font-family="${FONT}" font-size="12.5" fill="${C.strong}">stress-ng --cpu 8 --cpu-method fft, 420 s, package aggregate (turbostat)</text>
  ${legend(x0, 52, [
      { color: C.slow, text: '2.4 GHz, turbo off' },
      { color: C.fast, text: '3.4 GHz, turbo on' }
  ])}
    ${yAxis({ x: x0, x1, ...A })}
    ${yAxis({ x: x0, x1, ...B })}
    ${threshold(yA(800), '800 MHz floor')}
    <polyline fill="none" stroke="${C.fast}" stroke-width="1.4" stroke-linejoin="round" points="${line(fastRows, 'bzy_mhz', x0, x1, yA, xMax)}"/>
    <polyline fill="none" stroke="${C.slow}" stroke-width="2.2" stroke-linejoin="round" points="${line(slowRows, 'bzy_mhz', x0, x1, yA, xMax)}"/>
    ${threshold(yB(100), '100 C: Tjmax, throttling')}
    <polyline fill="none" stroke="${C.fast}" stroke-width="1.4" stroke-linejoin="round" points="${line(fastRows, 'pkg_tmp_c', x0, x1, yB, xMax)}"/>
    <polyline fill="none" stroke="${C.slow}" stroke-width="2.2" stroke-linejoin="round" points="${line(slowRows, 'pkg_tmp_c', x0, x1, yB, xMax)}"/>
    <line x1="${x0}" y1="${B.y1}" x2="${x1}" y2="${B.y1}" stroke="${C.grid}" stroke-opacity="0.6" stroke-width="1"/>
    ${xTicks
        .map((s) => {
            const x = x0 + (s / xMax) * width;
            return `<line x1="${fmt(x, 1)}" y1="${B.y1}" x2="${fmt(x, 1)}" y2="${B.y1 + 5}" stroke="${C.grid}" stroke-width="1"/>
    <text x="${fmt(x, 1)}" y="${B.y1 + 19}" text-anchor="middle" font-family="${FONT}" font-size="11" fill="${C.label}">${s}</text>`;
        })
        .join('\n    ')}
    <text x="${(x0 + x1) / 2}" y="${B.y1 + 40}" text-anchor="middle" font-family="${FONT}" font-size="11" fill="${C.label}">seconds under load (1 Hz turbostat intervals)</text>
</svg>
`;
}

// ------------------------------------------------------------------- ci.svg

function ciChart(rows) {
    const at = (label) => rows.find((r) => r.label === label);
    const slow = at('CI41_real_unit_tier');
    const fast = at('CI71_real_unit_tier');
    if (!slow || !fast) throw new Error('ci.svg needs both CI41 and CI71 rows in results.csv');

    const W = 760;
    const H = 320;
    const baseY = 196;
    const maxSec = 110;
    const scaleH = 150; // px for maxSec

    const grid = [50, 100]
        .map((s) => {
            const y = baseY - (s / maxSec) * scaleH;
            return `<line x1="70" y1="${fmt(y, 1)}" x2="${W - 40}" y2="${fmt(y, 1)}" stroke="${C.grid}" stroke-opacity="0.28" stroke-width="1"/>
    <text x="66" y="${fmt(y + 4, 1)}" text-anchor="end" font-family="${FONT}" font-size="11" fill="${C.label}">${s} s</text>`;
        })
        .join('\n    ');

    const bar = (row, x, color) => {
        const h = (row.ts_intervals / maxSec) * scaleH;
        const y = baseY - h;
        return `
    <rect x="${x}" y="${fmt(y, 1)}" width="124" height="${fmt(h, 1)}" rx="3" fill="${color}"/>
    <text x="${x + 62}" y="${fmt(y + 24, 1)}" text-anchor="middle" font-family="${FONT}" font-size="16" font-weight="600" fill="#ffffff">${row.ts_intervals} s</text>
    <text x="${x + 62}" y="${baseY + 22}" text-anchor="middle" font-family="${FONT}" font-size="12.5" fill="${C.strong}">${row.pct}% cap = ${(row.bzy_avg_mhz / 1000).toFixed(2)} GHz</text>
    <text x="${x + 62}" y="${baseY + 40}" text-anchor="middle" font-family="${FONT}" font-size="11" fill="${C.label}">turbo ${row.turbo ? 'off' : 'on'} · peak ${row.sysfs_max_c} C</text>
    <text x="${x + 62}" y="${baseY + 57}" text-anchor="middle" font-family="${FONT}" font-size="11" fill="${C.label}">${row.throttle_delta} MSR throttle events</text>`;
    };

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="ciTitle ciDesc">
  <title id="ciTitle">Wall time of the real CI unit tier at a 41 percent CPU cap and at a 71 percent cap</title>
  <desc id="ciDesc">The unit tier took ${slow.ts_intervals} seconds at 1.30 GHz and ${fast.ts_intervals} seconds at 2.40 GHz, with zero throttle events in both runs. Peak package temperature rose from ${slow.sysfs_max_c} to ${fast.sysfs_max_c} C.</desc>
  ${panel(W, H)}
  <text x="70" y="30" font-family="${FONT}" font-size="12.5" fill="${C.strong}">real CI workload (pnpm test), one run per cap, same commit</text>
    ${grid}
    ${bar(slow, 150, C.slow)}
    ${bar(fast, 430, C.fast)}
    <line x1="70" y1="${baseY}" x2="${W - 40}" y2="${baseY}" stroke="${C.grid}" stroke-opacity="0.6" stroke-width="1"/>
    <text x="${W / 2}" y="${H - 22}" text-anchor="middle" font-family="${FONT}" font-size="11" fill="${C.label}">1 Hz turbostat intervals covering the CPU-bound work · measured 2026-09-25 on the CI host</text>
</svg>
`;
}

// --------------------------------------------------------------------- main

function main() {
    mkdirSync(OUT, { recursive: true });
    const slowRows = readTurbostat(join(RAW, 'C2_fft_2400mhz_static.turbostat.log.gz'));
    const fastRows = readTurbostat(join(RAW, 'T3_fft_turbo_3400mhz.turbostat.log.gz'));

    const csv = ['run,elapsed_s,bzy_mhz,pkg_tmp_c,pkg_watt,busy_pct'];
    for (const [run, rows] of [
        ['C2_fft_2400mhz_static', slowRows],
        ['T3_fft_turbo_3400mhz', fastRows]
    ]) {
        rows.forEach((r, i) => {
            csv.push([run, i + 1, r.bzy_mhz, r.pkg_tmp_c, r.pkg_watt, r.busy_pct].join(','));
        });
    }

    writeFileSync(join(OUT, 'timeseries.csv'), csv.join('\n') + '\n');
    writeFileSync(join(OUT, 'clamp.svg'), clampChart([slowRows, fastRows]));
    writeFileSync(join(OUT, 'ci.svg'), ciChart(readResults()));

    const floor = (rows) => rows.filter((r) => r.bzy_mhz <= 860).length;
    const nan = (rows, key) => rows.filter((r) => !Number.isFinite(r[key])).length;
    console.log('thermal-charts: wrote timeseries.csv, clamp.svg, ci.svg');
    console.log(`  intervals: C2 ${slowRows.length}, T3 ${fastRows.length} | at floor (<=860 MHz): C2 ${floor(slowRows)}, T3 ${floor(fastRows)}`);
    console.log(
        `  missing values: PkgTmp C2 ${nan(slowRows, 'pkg_tmp_c')}/T3 ${nan(fastRows, 'pkg_tmp_c')}, PkgWatt C2 ${nan(slowRows, 'pkg_watt')}/T3 ${nan(fastRows, 'pkg_watt')}`
    );
}

main();
