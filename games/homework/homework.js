// עושים שיעורים בכיף – כל דף שיעורי בית הופך למשחק בחצר (הדפים עצמם נמצאים ב-sets.js)
// גם כאן הילד עושה בידיים: סוחב שלטים, מוריד ופורט קוביות, קופץ על ציר מספרים ובונה תרגילים מכרטיסים.
import * as THREE from 'three';
import { SETS } from './sets.js';

const store = {
  get(k, d) { try { const v = localStorage.getItem('stanga-hw-' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('stanga-hw-' + k, JSON.stringify(v)); } catch {} },
};
const $ = (id) => document.getElementById(id);
const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));

let C = null;
let built = false;
const S = { phase: 'menu', set: null, ai: 0, act: null, i: 0, n: 1, mistakes: 0 };
let scene = null;   // { objs: [], ... } – הכול מה שבנינו לפעילות הנוכחית
let held = null;    // שלט/כרטיס שהדמות מחזיקה

export const HOMEWORK = {
  id: 'homework', title: 'עושים שיעורים בכיף', emoji: '📝', color: '#e65100',
  station: { x: 0, z: 5.0 },
  desc: 'שיעורי הבית מהמחברת הופכים למשחק בחצר',
  enter(core) {
    C = core;
    if (!built) { setupUI(); built = true; }
    toMenu();
  },
  exit() { clearScene(); S.phase = 'menu'; for (const id of ['hw-menu', 'hw-acts', 'hw-hud', 'hw-over']) $(id).classList.add('hidden'); },
  canMove: () => S.phase === 'play' && S.act && S.act.type !== 'borrow',
  onTap, onAction, update, camera,
};

// ---------- עזרים לציור ----------
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
function mesh(g, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; }
const minus = (a, b) => `${a} − ${b}`;
function tex(lines, { w = 512, h = 256, bg = '#fffdf3', fg = '#1c2540', border = '#1c2540', size = 92, dir = 'ltr' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  if (border) { x.strokeStyle = border; x.lineWidth = 12; x.strokeRect(6, 6, w - 12, h - 12); }
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = dir;
  const L = [].concat(lines);
  L.forEach((t, i) => {
    const s = i === 0 ? size : size * 0.62;
    x.font = `900 ${s}px Rubik, "Noto Sans Hebrew", sans-serif`;
    x.fillStyle = i === 0 ? fg : '#16703c';
    x.fillText(t, w / 2, h / 2 + (i - (L.length - 1) / 2) * size * 0.95);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// שלט שאפשר לסחוב: לוח מוטה כלפי המצלמה
function board(lines, opts = {}) {
  const g = new THREE.Group();
  const w = opts.bw || 1.25, h = opts.bh || 0.62;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex(lines, opts), roughness: 0.8 }));
  const back = mesh(new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.04), M(opts.frame || '#8d5a32'));
  const tilt = new THREE.Group(); tilt.add(back); face.position.z = 0.025; tilt.add(face);
  tilt.rotation.x = -0.95; tilt.position.y = 0.35;
  g.add(tilt);
  g.userData.face = face; g.userData.opts = { ...opts };
  return g;
}
function setBoard(g, lines, extra = {}) {
  const f = g.userData.face; f.material.map.dispose();
  f.material.map = tex(lines, { ...g.userData.opts, ...extra }); f.material.needsUpdate = true;
}
// אזור על הרצפה + שלט כותרת
function zone(label, color, x, z, r = 1.35) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.12, r, 48), new THREE.MeshBasicMaterial({ color }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(r - 0.12, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16 }));
  fill.rotation.x = -Math.PI / 2; fill.position.y = 0.025; g.add(fill);
  if (label) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshStandardMaterial({ map: tex(label, { w: 640, h: 160, size: 74, dir: 'rtl', bg: '#fff3c4', border: color }), roughness: 0.8 }));
    s.position.set(0, 0.9, -r - 0.05); s.rotation.x = -0.35; g.add(s);
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.65, 6), M('#666'), 0, 0.32, -r - 0.1));
  }
  g.position.set(x, 0, z);
  return g;
}
function add(o) { C.R.scene.add(o); scene.objs.push(o); return o; }
function clearScene() {
  if (scene) for (const o of scene.objs) C.R.scene.remove(o);
  if (held) held = null;
  scene = null;
}
function pickHit(e, list) {
  const hits = C.rayFrom(e).intersectObjects(list, true);
  for (const h of hits) { let o = h.object; while (o) { if (list.includes(o)) return o; o = o.parent; } }
  return null;
}

