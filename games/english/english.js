// Learning English – לומדים אנגלית בעשייה
// כתוב משהו באנגלית, והדמות של הילד עושה את זה בחצר: לוקחת חפצים מהשטיח ומניחה אותם
// בארגז, על השולחן, מתחת לשולחן, בסל, או אצל דני ונועה.
//  כיתה א': מילה אחת (BALL / RED / THREE) – עם כפתור 💡 שמראה תמונה כשצריך עזרה.
//  כיתה ג': משפט שלם ("Put the red car on the table.") – בלי תמונות. ליד השולחן בוחרים ON או UNDER.
// בסוף כל משימה רואים את התרגום לעברית.
import * as THREE from 'three';
import { Player, KIDS } from '../../js/player.js';

const store = {
  get(k, d) { try { const v = localStorage.getItem('stanga-eng-' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('stanga-eng-' + k, JSON.stringify(v)); } catch {} },
};
const $ = (id) => document.getElementById(id);
const ROUND = 8;

let C = null;
const S = { phase: 'menu', grade: store.get('grade', 'a'), list: [], i: 0, mistakes: 0, prob: null, hint: false };
let scene = null;
let held = null;
let built = false;
let pendingTable = null; // מחכים לבחירה ON / UNDER

export const ENGLISH = {
  id: 'english', title: 'Learning English', emoji: '🔤', color: '#1e88e5',
  station: { x: 7, z: 1.2 },
  desc: 'לומדים אנגלית בעשייה – מילים (כיתה א׳) ומשפטים (כיתה ג׳)',
  enter(core) {
    C = core;
    if (!built) { setupUI(); built = true; }
    toMenu();
  },
  exit() { clearScene(); S.phase = 'menu'; for (const id of ['e-menu', 'e-hud', 'e-over', 'e-choose']) $(id).classList.add('hidden'); },
  canMove: () => S.phase === 'play' && !pendingTable,
  onTap, onAction, update, camera,
};

// ---------- המילים ----------
// g = מין דקדוקי בעברית (m/f), he = יחיד, hp = רבים, emoji לרמז
const NOUNS = {
  ball: { he: 'כַּדּוּר', hp: 'כַּדּוּרִים', g: 'm', emoji: '⚽', colors: true },
  car: { he: 'מְכוֹנִית', hp: 'מְכוֹנִיּוֹת', g: 'f', emoji: '🚗', colors: true },
  book: { he: 'סֵפֶר', hp: 'סְפָרִים', g: 'm', emoji: '📘', colors: true },
  hat: { he: 'כּוֹבַע', hp: 'כּוֹבָעִים', g: 'm', emoji: '🧢', colors: true },
  cup: { he: 'כּוֹס', hp: 'כּוֹסוֹת', g: 'f', emoji: '🥤', colors: true },
  apple: { he: 'תַּפּוּחַ', hp: 'תַּפּוּחִים', g: 'm', emoji: '🍎' },
  banana: { he: 'בָּנָנָה', hp: 'בָּנָנוֹת', g: 'f', emoji: '🍌' },
  cat: { he: 'חָתוּל', hp: 'חֲתוּלִים', g: 'm', emoji: '🐱' },
  dog: { he: 'כֶּלֶב', hp: 'כְּלָבִים', g: 'm', emoji: '🐶' },
  fish: { he: 'דָּג', hp: 'דָּגִים', g: 'm', emoji: '🐟', plural: 'fish' },
  flower: { he: 'פֶּרַח', hp: 'פְּרָחִים', g: 'm', emoji: '🌸' },
  star: { he: 'כּוֹכָב', hp: 'כּוֹכָבִים', g: 'm', emoji: '⭐' },
};
const COLORS = {
  red: { hex: '#e53935', he: { m: 'אָדֹם', f: 'אֲדֻמָּה', mp: 'אֲדֻמִּים', fp: 'אֲדֻמּוֹת' }, emoji: '🔴' },
  blue: { hex: '#1e88e5', he: { m: 'כָּחֹל', f: 'כְּחֻלָּה', mp: 'כְּחֻלִּים', fp: 'כְּחֻלּוֹת' }, emoji: '🔵' },
  yellow: { hex: '#fdd835', he: { m: 'צָהֹב', f: 'צְהֻבָּה', mp: 'צְהֻבִּים', fp: 'צְהֻבּוֹת' }, emoji: '🟡' },
  green: { hex: '#43a047', he: { m: 'יָרֹק', f: 'יְרֻקָּה', mp: 'יְרֻקִּים', fp: 'יְרֻקּוֹת' }, emoji: '🟢' },
};
const NUM_EN = ['zero', 'one', 'two', 'three', 'four', 'five'];
const NUM_HE = { m: ['', 'אֶחָד', 'שְׁנֵי', 'שְׁלוֹשָׁה', 'אַרְבָּעָה', 'חֲמִשָּׁה'], f: ['', 'אַחַת', 'שְׁתֵּי', 'שָׁלוֹשׁ', 'אַרְבַּע', 'חָמֵשׁ'] };
const plural = (n) => NOUNS[n].plural || n + 's';
const COLORABLE = Object.keys(NOUNS).filter((n) => NOUNS[n].colors);
const ALL = Object.keys(NOUNS);
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const others = (n, k) => shuffle(ALL.filter((x) => x !== n)).slice(0, k);
const T = (noun, color) => ({ noun, color }); // חפץ על השטיח
const he = (n) => NOUNS[n].he;
const heColor = (c, g, pl) => COLORS[c].he[pl ? g + 'p' : g];
const heWithThe = (w) => 'הַ' + w.replace(/^הַ/, ''); // "הַכַּדּוּר"

// כל משימה: big (מה כתוב באנגלית), say (הוראה קטנה בעברית), toys (מה על השטיח), start (מה יש כבר במקומות),
// want (מה צריך להיות בכל מקום בסוף), hint (רמז לכיתה א'), he (התרגום שמופיע בסוף), places (אילו מקומות יש בחצר)
const TASKS_A = [
  () => { const n = pick(ALL); // מילה: הביאו את ה-BALL
    return { big: n.toUpperCase(), say: 'הָבִיאוּ לָאַרְגָּז אֶת:', toys: shuffle([T(n, NOUNS[n].colors ? pick(Object.keys(COLORS)) : null), ...others(n, 4).map((o) => T(o, NOUNS[o].colors ? pick(Object.keys(COLORS)) : null))]),
      want: { box: [{ noun: n, n: 1 }] }, hint: NOUNS[n].emoji, he: `${n.toUpperCase()} = ${he(n)} ${NOUNS[n].emoji}`, places: ['box'] }; },
  () => { const c = pick(Object.keys(COLORS)), n = pick(COLORABLE); // צבע: הביאו את הכדור ה-RED
    return { big: c.toUpperCase(), say: `הָבִיאוּ לָאַרְגָּז אֶת ${heWithThe(he(n))} בַּצֶּבַע:`, toys: shuffle(Object.keys(COLORS).map((k) => T(n, k))),
      want: { box: [{ noun: n, color: c, n: 1 }] }, hint: COLORS[c].emoji, he: `${c.toUpperCase()} = ${heColor(c, 'm')} ${COLORS[c].emoji}`, places: ['box'] }; },
  () => { const k = rnd(2, 5), n = pick(['apple', 'ball', 'star', 'flower']); // מספר: הביאו THREE
    const toys = Array.from({ length: 7 }, () => T(n, NOUNS[n].colors ? pick(Object.keys(COLORS)) : null));
    return { big: NUM_EN[k].toUpperCase(), say: `הָבִיאוּ לָאַרְגָּז ${NOUNS[n].hp}. כַּמָּה?`, toys,
      want: { box: [{ noun: n, n: k }] }, hint: String(k), he: `${NUM_EN[k].toUpperCase()} = ${k}`, places: ['box'] }; },
];

const TASKS_C = [
  () => { const n = pick(ALL); // in the box
    return { big: `Put the ${n} in the box.`, toys: shuffle([T(n, NOUNS[n].colors ? pick(Object.keys(COLORS)) : null), ...others(n, 5).map((o) => T(o, NOUNS[o].colors ? pick(Object.keys(COLORS)) : null))]),
      want: { box: [{ noun: n, n: 1 }] }, he: `שִׂימוּ אֶת ${heWithThe(he(n))} בָּאַרְגָּז.`, places: ['box', 'table', 'basket'] }; },
  () => { const n = pick(COLORABLE), c = pick(Object.keys(COLORS)), g = NOUNS[n].g; // the red car on the table
    const toys = shuffle([...shuffle(Object.keys(COLORS)).slice(0, 3).concat(c).filter((v, i, a) => a.indexOf(v) === i).map((k) => T(n, k)), ...others(n, 2).map((o) => T(o, NOUNS[o].colors ? pick(Object.keys(COLORS)) : null))]);
    return { big: `Put the ${c} ${n} on the table.`, toys, want: { on: [{ noun: n, color: c, n: 1 }] }, he: `שִׂימוּ אֶת ${heWithThe(he(n))} ${heWithThe(heColor(c, g))} עַל הַשֻּׁלְחָן.`, places: ['box', 'table', 'basket'] }; },
  () => { const n = pick(ALL); // under the table
    return { big: `Put the ${n} under the table.`, toys: shuffle([T(n, NOUNS[n].colors ? pick(Object.keys(COLORS)) : null), ...others(n, 4).map((o) => T(o, NOUNS[o].colors ? pick(Object.keys(COLORS)) : null))]),
      want: { under: [{ noun: n, n: 1 }] }, he: `שִׂימוּ אֶת ${heWithThe(he(n))} מִתַּחַת לַשֻּׁלְחָן.`, places: ['box', 'table', 'basket'] }; },
  () => { const k = rnd(2, 4); // two blue balls in the basket
    if (Math.random() < 0.5) {
      const n = pick(['apple', 'banana', 'star', 'flower', 'fish']);
      const toys = shuffle([...Array.from({ length: k + 2 }, () => T(n, null)), ...others(n, 2).map((o) => T(o, NOUNS[o].colors ? pick(Object.keys(COLORS)) : null))]);
      return { big: `Put ${NUM_EN[k]} ${plural(n)} in the basket.`, toys, want: { basket: [{ noun: n, n: k }] }, he: `שִׂימוּ ${NUM_HE[NOUNS[n].g][k]} ${NOUNS[n].hp} בַּסַּל.`, places: ['box', 'table', 'basket'] };
    }
    const n = pick(COLORABLE), c = pick(Object.keys(COLORS)), g = NOUNS[n].g;
    const toys = shuffle([...Array.from({ length: k + 1 }, () => T(n, c)), ...Object.keys(COLORS).filter((x) => x !== c).slice(0, 3).map((x) => T(n, x))]);
    return { big: `Put ${NUM_EN[k]} ${c} ${plural(n)} in the basket.`, toys, want: { basket: [{ noun: n, color: c, n: k }] }, he: `שִׂימוּ ${NUM_HE[g][k]} ${NOUNS[n].hp} ${heColor(c, g, true)} בַּסַּל.`, places: ['box', 'table', 'basket'] };
  },
  () => { // give to Noa / give Dani two ...
    if (Math.random() < 0.5) {
      const n = pick(ALL), who = pick(['dani', 'noa']);
      return { big: `Give the ${n} to ${who === 'dani' ? 'Dani' : 'Noa'}.`, toys: shuffle([T(n, NOUNS[n].colors ? pick(Object.keys(COLORS)) : null), ...others(n, 4).map((o) => T(o, NOUNS[o].colors ? pick(Object.keys(COLORS)) : null))]),
        want: { [who]: [{ noun: n, n: 1 }] }, he: `תְּנוּ אֶת ${heWithThe(he(n))} ${who === 'dani' ? 'לְדָנִי' : 'לְנוֹעָה'}.`, places: ['dani', 'noa'] };
    }
    const k = rnd(2, 3), n = pick(['apple', 'banana', 'star', 'flower']), who = pick(['dani', 'noa']);
    const toys = shuffle([...Array.from({ length: k + 2 }, () => T(n, null)), ...others(n, 2).map((o) => T(o, NOUNS[o].colors ? pick(Object.keys(COLORS)) : null))]);
    return { big: `Give ${who === 'dani' ? 'Dani' : 'Noa'} ${NUM_EN[k]} ${plural(n)}.`, toys, want: { [who]: [{ noun: n, n: k }] }, he: `תְּנוּ ${who === 'dani' ? 'לְדָנִי' : 'לְנוֹעָה'} ${NUM_HE[NOUNS[n].g][k]} ${NOUNS[n].hp}.`, places: ['dani', 'noa'] };
  },
  () => { // take out of the box and put on the table – שני שלבים
    const set = shuffle(ALL.slice()).slice(0, 3), n = set[0];
    const items = set.map((o) => T(o, NOUNS[o].colors ? pick(Object.keys(COLORS)) : null));
    return { big: `Take the ${n} out of the box and put it on the table.`, toys: others(n, 3).filter((o) => !set.includes(o)).map((o) => T(o, NOUNS[o].colors ? pick(Object.keys(COLORS)) : null)), start: { box: items },
      want: { on: [{ noun: n, n: 1 }], box: set.slice(1).map((o) => ({ noun: o, n: 1 })) }, he: `הוֹצִיאוּ אֶת ${heWithThe(he(n))} מֵהָאַרְגָּז וְשִׂימוּ ${NOUNS[n].g === 'f' ? 'אוֹתָהּ' : 'אוֹתוֹ'} עַל הַשֻּׁלְחָן.`, places: ['box', 'table', 'basket'] };
  },
];
function makeRound() {
  const types = S.grade === 'c' ? TASKS_C : TASKS_A;
  return shuffle([...types.keys(), ...types.keys(), ...types.keys()]).slice(0, ROUND).map((t) => types[t]());
}

// ---------- החפצים ----------
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
function mesh(g, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; }
const MAKE = {
  ball: (c) => mesh(new THREE.SphereGeometry(0.13, 20, 14), M(c, { roughness: 0.35 }), 0, 0.13, 0),
  apple: () => { const g = new THREE.Group(); g.add(mesh(new THREE.SphereGeometry(0.12, 18, 12), M('#d32f2f', { roughness: 0.35 }), 0, 0.12, 0)); g.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.07, 5), M('#5a3a1b'), 0, 0.26, 0)); const lf = mesh(new THREE.SphereGeometry(0.035, 8, 6), M('#43a047'), 0.04, 0.27, 0); lf.scale.set(1.4, 0.4, 0.8); g.add(lf); return g; },
  banana: () => { const g = new THREE.Group(); const t = mesh(new THREE.TorusGeometry(0.15, 0.045, 10, 20, Math.PI * 0.75), M('#fdd835', { roughness: 0.5 }), 0, 0.2, 0); t.rotation.z = Math.PI * 1.125; g.add(t); return g; },
  car: (c) => { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.36, 0.1, 0.18), M(c, { roughness: 0.3, metalness: 0.2 }), 0, 0.1, 0)); g.add(mesh(new THREE.BoxGeometry(0.18, 0.08, 0.16), M(c, { roughness: 0.3 }), -0.02, 0.19, 0)); g.add(mesh(new THREE.BoxGeometry(0.19, 0.06, 0.165), M('#bfe3ff', { roughness: 0.1 }), -0.02, 0.19, 0)); for (const [x, z] of [[-0.11, -0.09], [0.11, -0.09], [-0.11, 0.09], [0.11, 0.09]]) { const w = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12), M('#222'), x, 0.05, z); w.rotation.x = Math.PI / 2; g.add(w); } return g; },
  book: (c) => { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(0.26, 0.07, 0.2), M(c), 0, 0.035, 0)); g.add(mesh(new THREE.BoxGeometry(0.245, 0.055, 0.21), M('#fafafa'), 0.01, 0.035, 0)); return g; },
  hat: (c) => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 20), M(c), 0, 0.01, 0)); g.add(mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.16, 18), M(c), 0, 0.1, 0)); g.add(mesh(new THREE.CylinderGeometry(0.122, 0.122, 0.035, 18), M('#222'), 0, 0.05, 0)); return g; },
  cup: (c) => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.2, 18), M(c, { roughness: 0.3 }), 0, 0.1, 0)); const h = mesh(new THREE.TorusGeometry(0.05, 0.014, 8, 14), M(c), 0.1, 0.11, 0); g.add(h); return g; },
  cat: () => { const g = new THREE.Group(), o = M('#f08a24'); const b = mesh(new THREE.SphereGeometry(0.12, 14, 10), o, 0, 0.12, 0); b.scale.set(1.3, 0.9, 0.9); g.add(b); g.add(mesh(new THREE.SphereGeometry(0.085, 14, 10), o, 0.16, 0.22, 0)); for (const s of [-1, 1]) { const e = mesh(new THREE.ConeGeometry(0.03, 0.06, 6), o, 0.16, 0.31, s * 0.045); g.add(e); g.add(mesh(new THREE.SphereGeometry(0.012, 6, 6), M('#111'), 0.235, 0.235, s * 0.03)); } const t = mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.22, 6), o, -0.19, 0.22, 0); t.rotation.z = 0.6; g.add(t); return g; },
  dog: () => { const g = new THREE.Group(), o = M('#8d5a32'); const b = mesh(new THREE.SphereGeometry(0.13, 14, 10), o, 0, 0.14, 0); b.scale.set(1.35, 0.9, 0.9); g.add(b); g.add(mesh(new THREE.SphereGeometry(0.09, 14, 10), o, 0.18, 0.24, 0)); g.add(mesh(new THREE.SphereGeometry(0.03, 8, 6), M('#111'), 0.27, 0.23, 0)); for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.04, 8, 6), M('#5d3a1f'), 0.16, 0.25, s * 0.085); e.scale.set(0.6, 1.4, 0.5); g.add(e); g.add(mesh(new THREE.SphereGeometry(0.012, 6, 6), M('#111'), 0.25, 0.27, s * 0.035)); } const t = mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.14, 6), o, -0.2, 0.22, 0); t.rotation.z = 0.9; g.add(t); return g; },
  fish: () => { const g = new THREE.Group(), o = M('#ff8f00', { roughness: 0.3 }); const b = mesh(new THREE.SphereGeometry(0.1, 14, 10), o, 0, 0.12, 0); b.scale.set(1.6, 1, 0.55); g.add(b); const t = mesh(new THREE.ConeGeometry(0.08, 0.12, 4), o, -0.2, 0.12, 0); t.rotation.z = Math.PI / 2; g.add(t); for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.014, 6, 6), M('#111'), 0.1, 0.14, s * 0.05)); return g; },
  flower: () => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.26, 6), M('#2e7d32'), 0, 0.13, 0)); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const p = mesh(new THREE.SphereGeometry(0.05, 10, 8), M('#f06292'), Math.cos(a) * 0.06, 0.28, Math.sin(a) * 0.06); p.scale.set(1, 0.4, 1); g.add(p); } g.add(mesh(new THREE.SphereGeometry(0.035, 10, 8), M('#fdd835'), 0, 0.29, 0)); return g; },
  star: () => { const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.07 : 0.16, a = (i / 10) * Math.PI * 2 + Math.PI / 2; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) sh.lineTo(x, y); else sh.moveTo(x, y); } const g = new THREE.Group(); const s = mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 }), M('#ffca28', { roughness: 0.3, metalness: 0.3 }), 0, 0.17, -0.025); g.add(s); return g; },
};
function makeToy(t) {
  const o = MAKE[t.noun](t.color ? COLORS[t.color].hex : undefined);
  const g = o.isGroup ? o : new THREE.Group().add(o);
  g.scale.setScalar(1.3); // קצת יותר גדול – שיראו טוב מלמעלה
  g.userData.toy = t;
  return g;
}
const describe = (t) => (t.color ? t.color + ' ' : '') + t.noun;

