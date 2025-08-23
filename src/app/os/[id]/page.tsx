import { redirect } from "next/navigation";

export default async function OSPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/os/${id}/keys`);
}
