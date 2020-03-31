import * as mockFs from 'mock-fs';

import { getTempFilePath, getTempPath } from '../../src/utils/fs-helper';
import { getMockFileSystem } from '../mocks/mock-fs';
import { overridePlatform, resetPlatform } from '../test-utils';

import * as fs from 'fs-extra';

const mkdtempSyncMock = jest.fn(() => 'C:\\temp\\XXX');
Object.defineProperty(fs, 'mkdtempSync', {
  value: mkdtempSyncMock
});

const originalTmp = process.env.TEMP;

const tests = [
  { TEMP: 'C:\\tmp', TMPDIR: 'C:\\tmp', regex: /C:\\tmp\\hello.*\.exe/ },
  { TEMP: undefined, TMPDIR: 'C:\\tmp',  regex: /C:\\tmp\\hello.*\.exe/ },
  { TEMP: undefined, TMPDIR: undefined,  regex: /C:\\Windows\\temp\\hello.*\.exe/ },
];

beforeAll(() => {
    // console.log call needed as workaround to make jest work with mock-fs
    console.log('');
    getMockFileSystem();
    mockFs(getMockFileSystem());
  });

afterAll(() => {
    mockFs.restore();
    process.env.TEMP = originalTmp;
  });

tests.forEach((config) => {
  it(`gets a temp file path`, () => {
    overridePlatform('win32');
    if (config.TEMP) { process.env.TEMP = config.TEMP; } else { delete process.env.TEMP; }
    if (config.TMPDIR) { process.env.TMPDIR = config.TMPDIR; } else { delete process.env.TMPDIR; }

    mkdtempSyncMock.mockReturnValueOnce(getTempPath() + '\\helloXXXX');

    const { tempFolderPath, tempFilePath } = getTempFilePath('hello', 'exe');
    expect(tempFilePath.startsWith(tempFolderPath)).toBeTruthy();
    expect(config.regex.test(tempFilePath)).toBeTruthy();
    resetPlatform();
  });
});