// ---------- המקומות בחצר ----------
// toys = השטיח שעליו כל החפצים; box = ארגז; table = שולחן (on = עליו, under = מתחתיו); basket = סל; dani/noa = הסלים של הילדים
const SPOT = { toys: [0, -2.5], box: [-2.6, -0.1], table: [2.6, -0.25], basket: [0, 0.35], dani: [-3.2, 0.4], noa: [3.2, 0.4] };
const OWNERS = {
  dani: { name: 'Dani', model: 'Casual2_Male', shirt: '#ffd166', pants: '#3a5a86', skin: '#e8bb94', hair: '#3b2414', height: 1.3 },
  noa: { name: 'Noa', model: 'Casual_Female', shirt: '#f29bb8', pants: '#3c5a86', skin: '#f0c9a8', hair: '#6b3e1f', height: 1.3 },
};
function nameTex(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const x = c.getContext('2d'); x.fillStyle = '#fff8dc'; x.fillRect(0, 0, 512, 160);
  x.strokeStyle = '#1c2540'; x.lineWidth = 8; x.strokeRect(4, 4, 504, 152);
  x.fillStyle = '#1c2540'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '800 86px Rubik, sans-serif';
  x.fillText(text, 256, 86);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function rugMesh() {
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = 512; c.height = 192;
  const x = c.getContext('2d');
  x.fillStyle = '#3f6fb5'; x.fillRect(0, 0, 512, 192);
  x.strokeStyle = '#ffd23f'; x.lineWidth = 10; x.strokeRect(12, 12, 488, 168);
  x.strokeStyle = '#f2f2f2'; x.lineWidth = 4; x.strokeRect(26, 26, 460, 140);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const r = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.55), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }));
  r.rotation.x = -Math.PI / 2; r.position.y = 0.02; r.receiveShadow = true; g.add(r);
  return g;
}
function boxMesh() {
  const g = new THREE.Group(), w = M('#b07a43'), d = M('#7a5432');
  g.add(mesh(new THREE.BoxGeometry(1.3, 0.04, 0.9), d, 0, 0.02, 0));
  g.add(mesh(new THREE.BoxGeometry(1.3, 0.5, 0.05), w, 0, 0.25, -0.425));
  g.add(mesh(new THREE.BoxGeometry(1.3, 0.5, 0.05), w, 0, 0.25, 0.425));
  g.add(mesh(new THREE.BoxGeometry(0.05, 0.5, 0.9), w, -0.625, 0.25, 0));
  g.add(mesh(new THREE.BoxGeometry(0.05, 0.5, 0.9), w, 0.625, 0.25, 0));
  return g;
}
function tableMesh() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(1.6, 0.06, 0.9), M('#9a6b3e'), 0, 0.92, 0));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(new THREE.BoxGeometry(0.06, 0.92, 0.06), M('#6b4a2b'), sx * 0.74, 0.46, sz * 0.4));
  return g;
}
function basketMesh(color, label) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.6, 0.48, 0.3, 28, 1, true), M(color, { side: THREE.DoubleSide }), 0, 0.15, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.03, 28), M('#7a5432'), 0, 0.02, 0));
  const rim = mesh(new THREE.TorusGeometry(0.6, 0.035, 8, 32), M('#6b4a2b'), 0, 0.3, 0); rim.rotation.x = Math.PI / 2; g.add(rim);
  if (label) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.28), new THREE.MeshStandardMaterial({ map: nameTex(label), roughness: 0.8 }));
    s.position.set(0, 0.58, -0.66); g.add(s);
    g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6), M('#666'), 0, 0.22, -0.68));
  }
  return g;
}

