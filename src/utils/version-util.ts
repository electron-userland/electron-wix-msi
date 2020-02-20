import * as semver from 'semver';
import { isNumber } from 'util';

function isWindowsCompliant(version: string): boolean {
  const versionArray = version.split('.');
  if (versionArray.length !== 4) {
   return false;
  }

  for (let i = 0; i < 4; i++) {
    if (isNaN(Number(versionArray[i]))) {
      return false;
    }
  }

  return true;
}

/**
 * Takes a semantic version number (2.3.1-alpha234234234) and returns
 * something more Windows-compatible (2.3.1.0).
 *
 * @param {string} input
 * @returns {string}
 */
export function getWindowsCompliantVersion(input: string): string {
  if (isWindowsCompliant(input)) {
    return input;
  }

  const parsed = semver.parse(input);
  if (parsed) {
    return `${parsed.major}.${parsed.minor}.${parsed.patch}.0`;
  } else {
    throw new Error('Could not parse semantic version input string');
  }
}
