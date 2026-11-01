import { app, utilityProcess, type UtilityProcess } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { attachServiceLogs } from "./service-logger";

export type ServiceActionResult = { success: boolean; message: string; details?: string };
type HealthPayload = { status?: string; service?: string; database?: string; redis?: string; ollama?: string };

let apiProcess: UtilityProcess | undefined;
let aiProcess: ChildProcess | undefined;
let closeApiLogs: (() => void) | undefined;
let closeAiLogs: (() => void) | undefined;
let apiStartup: Promise<ServiceActionResult> | undefined;
let aiStartup: Promise<ServiceActionResult> | undefined;

function composeFile(): string {
  return app.isPackaged
    ? join(process.resourcesPath, "infra", "docker-compose.yml")
    : join(app.getAppPath(), "../../docker-compose.yml");
}

function workspaceRoot(): string {
  return app.isPackaged ? app.getPath("userData") : join(app.getAppPath(), "../..");
}

function runCompose(action: "start" | "stop"): Promise<ServiceActionResult> {
  const file = composeFile();
  if (!existsSync(file)) return Promise.resolve({ success: false, message: "The local services compose file was not found." });
  const args = ["compose", "-f", file, ...(action === "start" ? ["up", "-d", "--wait", "--wait-timeout", "60"] : ["stop"])];

  return new Promise((resolve) => {
    const child = spawn("docker", args, { shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let settled = false;
    const finish = (result: ServiceActionResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };
    const timeoutMs = action === "start" ? 90_000 : 20_000;
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      finish({ success: false, message: `Docker Compose did not finish within ${timeoutMs / 1000} seconds.`, details: output.slice(-3000) });
    }, timeoutMs);
    child.stdout.on("data", chunk => { output = `${output}${String(chunk)}`.slice(-5000); });
    child.stderr.on("data", chunk => { output = `${output}${String(chunk)}`.slice(-5000); });
    child.on("error", error => finish({ success: false, message: "Docker CLI could not be started. Install Docker Engine and Compose.", details: error.message }));
    child.on("close", code => finish({
      success: code === 0,
      message: code === 0 ? `Local databases ${action === "start" ? "started" : "stopped"}.` : "Docker Compose failed. Check Docker daemon and permissions.",
      details: output.trim()
    }));
  });
}

async function readHealth(url: string): Promise<HealthPayload | null> {
  try {
    const timeout = url.includes(":8010/") ? 3500 : 1200;
    const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    if (!response.ok) return null;
    return await response.json() as HealthPayload;
  } catch {
    return null;
  }
}

async function waitForHealth(
  url: string,
  isHealthy: (health: HealthPayload) => boolean,
  timeoutMs: number,
  processIsAlive: () => boolean = () => true
): Promise<HealthPayload | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && processIsAlive()) {
    const health = await readHealth(url);
    if (health && isHealthy(health)) return health;
    await new Promise(resolve => setTimeout(resolve, 700));
  }
  return null;
}

function waitForUtilitySpawn(child: UtilityProcess): Promise<boolean> {
  if (child.pid !== undefined) return Promise.resolve(true);
  return new Promise(resolve => {
    const finish = (spawned: boolean) => {
      clearTimeout(timeout);
      child.removeListener("spawn", onSpawn);
      child.removeListener("exit", onExit);
      resolve(spawned);
    };
    const onSpawn = () => finish(true);
    const onExit = () => finish(false);
    const timeout = setTimeout(() => finish(false), 5000);
    child.once("spawn", onSpawn);
    child.once("exit", onExit);
  });
}

function waitForExit(child: UtilityProcess, timeoutMs: number): Promise<void> {
  if (child.pid === undefined) return Promise.resolve();
  return new Promise(resolve => {
    const finish = () => { clearTimeout(timeout); child.removeListener("exit", finish); resolve(); };
    const timeout = setTimeout(finish, timeoutMs);
    child.once("exit", finish);
  });
}

async function startApiSidecar(): Promise<ServiceActionResult> {
  if (apiStartup) return apiStartup;
  apiStartup = launchApiSidecar();
  try { return await apiStartup; }
  finally { apiStartup = undefined; }
}

async function launchApiSidecar(): Promise<ServiceActionResult> {
  const apiUrl = "http://127.0.0.1:4310/api/health/ready";
  if (!app.isPackaged) {
    const existing = await waitForHealth(apiUrl, health => health.status === "ready", 2500);
    return existing
      ? { success: true, message: "NestJS API is healthy and connected to MongoDB and Redis." }
      : { success: false, message: "NestJS API is not ready. Start it with `pnpm dev:api` and retry." };
  }

  if (apiProcess?.pid !== undefined) {
    const existing = await waitForHealth(apiUrl, health => health.status === "ready", 2500, () => apiProcess?.pid !== undefined);
    if (existing) return { success: true, message: "RoleRadar API is already healthy." };
    await stopApiSidecar();
  }

  const entry = join(process.resourcesPath, "backend", "api", "dist", "main.js");
  if (!existsSync(entry)) return { success: false, message: "Packaged API sidecar is missing. Rebuild the Linux installer." };

  const child = utilityProcess.fork(entry, [], {
    cwd: join(process.resourcesPath, "backend", "api"),
    env: {
      ...process.env,
      NODE_ENV: "production",
      MONGODB_URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/roleradar",
      REDIS_HOST: process.env.REDIS_HOST || "127.0.0.1",
      REDIS_PORT: process.env.REDIS_PORT || "6379"
    },
    stdio: "pipe",
    serviceName: "RoleRadar API"
  });
  apiProcess = child;
  closeApiLogs = attachServiceLogs("api", child.stdout, child.stderr);
  let apiExited = false;
  child.once("exit", () => {
    apiExited = true;
    if (apiProcess === child) apiProcess = undefined;
    closeApiLogs?.();
    closeApiLogs = undefined;
  });
  if (!(await waitForUtilitySpawn(child))) {
    child.kill();
    if (apiProcess === child) apiProcess = undefined;
    return { success: false, message: "Packaged API sidecar failed to spawn." };
  }

  const healthy = await waitForHealth(apiUrl, health => health.status === "ready", 30_000, () => !apiExited);
  if (healthy) return { success: true, message: "RoleRadar API is ready; MongoDB and Redis are connected." };
  child.kill();
  if (apiProcess === child) apiProcess = undefined;
  return { success: false, message: "RoleRadar API did not become ready within 30 seconds. Check Docker and local service logs." };
}

