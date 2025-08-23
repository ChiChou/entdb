interface SimpleTree {
  [key: string]: SimpleTree;
}

function toTree(list: string[]): SimpleTree {
  const root: SimpleTree = {};
  for (const path of list) {
    if (!path.startsWith("/")) {
      continue;
    }
    const parts = path.split("/").slice(1);
    let node = root;
    for (const part of parts) {
      if (!node[part]) {
        node[part] = {};
      }
      node = node[part];
    }
  }
  return root;
}

// merge tree.a.b.c to tree['a/b/c']
function shake(tree: SimpleTree) {
  const result: SimpleTree = {};
  for (const key in tree) {
    const child = tree[key];
    const shakenChild = shake(child);
    const childKeys = Object.keys(shakenChild);
    if (childKeys.length === 1) {
      const grandChildKey = childKeys[0];
      result[`${key}/${grandChildKey}`] = shakenChild[grandChildKey];
    } else {
      result[key] = shakenChild;
    }
  }
  return result;
}

export interface TreeWithFullPath {
  [key: string]: TreeWithFullPath | string;
}

// change leaft node to full path
function finalize(tree: SimpleTree, prefix = ""): TreeWithFullPath {
  const keys = Object.keys(tree);
  const result: TreeWithFullPath = {};
  for (const key of keys) {
    const path = prefix + "/" + key;
    const child = tree[key];

    result[key] =
      Object.keys(child).length === 0
        ? path
        : (finalize(tree[key], path) as TreeWithFullPath);
  }
  return result;
}

export default function filesToTree(list: string[]): TreeWithFullPath {
  const tree1 = toTree(list);
  const tree2 = shake(tree1);
  const tree3 = finalize(tree2);
  return tree3;
}
