import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ udid: string }> },
): Promise<Response> {
  const { DB, CACHE } = getRequestContext().env;
  const { udid } = await params;
  const keyword = new URL(request.url).searchParams.get("k");

  if (!keyword) {
    const cache = await CACHE.get(`keys/${udid}/`);
    if (cache)
      return new Response(cache, {
        headers: {
          "Content-Type": "text/plain",
        },
      });
  }

  const tail = keyword ? `AND p.key glob ? LIMIT 20` : "";
  const sql = `SELECT DISTINCT p.key FROM pair AS p JOIN bin AS b ON
      b.os_id = (SELECT id as os_id FROM os WHERE udid = ?) AND
      p.bin_id = b.id ${tail};`;

  const statement = DB.prepare(sql);
  const columns = [udid];
  if (keyword) {
    // SQLITE_MAX_LIKE_PATTERN_LENGTH on cf is 50
    // avoid "LIKE or GLOB pattern too complex"
    columns.push(`*${keyword.slice(0, 50 - 2)}*`);
  }

  const { results } = await statement.bind(...columns).all();
  const textOnly = results.map((result) => result.key).join("\n");

  if (!keyword)
    await CACHE.put(`keys/${udid}/`, textOnly, {
      expirationTtl: 60 * 60 * 24,
    });

  return new Response(textOnly, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
