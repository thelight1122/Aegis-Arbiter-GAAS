import { app, BrowserWindow, ipcMain, screen } from "electron";
import path from "path";
import { AegisDaemon } from "../daemon/daemon";
import type { OverlayState } from "../ipc/types";

let overlayWindow: BrowserWindow | null = null;
let daemon: AegisDaemon | null = null;

function createOverlay() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  overlayWindow = new BrowserWindow({
    width: 120,
    height: 120,
    x: width - 140,
    y: height - 140,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  overlayWindow.setIgnoreMouseEvents(false);
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });

  if (process.env.NODE_ENV === "development") {
    overlayWindow.loadURL("http://localhost:5173");
  } else {
    overlayWindow.loadFile(
      path.join(__dirname, "../../renderer/index.html")
    );
  }
}

function startDaemon() {
  daemon = new AegisDaemon({
    arbiterUrl: process.env.AEGIS_ARBITER_URL ?? "wss://20.127.92.245:8787",
    onStateChange: (state: OverlayState) => {
      overlayWindow?.webContents.send("daemon:state-change", state);
    },
    onSessionStart: (session) => {
      overlayWindow?.webContents.send("session:started", session);
    },
    onSessionEnd: (id) => {
      overlayWindow?.webContents.send("session:ended", { id });
    },
    onIllumination: (illumination) => {
      overlayWindow?.webContents.send("pim:illumination", illumination);
    },
  });

  daemon.start();
}

const SHIELD_SIZE = { w: 120, h: 120 };
const SETTINGS_SIZE = { w: 420, h: 780 };

// Allow renderer to drag the overlay
ipcMain.on("overlay:drag", (_event, { x, y }: { x: number; y: number }) => {
  overlayWindow?.setPosition(x, y);
});

// Expand window for settings panel
ipcMain.on("overlay:open-settings", () => {
  if (!overlayWindow) return;
  const [x, y] = overlayWindow.getPosition();
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  // Reposition so panel stays on screen
  const nx = Math.min(x, sw - SETTINGS_SIZE.w - 20);
  const ny = Math.min(y, sh - SETTINGS_SIZE.h - 20);
  overlayWindow.setSize(SETTINGS_SIZE.w, SETTINGS_SIZE.h);
  overlayWindow.setPosition(nx, ny);
  overlayWindow.setIgnoreMouseEvents(false);
});

// Shrink back to shield size
ipcMain.on("overlay:close-settings", () => {
  if (!overlayWindow) return;
  const [x, y] = overlayWindow.getPosition();
  overlayWindow.setSize(SHIELD_SIZE.w, SHIELD_SIZE.h);
  // Re-centre position on where the shield was
  overlayWindow.setPosition(
    x + Math.floor((SETTINGS_SIZE.w - SHIELD_SIZE.w) / 2),
    y + Math.floor((SETTINGS_SIZE.h - SHIELD_SIZE.h) / 2)
  );
});

ipcMain.on("overlay:minimize", () => {
  overlayWindow?.minimize();
});

app.whenReady().then(() => {
  createOverlay();
  startDaemon();
});

app.on("window-all-closed", () => {
  daemon?.stop();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createOverlay();
});
