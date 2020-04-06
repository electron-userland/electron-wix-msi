import expect from 'expect.js';
import * as fs from 'fs-extra';
import path from 'path';

import { getWindowsCompliantVersion } from '../../lib/utils/version-util';
import { expectSameFolderContent } from './common';
import { getProcessPath, kill, launch, runs } from './utils/app-process';
import { checkInstall, getInstallPaths, install, uninstall, uninstallViaPowershell } from './utils/installer';
import { createMsiPackage, defaultMsiOptions, HARNESS_APP_DIR, OUT_DIR } from './utils/msi-packager';
import { getAutoLaunchKey } from './utils/registry';

const msiPath = path.join(OUT_DIR, 'HelloWix.msi');

const msiOptions = {
  ...defaultMsiOptions,
  features: {
    autoUpdate: false,
    autoLaunch: true
  }
};

const msiPaths123beta = getInstallPaths(msiOptions);
let autoLaunchRegistryKeyValue = '';

describe('MSI auto-launch', () => {
  before(async () => {
    if (await checkInstall(defaultMsiOptions.name)) {
      await uninstallViaPowershell(defaultMsiOptions.name);
    }
  });

  it('packages', async () => {
    await createMsiPackage(msiOptions);
  });

  it('installs', async () => {
    await install(msiPath, 3);
    const version = getWindowsCompliantVersion(msiOptions.version);
    expect(await checkInstall(msiOptions.name, version)).ok();
  });

  it('has all files in program files', () => {
    expect(fs.pathExistsSync(msiPaths123beta.stubExe)).ok();
    expect(fs.pathExistsSync(msiPaths123beta.appFolder)).ok();
    expectSameFolderContent(HARNESS_APP_DIR, msiPaths123beta.appFolder);
  });

  it('has shortcuts', () => {
    expect(fs.pathExistsSync(msiPaths123beta.startMenuShortcut)).ok();
    expect(fs.pathExistsSync(msiPaths123beta.desktopShortcut)).ok();
  });

  it('has auto-launch registry key', async () => {
    autoLaunchRegistryKeyValue = await getAutoLaunchKey(msiPaths123beta.registryRunKey, msiPaths123beta.appUserModelId);
    expect(autoLaunchRegistryKeyValue).to.be(msiPaths123beta.stubExe);
  });

  const entryPoints = [
    { name: 'stubExe', path: msiPaths123beta.stubExe },
    { name: 'start menu shortcut', path: msiPaths123beta.startMenuShortcut },
    { name: 'desktop shortcut', path: msiPaths123beta.desktopShortcut },
    { name: 'auto-launch key', path: autoLaunchRegistryKeyValue },
  ];

  entryPoints.forEach(async (entryPoint) => {
    it(`runs the correct binary via ${entryPoint.name}`, async () => {
      await launch(msiPaths123beta.startMenuShortcut);
      expect(await runs(msiOptions.exe)).ok();
      expect(await getProcessPath(msiOptions.exe)).to.be(msiPaths123beta.appExe);
      await kill(msiOptions.exe);
     });
  });

  it('uninstalls', async () => {
    await uninstall(msiPath);
    expect(await checkInstall(msiOptions.name)).not.ok();
    expect(fs.pathExistsSync(msiPaths123beta.appRootFolder)).not.ok();
    expect(fs.pathExistsSync(msiPaths123beta.startMenuShortcut)).not.ok();
    expect(fs.pathExistsSync(msiPaths123beta.desktopShortcut)).not.ok();
  });
});