// =====================================================================
// סוגי הפעילויות
// =====================================================================
const ENGINES = {};

// ---------- sort / odd: סוחבים שלטים לאזורים ----------
function carryBuild(cards, zones) {
  // cards: [{lines, data}], zones: [{key,label,color,x,z,cap}]
  scene.cards = [];
  scene.zones = zones.map((zd) => { const g = add(zone(zd.label, zd.color, zd.x, zd.z, zd.r || 1.35)); g.traverse((o) => { o.userData.zone = zd; }); zd.group = g; zd.items = []; return zd; });
  const n = cards.length, gap = Math.min(1.55, 9 / n);
  cards.forEach((cd, i) => {
    const b = add(board(cd.lines, cd.opts));
    b.userData.card = cd; cd.group = b; cd.home = new THREE.Vector3((i - (n - 1) / 2) * gap, 0, -4.1);
    b.position.copy(cd.home); cd.zone = null;
    scene.cards.push(cd);
  });
}
function carryLayout(zd) {
  zd.items.forEach((cd, i) => { const cols = 2; cd.group.position.set(zd.x + ((i % cols) - (Math.min(zd.items.length, cols) - 1) / 2) * 1.3, 0, zd.z - 0.45 + Math.floor(i / cols) * 0.75); });
}
function carryTap(e) {
  const cardObjs = scene.cards.map((c) => c.group);
  const hitCard = held ? null : pickHit(e, cardObjs);
  if (hitCard) {
    const cd = hitCard.userData.card;
    C.walkTo(hitCard.position.clone().add(new THREE.Vector3(0, 0, 0.9)), () => {
      if (held) return;
      if (cd.zone) { cd.zone.items.splice(cd.zone.items.indexOf(cd), 1); carryLayout(cd.zone); cd.zone = null; }
      held = cd; C.SFX.sfxKick(0.2); C.kid.play('lob');
    });
    return true;
  }
  const zh = pickHit(e, scene.zones.map((z) => z.group));
  if (zh && held) {
    const zd = zh.userData.zone;
    C.walkTo(new THREE.Vector3(zd.x, 0, zd.z + 1.2), () => dropIn(zd));
    return true;
  }
  return false;
}
function dropIn(zd) {
  if (!held) return;
  if (zd.cap && zd.items.length >= zd.cap) { // ארגז של יוצא דופן – מחליפים
    const old = zd.items.pop(); old.zone = null; old.group.position.copy(old.home);
  }
  zd.items.push(held); held.zone = zd; held = null; carryLayout(zd);
  C.SFX.sfxBounce(0.35); C.kid.play('kick');
}
function carryAction() {
  if (held) { let best = null, bd = 2.2; for (const z of scene.zones) { const d = Math.hypot(z.x - C.kid.pos.x, z.z + 1.2 - C.kid.pos.z); if (d < bd) { bd = d; best = z; } } if (best) dropIn(best); return; }
  let best = null, bd = 1.4; for (const cd of scene.cards) { const p = cd.group.position; const d = Math.hypot(p.x - C.kid.pos.x, p.z + 0.9 - C.kid.pos.z); if (d < bd) { bd = d; best = cd; } }
  if (best) { if (best.zone) { best.zone.items.splice(best.zone.items.indexOf(best), 1); carryLayout(best.zone); best.zone = null; } held = best; C.kid.play('lob'); }
}

ENGINES.sort = {
  count: () => 1,
  build(act) {
    carryBuild(act.items.map(([a, b]) => ({ lines: minus(a, b), a, b, want: act.rule(a, b) })),
      [{ key: 0, label: act.zones[0], color: '#43a047', x: -3.1, z: -0.7 }, { key: 1, label: act.zones[1], color: '#e53935', x: 3.1, z: -0.7 }]);
    return { q: act.q, big: '' };
  },
  tap: carryTap, action: carryAction,
  async check() {
    if (held) return 'קודם הניחו את השלט שבידיים 🙂';
    const left = scene.cards.filter((c) => !c.zone).length;
    if (left) return `עוד ${left} שלטים לא במקום 🙂`;
    const wrong = scene.cards.filter((c) => c.zone.key !== c.want);
    if (wrong.length) { for (const c of wrong) setBoard(c.group, [minus(c.a, c.b), '🤔'], { bg: '#ffe0e0' }); return `${wrong.length} שלטים לא באזור הנכון (סימנתי אותם באדום). חשבו שוב – בערך!`; }
    for (const c of scene.cards) { setBoard(c.group, [minus(c.a, c.b), `= ${c.a - c.b}`], { bg: '#e7f8ec' }); C.SFX.sfxBounce(0.4); await wait(0.25); }
    return null;
  },
  eq: () => ({ html: '<div dir="rtl" class="hw-small">בדקנו – כל ההערכות נכונות! 👏</div>', text: 'כל ההערכות נכונות' }),
};

