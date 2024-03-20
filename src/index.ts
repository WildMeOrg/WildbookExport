import { app, BrowserWindow, nativeImage } from "electron";

import icon from "./assets/icon.png";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

let mainWindow: BrowserWindow = undefined;

if (require("electron-squirrel-startup")) {
  app.quit();
}

const getWindow = () => {
  if (mainWindow) {
    return mainWindow;
  }

  const window = new BrowserWindow({
    width: 750,
    minWidth: 750,
    maxWidth: 750,
    height: 800,
    minHeight: 800,
    maxHeight: 800,
    autoHideMenuBar: true,
    icon: nativeImage.createFromDataURL(icon),
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  window.once("ready-to-show", () => {
    window.webContents.setZoomFactor(1.0);
  });

  window.on("closed", function () {
    mainWindow = undefined;
  });

  window.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  // window.webContents.openDevTools({ mode: "undocked" });

  return window;
};

app.on("ready", () => {
  // register IPC actions
  require("./ipc");

  mainWindow = getWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});

export { mainWindow };
