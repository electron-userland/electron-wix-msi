import * as mockFs from 'mock-fs';

import { getTempFilePath, getTempPath } from '../../src/utils/fs-helper';
import { getMockFileSystem } from '../mocks/mock-fs';
import { overridePlatform, resetPlatform } from '../test-utils';

import * as fs from 'fs-extra';

const mkdtempSyncMock = jest.fn();
Object.defineProperty(fs, 'mkdtempSync', {
  value: mkdtempSyncMock
});

const originalTmp = process.env.TEMP;
const S = process.platform === 'win32' ? '\\' : '/';

const tests = [
  { case: '1', TEMP: 'C:\\tmp', TMPDIR: 'C:\\tmp', platform: 'win32', regex: /C:\\tmp\\hello.*\.exe/ },
  { case: '2', TEMP: undefined, TMPDIR: 'C:\\tmp', platform: 'win32', regex: /C:\\tmp\\hello.*\.exe/ },
  { case: '3', TEMP: undefined, TMPDIR: undefined, platform: 'darwin', regex: `\\${S}tmp\\${S}hello.*\.exe` },
];

beforeAll(() => {
  // console.log call needed as workaround to make jest work with mock-fs
  console.log('');
});

beforeEach(() => {
  getMockFileSystem();
  mockFs(getMockFileSystem());
});

afterAll(() => {
  process.env.TEMP = originalTmp;
});

afterEach(() => {
    mockFs.restore();
});

tests.forEach((config) => {
  it(`gets a temp file path (case:${config.case})`, () => {
    overridePlatform(config.platform);
    if (config.TEMP) { process.env.TEMP = config.TEMP; } else { delete process.env.TEMP; }
    if (config.TMPDIR) { process.env.TMPDIR = config.TMPDIR; } else { delete process.env.TMPDIR; }
    const S2 = process.platform === 'win32' ? '\\' : '/';
    mkdtempSyncMock.mockReturnValueOnce(getTempPath() + `${S2}helloXXXX`);

    const { tempFolderPath, tempFilePath } = getTempFilePath('hello', 'exe');

    expect(tempFilePath.startsWith(tempFolderPath)).toBeTruthy();
    const rx = new RegExp(config.regex);
    expect(rx.test(tempFilePath)).toBeTruthy();
    resetPlatform();
  });
});
