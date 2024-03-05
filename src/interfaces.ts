import { SignToolOptions } from '@electron/windows-sign';

// tslint:disable-next-line
export interface WindowsSignOptions extends SignToolOptions { };

export type featureAffinity = 'main' | 'autoUpdate' | 'autoLaunch';

export interface StringMap<T> {
  [key: string]: T;
}

export interface Component {
  guid: string;
  componentId: string;
  xml: string;
  featureAffinity: featureAffinity;
}

export interface FileComponent extends Component {
  file: File;
}

export interface ComponentRef {
  componentId: string;
  xml: string;
}

export interface Directory {
  id: string;
  xml: string;
  path: string;
  name: string;
  children: Array<Directory>;
  files: Array<string>;
}

export interface FileFolderTree {
  [key: string]: FileFolderTree | Array<File> | Array<Registry> | string;
  __ELECTRON_WIX_MSI_FILES__: Array<File>;
  __ELECTRON_WIX_MSI_REGISTRY__: Array<Registry>;
  __ELECTRON_WIX_MSI_PATH__: string;
  __ELECTRON_WIX_MSI_DIR_NAME__: string;
}

export interface AppElement {
  featureAffinity?: featureAffinity;
}

export interface File extends AppElement {
  name: string;
  path: string;
}

export interface Registry extends AppElement {
  id: string;
  key: string;
  root: 'HKLM' | 'HKCU' | 'HKMU' | 'HKCR' | 'HKU';
  name: string;
  value: string;
  type: 'string' | 'integer' | 'binary' | 'expandable' | 'multiString';
  forceCreateOnInstall?: 'yes' | 'no';
  forceDeleteOnUninstall?: 'yes' | 'no';
  permission?: {
    user: string;
    genericAll: 'yes' | 'no';
  };
}

export function isFileComponent(comp: Component | FileComponent): comp is FileComponent {
  return (comp as FileComponent).file !== undefined;
}
