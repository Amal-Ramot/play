// עושים חשבון ונהנים – חשבון שעושים בידיים
// הבעיה מבקשת מהילד לעשות משהו (להוסיף, לתת, להביא, להוציא), והדמות שלו עושה את זה בחצר:
// לוקחת פריט אחד בכל פעם ומעבירה בין סלים וארגזים. מה שיש בסלים בסוף – זאת התשובה.
// בסוף כל בעיה סופרים יחד את הפריטים ורואים את התרגיל (למשל 3 + 2 = 5).
import * as THREE from 'three';
import { Player, KIDS } from '../../js/player.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ---------- חפצים מפורטים (רק בגרסת המחשב) ----------
// נבנו מראש עם sand3d ונשמרו ב-assets/hd. אם משהו לא נטען – נשארים החפצים הפשוטים.
const HD = {};
if (window.PLAY_DESKTOP) {
  const L = new GLTFLoader();
  for (const n of ['bench', 'basket', 'crate', 'table']) {
    L.loadAsync(`assets/hd/${n}.glb`).then((g) => {
      g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      HD[n] = g.scene;
    }).catch(() => {});
  }
}
function hd(n) { return HD[n] ? HD[n].clone(true) : null; }

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
  kid: { word: 'ילדים', make: () => kidFig() },
};
// כל בעיה מחזירה: obj (כדורים/תפוחים), text (הבעיה), boxes (מה יש בכל מכל בהתחלה), target (מה צריך להיות בסוף),
// eq: [מספר, פעולה, מספר, תוצאה] (לתרגיל שמוצג בסוף), count (איזה סל סופרים בסוף), ex (בתרגילים: מה כתוב למעלה)
const W1 = (o) => OBJ[o].word;

