"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const lodash_1 = require("lodash");
const path = require("path");
const uuid = require("uuid/v4");
const spawn_1 = require("./utils/spawn");
const array_to_tree_1 = require("./utils/array-to-tree");
const detect_wix_1 = require("./utils/detect-wix");
const replace_1 = require("./utils/replace");
const walker_1 = require("./utils/walker");
const getTemplate = (name) => fs.readFileSync(path.join(__dirname, `../static/${name}.xml`), 'utf-8');
const ROOTDIR_NAME = 'APPLICATIONROOTDIRECTORY';
const debug = require('debug')('electron-wix-msi');
class MSICreator {
    constructor(options) {
        this.componentTemplate = getTemplate('component');
        this.componentRefTemplate = getTemplate('component-ref');
        this.directoryTemplate = getTemplate('directory');
        this.wixTemplate = getTemplate('wix');
        this.uiTemplate = getTemplate('ui');
        this.uiDirTemplate = getTemplate('ui-choose-dir');
        this.propertyTemplate = getTemplate('property');
        this.wxsFile = '';
        this.arch = 'x86';
        this.files = [];
        this.directories = [];
        this.components = [];
        this.appDirectory = path.normalize(options.appDirectory);
        this.certificateFile = options.certificateFile;
        this.certificatePassword = options.certificatePassword;
        this.description = options.description;
        this.exe = options.exe.replace(/\.exe$/, '');
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
        this.version = options.version;
        this.arch = options.arch || 'x86';
        this.appUserModelId = options.appUserModelId
            || `com.squirrel.${this.shortName}.${this.exe}`;
        this.ui = options.ui !== undefined ? options.ui : false;
    }
    create() {
        return __awaiter(this, void 0, void 0, function* () {
            const { files, directories } = yield walker_1.getDirectoryStructure(this.appDirectory);
            this.files = files;
            this.directories = directories;
            this.tree = this.getTree();
            const { wxsContent, wxsFile } = yield this.createWxs();
            this.wxsFile = wxsFile;
            return { wxsContent, wxsFile };
        });
    }
    compile() {
        return __awaiter(this, void 0, void 0, function* () {
            const light = detect_wix_1.hasLight();
            const candle = detect_wix_1.hasCandle();
            if (!light || !light.has || !candle || !candle.has) {
                console.warn(`It appears that electron-wix-msi cannot find candle.exe or light.exe.`);
                console.warn(`Please consult the readme at https://github.com/felixrieseberg/electron-wix-msi`);
                console.warn(`for information on how to install the Wix toolkit, which is required.\n`);
                throw new Error(`Could not find light.exe or candle.exe`);
            }
            else {
                console.log(`electron-wix-msi: Using light.exe (${light.version}) and candle.exe (${candle.version})`);
            }
            if (!this.wxsFile) {
                throw new Error(`wxsFile not found. Did you run create() yet?`);
            }
            const { wixobjFile } = yield this.createWixobj();
            const { msiFile } = yield this.createMsi();
            yield this.signMSI(msiFile);
            return { wixobjFile, msiFile };
        });
    }
    createWxs() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.tree) {
                throw new Error('Tree does not exist');
            }
            const target = path.join(this.outputDirectory, `${this.exe}.wxs`);
            const base = path.basename(this.appDirectory);
            const directories = yield this.getDirectoryForTree(this.tree, base, 8, ROOTDIR_NAME, this.programFilesFolderName);
            const componentRefs = yield this.getComponentRefs();
            const scaffoldReplacements = {
                '<!-- {{ComponentRefs}} -->': componentRefs.map(({ xml }) => xml).join('\n'),
                '<!-- {{Directories}} -->': directories,
                '<!-- {{UI}} -->': this.getUI()
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
                '{{Version}}': this.version,
                '{{Platform}}': this.arch,
                '{{ProgramFilesFolder}}': this.arch === 'x86' ? 'ProgramFilesFolder' : 'ProgramFiles64Folder',
                '{{ProcessorArchitecture}}': this.arch,
                '{{Win64YesNo}}': this.arch === 'x86' ? 'no' : 'yes',
                '{{DesktopShortcutGuid}}': uuid()
            };
            const completeTemplate = replace_1.replaceInString(this.wixTemplate, scaffoldReplacements);
            const output = yield replace_1.replaceToFile(completeTemplate, target, replacements);
            return { wxsFile: target, wxsContent: output };
        });
    }
    createWixobj() {
        return __awaiter(this, void 0, void 0, function* () {
            return { wixobjFile: yield this.createFire('wixobj') };
        });
    }
    createMsi() {
        return __awaiter(this, void 0, void 0, function* () {
            return { msiFile: yield this.createFire('msi') };
        });
    }
    createFire(type) {
        return __awaiter(this, void 0, void 0, function* () {
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
            const preArgs = lodash_1.flatMap(this.extensions.map((e) => (['-ext', e])));
            if (type === 'msi' && this.cultures) {
                preArgs.unshift(`-cultures:${this.cultures}`);
            }
            const { code, stderr, stdout } = yield spawn_1.spawnPromise(binary, [...preArgs, input], {
                env: process.env,
                cwd
            });
            if (code === 0 && fs.existsSync(expectedObj)) {
                return expectedObj;
            }
            else {
                throw new Error(`Could not create ${type} file. Code: ${code} StdErr: ${stderr} StdOut: ${stdout}`);
            }
        });
    }
    signMSI(msiFile) {
        return __awaiter(this, void 0, void 0, function* () {
            const { certificatePassword, certificateFile, signWithParams } = this;
            const signToolPath = path.join(__dirname, '../vendor/signtool.exe');
            if (!certificateFile && !signWithParams) {
                debug('Signing not necessary, no certificate file or parameters given');
                return;
            }
            if (!signWithParams && !certificatePassword) {
                throw new Error('You must provide a certificatePassword with a certificateFile');
            }
            const args = signWithParams
                ? signWithParams.match(/(?:[^\s"]+|"[^"]*")+/g)
                : ['/a', '/f', path.resolve(certificateFile), '/p', certificatePassword];
            const { code, stderr, stdout } = yield spawn_1.spawnPromise(signToolPath, ['sign', ...args, msiFile], {
                env: process.env,
                cwd: path.join(__dirname, '../vendor'),
            });
            if (code !== 0) {
                throw new Error(`Signtool exited with code ${code}. Stderr: ${stderr}. Stdout: ${stdout}`);
            }
        });
    }
    getUI() {
        let xml = '';
        if (this.ui) {
            xml = this.uiTemplate;
        }
        if (typeof this.ui === 'object' && this.ui !== 'null') {
            const { images, template, chooseDirectory } = this.ui;
            const propertiesXml = this.getUIProperties(this.ui);
            const uiTemplate = template || (chooseDirectory
                ? this.uiDirTemplate
                : this.uiTemplate);
            xml = replace_1.replaceInString(uiTemplate, {
                '<!-- {{Properties}} -->': propertiesXml
            });
        }
        return xml;
    }
    getUIProperties(ui) {
        const images = ui.images || {};
        const propertyMap = {
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
                ? replace_1.replaceInString(this.propertyTemplate, {
                    '{{Key}}': propertyMap[key],
                    '{{Value}}': images[key]
                })
                : '';
        })
            .join('\n');
    }
    getDirectoryForTree(tree, treePath, indent, id, name) {
        const childDirectories = Object.keys(tree)
            .filter((k) => !k.startsWith('__ELECTRON_WIX_MSI'))
            .map((k) => {
            return this.getDirectoryForTree(tree[k], tree[k].__ELECTRON_WIX_MSI_PATH__, indent + 2);
        });
        const childFiles = tree.__ELECTRON_WIX_MSI_FILES__
            .map((file) => {
            const component = this.getComponent(file, indent + 2);
            this.components.push(component);
            return component.xml;
        });
        const children = [childDirectories.join('\n'), childFiles.join('\n')].join('');
        return replace_1.replaceInString(this.directoryTemplate, {
            '<!-- {{I}} -->': lodash_1.padStart('', indent),
            '{{DirectoryId}}': id || this.getComponentId(treePath),
            '{{DirectoryName}}': name || path.basename(treePath),
            '<!-- {{Children}} -->': children
        });
    }
    getTree() {
        const root = this.appDirectory;
        const folderTree = array_to_tree_1.arrayToTree(this.directories, root);
        const fileFolderTree = array_to_tree_1.addFilesToTree(folderTree, this.files, root);
        return fileFolderTree;
    }
    getComponentRefs() {
        return this.components.map(({ componentId }) => {
            const xml = replace_1.replaceInString(this.componentRefTemplate, {
                '<!-- {{I}} -->': '      ',
                '{{ComponentId}}': componentId
            });
            return { componentId, xml };
        });
    }
    getComponent(file, indent) {
        const guid = uuid();
        const componentId = this.getComponentId(file.path);
        const xml = replace_1.replaceInString(this.componentTemplate, {
            '<!-- {{I}} -->': lodash_1.padStart('', indent),
            '{{ComponentId}}': componentId,
            '{{FileId}}': componentId,
            '{{Name}}': file.name,
            '{{Guid}}': guid,
            '{{SourcePath}}': file.path
        });
        return { guid, componentId, xml, file };
    }
    getComponentId(filePath) {
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
exports.MSICreator = MSICreator;
