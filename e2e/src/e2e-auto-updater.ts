import expect from 'expect.js';
import * as fs from 'fs-extra';
import path from 'path';

import { getWindowsCompliantVersion } from '../../lib/utils/version-util';
import { expectSameFolderContent } from './common';
import { getProcessPath, kill, launch, runs } from './utils/app-process';
import { autoUpdate, checkInstall, getInstallPaths, install, uninstall, uninstallViaPowershell } from './utils/installer';
import { createMsiPackage, defaultMsiOptions, HARNESS_APP_DIR, OUT_DIR } from './utils/msi-packager';
import { hasAccessRights } from './utils/ntfs';
import { getRegistryKeyValue } from './utils/registry';
import { cleanSquirrelOutDir, createSquirrelPackage, defaultSquirrelOptions, OUT_SQRL_DIR } from './utils/squirrel-packager';
import { serveSquirrel, stopServingSquirrel } from './utils/squirrel-server';

interface TestConfig {
  arch: 'x86' | 'x64';
}

const msiPath = path.join(OUT_DIR, 'HelloWix.msi');

const autoUpdateMsiOptions = {
  ...defaultMsiOptions,
  features: {
    autoUpdate: true,
    autoLaunch: false
  }
};
const squirrelOptions130 = {
  ...defaultSquirrelOptions,
  version: '1.3.0',
};

describe('MSI auto-updating', () => {
  before(async () => {
    if (await checkInstall(`${defaultMsiOptions.name} (Machine - MSI)`)) {
      await uninstallViaPowershell(`${defaultMsiOptions.name} (Machine - MSI)`);
    }
    fs.rmdirSync(getInstallPaths({ ...defaultMsiOptions, arch: 'x86'}).appRootFolder, { recursive: true });
    fs.rmdirSync(getInstallPaths({ ...defaultMsiOptions, arch: 'x86'}, 'perUser').appRootFolder, { recursive: true });
    fs.rmdirSync(getInstallPaths({ ...defaultMsiOptions, arch: 'x64'}).appRootFolder, { recursive: true });
  });

  const testConfigs: TestConfig[] = [
    {arch: 'x86'},
    {arch: 'x64'},
  ];

  testConfigs.forEach((testConfig) => {
    describe((`arch:${testConfig.arch}`), () => {
      const msiOptions = {
        ...autoUpdateMsiOptions,
        ...testConfig
      };

      const squirrelOptions130Config = {
        ...squirrelOptions130,
        ...testConfig
      };

      const msiPaths123beta = getInstallPaths(msiOptions);
      const squirrelPaths130 = getInstallPaths(squirrelOptions130Config);

      it(`packages (${testConfig.arch})`, async () => {
        await createMsiPackage(msiOptions);
        cleanSquirrelOutDir();
        await createSquirrelPackage(defaultSquirrelOptions);
        await createSquirrelPackage(squirrelOptions130Config);
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
        describe((`userGroup:${config.effectiveUserGroup}`), () => {
          after(() => {
            // even if we failed, we still wanna leave behind a clean state for the next test
            fs.rmdirSync(msiPaths123beta.appRootFolder, { recursive: true });
          });

          it(`installs (userGroup: ${config.effectiveUserGroup})`, async () => {
            await install(msiPath, 3, config.userGroup);
            const version = getWindowsCompliantVersion(msiOptions.version);
            expect(await checkInstall(`${msiOptions.name} (Machine)`, msiOptions.version)).ok();
            expect(await checkInstall(`${msiOptions.name} (Machine - MSI)`, version)).ok();
          });

          it(`auto-updates (userGroup: ${config.effectiveUserGroup})`, async () => {
            const server = serveSquirrel(OUT_SQRL_DIR);
            await autoUpdate(msiPaths123beta.updateExe, server);
            stopServingSquirrel();
            expect(await checkInstall(`${msiOptions.name} (Machine)`, squirrelOptions130Config.version)).ok();
          });

          it(`has all files in program files (userGroup: ${config.effectiveUserGroup})`, () => {
            expect(fs.pathExistsSync(msiPaths123beta.stubExe)).ok();
            expect(fs.pathExistsSync(squirrelPaths130.appFolder)).ok();
            expectSameFolderContent(HARNESS_APP_DIR, squirrelPaths130.appFolder);
          });

          it(`has access rights (userGroup: ${config.effectiveUserGroup})`, async () => {
            const x = await hasAccessRights(squirrelPaths130.appRootFolder, config.effectiveUserGroup);
            expect(x).ok();
          });

          const regValues = [
            {name: 'DisplayName', value: `${msiOptions.name} (Machine)`},
            {name: 'DisplayVersion', value: squirrelOptions130Config.version},
            {name: 'InstallPath', value: `${msiPaths123beta.appRootFolder}\\`},
            {name: 'Publisher', value: msiOptions.manufacturer},
          ];
          regValues.forEach(async (value) => {
            it(`has uninstall registry key has value: ${value.name} (${testConfig.arch})`, async () => {
              const installInfo = fs.readJSONSync(path.join(msiPaths123beta.appRootFolder, '.installInfo.json'));
              const regKey = `${msiPaths123beta.registryUninstallKey}\\{${installInfo.productCode}}.msiSquirrel`;
              const regValue = await getRegistryKeyValue(regKey, value.name);
              expect(regValue).to.be(value.value);
            });
          });

          it(`has called msq self-update (userGroup: ${config.effectiveUserGroup})`, () => {
            const selfUpdateLog = path.join(squirrelPaths130.appFolder, 'Squirrel-UpdateSelf.log');
            expect(fs.pathExistsSync(selfUpdateLog)).ok();
            const logContent = fs.readFileSync(selfUpdateLog, 'utf-8');
            expect(logContent.includes('--updateSelf')).ok();
          });

          it(`has shortcuts (userGroup: ${config.effectiveUserGroup})`, () => {
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
              await launch(entryPoint.path);
              expect(await runs(msiOptions.exe)).ok();
              expect(await getProcessPath(msiOptions.exe)).to.be(squirrelPaths130.appExe);
              await kill(msiOptions.exe);
            });
          });

          it(`uninstalls (userGroup: ${config.effectiveUserGroup})`, async () => {
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