// ===== כיתה א' – עד 10 (עם ניקוד) =====
const WORD_A = [
  () => { const a = rnd(2, 6), b = rnd(2, 10 - a), o = pick(['ball', 'apple']); // מוסיפים
    return { obj: o, text: `בַּסַּל שֶׁל דָּנִי יֵשׁ ${a} ${W1(o)}. שִׂים בַּסַּל שֶׁלּוֹ עוֹד ${b} ${W1(o)} מֵהָאַרְגָּז.`, boxes: { crate: 'supply', dani: a }, target: { dani: a + b }, eq: [a, '+', b, a + b], count: 'dani' }; },
  () => { const a = rnd(4, 10), b = rnd(2, a - 1), o = pick(['ball', 'apple']); // נותנים
    return { obj: o, text: `לְדָנִי יֵשׁ ${a} ${W1(o)}. הוּא רוֹצֶה לָתֵת לְנוֹעָה ${b} ${W1(o)}. עֲזֹר לוֹ לְהַעֲבִיר אוֹתָם!`, boxes: { dani: a, noa: 0 }, target: { dani: a - b, noa: b }, eq: [a, '−', b, a - b], count: 'dani' }; },
  () => { const c = rnd(5, 10), a = rnd(1, c - 2); // חסר – צריך לחשב כמה להביא
    return { obj: 'apple', text: `נוֹעָה צְרִיכָה ${c} תַּפּוּחִים לָעוּגָה. בַּסַּל שֶׁלָּהּ יֵשׁ ${a}. הָבֵא לָהּ מֵהָאַרְגָּז אֶת מָה שֶׁחָסֵר!`, boxes: { crate: 'supply', noa: a }, target: { noa: c }, eq: [a, '+', c - a, c], count: 'noa' }; },
  () => { const a = rnd(4, 10), b = rnd(1, a - 1), o = pick(['ball', 'apple']); // מוציאים
    return { obj: o, text: `בַּסַּל שֶׁל נוֹעָה יֵשׁ ${a} ${W1(o)}. הוֹצֵא ${b} ${W1(o)} מֵהַסַּל וְשִׂים אוֹתָם בָּאַרְגָּז.`, boxes: { noa: a, crate: 0 }, target: { noa: a - b }, eq: [a, '−', b, a - b], count: 'noa' }; },
  () => { const a = rnd(1, 5), b = rnd(1, Math.min(5, 10 - a)); // אוספים
    return { obj: 'ball', text: `לְדָנִי יֵשׁ ${a} כַּדּוּרִים וּלְנוֹעָה יֵשׁ ${b} כַּדּוּרִים. שִׂים אֶת כָּל הַכַּדּוּרִים בָּאַרְגָּז.`, boxes: { dani: a, noa: b, crate: 0 }, target: { dani: 0, noa: 0, crate: a + b }, eq: [a, '+', b, a + b], count: 'crate' }; },
  () => { const a = rnd(1, 5), c = rnd(a + 2, 10); // השוואה – כמה חסר לדני כדי שיהיה לו כמו לנועה
    return { obj: 'ball', text: `לְדָנִי יֵשׁ ${a} כַּדּוּרִים וּלְנוֹעָה יֵשׁ ${c}. הָבֵא לְדָנִי כַּדּוּרִים מֵהָאַרְגָּז, כְּדֵי שֶׁיִּהְיֶה לוֹ כְּמוֹ לְנוֹעָה.`, boxes: { crate: 'supply', dani: a, noa: c }, target: { dani: c, noa: c }, eq: [a, '+', c - a, c], count: 'dani' }; },
  () => { const n = 2 * rnd(2, 5); // חלוקה שווה
    return { obj: 'apple', text: `בָּאַרְגָּז יֵשׁ ${n} תַּפּוּחִים. חַלֵּק אוֹתָם שָׁוֶה בְּשָׁוֶה בֵּין דָּנִי לְנוֹעָה.`, boxes: { crate: n, dani: 0, noa: 0 }, target: { dani: n / 2, noa: n / 2, crate: 0 }, eq: [n / 2, '+', n / 2, n], count: 'dani' }; },
];
const EX_A = [
  () => { const a = rnd(1, 6), b = rnd(1, 10 - a), o = pick(['ball', 'apple']);
    return { obj: o, ex: `${a} + ${b} = ?`, text: `בַּסַּל יֵשׁ ${a}. הוֹסֵף לַסַּל עוֹד ${b} מֵהָאַרְגָּז.`, boxes: { crate: 'supply', basket: a }, target: { basket: a + b }, eq: [a, '+', b, a + b], count: 'basket' }; },
  () => { const a = rnd(3, 10), b = rnd(1, a - 1), o = pick(['ball', 'apple']);
    return { obj: o, ex: `${a} − ${b} = ?`, text: `בַּסַּל יֵשׁ ${a}. הוֹצֵא מֵהַסַּל ${b} וְשִׂים בָּאַרְגָּז.`, boxes: { basket: a, crate: 0 }, target: { basket: a - b }, eq: [a, '−', b, a - b], count: 'basket' }; },
  () => { const c = rnd(4, 10), a = rnd(1, c - 1), o = pick(['ball', 'apple']); // נעלם: כמה צריך להוסיף?
    return { obj: o, ex: `${a} + ? = ${c}`, text: `בַּסַּל יֵשׁ ${a}. הוֹסֵף לַסַּל מֵהָאַרְגָּז עַד שֶׁיִּהְיוּ בּוֹ ${c}.`, boxes: { crate: 'supply', basket: a }, target: { basket: c }, eq: [a, '+', c - a, c], count: 'basket' }; },
];

