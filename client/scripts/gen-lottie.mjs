#!/usr/bin/env node
/**
 * gen-lottie.mjs — procedural Lottie (Bodymovin) celebration effect generator.
 *
 * Generates 6 starter gift/entrance effects for the live-streaming Live Effects
 * Engine. Uses ONLY `sr` (star) and `el` (ellipse) shape primitives — no
 * hand-authored bezier paths. Fully deterministic (no Math.random).
 *
 * Usage:
 *   node scripts/gen-lottie.mjs            # generate all 6 files
 *   node scripts/gen-lottie.mjs --validate # validate previously generated files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../src/assets/lottie');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic pseudo-random in [0,1) — reproducible across runs. */
const rand = (n) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/** Round to 2 decimals. */
const r2 = (n) => Math.round(n * 100) / 100;

/** '#RRGGBB' -> [r,g,b] floats 0..1 (2 decimals). */
const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return [
    r2(parseInt(h.slice(0, 2), 16) / 255),
    r2(parseInt(h.slice(2, 4), 16) / 255),
    r2(parseInt(h.slice(4, 6), 16) / 255),
  ];
};

/** Lighter/white-ish sparkle tint of an rgb float triple. */
const tint = ([r, g, b]) => [
  r2(Math.min(r + 0.35, 1)),
  r2(Math.min(g + 0.35, 1)),
  r2(Math.min(b + 0.35, 1)),
];

// ---------------------------------------------------------------------------
// Shape groups (star + ellipse only)
// ---------------------------------------------------------------------------

const starGroup = (outer, [r, g, b]) => ({
  ty: 'gr',
  nm: 'g',
  it: [
    {
      ty: 'sr',
      sy: 1,
      d: 1,
      pt: { a: 0, k: 5 },
      p: { a: 0, k: [0, 0] },
      r: { a: 0, k: 0 },
      ir: { a: 0, k: r2(outer * 0.42) },
      is: { a: 0, k: 0 },
      or: { a: 0, k: r2(outer) },
      os: { a: 0, k: 0 },
      ix: 1,
    },
    { ty: 'fl', c: { a: 0, k: [r, g, b, 1] }, o: { a: 0, k: 100 } },
    {
      ty: 'tr',
      p: { a: 0, k: [0, 0] },
      a: { a: 0, k: [0, 0] },
      s: { a: 0, k: [100, 100] },
      r: { a: 0, k: 0 },
      o: { a: 0, k: 100 },
    },
  ],
});

const ellipseGroup = (dia, [r, g, b]) => ({
  ty: 'gr',
  nm: 'g',
  it: [
    { ty: 'el', d: 1, p: { a: 0, k: [0, 0] }, s: { a: 0, k: [r2(dia), r2(dia)] } },
    { ty: 'fl', c: { a: 0, k: [r, g, b, 1] }, o: { a: 0, k: 100 } },
    {
      ty: 'tr',
      p: { a: 0, k: [0, 0] },
      a: { a: 0, k: [0, 0] },
      s: { a: 0, k: [100, 100] },
      r: { a: 0, k: 0 },
      o: { a: 0, k: 100 },
    },
  ],
});

// ---------------------------------------------------------------------------
// Particle layer
// ---------------------------------------------------------------------------

const particleLayer = ({ ind, st, spin, startX, startY, endX, endY, peakScale, endScale, shape }) => ({
  ddd: 0,
  ind,
  ty: 4,
  nm: `p${ind}`,
  sr: 1,
  ks: {
    o: {
      a: 1,
      k: [
        { t: st, s: [0] },
        { t: st + 6, s: [100] },
        { t: st + 55, s: [100] },
        { t: 90, s: [0] },
      ],
    },
    r: {
      a: 1,
      k: [
        { t: st, s: [0] },
        { t: 90, s: [spin] },
      ],
    },
    p: {
      a: 1,
      k: [
        { t: st, s: [r2(startX), r2(startY)] },
        { t: 90, s: [r2(endX), r2(endY)] },
      ],
    },
    a: { a: 0, k: [0, 0] },
    s: {
      a: 1,
      k: [
        { t: st, s: [0, 0] },
        { t: st + 12, s: [r2(peakScale), r2(peakScale)] },
        { t: 90, s: [r2(endScale), r2(endScale)] },
      ],
    },
  },
  shapes: [shape],
  ip: 0,
  op: 90,
  st: 0,
  bm: 0,
});

// ---------------------------------------------------------------------------
// Motion styles
// ---------------------------------------------------------------------------

const CX = 256;
const CY = 256;

/** Radial star explosion from center. */
const burstLayers = (count, baseRgb) => {
  const layers = [];
  for (let i = 0; i < count; i++) {
    const st = Math.round((i / count) * 18);
    const jitter = (rand(i * 97.13 + 1) - 0.5) * 0.35;
    const angle = (i / count) * Math.PI * 2 + jitter;
    const radius = 150 + rand(i + 11) * 60; // 150..210
    const endX = CX + Math.cos(angle) * radius;
    const endY = CY + Math.sin(angle) * radius;
    const spin = i % 2 === 0 ? 180 : -180;
    const outer = 16 + (rand(i + 31) - 0.5) * 10; // 16 ± 5
    const color = i % 4 === 3 ? tint(baseRgb) : baseRgb;
    layers.push(
      particleLayer({
        ind: i + 1,
        st,
        spin,
        startX: CX,
        startY: CY,
        endX,
        endY,
        peakScale: 110,
        endScale: 40,
        shape: starGroup(outer, color),
      })
    );
  }
  return layers;
};

