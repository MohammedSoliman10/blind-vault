// Generates the engraved, banknote-style artwork used across the UI.
// All art is original and procedural (guilloche rosettes, lathe lines, dial ticks).
//
//   node scripts/generate-art.mjs
//
// Output goes to public/art/*.svg. Colors come from the brand guide:
//   White #FFFFFF, Onahau #BFF0FF, Blue #2531FF.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "art");
mkdirSync(OUT, { recursive: true });

const WHITE = "#FFFFFF";
const ONAHAU = "#BFF0FF";
const BLUE = "#2531FF";
const TAU = Math.PI * 2;
const f = (n) => Math.round(n * 10) / 10;

/** A family of phase-shifted sine-modulated circles. Their crossings form the woven rosette. */
function rosette({ cx, cy, R, A, k, n, steps = 360, color = WHITE, sw = 0.55, op = 0.95, squash = 1 }) {
  let out = `<g fill="none" stroke="${color}" stroke-width="${sw}" stroke-opacity="${op}" stroke-linejoin="round">`;
  for (let i = 0; i < n; i++) {
    const ph = (i / n) * TAU;
    let d = "";
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * TAU;
      const r = R + A * Math.sin(k * t + ph);
      const x = cx + r * Math.cos(t);
      const y = cy + r * Math.sin(t) * squash;
      d += (s === 0 ? "M" : "L") + f(x) + " " + f(y);
    }
    out += `<path d="${d}Z"/>`;
  }
  return out + "</g>";
}

function circle(cx, cy, r, { color = WHITE, sw = 1, op = 1, dash = "" } = {}) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-opacity="${op}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
}

/** Engraved dial ticks, like a chronometer bezel: short ticks, longer every 5th, longest every 15th. */
function ticks({ cx, cy, r, count = 180, color = WHITE, sw = 0.9 }) {
  let d = "";
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU;
    const len = i % 15 === 0 ? 22 : i % 5 === 0 ? 14 : 7;
    const x1 = cx + r * Math.cos(a);
    const y1 = cy + r * Math.sin(a);
    const x2 = cx + (r + len) * Math.cos(a);
    const y2 = cy + (r + len) * Math.sin(a);
    d += `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`;
  }
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="butt"/>`;
}

/** Radial hatching with a lit side: ray length swells and fades with angle (engraver's shading). */
function rays({ cx, cy, rIn, rOut, count = 240, light = 0.8, color = WHITE, sw = 0.5, op = 0.9 }) {
  let d = "";
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU;
    const env = 0.5 + 0.5 * Math.cos(a - light * Math.PI);
    const len = (rOut - rIn) * (0.25 + 0.75 * env);
    const x1 = cx + rIn * Math.cos(a);
    const y1 = cy + rIn * Math.sin(a);
    const x2 = cx + (rIn + len) * Math.cos(a);
    const y2 = cy + (rIn + len) * Math.sin(a);
    d += `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`;
  }
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-opacity="${op}"/>`;
}

/** Lathe-turned concentric lines whose spacing tightens toward one edge. */
function lathe({ cx, cy, r0, r1, lines = 22, power = 1.6, color = WHITE, sw = 0.5, op = 0.85 }) {
  let out = "";
  for (let j = 0; j < lines; j++) {
    const t = Math.pow(j / (lines - 1), power);
    out += circle(cx, cy, f(r0 + (r1 - r0) * t), { color, sw, op });
  }
  return out;
}

function keyhole(cx, cy, color = ONAHAU) {
  return (
    `<g fill="${color}">` +
    `<circle cx="${cx}" cy="${cy - 10}" r="15"/>` +
    `<path d="M${cx - 8} ${cy} L${cx + 8} ${cy} L${cx + 15} ${cy + 34} L${cx - 15} ${cy + 34} Z"/>` +
    `</g>`
  );
}

function crosshair(cx, cy, color = ONAHAU) {
  return (
    `<g stroke="${color}" stroke-width="1.4" fill="none">` +
    `<circle cx="${cx}" cy="${cy}" r="20"/>` +
    `<path d="M${cx - 46} ${cy}H${cx - 26}M${cx + 26} ${cy}H${cx + 46}M${cx} ${cy - 46}V${cy - 26}M${cx} ${cy + 26}V${cy + 46}"/>` +
    `</g><circle cx="${cx}" cy="${cy}" r="4" fill="${color}"/>`
  );
}

function dot(cx, cy, color = ONAHAU) {
  return `<circle cx="${cx}" cy="${cy}" r="9" fill="${color}"/>` + circle(cx, cy, 22, { color, sw: 1.2 });
}

const CENTERS = { keyhole, crosshair, dot };

