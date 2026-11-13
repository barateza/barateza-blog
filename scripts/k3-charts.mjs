#!/usr/bin/env node
/**
 * k3-charts.mjs: the one figure for "The spread is wider than the gap".
 *
 * Input:  public/k3/elapsed.json   wall clock and score for all 24 cells
 * Output: public/k3/elapsed.svg    when the runs stopped, against what they scored
 *
 * No dependencies, same conventions as thermal-charts.mjs: every number is read
 * from the data file, a fixed light panel because an SVG inside <img> cannot
 * inherit the site theme, direct labels over legends where a label fits.
 *
 * The figure exists to show a relationship the prose cannot state as compactly:
 * the eight draws that used the whole hour scored everywhere from two checks to
 * four, and the fastest run of the study met every check on its issue.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'public', 'k3');
const D = JSON.parse(readFileSync(join(OUT, 'elapsed.json'), 'utf8'));

const C = {
    full: '#2563eb',
    missed: '#d97706',
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
const svg = (W, H, body) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    panel(W, H) +
    `<g font-family="${FONT}">${body}</g></svg>\n`;

function chart() {
    const W = 760, H = 344;
    const x0 = 104, x1 = 686, tmax = 64, cap = 60;
    const x = (t) => x0 + (t / tmax) * (x1 - x0);
    const issues = [...new Set(D.cells.map((c) => c.issue))].sort((a, b) => a - b);
    const top = 96, step = 56;
    const cy = (i) => top + step * i;
    const bottom = cy(issues.length - 1) + 16;

    const parts = [
        `<text x="28" y="30" font-size="12.5" fill="${C.strong}">When the runs stopped</text>`,
        `<text x="28" y="48" font-size="11" fill="${C.label}">one dot per draw, by issue; filled means every check on that issue was met</text>`,
        `<circle cx="470" cy="44" r="4.4" fill="${C.full}"/><text x="480" y="48" font-size="11" fill="${C.strong}">full marks</text>` +
            `<circle cx="566" cy="44" r="4.4" fill="${C.panel}" stroke="${C.missed}" stroke-width="1.8"/><text x="576" y="48" font-size="11" fill="${C.strong}">missed one</text>`
    ];

    for (const t of [0, 15, 30, 45, 60]) {
        parts.push(`<line x1="${n(x(t))}" y1="${top - 12}" x2="${n(x(t))}" y2="${bottom}" stroke="${C.grid}" stroke-opacity="0.18" stroke-width="1"/>`);
        parts.push(`<text x="${n(x(t))}" y="${bottom + 18}" text-anchor="middle" font-size="11" fill="${C.label}">${t}</text>`);
    }
    parts.push(`<text x="${n(x(0))}" y="${bottom + 36}" font-size="11" fill="${C.label}">minutes until the run stopped</text>`);

    parts.push(`<line x1="${n(x(cap))}" y1="${top - 20}" x2="${n(x(cap))}" y2="${bottom}" stroke="${C.grid}" stroke-opacity="0.35" stroke-width="1" stroke-dasharray="3 3"/>`);
    parts.push(`<text x="${n(x(cap))}" y="${bottom + 36}" text-anchor="end" font-size="10.5" fill="${C.label}">the hour, where every 920 draw stopped</text>`);

    issues.forEach((issue, i) => {
        const rows = D.cells.filter((c) => c.issue === issue);
        const y = cy(i);
        parts.push(`<text x="34" y="${n(y + 4)}" font-size="13" fill="${C.strong}">${issue}</text>`);
        parts.push(`<text x="34" y="${n(y + 19)}" font-size="10" fill="${C.label}">${rows.length} draws</text>`);

        const byMinute = new Map();
        for (const r of rows) byMinute.set(r.minutes, [...(byMinute.get(r.minutes) || []), r]);
        for (const [minute, list] of byMinute) {
            list.forEach((r, k) => {
                const off = list.length === 1 ? 0 : (k - (list.length - 1) / 2) * 7;
                const full = r.checks === r.of;
                parts.push(
                    `<circle cx="${n(x(minute))}" cy="${n(y + off)}" r="4.4" ` +
                        (full
                            ? `fill="${C.full}"/>`
                            : `fill="${C.panel}" stroke="${C.missed}" stroke-width="1.8"/>`)
                );
            });
        }
    });

    return svg(W, H, parts.join('\n'));
}

writeFileSync(join(OUT, 'elapsed.svg'), chart());
console.log('wrote public/k3/elapsed.svg');