function layout(box) {
  const n = box.items.length;
  box.items.forEach((it, i) => {
    let x = 0, y = 0, z = 0;
    if (box.key === 'toys') { const cols = 6; x = ((i % cols) - (cols - 1) / 2) * 0.66; z = (Math.floor(i / cols) - 0.5) * 0.62; y = 0.02; }
    else if (box.key === 'box') { x = ((i % 3) - 1) * 0.36; z = (Math.floor(i / 3) % 2 - 0.5) * 0.36; y = 0.04 + Math.floor(i / 6) * 0.2; }
    else if (box.key === 'on') { x = ((i % 4) - 1.5) * 0.36; z = (Math.floor(i / 4) - 0.3) * 0.32; y = 0.95; }
    else if (box.key === 'under') { x = ((i % 4) - 1.5) * 0.36; z = 0.05; y = 0.0; }
    else { const a = (i / Math.max(n, 1)) * Math.PI * 2, r = n <= 1 ? 0 : 0.28; x = Math.cos(a) * r; z = Math.sin(a) * r; y = 0.05; }
    it.position.set(box.pos.x + x, y, box.pos.z + z);
    it.rotation.set(0, box.key === 'toys' ? -0.3 : 0.2 * i, 0);
  });
}
function buildProblem(p) {
  clearScene();
  scene = { boxes: {}, objs: [], actors: [] };
  const add = (key, x, z, g) => {
    if (g) { g.position.set(x, 0, z); C.R.scene.add(g); scene.objs.push(g); }
    const box = { key, pos: new THREE.Vector3(x, 0, z), group: g, items: [] };
    if (g) g.traverse((o) => { o.userData.box = box; });
    scene.boxes[key] = box;
    return box;
  };
  add('toys', ...SPOT.toys, rugMesh());
  if (p.places.includes('box')) add('box', ...SPOT.box, boxMesh());
  if (p.places.includes('table')) {
    const tb = add('on', ...SPOT.table, tableMesh());
    const un = add('under', ...SPOT.table, null);
    tb.group.traverse((o) => { o.userData.box = tb; o.userData.table = true; });
    un.group = tb.group;
  }
  if (p.places.includes('basket')) add('basket', ...SPOT.basket, basketMesh('#b8894a'));
  for (const who of ['dani', 'noa']) {
    if (!p.places.includes(who)) continue;
    const [x, z] = SPOT[who];
    add(who, x, z, basketMesh(who === 'dani' ? '#c98a3a' : '#d77fa1', OWNERS[who].name));
    const o = OWNERS[who];
    const a = new Player(C.R.scene, { ...KIDS.p1, ...o, model: C.A.kids && C.A.kids[o.model] });
    a.arrow.visible = false; a.ring.visible = false;
    a.pos.set(x, 0, z - 1.1); a.facing = Math.PI / 2;
    scene.actors.push(a);
  }
  const put = (key, list) => { for (const t of list) { const it = makeToy(t); C.R.scene.add(it); scene.boxes[key].items.push(it); } layout(scene.boxes[key]); };
  put('toys', p.toys);
  for (const [k, list] of Object.entries(p.start || {})) put(k, list);
}
function clearScene() {
  if (!scene) return;
  for (const o of scene.objs) C.R.scene.remove(o);
  for (const b of Object.values(scene.boxes)) for (const it of b.items) C.R.scene.remove(it);
  for (const a of scene.actors) C.R.scene.remove(a.root);
  if (held) { C.R.scene.remove(held.item); held = null; }
  pendingTable = null; $('e-choose').classList.add('hidden');
  scene = null;
}

