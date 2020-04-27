import expect from 'expect.js';
import * as fs from 'fs-extra';
import path from 'path';

import { getWindowsCompliantVersion } from '../../lib/utils/version-util';
import { expectSameFolderContent } from './common';
import { getProcessPath, kill, launch, runs } from './utils/app-process';
import { checkInstall, getInstallPaths, install, uninstall, uninstallViaPowershell } from './utils/installer';
import { createMsiPackage, defaultMsiOptions, HARNESS_APP_DIR, OUT_DIR } from './utils/msi-packager';
import { getRegistryKeyValue } from './utils/registry';

interface TestConfig {
  arch: 'x86' | 'x64';
}

const msiPath = path.join(OUT_DIR, 'HelloWix.msi');
const autoLaunchMsiOptions = {
  ...defaultMsiOptions,
  features: {
    autoUpdate: false,
    autoLaunch: true
  }
};

let autoLaunchRegistryKeyValue = '';

describe('MSI auto-launch', () => {
  before(async () => {
    if (await checkInstall(defaultMsiOptions.name)) {
      await uninstallViaPowershell(defaultMsiOptions.name);
    }
  });

  const testConfigs: TestConfig[] = [
    {arch: 'x86'},
    {arch: 'x64'},
  ];

  testConfigs.forEach((testConfig) => {
    describe((`arch:${testConfig.arch}`), () => {
      after(() => {
        // even if we failed, we still wanna leave behind a clean state for the next test
        fs.rmdirSync(msiPaths123beta.appRootFolder, { recursive: true });
      });

      const msiOptions = {
        ...autoLaunchMsiOptions,
        ...testConfig
      };
      const msiPaths123beta = getInstallPaths(msiOptions);

      it(`packages (${testConfig.arch})`, async () => {
        await createMsiPackage(msiOptions);
      });

      it(`installs (${testConfig.arch})`, async () => {
        await install(msiPath, 2);
        const version = getWindowsCompliantVersion(msiOptions.version);
        expect(await checkInstall(msiOptions.name, version)).ok();
      });

      it(`has all files in program files (${testConfig.arch})`, () => {
        expect(fs.pathExistsSync(msiPaths123beta.stubExe)).ok();
        expect(fs.pathExistsSync(msiPaths123beta.appFolder)).ok();
        expectSameFolderContent(HARNESS_APP_DIR, msiPaths123beta.appFolder);
      });

      it(`has shortcuts (${testConfig.arch})`, () => {
        expect(fs.pathExistsSync(msiPaths123beta.startMenuShortcut)).ok();
        expect(fs.pathExistsSync(msiPaths123beta.desktopShortcut)).ok();
      });

      it(`has auto-launch registry key (${testConfig.arch})`, async () => {
        autoLaunchRegistryKeyValue = await getRegistryKeyValue(msiPaths123beta.registryRunKey,
          msiPaths123beta.appUserModelId);
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
          await launch(entryPoint.path);
          expect(await runs(msiOptions.exe)).ok();
          expect(await getProcessPath(msiOptions.exe)).to.be(msiPaths123beta.appExe);
          await kill(msiOptions.exe);
        });
      });

      it(`uninstalls (${testConfig.arch})`, async () => {
        await uninstall(msiPath);
        expect(await checkInstall(msiOptions.name)).not.ok();
        expect(fs.pathExistsSync(msiPaths123beta.appRootFolder)).not.ok();
        expect(fs.pathExistsSync(msiPaths123beta.startMenuShortcut)).not.ok();
        expect(fs.pathExistsSync(msiPaths123beta.desktopShortcut)).not.ok();
      });
    });
  });
});
