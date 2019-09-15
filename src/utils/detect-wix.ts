const path = require('path');

export interface HasBinaryResult {
  has: boolean;
  version: string | null;
}

/**
 * Does the system have candle.exe installed?
 *
 * @returns {HasBinaryResult}
 */
export function hasCandle(): HasBinaryResult {
  let result = hasBinary('candle -?');
  if (!result.has) {
    result = hasBinary(`"${path.join(process.env.WIX, 'bin', 'candle.exe')}"`);
  }

  console.log('Using WiX environment variable');
  return result;
}

/**
 * Does the system have light.exe installed?
 *
 * @returns {HasBinaryResult}
 */
export function hasLight(): HasBinaryResult {
  let result = hasBinary('light -?');
  if (!result.has) {
    result = hasBinary(`"${path.join(process.env.WIX, 'bin', 'light.exe')}"`);
  }
  console.log('Using WiX environment variable');
  return result;
}

/**
 * Does the system have a given binary? Let's find out!
 *
 * @param {string} cmd
 * @returns {HasBinaryResult}
 */
export function hasBinary(cmd: string): HasBinaryResult {
  try {
    const { execSync } = require('child_process');
    const help = execSync(cmd).toString();
    const version = findVersion(help);

    const result = { has: !!help, version };
    return result;
  } catch (error) {
    return { has: false, version: null };
  }
}

/**
 * Find the version string in an input string - specifically,
 * the output from a Wix help cli command.
 *
 * @param {string} input
 * @returns {(string | null)}
 */
function findVersion(input: string): string | null {
  const regex = / version (\d\.\d{1,2}\.\d{1,2}\.\d{1,6})/;
  const matched = input.match(regex);

  if (matched && matched.length > 1) {
    return matched[1];
  } else {
    return null;
  }
}
