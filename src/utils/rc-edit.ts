import { extractIcon } from 'exe-icon-extractor';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as rcedit from 'rcedit';
import * as rcinfo from 'rcinfo';
import { getTempFilePath } from './fs-helper';

interface RcInfo {
  'version-string': {
    CompanyName?: string;
    FileDescription?: string,
    LegalCopyright?: string,
    ProductName?: string
  };
  'file-version?': string;
  'product-version?': string;
  'icon?': string;
}

function getFileInfo(exePath: string): Promise<any> {
  const promise = new Promise<any>((resolve, reject) => {
    rcinfo(exePath, (error: Error, info: any) => error ? reject(error) : resolve(info));
  });

  return promise;
}

async function extractIconFromApp(exePath: string, tempFolder: string): Promise<string> {
  try {
    const buffer = extractIcon(exePath, 'large');
    const iconPath = path.join(tempFolder, 'app.ico');
    await fs.writeFile(iconPath, buffer);
    return iconPath;
  } catch (error) {
    console.error('Unable to extract icon from exe. Please provide an explicit icon via parameter.', error);
    return '';
  }
}

export async function createStubExe(appDirectory: string,
                                    exe: string,
                                    name: string,
                                    manufacturer: string,
                                    description: string,
                                    version: string,
                                    icon?: string,
                                    ): Promise<string> {

  const { tempFolderPath, tempFilePath } = getTempFilePath(exe, 'exe');
  const stubPath = path.join(__dirname, '../../vendor/StubExecutable.exe');
  await fs.copyFile(stubPath, tempFilePath);
  const appExe = path.join(appDirectory, `${exe}.exe`);
  let appIconPath: string | undefined;
  if (!icon) {
    appIconPath = await extractIconFromApp(appExe, path.join(tempFolderPath));
  }

  let rcOptions: any;
  let rcInfo: any;
  try {
   rcInfo = await getFileInfo(appExe);
  } catch (error) {
    console.warn('Unable to read file info from exe. Falling back to packaging description.', error);
  }

  rcOptions = {
    'version-string': {
      CompanyName: rcInfo?.CompanyName || manufacturer,
      FileDescription: rcInfo?.FileDescription || description,
      LegalCopyright: rcInfo?.LegalCopyright || `${new Date().getFullYear()}@${manufacturer}`,
      ProductName: rcInfo?.ProductName || name
    },
    'file-version':  rcInfo?.FileVersion || version,
    'product-version': rcInfo?.ProductVersion || version,
    icon: icon || appIconPath
  };

  await rcedit(tempFilePath, rcOptions);
  return tempFilePath;
}