// ===== כיתה ג' – עד 100, עם שקים של עשר =====
// r = האם הבעיה בנויה כך שצריך המרה (חיבור: האחדות עוברות 10) או פריטה (חיסור: אין מספיק אחדות)
function genAdd(r) {
  for (;;) { const a = rnd(12, 68), b = rnd(11, 39); if (a + b <= 99 && ((a % 10) + (b % 10) >= 10) === r) return [a, b]; }
}
function genSub(r) {
  for (;;) { const a = rnd(30, 95), b = rnd(11, a - 6); if (((a % 10) < (b % 10)) === r) return [a, b]; }
}
const PL = { ball: 'כדורים', apple: 'תפוחים' };
// בכיתה ג' בארגז הבודדים יש רק 9 – אי אפשר להביא הכול בבודדים, צריך לחשוב בעשרות ואחדות
const SRC = { crate: 9, packs: 'supply', open: 0, close: 0 };
const TBL = { open: 0, close: 0 };
const WORD_C = [
  (r) => { const [a, b] = genAdd(r), o = pick(['ball', 'apple']);
    return { obj: o, text: `בסל של דני יש ${a} ${PL[o]}. שים בסל שלו עוד ${b} ${PL[o]} מהארגזים.`, boxes: { ...SRC, dani: a }, target: { dani: a + b }, eq: [a, '+', b, a + b], count: 'dani' }; },
  (r) => { const [a, b] = genSub(r), o = pick(['ball', 'apple']);
    return { obj: o, text: `לדני יש ${a} ${PL[o]}. הוא רוצה לתת לנועה ${b} ${PL[o]}. עזור לו להעביר אותם!`, boxes: { ...TBL, dani: a, noa: 0 }, target: { dani: a - b, noa: b }, eq: [a, '−', b, a - b], count: 'dani' }; },
  (r) => { const [a, b] = genAdd(r);
    return { obj: 'apple', text: `נועה צריכה ${a + b} תפוחים לעוגות. בסל שלה יש ${a}. הבא לה מהארגזים את מה שחסר!`, boxes: { ...SRC, noa: a }, target: { noa: a + b }, eq: [a, '+', b, a + b], count: 'noa' }; },
  (r) => { const [a, b] = genSub(r), o = pick(['ball', 'apple']);
    return { obj: o, text: `בסל של נועה יש ${a} ${PL[o]}. הוצא ${b} ${PL[o]} מהסל ושים אותם בארגז.`, boxes: { ...TBL, noa: a, crate: 0 }, target: { noa: a - b }, eq: [a, '−', b, a - b], count: 'noa' }; },
  (r) => { const [a, b] = genAdd(r);
    return { obj: 'ball', text: `לדני יש ${a} כדורים ולנועה יש ${b} כדורים. שים את כל הכדורים בארגז.`, boxes: { ...TBL, dani: a, noa: b, crate: 0 }, target: { dani: 0, noa: 0, crate: a + b }, eq: [a, '+', b, a + b], count: 'crate' }; },
  (r) => { const [a, b] = genAdd(r);
    return { obj: 'ball', text: `לדני יש ${a} כדורים ולנועה יש ${a + b}. הבא לדני כדורים מהארגזים, כדי שיהיה לו כמו לנועה.`, boxes: { ...SRC, dani: a, noa: a + b }, target: { dani: a + b, noa: a + b }, eq: [a, '+', b, a + b], count: 'dani' }; },
  (r) => { const half = r ? 10 * pick([1, 2, 3, 4]) + 5 + rnd(0, 4) : 10 * pick([1, 2, 3, 4]) + rnd(1, 4), n = half * 2; // עשרות אי-זוגיות = צריך לפתוח שק
    return { obj: 'apple', text: `בארגז יש ${n} תפוחים. חלק אותם שווה בשווה בין דני לנועה.`, boxes: { ...TBL, crate: n, dani: 0, noa: 0 }, target: { dani: half, noa: half, crate: 0 }, eq: [half, '+', half, n], count: 'dani' }; },
];
const EX_C = [
  (r) => { const [a, b] = genAdd(r), o = pick(['ball', 'apple']);
    return { obj: o, ex: `${a} + ${b} = ?`, text: `בסל יש ${a}. הוסף לסל עוד ${b} מהארגזים.`, boxes: { ...SRC, basket: a }, target: { basket: a + b }, eq: [a, '+', b, a + b], count: 'basket' }; },
  (r) => { const [a, b] = genSub(r), o = pick(['ball', 'apple']);
    return { obj: o, ex: `${a} − ${b} = ?`, text: `בסל יש ${a}. הוצא מהסל ${b} ושים בארגז.`, boxes: { ...TBL, basket: a, crate: 0 }, target: { basket: a - b }, eq: [a, '−', b, a - b], count: 'basket' }; },
  (r) => { const [a, b] = genAdd(r), o = pick(['ball', 'apple']);
    return { obj: o, ex: `${a} + ? = ${a + b}`, text: `בסל יש ${a}. הוסף לסל מהארגזים עד שיהיו בו ${a + b}.`, boxes: { ...SRC, basket: a }, target: { basket: a + b }, eq: [a, '+', b, a + b], count: 'basket' }; },
];
// ===== כיתה ג': מחלקים לקבוצות (כפל וחילוק) =====
// ילדים יושבים על ספסל; מובילים אותם לעיגולים על המגרש (כל עיגול = קבוצה)
const circles = (k) => Object.fromEntries(Array.from({ length: k }, (_, i) => [`g${i + 1}`, 0]));
const GROUPS_C = [
  () => { const k = rnd(2, 4), m = rnd(2, 5), n = k * m; // חלוקה לקבוצות שוות
    return { obj: 'kid', groups: true, text: `על הספסל יושבים ${n} ילדים. חלק אותם ל-${k} קבוצות שוות.`, boxes: { bench: n, ...circles(k) }, target: { bench: 0, ...Object.fromEntries(Object.keys(circles(k)).map((g) => [g, m])) }, eq: `${n} : ${k} = ${m}` }; },
  () => { const m = rnd(2, 4), q = rnd(2, 5), n = m * q; // כמה קבוצות אפשר לעשות?
    return { obj: 'kid', groups: true, text: `על הספסל יושבים ${n} ילדים. בכל קבוצה צריכים ${m} שחקנים. סדר כמה שיותר קבוצות.`, boxes: { bench: n, ...circles(5) },
      check: (b) => { const full = Object.keys(b).filter((g) => g[0] === 'g' && total(b[g]) > 0); if (total(b.bench) > 0) return 'על הספסל עוד יושבים ילדים 🤔'; const bad = full.find((g) => total(b[g]) !== m); if (bad) return `בקבוצה אחת יש ${total(b[bad])} שחקנים. צריך ${m} בכל קבוצה.`; return null; },
      eq: `${n} : ${m} = ${q}` }; },
  () => { const k = rnd(2, 4), m = rnd(2, 5), extra = rnd(1, 3); // כפל: על הספסל יש יותר ממה שצריך
    return { obj: 'kid', groups: true, text: `צריך ${k} קבוצות, ובכל קבוצה ${m} ילדים. הבא ילדים מהספסל וסדר את הקבוצות.`, boxes: { bench: k * m + extra, ...circles(k) }, target: Object.fromEntries(Object.keys(circles(k)).map((g) => [g, m])), eq: `${k} × ${m} = ${k * m}` }; },
  () => { const k = rnd(2, 4), m = rnd(2, 4), r = rnd(1, k - 1), n = k * m + r; // שארית
    return { obj: 'kid', groups: true, text: `על הספסל יושבים ${n} ילדים. חלק אותם ל-${k} קבוצות שוות. מי שנשאר – נשאר על הספסל.`, boxes: { bench: n, ...circles(k) }, target: { bench: r, ...Object.fromEntries(Object.keys(circles(k)).map((g) => [g, m])) }, eq: `${n} : ${k} = ${m} (שארית ${r})` }; },
];
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function makeRound(mode) {
  if (mode === 'groups') return shuffle([...GROUPS_C.keys(), ...GROUPS_C.keys()]).slice(0, ROUND).map((t) => GROUPS_C[t]());
  const W = S.grade === 'c' ? WORD_C : WORD_A, E = S.grade === 'c' ? EX_C : EX_A;
  const types = mode === 'word' ? W : E;
  // סוגים מתחלפים, וחצי מהבעיות עם המרה/פריטה
  const order = shuffle([...types.keys(), ...types.keys()]).slice(0, ROUND);
  return order.map((t, i) => types[t](i % 2 === 0));
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------- אביזרים ----------
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
function mesh(g, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; }
function ball() { const c = pick(['#e53935', '#1e88e5', '#fdd835', '#43a047']); return mesh(new THREE.SphereGeometry(0.1, 16, 12), M(c, { roughness: 0.35 })); }
function apple() { const g = new THREE.Group(); g.add(mesh(new THREE.SphereGeometry(0.1, 16, 12), M('#d32f2f', { roughness: 0.35 }))); g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 4), M('#5a3a1b'), 0, 0.11, 0)); g.add(mesh(new THREE.SphereGeometry(0.03, 6, 4), M('#43a047'), 0.03, 0.12, 0)); g.children[2].scale.set(1.4, 0.4, 0.8); return g; }
// ילד קטן (דמות פשוטה וקלה – כדי שיהיו הרבה בלי להאט את המשחק)
const SHIRTS = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#ff7eb6', '#ff9800', '#8e24aa', '#00acc1'];
const SKINS = ['#f0c9a8', '#e2b08a', '#c48e62', '#a8714a'];
const HAIRS = ['#2a1a10', '#6b3e1f', '#140c07', '#b8862e'];
function kidFig() {
  const g = new THREE.Group();
  const shirt = M(pick(SHIRTS)), skin = M(pick(SKINS));
  g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.26, 10), M('#3a4a6a'), 0, 0.13, 0));
  g.add(mesh(new THREE.CapsuleGeometry(0.12, 0.18, 4, 10), shirt, 0, 0.42, 0));
  g.add(mesh(new THREE.SphereGeometry(0.12, 14, 10), skin, 0, 0.72, 0));
  const hair = mesh(new THREE.SphereGeometry(0.125, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(pick(HAIRS)), 0, 0.74, -0.01); g.add(hair);
  for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.018, 6, 6), M('#222'), s * 0.045, 0.73, 0.11));
  g.userData.kid = true;
  return g;
}
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
  if (S.grade === 'c' && o !== 'kid') { for (let i = 0; i < Math.floor(n / 10); i++) out.push(pack(o)); n %= 10; }
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
  const h = hd('basket');
  if (h) {
    h.traverse((o) => { if (o.isMesh && /body/i.test(o.name)) { o.material = o.material.clone(); o.material.color.set(color); } });
    g.add(h);
  } else {
    g.add(mesh(new THREE.CylinderGeometry(0.62, 0.5, 0.32, 28, 1, true), M(color, { side: THREE.DoubleSide }), 0, 0.16, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.03, 28), M('#7a5432'), 0, 0.02, 0));
    const rim = mesh(new THREE.TorusGeometry(0.62, 0.035, 8, 32), M('#6b4a2b'), 0, 0.32, 0); rim.rotation.x = Math.PI / 2; g.add(rim);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.34), new THREE.MeshStandardMaterial({ map: labelTex(label, '#fff8dc', '#1c2540'), roughness: 0.8 }));
  sign.position.set(0, 0.62, -0.68); g.add(sign);
  g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), M('#666'), 0, 0.25, -0.7));
  return g;
}
function tableMesh(label) {
  const g = new THREE.Group();
  const h = hd('table');
  if (h) g.add(h);
  else {
    g.add(mesh(new THREE.BoxGeometry(1.4, 0.05, 0.9), M('#9a6b3e'), 0, 0.72, 0));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(new THREE.BoxGeometry(0.05, 0.72, 0.05), M('#7a5432'), sx * 0.64, 0.36, sz * 0.4));
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.4), new THREE.MeshStandardMaterial({ map: labelTex(label, '#fff3c4', '#7a3b00'), roughness: 0.8 }));
  sign.position.set(0, 0.5, 0.46); g.add(sign);
  return g;
}
function crateMesh(label) {
  const g = new THREE.Group();
  const h = hd('crate');
  if (h) g.add(h);
  else {
    g.add(mesh(new THREE.BoxGeometry(1.5, 0.45, 1.0), M('#b07a43'), 0, 0.225, 0));
    g.add(mesh(new THREE.BoxGeometry(1.36, 0.02, 0.86), M('#6b4a2b'), 0, 0.452, 0));
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.4), new THREE.MeshStandardMaterial({ map: labelTex(label, '#2f6a3a', '#fff8dc'), roughness: 0.8 }));
  sign.position.set(0, 0.25, 0.505); g.add(sign);
  return g;
}

