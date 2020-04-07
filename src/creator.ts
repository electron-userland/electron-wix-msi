import * as fs from 'fs-extra';
import { flatMap, padStart } from 'lodash';
import * as path from 'path';
import * as uuid from 'uuid/v4';
import { spawnPromise } from './utils/spawn';

import { Component,
         ComponentRef,
         File,
         FileComponent,
         FileFolderTree,
         isFileComponent,
         Registry,
         StringMap } from './interfaces';
import { addFilesToTree, arrayToTree } from './utils/array-to-tree';
import { hasCandle, hasLight } from './utils/detect-wix';
import { createStubExe } from './utils/rc-edit';
import { replaceInString, replaceToFile } from './utils/replace';
import { getWindowsCompliantVersion } from './utils/version-util';
import { getDirectoryStructure } from './utils/walker';

const getTemplate = (name: string, trimTrailingNewLine: boolean = false) => {
  const content = fs.readFileSync(path.join(__dirname, `../static/${name}.xml`), 'utf-8');
  if (trimTrailingNewLine) {
    return content.replace(/[\r\n]+$/g, '');
  } else {
    return content;
  }
};

const ROOTDIR_NAME = 'APPLICATIONROOTDIRECTORY';
const debug = require('debug')('electron-wix-msi');

export interface MSICreatorOptions {
  appDirectory: string;
  appUserModelId?: string;
  description: string;
  exe: string;
  appIconPath?: string;
  extensions?: Array<string>;
  cultures?: string;
  language?: number;
  manufacturer: string;
  name: string;
  outputDirectory: string;
  programFilesFolderName?: string;
  shortName?: string;
  shortcutFolderName?: string;
  shortcutName?: string;
  ui?: UIOptions | boolean;
  upgradeCode?: string;
  version: string;
  signWithParams?: string;
  certificateFile?: string;
  certificatePassword?: string;
  arch?: 'x64' | 'ia64'| 'x86';
  features?: Features | false;
}

export interface UIOptions {
  chooseDirectory?: boolean;
  template?: string;
  images?: UIImages;
}

export interface UIImages {
  background?: string;        // WixUIDialogBmp
  banner?: string;            // WixUIBannerBmp
  exclamationIcon?: string;   // WixUIExclamationIco
  infoIcon?: string;          // WixUIInfoIco
  newIcon?: string;           // WixUINewIco
  upIcon?: string;            // WixUIUpIco
}

export interface Features {
  autoUpdate: boolean;
  autoLaunch: boolean;
}

export class MSICreator {
  // Default Templates
  public fileComponentTemplate = getTemplate('file-component');
  public registryComponentTemplate = getTemplate('registry-component');
  public componentRefTemplate = getTemplate('component-ref');
  public directoryTemplate = getTemplate('directory');
  public wixTemplate = getTemplate('wix');
  public uiTemplate = getTemplate('ui', true);
  public propertyTemplate = getTemplate('property', true);
  public updaterTemplate = getTemplate('updater-feature', true);
  public updaterPermissions = getTemplate('updater-permissions');
  public autoLaunchTemplate = getTemplate('auto-launch-feature', true);

  // State, overwritable beteween steps
  public wxsFile: string = '';

  // Configuration
  public appDirectory: string;
  public appUserModelId: string;
  public description: string;
  public exe: string;
  public iconPath?: string;
  public extensions: Array<string>;
  public cultures?: string;
  public language: number;
  public manufacturer: string;
  public name: string;
  public outputDirectory: string;
  public programFilesFolderName: string;
  public shortName: string;
  public shortcutFolderName: string;
  public shortcutName: string;
  public upgradeCode: string;
  public windowsCompliantVersion: string;
  public semanticVersion: string;
  public certificateFile?: string;
  public certificatePassword?: string;
  public signWithParams?: string;
  public arch: 'x64' | 'ia64'| 'x86' = 'x86';
  public autoUpdate: boolean;
  public autoLaunch: boolean;

  public ui: UIOptions | boolean;

  private files: Array<string> = [];
  private directories: Array<string> = [];
  private tree: FileFolderTree | undefined;
  private components: Array<Component> = [];

