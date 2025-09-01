/**
 * `bun source.ts`
 * `node source.ts`
 * `deno run --allow-net source.ts`
 */

const versions = await fetch("https://api.phoeninx.dev/v1/macos/versions").then(
  (r) => r.json(),
);

async function getVersionURL(fullVersion: string) {
  const url = `https://api.phoeninx.dev/v1/macos/releases?version=${fullVersion}`;
  const json = await fetch(url).then((r) => r.json());

  for (const item of json) {
    const { version } = item;
    if (version.full !== fullVersion) continue;

    // console.log(`# ${version.full}_${version.build}`);
    const { packages } = item.installer ?? {};
    if (!packages) continue;

    // find max size package
    packages.sort((a: any, b: any) => b.size - a.size);
    return packages[0].url;
  }
}

const grouped: Record<string, string[]> = {};

for (const fullVersion of versions) {
  const segments = fullVersion.split("."); //.map((v: string) => parseInt(v, 10));
  const [major, minor] = segments.slice(0, 2);

  // console.log(major, minor);

  const key = `${major}.${minor}`;
  if (!grouped[key]) grouped[key] = [];
  grouped[key].push(fullVersion);
}

for (const [key, fullVersions] of Object.entries(grouped)) {
  console.log(key);
  for (const fullVersion of fullVersions) {
    console.log(" ", fullVersion);
  }
}

export {};