ENGINES.odd = {
  count: () => 1,
  build(act) {
    const vals = act.items.map(([a, b]) => a - b);
    const odd = vals.findIndex((v) => vals.filter((w) => w === v).length === 1);
    carryBuild(act.items.map(([a, b], i) => ({ lines: minus(a, b), a, b, odd: i === odd })), [{ key: 'odd', label: 'יוצא דופן', color: '#8e24aa', x: 0, z: -0.6, cap: 1, r: 1.2 }]);
    return { q: act.q, big: '' };
  },
  tap: carryTap, action: carryAction,
  async check() {
    if (held) return 'קודם הניחו את השלט שבידיים 🙂';
    const z = scene.zones[0];
    if (!z.items.length) return 'סחבו לארגז את התרגיל שהוא יוצא דופן 🙂';
    const c = z.items[0];
    if (!c.odd) { setBoard(c.group, [minus(c.a, c.b), `= ${c.a - c.b}`], { bg: '#ffe0e0' }); return `התשובה של ${minus(c.a, c.b)} היא ${c.a - c.b}. יש עוד תרגילים עם אותה תשובה? 🧐`; }
    for (const d of scene.cards) { setBoard(d.group, [minus(d.a, d.b), `= ${d.a - d.b}`], { bg: d.odd ? '#f3e5f5' : '#e7f8ec' }); C.SFX.sfxBounce(0.4); await wait(0.25); }
    return null;
  },
  eq: () => { const c = scene.zones[0].items[0], o = scene.cards.find((d) => !d.odd); return { html: `<div dir="ltr">${minus(c.a, c.b)} = ${c.a - c.b}</div><div class="hw-small">בכל השאר התשובה היא ${o.a - o.b}</div>`, text: `${minus(c.a, c.b)} = ${c.a - c.b}` }; },
};

// ---------- cards: בונים תרגיל משני כרטיסים ----------
ENGINES.cards = {
  count: (act) => act.tasks.length,
  build(act, i) {
    const t = act.tasks[i];
    carryBuild(act.cards.map((v) => ({ lines: String(v), v, opts: { bw: 0.95, bh: 0.62, size: 120, bg: '#fff3e0', frame: '#e65100' } })),
      [{ key: 0, label: 'מספר ראשון', color: '#1e88e5', x: -2.3, z: -0.6, cap: 1, r: 1.0 }, { key: 1, label: 'מספר שני', color: '#1e88e5', x: 2.3, z: -0.6, cap: 1, r: 1.0 }]);
    // סימן הפעולה באמצע
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: tex(t.op, { w: 256, h: 256, size: 200, border: null, bg: '#fff3c4' }) }));
    s.rotation.x = -Math.PI / 2; s.position.set(0, 0.04, -0.6); add(s);
    return { q: `${t.q} – כל כרטיס פעם אחת. הניחו כרטיס בכל עיגול.`, big: '' };
  },
  tap: carryTap, action: carryAction,
  async check(act, i) {
    if (held) return 'קודם הניחו את הכרטיס שבידיים 🙂';
    const t = act.tasks[i], [z0, z1] = scene.zones;
    if (!z0.items.length || !z1.items.length) return 'צריך כרטיס בכל אחד משני העיגולים 🙂';
    const a = z0.items[0].v, b = z1.items[0].v;
    if (t.op === '−' && a < b) return `${a} − ${b}? אי אפשר להחסיר מספר גדול ממספר קטן יותר. החליפו מקומות 🙂`;
    const val = (x, y) => (t.op === '+' ? x + y : x - y);
    const all = [];
    for (const x of act.cards) for (const y of act.cards) if (x !== y && (t.op === '+' || x >= y)) all.push(val(x, y));
    const best = t.goal === 'max' ? Math.max(...all) : Math.min(...all);
    const got = val(a, b);
    if (got !== best) return `${a} ${t.op} ${b} = ${got}. אפשר ${t.goal === 'max' ? 'יותר גדול' : 'יותר קטן'}! 🧐`;
    scene.res = `${a} ${t.op} ${b} = ${got}`;
    return null;
  },
  eq: () => scene.res,
};

