import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ udid: string }> },
): Promise<Response> {
  const { DB } = getRequestContext().env;
  const { udid } = await params;
  const keyword = new URL(request.url).searchParams.get("k");

  const tail = keyword ? `AND p.key glob ?` : "";
  const sql = `SELECT DISTINCT p.key FROM pair AS p JOIN bin AS b ON
      b.os_id = (SELECT id as os_id FROM os WHERE udid = ?) AND
      p.bin_id = b.id ${tail};`;

  const statement = DB.prepare(sql);
  const columns = [udid];
  if (keyword) columns.push(`*${keyword}*`);

  const { results } = await statement.bind(...columns).all();
  const textOnly = results.map((result) => result.key).join("\n");
  return new Response(textOnly, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
