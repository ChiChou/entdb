/**
 * Namespace tree for dotted entitlement keys (mostly reverse-DNS, e.g.
 * `com.apple.private.security.no-sandbox`).
 *
 * A key's namespaces are its proper prefixes: `com`, `com.apple`, ... up to
 * `com.apple.private.security`. Only real namespaces appear, never synthetic
 * groupings, so a key is always found under the folders its name spells out.
 *
 * - Namespaces holding fewer than `minGroup` keys are not shown; their keys
 *   are still listed under the nearest shown ancestor.
 * - Single-child chains without keys of their own are merged
 *   (`com` > `apple` becomes `com.apple`).
 */

export interface NamespaceNode {
  /** Full namespace, `""` for the root. Unique within the tree. */
  ns: string;
  /** Display name relative to the parent; may contain dots after merging. */
  label: string;
  children: NamespaceNode[];
  /** Keys inside this namespace (at any depth). */
  count: number;
  /** Keys inside for which `isMarked` returned true (diff "new"). */
  marked: number;
}

interface Trie {
  children: Map<string, Trie>;
  count: number;
  marked: number;
}

export interface NamespaceTreeOptions {
  /** Namespaces with fewer keys than this are folded into their parent. */
  minGroup?: number;
  isMarked?: (key: string) => boolean;
}

const collator = new Intl.Collator(undefined, { sensitivity: "base" });

export function buildNamespaceTree(
  keys: string[],
  { minGroup = 3, isMarked }: NamespaceTreeOptions = {},
): NamespaceNode {
  const root: Trie = { children: new Map(), count: 0, marked: 0 };
  for (const key of keys) {
    const mark = isMarked?.(key) ? 1 : 0;
    root.count++;
    root.marked += mark;
    const parts = key.split(".");
    let node = root;
    // The last segment is the key's own name, not a namespace.
    for (let i = 0; i < parts.length - 1; i++) {
      let next = node.children.get(parts[i]);
      if (!next) {
        next = { children: new Map(), count: 0, marked: 0 };
        node.children.set(parts[i], next);
      }
      next.count++;
      next.marked += mark;
      node = next;
    }
  }

  const toNode = (trie: Trie, ns: string, label: string): NamespaceNode => {
    const children: NamespaceNode[] = [];
    for (const [part, child] of trie.children) {
      if (child.count < minGroup) continue;
      children.push(toNode(child, ns ? `${ns}.${part}` : part, part));
    }
    children.sort((a, b) => collator.compare(a.label, b.label));

    // Merge `com` > `apple` into `com.apple` when `com` adds nothing.
    if (ns && children.length === 1 && children[0].count === trie.count) {
      const [only] = children;
      return { ...only, label: `${label}.${only.label}` };
    }
    return { ns, label, children, count: trie.count, marked: trie.marked };
  };

  return toNode(root, "", "");
}

/** Whether `key` lies inside namespace `ns` (the root contains everything). */
export function inNamespace(key: string, ns: string) {
  return ns === "" || key.startsWith(`${ns}.`);
}

/** The node for `ns`, or undefined when it isn't shown in the tree. */
export function findNamespace(
  tree: NamespaceNode,
  ns: string,
): NamespaceNode | undefined {
  if (tree.ns === ns) return tree;
  for (const child of tree.children) {
    if (ns === child.ns || ns.startsWith(`${child.ns}.`)) {
      return findNamespace(child, ns);
    }
  }
  return undefined;
}

/** Nodes from the root down to `ns` (inclusive), as shown in the tree. */
export function namespacePath(
  tree: NamespaceNode,
  ns: string,
): NamespaceNode[] {
  const path = [tree];
  let node = tree;
  while (node.ns !== ns) {
    const next = node.children.find(
      (child) => ns === child.ns || ns.startsWith(`${child.ns}.`),
    );
    if (!next) return [];
    path.push(next);
    node = next;
  }
  return path;
}

/** Every namespace id in the tree except the root. */
export function allNamespaces(
  node: NamespaceNode,
  out: string[] = [],
): string[] {
  for (const child of node.children) {
    out.push(child.ns);
    allNamespaces(child, out);
  }
  return out;
}
