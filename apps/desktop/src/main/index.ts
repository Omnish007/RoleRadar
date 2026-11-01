import { app, BrowserWindow, clipboard, globalShortcut, ipcMain, Notification, shell, nativeImage } from "electron";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { runLocalServices, stopManagedProcesses } from "./local-services";

const isDevelopment = !app.isPackaged;

function resolveRoleRadarIcon() {
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, "app-icon.png")
    : join(app.getAppPath(), "build", "icon.png");
  const icon = nativeImage.createFromPath(iconPath);
  return icon.isEmpty() ? undefined : icon;
}
let mainWindow: BrowserWindow | undefined;
let isQuitting = false;
const allowedHosts = new Set([
  "linkedin.com", "naukri.com", "indeed.com", "indeed.co.in", "wellfound.com"
]);

function rendererEntryPath(): string {
  return isDevelopment
    ? join(__dirname, "../renderer/index.html")
    : join(app.getAppPath(), "out", "renderer", "index.html");
}

function rendererEntryUrl(): string {
  return pathToFileURL(rendererEntryPath()).toString();
}

function isTrustedSender(url: string): boolean {
  if (isDevelopment) return url.startsWith("http://localhost:5173/");
  return url.split("#")[0].split("?")[0] === rendererEntryUrl();
}

function registerIpcHandlers() {
  ipcMain.handle("desktop:read-clipboard", async (event) => {
    if (!isTrustedSender(event.senderFrame?.url ?? "")) throw new Error("Untrusted IPC sender");
    const text = await clipboard.readText();
    return text.slice(0, 5000);
  });

  ipcMain.handle("desktop:copy-text", async (event, value: unknown) => {
    if (!isTrustedSender(event.senderFrame?.url ?? "")) throw new Error("Untrusted IPC sender");
    if (typeof value !== "string" || value.length > 5000) throw new Error("Invalid clipboard payload");
    await clipboard.writeText(value);
    return { copied: true };
  });

  ipcMain.handle("desktop:open-platform", async (event, rawUrl: unknown) => {
    if (!isTrustedSender(event.senderFrame?.url ?? "")) throw new Error("Untrusted IPC sender");
    if (typeof rawUrl !== "string") throw new Error("Invalid URL");
    const target = new URL(rawUrl);
    const permitted = target.protocol === "https:" && [...allowedHosts].some(
      host => target.hostname === host || target.hostname.endsWith(`.${host}`)
    );
    if (!permitted) throw new Error("This external host is not an approved job platform.");
    await shell.openExternal(target.toString());
    return { opened: true };
  });

  ipcMain.handle("desktop:local-services", async (event, action: unknown) => {
    if (!isTrustedSender(event.senderFrame?.url ?? "")) throw new Error("Untrusted IPC sender");
    if (action !== "start" && action !== "stop") throw new Error("Invalid local service action");
    return runLocalServices(action);
  });

  ipcMain.handle("desktop:notify", (event, payload: unknown) => {
    if (!isTrustedSender(event.senderFrame?.url ?? "")) throw new Error("Untrusted IPC sender");
    if (!payload || typeof payload !== "object") throw new Error("Invalid notification payload");
    const { title, body } = payload as { title?: unknown; body?: unknown };
    if (typeof title !== "string" || typeof body !== "string") throw new Error("Invalid notification content");
    if (!Notification.isSupported()) throw new Error("Desktop notifications are not supported on this system.");
    new Notification({ title: title.slice(0, 120), body: body.slice(0, 240), icon: resolveRoleRadarIcon() }).show();
    return { shown: true };
  });
}

function attachRendererDiagnostics(window: BrowserWindow) {
  if (!isDevelopment) return;

  const contents = window.webContents;
  contents.on("console-message", (_event, level, message, line, sourceId) => {
    const levelNames = ["verbose", "info", "warning", "error"];
    const levelName = levelNames[level] ?? `level-${level}`;
    const location = sourceId ? ` ${sourceId}:${line}` : "";
    const prefix = `[renderer ${levelName}]`;
    const output = `${message}${location}`;
    if (level >= 3) console.error(prefix, output);
    else if (level === 2) console.warn(prefix, output);
    else console.log(prefix, output);
  });
  contents.on("preload-error", (_event, preloadPath, error) => {
    console.error(`[preload] ${preloadPath}`, error);
  });
  contents.on("did-fail-load", (_event, code, description, url, isMainFrame) => {
    if (isMainFrame) console.error(`[renderer load failed] ${code} ${description}: ${url}`);
  });
  contents.on("render-process-gone", (_event, details) => {
    console.error(`[renderer process gone] ${details.reason}; exit code ${details.exitCode}`);
  });
  contents.on("did-finish-load", () => {
    console.info(`[renderer loaded] ${contents.getURL()}`);
    // contents.openDevTools({ mode: "detach" });
  });
  contents.on("before-input-event", (event, input) => {
    const opensDevTools = input.key === "F12" ||
      (input.type === "keyDown" && (input.control || input.meta) && input.shift && input.key.toLowerCase() === "i");
    if (!opensDevTools) return;
    event.preventDefault();
    contents.openDevTools({ mode: "detach" });
  });
}

function createWindow() {
  const window = new BrowserWindow({
    icon: resolveRoleRadarIcon(),
    width: 1440, height: 920, minWidth: 1080, minHeight: 720,
    backgroundColor: "#f7f8fa", title: "RoleRadar",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true, nodeIntegration: false, sandbox: true
    }
  });

  mainWindow = window;
  attachRendererDiagnostics(window);
  window.on("closed", () => { if (mainWindow === window) mainWindow = undefined; });
  window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "https:" && [...allowedHosts].some(host => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))) {
        void shell.openExternal(parsed.toString());
      }
    } catch { /* Invalid external URLs are denied. */ }
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    const localUrl = isDevelopment ? url.startsWith("http://localhost:5173/") : url.split("#")[0].split("?")[0] === rendererEntryUrl();
    if (!localUrl) event.preventDefault();
  });

  if (isDevelopment) {
    void window.loadURL("http://localhost:5173").catch(error => console.error("[renderer navigation]", error));
  } else {
    void window.loadFile(rendererEntryPath()).catch(error => console.error("[renderer navigation]", error));
  }
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  const registered = globalShortcut.register("CommandOrControl+Shift+J", () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send("desktop:quick-capture");
  });
  if (!registered) console.warn("RoleRadar quick-capture shortcut could not be registered.");
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", (event) => {
  if (isQuitting) return;
  event.preventDefault();
  isQuitting = true;
  globalShortcut.unregisterAll();
  void stopManagedProcesses().finally(() => app.quit());
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