// ---------- לקחת ולשים ----------
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
  if (S.phase !== 'play' || pendingTable) return true;
  const h = hitAt(e);
  if (h) { goTo(h.box, h.item); return true; }
  return false;
}
function goTo(box, item) {
  const p = box.pos.clone();
  const front = box.key === 'toys' ? new THREE.Vector3(item ? item.position.x : THREE.MathUtils.clamp(C.kid.pos.x, -1.8, 1.8), 0, p.z + 1.05)
    : p.add(new THREE.Vector3(0, 0, box.key === 'on' || box.key === 'under' ? 0.95 : box.key === 'box' ? 0.95 : 0.85));
  C.walkTo(front, () => act(box, item));
}
function onAction() {
  if (S.phase !== 'play' || !scene || pendingTable) return;
  let best = null, bd = 1.7;
  for (const b of Object.values(scene.boxes)) { if (b.key === 'under') continue; const d = Math.hypot(b.pos.x - C.kid.pos.x, b.pos.z + 0.9 - C.kid.pos.z); if (d < bd) { bd = d; best = b; } }
  if (best) act(best); else C.message(S.grade === 'c' ? 'צריך לעמוד ליד משהו 🙂' : 'צָרִיךְ לַעֲמֹד לְיַד מַשֶּׁהוּ 🙂');
}
function act(box, want) {
  if (held) {
    // ליד השולחן: הילד בוחר בעצמו – ON או UNDER (באנגלית, בלי חצים – זה חלק מהלימוד)
    if (box.key === 'on' || box.key === 'under') { pendingTable = true; $('e-choose').classList.remove('hidden'); return; }
    box.items.push(held.item); held = null; layout(box); C.SFX.sfxBounce(0.35); C.kid.play('kick');
    return;
  }
  // לוקחים: מהשולחן – מה שלחצו עליו, או מה שיש (קודם עליו, אחר כך מתחתיו)
  let from = box;
  if ((box.key === 'on' || box.key === 'under') && !want) from = scene.boxes.on.items.length ? scene.boxes.on : scene.boxes.under;
  if (!from.items.length) { C.message(S.grade === 'c' ? 'אין פה כלום 🙂' : 'אֵין פֹּה כְּלוּם 🙂'); return; }
  const item = want && from.items.includes(want) ? want : from.items[from.items.length - 1];
  from.items.splice(from.items.indexOf(item), 1); layout(from);
  held = { item, from };
  C.SFX.sfxKick(0.2); C.kid.play('lob');
}
function chooseTable(where) {
  if (!pendingTable || !held) return;
  pendingTable = null; $('e-choose').classList.add('hidden');
  const box = scene.boxes[where];
  box.items.push(held.item); held = null; layout(box);
  C.SFX.sfxBounce(0.35); C.kid.play('kick');
}

