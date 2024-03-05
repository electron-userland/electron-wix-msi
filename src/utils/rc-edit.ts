import * as fs from "fs-extra";
import * as path from "path";
import * as rcedit from "rcedit";
import * as rcinfo from "rcinfo";
import { getTempFilePath } from "./fs-helper";

interface RcOptions {
  "version-string": {
    CompanyName?: string;
    FileDescription?: string;
    LegalCopyright?: string;
    ProductName?: string;
  };
  "file-version"?: string;
  "product-version"?: string;
  icon?: string;
}

interface RcInfo {
  Signature: string;
  StrucVersion: string;
  FileVersion: string;
  ProductVersion: string;
  FileFlagsMask: string;
  FileFlags: string;
  FileOS: string;
  FileType: string;
  FileDate: string;
  LangID: string;
  AuthorName: string;
  Comments: string;
  CompanyName: string;
  FileDescription: string;
  InternalName: string;
  LegalCopyright: string;
  LegalTrademarks: string;
  OriginalFilename: string;
  PrivateBuild: string;
  ProductName: string;
  SpecialBuild: string;
  Translation: string;
}

function getExtractIcon(): (_: string, __: string) => Buffer {
  if (process.platform === "win32") {
    return require("exe-icon-extractor").extractIcon;
  } else {
    return () => {
      throw new Error("Not implemented");
    };
  }
}

function getFileInfo(exePath: string): Promise<RcInfo> {
  return new Promise<RcInfo>((resolve, reject) => {
    rcinfo(exePath, (error: Error, info: RcInfo) => {
      return error ? reject(error) : resolve(info as RcInfo);
    });
  });
}

async function extractIconFromApp(
  exePath: string,
  tempFolder: string,
): Promise<string> {
  try {
    const buffer = getExtractIcon()(exePath, "large");
    const iconPath = path.join(tempFolder, "app.ico");
    await fs.writeFile(iconPath, buffer);
    return iconPath;
  } catch (error) {
    console.error(
      "Unable to extract icon from exe. Please provide an explicit icon via parameter.",
      error,
    );
    return "";
  }
}

export async function createStubExe(
  appDirectory: string,
  exe: string,
  name: string,
  manufacturer: string,
  description: string,
  version: string,
  icon?: string,
): Promise<string> {
  const { tempFolderPath, tempFilePath } = getTempFilePath(exe, "exe");
  const stubPath = path.join(__dirname, "../../vendor/StubExecutable.exe");
  await fs.copyFile(stubPath, tempFilePath);
  const appExe = path.join(appDirectory, `${exe}.exe`);
  let appIconPath: string | undefined;
  if (!icon) {
    appIconPath = await extractIconFromApp(appExe, path.join(tempFolderPath));
  }

  let rcInfo: RcInfo | undefined;

  try {
    rcInfo = await getFileInfo(appExe);
  } catch (error) {
    console.warn(
      "Unable to read file info from exe. Falling back to packaging description.",
      error,
    );
  }

  const rcOptions: RcOptions = {
    "version-string": {
      CompanyName: rcInfo?.CompanyName || manufacturer,
      FileDescription: rcInfo?.FileDescription || description,
      LegalCopyright:
        rcInfo?.LegalCopyright || `${new Date().getFullYear()}@${manufacturer}`,
      ProductName: rcInfo?.ProductName || name,
    },
    "file-version": rcInfo?.FileVersion || version,
    "product-version": rcInfo?.ProductVersion || version,
    icon: icon || appIconPath,
  };

  await rcedit(tempFilePath, rcOptions);
  return tempFilePath;
}
