// מסמן למשחק שהוא רץ כתוכנה במחשב → גרפיקה מקסימלית
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('PLAY_DESKTOP', true);
