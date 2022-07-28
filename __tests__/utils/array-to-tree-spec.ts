import { cloneDeep, defaultsDeep } from 'lodash';
import * as mockFs from 'mock-fs';

import { Registry } from '../../src/interfaces';
import { addFilesToTree, arrayToTree, isChild, isDirectChild } from '../../src/utils/array-to-tree';
import { separator as S } from '../../src/utils/separator';
import { getMockFileSystem } from '../mocks/mock-fs';

const installInfoRegex = process.platform === 'win32' ? /C:\\tmp\\\.installInfo.*\\\.installInfo\.json/ : /\/tmp\/\.installInfo.*\.installInfo\.json/;
const msqSquirrelRegex = process.platform === 'win32' ? /.*\\vendor\\msq.exe/ : /.*\/vendor\/msq.exe/;
const originalTmp = process.env.TEMP;

const mockFolders = [
  `slack${S}resources`,
  `slack${S}resources${S}app.asar.unpacked`,
  `slack${S}resources${S}app.asar.unpacked${S}node_modules`,
  `slack${S}resources${S}app.asar.unpacked${S}src`,
  `slack${S}locales`
];

const mockFiles = [
  `slack${S}slack.exe`,
  `slack${S}resources${S}text.txt`,
  `slack${S}resources${S}app.asar.unpacked${S}image.png`,
  `slack${S}resources${S}app.asar.unpacked${S}node_modules${S}package.json`,
  `slack${S}resources${S}app.asar.unpacked${S}src${S}package.json`,
  `slack${S}locales${S}de-DE.json`,
  `slack${S}locales${S}en-US.json`,
];

const mockSpecialFiles = [
  { name: `slack.exe`, path:  `C:${S}temp${S}slack.exe`},
  { name: `.installInfo.json`, path: 'C:\\temp\\installInfo.json' }
];

const mockUpdaterSpecialFiles = [
  ...mockSpecialFiles,
  { name: `Update.exe`, path: 'C:\\temp\\Update.exe' }
];

const mockRegistry: Array<Registry> = [
  {
    id: 'RegistryInstallPath',
    root: 'HKMU',
    name: 'InstallPath',
    key: 'SOFTWARE\\{{Manufacturer}}\\{{ApplicationName}}',
    type: 'string',
    value: '[APPLICATIONROOTDIRECTORY]',
  }
];

const mockFolderTree = {
  __ELECTRON_WIX_MSI_PATH__: `slack`,
  __ELECTRON_WIX_MSI_DIR_NAME__: 'slack',
  __ELECTRON_WIX_MSI_FILES__: [],
  __ELECTRON_WIX_MSI_REGISTRY__: [],
  'app-1.0.0' : {
    __ELECTRON_WIX_MSI_PATH__: `slack`,
    __ELECTRON_WIX_MSI_DIR_NAME__: 'app-1.0.0',
    __ELECTRON_WIX_MSI_FILES__: [],
    __ELECTRON_WIX_MSI_REGISTRY__: [],
    resources: {
      __ELECTRON_WIX_MSI_PATH__: `slack${S}resources`,
      __ELECTRON_WIX_MSI_DIR_NAME__: 'resources',
      __ELECTRON_WIX_MSI_FILES__: [],
      __ELECTRON_WIX_MSI_REGISTRY__: [],
      'app.asar.unpacked': {
        __ELECTRON_WIX_MSI_PATH__: `slack${S}resources${S}app.asar.unpacked`,
        __ELECTRON_WIX_MSI_DIR_NAME__: 'app.asar.unpacked',
        __ELECTRON_WIX_MSI_FILES__: [],
        __ELECTRON_WIX_MSI_REGISTRY__: [],
        node_modules: {
          __ELECTRON_WIX_MSI_PATH__: `slack${S}resources${S}app.asar.unpacked${S}node_modules`,
          __ELECTRON_WIX_MSI_DIR_NAME__: 'node_modules',
          __ELECTRON_WIX_MSI_FILES__: [],
          __ELECTRON_WIX_MSI_REGISTRY__: [],
        },
        src: {
          __ELECTRON_WIX_MSI_PATH__: `slack${S}resources${S}app.asar.unpacked${S}src`,
          __ELECTRON_WIX_MSI_DIR_NAME__: 'src',
          __ELECTRON_WIX_MSI_FILES__: [],
          __ELECTRON_WIX_MSI_REGISTRY__: [],
        }
      }
    },
    locales: {
      __ELECTRON_WIX_MSI_PATH__: `slack${S}locales`,
      __ELECTRON_WIX_MSI_DIR_NAME__: 'locales',
      __ELECTRON_WIX_MSI_FILES__: [],
      __ELECTRON_WIX_MSI_REGISTRY__: [],
    }
  }
};

