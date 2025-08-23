import { Metadata } from "next";
import Link from "next/link";

import { fetchAllOS } from "@/lib/server";

type Params = Promise<{ id: string }>;

export const metadata: Metadata = {
  title: "OS Details",
};

export async function generateStaticParams() {
  const list = await fetchAllOS();
  return list.map((os) => ({ id: os.id }));
}

export default async function OSLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { id } = await params;
  // const [version, build] = id.split("_");

  return (
    <div className="p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col gap-4">
          <nav className="flex justify-center space-x-1 bg-gray-100 rounded-lg p-1">
            <Link
              href={`/os/${id}/keys`}
              className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-white transition-colors"
            >
              Keys
            </Link>
            <Link
              href={`/os/${id}/files`}
              className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-white transition-colors"
            >
              Binaries
            </Link>
          </nav>

          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
