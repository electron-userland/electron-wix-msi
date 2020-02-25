import * as expect from 'expect';
import * as fs from 'fs-extra';
import path = require('path');
import { install as install } from './utils/installer';
import { OUT_DIR, packageSampleApp } from './utils/packager';

const msiPath = path.join(OUT_DIR, 'HelloWix.msi');

describe('MSI packaging', () =>  {
    it('creates a package', async () => {
      await packageSampleApp();
      expect(fs.pathExistsSync(msiPath)).toBeTruthy();
    });
});

describe('Installing', () =>  {
  it('installs', async () => {
   await install(msiPath);
  });

  it('has all files in program files', () => {
    console.log(process.env['ProgramFiles(x86)']);
    const appfolder = path.join(process.env['ProgramFiles(x86)']!, 'HelloWix');
    const stubPath = path.join(appfolder, 'hellowix.exe');
    expect(fs.pathExistsSync(stubPath)).toBeTruthy();
  });
});
