/**
 * Entitlement values as filterable "atoms": the scalars a value is made of.
 *
 *   true                         -> ["true"]
 *   "group.com.apple.notes"      -> ["group.com.apple.notes"]
 *   ["kTCCServiceCamera", ...]   -> one atom per item
 *   {"a": true, "b": ["x"]}      -> "a", "b", "x" (dict keys and leaf values)
 *
 * Most interesting values are arrays (tcc.allow, mach-lookup names, keychain
 * groups), so filtering by atom reads as "contains", and for scalars it reads
 * as "equals". Strings are bare; other scalars are their JSON ("true", "1").
 */

export function atomOf(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function collect(value: unknown, out: Set<string>) {
  if (Array.isArray(value)) {
    for (const item of value) collect(item, out);
  } else if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      out.add(key);
      collect(item, out);
    }
  } else {
    out.add(atomOf(value));
  }
}

const atomCache = new WeakMap<object, Set<string>>();

/** Distinct atoms of a value (cached for arrays and dicts). */
export function valueAtoms(value: unknown): Set<string> {
  if (value === null || typeof value !== "object") {
    return new Set([atomOf(value)]);
  }
  let atoms = atomCache.get(value);
  if (!atoms) {
    atoms = new Set();
    collect(value, atoms);
    atomCache.set(value, atoms);
  }
  return atoms;
}

/** Whether a value contains every selected atom. */
export function matchesAtoms(value: unknown, selected: readonly string[]) {
  if (selected.length === 0) return true;
  const atoms = valueAtoms(value);
  return selected.every((atom) => atoms.has(atom));
}

export interface AtomCount {
  atom: string;
  count: number;
}

/** How many of `values` contain each atom, most common first. */
export function countAtoms(values: Iterable<unknown>): AtomCount[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    for (const atom of valueAtoms(value)) {
      counts.set(atom, (counts.get(atom) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([atom, count]) => ({ atom, count }))
    .sort((a, b) => b.count - a.count || a.atom.localeCompare(b.atom));
}

/** Whether every value is the same, e.g. `true` everywhere. */
export function isUniform(values: Iterable<unknown>) {
  let first: string | undefined;
  for (const value of values) {
    const json = JSON.stringify(value);
    if (first === undefined) first = json;
    else if (json !== first) return false;
  }
  return true;
}
