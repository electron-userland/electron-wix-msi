import path from 'path';
import { spawnPromise } from 'spawn-rx';

export const readAppUserModelId = async (lnkPath: string) => {
  const lnkspector = path.join(__dirname, '../../src/utils/bin/Lnkspector.exe');
  const aumid = await spawnPromise(lnkspector, ['-aumid', lnkPath]);
  return aumid.replace(/(\r\n|\n|\r)/gm, '');
};