async function startAiSidecar(): Promise<ServiceActionResult> {
  if (aiStartup) return aiStartup;
  aiStartup = launchAiSidecar();
  try { return await aiStartup; }
  finally { aiStartup = undefined; }
}

async function launchAiSidecar(): Promise<ServiceActionResult> {
  const aiUrl = "http://127.0.0.1:8010/health";
  const isAiHealthy = (health: HealthPayload) => health.service === "roleradar-ai";
  const existing = await readHealth(aiUrl);
  if (existing && isAiHealthy(existing)) {
    return { success: true, message: existing.ollama === "available" ? "Python AI and Ollama are available." : "Python AI is running; Ollama/model availability needs attention." };
  }

  let child: ChildProcess;
  if (app.isPackaged) {
    const binary = join(process.resourcesPath, "backend", "ai-service", "roleradar-ai", "roleradar-ai");
    if (!existsSync(binary)) return { success: true, message: "AI sidecar is not installed; search and tracking work without AI." };
    child = spawn(binary, [], {
      cwd: join(process.resourcesPath, "backend", "ai-service", "roleradar-ai"),
      env: { ...process.env, OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434", OLLAMA_MODEL: process.env.OLLAMA_MODEL || "qwen2.5:3b", AI_SERVICE_PORT: "8010" },
      shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"]
    });
  } else {
    const root = workspaceRoot();
    const aiRoot = join(root, "apps", "ai-service");
    const python = join(aiRoot, ".venv", "bin", "python");
    if (!existsSync(python)) return { success: true, message: "AI is optional. Create apps/ai-service/.venv and run `pnpm dev:ai` to enable it." };
    child = spawn(python, ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8010"], {
      cwd: aiRoot,
      env: { ...process.env, PYTHONPATH: aiRoot, AI_SERVICE_PORT: "8010" },
      shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"]
    });
  }

  aiProcess = child;
  closeAiLogs = attachServiceLogs("ai-service", child.stdout, child.stderr);
  let launchError = "";
  let launchFailed = false;
  let aiExited = false;
  child.once("error", error => { launchError = error.message; launchFailed = true; });
  child.once("exit", () => {
    aiExited = true;
    if (aiProcess === child) aiProcess = undefined;
    closeAiLogs?.();
    closeAiLogs = undefined;
  });
  const health = await waitForHealth(aiUrl, isAiHealthy, 20_000, () => !child.killed && !launchFailed && !aiExited);
  if (health) {
    return { success: true, message: health.ollama === "available" ? "Python AI service and Ollama are available." : "Python AI service started; Ollama is not responding or its model is unavailable." };
  }
  child.kill("SIGTERM");
  if (aiProcess === child) aiProcess = undefined;
  return { success: true, message: "Core services are ready, but the optional Python AI service could not start.", details: launchError };
}

async function stopAiSidecar(): Promise<void> {
  const child = aiProcess;
  aiProcess = undefined;
  if (!child || child.killed) return;
  child.kill("SIGTERM");
  await new Promise<void>(resolve => {
    const timeout = setTimeout(resolve, 3000);
    child.once("exit", () => { clearTimeout(timeout); resolve(); });
  });
  closeAiLogs?.();
  closeAiLogs = undefined;
}

async function stopApiSidecar(): Promise<void> {
  const child = apiProcess;
  apiProcess = undefined;
  if (!child) return;
  child.kill();
  await waitForExit(child, 5000);
  closeApiLogs?.();
  closeApiLogs = undefined;
}

export async function stopManagedProcesses(): Promise<void> {
  await stopAiSidecar();
  await stopApiSidecar();
}

export async function runLocalServices(action: "start" | "stop"): Promise<ServiceActionResult> {
  if (action === "stop") {
    await stopAiSidecar();
    await stopApiSidecar();
    return runCompose("stop");
  }

  const infrastructure = await runCompose("start");
  if (!infrastructure.success) return infrastructure;
  const api = await startApiSidecar();
  if (!api.success) return { ...api, details: [infrastructure.details, api.details].filter(Boolean).join("\n") };
  const ai = await startAiSidecar();
  return {
    success: true,
    message: `${api.message} ${ai.message}`,
    details: [infrastructure.details, ai.details].filter(Boolean).join("\n") || undefined
  };
}