// ---------- borrow: מאות, עשרות ואחדות – מורידים ופורטים ----------
const COLS = [{ k: 'h', he: 'מאות', x: -3.1, val: 100 }, { k: 't', he: 'עשרות', x: 0, val: 10 }, { k: 'o', he: 'אחדות', x: 3.1, val: 1 }];
let hundredTex = null;
function blockMesh(k) {
  if (k === 'h') {
    if (!hundredTex) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#42a5f5'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#1565c0'; x.lineWidth = 2; for (let i = 0; i <= 10; i++) { x.beginPath(); x.moveTo(i * 12.8, 0); x.lineTo(i * 12.8, 128); x.stroke(); x.beginPath(); x.moveTo(0, i * 12.8); x.lineTo(128, i * 12.8); x.stroke(); } hundredTex = new THREE.CanvasTexture(c); hundredTex.colorSpace = THREE.SRGBColorSpace; }
    return mesh(new THREE.BoxGeometry(0.62, 0.07, 0.62), [M('#1e88e5'), M('#1e88e5'), new THREE.MeshStandardMaterial({ map: hundredTex }), M('#1e88e5'), M('#1e88e5'), M('#1e88e5')]);
  }
  if (k === 't') { const g = new THREE.Group(); for (let i = 0; i < 10; i++) g.add(mesh(new THREE.BoxGeometry(0.058, 0.07, 0.07), M(i % 2 ? '#ff9800' : '#fb8c00'), (i - 4.5) * 0.062, 0, 0)); return g; }
  return mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), M('#fdd835'));
}
function borrowLayout() {
  for (const col of COLS) {
    const L = scene.blocks[col.k];
    L.forEach((b, i) => {
      if (col.k === 'h') b.position.set(col.x + ((i % 3) - 1) * 0.75, 0.05, -4.0 + Math.floor(i / 3) * 0.75);
      else if (col.k === 't') b.position.set(col.x + (i % 2 ? 0.4 : -0.4), 0.05, -4.2 + Math.floor(i / 2) * 0.2);
      else b.position.set(col.x + ((i % 4) - 1.5) * 0.3, 0.08, -4.1 + Math.floor(i / 4) * 0.32);
    });
  }
}
ENGINES.borrow = {
  count: (act) => act.list.length,
  build(act, i) {
    const [a, b] = act.list[i];
    scene.ab = [a, b];
    scene.tool = 'remove';
    scene.blocks = { h: [], t: [], o: [] };
    scene.removed = { h: 0, t: 0, o: 0 };
    scene.broke = 0;
    scene.need = { h: Math.floor(b / 100), t: Math.floor(b / 10) % 10, o: b % 10 };
    // רצפת עמודות + כותרות
    for (const col of COLS) {
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 3.6), new THREE.MeshStandardMaterial({ color: col.k === 'h' ? '#d6eaff' : col.k === 't' ? '#ffe7cc' : '#fff8c4', roughness: 0.95 }));
      pad.rotation.x = -Math.PI / 2; pad.position.set(col.x, 0.02, -3.0); pad.receiveShadow = true; add(pad);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), new THREE.MeshStandardMaterial({ map: tex(col.he, { w: 512, h: 128, size: 80, dir: 'rtl', bg: '#fff', border: '#1c2540' }) }));
      s.rotation.x = -Math.PI / 2; s.position.set(col.x, 0.03, -1.0); add(s);
    }
    const mk = (k, n) => { for (let j = 0; j < n; j++) { const bl = add(blockMesh(k)); bl.userData.block = k; scene.blocks[k].push(bl); } };
    mk('h', Math.floor(a / 100)); mk('t', Math.floor(a / 10) % 10); mk('o', a % 10);
    borrowLayout();
    C.kid.pos.set(-5.6, 0, -1.0); C.kid.facing = 0;
    showTools('borrow');
    updateBorrowNeed();
    return { q: `יש ${a}. הורידו ${b}: לחצו על קובייה כדי להוריד אותה. אין מספיק בטור? פורטים ✂️ קובייה מהטור הגדול יותר!`, big: minus(a, b) };
  },
  tap(e) {
    const all = [...scene.blocks.h, ...scene.blocks.t, ...scene.blocks.o];
    const hit = pickHit(e, all);
    if (!hit) return true;
    const k = hit.userData.block, col = COLS.find((c) => c.k === k);
    const L = scene.blocks[k];
    if (scene.tool === 'break') {
      if (k === 'o') { C.message('אחדות אי אפשר לפרוט – הן הכי קטנות 🙂'); return true; }
      const nk = k === 'h' ? 't' : 'o';
      L.splice(L.indexOf(hit), 1); C.R.scene.remove(hit);
      for (let j = 0; j < 10; j++) { const bl = add(blockMesh(nk)); bl.userData.block = nk; scene.blocks[nk].push(bl); }
      scene.broke++;
      borrowLayout(); C.SFX.sfxClang(); C.pop('✂️', k === 'h' ? '1 מאה = 10 עשרות' : '1 עשרת = 10 אחדות', '#ffd23f');
      setTool('remove');
      updateBorrowNeed();
      return true;
    }
    if (scene.removed[k] >= scene.need[k]) {
      S.mistakes++; C.SFX.sfxBuzz();
      C.message(`ב${col.he} צריך להוריד רק ${scene.need[k]}. מה עוד חסר להוריד? 🧐`, 3200);
      return true;
    }
    L.splice(L.indexOf(hit), 1); C.R.scene.remove(hit);
    scene.removed[k]++;
    borrowLayout(); C.SFX.sfxBounce(0.3); C.kid.play('kick');
    updateBorrowNeed();
    return true;
  },
  action() {},
  async check() {
    const { need, removed } = scene;
    for (const col of COLS) if (removed[col.k] < need[col.k]) {
      const left = scene.blocks[col.k].length;
      return left < need[col.k] - removed[col.k]
        ? `ב${col.he} צריך להוריד עוד ${need[col.k] - removed[col.k]}, ויש רק ${left}. מה עושים? פורטים ✂️ קובייה מהטור הגדול!`
        : `ב${col.he} צריך להוריד עוד ${need[col.k] - removed[col.k]} 🙂`;
    }
    return null;
  },
  eq() {
    const [a, b] = scene.ab, r = a - b, pad = (n) => String(n).padStart(3, ' ');
    return { html: `<pre class="vert">  ${pad(a)}\n− ${pad(b)}\n─────\n  ${pad(r)}</pre>`, text: `${minus(a, b)} = ${r}` };
  },
};
function updateBorrowNeed() {
  const { need, removed } = scene;
  $('hw-need').innerHTML = COLS.map((c) => `<span class="${removed[c.k] === need[c.k] ? 'ok' : ''}">${c.he}: ${removed[c.k]}/${need[c.k]}</span>`).join('');
}
function setTool(t) { if (!scene) return; scene.tool = t; document.querySelectorAll('[data-hwtool]').forEach((b) => b.classList.toggle('on', b.dataset.hwtool === t)); }

