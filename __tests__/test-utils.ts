const oldPlatform = process.platform;

export function resetPlatform() {
  overridePlatform(oldPlatform);
}

export function overridePlatform(platform: string) {
  Object.defineProperty(process, 'platform', {
    value: platform
  });
}

export function isInTestMode() {
  return !!process.argv.find((x) => x.includes('jest'));
}
