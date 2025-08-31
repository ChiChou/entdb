if (process.argv.length !== 4) {
  process.stderr.write("usage: bun get-key.ts model version\n");
  process.stderr.write("example: bun get-key.ts iPhone5,4 11B601\n");
  process.exit(1);
}

async function request(params: string) {
  const base = "https://theapplewiki.com/wiki/Special:Ask";
  const stripped = params
    .split("\n")
    .map((l) => l.trim())
    .map((l) =>
      l.startsWith("/") ? "/" + encodeURIComponent(l.substring(1)) : l,
    )
    .join("");
  const url = base + stripped;
  process.stderr.write(url + "\n");
  return fetch(url).then((r) => r.json());
}

const [model, version] = process.argv.slice(2);
const paramsFindPage = `
  /-5B-5B:Keys:-2B-5D-5D
  /-5B-5BHas firmware device::${model}-5D-5D
  /-5B-5BHas firmware version::${version}-5D-5D
  /-3FHas download URL=url
  /-3FHas firmware baseband=baseband
  /-3FHas firmware build=build
  /-3FHas firmware codename=codename
  /-3FHas firmware device=device
  /-3FHas firmware version=version
  /-3FHas operating system=os
  /mainlabel=name
  /limit=1
  /format=json
  /type=simple`;

const pageInfo = await request(paramsFindPage);
// does not work, cloudflare blocks it
