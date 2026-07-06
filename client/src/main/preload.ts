import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("aegis", {
  onStateChange: (cb: (state: string) => void) =>
    ipcRenderer.on("daemon:state-change", (_e, state) => cb(state)),

  onSessionStart: (cb: (session: object) => void) =>
    ipcRenderer.on("session:started", (_e, session) => cb(session)),

  onSessionEnd: (cb: (data: { id: string }) => void) =>
    ipcRenderer.on("session:ended", (_e, data) => cb(data)),

  onIllumination: (cb: (illumination: object) => void) =>
    ipcRenderer.on("pim:illumination", (_e, illumination) => cb(illumination)),

  drag: (x: number, y: number) =>
    ipcRenderer.send("overlay:drag", { x, y }),

  openSettings: () =>
    ipcRenderer.send("overlay:open-settings"),

  closeSettings: () =>
    ipcRenderer.send("overlay:close-settings"),

  minimize: () =>
    ipcRenderer.send("overlay:minimize"),
});
