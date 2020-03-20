import * as fs from 'fs-extra';
import * as path from 'path';

export const getTempFilePath = (fileName: string, extension: string) => {
  const tempPath = process.env.TEMP || process.env.TMPDIR || '/tmp';
  let tempFolderPath;
  let tempFilePath;

  if (process.platform === 'win32') {
    tempFolderPath = fs.mkdtempSync(path.join(tempPath, fileName));
    tempFilePath = path.join(tempFolderPath, `${fileName}.${extension}`);
  } else {
    // On Mac fs.mkdtempSync() doesn't really work with paths. Hence the more complicated code here.
    const appTempFolder = fs.mkdtempSync(fileName);
    tempFolderPath = path.join(tempPath, appTempFolder);
    tempFilePath = path.join(tempFolderPath, `${fileName}.${extension}`);

    // Not proud of this. But it seems path is not doing the right thing when platform is overridden
    tempFolderPath = tempFolderPath.replace(/\\/g, '\/');
    tempFilePath = tempFilePath.replace(/\\/g, '\/');

    fs.mkdirSync(tempFolderPath);
    fs.rmdirSync(appTempFolder);
  }

  return { tempFolderPath, tempFilePath };
};
