import Shell from 'node-powershell';
import path from 'path';
import { spawnPromise } from 'spawn-rx';

import { MSICreatorOptions } from '../../../lib/index';

export interface InstallPaths {
  appRootFolder: string;
  appFolder: string;
  stubExe: string;
  startMenuShortcut: string;
  desktopShortcut: string;
}

export const install = async (msi: string) => {
  return spawnPromise('msiexec.exe', ['/i', msi, '/qb']);
};

export const uninstall = async (msi: string) => {
  return spawnPromise('msiexec.exe', ['/x', msi, '/qb']);
};

export const uninstallViaPowershell = async (name: string) => {
  const ps = new Shell({
    executionPolicy: 'Bypass',
    noProfile: true
  });

  try {
    ps.addCommand(`$p = Get-Package -Name ${name} | Uninstall-Package`);
    await ps.invoke();
  } finally {
    ps.dispose();
  }
};

export const checkInstall = async (name: string, version?: string) => {
  const ps = new Shell({
    executionPolicy: 'Bypass',
    noProfile: true
  });

  let installPackage: string;
  try {
    if (version) {
      ps.addCommand(`$p = Get-Package -Name ${name} -RequiredVersion ${version} -ErrorAction SilentlyContinue`);
      ps.addCommand('$p.Name + $p.Version');
    } else {
      ps.addCommand(`$p = Get-Package -Name ${name} -ErrorAction SilentlyContinue`);
      ps.addCommand('$p.Name');
    }
    installPackage = await ps.invoke();
    installPackage = installPackage.replace(/(\r\n|\n|\r)/gm, '');
  } finally {
    ps.dispose();
  }

  return installPackage === `${name}${!!version ? version : ''}`;
};

export const getInstallPaths = (options: MSICreatorOptions): InstallPaths => {
  const programFiles = options.arch === 'x64' || options.arch === 'ia64' ? process.env.ProgramFiles! : process.env['ProgramFiles(x86)']!;
  const appRootFolder = path.join(programFiles, options.name);
  return {
    appRootFolder,
    stubExe: path.join(appRootFolder, options.exe),
    appFolder: path.join(appRootFolder, `app-${options.version}`),
    startMenuShortcut: path.join(process.env.ProgramData!, `Microsoft/Windows/Start Menu/Programs/${options.shortcutFolderName || options.manufacturer}/${options.shortcutName || options.name}.lnk`),
    desktopShortcut: path.join(process.env.Public!, `Desktop/${options.shortcutName || options.name}.lnk`),
  };
};

