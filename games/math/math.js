// עושים חשבון ונהנים – חשבון שעושים בידיים
// הבעיה מבקשת מהילד לעשות משהו (להוסיף, לתת, להביא, להוציא), והדמות שלו עושה את זה בחצר:
// לוקחת פריט אחד בכל פעם ומעבירה בין סלים וארגזים. מה שיש בסלים בסוף – זאת התשובה.
// בסוף כל בעיה סופרים יחד את הפריטים ורואים את התרגיל (למשל 3 + 2 = 5).
import * as THREE from 'three';
import { Player, KIDS } from '../../js/player.js';

const store = {
  get(k, d) { try { const v = localStorage.getItem('stanga-math-' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('stanga-math-' + k, JSON.stringify(v)); } catch {} },
};
const $ = (id) => document.getElementById(id);
const ROUND = 8; // בעיות בכל סבב

let C = null;
const S = { phase: 'menu', mode: 'word', grade: store.get('grade', 'a'), list: [], i: 0, mistakes: 0, prob: null };
let scene = null;     // כל מה שבנינו לבעיה הנוכחית
let held = null;      // הפריט שהדמות מחזיקה
let built = false;

export const MATH = {
  id: 'math', title: 'עושים חשבון ונהנים', emoji: '🧮', color: '#43a047',
  station: { x: 0, z: -3.6 },
  desc: 'מוסיפים ומחסירים בידיים – בעיות ותרגילים (כיתה א׳ וכיתה ג׳)',
  enter(core) {
    C = core;
    if (!built) { setupUI(); built = true; }
    toMenu();
  },
  exit() { clearScene(); S.phase = 'menu'; for (const id of ['m-menu', 'm-hud', 'm-over']) $(id).classList.add('hidden'); },
  canMove: () => S.phase === 'play',
  onTap, onAction, update, camera,
};

// ---------- הבעיות ----------
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const OBJ = {
  ball: { word: 'כַּדּוּרִים', make: () => ball() },
  apple: { word: 'תַּפּוּחִים', make: () => apple() },
};
// סוגי בעיות מילוליות. כל סוג מחזיר: טקסט, מכלים (סלים/ארגז) עם כמה פריטים בהתחלה, יעדים, ותרגיל
const WORD_TYPES = [
  () => { // מוסיפים לסל
    const a = rnd(2, 6), b = rnd(2, 10 - a), o = pick(['ball', 'apple']);
    return { obj: o, text: `בַּסַּל שֶׁל דָּנִי יֵשׁ ${a} ${OBJ[o].word}. שִׂים בַּסַּל שֶׁלּוֹ עוֹד ${b} ${OBJ[o].word} מֵהָאַרְגָּז.`,
      boxes: { crate: 'supply', dani: a }, target: { dani: a + b }, eq: `${a} + ${b} = ${a + b}`, count: 'dani' };
  },
  () => { // נותנים לחבר
    const a = rnd(4, 10), b = rnd(2, a - 1), o = pick(['ball', 'apple']);
    return { obj: o, text: `לְדָנִי יֵשׁ ${a} ${OBJ[o].word}. הוּא רוֹצֶה לָתֵת לְנוֹעָה ${b} ${OBJ[o].word}. עֲזֹר לוֹ לְהַעֲבִיר אוֹתָם!`,
      boxes: { dani: a, noa: 0 }, target: { dani: a - b, noa: b }, eq: `${a} − ${b} = ${a - b}`, count: 'dani' };
  },
  () => { // מביאים את מה שחסר
    const c = rnd(5, 10), a = rnd(1, c - 2);
    return { obj: 'apple', text: `נוֹעָה צְרִיכָה ${c} תַּפּוּחִים לָעוּגָה. בַּסַּל שֶׁלָּהּ יֵשׁ ${a}. הָבֵא לָהּ מֵהָאַרְגָּז אֶת מָה שֶׁחָסֵר!`,
      boxes: { crate: 'supply', noa: a }, target: { noa: c }, eq: `${a} + ${c - a} = ${c}`, count: 'noa', missing: c - a };
  },
  () => { // מוציאים מהסל
    const a = rnd(4, 10), b = rnd(1, a - 1), o = pick(['ball', 'apple']);
    return { obj: o, text: `בַּסַּל שֶׁל נוֹעָה יֵשׁ ${a} ${OBJ[o].word}. הוֹצֵא ${b} ${OBJ[o].word} מֵהַסַּל וְשִׂים אוֹתָם בָּאַרְגָּז.`,
      boxes: { noa: a, crate: 0 }, target: { noa: a - b }, eq: `${a} − ${b} = ${a - b}`, count: 'noa' };
  },
  () => { // אוספים הכול לארגז אחד
    const a = rnd(1, 5), b = rnd(1, 10 - a - 0 > 5 ? 5 : 10 - a);
    return { obj: 'ball', text: `לְדָנִי יֵשׁ ${a} כַּדּוּרִים וּלְנוֹעָה יֵשׁ ${b} כַּדּוּרִים. שִׂים אֶת כָּל הַכַּדּוּרִים בָּאַרְגָּז.`,
      boxes: { dani: a, noa: b, crate: 0 }, target: { dani: 0, noa: 0, crate: a + b }, eq: `${a} + ${b} = ${a + b}`, count: 'crate' };
  },
];
// ---------- כיתה ג': עד 100, עם שקים של עשר ----------
const two = (a, b) => rnd(a, b);
const WORD_C = [
  () => { const a = two(12, 55), b = two(11, Math.min(39, 99 - a)), o = pick(['ball', 'apple']);
    return { obj: o, text: `בסל של דני יש ${a} ${PL[o]}. שים בסל שלו עוד ${b} ${PL[o]} מהארגזים.`, boxes: { crate: 'supply', packs: 'supply', open: 0, dani: a }, target: { dani: a + b }, eq: `${a} + ${b} = ${a + b}`, count: 'dani' }; },
  () => { const a = two(30, 90), b = two(11, a - 6), o = pick(['ball', 'apple']);
    return { obj: o, text: `לדני יש ${a} ${PL[o]}. הוא רוצה לתת לנועה ${b} ${PL[o]}. עזור לו להעביר אותם!`, boxes: { dani: a, noa: 0, open: 0 }, target: { dani: a - b, noa: b }, eq: `${a} − ${b} = ${a - b}`, count: 'dani' }; },
  () => { const c = two(40, 95), a = two(11, c - 12);
    return { obj: 'apple', text: `נועה צריכה ${c} תפוחים לעוגות. בסל שלה יש ${a}. הבא לה מהארגזים את מה שחסר!`, boxes: { crate: 'supply', packs: 'supply', open: 0, noa: a }, target: { noa: c }, eq: `${a} + ${c - a} = ${c}`, count: 'noa' }; },
  () => { const a = two(30, 95), b = two(11, a - 8), o = pick(['ball', 'apple']);
    return { obj: o, text: `בסל של נועה יש ${a} ${PL[o]}. הוצא ${b} ${PL[o]} מהסל ושים אותם בארגז.`, boxes: { noa: a, crate: 0, open: 0 }, target: { noa: a - b }, eq: `${a} − ${b} = ${a - b}`, count: 'noa' }; },
  () => { const a = two(12, 48), b = two(11, Math.min(48, 99 - a));
    return { obj: 'ball', text: `לדני יש ${a} כדורים ולנועה יש ${b} כדורים. שים את כל הכדורים בארגז.`, boxes: { dani: a, noa: b, crate: 0 }, target: { dani: 0, noa: 0, crate: a + b }, eq: `${a} + ${b} = ${a + b}`, count: 'crate' }; },
];
const EX_C = [
  () => { const a = two(12, 60), b = two(11, Math.min(39, 99 - a)), o = pick(['ball', 'apple']);
    return { obj: o, ex: `${a} + ${b}`, text: `בסל יש ${a}. הוסף לסל עוד ${b} מהארגזים.`, boxes: { crate: 'supply', packs: 'supply', open: 0, basket: a }, target: { basket: a + b }, eq: `${a} + ${b} = ${a + b}`, count: 'basket' }; },
  () => { const a = two(25, 95), b = two(11, a - 6), o = pick(['ball', 'apple']);
    return { obj: o, ex: `${a} − ${b}`, text: `בסל יש ${a}. הוצא מהסל ${b} ושים בארגז.`, boxes: { basket: a, crate: 0, open: 0 }, target: { basket: a - b }, eq: `${a} − ${b} = ${a - b}`, count: 'basket' }; },
];
const PL = { ball: 'כדורים', apple: 'תפוחים' };

const EX_TYPES = [
  () => { const a = rnd(1, 6), b = rnd(1, 10 - a), o = pick(['ball', 'apple']);
    return { obj: o, ex: `${a} + ${b}`, text: `בַּסַּל יֵשׁ ${a}. הוֹסֵף לַסַּל עוֹד ${b} מֵהָאַרְגָּז.`, boxes: { crate: 'supply', basket: a }, target: { basket: a + b }, eq: `${a} + ${b} = ${a + b}`, count: 'basket' }; },
  () => { const a = rnd(3, 10), b = rnd(1, a - 1), o = pick(['ball', 'apple']);
    return { obj: o, ex: `${a} − ${b}`, text: `בַּסַּל יֵשׁ ${a}. הוֹצֵא מֵהַסַּל ${b} וְשִׂים בָּאַרְגָּז.`, boxes: { basket: a, crate: 0 }, target: { basket: a - b }, eq: `${a} − ${b} = ${a - b}`, count: 'basket' }; },
];
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function makeRound(mode) {
  const L = [];
  const W = S.grade === 'c' ? WORD_C : WORD_TYPES, E = S.grade === 'c' ? EX_C : EX_TYPES;
  for (let i = 0; i < ROUND; i++) L.push(mode === 'word' ? W[i % W.length]() : E[i % 2]());
  return mode === 'word' ? shuffle(L) : L;
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------- אביזרים ----------
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
function mesh(g, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; }
function ball() { const c = pick(['#e53935', '#1e88e5', '#fdd835', '#43a047']); return mesh(new THREE.SphereGeometry(0.1, 16, 12), M(c, { roughness: 0.35 })); }
function apple() { const g = new THREE.Group(); g.add(mesh(new THREE.SphereGeometry(0.1, 16, 12), M('#d32f2f', { roughness: 0.35 }))); g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 4), M('#5a3a1b'), 0, 0.11, 0)); g.add(mesh(new THREE.SphereGeometry(0.03, 6, 4), M('#43a047'), 0.03, 0.12, 0)); g.children[2].scale.set(1.4, 0.4, 0.8); return g; }
// שק של עשר: מגש עם עשרה פריטים קטנים בשורה (ערך 10)
function pack(o) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.56, 0.05, 0.11), M('#8d6e63'), 0, 0, 0));
  for (let i = 0; i < 10; i++) { const b = mesh(new THREE.SphereGeometry(0.026, 8, 6), M(o === 'apple' ? '#d32f2f' : '#1e88e5', { roughness: 0.4 }), (i - 4.5) * 0.054, 0.045, 0); g.add(b); }
  g.userData.value = 10;
  return g;
}
const val = (it) => it.userData.value || 1;
const total = (box) => box.items.reduce((s, it) => s + val(it), 0);
function makeItems(o, n) {
  // בכיתה ג' – כמה שיותר שקים של עשר, והשאר בודדים
  const out = [];
  if (S.grade === 'c') { for (let i = 0; i < Math.floor(n / 10); i++) out.push(pack(o)); n %= 10; }
  for (let i = 0; i < n; i++) out.push(OBJ[o].make());
  return out;
}
function labelTex(text, bg, fg) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, 512, 160);
  x.strokeStyle = fg; x.lineWidth = 8; x.strokeRect(4, 4, 504, 152);
  x.fillStyle = fg; x.direction = 'rtl'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '800 78px "Noto Sans Hebrew", Rubik';
  x.fillText(text, 256, 86);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// סל עגול פתוח, עם שלט על מקל
