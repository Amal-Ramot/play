// מגרש המשחקים – גרסת מחשב (Electron)
// המשחק עצמו הוא אותם קבצים של האתר, שנמצאים בתיקייה game.
// ההבדל: כאן אין מגבלת הורדה, אז מפעילים גרפיקה מקסימלית וחפצים מפורטים.
const { app, BrowserWindow, protocol, net, Menu } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const GAME = path.join(__dirname, 'game');

// כתובת פנימית app://play/ – כדי שמודולים, טעינת קבצים ושמירת התקדמות יעבדו כמו באתר
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

// להעדיף את כרטיס המסך החזק
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('enable-unsafe-webgpu');

function createWindow() {
  const win = new BrowserWindow({
    width: 1600, height: 900, backgroundColor: '#2a2433',
    title: 'מגרש המשחקים', autoHideMenuBar: true,
    icon: path.join(__dirname, 'game', 'favicon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true },
  });
  win.maximize();
  win.loadURL('app://play/index.html');
  // F11 – מסך מלא
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  // קישורים חיצוניים לא נפתחים בתוך המשחק
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://play/')) e.preventDefault(); });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url);
    const file = path.normalize(path.join(GAME, decodeURIComponent(pathname)));
    if (!file.startsWith(GAME)) return new Response('no', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  createWindow();
});
app.on('window-all-closed', () => app.quit());
