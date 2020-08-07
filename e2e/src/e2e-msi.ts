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
    if (await checkInstall(`${defaultMsiOptions.name} (Machine - MSI)`)) {
      await uninstallViaPowershell(`${defaultMsiOptions.name} (Machine - MSI)`);
    }
    fs.rmdirSync(getInstallPaths({ ...defaultMsiOptions, arch: 'x86'}).appRootFolder, { recursive: true });
    fs.rmdirSync(getInstallPaths({ ...defaultMsiOptions, arch: 'x86'}, 'perUser').appRootFolder, { recursive: true });
    fs.rmdirSync(getInstallPaths({ ...defaultMsiOptions, arch: 'x64'}).appRootFolder, { recursive: true });
  });

  const tests: TestConfig[] = [
    {arch: 'x86'},
    {arch: 'x86', shortcutFolderName: 'SuperWix', shortcutName: 'SuperHello', appUserModelId: 'com.wix.super.hello'},
    {arch: 'x64'},
  ];

  tests.forEach((test) => {
    const msiOptions = {
      ...defaultMsiOptions,
      ...test
    };

    const paths = getInstallPaths(msiOptions);

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
          await createMsiPackage(msiOptions);
          expect(fs.pathExistsSync(msiPath)).to.be(true);
        });
    });

    describe(`Installing ${getTestConfigString()}`, () =>  {
      before(async () => {
        await kill(msiOptions.exe);
      });
      after(async () => {
        await kill(msiOptions.exe);
      });

      it('installs', async () => {
        await install(msiPath);
        const version = getWindowsCompliantVersion(msiOptions.version);
        expect(await checkInstall(`${msiOptions.name} (Machine)`, msiOptions.version)).ok();
        expect(await checkInstall(`${msiOptions.name} (Machine - MSI)`, version)).ok();
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
          await launch(entryPoint.path);
          expect(await runs(msiOptions.exe)).ok();
          expect(await getProcessPath(msiOptions.exe)).to.be(paths.appExe);
          await kill(msiOptions.exe);
         });
      });
    });

    const options124 = {
      ...msiOptions,
      version: '1.2.4'
    };
    const paths124 = getInstallPaths(options124);

    describe(`Updating ${getTestConfigString()}`, () =>  {
      before(async () => {
        await kill(msiOptions.exe);
      });
      after(async () => {
        await kill(msiOptions.exe);
      });

      it('updates', async () => {
        await createMsiPackage(options124);
        await install(msiPath);
        const version = getWindowsCompliantVersion(options124.version);
        expect(await checkInstall(`${options124.name} (Machine)`, options124.version)).ok();
        expect(await checkInstall(`${options124.name} (Machine - MSI)`, version)).ok();
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
          await launch(entryPoint.path);
          expect(await runs(msiOptions.exe)).ok();
          expect(await getProcessPath(msiOptions.exe)).to.be(paths124.appExe);
          await kill(msiOptions.exe);
         });
      });
    });

    describe(`Uninstalling ${getTestConfigString()}`, () =>  {
      it('uninstalls', async () => {
        await uninstall(msiPath);
        expect(await checkInstall(`${msiOptions.name} (Machine)`)).not.ok();
        expect(await checkInstall(`${msiOptions.name} (Machine - MSI)`)).not.ok();
        expect(fs.pathExistsSync(paths124.appRootFolder)).not.ok();
        expect(fs.pathExistsSync(paths124.startMenuShortcut)).not.ok();
        expect(fs.pathExistsSync(paths124.desktopShortcut)).not.ok();
      });
    });
  });
});
