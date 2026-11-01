interface Window {
  roleRadar: {
    platform: string;
    version: string;
    apiBase: string;
    readClipboard(): Promise<string>;
    copyText(text: string): Promise<{ copied: boolean }>;
    openPlatform(url: string): Promise<{ opened: boolean }>;
    notify(payload: { title: string; body: string }): Promise<{ shown: boolean }>;
    localServices(action: "start" | "stop"): Promise<{ success: boolean; message: string; details?: string }>;
    onQuickCapture(callback: () => void): () => void;
  };
}

declare module "*.css";

declare module "*.svg" {
  const assetUrl: string;
  export default assetUrl;
}
