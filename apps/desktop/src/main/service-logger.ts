import { app } from "electron";
import { chmodSync, createWriteStream, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const MAX_LOG_BYTES = 5 * 1024 * 1024;

type LogSource = "stdout" | "stderr";

export function attachServiceLogs(
  serviceName: "api" | "ai-service",
  stdout?: NodeJS.ReadableStream | null,
  stderr?: NodeJS.ReadableStream | null
): () => void {
  const directory = join(app.getPath("logs"), "roleradar");
  const logPath = join(directory, `${serviceName}.log`);
  let stream: ReturnType<typeof createWriteStream> | undefined;
  let bytesWritten = 0;

  try {
    mkdirSync(directory, { recursive: true });
    if (existsSync(logPath)) {
      bytesWritten = statSync(logPath).size;
      if (bytesWritten >= MAX_LOG_BYTES) {
        rotateLog(logPath);
        bytesWritten = 0;
      }
    }
    if (existsSync(logPath)) chmodSync(logPath, 0o600);
    stream = openLogStream(logPath);
  } catch (error) {
    console.error(`Could not initialize ${serviceName} log:`, error);
    return () => undefined;
  }

  const write = (source: LogSource, chunk: Buffer | string) => {
    if (!stream) return;
    const payload = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    const prefix = Buffer.from(`[${new Date().toISOString()}] [${source}] `);
    const line = Buffer.concat([prefix, payload, Buffer.from(payload.toString().endsWith("\n") ? "" : "\n")]);
    if (bytesWritten + line.length > MAX_LOG_BYTES) {
      rotateLog(logPath);
      stream.end();
      stream = openLogStream(logPath);
      bytesWritten = 0;
    }
    stream.write(line);
    bytesWritten += line.length;
  };

  const stdoutHandler = (chunk: Buffer | string) => write("stdout", chunk);
  const stderrHandler = (chunk: Buffer | string) => write("stderr", chunk);
  stdout?.on("data", stdoutHandler);
  stderr?.on("data", stderrHandler);
  return () => {
    stdout?.removeListener("data", stdoutHandler);
    stderr?.removeListener("data", stderrHandler);
    stream?.end();
    stream = undefined;
  };
}

function rotateLog(logPath: string): void {
  const previousPath = `${logPath}.1`;
  try {
    if (existsSync(previousPath)) unlinkSync(previousPath);
    if (existsSync(logPath)) renameSync(logPath, previousPath);
  } catch (error) {
    console.error("Could not rotate RoleRadar service log:", error);
  }
}

function openLogStream(logPath: string) {
  const logStream = createWriteStream(logPath, { flags: "a", mode: 0o600 });
  logStream.on("error", error => console.error("RoleRadar service log write failed:", error));
  return logStream;
}
