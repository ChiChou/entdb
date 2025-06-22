import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ udid: string, key: string }> }
): Promise<Response> {
  const { DB } = getRequestContext().env;
  const { udid, key } = await params;

  // I wanna know if this is sql injection safe 🤔
  const quotedKey = JSON.stringify(key);
  const { results } = await DB.prepare(
    `SELECT DISTINCT b.path FROM os AS o 
      JOIN bin AS b ON o.id = b.os_id WHERE o.udid=? and json_extract(b.json, '$.${quotedKey}');`
  ).bind(udid).all();

  const textOnly = results.map((result) => result.path).join('\n');
  return new Response(textOnly, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
