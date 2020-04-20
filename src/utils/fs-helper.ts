import * as fs from 'fs-extra';
import * as path from 'path';

export const getTempPath: () => string = () => {
  return process.env.TEMP || process.env.TMPDIR || '/tmp';
};

export const getTempFilePath = (fileName: string, extension: string) => {
  const tempFolderPath =  path.join(fs.mkdtempSync(path.join(getTempPath(), fileName)));
  const tempFilePath = path.join(tempFolderPath, `${fileName}.${extension}`);
  return { tempFolderPath, tempFilePath };
};
