import { notFound } from 'next/navigation';
import { getRequestContext } from '@cloudflare/next-on-pages';

import { OS } from '@/types';

import SearchKey from '@/components/search-key';

export const runtime = 'edge';

type Params = Promise<{ udid: string }>

async function fetchOS(udid: string): Promise<OS> {
  const { DB } = getRequestContext().env;

  const os = await DB.prepare(
    `SELECT name, version, build, udid FROM os WHERE os.udid = ?;`
  ).bind(udid).first();

  if (!os) {
    notFound();
  }

  return os as unknown as OS;
}

export const metadata = {
  title: 'OS Details'
};

export default async function OSPage(props: { params: Params }) {
  const { udid } = await props.params;
  const os = await fetchOS(udid);

  metadata.title = `${os.name} ${os.version} (${os.build})`;

  return (
    <div className="p-8 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col gap-4">
          <header className="text-center">
            <h1 className="text-3xl font-bold mb-6">
              {os.name} {os.version} ({os.build})
            </h1>
            <p className="text-xs text-gray-500">{os.udid}</p>
          </header>

          <SearchKey />

        </div>
      </div>
    </div>
  );
} 