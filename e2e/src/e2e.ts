import expect from 'expect.js';
import * as fs from 'fs-extra';
import hasha from 'hasha';
import path from 'path';

import { getWindowsCompliantVersion } from '../../lib/utils/version-util';
import { checkInstall, getInstallPaths, install, uninstall, uninstallViaPowershell } from './utils/installer';
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
}

describe('Electron WIX MSI', () => {
  before(async () => {
    if (await checkInstall(defaultOptions.name)) {
      await uninstallViaPowershell(defaultOptions.name);
    }
  });

  const tests: TestConfig[] = [
    {arch: 'x86'},
    {arch: 'x86', shortcutFolderName: 'SuperWix', shortcutName: 'SuperHello'},
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
      return configString;
    };

    describe(`Packaging ${getTestConfigString()}`, () =>  {
        it('creates a package', async () => {
          await packageSampleApp(options);
          expect(fs.pathExistsSync(msiPath)).to.be(true);
        });
    });

    describe(`Installing ${getTestConfigString()}`, () =>  {
      it('installs', async () => {
        await install(msiPath);
        const version = getWindowsCompliantVersion(options.version);
        expect(await checkInstall(options.name, version)).ok();
      });

      it('has all files in program files', () => {
        const paths = getInstallPaths(options);
        console.log(paths);
        expect(fs.pathExistsSync(paths.stubExe)).ok();
        expectSameFolderContent(HARNESS_APP_DIR, paths.appFolder);
      });

      it('has shortcuts', () => {
        const paths = getInstallPaths(options);
        expect(fs.pathExistsSync(paths.startMenuShortcut)).ok();
        expect(fs.pathExistsSync(paths.desktopShortcut)).ok();
      });
    });

    describe(`Updating ${getTestConfigString()}`, () =>  {
      const options124 = {
        ...options,
        version: '1.2.4'
      };

      it('updates', async () => {
        await packageSampleApp(options124);
        await install(msiPath);
        const version = getWindowsCompliantVersion(options124.version);
        expect(await checkInstall(options124.name, version)).ok();
      });

      it('has all files in program files', () => {
        const paths = getInstallPaths(options124);
        expect(fs.pathExistsSync(paths.stubExe)).ok();
        expectSameFolderContent(HARNESS_APP_DIR, paths.appFolder);
      });

      it('has shortcuts', () => {
        const paths = getInstallPaths(options124);
        expect(fs.pathExistsSync(paths.startMenuShortcut)).ok();
        expect(fs.pathExistsSync(paths.desktopShortcut)).ok();
      });
    });

    describe(`Uninstalling ${getTestConfigString()}`, () =>  {
      it('uninstalls', async () => {
        await uninstall(msiPath);
        expect(await checkInstall(options.name)).not.ok();
      });
    });
  });
});
