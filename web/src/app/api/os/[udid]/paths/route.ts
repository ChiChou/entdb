import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ udid: string }> }
): Promise<Response> {
  const { DB } = getRequestContext().env;
  const { udid } = await params;

  const { results } = await DB.prepare(
    `SELECT b.path FROM bin AS b where b.os_id = (SELECT id as os_id FROM os WHERE udid = ?);`
  ).bind(udid).all();

  const textOnly = results.map((result) => result.path).join('\n');
  return new Response(textOnly, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