// ---------- בניית הבעיה בחצר ----------
const SPOTS = { dani: [-3.6, 0.4], noa: [3.6, 0.4], basket: [-2.2, 0.5], crate: [-1.2, -3.1], packs: [1.2, -3.1], open: [-3.9, -3.1], close: [3.9, -3.1] };
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
function benchMesh() {
  const h = hd('bench'); if (h) return h;
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(7.2, 0.08, 0.6), M('#a0703f'), 0, 0.42, 0));
  for (const x of [-3.3, 0, 3.3]) g.add(mesh(new THREE.BoxGeometry(0.1, 0.42, 0.5), M('#5a4a3a'), x, 0.21, 0));
  g.add(mesh(new THREE.BoxGeometry(7.2, 0.5, 0.06), M('#a0703f'), 0, 0.75, -0.28));
  return g;
}
function circleMesh(i) {
  const g = new THREE.Group();
  const col = ['#ffd23f', '#4ecdc4', '#ff7eb6', '#a06cd5', '#ff9f43'][i % 5];
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.92, 40), new THREE.MeshBasicMaterial({ color: col }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(0.78, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.18 }));
  fill.rotation.x = -Math.PI / 2; fill.position.y = 0.025; g.add(fill);
  return g;
}
function layout(box) {
  if (box.kind === 'bench') { box.items.forEach((it, i) => it.position.set(box.pos.x + (i % 12 - 5.5) * 0.55, i < 12 ? 0.46 : 0, box.pos.z + (i < 12 ? 0 : 0.6))); return; }
  if (box.kind === 'circle') { const n = box.items.length; box.items.forEach((it, i) => { const a = (i / Math.max(n, 1)) * Math.PI * 2, r = n <= 1 ? 0 : 0.42; it.position.set(box.pos.x + Math.cos(a) * r, 0.03, box.pos.z + Math.sin(a) * r); it.rotation.y = -a + Math.PI / 2; }); return; }
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
    const nCircles = Object.keys(p.boxes).filter((k) => /^g\d$/.test(k)).length;
    const [x, z] = key === 'bench' ? [0, -3.4] : /^g\d$/.test(key) ? [((+key.slice(1) - 1) - (nCircles - 1) / 2) * 2.3, -0.2] : SPOTS[key];
    const kind = key === 'bench' ? 'bench' : /^g\d$/.test(key) ? 'circle' : key === 'crate' || key === 'packs' ? 'crate' : key === 'open' || key === 'close' ? 'table' : 'basket';
    const c3 = S.grade === 'c';
    const label = kind === 'bench' || kind === 'circle' ? '' : key === 'crate' ? (c3 && p.boxes.packs ? 'בודדים (9)' : c3 ? 'ארגז' : 'אַרְגָּז') : key === 'packs' ? 'שקים של 10' : key === 'open' ? 'פותחים שק ✂️' : key === 'close' ? 'סוגרים שק 🎀' : key === 'basket' ? (c3 ? 'הסל' : 'הַסַּל') : `${c3 ? 'הסל של' : 'הַסַּל שֶׁל'} ${c3 ? OWNERS[key].plain : OWNERS[key].name}`;
    const g = kind === 'bench' ? benchMesh() : kind === 'circle' ? circleMesh(+key.slice(1) - 1) : kind === 'crate' ? crateMesh(label) : kind === 'table' ? tableMesh(label) : basketMesh(label, key === 'dani' ? '#c98a3a' : key === 'noa' ? '#d77fa1' : '#b8894a');
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
// לחיצה על פריט מסוים (שק או בודד) – לוקחים בדיוק אותו; לחיצה על הסל עצמו – בודד אם יש
function hitAt(e) {
  if (!scene) return null;
  const items = Object.values(scene.boxes).flatMap((b) => b.items);
  const hits = C.rayFrom(e).intersectObjects([...items, ...scene.objs], true);
  for (const h of hits) {
    let o = h.object;
    while (o) {
      if (items.includes(o)) return { box: Object.values(scene.boxes).find((b) => b.items.includes(o)), item: o };
      if (o.userData.box) return { box: o.userData.box, item: null };
      o = o.parent;
    }
  }
  return null;
}
function onTap(e) {
  if (S.phase !== 'play') return true;
  const h = hitAt(e);
  if (h) { goTo(h.box, h.item); return true; }
  return false;
}
function goTo(box, item) {
  const want = item;
  const front = box.kind === 'circle' ? box.pos.clone().add(new THREE.Vector3(0, 0, 1.0)) : box.kind === 'bench' ? new THREE.Vector3(want ? want.position.x : C.kid.pos.x, 0, box.pos.z + 1.0) : box.pos.clone().add(new THREE.Vector3(0, 0, box.kind === 'crate' ? 0.95 : box.kind === 'table' ? 0.95 : 0.85));
  C.walkTo(front, () => act(box, item));
}
function onAction() {
  if (S.phase !== 'play' || !scene) return;
  let best = null, bd = 1.7;
  for (const b of Object.values(scene.boxes)) { const d = Math.hypot(b.pos.x - C.kid.pos.x, b.pos.z + 0.85 - C.kid.pos.z); if (d < bd) { bd = d; best = b; } }
  if (best) act(best); else C.message('צָרִיךְ לַעֲמֹד לְיַד סַל אוֹ אַרְגָּז');
}
const singlesIn = (box) => box.items.filter((it) => val(it) === 1).length;
function act(box, want) {
  const c3 = S.grade === 'c';
  if (held) {
    // בכיתה ג': בסל נכנסים עד 9 בודדים – עשרה בודדים סוגרים לשק
    if (c3 && box.kind === 'basket' && val(held.item) === 1 && singlesIn(box) >= 9) {
      C.SFX.sfxBuzz();
      C.message('בסל נכנסים רק 9 בודדים! יש לכם 10? סגרו אותם לשק בשולחן "סוגרים שק 🎀"', 4200);
      return;
    }
    // שולחן "סוגרים שק": כשמגיעים ל-10 בודדים – הם נהיים שק אחד
    if (box.key === 'close' && val(held.item) === 1) {
      box.items.push(held.item); held = null;
      if (singlesIn(box) >= 10) {
        const ten = box.items.filter((it) => val(it) === 1).slice(0, 10);
        for (const it of ten) { C.R.scene.remove(it); box.items.splice(box.items.indexOf(it), 1); }
        const pk = pack(S.prob.obj); C.R.scene.add(pk); box.items.push(pk);
        C.SFX.sfxClang(); C.pop('🎀', '10 בודדים = שק אחד', '#ffd23f');
      } else C.SFX.sfxBounce(0.3);
      layout(box);
      return;
    }
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
    // לוקחים את הפריט שלחצו עליו; אם לחצו על הסל – בודד אם יש, אחרת שק (משולחן הסגירה – קודם השק)
    const singles = box.items.filter((it) => val(it) === 1), packs = box.items.filter((it) => val(it) === 10);
    const item = want && box.items.includes(want) ? want
      : box.key === 'packs' || box.key === 'close' ? (packs[packs.length - 1] || singles[singles.length - 1])
      : (singles[singles.length - 1] || packs[packs.length - 1]);
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
  if (p.check || p.groups) {
    const err = p.check ? p.check(scene.boxes) : (() => {
      for (const [key, want] of Object.entries(p.target)) {
        const have = total(scene.boxes[key]);
        if (have !== want) return key === 'bench' ? `על הספסל יושבים עכשיו ${have} ילדים 🤔` : `בקבוצה ${key.slice(1)} יש ${have} ילדים. קראו שוב את הבעיה 🧐`;
      }
      return null;
    })();
    if (err) { S.mistakes++; C.SFX.sfxBuzz(); C.kid.play('sad'); C.message(`עוד לא... ${err}`, 3800); return; }
    return success();
  }
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
  const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));
  if (S.prob.groups) {
    // סופרים בקפיצות: קבוצה אחרי קבוצה
    let sum = 0;
    for (const b of Object.values(scene.boxes).filter((b) => b.kind === 'circle' && b.items.length)) {
      sum += b.items.length;
      for (const it of b.items) it.scale.setScalar(1.35);
      C.pop(String(sum), '', '#ffd23f'); C.SFX.sfxBounce(0.4);
      await wait(0.8);
      for (const it of b.items) it.scale.setScalar(1);
      if (S.phase !== 'count') return;
    }
    $('m-eq').textContent = S.prob.eq;
    $('m-eq').classList.remove('hidden');
    $('m-done').classList.add('hidden'); $('m-next').classList.remove('hidden');
    C.pop('כל הכבוד!', S.prob.eq, '#7ee08a');
    S.phase = 'solved';
    return;
  }
  const box = scene.boxes[S.prob.count];
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
  const [x, op, y, r] = S.prob.eq;
  if (S.grade === 'c') {
    const w = 3, pad = (n) => String(n).padStart(w, ' ');
    $('m-eq').innerHTML = `<pre class="vert">  ${pad(x)}\n${op} ${pad(y)}\n${'─'.repeat(w + 2)}\n  ${pad(r)}</pre>`;
  } else $('m-eq').textContent = `${x} ${op} ${y} = ${r}`;
  $('m-eq').classList.remove('hidden');
  $('m-done').classList.add('hidden'); $('m-next').classList.remove('hidden');
  C.pop(S.grade === 'c' ? 'כל הכבוד!' : 'כָּל הַכָּבוֹד!', `${x} ${op} ${y} = ${r}`, '#7ee08a');
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
  $('m-mode-groups').classList.toggle('hidden', S.grade !== 'c');
  $('m-best-groups').textContent = best.cgroups != null ? '⭐'.repeat(best.cgroups) : '';
}
function startRound(mode) {
  S.mode = mode; S.list = makeRound(mode); S.i = 0; S.mistakes = 0;
  $('m-menu').classList.add('hidden'); $('m-over').classList.add('hidden'); $('m-hud').classList.remove('hidden');
  showProblem();
}
function showProblem() {
  const p = S.prob = S.list[S.i];
  buildProblem(p);
  C.kid.pos.set(0, 0, p.groups ? 1.4 : 0.9); C.kid.facing = -Math.PI / 2; C.kid.vel.set(0, 0, 0);
  $('m-ex').textContent = p.ex || '';
  $('m-help').innerHTML = p.groups
    ? 'לוחצים על ילד בספסל – הוא הולך אחרי הדמות שלך · לוחצים על עיגול – הוא נכנס לקבוצה · טעיתם? אפשר להחזיר ילד לספסל'
    : S.grade === 'c'
    ? 'לוחצים על שק או על בודד כדי לקחת אותו · בסל נכנסים עד <b>9 בודדים</b> · אין מספיק בודדים? <b>פותחים שק ✂️</b> · יש 10 בודדים? <b>סוגרים שק 🎀</b>'
    : 'לוחצים על סל או ארגז: הדמות לוקחת פריט אחד, ולחיצה על סל אחר – שמה אותו שם.';
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
  if (held && held.item.userData.kid) {
    // ילד שמובילים – הולך מאחורי הדמות ומקפץ קצת
    const f = C.kid.forward(new THREE.Vector3());
    const to = new THREE.Vector3(C.kid.pos.x - f.x * 0.75, Math.abs(Math.sin(C.time * 9)) * 0.06 * Math.min(1, C.kid.vel.length()), C.kid.pos.z - f.z * 0.75);
    held.item.position.lerp(to, Math.min(1, dt * 8));
    held.item.rotation.y = -C.kid.facing + Math.PI / 2;
  } else if (held) { held.item.position.lerp(new THREE.Vector3(C.kid.pos.x, 1.62, C.kid.pos.z), Math.min(1, dt * 16)); }
  if (scene) for (const a of scene.actors) {
    const want = Math.atan2(C.kid.pos.z - a.pos.z, C.kid.pos.x - a.pos.x);
    let d = want - a.facing; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    a.facing += d * Math.min(1, dt * 2); a.update(dt, C.time);
  }
}
function camera(core, vt, aspect) {
  // קרוב מספיק כדי לראות טוב את הפריטים בסלים; מכוונים קצת קדימה כי כרטיס הבעיה מכסה את החלק העליון של המסך
  const tilt = THREE.MathUtils.degToRad(50);
  const grp = S.prob && S.prob.groups && S.phase !== 'menu' && S.phase !== 'over';
  // בקבוצות: הספסל והעיגולים רחבים יותר, אז מתרחקים קצת ומכוונים לאמצע ביניהם
  const look = new THREE.Vector3(0, 0, grp ? -1.0 : -1.9);
  const dist = grp ? Math.max(6.3 / (vt * aspect), 4.9 * Math.sin(tilt) / vt) : Math.max(5.0 / (vt * aspect), 4.4 * Math.sin(tilt) / vt);
  return { pos: look.clone().add(new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt)).multiplyScalar(dist)), look, speed: 2.5 };
}

window.__math = { get S() { return S; }, get scene() { return scene; }, act: (k, kind) => { const b = scene.boxes[k]; const it = kind ? b.items.filter((x) => val(x) === (kind === 'pack' ? 10 : 1)).pop() : null; act(b, it); }, check, gen: (fn) => { S.list[S.i] = fn; showProblem(); }, WORD_C, WORD_A }; // לבדיקות
