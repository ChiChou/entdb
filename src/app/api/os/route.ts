import { fetchAllOS } from "@/lib/data";

export const dynamic = "force-static";

export async function GET() {
  return Response.json(await fetchAllOS());
}
