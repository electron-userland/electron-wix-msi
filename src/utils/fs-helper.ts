import * as fs from 'fs-extra';
import * as path from 'path';

export const getTempPath: () => string = () => {
  return process.env.TEMP || process.env.TMPDIR || 'C:\\Windows\\temp';
};

export const getTempFilePath = (fileName: string, extension: string) => {
  const tempFolderPath = fs.mkdtempSync(path.join(getTempPath(), fileName));
  const tempFilePath = path.join(tempFolderPath, `${fileName}.${extension}`);
  return { tempFolderPath, tempFilePath };
};
