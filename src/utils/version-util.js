"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const semver = require("semver");
function getWindowsCompliantVersion(input) {
    const parsed = semver.parse(input);
    if (parsed) {
        return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
    }
    else {
        throw new Error('Could not parse semantic version input string');
    }
}
exports.getWindowsCompliantVersion = getWindowsCompliantVersion;
//# sourceMappingURL=version-util.js.map