  constructor(options: MSICreatorOptions) {
    this.appDirectory = path.normalize(options.appDirectory);
    this.certificateFile = options.certificateFile;
    this.certificatePassword = options.certificatePassword;
    this.description = options.description;
    this.exe = options.exe.replace(/\.exe$/, '');
    this.iconPath = options.appIconPath;
    this.extensions = options.extensions || [];
    this.cultures = options.cultures;
    this.language = options.language || 1033;
    this.manufacturer = options.manufacturer;
    this.name = options.name;
    this.outputDirectory = options.outputDirectory;
    this.programFilesFolderName = options.programFilesFolderName || options.name;
    this.shortName = options.shortName || options.name;
    this.shortcutFolderName = options.shortcutFolderName || options.manufacturer;
    this.shortcutName = options.shortcutName || options.name;
    this.signWithParams = options.signWithParams;
    this.upgradeCode = options.upgradeCode || uuid();
    this.semanticVersion = options.version;
    this.windowsCompliantVersion = getWindowsCompliantVersion(options.version);
    this.arch = options.arch || 'x86';

    this.appUserModelId = options.appUserModelId
      || `com.squirrel.${this.shortName}.${this.exe}`;

    this.ui = options.ui !== undefined ? options.ui : false;
    this.autoUpdate = false;
    this.autoLaunch = false;
    if (typeof options.features === 'object' && options.features !== null) {
      this.autoUpdate = options.features.autoUpdate;
      this.autoLaunch = options.features.autoLaunch;
    }
  }

  /**
   * Analyzes the structure of the app directory and collects necessary
   * information for creating a .wxs file. Then, creates the file and returns
   * both the location as well as the content.
   *
   * @returns {Promise<{ wxsFile: string, wxsContent: string }>}
   */
  public async create(): Promise<{ wxsFile: string, wxsContent: string }> {
    const { files, directories } = await getDirectoryStructure(this.appDirectory);

    this.files = files;
    this.directories = directories;
    this.tree = await this.getTree();

    const { wxsContent, wxsFile } = await this.createWxs();
    this.wxsFile = wxsFile;

    return { wxsContent, wxsFile };
  }

  /**
   * Creates a wixObj file and kicks of actual compilation into an MSI.
   * "Guidance is internal" (https://youtu.be/8wdF8nchVMk?t=108)
   */
  public async compile() {
    const light = hasLight();
    const candle = hasCandle();

    if (!light || !light.has || !candle || !candle.has) {
      console.warn(`It appears that electron-wix-msi cannot find candle.exe or light.exe.`);
      console.warn(`Please consult the readme at https://github.com/felixrieseberg/electron-wix-msi`);
      console.warn(`for information on how to install the Wix toolkit, which is required.\n`);

      throw new Error(`Could not find light.exe or candle.exe`);
    } else {
      console.log(`electron-wix-msi: Using light.exe (${light.version}) and candle.exe (${candle.version})`);
    }

    if (!this.wxsFile) {
      throw new Error(`wxsFile not found. Did you run create() yet?`);
    }

    const { wixobjFile } = await this.createWixobj();
    const { msiFile } = await this.createMsi();
    await this.signMSI(msiFile);

    return { wixobjFile, msiFile };
  }

