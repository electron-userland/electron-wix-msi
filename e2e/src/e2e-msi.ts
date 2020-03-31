import expect from 'expect.js';
import * as fs from 'fs-extra';
import path from 'path';

import { getWindowsCompliantVersion } from '../../lib/utils/version-util';
import { expectSameFolderContent } from './common';
import { getProcessPath, kill, launch, runs } from './utils/app-process';
import { checkInstall, getInstallPaths, install, uninstall, uninstallViaPowershell } from './utils/installer';
import { readAppUserModelId } from './utils/lnk-inspector';
import { createMsiPackage, defaultMsiOptions, HARNESS_APP_DIR, OUT_DIR } from './utils/msi-packager';

const msiPath = path.join(OUT_DIR, 'HelloWix.msi');

interface TestConfig {
  arch: 'x86' | 'x64';
  shortcutFolderName?: string;
  shortcutName?: string;
  appUserModelId?: string;
}

describe('Electron WIX MSI', () => {
  before(async () => {
    if (await checkInstall(defaultMsiOptions.name)) {
      await uninstallViaPowershell(defaultMsiOptions.name);
    }
  });

  const tests: TestConfig[] = [
    {arch: 'x86'},
    {arch: 'x86', shortcutFolderName: 'SuperWix', shortcutName: 'SuperHello', appUserModelId: 'com.wix.super.hello'},
    {arch: 'x64'},
  ];

  tests.forEach((test) => {
    const options = {
      ...defaultMsiOptions,
      ...test
    };

    const paths = getInstallPaths(options);

    const getTestConfigString = () => {
      let configString = test.arch || 'arch:undefined';
      if (test.shortcutFolderName || test.shortcutName) {
        configString += '|shortcut:';
        configString += test.shortcutFolderName || '';
        configString += test.shortcutFolderName ? '\\' : '';
        configString += test.shortcutName || '';
      }
      configString +=  test.appUserModelId ? `|aumid:${test.appUserModelId}` : '';

      return `(${configString})`;
    };

    describe(`Packaging ${getTestConfigString()}`, () =>  {
        it('creates a package', async () => {
          await createMsiPackage(options);
          expect(fs.pathExistsSync(msiPath)).to.be(true);
        });
    });

    describe(`Installing ${getTestConfigString()}`, () =>  {
      before(async () => {
        await kill(options.exe);
      });
      after(async () => {
        await kill(options.exe);
      });

      it('installs', async () => {
        await install(msiPath);
        const version = getWindowsCompliantVersion(options.version);
        expect(await checkInstall(options.name, version)).ok();
      });

      it('has all files in program files', () => {
        expect(fs.pathExistsSync(paths.stubExe)).ok();
        expectSameFolderContent(HARNESS_APP_DIR, paths.appFolder);
      });

      it('has shortcuts', () => {
        expect(fs.pathExistsSync(paths.startMenuShortcut)).ok();
        expect(fs.pathExistsSync(paths.desktopShortcut)).ok();
      });

      it('has AppUserModelId', async () => {
        const aumid = await readAppUserModelId(paths.startMenuShortcut);
        expect(aumid).to.be(paths.appUserModelId);
      });

      const entryPoints = [
        { name: 'stubExe', path: paths.stubExe },
        { name: 'start menu shortcut', path: paths.startMenuShortcut },
        { name: 'desktop shortcut', path: paths.desktopShortcut },
      ];

      entryPoints.forEach((entryPoint) => {
        it(`runs the correct binary via ${entryPoint.name}`, async () => {
          await launch(paths.startMenuShortcut);
          expect(await runs(options.exe)).ok();
          expect(await getProcessPath(options.exe)).to.be(paths.appExe);
          await kill(options.exe);
         });
      });
    });

    const options124 = {
      ...options,
      version: '1.2.4'
    };
    const paths124 = getInstallPaths(options124);

    describe(`Updating ${getTestConfigString()}`, () =>  {
      before(async () => {
        await kill(options.exe);
      });
      after(async () => {
        await kill(options.exe);
      });

      it('updates', async () => {
        await createMsiPackage(options124);
        await install(msiPath);
        const version = getWindowsCompliantVersion(options124.version);
        expect(await checkInstall(options124.name, version)).ok();
      });

      it('has all files in program files', () => {
        expect(fs.pathExistsSync(paths124.stubExe)).ok();
        expectSameFolderContent(HARNESS_APP_DIR, paths124.appFolder);
      });

      it('has shortcuts', () => {
        expect(fs.pathExistsSync(paths124.startMenuShortcut)).ok();
        expect(fs.pathExistsSync(paths124.desktopShortcut)).ok();
      });

      const entryPoints = [
        { name: 'stubExe', path: paths124.stubExe },
        { name: 'start menu shortcut', path: paths124.startMenuShortcut },
        { name: 'desktop shortcut', path: paths124.desktopShortcut },
      ];

      entryPoints.forEach((entryPoint) => {
        it(`runs the correct binary via ${entryPoint.name}`, async () => {
          await launch(paths124.startMenuShortcut);
          expect(await runs(options.exe)).ok();
          expect(await getProcessPath(options.exe)).to.be(paths124.appExe);
          await kill(options.exe);
         });
      });
    });

    describe(`Uninstalling ${getTestConfigString()}`, () =>  {
      it('uninstalls', async () => {
        await uninstall(msiPath);
        expect(await checkInstall(options.name)).not.ok();
        expect(fs.pathExistsSync(paths124.appRootFolder)).not.ok();
        expect(fs.pathExistsSync(paths124.startMenuShortcut)).not.ok();
        expect(fs.pathExistsSync(paths124.desktopShortcut)).not.ok();
      });
    });
  });
});
