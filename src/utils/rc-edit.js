"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const exe_icon_extractor_1 = require("exe-icon-extractor");
const fs = require("fs-extra");
const path = require("path");
const rcedit = require("rcedit");
const rcinfo = require("rcinfo");
function getFileInfo(exePath) {
    const promise = new Promise((resolve, reject) => {
        rcinfo(exePath, (error, info) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(info);
            }
        });
    });
    return promise;
}
function extractIconFromApp(exePath, tempFolder) {
    return __awaiter(this, void 0, void 0, function* () {
        const buffer = exe_icon_extractor_1.extractIcon(exePath, 'large');
        const iconPath = path.join(tempFolder, 'app.ico');
        yield fs.writeFile(iconPath, buffer);
        return iconPath;
    });
}
function createStubExe(appDirectory, exe, icon) {
    return __awaiter(this, void 0, void 0, function* () {
        const tempPath = process.env.TEMP || process.env.TMPDIR || '/tmp';
        const tempFolder = yield fs.mkdtemp(path.join(tempPath, exe));
        const subbedExePath = path.join(tempFolder, `${exe}.exe`);
        const stubPath = path.join(__dirname, '..\\..\\vendor\\StubExecutable.exe');
        yield fs.copyFile(stubPath, subbedExePath);
        const appExe = path.join(appDirectory, `${exe}.exe`);
        let appIconPath;
        if (!icon) {
            appIconPath = yield extractIconFromApp(appExe, path.join(tempFolder));
        }
        const rcInfo = yield getFileInfo(appExe);
        const rcOptions = {
            'version-string': {
                CompanyName: rcInfo.CompanyName,
                FileDescription: rcInfo.FileDescription,
                LegalCopyright: rcInfo.LegalCopyright,
                ProductName: rcInfo.ProductName
            },
            'file-version': rcInfo.FileVersion,
            'product-version': rcInfo.ProductVersion,
            'icon': icon || appIconPath
        };
        yield rcedit(subbedExePath, rcOptions);
        return subbedExePath;
    });
}
exports.createStubExe = createStubExe;
//# sourceMappingURL=rc-edit.js.map