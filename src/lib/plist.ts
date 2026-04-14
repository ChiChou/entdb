export function parsePlist(xml: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(xml, "application/xml");
}

interface PlistEntry {
  key: string;
  value: string;
}

export function normalizePlist(xml: string): string {
  const doc = parsePlist(xml);
  const rootDict = doc.querySelector("plist > dict");
  if (!rootDict) return xml;

  const entries: PlistEntry[] = [];
  const children = Array.from(rootDict.children);

  for (let i = 0; i < children.length; i += 2) {
    const keyEl = children[i];
    const valueEl = children[i + 1];
    if (keyEl?.tagName === "key" && valueEl) {
      entries.push({
        key: keyEl.textContent || "",
        value: new XMLSerializer().serializeToString(valueEl),
      });
    }
  }

  entries.sort((a, b) => a.key.localeCompare(b.key));

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<plist version="1.0">',
    "<dict>",
    ...entries.map((e) => `<key>${e.key}</key>\n${e.value}`),
    "</dict>",
    "</plist>",
  ];

  return lines.join("\n");
}

export interface PlistDiff {
  added: string[];
  removed: string[];
  changed: string[];
  unchanged: string[];
}

export function diffPlistKeys(oldXml: string, newXml: string): PlistDiff {
  const oldKeys = extractRootKeys(oldXml);
  const newKeys = extractRootKeys(newXml);

  const oldDoc = parsePlist(oldXml);
  const newDoc = parsePlist(newXml);

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
      const oldValue = getKeyValue(oldDoc, key);
      const newValue = getKeyValue(newDoc, key);
      if (oldValue === newValue) {
        unchanged.push(key);
      } else {
        changed.push(key);
      }
    }
  }

  return { added, removed, changed, unchanged };
}

function extractRootKeys(xml: string): Set<string> {
  const doc = parsePlist(xml);
  const keys = new Set<string>();
  const rootDict = doc.querySelector("plist > dict");
  if (!rootDict) return keys;

  const keyElements = rootDict.querySelectorAll(":scope > key");
  keyElements.forEach((el) => {
    if (el.textContent) keys.add(el.textContent);
  });
  return keys;
}

function getKeyValue(doc: Document, keyName: string): string {
  const rootDict = doc.querySelector("plist > dict");
  if (!rootDict) return "";

  const keys = rootDict.querySelectorAll(":scope > key");
  for (const key of keys) {
    if (key.textContent === keyName) {
      const value = key.nextElementSibling;
      if (value) {
        return value.outerHTML;
      }
    }
  }
  return "";
}

export function prettifyXml(src: string): string {
  // Remove DOCTYPE to avoid DTD loading issues
  const cleanSrc = src.replace(/<!DOCTYPE[^>]*>/i, "");

  const xmlDoc = new DOMParser().parseFromString(cleanSrc, "application/xml");
  if (xmlDoc.querySelector("parsererror")) {
    return src;
  }

  const xsltDoc = new DOMParser().parseFromString(
    `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
      <xsl:output omit-xml-declaration="yes" indent="yes"/>
      <xsl:template match="node()|@*">
        <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>
      </xsl:template>
    </xsl:stylesheet>`,
    "application/xml",
  );

  try {
    const xsltProcessor = new XSLTProcessor();
    xsltProcessor.importStylesheet(xsltDoc);
    const resultDoc = xsltProcessor.transformToDocument(xmlDoc);
    return new XMLSerializer().serializeToString(resultDoc);
  } catch {
    return src;
  }
}
