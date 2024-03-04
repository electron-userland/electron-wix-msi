import { SpawnOptions } from 'child_process';
import * as fs from 'fs-extra';
import * as mockFs from 'mock-fs';
import * as os from 'os';
import * as path from 'path';

jest.mock('../src/utils/rc-edit', () => ({
  createStubExe: jest.fn()
}));

import { MSICreator, UIOptions } from '../src/creator';
import { createStubExe } from '../src/utils/rc-edit';
import { getMockFileSystem, numberOfFiles, root } from './mocks/mock-fs';
import { MockSpawn } from './mocks/mock-spawn';
import { sign } from '@electron/windows-sign';

const mockPassedFs = fs;
const mockSpawnArgs = {
  name: '',
  args: [],
  options: {}
};

describe.skip('creator', () => {
  beforeAll(() => {
    // console.log call needed as workaround to make jest work with mock-fs
    console.log('');
    // Load into cache
    require('callsites');
  
    (createStubExe as jest.Mock).mockReturnValue('C:\\Stub.exe');
  
    jest.mock('child_process', () => ({
      execSync(name: string) {
        if (name === 'node -v') {
          return new Buffer('8.0.0');
        }
  
        if (name === 'light -?' || name === 'candle -?' && mockWixInstalled) {
          return new Buffer(' version 3.11.0.1701');
        }
  
        throw new Error('Command not found');
      },
      spawn(name: string, args: Array<string>, options: SpawnOptions) {
        mockSpawnArgs.name = name;
        mockSpawnArgs.args = args as any;
        mockSpawnArgs.options = options;
        return new MockSpawn(name, args, options, mockPassedFs);
      }
    }));

    jest.mock('@electron/windows-sign', () => ({
      sign: jest.fn()
    }));
  
    mockFs(getMockFileSystem());
  });
  
  afterAll(() => {
    mockFs.restore();
    jest.unmock('child_process');
  });
  
  afterEach(() => {
    mockWixInstalled = true;
    mockSpawnArgs.name = '';
    mockSpawnArgs.args = [];
    mockSpawnArgs.options = {};
  });
  
  const defaultOptions = {
    appDirectory: root,
    description: 'ACME is the best company ever',
    exe: 'acme',
    name: 'Acme',
    manufacturer: 'Acme Technologies',
    version: '1.0.0',
    outputDirectory: path.join(os.tmpdir(), 'electron-wix-msi-test')
  };
  
  const testIncludesBase = (title: string, expectation: boolean , ...content: Array<string>) => {
    return test(`.wxs file includes ${title}`, () => {
      if (Array.isArray(content)) {
        // We want to be able to search across line breaks and multiple spaces.
        const singleLineWxContent = wxsContent.replace(/\s\s+/g, ' ');
        content.forEach((innerContent) => {
          if (expectation) expect(singleLineWxContent).toContain(innerContent);
          else expect(singleLineWxContent).not.toContain(innerContent);
        });
      }
    });
  };
  
  const testIncludes = (title: string, ...content: Array<string>) => {
    return testIncludesBase(title, true,  ...content );
  };
  
  const testIncludesNot = (title: string, ...content: Array<string>) => {
    return testIncludesBase(title, false,  ...content );
  };
  
  
  const regexTestIncludesBase = (title: string, expectation: boolean , ...content: Array<RegExp>) => {
    return test(`.wxs file includes ${title}`, () => {
      if (Array.isArray(content)) {
        // We want to be able to search across line breaks and multiple spaces.
        const singleLineWxContent = wxsContent.replace(/\s\s+/g, ' ');
        content.forEach((innerContent) => {
          expect(innerContent.test(singleLineWxContent)).toBe(expectation);
        });
      }
    });
  };
  
  const regexTestIncludes = (title: string, ...content: Array<RegExp>) => {
    return regexTestIncludesBase(title, true,  ...content );
  };
  
  const regexTestIncludesNot = (title: string, ...content: Array<RegExp>) => {
    return regexTestIncludesBase(title, false,  ...content );
  };
  
  let wxsContent = '';
  let mockWixInstalled = true;
  
  test('MSICreator() can be constructed without errors', () => {
    expect(new MSICreator(defaultOptions)).toBeTruthy();
  });
  
  test('MSICreator create() creates a basic Wix file', async () => {
    const msiCreator = new MSICreator(defaultOptions);
  
    const { wxsFile } = await msiCreator.create();
    wxsContent = await fs.readFile(wxsFile, 'utf-8');
    expect(wxsFile).toBeTruthy();
  });
  
  test('.wxs file has content', () => {
    expect(wxsContent.length).toBeGreaterThan(50);
  });
  
  testIncludes('the root element', '<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi"');
  
  testIncludes('a package element', '<Package');
  
  testIncludes('an APPLICATIONROOTDIRECTORY', '<Directory Id="APPLICATIONROOTDIRECTORY"');
  
  testIncludes('an ApplicationProgramsFolder', '<Directory Id="ApplicationProgramsFolder"');
  
  testIncludes('a default appUserModelId', 'Key="System.AppUserModel.ID" Value="com.squirrel.acme.acme"');
  
  regexTestIncludes('versioned app folder', /<Directory\s*Id=".*"\s*Name="app-1\.0\.0"/);
  
  regexTestIncludes('stubbed exe', /<File\s*Name="acme\.exe"\s*Id=".*"\s*Source="C:\\Stub\.exe"/);
  
  test('.wxs file has as many components as we have files', () => {
    // Files + 2 Shortcuts + 2 special files + 7 registry +  1 purge components
    const count = wxsContent.split('</Component>').length - 1;
    expect(count).toEqual(numberOfFiles + 12);
  });
  
  test('MSICreator create() creates Wix file with UI properties', async () => {
    const ui: UIOptions = {
      images: {
        background: 'resources/background.bmp',
        banner: 'resources/banner.bmp',
        exclamationIcon: 'resources/exclamationIcon.bmp',
        infoIcon: 'resources/infoIcon.bmp',
        newIcon: 'resources/newIcon.bmp',
        upIcon: 'resources/upIcon.bmp'
      }
    };
  
    const msiCreator = new MSICreator({ ...defaultOptions, ui });
  
    const { wxsFile } = await msiCreator.create();
    wxsContent = await fs.readFile(wxsFile, 'utf-8');
    expect(wxsFile).toBeTruthy();
  });
  
  testIncludes('a background definition', 'Id="WixUIDialogBmp" Value="resources/background.bmp" />');
  
  testIncludes('a banner definition', 'Id="WixUIBannerBmp" Value="resources/banner.bmp" />');
  
  testIncludes('a exclamationIcon definition', 'Id="WixUIExclamationIco" Value="resources/exclamationIcon.bmp" />');
  
  testIncludes('a infoIcon definition', 'Id="WixUIInfoIco" Value="resources/infoIcon.bmp" />');
  
  testIncludes('a newIcon definition', 'Id="WixUINewIco" Value="resources/newIcon.bmp" />');
  
  testIncludes('a banupIconner definition', 'Id="WixUIUpIco" Value="resources/upIcon.bmp" />');
  
  test('.wxs file contains as many component refs as components', () => {
    const comoponentCount = wxsContent.split('</Component>').length - 1;
    const refCount = wxsContent.split('<ComponentRef').length - 1;
  
    expect(comoponentCount).toEqual(refCount);
  });
  
  test('MSICreator create() does not throw if properties are weird', async () => {
    const ui: any = {
      images: {
        nope: 'resources/background.bmp'
      }
    };
  
    const msiCreator = new MSICreator({ ...defaultOptions, ui });
  
    const { wxsFile } = await msiCreator.create();
    wxsContent = await fs.readFile(wxsFile, 'utf-8');
    expect(wxsFile).toBeTruthy();
  });
  
  test('MSICreator create() does not throw if UI is just true', async () => {
    const msiCreator = new MSICreator({ ...defaultOptions, ui: true });
  
    const { wxsFile } = await msiCreator.create();
    wxsContent = await fs.readFile(wxsFile, 'utf-8');
    expect(wxsFile).toBeTruthy();
  });
  
  test('MSICreator create() does not throw if UI is just false', async () => {
    const msiCreator = new MSICreator({ ...defaultOptions, ui: true });
  
    const { wxsFile } = await msiCreator.create();
    wxsContent = await fs.readFile(wxsFile, 'utf-8');
    expect(wxsFile).toBeTruthy();
  });
  
  test('MSICreator create() does not throw if UI is just an object', async () => {
    const msiCreator = new MSICreator({ ...defaultOptions, ui: { chooseDirectory: true } });
  
    const { wxsFile } = await msiCreator.create();
    wxsContent = await fs.readFile(wxsFile, 'utf-8');
    expect(wxsFile).toBeTruthy();
  });
  
  test('MSICreator create() sets the appUserModelId', async () => {
    const msiCreator = new MSICreator({ ...defaultOptions, appUserModelId: 'Hi' });
  
    const { wxsFile } = await msiCreator.create();
    expect(wxsFile).toBeTruthy();
    wxsContent = await fs.readFile(wxsFile, 'utf-8');
    expect(wxsContent.includes(`Key="System.AppUserModel.ID" Value="Hi"`)).toBeTruthy();
  });
  
  test('MSICreator compile() throws if candle/light are not installed', async () => {
    mockWixInstalled = false;
    const msiCreator = new MSICreator(defaultOptions);
    expect(msiCreator.compile()).rejects.toEqual(new Error('Could not find light.exe or candle.exe'));
  });
  
  test('MSICreator compile() throws if there is no wxsFile', async () => {
    const msiCreator = new MSICreator(defaultOptions);
    expect(msiCreator.compile()).rejects.toEqual(new Error('wxsFile not found. Did you run create() yet?'));
  });
  
  test('MSICreator compile() creates a wixobj and msi file', async () => {
    const msiCreator = new MSICreator({ ...defaultOptions, ui: false });
    await msiCreator.create();
  
    const { wixobjFile, msiFile } = await msiCreator.compile();
  
    expect(wixobjFile).toBeTruthy();
    expect(fs.existsSync(wixobjFile)).toBeTruthy();
  
    expect(msiFile).toBeTruthy();
    expect(fs.existsSync(msiFile)).toBeTruthy();
  });
  
  test('MSICreator compile() creates a wixobj and msi file with ui extensions', async () => {
    const msiCreator = new MSICreator({ ...defaultOptions, ui: true });
  
    await msiCreator.create();
    await msiCreator.compile();
  
    expect(mockSpawnArgs.args).toContain('WixUIExtension');
  });
  
  test('MSICreator compile() passes cultures args to the binary', async () => {
    const cultures = 'en-US;fr-FR;neutral-cn';
    const msiCreator = new MSICreator({ ...defaultOptions, cultures });
  
    await msiCreator.create();
    await msiCreator.compile();
  
    expect(mockSpawnArgs.args).toContain(`-cultures:${cultures}`);
  });
  
  test('MSICreator compile() passes localizations args to the binary', async () => {
    const localizationFilePath = 'testDirectory/localization.wxl';
    const ui = { localizations: [localizationFilePath] };
    const msiCreator = new MSICreator({ ...defaultOptions, ui });
  
    await msiCreator.create();
    await msiCreator.compile();
  
    expect(mockSpawnArgs.args).toContain("-loc");
    expect(mockSpawnArgs.args).toContain(localizationFilePath);
  });
  
  test('MSICreator compile() passes extension args to the binary', async () => {
    const extensions = ['WixUIExtension', 'WixUtilExtension'];
    const msiCreator = new MSICreator({ ...defaultOptions, extensions });
  
    await msiCreator.create();
    await msiCreator.compile();
  
    extensions.forEach((extension) => {
      expect(mockSpawnArgs.args).toContain(extension);
    });
  });
  
  test('MSICreator compile() passes lightSwitch args to the binary', async () => {
    const lightSwitches = ['-sval', '-cub', 'test.cub'];
    const msiCreator = new MSICreator({ ...defaultOptions, lightSwitches });
  
    await msiCreator.create();
    await msiCreator.compile();
  
    lightSwitches.forEach((comandSwitch) => {
      expect(mockSpawnArgs.args).toContain(comandSwitch);
    });
  });
  
  test('MSICreator compile() combines custom extensions with ui extensions', async () => {
    const extensions = ['WixNetFxExtension', 'WixUtilExtension'];
    const msiCreator = new MSICreator({ ...defaultOptions, extensions, ui: true });
  
    await msiCreator.create();
    await msiCreator.compile();
  
    expect(mockSpawnArgs.args).toContain('WixUIExtension');
    extensions.forEach((extension) => {
      expect(mockSpawnArgs.args).toContain(extension);
    });
  });
  
  test('MSICreator compile() throws if candle or light fail', async () => {
    const msiCreator = new MSICreator({ ...defaultOptions, exe: 'fail-code-candle' });
    const err = 'A bit of error';
    const out = 'A bit of data';
    const expectedErr = new Error(`Could not create wixobj file. Code: 1 StdErr: ${err} StdOut: ${out}`);
  
    await msiCreator.create();
    await expect(msiCreator.compile()).rejects.toEqual(expectedErr);
  });
  
  test('MSICreator compile() throws if candle does not create a file', async () => {
    const msiCreator = new MSICreator({ ...defaultOptions, exe: 'fail-candle' });
    const err = 'A bit of error';
    const out = 'A bit of data';
    const expectedErr = new Error(`Could not create wixobj file. Code: 0 StdErr: ${err} StdOut: ${out}`);
  
    await msiCreator.create();
    await expect(msiCreator.compile()).rejects.toEqual(expectedErr);
  });
  
  test('MSICreator compile() throws if light does not create a file', async () => {
    const msiCreator = new MSICreator({ ...defaultOptions, exe: 'fail-light' });
    const err = 'A bit of error';
    const out = 'A bit of data';
    const expectedErr = new Error(`Could not create msi file. Code: 0 StdErr: ${err} StdOut: ${out}`);
  
    await msiCreator.create();
    await expect(msiCreator.compile()).rejects.toEqual(expectedErr);
  });
  
  test('MSICreator compile() throws if signing throws', async () => {
    const certOptions = {
      windowsSign: {
        signWithParams: 'hello "how are you"'
      }
    };
    const msiCreator = new MSICreator({ ...defaultOptions, exe: 'fail-code-signtool', ...certOptions });
    const expectedError = new Error('Signing failed');
    (sign as any).mockRejectedValue(expectedError);
    
    await msiCreator.create();
    await expect(msiCreator.compile()).rejects.toEqual(expectedError);
  });
  
  test('MSICreator create() creates x86 version by default', async () => {
    const msiCreator = new MSICreator({ ...defaultOptions});
  
    const { wxsFile } = await msiCreator.create();
    wxsContent = await fs.readFile(wxsFile, 'utf-8');
    expect(wxsFile).toBeTruthy();
  });
  testIncludes('32 bit package declaration', 'Platform="x86"');
  testIncludes('32 bit component declarations', 'Win64="no"');
  testIncludes('32 bit file architecture declaration', 'ProcessorArchitecture="x86"');
  
  test('MSICreator create() creates x86 version explicitly', async () => {
    const msiCreator = new MSICreator({ ...defaultOptions, arch: 'x86'});
  
    const { wxsFile } = await msiCreator.create();
    wxsContent = await fs.readFile(wxsFile, 'utf-8');
    expect(wxsFile).toBeTruthy();
  });
  testIncludes('32 bit package declaration', 'Platform="x86"');
  testIncludes('32 bit component declarations', 'Win64="no"');
  testIncludes('32 bit file architecture declaration', 'ProcessorArchitecture="x86"');
  
  test('MSICreator create() creates x64 version', async () => {
    const msiCreator = new MSICreator({ ...defaultOptions, arch: 'x64'});
  
    const { wxsFile } = await msiCreator.create();
    wxsContent = await fs.readFile(wxsFile, 'utf-8');
    expect(wxsFile).toBeTruthy();
  });
  testIncludes('32 bit package declaration', 'Platform="x64"');
  testIncludes('32 bit component declarations', 'Win64="yes"');
  testIncludes('32 bit file architecture declaration', 'ProcessorArchitecture="x64"');
  
  test('MSICreator create() creates ia64 version', async () => {
    const msiCreator = new MSICreator({ ...defaultOptions, arch: 'ia64'});
  
    const { wxsFile } = await msiCreator.create();
    wxsContent = await fs.readFile(wxsFile, 'utf-8');
    expect(wxsFile).toBeTruthy();
  });
  testIncludes('32 bit package declaration', 'Platform="ia64"');
  testIncludes('32 bit component declarations', 'Win64="yes"');
  testIncludes('32 bit file architecture declaration', 'ProcessorArchitecture="ia64"');
  
  test('MSICreator create() shortcut name override', async () => {
    const msiCreator = new MSICreator({ ...defaultOptions, shortcutName: 'BeepBeep'});
  
    const { wxsFile } = await msiCreator.create();
    wxsContent = await fs.readFile(wxsFile, 'utf-8');
    expect(wxsFile).toBeTruthy();
  });
  testIncludes('Custom shortcut name', '<Shortcut Id="ApplicationStartMenuShortcut" Name="BeepBeep"');
  
  testIncludes('Single Package Authoring setting', '<Property Id="ALLUSERS" Secure="yes" Value="2" />');
  testIncludes('correct default perUser setting', '<Property Id="MSIINSTALLPERUSER" Secure="yes" Value="0" />');
  testIncludes('Install path property', '<Property Id="INSTALLPATH">');
  testIncludes('Install RegistrySearch', 'RegistrySearch Key="SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall');
  testIncludes('RegistryInstallPath component',  '<Component Id="RegistryInstallPath"');
  testIncludes('RegistryInstallPath component-ref',  '<ComponentRef Id="RegistryInstallPath" />');
  testIncludes('PurgeOnUninstall component',  '<Component Id="PurgeOnUninstall" ');
  testIncludes('PurgeOnUninstall component-ref',  '<ComponentRef Id="PurgeOnUninstall" />');
  
  testIncludes('RegistryInstallPath component-ref', '<ComponentRef Id="RegistryInstallPath" />');
  testIncludes('UninstallDisplayName component-ref', '<ComponentRef Id="UninstallDisplayName" />');
  testIncludes('UninstallPublisher component-ref', '<ComponentRef Id="UninstallPublisher" />');
  testIncludes('UninstallDisplayVersion component-ref', '<ComponentRef Id="UninstallDisplayVersion" />');
  testIncludes('UninstallModifyString component-ref', '<ComponentRef Id="UninstallModifyString" />');
  testIncludes('UninstallString component-ref', '<ComponentRef Id="UninstallString" />');
  testIncludes('UninstallDisplayIcon component-ref', '<ComponentRef Id="UninstallDisplayIcon" />');
  
  testIncludesNot('RegistryRunKey component', '<Component Id="RegistryRunKey"');
  testIncludesNot('RegistryRunKey component-ref', '<ComponentRef Id="RegistryRunKey" />');
  regexTestIncludesNot('AutoLaunch feature', /<Feature Id="AutoLaunch" Title="Launch On Login" Level="2" .*>/);
  regexTestIncludesNot('AutoUpdate feature', /<Feature Id="AutoUpdate" Title="Auto Update" Level="3" .*>/);
  regexTestIncludesNot('Squirrel executable component-ref', /<ComponentRef Id="_msq.exe_.*" \/>/ );
  testIncludesNot('Permission component-ref',  `<ComponentRef Id="SetFolderPermissions" />`);
  testIncludesNot('RegistryRunKey component-ref', '<ComponentRef Id="SetUninstallDisplayVersionPermissions" />');
  
  describe('auto-update', () => {
    test('MSICreator includes Auto-Updater feature', async () => {
      const msiCreator = new MSICreator({ ...defaultOptions, features: {autoUpdate: true, autoLaunch: false }});
      const { wxsFile } = await msiCreator.create();
      wxsContent = await fs.readFile(wxsFile, 'utf-8');
      expect(wxsFile).toBeTruthy();
    });
  
    test('.wxs file has as many components as we have files', () => {
      // Files + 2 Shortcuts + 3 special files + 9 registry + 1 permission component + 1 purge components
      const count = wxsContent.split('</Component>').length - 1;
      expect(count).toEqual(numberOfFiles + 16);
    });
  
    test('.wxs file contains as many component refs as components', () => {
      const componentCount = wxsContent.split('</Component>').length - 1;
      const refCount = wxsContent.split('<ComponentRef').length - 1;
      expect(componentCount).toEqual(refCount);
    });
  
    regexTestIncludes('Squirrel executable component', /<Component Id="_msq.exe_.*"/);
  
    testIncludes('Permission component',  `<Component Id="SetFolderPermissions"`);
    testIncludes('PermissionEx call', '<util:PermissionEx User="[UPDATERUSERGROUP]" GenericAll="yes" />');
    testIncludes('Updater user group property', '<Property Id="UPDATERUSERGROUP" Value="Users" />');
  
    regexTestIncludes('AutoUpdate feature', /<Feature Id="AutoUpdate" Title="Auto Update" Level="3" .*>/);
    regexTestIncludes('Squirrel executable component-ref', /<ComponentRef Id="_msq.exe_.*" \/>/ );
    testIncludes('Permission component-ref',  `<ComponentRef Id="SetFolderPermissions" />`);
    testIncludes('SetUninstallDisplayVersionPermissions component-ref', '<ComponentRef Id="SetUninstallDisplayVersionPermissions" />');
  });
  
  describe('auto-launch', () => {
    test('MSICreator includes Auto-Updater feature', async () => {
      const msiCreator = new MSICreator({ ...defaultOptions, features: {autoUpdate: false, autoLaunch: true }});
      const { wxsFile } = await msiCreator.create();
      wxsContent = await fs.readFile(wxsFile, 'utf-8');
      expect(wxsFile).toBeTruthy();
    });
  
    test('.wxs file has as many components as we have files', () => {
      // Files + 2 Shortcuts + 2 special files + 8 registry  + 1 purge components
      const count = wxsContent.split('</Component>').length - 1;
      expect(count).toEqual(numberOfFiles + 13);
    });
  
    test('.wxs file contains as many component refs as components', () => {
      const componentCount = wxsContent.split('</Component>').length - 1;
      const refCount = wxsContent.split('<ComponentRef').length - 1;
      expect(componentCount).toEqual(refCount);
    });
  
    testIncludes('RegistryRunKey', '<RegistryKey Root="HKMU" Key="SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" ForceCreateOnInstall="no" ForceDeleteOnUninstall="no"');
    testIncludes('RegistryRunKeyValue', '<RegistryValue Name="com.squirrel.acme.acme" Type="string" Value="&quot;[APPLICATIONROOTDIRECTORY]acme.exe&quot;" KeyPath="yes"/>');
    testIncludes('RegistryRunKey component', '<Component Id="RegistryRunKey"');
    testIncludes('RegistryRunKey component-ref', '<ComponentRef Id="RegistryRunKey" />');
    regexTestIncludes('AutoLaunch feature', /<Feature Id="AutoLaunch" Title="Launch On Login" Level="2" .*>/);
  
    test('MSICreator includes Auto-Updater feature with arguments', async () => {
      const msiCreator = new MSICreator({
        ...defaultOptions,
        features: {autoUpdate: false, autoLaunch: {enabled: true, arguments: ['arg1', 'arg2'] } }});
      const { wxsFile } = await msiCreator.create();
      wxsContent = await fs.readFile(wxsFile, 'utf-8');
      expect(wxsFile).toBeTruthy();
    });
  
    testIncludes('RegistryRunKey', '<RegistryValue Name="com.squirrel.acme.acme" Type="string" Value="&quot;[APPLICATIONROOTDIRECTORY]acme.exe&quot; arg1 arg2" KeyPath="yes"/>');
  
  });
  
  describe('perUser install by default', () => {
    test('MSICreator includes Auto-Updater feature', async () => {
      const msiCreator = new MSICreator({ ...defaultOptions, defaultInstallMode: 'perUser' });
      const { wxsFile } = await msiCreator.create();
      wxsContent = await fs.readFile(wxsFile, 'utf-8');
      expect(wxsFile).toBeTruthy();
    });
  
    testIncludes('correct defautlt perUser setting', '<Property Id="MSIINSTALLPERUSER" Secure="yes" Value="1" />');
  });
  
  describe('shortcut properties', () => {
    test('MSICreator includes default shortcut properties', async () => {
      const msiCreator = new MSICreator({
        ...defaultOptions,
      });
      const { wxsFile } = await msiCreator.create();
      wxsContent = await fs.readFile(wxsFile, 'utf-8');
      expect(wxsFile).toBeTruthy();
    });
    testIncludes('a default appUserModelId', '<ShortcutProperty Key="System.AppUserModel.ID" Value="com.squirrel.acme.acme"');
    testIncludesNot('a ToastActivatorCLSID', '<ShortcutProperty Key="System.AppUserModel.ToastActivatorCLSID"');
  
    test('MSICreator includes custom shortcut properties ', async () => {
      const msiCreator = new MSICreator({
        ...defaultOptions,
        appUserModelId: 'com.squirrel.myapp.myapp',
        toastActivatorClsid: 'd3519df4-76a7-412f-bd73-9d7746d1d757'
      });
      const { wxsFile } = await msiCreator.create();
      wxsContent = await fs.readFile(wxsFile, 'utf-8');
      expect(wxsFile).toBeTruthy();
    });
  
    testIncludes('a default appUserModelId', '<ShortcutProperty Key="System.AppUserModel.ID" Value="com.squirrel.myapp.myapp"/>');
    testIncludes('a ToastActivatorCLSID', '<ShortcutProperty Key="System.AppUserModel.ToastActivatorCLSID" Value="{d3519df4-76a7-412f-bd73-9d7746d1d757}"/>');
  
    test('MSICreator includes toast activator with brackets', async () => {
      const msiCreator = new MSICreator({
        ...defaultOptions,
        appUserModelId: 'com.squirrel.myapp.myapp',
        toastActivatorClsid: '{d3519df4-76a7-412f-bd73-9d7746d1d757}'
      });
      const { wxsFile } = await msiCreator.create();
      wxsContent = await fs.readFile(wxsFile, 'utf-8');
      expect(wxsFile).toBeTruthy();
    });
  
    testIncludes('the ToastActivatorCLSID', '<ShortcutProperty Key="System.AppUserModel.ToastActivatorCLSID" Value="{d3519df4-76a7-412f-bd73-9d7746d1d757}"/>');
  });
});
