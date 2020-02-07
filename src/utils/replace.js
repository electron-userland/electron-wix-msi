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
const fs = require("fs-extra");
function replaceToFile(input, target, replacements) {
    return __awaiter(this, void 0, void 0, function* () {
        const output = replaceInString(input, replacements);
        yield fs.outputFile(target, output, 'utf-8');
        return output;
    });
}
exports.replaceToFile = replaceToFile;
function replaceInString(source, replacements) {
    let output = source;
    Object.keys(replacements).forEach((key) => {
        const regex = new RegExp(key, 'g');
        output = output.replace(regex, replacements[key]);
    });
    return output;
}
exports.replaceInString = replaceInString;
//# sourceMappingURL=replace.js.map