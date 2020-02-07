"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debug = require('debug')('electron-wix-msi');
function spawnPromise(name, args, options) {
    return new Promise((resolve) => {
        const { spawn } = require('child_process');
        const fork = spawn(name, args, options);
        debug(`Spawning ${name} with ${args}`);
        let stdout = '';
        let stderr = '';
        fork.stdout.on('data', (data) => {
            debug(`Spawn ${name} stdout: ${data}`);
            stdout += data;
        });
        fork.stderr.on('data', (data) => {
            debug(`Spawn ${name} stderr: ${data}`);
            stderr += data;
        });
        fork.on('close', (code) => {
            debug(`Spawn ${name}: Child process exited with code ${code}`);
            resolve({ stdout, stderr, code });
        });
    });
}
exports.spawnPromise = spawnPromise;
//# sourceMappingURL=spawn.js.map