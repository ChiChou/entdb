import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ udid: string }> }
): Promise<Response> {
  const { DB } = getRequestContext().env;
  const { udid } = await params;

  const os = await DB.prepare(
    `SELECT name, version, build, udid FROM os WHERE os.udid = ?;`
  ).bind(udid).first();

  if (!os) {
    return Response.json(
      { error: 'OS Not Found' },
      { status: 404 }
    );
  }

  return Response.json(os);
}