const mockFolderFileTree = defaultsDeep(cloneDeep(mockFolderTree), {
  __ELECTRON_WIX_MSI_FILES__:  [ { name: 'slack.exe', path: `C:${S}temp${S}slack.exe` },
    { name: '.installInfo.json',
      path: 'C:\\temp\\installInfo.json' }],
  __ELECTRON_WIX_MSI_REGISTRY__: [{
    id: 'RegistryInstallPath',
    key: 'SOFTWARE\\{{Manufacturer}}\\{{ApplicationName}}',
    name: 'InstallPath',
    root: 'HKMU',
    type: 'string',
    value: '[APPLICATIONROOTDIRECTORY]',
  }],
 __ELECTRON_WIX_MSI_PATH__: 'slack',
  'app-1.0.0' : {
    __ELECTRON_WIX_MSI_FILES__: [{ name: `slack.exe`, path: `slack${S}slack.exe` }],
    resources: {
      __ELECTRON_WIX_MSI_FILES__: [{ name: `text.txt`, path: `slack${S}resources${S}text.txt` }],
      'app.asar.unpacked': {
        __ELECTRON_WIX_MSI_FILES__: [
          { name: `image.png`, path: `slack${S}resources${S}app.asar.unpacked${S}image.png` },
        ],
        node_modules: {
          __ELECTRON_WIX_MSI_FILES__: [
            { name: `package.json`, path: `slack${S}resources${S}app.asar.unpacked${S}node_modules${S}package.json` }
          ]
        },
        src: {
          __ELECTRON_WIX_MSI_FILES__: [
            { name: `package.json`, path: `slack${S}resources${S}app.asar.unpacked${S}src${S}package.json` }
          ]
        }
      }
    },
    locales: {
      __ELECTRON_WIX_MSI_FILES__: [
        { name: `de-DE.json`, path: `slack${S}locales${S}de-DE.json` },
        { name: `en-US.json`, path: `slack${S}locales${S}en-US.json` }
      ]
    }
 }
});

describe.skip('array-to-tree', () => {
  beforeAll(() => {
    // console.log call needed as workaround to make jest work with mock-fs
    console.log('');
    process.env.TEMP = process.platform === 'win32' ? 'C:\\tmp' : '/tmp';
    getMockFileSystem();
    mockFs(getMockFileSystem());
  });
  
  afterAll(() => {
    mockFs.restore();
    process.env.TEMP = originalTmp;
  });
  
  test(`isChild() returns true for a child and parent`, () => {
    const a = `C:${S}my${S}path`;
    const b = `C:${S}my${S}path${S}child`;
  
    expect(isChild(a, b)).toBeTruthy;
  });
  
  test(`isChild() returns false for a child and non-parent`, () => {
    const a = `C:${S}my${S}path`;
    const b = `C:${S}my${S}other${S}path${S}child`;
  
    expect(isChild(a, b)).toBeFalsy;
  });
  
  test(`isDirectChild() returns true for a child and direct parent`, () => {
    const a = `C:${S}my${S}path`;
    const b = `C:${S}my${S}path${S}child`;
  
    expect(isDirectChild(a, b)).toBeTruthy;
  });
  
  test(`isDirectChild() returns false for a child and non-direct parent`, () => {
    const a = `C:${S}my${S}path`;
    const b = `C:${S}my${S}path${S}child${S}ren`;
  
    expect(isDirectChild(a, b)).toBeFalsy;
  });
  
  test(`isDirectChild() returns false for a child and non-parent`, () => {
    const a = `C:${S}my${S}path`;
    const b = `C:${S}my${S}other${S}path${S}child`;
  
    expect(isDirectChild(a, b)).toBeFalsy;
  });
  
  test(`arrayToTree() creates a tree structure`, () => {
    expect(arrayToTree(mockFolders, `slack`, '1.0.0')).toEqual(mockFolderTree);
  });
  
  test(`addFilesToTree() adds files to a tree structure`, () => {
    const folderFileTree = addFilesToTree(mockFolderTree, mockFiles, mockSpecialFiles, mockRegistry, '1.0.0');
    expect(folderFileTree).toEqual(mockFolderFileTree);
  });
  
  test(`addFilesToTree() adds files to a tree structure`, () => {
    const updaterMockFolderFileTree = cloneDeep(mockFolderFileTree);
    updaterMockFolderFileTree.__ELECTRON_WIX_MSI_FILES__ = [ { name: 'slack.exe', path: `C:${S}temp${S}slack.exe` },
      { name: '.installInfo.json',
        path: 'C:\\temp\\installInfo.json' },
      { name: 'Update.exe',
        path: 'C:\\temp\\Update.exe'
      } ];
    const folderFileTree =
      addFilesToTree(mockFolderTree, mockFiles,  mockUpdaterSpecialFiles, mockRegistry, '1.0.0');
    expect(folderFileTree).toEqual(updaterMockFolderFileTree);
  });
});
