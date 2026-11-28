// רשימת המשחקים במגרש המשחקים.
// כדי להוסיף משחק: יוצרים תיקייה ב-games/ עם קובץ משחק (ראו words/words.js), ומוסיפים אותו כאן.
// station – איפה התחנה של המשחק עומדת בחצר (מטרים; x ימינה-שמאלה, z קדימה-אחורה, 0,0 = אמצע המגרש).
// soon: true – תחנה של משחק שעוד לא מוכן ("בקרוב").
import { WORDS } from './words/words.js';
import { MATH } from './math/math.js';
import { ENGLISH } from './english/english.js';
import { HOMEWORK } from './homework/homework.js';

export const GAMES = [
  WORDS,
  MATH,
  ENGLISH,
  HOMEWORK,
];
