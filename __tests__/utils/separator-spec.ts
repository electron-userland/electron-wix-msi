import { overridePlatform, resetPlatform } from '../test-utils';

afterEach(() => {
  jest.resetModules();
});

afterAll(() => {
  resetPlatform();
});

test('separator returns the correct separator for win32', () => {
  let separator;

  overridePlatform('win32');
  separator = require('../../src/utils/separator').separator;
  expect(separator).toBe('\\');
});

test('separator returns the correct separator for unix', () => {
  let separator;

  overridePlatform('linux');
  separator = require('../../src/utils/separator').separator;
  expect(separator).toBe('/');
});