function basketMesh(label, color) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.62, 0.5, 0.32, 28, 1, true), M(color, { side: THREE.DoubleSide }), 0, 0.16, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.03, 28), M('#7a5432'), 0, 0.02, 0));
  const rim = mesh(new THREE.TorusGeometry(0.62, 0.035, 8, 32), M('#6b4a2b'), 0, 0.32, 0); rim.rotation.x = Math.PI / 2; g.add(rim);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.34), new THREE.MeshStandardMaterial({ map: labelTex(label, '#fff8dc', '#1c2540'), roughness: 0.8 }));
  sign.position.set(0, 0.62, -0.68); g.add(sign);
  g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), M('#666'), 0, 0.25, -0.7));
  return g;
}
function tableMesh(label) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(1.4, 0.05, 0.9), M('#9a6b3e'), 0, 0.72, 0));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(new THREE.BoxGeometry(0.05, 0.72, 0.05), M('#7a5432'), sx * 0.64, 0.36, sz * 0.4));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.4), new THREE.MeshStandardMaterial({ map: labelTex(label, '#fff3c4', '#7a3b00'), roughness: 0.8 }));
  sign.position.set(0, 0.5, 0.46); g.add(sign);
  return g;
}
function crateMesh(label) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(1.5, 0.45, 1.0), M('#b07a43'), 0, 0.225, 0));
  g.add(mesh(new THREE.BoxGeometry(1.36, 0.02, 0.86), M('#6b4a2b'), 0, 0.452, 0));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.4), new THREE.MeshStandardMaterial({ map: labelTex(label, '#2f6a3a', '#fff8dc'), roughness: 0.8 }));
  sign.position.set(0, 0.25, 0.505); g.add(sign);
  return g;
}

