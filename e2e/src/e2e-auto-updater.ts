import expect from 'expect.js';
import * as fs from 'fs-extra';
import path from 'path';

import { getWindowsCompliantVersion } from '../../lib/utils/version-util';
import { expectSameFolderContent } from './common';
import { getProcessPath, kill, launch, runs } from './utils/app-process';
import { autoUpdate, checkInstall, getInstallPaths, install, uninstall, uninstallViaPowershell } from './utils/installer';
import { createMsiPackage, defaultMsiOptions, HARNESS_APP_DIR, OUT_DIR } from './utils/msi-packager';
import { hasAccessRights } from './utils/ntfs';
import { createSquirrelPackage, defaultSquirrelOptions, OUT_SQRL_DIR } from './utils/squirrel-packager';
import { serveSquirrel, stopServingSquirrel } from './utils/squirrel-server';

const msiPath = path.join(OUT_DIR, 'HelloWix.msi');

const msiOptions = {
  ...defaultMsiOptions,
  features: {
    autoUpdate: true,
    autoLaunch: false
  }
};
const squirrelOptions130 = {
  ...defaultSquirrelOptions,
  version: '1.3.0'
};

const msiPaths123beta = getInstallPaths(msiOptions);
const squirrelPaths130 = getInstallPaths(squirrelOptions130);


describe.only('MSI auto-updating', () => {
  before(async () => {
    if (await checkInstall(defaultMsiOptions.name)) {
      await uninstallViaPowershell(defaultMsiOptions.name);
    }
  });

  it('packages', async () => {
    await createMsiPackage(msiOptions);
    await createSquirrelPackage(defaultSquirrelOptions);
    await createSquirrelPackage(squirrelOptions130);

    expect(fs.pathExistsSync(msiPath)).ok();
    expect(fs.pathExistsSync(path.join(OUT_SQRL_DIR, 'RELEASES'))).ok();
    expect(fs.pathExistsSync(path.join(OUT_SQRL_DIR, 'HelloWix-1.2.3-beta-full.nupkg'))).ok();
    expect(fs.pathExistsSync(path.join(OUT_SQRL_DIR, 'HelloWix-1.3.0-full.nupkg'))).ok();
    expect(fs.pathExistsSync(path.join(OUT_SQRL_DIR, 'HelloWix-1.3.0-delta.nupkg'))).ok();
    expect(fs.pathExistsSync(path.join(OUT_SQRL_DIR, 'Setup.exe'))).ok();
  });

  const installConfigs = [
    { userGroup: undefined, effectiveUserGroup: 'Users' },
    { userGroup: 'Guests', effectiveUserGroup: 'Guests' },
  ];

  installConfigs.forEach((config) => {
    describe(`install config (userGroup: ${config.effectiveUserGroup})`, () => {
      it(`installs`, async () => {
        await install(msiPath, 3, config.userGroup);
        const version = getWindowsCompliantVersion(msiOptions.version);
        expect(await checkInstall(msiOptions.name, version)).ok();
      });

      it('auto-updates', async () => {
        const server = serveSquirrel(OUT_SQRL_DIR);
        await autoUpdate(msiPaths123beta.updateExe, server);
        stopServingSquirrel();
      });

      it('has all files in program files', () => {
        expect(fs.pathExistsSync(msiPaths123beta.stubExe)).ok();
        expect(fs.pathExistsSync(squirrelPaths130.appFolder)).ok();
        expectSameFolderContent(HARNESS_APP_DIR, squirrelPaths130.appFolder);
      });

      it(`has access rights`, async () => {
        const x = await hasAccessRights(squirrelPaths130.appRootFolder, config.effectiveUserGroup);
        expect(x).ok();
      });

      it('has called MsiSquirrel self-update', () => {
        const selfUpdateLog = path.join(squirrelPaths130.appFolder, 'SquirrelSetup.log');
        expect(fs.pathExistsSync(selfUpdateLog)).ok();
        const logContent = fs.readFileSync(selfUpdateLog, 'utf-8');
        expect(logContent.includes('--updateSelf')).ok();
      });

      it('has shortcuts', () => {
        expect(fs.pathExistsSync(msiPaths123beta.startMenuShortcut)).ok();
        expect(fs.pathExistsSync(msiPaths123beta.desktopShortcut)).ok();
      });

      const entryPoints = [
        { name: 'stubExe', path: msiPaths123beta.stubExe },
        { name: 'start menu shortcut', path: msiPaths123beta.startMenuShortcut },
        { name: 'desktop shortcut', path: msiPaths123beta.desktopShortcut },
      ];

      entryPoints.forEach(async (entryPoint) => {
        it(`runs the correct binary via ${entryPoint.name}`, async () => {
          await launch(msiPaths123beta.startMenuShortcut);
          expect(await runs(msiOptions.exe)).ok();
          expect(await getProcessPath(msiOptions.exe)).to.be(squirrelPaths130.appExe);
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
  });
});
