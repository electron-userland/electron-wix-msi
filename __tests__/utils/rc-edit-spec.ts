
import { extractIcon } from 'exe-icon-extractor';
import * as mockFs from 'mock-fs';

import { separator as S } from '../../src/utils/separator';
import { getMockFileSystem } from '../mocks/mock-fs';

const rcinfoMock = jest.fn();
const rceditMock = jest.fn();
jest.mock('rcedit', () => rceditMock);
jest.mock('rcinfo', () => rcinfoMock);

import { createStubExe } from '../../src/utils/rc-edit';
import { overridePlatform, resetPlatform } from '../test-utils';

const originalTmp = process.env.TEMP;
const acmeIconRegex = process.platform === 'win32' ? /C:\\tmp\\acme.*\\app\.ico/ : /\/tmp\/acme.*\/app\.ico/;
const acmeExeRegex = process.platform === 'win32' ? /C:\\tmp\\acme.*\\acme\.exe/ : /\/tmp\/acme.*\/acme\.exe/;
const acmeFileInfo = { 'version-string':
  { CompanyName: 'acme corp',
    FileDescription: 'a test',
    LegalCopyright: '2020@acme corp',
    ProductName: 'acme' },
  'file-version': '1.2.3',
  'product-version': '1.2.3',
  icon: expect.stringMatching(acmeIconRegex) };

beforeAll(() => {
  // console.log call needed as workaround to make jest work with mock-fs
  console.log('');
  process.env.TEMP = process.platform === 'win32' ? 'C:\\tmp' : '/tmp';
  getMockFileSystem();
  mockFs(getMockFileSystem());
});

afterAll(() => {
  mockFs.restore();
  process.env.TEMP = originalTmp;
});

afterEach(() => {
    rcinfoMock.mockReset();
    rceditMock.mockReset();
    extractIcon.mockReset();
    resetPlatform();
});

test('transfers exe file info to stub exe', async () => {
  overridePlatform('win32');
  rcinfoMock.mockImplementation((_, callback) => {
    callback(null, {
      CompanyName: 'acme corp',
      FileDescription: 'a test',
      LegalCopyright: '2020@acme corp',
      ProductName: 'acme',
      FileVersion: '1.2.3',
      ProductVersion: '1.2.3'
    });
  });

  await createStubExe(process.env.TEMP! , 'acme', 'bat-app', 'Wayne Enterprise', 'I am Batman', '3.3.3');
  expect(rcinfoMock).toBeCalledTimes(1);
  expect(rcinfoMock).toBeCalledWith(`${process.env.TEMP}${S}acme.exe`, expect.anything());
  expect(rceditMock).toBeCalledTimes(1);
  expect(rceditMock).toBeCalledWith(expect.stringMatching(acmeExeRegex), acmeFileInfo);
});

test('uses parameter if rcinfo fails', async () => {
  overridePlatform('win32');
  rcinfoMock.mockImplementation((_, callback) => {
    callback(new Error('fail'), undefined);
  });

  const wayneOptions = { 'version-string':
  { CompanyName: 'Wayne Enterprise',
    FileDescription: 'I am Batman',
    LegalCopyright: '2020@Wayne Enterprise',
    ProductName: 'bat-app' },
  'file-version': '3.3.3',
  'product-version': '3.3.3',
  icon: expect.stringMatching(acmeIconRegex) };

  await createStubExe(process.env.TEMP!, 'acme', 'bat-app', 'Wayne Enterprise', 'I am Batman', '3.3.3');
  expect(rcinfoMock).toBeCalledTimes(1);
  expect(rcinfoMock).toThrow();
  expect(rceditMock).toBeCalledTimes(1);
  expect(rceditMock).toBeCalledWith(expect.stringMatching(acmeExeRegex), wayneOptions);
});

test('uses an explicitly provided app icon for the stub exe', async () => {
  overridePlatform('win32');
  rcinfoMock.mockImplementation((_, callback) => {
    callback(null, {
      CompanyName: 'acme corp',
      FileDescription: 'a test',
      LegalCopyright: '2020@acme corp',
      ProductName: 'acme',
      FileVersion: '1.2.3',
      ProductVersion: '1.2.3'
    });
  });

  const expectedFileInfo = {
    ...acmeFileInfo,
    icon: 'C:\\temp\\nice.ico'
  };

  await createStubExe(process.env.TEMP!, 'acme', 'bat-app', 'Wayne Enterprise', 'I am Batman', '3.3.3', 'C:\\temp\\nice.ico');
  expect(rceditMock).toBeCalledWith(expect.stringMatching(acmeExeRegex), expectedFileInfo);
});

test('it users no icon if extraction fails and no explicit one is provided', async () => {
  overridePlatform('win32');
  rcinfoMock.mockImplementation((_, callback) => {
    callback(null, {
      CompanyName: 'acme corp',
      FileDescription: 'a test',
      LegalCopyright: '2020@acme corp',
      ProductName: 'acme',
      FileVersion: '1.2.3',
      ProductVersion: '1.2.3'
    });
  });

  extractIcon.mockImplementation(() => {
    throw Error('fail');
  });

  const expectedFileInfo = {
    ...acmeFileInfo,
    icon: ''
  };

  await createStubExe(process.env.TEMP!, 'acme', 'bat-app', 'Wayne Enterprise', 'I am Batman', '3.3.3');
  expect(rceditMock).toBeCalledWith(expect.stringMatching(acmeExeRegex), expectedFileInfo);
});

test('it users no icon if icon extractor module is not available', async () => {
  overridePlatform('darwin');
  rcinfoMock.mockImplementation((_, callback) => {
    callback(null, {
      CompanyName: 'acme corp',
      FileDescription: 'a test',
      LegalCopyright: '2020@acme corp',
      ProductName: 'acme',
      FileVersion: '1.2.3',
      ProductVersion: '1.2.3'
    });
  });

  const expectedFileInfo = {
    ...acmeFileInfo,
    icon: ''
  };

  await createStubExe(process.env.TEMP!, 'acme', 'bat-app', 'Wayne Enterprise', 'I am Batman', '3.3.3');
  expect(rceditMock).toBeCalledWith(expect.stringMatching(acmeExeRegex), expectedFileInfo);
});