// ---------- בניית הבעיה בחצר ----------
const SPOTS = { dani: [-3.6, 0], noa: [3.6, 0], basket: [-2.4, 0.4], crate: [0, -3], packs: [2.4, -3], open: [-2.6, -3] };
const OWNERS = {
  dani: { name: 'דָּנִי', plain: 'דני', model: 'Casual2_Male', shirt: '#ffd166', pants: '#3a5a86', skin: '#e8bb94', hair: '#3b2414', height: 1.3 },
  noa: { name: 'נוֹעָה', plain: 'נועה', model: 'Casual_Female', shirt: '#f29bb8', pants: '#3c5a86', skin: '#f0c9a8', hair: '#6b3e1f', height: 1.3 },
};
function slotPos(box, i) {
  // שתי שורות של חמישה (כמו "מסגרת עשר") – קל לספור
  const base = box.kind === 'crate' ? 0.56 : box.kind === 'table' ? 0.8 : 0.16;
  const sx = box.kind === 'crate' ? 0.24 : 0.2;
  return new THREE.Vector3((i % 5 - 2) * sx, base + Math.floor(i / 10) * 0.2, (Math.floor(i / 5) % 2 - 0.5) * 0.24 + (box.hasPacks ? 0.2 : 0));
}
function layout(box) {
  // שקים מאחור (שורות של 3, בקומות), בודדים מקדימה
  const packs = box.items.filter((it) => val(it) === 10), singles = box.items.filter((it) => val(it) === 1);
  box.hasPacks = packs.length > 0;
  const base = box.kind === 'crate' ? 0.5 : box.kind === 'table' ? 0.78 : 0.08;
  packs.forEach((it, i) => it.position.set(box.pos.x, base + Math.floor(i / 3) * 0.07, box.pos.z - 0.32 + (i % 3) * 0.13));
  singles.forEach((it, i) => { const p = slotPos(box, i); it.position.set(box.pos.x + p.x, p.y, box.pos.z + p.z); });
}
function buildProblem(p) {
  clearScene();
  scene = { boxes: {}, objs: [], actors: [] };
  for (const [key, start] of Object.entries(p.boxes)) {
    const [x, z] = SPOTS[key];
    const kind = key === 'crate' || key === 'packs' ? 'crate' : key === 'open' ? 'table' : 'basket';
    const c3 = S.grade === 'c';
    const label = key === 'crate' ? (c3 && p.boxes.packs ? 'בודדים' : c3 ? 'ארגז' : 'אַרְגָּז') : key === 'packs' ? 'שקים של 10' : key === 'open' ? 'פותחים שק ✂️' : key === 'basket' ? (c3 ? 'הסל' : 'הַסַּל') : `${c3 ? 'הסל של' : 'הַסַּל שֶׁל'} ${c3 ? OWNERS[key].plain : OWNERS[key].name}`;
    const g = kind === 'crate' ? crateMesh(label) : kind === 'table' ? tableMesh(label) : basketMesh(label, key === 'dani' ? '#c98a3a' : key === 'noa' ? '#d77fa1' : '#b8894a');
    g.position.set(x, 0, z);
    C.R.scene.add(g); scene.objs.push(g);
    const box = { key, kind, pos: new THREE.Vector3(x, 0, z), group: g, items: [], supply: start === 'supply' };
    g.traverse((o) => { o.userData.box = box; });
    const list = key === 'packs' ? Array.from({ length: 6 }, () => pack(p.obj)) : start === 'supply' ? Array.from({ length: 10 }, () => OBJ[p.obj].make()) : makeItems(p.obj, start);
    for (const it of list) { C.R.scene.add(it); box.items.push(it); }
    layout(box);
    scene.boxes[key] = box;
    if (OWNERS[key]) {
      const o = OWNERS[key];
      const a = new Player(C.R.scene, { ...KIDS.p1, ...o, model: C.A.kids && C.A.kids[o.model] });
      a.arrow.visible = false; a.ring.visible = false;
      a.pos.set(x, 0, z - 1.15); a.facing = Math.PI / 2;
      scene.actors.push(a);
    }
  }
}
function clearScene() {
  if (!scene) return;
  for (const o of scene.objs) C.R.scene.remove(o);
  for (const b of Object.values(scene.boxes)) for (const it of b.items) C.R.scene.remove(it);
  for (const a of scene.actors) C.R.scene.remove(a.root);
  if (held) { C.R.scene.remove(held.item); held = null; }
  scene = null;
}

