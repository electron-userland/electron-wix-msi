import { extractIcon } from 'exe-icon-extractor';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as rcedit from 'rcedit';
import * as rcinfo from 'rcinfo';

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
    rcinfo(exePath, (error: Error, info: any) => {
      if (error) {
        reject(error);
      } else {
        resolve(info);
      }
    });
  });

  return promise;
}

async function extractIconFromApp(exePath: string, tempFolder: string): Promise<string> {
  try {
    const x = require('exe-icon-extractor');
    const buffer = extractIcon(exePath, 'large');
    const iconPath = path.join(tempFolder, 'app.ico');
    await fs.writeFile(iconPath, buffer);
    return iconPath;
  } catch (error) {
    console.log('Unable to extract icon from exe. Please provide an explicit icon via parameter.', error);
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

  const tempPath = process.env.TEMP || process.env.TMPDIR || '/tmp';
  const tempFolder = await fs.mkdtemp(path.join(tempPath, exe));
  const subbedExePath = path.join(tempFolder, `${exe}.exe`);
  const stubPath = path.join(__dirname, '..\\..\\vendor\\StubExecutable.exe');
  await fs.copyFile(stubPath, subbedExePath);
  const appExe = path.join(appDirectory, `${exe}.exe`);
  let appIconPath: string | undefined;
  if (!icon) {
    appIconPath = await extractIconFromApp(appExe, path.join(tempFolder));
  }

  let rcOptions: any;
  let rcInfo: any;
  try {
   rcInfo = await getFileInfo(appExe);
  } catch (error) {
    console.log('Failed to read version info from exe', error);
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
    'icon': icon || appIconPath
  };

  await rcedit(subbedExePath, rcOptions);
  return subbedExePath;
}
