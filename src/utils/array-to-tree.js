"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const path = require("path");
const separator_1 = require("./separator");
function isDirectChild(parent, possibleChild) {
    if (!isChild(parent, possibleChild)) {
        return false;
    }
    const parentSplit = parent.split(separator_1.separator);
    const childSplit = possibleChild.split(separator_1.separator);
    return (parentSplit.length === childSplit.length - 1);
}
exports.isDirectChild = isDirectChild;
function isChild(parent, possibleChild) {
    return possibleChild.startsWith(`${parent}${separator_1.separator}`) && parent !== possibleChild;
}
exports.isChild = isChild;
function arrayToTree(input, root, appVersion) {
    const output = {
        __ELECTRON_WIX_MSI_FILES__: [],
        __ELECTRON_WIX_MSI_PATH__: root,
        __ELECTRON_WIX_MSI_DIR_NAME__: path.basename(root)
    };
    let entryPoint = output;
    if (appVersion) {
        const versionNode = {
            __ELECTRON_WIX_MSI_FILES__: [],
            __ELECTRON_WIX_MSI_PATH__: root,
            __ELECTRON_WIX_MSI_DIR_NAME__: `app-${appVersion}`
        };
        output[`app-${appVersion}`] = versionNode;
        entryPoint = versionNode;
    }
    const children = input.filter((e) => isChild(root, e));
    const directChildren = children.filter((e) => isDirectChild(root, e));
    directChildren.forEach((directChild) => {
        entryPoint[path.basename(directChild)] = arrayToTree(children, directChild);
    });
    return output;
}
exports.arrayToTree = arrayToTree;
function addFilesToTree(tree, files, root, executableName, stubExecutablePath, appVersion) {
    const output = lodash_1.cloneDeep(tree);
    output.__ELECTRON_WIX_MSI_FILES__.push({ name: `${executableName}.exe`, path: stubExecutablePath });
    files.forEach((filepath) => {
        const file = { name: path.basename(filepath), path: filepath };
        const walkingSteps = filepath.split(separator_1.separator);
        let target = output[`app-${appVersion}`];
        if (walkingSteps[0] === root) {
            walkingSteps.splice(0, 1);
        }
        walkingSteps.forEach((step, i) => {
            if (target[step] && i < walkingSteps.length - 1) {
                target = target[step];
                return;
            }
            if (i === walkingSteps.length - 1) {
                target.__ELECTRON_WIX_MSI_FILES__.push(file);
            }
        });
    });
    return output;
}
exports.addFilesToTree = addFilesToTree;
//# sourceMappingURL=array-to-tree.js.map