function plate(name, o) {
  const c = 400;
  const m = o.sw ?? 1; // stroke multiplier, for small prints
  const lite = !!o.lite; // fewer curves, so the weave survives at small sizes
  const n = (full, light) => (lite ? light : full);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800" role="img" aria-label="">`;
  svg += circle(c, c, 394, { sw: 1.4 * m });
  svg += circle(c, c, 388, { sw: 0.5 * m, op: 0.8 });
  svg += ticks({ cx: c, cy: c, r: 356, count: o.ticks ?? n(180, 90), sw: 0.9 * m });
  svg += circle(c, c, 352, { sw: 0.8 * m });
  svg += rosette({ cx: c, cy: c, R: 326, A: o.outerA ?? 12, k: o.outerK ?? n(30, 18), n: o.outerN ?? n(12, 6), steps: 480, sw: 0.7 * m, op: 0.95 });
  svg += circle(c, c, 296, { sw: 1 * m });
  svg += circle(c, c, 291, { sw: 0.5 * m, op: 0.8 });
  svg += rays({ cx: c, cy: c, rIn: 262, rOut: 290, count: o.rays ?? n(220, 100), light: o.light ?? 0.8, sw: 0.5 * m });
  svg += rosette({ cx: c, cy: c, R: 214, A: o.midA ?? 34, k: o.midK ?? 10, n: o.midN ?? n(18, 9), steps: 480, sw: 0.75 * m, op: 1 });
  svg += circle(c, c, 252, { sw: 0.8 * m });
  svg += lathe({ cx: c, cy: c, r0: o.latheIn ?? 112, r1: o.latheOut ?? 168, lines: o.latheLines ?? n(14, 7), sw: 0.5 * m });
  svg += rosette({ cx: c, cy: c, R: 130, A: o.innerA ?? 20, k: o.innerK ?? 7, n: o.innerN ?? n(14, 7), steps: 360, color: ONAHAU, sw: 0.75 * m, op: 1 });
  svg += circle(c, c, 78, { sw: 1.4 * m });
  svg += circle(c, c, 70, { sw: 0.5 * m, op: 0.8 });
  svg += CENTERS[o.center ?? "keyhole"](c, c);
  svg += `</svg>`;
  writeFileSync(join(OUT, `${name}.svg`), svg);
  console.log("wrote", name + ".svg", Math.round(svg.length / 1024) + " KB");
}

plate("plate-vault", { center: "keyhole" });
plate("plate-attack", { center: "crosshair", midK: 7, midA: 52, midN: 16, innerK: 5, innerA: 30, innerN: 12, outerK: 22, outerN: 10, light: 0.2, rays: 180 });
plate("plate-trade", { center: "dot", midK: 9, midA: 44, midN: 16, innerK: 11, innerA: 14, innerN: 16, outerK: 44, outerN: 10, outerA: 9, light: 1.2 });
plate("plate-ledger", { center: "dot", midK: 14, midA: 22, midN: 20, innerK: 6, innerA: 30, innerN: 12, latheLines: 24, latheIn: 100, latheOut: 176, ticks: 240, light: 1.5 });

// Small prints (compact page heroes): thicker lines, fewer curves.
const SM = { lite: true, sw: 4.4 };
plate("plate-attack-sm", { ...SM, center: "crosshair", midK: 7, midA: 52, midN: 8, innerK: 5, innerA: 30, innerN: 6, outerK: 16, outerN: 5, light: 0.2 });
plate("plate-trade-sm", { ...SM, center: "dot", midK: 9, midA: 44, midN: 8, innerK: 11, innerA: 14, innerN: 8, outerK: 28, outerN: 5, light: 1.2 });
plate("plate-ledger-sm", { ...SM, center: "dot", midK: 14, midA: 22, midN: 10, innerK: 6, innerA: 30, innerN: 6, latheLines: 9, latheIn: 100, latheOut: 176, light: 1.5 });

/** Tileable horizontal guilloche band. Integer wave cycles per tile so it repeats seamlessly. */
function band(name, color, op) {
  const tile = 240;
  const width = tile * 2;
  const h = 44;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${h}" width="${width}" height="${h}" preserveAspectRatio="none" role="img" aria-label="">`;
  svg += `<g fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width="0.7" stroke-linejoin="round">`;
  const waves = [
    { cycles: 2, amp: 15, n: 9 },
    { cycles: 4, amp: 7, n: 7 },
  ];
  for (const w of waves) {
    for (let i = 0; i < w.n; i++) {
      const ph = (i / w.n) * TAU;
      let d = "";
      for (let x = 0; x <= width; x += 3) {
        const y = h / 2 + w.amp * Math.sin((x / tile) * w.cycles * TAU + ph);
        d += (x === 0 ? "M" : "L") + x + " " + f(y);
      }
      svg += `<path d="${d}"/>`;
    }
  }
  svg += `</g>`;
  svg += `<path d="M0 1H${width}M0 ${h - 1}H${width}" stroke="${color}" stroke-width="1" stroke-opacity="${op}"/>`;
  svg += `</svg>`;
  writeFileSync(join(OUT, `${name}.svg`), svg);
  console.log("wrote", name + ".svg", Math.round(svg.length / 1024) + " KB");
}

band("band-blue", BLUE, 0.9);
band("band-white", WHITE, 0.9);