// ---------- לקחת ולשים ----------
function boxAt(e) {
  if (!scene) return null;
  const hits = C.rayFrom(e).intersectObjects([...scene.objs, ...Object.values(scene.boxes).flatMap((b) => b.items)], true);
  for (const h of hits) { let o = h.object; while (o && !o.userData.box) o = o.parent; if (o) return o.userData.box; const b = Object.values(scene.boxes).find((x) => x.items.includes(h.object) || x.items.some((it) => it === h.object.parent)); if (b) return b; }
  return null;
}
function onTap(e) {
  if (S.phase !== 'play') return true;
  const box = boxAt(e);
  if (box) { goTo(box); return true; }
  return false;
}
function goTo(box) {
  const front = box.pos.clone().add(new THREE.Vector3(0, 0, box.kind === 'crate' ? 0.95 : 0.85));
  C.walkTo(front, () => act(box));
}
function onAction() {
  if (S.phase !== 'play' || !scene) return;
  let best = null, bd = 1.7;
  for (const b of Object.values(scene.boxes)) { const d = Math.hypot(b.pos.x - C.kid.pos.x, b.pos.z + 0.85 - C.kid.pos.z); if (d < bd) { bd = d; best = b; } }
  if (best) act(best); else C.message('צָרִיךְ לַעֲמֹד לְיַד סַל אוֹ אַרְגָּז');
}
function act(box) {
  if (held) {
    // שק על שולחן הפתיחה – הופך לעשרה בודדים
    if (box.key === 'open' && val(held.item) === 10) {
      C.R.scene.remove(held.item); held = null;
      for (let i = 0; i < 10; i++) { const it = OBJ[S.prob.obj].make(); C.R.scene.add(it); box.items.push(it); }
      layout(box); C.SFX.sfxClang(); C.pop('10 = 1+1+1+1+1+1+1+1+1+1', 'פתחנו שק!', '#ffd23f');
      return;
    }
    // שמים את הפריט בסל
    box.items.push(held.item); held = null; layout(box);
    C.SFX.sfxBounce(0.35); C.kid.play('kick');
    if (box.supply) layout(box);
  } else {
    if (!box.items.length) { C.message('הַסַּל רֵיק 🙂'); return; }
    // לוקחים בודד אם יש (קל יותר לספור), אחרת שק
    const singles = box.items.filter((it) => val(it) === 1);
    const item = box.key === 'packs' ? box.items[box.items.length - 1] : (singles[singles.length - 1] || box.items[box.items.length - 1]);
    box.items.splice(box.items.indexOf(item), 1); layout(box);
    if (box.supply) { const it = box.key === 'packs' ? pack(S.prob.obj) : OBJ[S.prob.obj].make(); C.R.scene.add(it); box.items.push(it); layout(box); } // ארגז שלא נגמר
    held = { item, from: box };
    C.SFX.sfxKick(0.2); C.kid.play('lob');
  }
}