// ---------- jump: ציר מספרים ענק ----------
const LINE_Z = -1.2, X0 = -11, X1 = 11;
function lineX(v) { const [a, b] = scene.ab; return X0 + ((v - b) / (a - b)) * (X1 - X0); }
function lineLabel(text, x, color = '#1c2540', big = false) {
  const s = new THREE.Mesh(new THREE.PlaneGeometry(big ? 1.3 : 1.0, big ? 0.55 : 0.42), new THREE.MeshBasicMaterial({ map: tex(text, { w: 320, h: 128, size: 86, border: null, bg: '#fffdf3', fg: color }), transparent: false }));
  s.rotation.x = -Math.PI / 2; s.position.set(x, 0.035, LINE_Z + (big ? 0.75 : 0.62)); return add(s);
}
function tick(x, h = 0.5, color = '#1c2540') { const t = new THREE.Mesh(new THREE.PlaneGeometry(0.06, h), new THREE.MeshBasicMaterial({ color })); t.rotation.x = -Math.PI / 2; t.position.set(x, 0.03, LINE_Z); return add(t); }
ENGINES.jump = {
  count: (act) => act.list.length,
  build(act, i) {
    const [a, b] = act.list[i];
    scene.ab = [a, b]; scene.pos = b; scene.jumps = []; scene.arcs = [];
    const line = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 + 1.6, 0.09), new THREE.MeshBasicMaterial({ color: '#1c2540' }));
    line.rotation.x = -Math.PI / 2; line.position.set(0, 0.028, LINE_Z); add(line);
    const arrow = new THREE.Mesh(new THREE.CircleGeometry(0.22, 3), new THREE.MeshBasicMaterial({ color: '#1c2540' })); arrow.rotation.x = -Math.PI / 2; arrow.position.set(X1 + 0.85, 0.028, LINE_Z); add(arrow);
    // שנתות במספרים עגולים
    const d = a - b, step = d <= 30 ? 5 : d <= 120 ? 10 : 100;
    for (let v = Math.ceil(b / step) * step; v <= a; v += step) if (v !== a && v !== b) { tick(lineX(v), 0.32, '#6b7a99'); }
    tick(lineX(b), 0.7, '#1e88e5'); lineLabel(String(b), lineX(b), '#1e88e5', true);
    tick(lineX(a), 0.7, '#e53935'); lineLabel(String(a), lineX(a), '#e53935', true);
    C.kid.pos.set(lineX(b), 0, LINE_Z - 0.05); C.kid.facing = 0;
    showTools('jump');
    $('hw-sum').textContent = 'קפצנו: 0';
    return { q: `${act.note} מתחילים ב-${b} ומגיעים ל-${a}.`, big: `${minus(a, b)} = ?` };
  },
  tap() { return true; },
  action() {},
  check() { return scene.pos === scene.ab[0] ? null : `עוד לא הגענו ל-${scene.ab[0]} – אנחנו ב-${scene.pos} 🙂`; },
  eq() {
    const [a, b] = scene.ab, d = a - b;
    const path = [b, ...scene.jumps.reduce((acc, j) => { acc.push((acc.length ? acc[acc.length - 1] : b) + j); return acc; }, [])].join(' → ');
    return { html: `<div>${minus(a, b)} = ${d}</div><div class="hw-small">${b} + ${d} = ${a}</div><div class="hw-path">${path}</div>`, text: `${minus(a, b)} = ${d}` };
  },
};
function jump(n) {
  if (S.phase !== 'play' || S.act.type !== 'jump' || scene.busy) return;
  const [a] = scene.ab, to = scene.pos + n;
  if (to > a) { S.mistakes++; C.SFX.sfxBuzz(); C.message(`קפיצה של ${n} תעבור את ${a}! נסו קפיצה קטנה יותר 🙂`, 2600); return; }
  const x1 = lineX(scene.pos), x2 = lineX(to);
  // קשת של הקפיצה + כמה קפצנו
  const hgt = Math.min(2.2, 0.5 + Math.abs(x2 - x1) * 0.25);
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x1, 0.05, LINE_Z), new THREE.Vector3((x1 + x2) / 2, hgt * 1.6, LINE_Z - 0.2), new THREE.Vector3(x2, 0.05, LINE_Z));
  const arc = add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.035, 6), new THREE.MeshBasicMaterial({ color: '#ff7eb6' })));
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.4), new THREE.MeshBasicMaterial({ map: tex(`+${n}`, { w: 256, h: 112, size: 84, border: null, bg: '#ffe3f0', fg: '#ad1457' }) }));
  lab.position.set((x1 + x2) / 2, hgt * 0.8 + 0.35, LINE_Z - 0.2); lab.rotation.x = -0.6; add(lab);
  scene.arcs.push([arc, lab]);
  scene.jumps.push(n); scene.pos = to;
  if (to !== a) { tick(x2, 0.5, '#ad1457'); scene.arcs[scene.arcs.length - 1].push(lineLabel(String(to), x2, '#ad1457')); }
  scene.busy = true;
  C.walkTo(new THREE.Vector3(x2, 0, LINE_Z - 0.05), () => { scene.busy = false; });
  setTimeout(() => { if (scene) scene.busy = false; }, 1600);
  C.kid.play('lob'); C.SFX.sfxBounce(0.3 + Math.min(n, 100) / 300);
  $('hw-sum').textContent = `קפצנו: ${to - scene.ab[1]}`;
  if (to === a) setTimeout(() => { if (S.phase === 'play') doCheck(); }, 900);
}
function undoJump() {
  if (!scene || !scene.jumps.length) return;
  const n = scene.jumps.pop(); scene.pos -= n;
  for (const o of scene.arcs.pop()) C.R.scene.remove(o);
  C.kid.pos.x = lineX(scene.pos);
  $('hw-sum').textContent = `קפצנו: ${scene.pos - scene.ab[1]}`;
}

