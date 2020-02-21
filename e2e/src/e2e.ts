import * as expect from 'expect';
import * as fs from 'fs-extra';
import path = require('path');
import { OUT_DIR, packageSampleApp } from './utils/packager';

describe('MSI packaging', () =>  {
    it('creates a package', async () => {
      await packageSampleApp();
      const msiPath = path.join(OUT_DIR, 'HelloWix.msi');
      expect(fs.pathExistsSync(msiPath)).toBeTruthy();
    });
});
