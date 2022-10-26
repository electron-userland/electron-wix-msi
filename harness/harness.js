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
    icon: path.join(APP_DIR, '../HelloWix.ico'),
    outputDirectory: OUT_DIR,
    description: 'A hello wix package',
    toastActivatorClsid: '808ba5f6-12a4-4175-8cfe-9c10a6b1bab6',
    ui: {
      chooseDirectory: true
    },
    version: '1.2.3-beta',
    upgradeCode: '90E8ABD6-B284-4495-81F7-4913E25A6FA3',
    features: {
      autoUpdate: true,
      autoLaunch: {
        enabled: true,
        arguments: ['arg1', 'arg2']
      },
    },
  });

  await clean();
  await msiCreator.create();
  await msiCreator.compile();
}

harness();
