import { getWindowsCompliantVersion } from "../../src/utils/version-util";

test('gives a Windows compliant version if it is 3 number version',() => {
  expect(getWindowsCompliantVersion('1.2.3')).toBe('1.2.3.0');
});

test('gives a Windows compliant version if it is already complaint',() => {
  expect(getWindowsCompliantVersion('1.2.3.444')).toBe('1.2.3.444');
});

test('gives a Windows compliant version if it is a alpha version',() => {
  expect(getWindowsCompliantVersion('1.2.3-alpha')).toBe('1.2.3.0');
});

test('gives a Windows compliant version if it is a beta version',() => {
  expect(getWindowsCompliantVersion('1.2.3-beta')).toBe('1.2.3.0');
});

test('throws when an invalid version string is given',() => {
  expect(() => getWindowsCompliantVersion('1.2.3.what')).toThrow();
  expect(() => getWindowsCompliantVersion('1.2.3.beta')).toThrow();
  expect(() => getWindowsCompliantVersion('1.2')).toThrow();
  expect(() => getWindowsCompliantVersion('notaversion')).toThrow();
});
