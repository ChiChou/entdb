import fs from 'fs';
import zlib from 'zlib';

const txt = fs.readFileSync("sample.txt", "utf8");

// txt content is a list of unix paths
// e.g.:
//  /usr/local/bin/foo
//  /usr/local/bin/bar
//
// write a function that put the paths in a tree:
// {
//  "usr": {
//    "local": {
//      "bin": {
//       "foo": 1,
//       "bar": 1
//      }
//    }
// }

interface TreeNode {
  [key: string]: TreeNode | 1;
}

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = {};

  for (const path of paths) {
    const parts = path.split('/').filter(Boolean); // Split by '/' and remove empty parts
    let current = root;

    for (const part of parts) {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part] as TreeNode;
    }

    const basename = parts[parts.length - 1];
    if (basename) { // leaf node
      current[basename] = 1;
    }
  }

  return root;
}

const tree = buildTree(txt.split('\n'));
const optimized = JSON.stringify(tree);

console.log("original:", zlib.gzipSync(txt).length);
console.log("optimized:", zlib.gzipSync(optimized).length);
