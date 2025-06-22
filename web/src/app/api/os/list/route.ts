import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export async function GET(): Promise<Response> {
  const { DB } = getRequestContext().env;
  const { results } = await DB.prepare(
    `select name, version, build, udid from os;`
  ).all();

  return Response.json(results);
}
