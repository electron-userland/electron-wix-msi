"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function hasCandle() {
    return hasBinary('candle -?');
}
exports.hasCandle = hasCandle;
function hasLight() {
    return hasBinary('light -?');
}
exports.hasLight = hasLight;
function hasBinary(cmd) {
    try {
        const { execSync } = require('child_process');
        const help = execSync(cmd).toString();
        const version = findVersion(help);
        const result = { has: !!help, version };
        return result;
    }
    catch (error) {
        return { has: false, version: null };
    }
}
exports.hasBinary = hasBinary;
function findVersion(input) {
    const regex = / version (\d\.\d{1,2}\.\d{1,2}\.\d{1,6})/;
    const matched = input.match(regex);
    if (matched && matched.length > 1) {
        return matched[1];
    }
    else {
        return null;
    }
}
//# sourceMappingURL=detect-wix.js.map