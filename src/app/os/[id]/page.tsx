import { Metadata } from "next";

import { OS } from "@/lib/types";
import { fetchAllOS } from "@/lib/server";
import Keys from "@/components/keys";

type Params = Promise<{ id: string }>;

export const metadata: Metadata = {
  title: "OS Details",
};

export async function generateStaticParams() {
  const list = await fetchAllOS();
  return list.map((os) => ({ id: os.id }));
}

export default async function OSPage(props: { params: Params }) {
  const { id } = await props.params;
  const [version, build] = id.split("_");
  const os: OS = { id, version, build };

  metadata.title = `${version} (${build}) - entdb`;

  return (
    <div className="p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col gap-4">
          <header className="text-center">
            <h1 className="text-3xl font-bold mb-6">
              {os.version} ({os.build})
            </h1>
            <p className="text-xs text-gray-500">{os.id}</p>
            <Keys />
          </header>
        </div>
      </div>
    </div>
  );
}