// ---------- בדיקה ----------
function check() {
  if (S.phase !== 'play') return;
  if (held) { C.message('קֹדֶם שִׂים בְּסַל אֶת מָה שֶׁבַּיָּדַיִם 🙂'); return; }
  const p = S.prob;
  for (const [key, want] of Object.entries(p.target)) {
    const have = total(scene.boxes[key]);
    if (have !== want) {
      S.mistakes++;
      const c3 = S.grade === 'c';
      const name = key === 'crate' ? (c3 ? 'בארגז' : 'בָּאַרְגָּז') : key === 'basket' ? (c3 ? 'בסל' : 'בַּסַּל') : (c3 ? `בסל של ${OWNERS[key].plain}` : `בַּסַּל שֶׁל ${OWNERS[key].name}`);
      C.SFX.sfxBuzz(); C.kid.play('sad');
      C.message(c3 ? `עוד לא... ${name} יש עכשיו ${have}. קראו שוב את הבעיה 🧐` : `עוֹד לֹא... ${name} יֵשׁ עַכְשָׁו ${have}. קִרְאוּ שׁוּב אֶת הַבְּעָיָה 🧐`, 3600);
      updateHud();
      return;
    }
  }
  success();
}
// מצליחים: סופרים יחד את הפריטים ורואים את התרגיל
async function success() {
  S.phase = 'count';
  C.SFX.sfxCheer(false);
  C.kid.play('cheer');
  const box = scene.boxes[S.prob.count];
  const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));
  const order = [...box.items.filter((it) => val(it) === 10), ...box.items.filter((it) => val(it) === 1)];
  let sum = 0;
  for (let i = 0; i < order.length; i++) {
    const it = order[i];
    sum += val(it);
    it.scale.setScalar(1.6); C.pop(String(sum), '', '#ffd23f'); C.SFX.sfxBounce(0.2 + Math.min(i, 12) * 0.03);
    await wait(order.length > 12 ? 0.4 : 0.55);
    it.scale.setScalar(1.15);
    if (S.phase !== 'count') return;
  }
  $('m-eq').textContent = S.prob.eq;
  $('m-eq').classList.remove('hidden');
  $('m-done').classList.add('hidden'); $('m-next').classList.remove('hidden');
  C.pop('כָּל הַכָּבוֹד!', S.prob.eq, '#7ee08a');
  for (const a of scene.actors) a.play('cheer');
  S.phase = 'solved';
}