  /**
   * Kicks of creation of a .wxs file and returns both content
   * and location.
   *
   * @returns {Promise<{ wxsFile: string, wxsContent: string }>}
   */
  private async createWxs(): Promise<{ wxsFile: string, wxsContent: string }> {
    const target = path.join(this.outputDirectory, `${this.exe}.wxs`);
    const base = path.basename(this.appDirectory);
    const directories = await this.getDirectoryForTree(
      this.tree!, base, 8, this.programFilesFolderName, ROOTDIR_NAME);
    const componentRefs = await this.getMainAppComponentRefs();
    const updaterComponentRefs = await this.getUpdaterComponentRefs();
    const autoLaunchComponentRefs = await this.getAutoLaunchComponentRefs();
    let enableChooseDirectory = false;
    if (typeof this.ui === 'object' && this.ui !== 'null') {
      const { chooseDirectory } = this.ui;
      enableChooseDirectory = chooseDirectory || false;
    }

    const scaffoldReplacements = {
      '<!-- {{ComponentRefs}} -->': componentRefs.map(({ xml }) => xml).join('\n'),
      '<!-- {{Directories}} -->': directories,
      '<!-- {{UI}} -->': this.getUI(),
      '<!-- {{AutoUpdatePermissions}} -->': this.autoUpdate ? this.updaterPermissions : '{{remove newline}}',
      '<!-- {{AutoUpdateFeature}} -->': this.autoUpdate ? this.updaterTemplate : '{{remove newline}}',
      '<!-- {{AutoLaunchFeature}} -->': this.autoLaunch ? this.autoLaunchTemplate : '{{remove newline}}',
      '<!-- {{UpdaterComponentRefs}} -->': updaterComponentRefs.map(({ xml }) => xml).join('\n'),
      '<!-- {{AutoLaunchComponentRefs}} -->': autoLaunchComponentRefs.map(({ xml }) => xml).join('\n'),
    };

    const replacements = {
      '{{ApplicationBinary}}': this.exe,
      '{{ApplicationDescription}}': this.description,
      '{{ApplicationName}}': this.name,
      '{{ApplicationShortcutGuid}}': uuid(),
      '{{ApplicationShortName}}': this.shortName,
      '{{AppUserModelId}}': this.appUserModelId,
      '{{Language}}': this.language.toString(10),
      '{{Manufacturer}}': this.manufacturer,
      '{{ShortcutFolderName}}': this.shortcutFolderName,
      '{{ShortcutName}}': this.shortcutName,
      '{{UpgradeCode}}': this.upgradeCode,
      '{{Version}}': this.windowsCompliantVersion,
      '{{Platform}}': this.arch,
      '{{ProgramFilesFolder}}': this.arch === 'x86' ? 'ProgramFilesFolder' : 'ProgramFiles64Folder',
      '{{ProcessorArchitecture}}' : this.arch,
      '{{Win64YesNo}}' : this.arch === 'x86' ? 'no' : 'yes',
      '{{DesktopShortcutGuid}}': uuid(),
      '{{ConfigurableDirectory}}': enableChooseDirectory ? `ConfigurableDirectory="${ROOTDIR_NAME}"` : '',
      '\r\n.*{{remove newline}}': ''
    };

    const completeTemplate = replaceInString(this.wixTemplate, scaffoldReplacements);
    const output = await replaceToFile(completeTemplate, target, replacements);

    return { wxsFile: target, wxsContent: output };
  }

  /**
   * Creates a wixobj file.
   *
   * @returns {Promise<{ wixobjFile: string }>}
   */
  private async createWixobj(): Promise<{ wixobjFile: string }> {
    return { wixobjFile: await this.createFire('wixobj') };
  }

  /**
   * Creates a msi file
   *
   * @returns {Promise<{ msiFile: string }>}
   */
  private async createMsi(): Promise<{ msiFile: string }> {
    return { msiFile: await this.createFire('msi') };
  }

  /**
   * Uses light.exe or candle.exe to create a wixobj or msi file.
   *
   * @param {('wixobj' | 'msi')} type
   * @returns {Promise<string>} - The created file
   */
  private async createFire(type: 'wixobj' | 'msi'): Promise<string> {
    const cwd = path.dirname(this.wxsFile);
    const expectedObj = path.join(cwd, `${path.basename(this.wxsFile, '.wxs')}.${type}`);
    const binary = type === 'msi'
      ? 'light.exe'
      : 'candle.exe';
    const input = type === 'msi'
      ? path.join(cwd, `${path.basename(this.wxsFile, '.wxs')}.wixobj`)
      : this.wxsFile;

    if (this.ui && !this.extensions.find((e) => e === 'WixUIExtension')) {
      this.extensions.push('WixUIExtension');
    }

    if (!this.extensions.find((e) => e === 'WixUtilExtension')) {
      this.extensions.push('WixUtilExtension');
    }

    const preArgs = flatMap(this.extensions.map((e) => (['-ext', e])));

    if (type === 'msi' && this.cultures) {
      preArgs.unshift(`-cultures:${this.cultures}`);
    }

    const { code, stderr, stdout } = await spawnPromise(binary, [ ...preArgs, input ], {
      env: process.env,
      cwd
    });

    if (code === 0 && fs.existsSync(expectedObj)) {
      return expectedObj;
    } else {
      throw new Error(`Could not create ${type} file. Code: ${code} StdErr: ${stderr} StdOut: ${stdout}`);
    }
  }

