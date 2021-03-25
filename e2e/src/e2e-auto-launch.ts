import expect from 'expect.js';
import * as fs from 'fs-extra';
import path from 'path';

import { getWindowsCompliantVersion } from '../../lib/utils/version-util';
import { expectSameFolderContent } from './common';
import { getProcessPath, kill, launch, runs } from './utils/app-process';
import { checkInstall, getInstallPaths, install, uninstall, uninstallViaPowershell } from './utils/installer';
import { createMsiPackage, defaultMsiOptions, HARNESS_APP_DIR, OUT_DIR } from './utils/msi-packager';
import { getRegistryKeyValue } from './utils/registry';
import { sleep } from './utils/util';

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
    if (await checkInstall(`${defaultMsiOptions.name} (Machine - MSI)`)) {
      await uninstallViaPowershell(`${defaultMsiOptions.name} (Machine - MSI)`);
    }
    fs.rmdirSync(getInstallPaths({ ...defaultMsiOptions, arch: 'x86'}).appRootFolder, { recursive: true });
    fs.rmdirSync(getInstallPaths({ ...defaultMsiOptions, arch: 'x86'}, 'perUser').appRootFolder, { recursive: true });
    fs.rmdirSync(getInstallPaths({ ...defaultMsiOptions, arch: 'x64'}).appRootFolder, { recursive: true });
  });

  const testConfigs = [
    { label: 'x86', config: { arch: 'x86', features: { autoUpdate: false, autoLaunch: true }}},
    { label: 'x64', config: { arch: 'x64', features: { autoUpdate: false, autoLaunch: true }}},
    { label: 'x64 with launch args', config: { arch: 'x64', features: {
      autoUpdate: false,
      autoLaunch: {
        enabled: true,
        arguments: ['-arg1', '-arg2']
      }
    }}},
  ];

  testConfigs.forEach((test) => {
    describe((`arch:${test.label}`), () => {
      const msiOptions = {
        ...autoLaunchMsiOptions,
        ...test.config
      };
      const msiPaths123beta = getInstallPaths(msiOptions as any);

      const entryPoints = [
        { name: 'stubExe', path: msiPaths123beta.stubExe },
        { name: 'start menu shortcut', path: msiPaths123beta.startMenuShortcut },
        { name: 'desktop shortcut', path: msiPaths123beta.desktopShortcut },
        { name: 'auto-launch key', path: autoLaunchRegistryKeyValue },
      ];

      it(`packages (${test.label})`, async () => {
        await createMsiPackage(msiOptions as any);
      });

      it(`installs (${test.label})`, async () => {
        await install(msiPath, 2);
        const version = getWindowsCompliantVersion(msiOptions.version);
        expect(await checkInstall(`${msiOptions.name} (Machine)`, msiOptions.version)).ok();
        expect(await checkInstall(`${msiOptions.name} (Machine - MSI)`, version)).ok();
      });

      it(`has all files in program files (${test.label})`, () => {
        expect(fs.pathExistsSync(msiPaths123beta.stubExe)).ok();
        expect(fs.pathExistsSync(msiPaths123beta.appFolder)).ok();
        expectSameFolderContent(HARNESS_APP_DIR, msiPaths123beta.appFolder);
      });

      it(`has shortcuts (${test.label})`, () => {
        expect(fs.pathExistsSync(msiPaths123beta.startMenuShortcut)).ok();
        expect(fs.pathExistsSync(msiPaths123beta.desktopShortcut)).ok();
      });

      it(`has auto-launch registry key (${test.label})`, async () => {
        autoLaunchRegistryKeyValue = await getRegistryKeyValue(msiPaths123beta.registryRunKey,
          msiPaths123beta.appUserModelId);
        entryPoints[3].path = autoLaunchRegistryKeyValue;
        let args = '';
        if (typeof test.config.features.autoLaunch === 'object'
          && test.config.features.autoLaunch !== null) {
          args = test.config.features.autoLaunch.arguments ?
          ` ${test.config.features.autoLaunch.arguments.join(' ')}` : '';
        }
        expect(autoLaunchRegistryKeyValue).to.be(`"${msiPaths123beta.stubExe}"${args}`);
      });

      entryPoints.forEach(async (entryPoint) => {
        it(`runs the correct binary via ${entryPoint.name}`, async () => {
          await launch(entryPoint.path);
          expect(await runs(msiOptions.exe)).ok();
          await sleep(1000);
          expect(await getProcessPath(msiOptions.exe)).to.be(msiPaths123beta.appExe);
          await kill(msiOptions.exe);
        });
      });

      it(`uninstalls (${test.label})`, async () => {
        await uninstall(msiPath);
        expect(await checkInstall(`${msiOptions.name} (Machine)`)).not.ok();
        expect(await checkInstall(`${msiOptions.name} (Machine - MSI)`)).not.ok();
        expect(fs.pathExistsSync(msiPaths123beta.appRootFolder)).not.ok();
        expect(fs.pathExistsSync(msiPaths123beta.startMenuShortcut)).not.ok();
        expect(fs.pathExistsSync(msiPaths123beta.desktopShortcut)).not.ok();
      });
    });
  });
});
