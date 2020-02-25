import { spawnPromise } from 'spawn-rx';

export const install = async (msi: string) => {
  return spawnPromise('msiexec.exe', ['/i', msi, '/qb']);
};
