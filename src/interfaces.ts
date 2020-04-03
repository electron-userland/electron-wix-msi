export interface StringMap<T> {
  [key: string]: T;
}

export interface Component {
  guid: string;
  componentId: string;
  xml: string;
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

export interface File {
  name: string;
  path: string;
}

export interface Registry {
  id: string;
  key: string;
  root: 'HKLM' | 'HKCU' | 'HKMU' | 'HKCR' | 'HKU';
  name: string;
  value: string;
  type: 'string' | 'integer' | 'binary' | 'expandable' | 'multiString';
}

export function isFileComponent(comp: Component | FileComponent): comp is FileComponent {
  return (comp as FileComponent).file !== undefined;
}
