import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export async function GET(): Promise<Response> {
  const { env } = getRequestContext();
  const DB = env.DB;
  const { results } = await DB.prepare(
    `select distinct name,version,build from os;`
  ).all();

  return Response.json(results);
}
