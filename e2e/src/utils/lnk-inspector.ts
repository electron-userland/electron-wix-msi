import path from "path";
import { spawnPromise } from "spawn-rx";

const readShortcut = async (lnkPath: string) => {
  const lnkspector = path.join(__dirname, "../../src/utils/bin/Lnkspector.exe");
  const json = await spawnPromise(lnkspector, [lnkPath]);
  return JSON.parse(json);
};

export const readAppUserModelId = async (lnkPath: string) => {
  const shortcut = await readShortcut(lnkPath);
  return shortcut.AppUserModelId;
};

export const readToastActivatorCLSID = async (lnkPath: string) => {
  const shortcut = await readShortcut(lnkPath);
  return shortcut.ToastActivatorCLSID;
};
