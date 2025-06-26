import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ udid: string, key: string }> }
): Promise<Response> {
  const { DB } = getRequestContext().env;
  const { udid, key } = await params;

  const { results } = await DB.prepare(
    `SELECT DISTINCT b.path FROM bin AS b
      JOIN pair AS p ON p.bin_id = b.id
      WHERE b.os_id = (SELECT id as os_id FROM os WHERE udid = ?)
      AND p.key = ?
      ORDER BY p.key;`
  ).bind(udid, key).all();

  const textOnly = results.map((result) => result.path).join('\n');
  return new Response(textOnly, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