// =====================================================================
// ממשק
// =====================================================================
function setupUI() {
  $('hw-back').addEventListener('click', () => C.exitGame());
  $('hw-acts-back').addEventListener('click', toMenu);
  $('hw-home').addEventListener('click', () => openSet(S.set));
  $('hw-done').addEventListener('click', doCheck);
  $('hw-next').addEventListener('click', next);
  $('hw-again').addEventListener('click', () => startAct(S.ai));
  $('hw-nextact').addEventListener('click', () => startAct(S.ai + 1));
  $('hw-list').addEventListener('click', () => openSet(S.set));
  document.querySelectorAll('[data-hwjump]').forEach((b) => b.addEventListener('click', () => jump(+b.dataset.hwjump)));
  $('hw-undo').addEventListener('click', undoJump);
  document.querySelectorAll('[data-hwtool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.hwtool)));
  $('hw-reset').addEventListener('click', () => { if (S.phase === 'play') showTask(); });
}
const bestOf = () => store.get('best', {});
function toMenu() {
  clearScene(); S.phase = 'menu';
  for (const id of ['hw-acts', 'hw-hud', 'hw-over']) $(id).classList.add('hidden');
  $('hw-menu').classList.remove('hidden');
  const best = bestOf();
  $('hw-sets').innerHTML = SETS.map((s, i) => {
    const b = best[s.id] || {}, done = s.acts.filter((_, j) => b[j]).length;
    return `<button type="button" class="hw-set" data-set="${i}"><span class="hw-date">${s.date}</span><b>${s.title}</b><small>${s.sub}</small><span class="hw-prog">${done}/${s.acts.length} ✓</span></button>`;
  }).join('');
  $('hw-sets').querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', () => { C.SFX.initAudio(); openSet(SETS[+b.dataset.set]); }));
}
function openSet(set) {
  clearScene(); S.set = set; S.phase = 'acts';
  for (const id of ['hw-menu', 'hw-hud', 'hw-over']) $(id).classList.add('hidden');
  $('hw-acts').classList.remove('hidden');
  $('hw-acts-title').textContent = `${set.title} · ${set.date}`;
  const b = bestOf()[set.id] || {};
  $('hw-acts-list').innerHTML = set.acts.map((a, j) => `<button type="button" class="m-mode" data-act="${j}"><span class="em">${a.emoji}</span><b>${a.title}</b><span class="best">${b[j] ? '⭐'.repeat(b[j]) : ''}</span></button>`).join('');
  $('hw-acts-list').querySelectorAll('[data-act]').forEach((x) => x.addEventListener('click', () => startAct(+x.dataset.act)));
}
function startAct(ai) {
  if (ai >= S.set.acts.length) return openSet(S.set);
  S.ai = ai; S.act = S.set.acts[ai]; S.i = 0; S.mistakes = 0; S.n = ENGINES[S.act.type].count(S.act);
  for (const id of ['hw-menu', 'hw-acts', 'hw-over']) $(id).classList.add('hidden');
  $('hw-hud').classList.remove('hidden');
  showTask();
}
function showTools(kind) {
  $('hw-tools-jump').classList.toggle('hidden', kind !== 'jump');
  $('hw-tools-borrow').classList.toggle('hidden', kind !== 'borrow');
  if (kind === 'borrow') setTool('remove');
}
function showTask() {
  clearScene();
  scene = { objs: [] };
  held = null;
  showTools(null);
  C.kid.pos.set(0, 0, 1.6); C.kid.facing = -Math.PI / 2; C.kid.vel.set(0, 0, 0);
  const r = ENGINES[S.act.type].build(S.act, S.i);
  $('hw-count').textContent = `${S.i + 1}/${S.n}`;
  $('hw-q').textContent = r.q;
  $('hw-big').textContent = r.big || '';
  $('hw-big').classList.toggle('hidden', !r.big);
  $('hw-eq').classList.add('hidden');
  $('hw-done').classList.toggle('hidden', S.act.type === 'jump');
  $('hw-next').classList.add('hidden');
  $('hw-help').textContent = {
    sort: 'לוחצים על שלט – הדמות לוקחת אותו · לוחצים על אזור – מניחה אותו שם',
    odd: 'לוחצים על שלט – הדמות לוקחת אותו · לוחצים על הארגז – מניחה אותו שם',
    cards: 'לוחצים על כרטיס – לוקחים · לוחצים על עיגול – מניחים · אפשר להחליף',
    borrow: 'בחרו כלי: 🗑️ מורידים קובייה, או ✂️ פורטים קובייה גדולה ל-10 קטנות',
    jump: 'בחרו גודל קפיצה – הדמות קופצת על הציר. עברתם? ↩ מבטלים',
  }[S.act.type];
  S.phase = 'play';
}
async function doCheck() {
  if (S.phase !== 'play') return;
  const err = await ENGINES[S.act.type].check(S.act, S.i);
  if (err) {
    if (!/^קודם|^עוד \d+ שלטים|^צריך כרטיס|^סחבו/.test(err)) S.mistakes++;
    C.SFX.sfxBuzz(); C.kid.play('sad'); C.message(err, 4200);
    return;
  }
  S.phase = 'solved';
  C.SFX.sfxCheer(false); C.kid.play('cheer');
  const e = ENGINES[S.act.type].eq(S.act, S.i);
  if (e && typeof e === 'object') $('hw-eq').innerHTML = e.html; else $('hw-eq').textContent = e || '';
  $('hw-eq').classList.remove('hidden');
  showTools(null);
  $('hw-done').classList.add('hidden'); $('hw-next').classList.remove('hidden');
  $('hw-next').textContent = S.i + 1 < S.n ? 'הבא ▶' : 'סיום ✓';
  C.pop('כל הכבוד!', typeof e === 'object' ? e.text : e, '#7ee08a');
}
function next() {
  S.i++;
  if (S.i < S.n) return showTask();
  clearScene();
  S.phase = 'over';
  const st = S.mistakes === 0 ? 3 : S.mistakes <= 2 ? 2 : 1;
  const best = bestOf(); best[S.set.id] = best[S.set.id] || {}; best[S.set.id][S.ai] = Math.max(best[S.set.id][S.ai] || 0, st); store.set('best', best);
  $('hw-hud').classList.add('hidden'); $('hw-over').classList.remove('hidden');
  $('hw-over-title').textContent = `${S.act.emoji} ${S.act.title} – סיימתם!`;
  $('hw-over-stars').textContent = '⭐'.repeat(st) + '☆'.repeat(3 - st);
  $('hw-over-sub').textContent = S.mistakes === 0 ? 'בלי אף טעות!' : `${S.mistakes} טעויות בדרך – וזה בסדר, ככה לומדים.`;
  $('hw-nextact').classList.toggle('hidden', S.ai + 1 >= S.set.acts.length);
  C.kid.play('cheer'); C.SFX.sfxCheer(true);
}

// ---------- קלט ומצלמה ----------
function onTap(e) {
  if (S.phase !== 'play' || !scene) return S.phase !== 'menu';
  return ENGINES[S.act.type].tap(e) || false;
}
function onAction() { if (S.phase === 'play' && scene) ENGINES[S.act.type].action(); }
function update(dt) {
  if (held) held.group.position.lerp(new THREE.Vector3(C.kid.pos.x, 1.45, C.kid.pos.z), Math.min(1, dt * 14));
}
function camera(core, vt, aspect) {
  if (!S.act || S.phase === 'menu' || S.phase === 'acts' || S.phase === 'over') return null;
  if (S.act.type === 'jump') {
    const tilt = THREE.MathUtils.degToRad(52);
    const look = new THREE.Vector3(THREE.MathUtils.clamp(C.kid.pos.x, -8, 8), 0, LINE_Z - 0.4);
    const dist = Math.max(7.5 / (vt * aspect), 4.2 * Math.sin(tilt) / vt);
    return { pos: look.clone().add(new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt)).multiplyScalar(dist)), look, speed: 3 };
  }
  // כרטיס המשימה מכסה את החלק העליון של המסך – מכוונים כך שהכול יופיע מתחתיו
  const tilt = THREE.MathUtils.degToRad(S.act.type === 'borrow' ? 62 : 52);
  const look = new THREE.Vector3(0, 0, S.act.type === 'borrow' ? -3.3 : -2.6);
  const dist = Math.max(6.4 / (vt * aspect), 4.8 * Math.sin(tilt) / vt);
  return { pos: look.clone().add(new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt)).multiplyScalar(dist)), look, speed: 2.5 };
}

window.__hw = { get S() { return S; }, get scene() { return scene; }, SETS, startAct, openSet, doCheck, jump, undoJump, setTool, ENGINES, dropIn, get held() { return held; }, set held(v) { held = v; } }; // לבדיקות
