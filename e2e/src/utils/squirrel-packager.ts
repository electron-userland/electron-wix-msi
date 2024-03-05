import { createWindowsInstaller, Options } from "electron-winstaller";
import fs from "fs-extra";
import path from "path";

export interface SquirrelOptions extends Options {
  arch: "x64" | "ia64" | "x86";
}

export const OUT_SQRL_DIR = path.join(__dirname, "../../outsqrl");

export const defaultSquirrelOptions: SquirrelOptions = {
  appDirectory: path.join(__dirname, "../../../harness/app"),
  outputDirectory: OUT_SQRL_DIR,
  authors: "Wix Technologies",
  exe: "HelloWix.exe",
  noMsi: true,
  name: "HelloWix",
  usePackageJson: false,
  version: "1.2.3-beta",
  title: "HelloWix",
  description: "A hello wix package",
  arch: "x86",
};

export const cleanSquirrelOutDir = () => {
  fs.emptyDirSync(OUT_SQRL_DIR);
};

export const createSquirrelPackage = async (options: Options) => {
  const templatePath = path.join(
    __dirname,
    "../../templates/template.nuspectemplate",
  );
  const targetTemplatePath = path.join(
    __dirname,
    "../../node_modules/electron-winstaller/template.nuspectemplate",
  );
  fs.copyFileSync(templatePath, targetTemplatePath);
  await createWindowsInstaller(options);
  // cleanup Squirrel.exe that gets copied by winstaller
  const squirrelExe = path.join(options.appDirectory, "Squirrel.exe");
  fs.unlinkSync(squirrelExe);
};
