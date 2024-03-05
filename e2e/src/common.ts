import expect from "expect.js";
import * as fs from "fs-extra";
import hasha from "hasha";
import path from "path";

export const expectSameFolderContent = (folderA: string, folderB: string) => {
  const folderContent = fs.readdirSync(folderA);

  folderContent.forEach(async (item) => {
    const itemPathA = path.join(folderA, item);
    const itemPathB = path.join(folderB, item);
    expect(fs.pathExistsSync(itemPathB)).ok();
    if (fs.lstatSync(itemPathA).isDirectory()) {
      expectSameFolderContent(itemPathA, itemPathB);
    } else {
      const hashA = hasha.fromFileSync(itemPathA);
      const hashB = hasha.fromFileSync(itemPathB);
      expect(hashA).to.be(hashB);
    }
  });
};
