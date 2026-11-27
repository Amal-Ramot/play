// סצנת ערב – רק בגרסת המחשב (window.PLAY_DESKTOP)
// שעת ערב, פנסים דולקים, שרשרת נורות, בית עץ, עצים, גדר וערוגות.
// החפצים נבנו מראש עם sand3d (תיקייה assets/hd). אם משהו לא נטען – פשוט מדלגים עליו.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const WARM = '#ffb468';
let lanternModel = null;

// פנס קטן ליד כל תחנה – נוסף לקבוצה של התחנה, אז הוא נעלם יחד איתה כשנכנסים למשחק
export function stationLamp(grp) {
  if (!lanternModel) return;
  const o = lanternModel.clone(true);
  o.position.set(-1.75, 0, -1.15); o.scale.setScalar(0.85);
  grp.add(o);
  const l = new THREE.PointLight(WARM, 22, 8, 1.5);
  l.position.set(-1.75, 2.2, -1.15);
  grp.add(l);
}

async function load(L, n) {
  try {
    const g = await L.loadAsync(`assets/hd/${n}.glb`);
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      const m = o.material;
      // חלונות ונורות – זוהר חזק, כדי שהזוהר (Bloom) יתפוס אותם
      if (m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.05) { m.emissiveIntensity = 5; o.castShadow = false; }
      // זכוכית: שקופה פשוטה (זול יותר מזכוכית "אמיתית")
      if (m.transmission > 0) {
        o.material = new THREE.MeshStandardMaterial({ color: '#fff1d6', transparent: true, opacity: 0.28, roughness: 0.1, emissive: WARM, emissiveIntensity: 0.6, depthWrite: false });
        o.castShadow = false;
      }
    });
    return g.scene;
  } catch (e) { console.warn('hd', n, e); return null; }
}

function place(scene, src, x, z, ry = 0, s = 1) {
  if (!src) return null;
  const o = src.clone(true);
  o.position.set(x, 0, z); o.rotation.y = ry; o.scale.setScalar(s);
  scene.add(o);
  return o;
}

// שרשרת נורות קטנות שתלויה בין שתי נקודות, עם שקיעה באמצע
function stringLights(scene, a, b, n = 16, sag = 0.7) {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const p = a.clone().lerp(b, t); p.y -= Math.sin(Math.PI * t) * sag;
    pts.push(p);
  }
  const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.008, 4), new THREE.MeshStandardMaterial({ color: '#1b1b1b', roughness: 0.8 }));
  g.add(wire);
  const geo = new THREE.SphereGeometry(0.045, 10, 8);
  const cols = ['#ffd27a', '#ffb45c', '#ffe3a3'];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t); p.y -= Math.sin(Math.PI * t) * sag + 0.05;
    const bulb = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: cols[i % 3], emissiveIntensity: 7 }));
    bulb.position.copy(p); g.add(bulb);
  }
  scene.add(g);
  return g;
}

export async function applyEvening(C) {
  const { scene, sun, renderer } = C.R;

  // ---- תאורת ערב ----
  if (C.A.hdriEvening) {
    scene.environment = C.A.hdriEvening;
    scene.background = C.A.hdriEvening;
    scene.backgroundBlurriness = 0;
  }
  scene.environmentIntensity = 0.6;
  scene.backgroundIntensity = 0.85;
  scene.fog = new THREE.Fog('#7c7c9e', 26, 100);   // ערפל ערב כחלחל-סגול, קל
  sun.color.set('#ff9a5e');                        // שמש שוקעת – כתומה ונמוכה
  sun.intensity = 1.7;
  C.R.SUN_OFFSET.set(-32, 11, 10);
  scene.traverse((o) => { if (o.isHemisphereLight) { o.color.set('#5a73b8'); o.groundColor.set('#3b2d2a'); o.intensity = 0.8; } });
  renderer.toneMappingExposure = 1.25;

  // ---- חפצים ----
  const L = new GLTFLoader();
  const [lantern, tree, cabin, fence, bed] = await Promise.all(['lantern', 'tree', 'cabin', 'fence', 'bed'].map((n) => load(L, n)));
  const objs = [];
  lanternModel = lantern;

  // פנסים מסביב לחצר, ובכל אחד אור חם אמיתי
  const LAMPS = [[-12, -9.1], [-4.2, -9.1], [4.2, -9.1], [12, -9.1], [-15.6, 0], [15.6, 0], [-9, 7.4], [9, 7.4]];
  const tops = [];
  for (const [x, z] of LAMPS) {
    objs.push(place(scene, lantern, x, z));
    const light = new THREE.PointLight(WARM, 30, 13, 1.5);
    light.position.set(x, 2.6, z);
    scene.add(light);
    tops.push(new THREE.Vector3(x, 2.95, z));
  }
  // שרשראות נורות בין הפנסים שבצד האחורי, ומעל הצדדים
  for (let i = 0; i < 3; i++) stringLights(scene, tops[i], tops[i + 1], 18, 0.6);
  stringLights(scene, tops[0], tops[4], 22, 0.9);
  stringLights(scene, tops[3], tops[5], 22, 0.9);

  // בית עץ בפינה השמאלית האחורית, עם אור חם מהחלונות
  objs.push(place(scene, cabin, -12.6, -6.6, 0.12));
  const win = new THREE.PointLight('#ffae55', 14, 7, 1.6); win.position.set(-12.9, 0.9, -4.9); scene.add(win);

  // ערוגות וגדר בפינה הימנית האחורית
  objs.push(place(scene, bed, 11.2, -6.9, 0));
  objs.push(place(scene, bed, 13.9, -6.9, 0));
  for (const x of [10.0, 12.8, 15.6]) objs.push(place(scene, fence, x, -8.2, 0));

  // עצים מסביב
  const TREES = [[-15.2, -8.6, 1.15, 0.3], [15.4, -8.9, 1.25, 2.1], [-15.7, 5.6, 1.0, 1.2], [15.6, 6.0, 1.1, 4.0], [-6.8, -9.6, 0.95, 5.1], [7.6, -9.7, 1.0, 3.3]];
  for (const [x, z, s, ry] of TREES) objs.push(place(scene, tree, x, z, ry, s));

  return objs.filter(Boolean);
}