/** Bokeh ellipses floating upward with gentle horizontal drift. */
const riseLayers = (count, baseRgb) => {
  const layers = [];
  for (let i = 0; i < count; i++) {
    const st = Math.round((i / count) * 18);
    const startX = CX + (rand(i + 1) - 0.5) * 120;
    const startY = 340 + rand(i + 21) * 60; // 340..400
    const endX = startX + (rand(i + 41) - 0.5) * 90;
    const endY = 90 + rand(i + 61) * 60; // 90..150
    const spin = i % 2 === 0 ? 30 : -30;
    const dia = 14 + rand(i + 81) * 14; // 14..28
    layers.push(
      particleLayer({
        ind: i + 1,
        st,
        spin,
        startX,
        startY,
        endX,
        endY,
        peakScale: 100,
        endScale: 70,
        shape: ellipseGroup(dia, baseRgb),
      })
    );
  }
  return layers;
};

// ---------------------------------------------------------------------------
// File specs
// ---------------------------------------------------------------------------

const SPECS = [
  { file: 'heart.json', name: 'heart', style: 'rise', count: 16, color: '#FF4FA3' },
  { file: 'rose.json', name: 'rose', style: 'rise', count: 18, color: '#FF2E7E' },
  { file: 'star.json', name: 'star', style: 'burst', count: 20, color: '#FFD84D' },
  { file: 'spotlight.json', name: 'spotlight', style: 'burst', count: 22, color: '#FF7A2F' },
  { file: 'entrance-vip.json', name: 'entrance-vip', style: 'burst', count: 18, color: '#7C5CFF' },
  { file: 'entrance-inner.json', name: 'entrance-inner', style: 'burst', count: 20, color: '#FFB020' },
];

const buildAnimation = ({ name, style, count, color }) => {
  const rgb = hexToRgb(color);
  const layers = style === 'burst' ? burstLayers(count, rgb) : riseLayers(count, rgb);
  return {
    v: '5.9.0',
    fr: 60,
    ip: 0,
    op: 90,
    w: 512,
    h: 512,
    nm: name,
    ddd: 0,
    assets: [],
    layers,
  };
};

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------

const generate = () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const spec of SPECS) {
    const anim = buildAnimation(spec);
    const json = JSON.stringify(anim);
    const outPath = path.join(OUT_DIR, spec.file);
    fs.writeFileSync(outPath, json);
    console.log(`${spec.file}  layers=${anim.layers.length}  bytes=${Buffer.byteLength(json)}`);
  }
};

// ---------------------------------------------------------------------------
// Validate
// ---------------------------------------------------------------------------

const validate = () => {
  let allPass = true;
  for (const spec of SPECS) {
    const outPath = path.join(OUT_DIR, spec.file);
    const problems = [];
    try {
      const raw = fs.readFileSync(outPath);
      if (raw.length >= 60 * 1024) problems.push(`file size ${raw.length} >= 60KB`);
      const j = JSON.parse(raw.toString());
      for (const k of ['fr', 'op', 'w', 'h']) {
        if (typeof j[k] !== 'number') problems.push(`root.${k} not numeric`);
      }
      if (!Array.isArray(j.layers) || j.layers.length === 0) {
        problems.push('layers missing/empty');
      } else {
        j.layers.forEach((layer, li) => {
          if (layer.ty !== 4) problems.push(`layer ${li} ty!==4`);
          if (!layer.ks || !('o' in layer.ks) || !('p' in layer.ks) || !('s' in layer.ks)) {
            problems.push(`layer ${li} ks missing o/p/s`);
          }
          if (!Array.isArray(layer.shapes) || layer.shapes.length === 0) {
            problems.push(`layer ${li} shapes missing/empty`);
          } else {
            layer.shapes.forEach((g, gi) => {
              if (g.ty !== 'gr' || !Array.isArray(g.it) || g.it.length === 0) {
                problems.push(`layer ${li} shape ${gi} not a group with items`);
                return;
              }
              if (g.it[g.it.length - 1].ty !== 'tr') problems.push(`layer ${li} group ${gi} last item not tr`);
              if (!g.it.some((s) => s.ty === 'fl')) problems.push(`layer ${li} group ${gi} has no fl`);
            });
          }
        });
      }
    } catch (e) {
      problems.push(e.message);
    }
    if (problems.length === 0) {
      console.log(`PASS  ${spec.file}`);
    } else {
      allPass = false;
      console.log(`FAIL  ${spec.file}  ${problems.join('; ')}`);
    }
  }
  if (!allPass) process.exitCode = 1;
  return allPass;
};

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

if (process.argv.includes('--validate')) {
  validate();
} else {
  generate();
  console.log('--- validate ---');
  validate();
}
