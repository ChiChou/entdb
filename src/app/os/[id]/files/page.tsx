import Paths from "@/components/paths";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Files",
};

export default async function OSPackagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <Paths />
    </div>
  );
}
