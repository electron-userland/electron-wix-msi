import { Options } from 'electron-winstaller';
import Shell from 'node-powershell';
import path from 'path';
import { spawnPromise } from 'spawn-rx';

import { MSICreatorOptions } from '../../../lib/index';

function isMSICreatorOptions(toBeDetermined: MSICreatorOptions | Options): toBeDetermined is MSICreatorOptions {
  if ((toBeDetermined as MSICreatorOptions).ui) {
    return true;
  }
  return false;
}

export interface InstallPaths {
  appRootFolder: string;
  appFolder: string;
  appExe: string;
  stubExe: string;
  updateExe: string;
  startMenuShortcut: string;
  desktopShortcut: string;
  appUserModelId: string;
}

export const install = async (msi: string, installLevel: 1 | 2 = 1) => {
  return spawnPromise('msiexec.exe', ['/i', msi, `INSTALLLEVEL=${installLevel}`, '/qb']);
};

export const uninstall = async (msi: string) => {
  return spawnPromise('msiexec.exe', ['/x', msi, '/qb']);
};

export const autoUpdate = async (updaterExe: string, server: string) => {
  return spawnPromise(updaterExe, [`--update=${server}`]);
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

export const getInstallPaths = (options: MSICreatorOptions | Options): InstallPaths => {
  const programFiles = isMSICreatorOptions(options) ?
    (options.arch === 'x64' || options.arch === 'ia64' ?
      process.env.ProgramFiles! : process.env['ProgramFiles(x86)']!) :
      process.env['ProgramFiles(x86)']!;
  const appRootFolder = path.join(programFiles, options.name!);
  const shortName = isMSICreatorOptions(options) ? options.shortName || options.name : options.name;
  const genericAumid = `com.squirrel.${shortName}.${options.exe!.replace(/\.exe$/, '')}`;
  const appUserModelId = isMSICreatorOptions(options) ? options.appUserModelId || genericAumid : genericAumid;
  return {
    appRootFolder,
    stubExe: path.join(appRootFolder, options.exe!),
    updateExe: path.join(appRootFolder, 'Update.exe'),
    appFolder: path.join(appRootFolder, `app-${options.version}`),
    appExe: path.join(appRootFolder, `app-${options.version}`, options.exe!),
    startMenuShortcut: isMSICreatorOptions(options) ?  path.join(process.env.ProgramData!, `Microsoft/Windows/Start Menu/Programs/${options.shortcutFolderName || options.manufacturer}/${options.shortcutName || options.name}.lnk`) : '',
    desktopShortcut: isMSICreatorOptions(options) ? path.join(process.env.Public!, `Desktop/${options.shortcutName || options.name}.lnk`) : '',
    appUserModelId,
  };
};