// ---------- בדיקה ----------
const matches = (it, spec) => it.userData.toy.noun === spec.noun && (!spec.color || it.userData.toy.color === spec.color);
const PLACE_HE = { box: 'בָּאַרְגָּז', on: 'עַל הַשֻּׁלְחָן', under: 'מִתַּחַת לַשֻּׁלְחָן', basket: 'בַּסַּל', dani: 'אֵצֶל דָּנִי', noa: 'אֵצֶל נוֹעָה' };
const PLACE_C = { box: 'בארגז', on: 'על השולחן', under: 'מתחת לשולחן', basket: 'בסל', dani: 'אצל דני', noa: 'אצל נועה' };
function findError(p) {
  const B = scene.boxes;
  // מה שצריך להיות בכל מקום
  for (const [key, specs] of Object.entries(p.want)) {
    const items = B[key].items.slice();
    for (const sp of specs) {
      const got = items.filter((it) => matches(it, sp));
      if (got.length < sp.n) return { key, items: B[key].items };
      for (const it of got.slice(0, sp.n)) items.splice(items.indexOf(it), 1);
    }
    if (items.length) return { key, items: B[key].items };
  }
  // ובשאר המקומות לא אמור להיות כלום (חוץ מהשטיח)
  for (const [key, b] of Object.entries(B)) {
    if (key === 'toys' || p.want[key]) continue;
    if (b.items.length) return { key, items: b.items };
  }
  return null;
}
function check() {
  if (S.phase !== 'play') return;
  const a = S.grade === 'a';
  if (held) { C.message(a ? 'קֹדֶם שִׂימוּ אֶת מָה שֶׁבַּיָּדַיִם 🙂' : 'קודם שימו את מה שבידיים 🙂'); return; }
  const p = S.prob, err = findError(p);
  if (!err) return success();
  S.mistakes++;
  C.SFX.sfxBuzz(); C.kid.play('sad');
  const list = err.items.map((it) => describe(it.userData.toy));
  if (a) {
    // בכיתה א': אומרים מה הביאו (באנגלית ובעברית) ופותחים את הרמז
    const sp = p.want.box[0];
    const wrong = err.items.find((it) => !matches(it, sp)) || err.items[0];
    const t = wrong && wrong.userData.toy;
    const what = !err.items.length ? 'הָאַרְגָּז רֵיק.'
      : sp.n > 1 ? `בָּאַרְגָּז יֵשׁ ${err.items.length}.`
      : sp.color ? `הֵבֵאתֶם ${t.color.toUpperCase()} – ${heColor(t.color, NOUNS[t.noun].g)}.`
      : `הֵבֵאתֶם ${t.noun.toUpperCase()} – ${he(t.noun)}.`;
    showHint();
    C.message(`עוֹד לֹא... ${what} מְחַפְּשִׂים ${p.big} 💡`, 4200);
  } else {
    const where = PLACE_C[err.key];
    C.message(list.length ? `עוד לא... ${where} יש: ${list.join(', ')}. קראו שוב את המשפט 🧐` : `עוד לא... ${where} אין כלום. קראו שוב את המשפט 🧐`, 4200);
  }
}
async function success() {
  S.phase = 'solved';
  C.SFX.sfxCheer(false); C.kid.play('cheer');
  for (const a of scene.actors) a.play('cheer');
  $('e-he').textContent = S.prob.he;
  $('e-he').classList.remove('hidden');
  $('e-done').classList.add('hidden'); $('e-next').classList.remove('hidden');
  C.pop('Great job ⭐', S.grade === 'c' ? 'כל הכבוד!' : 'כָּל הַכָּבוֹד!', '#7ee08a');
}

