import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("roleRadar", {
  platform: process.platform,
  version: appVersion(),
  apiBase: "http://127.0.0.1:4310/api",
  readClipboard: () => ipcRenderer.invoke("desktop:read-clipboard") as Promise<string>,
  copyText: (text: string) => ipcRenderer.invoke("desktop:copy-text", text),
  openPlatform: (url: string) => ipcRenderer.invoke("desktop:open-platform", url),
  notify: (payload: { title: string; body: string }) => ipcRenderer.invoke("desktop:notify", payload),
  localServices: (action: "start" | "stop") => ipcRenderer.invoke("desktop:local-services", action),
  onQuickCapture: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("desktop:quick-capture", listener);
    return () => ipcRenderer.removeListener("desktop:quick-capture", listener);
  }
});

function appVersion() { return "0.1.0"; }
