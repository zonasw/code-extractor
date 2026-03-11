import { useState, useEffect } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export function useUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState<Update | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  const checkForUpdates = async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      const update = await check();
      setUpdateAvailable(update ?? null);
    } catch (e) {
      console.error("检查更新失败:", e);
    } finally {
      setIsChecking(false);
    }
  };

  const installUpdate = async () => {
    if (!updateAvailable || isInstalling) return;
    setIsInstalling(true);
    setDownloadProgress(0);
    try {
      let downloaded = 0;
      let total = 0;
      await updateAvailable.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (total > 0) {
            setDownloadProgress(Math.round((downloaded / total) * 100));
          }
        } else if (event.event === "Finished") {
          setDownloadProgress(100);
        }
      });
      await relaunch();
    } catch (e) {
      console.error("安装更新失败:", e);
      setIsInstalling(false);
      setDownloadProgress(null);
    }
  };

  const dismissUpdate = () => {
    setUpdateAvailable(null);
    setDownloadProgress(null);
  };

  // 启动时自动检查（仅生产环境）
  useEffect(() => {
    if (!import.meta.env.DEV) {
      checkForUpdates();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    updateAvailable,
    isChecking,
    isInstalling,
    downloadProgress,
    checkForUpdates,
    installUpdate,
    dismissUpdate,
  };
}
