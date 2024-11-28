import { app, BrowserWindow, session } from 'electron';
import * as path from 'path';

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 1000,
    title: 'Min QX',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      webSecurity: true,
    },
  });

  // win.webContents.openDevTools();

  win.loadURL('http://localhost:5173'); // Vite default port

  // const curSession = win.webContents.session;

  // // If using method B for the session you should first construct the BrowserWindow
  // const filter = { urls: ["*://*.api.qubic.org/*"] };

  // curSession.webRequest.onHeadersReceived(filter, (details, callback) => {
  //   details.responseHeaders["Access-Control-Allow-Origin"] = [
  //     "http://localhost:5173",
  //   ];
  //   callback({ responseHeaders: details.responseHeaders });
  // });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
