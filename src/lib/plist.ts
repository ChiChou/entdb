type PlistValue =
  | string
  | number
  | boolean
  | PlistValue[]
  | { [key: string]: PlistValue };

export function plistToJson(xml: string): { [key: string]: PlistValue } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const rootDict = doc.querySelector("plist > dict");
  if (!rootDict) return {};
  return parseDict(rootDict);
}

function parseDict(dict: Element): { [key: string]: PlistValue } {
  const result: { [key: string]: PlistValue } = {};
  const children = Array.from(dict.children);
  for (let i = 0; i < children.length; i += 2) {
    const keyEl = children[i];
    const valueEl = children[i + 1];
    if (keyEl?.tagName === "key" && valueEl) {
      result[keyEl.textContent || ""] = parseValue(valueEl);
    }
  }
  return result;
}

function parseValue(el: Element): PlistValue {
  switch (el.tagName) {
    case "string":
      return el.textContent || "";
    case "integer":
      return parseInt(el.textContent || "0", 10);
    case "real":
      return parseFloat(el.textContent || "0");
    case "true":
      return true;
    case "false":
      return false;
    case "array":
      return Array.from(el.children).map(parseValue);
    case "dict":
      return parseDict(el);
    case "data":
      return el.textContent || "";
    default:
      return el.textContent || "";
  }
}

export function jsonToPlistXml(
  obj: { [key: string]: PlistValue },
  indent = 0,
): string {
  const pad = "  ".repeat(indent);
  const keys = Object.keys(obj).sort();
  const lines: string[] = [];

  for (const key of keys) {
    lines.push(`${pad}<key>${escapeXml(key)}</key>`);
    lines.push(valueToXml(obj[key], indent));
  }

  return lines.join("\n");
}

function valueToXml(val: PlistValue, indent: number): string {
  const pad = "  ".repeat(indent);

  if (val === true) return `${pad}<true/>`;
  if (val === false) return `${pad}<false/>`;
  if (typeof val === "string") return `${pad}<string>${escapeXml(val)}</string>`;
  if (typeof val === "number") {
    return Number.isInteger(val)
      ? `${pad}<integer>${val}</integer>`
      : `${pad}<real>${val}</real>`;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return `${pad}<array/>`;
    const items = val.map((v) => valueToXml(v, indent + 1)).join("\n");
    return `${pad}<array>\n${items}\n${pad}</array>`;
  }
  if (typeof val === "object") {
    const inner = jsonToPlistXml(val, indent + 1);
    if (!inner) return `${pad}<dict/>`;
    return `${pad}<dict>\n${inner}\n${pad}</dict>`;
  }
  return `${pad}<string>${escapeXml(String(val))}</string>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function normalizePlist(xml: string): string {
  const json = plistToJson(xml);
  const body = jsonToPlistXml(json, 2);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<plist version="1.0">',
    "  <dict>",
    body,
    "  </dict>",
    "</plist>",
  ].join("\n");
}

export interface PlistDiff {
  added: string[];
  removed: string[];
  changed: string[];
  unchanged: string[];
}

export function diffPlistKeys(oldXml: string, newXml: string): PlistDiff {
  const oldJson = plistToJson(oldXml);
  const newJson = plistToJson(newXml);

  const oldKeys = new Set(Object.keys(oldJson));
  const newKeys = new Set(Object.keys(newJson));

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  const unchanged: string[] = [];

  const allKeys = new Set([...oldKeys, ...newKeys]);

  for (const key of allKeys) {
    const inOld = oldKeys.has(key);
    const inNew = newKeys.has(key);

    if (!inOld && inNew) {
      added.push(key);
    } else if (inOld && !inNew) {
      removed.push(key);
    } else {
      if (JSON.stringify(oldJson[key]) === JSON.stringify(newJson[key])) {
        unchanged.push(key);
      } else {
        changed.push(key);
      }
    }
  }

  return { added, removed, changed, unchanged };
}

export interface KeyDiffEntry {
  key: string;
  type: "added" | "removed" | "changed" | "context";
  oldXml?: string;
  newXml?: string;
}

function serializeKeyValue(key: string, value: PlistValue): string {
  const keyLine = `<key>${escapeXml(key)}</key>`;
  const valueLine = valueToXml(value, 0);
  return `${keyLine}\n${valueLine}`;
}

export function computeKeyLevelDiff(
  oldXml: string,
  newXml: string,
  contextCount = 1
): KeyDiffEntry[] {
  const oldJson = plistToJson(oldXml);
  const newJson = plistToJson(newXml);

  const oldKeys = new Set(Object.keys(oldJson));
  const newKeys = new Set(Object.keys(newJson));

  // Sorted keys list (union of both)
  const sortedKeys = [...new Set([...oldKeys, ...newKeys])].sort();

  // Categorize each key
  const added = new Set<string>();
  const removed = new Set<string>();
  const changed = new Set<string>();

  for (const key of sortedKeys) {
    const inOld = oldKeys.has(key);
    const inNew = newKeys.has(key);

    if (!inOld && inNew) {
      added.add(key);
    } else if (inOld && !inNew) {
      removed.add(key);
    } else if (JSON.stringify(oldJson[key]) !== JSON.stringify(newJson[key])) {
      changed.add(key);
    }
  }

  const changedSet = new Set([...added, ...removed, ...changed]);

  // Determine which keys need to be shown as context
  const contextKeys = new Set<string>();
  for (let i = 0; i < sortedKeys.length; i++) {
    if (changedSet.has(sortedKeys[i])) {
      for (let j = Math.max(0, i - contextCount); j <= Math.min(sortedKeys.length - 1, i + contextCount); j++) {
        if (!changedSet.has(sortedKeys[j])) {
          contextKeys.add(sortedKeys[j]);
        }
      }
    }
  }

  // Build result entries
  const result: KeyDiffEntry[] = [];
  const includeKeys = new Set([...changedSet, ...contextKeys]);
  let lastIncludedIdx = -1;

  for (let i = 0; i < sortedKeys.length; i++) {
    const key = sortedKeys[i];
    if (!includeKeys.has(key)) continue;

    // Add ellipsis marker if there's a gap
    if (lastIncludedIdx !== -1 && i - lastIncludedIdx > 1) {
      result.push({ key: "···", type: "context" });
    }
    lastIncludedIdx = i;

    if (added.has(key)) {
      result.push({
        key,
        type: "added",
        newXml: serializeKeyValue(key, newJson[key]),
      });
    } else if (removed.has(key)) {
      result.push({
        key,
        type: "removed",
        oldXml: serializeKeyValue(key, oldJson[key]),
      });
    } else if (changed.has(key)) {
      result.push({
        key,
        type: "changed",
        oldXml: serializeKeyValue(key, oldJson[key]),
        newXml: serializeKeyValue(key, newJson[key]),
      });
    } else {
      // Context key - present in both, show old (they're equal)
      result.push({
        key,
        type: "context",
        oldXml: serializeKeyValue(key, oldJson[key]),
        newXml: serializeKeyValue(key, newJson[key]),
      });
    }
  }

  return result;
}
