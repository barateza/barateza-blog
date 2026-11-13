#!/usr/bin/env node
/**
 * k3-charts.mjs: the three figures for "The spread is wider than the gap".
 *
 * Input:  public/k3/results.json   (the 24 measured draws, committed)
 * Output: public/k3/draws.svg      the three draws per cell, per issue
 *         public/k3/interval.svg   the 95% interval against the resolution rule
 *         public/k3/regressions.svg which of the 24 draws broke a neighbouring test
 *
 * No dependencies, same conventions as thermal-charts.mjs: every number is read
 * from the data file, so a figure cannot disagree with the post; a fixed light
 * panel because an SVG inside <img> cannot inherit the site theme; direct
 * labels instead of legends where a label fits; no gridlines that carry no data.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'public', 'k3');
const D = JSON.parse(readFileSync(join(OUT, 'results.json'), 'utf8'));

const C = {
    shipped: '#2563eb',
    challenger: '#d97706',
    broke: '#b91c1c',
    grid: '#a1a1aa',
    label: '#71717a',
    strong: '#3f3f46',
    panel: '#fcfcfd',
    panelEdge: '#e5e5e8'
};
const FONT = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif';
const n = (v) => Math.round(v * 10) / 10;
const panel = (W, H) =>
    `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="10" fill="${C.panel}" stroke="${C.panelEdge}" stroke-width="1"/>`;
const head = (title, sub) =>
    `<text x="28" y="30" font-family="${FONT}" font-size="12.5" fill="${C.strong}">${title}</text>` +
    `<text x="28" y="48" font-family="${FONT}" font-size="11" fill="${C.label}">${sub}</text>`;
const svg = (W, H, body) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    panel(W, H) +
    `<g font-family="${FONT}">${body}</g></svg>\n`;

// ------------------------------------------------------------- draws.svg
// One row per arm per issue. A light bar spans that cell's three draws and the
// three dots sit on the values; coincident draws stack so three identical
// results still read as three results. The axis runs to zero because the empty
// space below 2 is itself a finding, and it is labelled as one.
function draws() {
    const W = 760, H = 428;
    const x0 = 186, x1 = 700, vmax = 4;
    const x = (v) => x0 + (v / vmax) * (x1 - x0);
    const rows = [];
    for (const issue of D.issues) {
        for (const arm of ['shipped', 'challenger']) {
            rows.push({ issue: issue.id, checks: issue.checks, arm, vals: issue.draws[arm], color: C[arm] });
        }
    }
    const top = 84, step = 36, pairGap = 10;
    const cy = (i) => top + step * i + pairGap * Math.floor(i / 2) + 13;
    const bottom = cy(rows.length - 1) + 18;
    const parts = [
        head('Three draws per cell', 'checks met, out of each issue’s rubric'),
        `<circle cx="556" cy="44" r="4.6" fill="${C.shipped}"/><text x="566" y="48" font-size="11" fill="${C.strong}">shipped</text>` +
            `<circle cx="632" cy="44" r="4.6" fill="${C.challenger}"/><text x="642" y="48" font-size="11" fill="${C.strong}">challenger</text>`
    ];

    for (let v = 0; v <= vmax; v++) {
        // a guide only where a value was observed: nothing below 2 ever happened
        if (v >= 2) {
            parts.push(`<line x1="${n(x(v))}" y1="${top - 2}" x2="${n(x(v))}" y2="${bottom}" stroke="${C.grid}" stroke-opacity="0.18" stroke-width="1"/>`);
        }
        parts.push(`<text x="${n(x(v))}" y="${bottom + 16}" text-anchor="middle" font-size="11" fill="${C.label}">${v}</text>`);
    }
    // the axis is already named in the subtitle, so no trailing unit label
    // the empty half of the axis is a result, so say so
    parts.push(`<text x="${n(x(1))}" y="${bottom - 6}" text-anchor="middle" font-size="11" fill="${C.label}">no draw scored below 2</text>`);

    rows.forEach((r, i) => {
        const y = cy(i);
        const lo = Math.min(...r.vals), hi = Math.max(...r.vals);
        if (hi > lo) {
            parts.push(`<rect x="${n(x(lo))}" y="${n(y - 1.6)}" width="${n(x(hi) - x(lo))}" height="3.2" rx="1.6" fill="${r.color}" fill-opacity="0.22"/>`);
        }
        const byValue = new Map();
        for (const v of r.vals) byValue.set(v, [...(byValue.get(v) || []), v]);
        for (const [v, list] of byValue) {
            list.forEach((_, k) => {
                const off = list.length === 1 ? 0 : list.length === 2 ? (k === 0 ? -4.5 : 4.5) : (k - 1) * 9;
                parts.push(`<circle cx="${n(x(v))}" cy="${n(y + off)}" r="4.6" fill="${r.color}" stroke="${C.panel}" stroke-width="1.2"/>`);
            });
        }
        parts.push(`<text x="92" y="${n(y + 4)}" font-size="10" fill="${C.label}">${r.arm}</text>`);
        // the issue number is centred on its pair of rows, with its denominator
        if (r.arm === 'shipped') {
            const mid = (cy(i) + cy(i + 1)) / 2 + 4;
            parts.push(`<text x="22" y="${n(mid)}" font-size="12" fill="${C.strong}">${r.issue}<tspan font-size="10" fill="${C.label}">&#160;of ${r.checks}</tspan></text>`);
        }
    });

    return svg(W, H, parts.join('\n'));
}

// ---------------------------------------------------------- interval.svg
// The measured difference sits at zero, the bar is its 95% interval, and the
// dashed marks are the gap the pre-registered rule requires before it calls a
// winner. The two nearly touch, which is the point of the figure.
function interval() {
    const W = 760, H = 206;
    const x0 = 72, x1 = 700, dmin = -2.6, dmax = 2.6;
    const x = (v) => x0 + ((v - dmin) / (dmax - dmin)) * (x1 - x0);
    const [lo, hi] = D.difference.interval95;
    const parts = [
        head('What the study could resolve', 'difference between arms, in checks'),
        `<line x1="${x0}" y1="132" x2="${x1}" y2="132" stroke="${C.grid}" stroke-opacity="0.5" stroke-width="1"/>`
    ];

    for (const t of [-2, -1, 0, 1, 2]) {
        parts.push(`<line x1="${n(x(t))}" y1="128" x2="${n(x(t))}" y2="137" stroke="${C.grid}" stroke-opacity="0.7" stroke-width="1"/>`);
        parts.push(`<text x="${n(x(t))}" y="152" text-anchor="middle" font-size="11" fill="${C.label}">${t > 0 ? '+' + t : t}</text>`);
    }

    parts.push(`<rect x="${n(x(lo))}" y="92" width="${n(x(hi) - x(lo))}" height="12" rx="6" fill="${C.shipped}" fill-opacity="0.18"/>`);
    parts.push(`<line x1="${n(x(lo))}" y1="92" x2="${n(x(lo))}" y2="104" stroke="${C.shipped}" stroke-opacity="0.55" stroke-width="1.4"/>`);
    parts.push(`<line x1="${n(x(hi))}" y1="92" x2="${n(x(hi))}" y2="104" stroke="${C.shipped}" stroke-opacity="0.55" stroke-width="1.4"/>`);
    parts.push(`<text x="${n(x(0))}" y="82" text-anchor="middle" font-size="11" fill="${C.strong}">measured: ${D.difference.observed.toFixed(2)}</text>`);
    parts.push(`<circle cx="${n(x(0))}" cy="98" r="5.2" fill="${C.shipped}"/>`);
    parts.push(`<text x="${n(x(lo)) - 8}" y="86" text-anchor="end" font-size="10.5" fill="${C.shipped}">${lo.toFixed(2)}</text>`);
    parts.push(`<text x="${n(x(hi)) + 8}" y="86" font-size="10.5" fill="${C.shipped}">+${hi.toFixed(2)}</text>`);

    for (const t of [-D.difference.resolvableGap, D.difference.resolvableGap]) {
        parts.push(`<line x1="${n(x(t))}" y1="74" x2="${n(x(t))}" y2="124" stroke="${C.challenger}" stroke-width="1.2" stroke-dasharray="4 3"/>`);
    }
    parts.push(`<text x="${n(x(0))}" y="182" text-anchor="middle" font-size="10.5" fill="${C.challenger}">dashed: two checks, the smallest gap the rule calls resolvable</text>`);

    return svg(W, H, parts.join('\n'));
}

// -------------------------------------------------------- regressions.svg
// 8 rows (issue x arm) by 3 draws. Filled means the cell's patch broke a
// neighbouring unit or integration test even when its own rubric passed.
function regressions() {
    const W = 760, H = 390;
    const colX = [276, 350, 424];
    const size = 24;
    const top = 96, step = 32, pairGap = 8;
    const rows = [];
    for (const issue of D.issues) {
        for (const arm of ['shipped', 'challenger']) {
            rows.push({ issue: issue.id, arm, flags: issue.regressions[arm] });
        }
    }
    let broke = 0;
    rows.forEach((r) => r.flags.forEach((f) => { if (f) broke++; }));

    const parts = [
        head('Where the regressions were', `${broke} of 24 cells broke a neighbouring test`),
        ...colX.map((cx, i) => `<text x="${cx + size / 2}" y="78" text-anchor="middle" font-size="10.5" fill="${C.label}">draw ${i + 1}</text>`)
    ];

    rows.forEach((r, i) => {
        const y = top + step * i + pairGap * Math.floor(i / 2);
        parts.push(`<text x="30" y="${n(y + size / 2 + 4)}" font-size="11" fill="${C.strong}">${r.issue} ${r.arm}</text>`);
        r.flags.forEach((f, k) => {
            const cx = colX[k];
            parts.push(
                f
                    ? `<rect x="${cx}" y="${n(y)}" width="${size}" height="${size}" rx="4" fill="${C.broke}"/>`
                    : `<rect x="${cx}" y="${n(y)}" width="${size}" height="${size}" rx="4" fill="#ffffff" stroke="${C.panelEdge}" stroke-width="1.2"/>`
            );
        });
    });

    parts.push(`<rect x="516" y="${top + 26}" width="${size}" height="${size}" rx="4" fill="${C.broke}"/>`);
    parts.push(`<text x="550" y="${top + 43}" font-size="11" fill="${C.strong}">broke a test</text>`);
    parts.push(`<rect x="516" y="${top + 68}" width="${size}" height="${size}" rx="4" fill="#ffffff" stroke="${C.panelEdge}" stroke-width="1.2"/>`);
    parts.push(`<text x="550" y="${top + 85}" font-size="11" fill="${C.strong}">clean</text>`);

    return svg(W, H, parts.join('\n'));
}

writeFileSync(join(OUT, 'draws.svg'), draws());
writeFileSync(join(OUT, 'interval.svg'), interval());
writeFileSync(join(OUT, 'regressions.svg'), regressions());
console.log('wrote public/k3/draws.svg, interval.svg, regressions.svg');
