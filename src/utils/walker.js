"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const gfs = require("graceful-fs");
const klaw = require("klaw");
function getDirectoryStructure(root) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(root)) {
            return reject(new Error(`App directory ${root} does not exist`));
        }
        const files = [];
        const directories = [];
        klaw(root, { fs: gfs })
            .on('data', (item) => {
            if (item.stats.isFile()) {
                files.push(item.path);
            }
            else if (item.stats.isDirectory() && item.path !== root) {
                directories.push(item.path);
            }
        })
            .on('end', () => resolve({ files, directories }));
    });
}
exports.getDirectoryStructure = getDirectoryStructure;
//# sourceMappingURL=walker.js.map