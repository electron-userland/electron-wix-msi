import * as semver from 'semver';

/**
 * Takes a semantic version number (2.3.1.alpha234234234) and returns
 * something more Windows-compatible (2.3.1.0).
 *
 * @param {string} input
 * @returns {string}
 */
export function getWindowsCompliantVersion(input: string): string {
  const parsed = semver.parse(input);

  if (parsed) {
    return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  } else {
    throw new Error('Could not parse semantic version input string');
  }
}
