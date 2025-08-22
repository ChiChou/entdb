import { fetchAllOS } from "@/lib/server";

export const dynamic = "force-static";

export async function GET() {
  return Response.json(await fetchAllOS());
}