// ---------- ממשק ----------
function setupUI() {
  document.querySelectorAll('[data-egrade]').forEach((b) => b.addEventListener('click', () => { S.grade = b.dataset.egrade; store.set('grade', S.grade); toMenu(); C.SFX.initAudio(); C.SFX.sfxKick(0.2); }));
  $('e-start').addEventListener('click', () => { C.SFX.initAudio(); startRound(); });
  $('e-back').addEventListener('click', () => C.exitGame());
  $('e-home').addEventListener('click', toMenu);
  $('e-done').addEventListener('click', check);
  $('e-next').addEventListener('click', next);
  $('e-hint').addEventListener('click', showHint);
  $('e-again').addEventListener('click', startRound);
  $('e-other').addEventListener('click', toMenu);
  $('e-on').addEventListener('click', () => chooseTable('on'));
  $('e-under').addEventListener('click', () => chooseTable('under'));
  $('e-cancel').addEventListener('click', () => { pendingTable = null; $('e-choose').classList.add('hidden'); });
}
function toMenu() {
  clearScene(); S.phase = 'menu';
  $('e-menu').classList.remove('hidden'); $('e-hud').classList.add('hidden'); $('e-over').classList.add('hidden');
  document.querySelectorAll('[data-egrade]').forEach((x) => x.classList.toggle('on', x.dataset.egrade === S.grade));
  const best = store.get('best', {});
  $('e-best').textContent = best[S.grade] != null ? '⭐'.repeat(best[S.grade]) : '';
  $('e-desc-a').classList.toggle('hidden', S.grade !== 'a');
  $('e-desc-c').classList.toggle('hidden', S.grade !== 'c');
}
function startRound() {
  S.list = makeRound(); S.i = 0; S.mistakes = 0;
  $('e-menu').classList.add('hidden'); $('e-over').classList.add('hidden'); $('e-hud').classList.remove('hidden');
  showProblem();
}
function showHint() {
  if (S.grade !== 'a' || !S.prob) return;
  S.hint = true;
  $('e-pic').textContent = S.prob.hint;
  $('e-pic').classList.remove('hidden');
  $('e-hint').classList.add('hidden');
}
function showProblem() {
  const p = S.prob = S.list[S.i];
  buildProblem(p);
  C.kid.pos.set(0, 0, 1.7); C.kid.facing = -Math.PI / 2; C.kid.vel.set(0, 0, 0);
  const a = S.grade === 'a';
  $('e-card').classList.toggle('nikud', a);
  $('e-card').classList.toggle('sentence', !a);
  $('e-say').textContent = a ? p.say : 'עשו בדיוק מה שכתוב באנגלית:';
  $('e-big').textContent = p.big;
  S.hint = false;
  $('e-pic').classList.add('hidden');
  $('e-hint').classList.toggle('hidden', !a);
  $('e-he').classList.add('hidden');
  $('e-help').textContent = a
    ? 'לוֹחֲצִים עַל חֵפֶץ בַּשָּׁטִיחַ – הַדְּמוּת לוֹקַחַת אוֹתוֹ · לוֹחֲצִים עַל הָאַרְגָּז – שָׂמָה אוֹתוֹ שָׁם · לֹא בְּטוּחִים? 💡'
    : 'לוחצים על חפץ – הדמות לוקחת אותו · לוחצים על מקום – שמה אותו שם · ליד השולחן בוחרים ON או UNDER';
  $('e-done').classList.remove('hidden'); $('e-next').classList.add('hidden');
  $('e-count').textContent = `${S.i + 1}/${S.list.length}`;
  S.phase = 'play';
}
function next() {
  S.i++;
  if (S.i >= S.list.length) return finish();
  showProblem();
}
function finish() {
  clearScene();
  S.phase = 'over';
  const st = S.mistakes === 0 ? 3 : S.mistakes <= 2 ? 2 : 1;
  const best = store.get('best', {}); best[S.grade] = Math.max(best[S.grade] || 0, st); store.set('best', best);
  $('e-hud').classList.add('hidden'); $('e-over').classList.remove('hidden');
  $('e-over-stars').textContent = '⭐'.repeat(st) + '☆'.repeat(3 - st);
  $('e-over-sub').textContent = S.mistakes === 0 ? 'מושלם – בלי אף טעות! ⭐' : `סיימתם ${S.list.length} משימות באנגלית.`;
  C.kid.play('cheer'); C.SFX.sfxCheer(true);
}