// ---------- ממשק ----------
function setupUI() {
  document.querySelectorAll('[data-mmode]').forEach((b) => b.addEventListener('click', () => { C.SFX.initAudio(); startRound(b.dataset.mmode); }));
  document.querySelectorAll('[data-mgrade]').forEach((b) => b.addEventListener('click', () => { S.grade = b.dataset.mgrade; store.set('grade', S.grade); toMenu(); C.SFX.initAudio(); C.SFX.sfxKick(0.2); }));
  $('m-back').addEventListener('click', () => C.exitGame());
  $('m-home').addEventListener('click', toMenu);
  $('m-done').addEventListener('click', check);
  $('m-next').addEventListener('click', next);
  $('m-again').addEventListener('click', () => startRound(S.mode));
  $('m-other').addEventListener('click', toMenu);
}
function toMenu() {
  clearScene(); S.phase = 'menu';
  $('m-menu').classList.remove('hidden'); $('m-hud').classList.add('hidden'); $('m-over').classList.add('hidden');
  document.querySelectorAll('[data-mgrade]').forEach((x) => x.classList.toggle('on', x.dataset.mgrade === S.grade));
  const best = store.get('best', {});
  $('m-best-word').textContent = best[S.grade + 'word'] != null ? '⭐'.repeat(best[S.grade + 'word']) : '';
  $('m-best-ex').textContent = best[S.grade + 'ex'] != null ? '⭐'.repeat(best[S.grade + 'ex']) : '';
  $('m-hint-c').classList.toggle('hidden', S.grade !== 'c');
}
function startRound(mode) {
  S.mode = mode; S.list = makeRound(mode); S.i = 0; S.mistakes = 0;
  $('m-menu').classList.add('hidden'); $('m-over').classList.add('hidden'); $('m-hud').classList.remove('hidden');
  showProblem();
}
function showProblem() {
  const p = S.prob = S.list[S.i];
  buildProblem(p);
  C.kid.pos.set(0, 0, 0.9); C.kid.facing = -Math.PI / 2; C.kid.vel.set(0, 0, 0);
  $('m-ex').textContent = p.ex ? `${p.ex} = ?` : '';
  $('m-ex').classList.toggle('hidden', !p.ex);
  $('m-text').textContent = p.text;
  $('m-card').classList.toggle('nikud', S.grade === 'a');
  $('m-eq').classList.add('hidden');
  $('m-done').classList.remove('hidden'); $('m-next').classList.add('hidden');
  S.phase = 'play';
  updateHud();
}
function updateHud() { $('m-count').textContent = `${S.i + 1}/${S.list.length}`; }
function next() {
  S.i++;
  if (S.i >= S.list.length) return finish();
  showProblem();
}
function finish() {
  clearScene();
  S.phase = 'over';
  const st = S.mistakes === 0 ? 3 : S.mistakes <= 2 ? 2 : 1;
  const best = store.get('best', {}); const bk = S.grade + S.mode; best[bk] = Math.max(best[bk] || 0, st); store.set('best', best);
  $('m-hud').classList.add('hidden'); $('m-over').classList.remove('hidden');
  $('m-over-stars').textContent = '⭐'.repeat(st) + '☆'.repeat(3 - st);
  $('m-over-sub').textContent = S.mistakes === 0 ? 'פתרת הכול בלי אף טעות!' : `פתרת ${S.list.length} בעיות.`;
  C.kid.play('cheer'); C.SFX.sfxCheer(true);
}

// ---------- בכל פריים ----------
function update(dt) {
  if (held) { held.item.position.lerp(new THREE.Vector3(C.kid.pos.x, 1.62, C.kid.pos.z), Math.min(1, dt * 16)); }
  if (scene) for (const a of scene.actors) {
    const want = Math.atan2(C.kid.pos.z - a.pos.z, C.kid.pos.x - a.pos.x);
    let d = want - a.facing; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    a.facing += d * Math.min(1, dt * 2); a.update(dt, C.time);
  }
}
function camera(core, vt, aspect) {
  // קרוב מספיק כדי לראות טוב את הפריטים בסלים; מכוונים קצת קדימה כי כרטיס הבעיה מכסה את החלק העליון של המסך
  const tilt = THREE.MathUtils.degToRad(50);
  const look = new THREE.Vector3(0, 0, -1.9);
  const dist = Math.max(5.0 / (vt * aspect), 4.4 * Math.sin(tilt) / vt);
  return { pos: look.clone().add(new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt)).multiplyScalar(dist)), look, speed: 2.5 };
}

window.__math = { get S() { return S; }, get scene() { return scene; }, act: (k) => act(scene.boxes[k]), check };
