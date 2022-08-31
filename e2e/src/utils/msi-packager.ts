import * as fs from 'fs-extra';
import * as path from 'path';

import { MSICreator, MSICreatorOptions } from '../../../lib/index';

export const HARNESS_APP_DIR = path.join(__dirname, '../../../harness/app');
export const OUT_DIR = path.join(__dirname, '../../out');
export const defaultMsiOptions: MSICreatorOptions = {
  appDirectory: HARNESS_APP_DIR,
  exe: 'HelloWix.exe',
  manufacturer: 'Wix Technologies',
  name: 'HelloWix',
  icon: path.join(HARNESS_APP_DIR, '../HelloWix.ico'),
  outputDirectory: OUT_DIR,
  description: 'A hello wix package',
  ui: {
    chooseDirectory: true
  },
  version: '1.2.3-beta',
  upgradeCode: '90E8ABD6-B284-4495-81F7-4913E25A6FA3',
};


async function clean() {
  await fs.ensureDir(HARNESS_APP_DIR);
  await fs.emptyDir(OUT_DIR);
}

export async function createMsiPackage(options: MSICreatorOptions = defaultMsiOptions) {
  const msiCreator = new MSICreator(options);

  await clean();
  await msiCreator.create();
  await msiCreator.compile();
}