// ---------- בכל פריים ----------
function update(dt) {
  if (held) held.item.position.lerp(new THREE.Vector3(C.kid.pos.x, 1.6, C.kid.pos.z), Math.min(1, dt * 16));
  if (scene) for (const a of scene.actors) {
    const want = Math.atan2(C.kid.pos.z - a.pos.z, C.kid.pos.x - a.pos.x);
    let d = want - a.facing; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    a.facing += d * Math.min(1, dt * 2); a.update(dt, C.time);
  }
}
function camera(core, vt, aspect) {
  const tilt = THREE.MathUtils.degToRad(50);
  // מכוונים קצת קדימה – כרטיס המשימה מכסה את החלק העליון של המסך
  const look = new THREE.Vector3(0, 0, -1.3);
  const dist = Math.max(6.0 / (vt * aspect), 4.6 * Math.sin(tilt) / vt);
  return { pos: look.clone().add(new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt)).multiplyScalar(dist)), look, speed: 2.5 };
}

window.__eng = { get S() { return S; }, get scene() { return scene; }, act: (k, i) => { const b = scene.boxes[k]; act(b, i != null ? b.items[i] : null); }, chooseTable, check, TASKS_A, TASKS_C, gen: (fn) => { S.list[S.i] = fn(); showProblem(); } }; // לבדיקות