  /**
   * Signs the resulting MSI
   *
   * @memberof MSICreator
   */
  private async signMSI(msiFile: string) {
    const { certificatePassword, certificateFile, signWithParams } = this;
    const signToolPath = path.join(__dirname, '../vendor/signtool.exe');

    if (!certificateFile && !signWithParams) {
      debug('Signing not necessary, no certificate file or parameters given');
      return;
    }

    if (!signWithParams && !certificatePassword) {
      throw new Error('You must provide a certificatePassword with a certificateFile');
    }

    const args: Array<string> = signWithParams
      // Split up at spaces and doublequotes
      ? signWithParams.match(/(?:[^\s"]+|"[^"]*")+/g) as Array<string>
      : ['/a', '/f', path.resolve(certificateFile!), '/p', certificatePassword!];

    const { code, stderr, stdout } = await spawnPromise(signToolPath, [ 'sign', ...args, msiFile ], {
      env: process.env,
      cwd: path.join(__dirname, '../vendor'),
    });

    if (code !== 0) {
      throw new Error(`Signtool exited with code ${code}. Stderr: ${stderr}. Stdout: ${stdout}`);
    }
  }

  /**
   * Creates the XML portion for a Wix UI, if enabled.
   *
   * @returns {string}
   */
  private getUI(): string {
    let xml = '';

    if (this.ui) {
      xml = this.uiTemplate;
    }

    if (typeof this.ui === 'object' && this.ui !== 'null') {
      const { template } = this.ui;
      const propertiesXml = this.getUIProperties(this.ui);
      const uiTemplate = template || this.uiTemplate;
      xml = replaceInString(uiTemplate, {
        '<!-- {{Properties}} -->': propertiesXml.length > 0 ? propertiesXml : '{{remove newline}}'
      });
    }

    return xml;
  }

  /**
   * Returns Wix UI properties
   *
   * @returns {string}
   */
  private getUIProperties(ui: UIOptions): string {
    const images = ui.images || {};
    const propertyMap: StringMap<string> = {
      background: 'WixUIDialogBmp',
      banner: 'WixUIBannerBmp',
      exclamationIcon: 'WixUIExclamationIco',
      infoIcon: 'WixUIInfoIco',
      newIcon: 'WixUINewIco',
      upIcon: 'WixUIUpIco'
    };

    return Object.keys(images)
      .map((key) => {
        return propertyMap[key]
          ? replaceInString(this.propertyTemplate, {
              '{{Key}}': propertyMap[key],
              '{{Value}}': (images as any)[key]
            })
          : '';
      })
      .join('\n');
  }

  /**
   * Creates the XML component for Wix <Directory> elements,
   * including children
   *
   * @param {FileFolderTree} tree
   * @param {string} treePath
   * @param {number} [indent=0]
   * @returns {string}
   */
  private getDirectoryForTree(tree: FileFolderTree,
                              treePath: string,
                              indent: number,
                              name: string,
                              id?: string): string {
    const childDirectories = Object.keys(tree)
      .filter((k) => !k.startsWith('__ELECTRON_WIX_MSI'))
      .map((k) => {
        return this.getDirectoryForTree(
          tree[k] as FileFolderTree,
          (tree[k] as FileFolderTree).__ELECTRON_WIX_MSI_PATH__,
          indent + 2,
          (tree[k] as FileFolderTree).__ELECTRON_WIX_MSI_DIR_NAME__,
        );
      });
    const childFiles = tree.__ELECTRON_WIX_MSI_FILES__
      .map((file) => {
        const component = this.getComponent(file, indent + 2);
        this.components.push(component);
        return component.xml;
      });

    const childRegistry = tree.__ELECTRON_WIX_MSI_REGISTRY__
    .map((registry) => {
      const component = this.getRegistryComponent(registry, indent + 2);
      this.components.push(component);
      return component.xml;
    });

    const children: string = [childDirectories.join('\n'),
      childFiles.join('\n'),
      childRegistry.length > 0 ? '\n' : '',
      childRegistry.join('\n')].join('');

    const directoryXml = replaceInString(this.directoryTemplate, {
      '<!-- {{I}} -->': padStart('', indent),
      '{{DirectoryId}}': id || this.getComponentId(treePath),
      '{{DirectoryName}}': name,
      '<!-- {{Children}} -->': children
    });
    return `${directoryXml}${childDirectories.length > 0 && !id ? '\n' : ''}`;
  }

  /**
   * Get a FileFolderTree for all files that need to be installed.
   *
   * @returns {FileFolderTree}
   */
  private async getTree(): Promise<FileFolderTree> {
    const root = this.appDirectory;
    const stubExe = await createStubExe(this.appDirectory,
                                        this.exe,
                                        this.name,
                                        this.manufacturer,
                                        this.description,
                                        this.windowsCompliantVersion,
                                        this.iconPath);

    const folderTree = arrayToTree(this.directories, root, this.semanticVersion);
    const fileFolderTree = addFilesToTree(folderTree,
                                          this.files,
                                          this.exe,
                                          stubExe,
                                          this.autoUpdate,
                                          this.autoLaunch,
                                          this.semanticVersion);

    return fileFolderTree;
  }

  /**
   * Creates Wix MainApp <ComponentRefs> components.
   *
   * @returns {<Array<ComponentRef>}
   */
  private getMainAppComponentRefs(): Array<ComponentRef> {
    return this.components
      .filter((c) => (!isFileComponent(c) && c.componentId !== 'RegistryRunKey') ||
        (isFileComponent(c) && c.file.name !== 'Update.exe'))
      .map(({ componentId }) => {
        const xml = replaceInString(this.componentRefTemplate, {
          '<!-- {{I}} -->': '        ',
          '{{ComponentId}}': componentId
        });

        return { componentId, xml };
    });
  }

  /**
   * Creates auto-update <ComponentRefs> components.
   *
   * @returns {<Array<ComponentRef>}
   */
  private getUpdaterComponentRefs(): Array<ComponentRef> {
    return this.components
      .filter((c) => isFileComponent(c) && c.file.name === 'Update.exe')
      .map(({ componentId }) => {
        const xml = replaceInString(this.componentRefTemplate, {
          '<!-- {{I}} -->': '',
          '{{ComponentId}}': componentId
        });

        return { componentId, xml };
    });
  }

  private getAutoLaunchComponentRefs(): Array<ComponentRef> {
    return this.components
      .filter((c) => !isFileComponent(c) && c.componentId === 'RegistryRunKey')
      .map(({ componentId }) => {
        const xml = replaceInString(this.componentRefTemplate, {
          '<!-- {{I}} -->': '',
          '{{ComponentId}}': componentId
        });

        return { componentId, xml };
    });
  }

  /**
   * Creates Wix <Components> for all files.
   *
   * @param {File}
   * @returns {FileComponent}
   */
  private getComponent(file: File, indent: number): FileComponent {
    const guid = uuid();
    const componentId = this.getComponentId(file.path);
    const xml = replaceInString(this.fileComponentTemplate, {
      '<!-- {{I}} -->': padStart('', indent),
      '{{ComponentId}}': componentId,
      '{{FileId}}': componentId,
      '{{Name}}': file.name,
      '{{Guid}}': guid,
      '{{SourcePath}}': file.path
    });

    return { guid, componentId, xml, file };
  }

  /**
   * Creates Wix <Components> for all registry values.
   *
   * @param {File}
   * @returns {FileComponent}
   */
  private getRegistryComponent(registry: Registry, indent: number): Component {
    const guid = uuid();
    const xml = replaceInString(this.registryComponentTemplate, {
      '<!-- {{I}} -->': padStart('', indent),
      '{{ComponentId}}': registry.id,
      '{{Guid}}': guid,
      '{{Name}}': registry.name,
      '{{Root}}': registry.root,
      '{{Key}}': registry.key,
      '{{Type}}': registry.type,
      '{{Value}}': registry.value,
    });
    return { guid, componentId: registry.id, xml };
  }

  /**
   * Creates a usable component id to use with Wix "id" fields
   *
   * @param {string} filePath
   * @returns {string} componentId
   */
  private getComponentId(filePath: string): string {
    const pathId = filePath
      .replace(this.appDirectory, '')
      .replace(/^\\|\//g, '');
    const pathPart = pathId.length > 34
      ? path.basename(filePath).slice(0, 34)
      : pathId;
    const uniqueId = `_${pathPart}_${uuid()}`;

    return uniqueId.replace(/[^A-Za-z0-9_\.]/g, '_');
  }
}
