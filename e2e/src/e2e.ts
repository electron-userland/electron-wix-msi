import expect from 'expect.js';
import * as fs from 'fs-extra';
import hasha from 'hasha';
import path from 'path';

import { getWindowsCompliantVersion } from '../../lib/utils/version-util';
import { getProcessPath, kill, launch, runs } from './utils/app-process';
import { checkInstall, getInstallPaths, install, uninstall, uninstallViaPowershell } from './utils/installer';
import { readAppUserModelId } from './utils/lnk-inspector';
import { defaultOptions, HARNESS_APP_DIR, OUT_DIR, packageSampleApp } from './utils/packager';

const msiPath = path.join(OUT_DIR, 'HelloWix.msi');

const expectSameFolderContent = async (folderA: string, folderB: string) => {
  const folderContent =  await fs.readdir(folderA);

  folderContent.forEach(async (item) => {
    const itemPathA = path.join(folderA, item);
    const itemPathB = path.join(folderB, item);
    expect(fs.pathExistsSync(itemPathB)).ok();
    if (fs.lstatSync(itemPathA).isDirectory()) {
      await expectSameFolderContent(itemPathA, itemPathB);
    } else {
      const hashA = await hasha.fromFile(itemPathA);
      const hashB = await hasha.fromFile(itemPathB);
      expect(hashA).to.be(hashB);
    }
  });
};

interface TestConfig {
  arch: 'x86' | 'x64';
  shortcutFolderName?: string;
  shortcutName?: string;
  appUserModelId?: string;
}

describe('Electron WIX MSI', () => {
  before(async () => {
    if (await checkInstall(defaultOptions.name)) {
      await uninstallViaPowershell(defaultOptions.name);
    }
  });

  const tests: TestConfig[] = [
    {arch: 'x86'},
    {arch: 'x86', shortcutFolderName: 'SuperWix', shortcutName: 'SuperHello', appUserModelId: 'com.wix.super.hello'},
    {arch: 'x64'},
  ];

  tests.forEach((test) => {
    const options = {
      ...defaultOptions,
      ...test
    };

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
          await packageSampleApp(options);
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

      const paths = getInstallPaths(options);

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
    describe(`Updating ${getTestConfigString()}`, () =>  {
      before(async () => {
        await kill(options.exe);
      });
      after(async () => {
        await kill(options.exe);
      });

      const paths = getInstallPaths(options124);

      it('updates', async () => {
        await packageSampleApp(options124);
        await install(msiPath);
        const version = getWindowsCompliantVersion(options124.version);
        expect(await checkInstall(options124.name, version)).ok();
      });

      it('has all files in program files', () => {
        expect(fs.pathExistsSync(paths.stubExe)).ok();
        expectSameFolderContent(HARNESS_APP_DIR, paths.appFolder);
      });

      it('has shortcuts', () => {
        expect(fs.pathExistsSync(paths.startMenuShortcut)).ok();
        expect(fs.pathExistsSync(paths.desktopShortcut)).ok();
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

    describe(`Uninstalling ${getTestConfigString()}`, () =>  {
      it('uninstalls', async () => {
        const paths = getInstallPaths(options124);

        await uninstall(msiPath);
        expect(await checkInstall(options.name)).not.ok();
        expect(fs.pathExistsSync(paths.appRootFolder)).not.ok();
        expect(fs.pathExistsSync(paths.startMenuShortcut)).not.ok();
        expect(fs.pathExistsSync(paths.desktopShortcut)).not.ok();
      });
    });
  });
});
