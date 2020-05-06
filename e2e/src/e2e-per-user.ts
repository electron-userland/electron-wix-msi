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
  defaultInstallMode: 'perUser' | 'perMachine';
}

interface InstallConfig {
  installMode?: 'perUser' | 'perMachine';
  effectiveMode: 'perUser' | 'perMachine';
}

const msiPath = path.join(OUT_DIR, 'HelloWix.msi');
const autoLaunchMsiOptions = {
  ...defaultMsiOptions,
  features: {
    autoUpdate: false,
    autoLaunch: true
  }
};

describe('MSI perUser install', () => {
  before(async () => {
    if (await checkInstall(`${defaultMsiOptions.name} (Machine - MSI)`)) {
      await uninstallViaPowershell(`${defaultMsiOptions.name} (Machine - MSI)`);
    }
    fs.rmdirSync(getInstallPaths({ ...defaultMsiOptions, arch: 'x86'}).appRootFolder, { recursive: true });
    fs.rmdirSync(getInstallPaths({ ...defaultMsiOptions, arch: 'x86'}, 'perUser').appRootFolder, { recursive: true });
    fs.rmdirSync(getInstallPaths({ ...defaultMsiOptions, arch: 'x64'}).appRootFolder, { recursive: true });
  });

  const testConfigs: TestConfig[] = [
    {arch: 'x86', defaultInstallMode: 'perUser'},
    {arch: 'x86', defaultInstallMode: 'perMachine'},
    {arch: 'x64', defaultInstallMode: 'perUser'},
    {arch: 'x64', defaultInstallMode: 'perMachine'},
  ];

  testConfigs.forEach((testConfig) => {
    describe((`arch:${testConfig.arch}, defaultInstallMode:${testConfig.defaultInstallMode}`), () => {
      const msiOptions = {
        ...autoLaunchMsiOptions,
        ...testConfig
      };

      it(`packages (${testConfig.arch})`, async () => {
        await createMsiPackage(msiOptions);
      });

      const installConfigs: InstallConfig[] = [
        { installMode: undefined, effectiveMode: testConfig.defaultInstallMode },
        { installMode: 'perUser', effectiveMode: 'perUser' },
        { installMode: 'perMachine', effectiveMode: 'perMachine' },
      ];

      installConfigs.forEach((installConfig) => {
        describe((`installMode:${installConfig.installMode !== undefined ?
          installConfig.installMode : 'default' }`), () => {
          after(() => {
            // even if we failed, we still wanna leave behind a clean state for the next test
            fs.rmdirSync(msiPaths123beta.appRootFolder, { recursive: true });
          });
          let autoLaunchRegistryKeyValue = '';
          const msiPaths123beta = getInstallPaths(msiOptions, installConfig.effectiveMode);

          it(`installs (${testConfig.arch})`, async () => {
            await install(msiPath, 2, undefined, installConfig.installMode);
            const version = getWindowsCompliantVersion(msiOptions.version);
            const nameSuffix = installConfig.effectiveMode  === 'perUser' ? 'User' : 'Machine';
            expect(await checkInstall(`${msiOptions.name} (${nameSuffix})`, msiOptions.version)).ok();
            expect(await checkInstall(`${msiOptions.name} (${nameSuffix} - MSI)`, version)).ok();
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
            entryPoints[3].path = autoLaunchRegistryKeyValue;
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
  });
});
