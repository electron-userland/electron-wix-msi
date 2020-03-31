const path = require('path');
const fs = require('fs-extra');

const { MSICreator } = require('../lib/index');

const APP_DIR = path.join(__dirname, 'app');
const OUT_DIR = path.join(__dirname, 'out');

async function clean() {
  await fs.ensureDir(APP_DIR);
  await fs.emptyDir(OUT_DIR);
}

async function harness() {
  const msiCreator = new MSICreator({
    appDirectory: APP_DIR,
    exe: 'HelloWix.exe',
    manufacturer: 'Wix Technologies',
    name: 'HelloWix',
    appIconPath: path.join(APP_DIR, '../HelloWix.ico'),
    outputDirectory: OUT_DIR,
    description: 'A hello wix package',
    ui: {
      chooseDirectory: true
    },
    version: '1.2.3-beta',
    upgradeCode: '90E8ABD6-B284-4495-81F7-4913E25A6FA3',
    features: {
      autoUpdate: true
    },
  });

  await clean();
  await msiCreator.create();
  await msiCreator.compile();
}

harness();
