import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getRequestContext } from '@cloudflare/next-on-pages';

import { OSData } from '@/types';

import SearchKey from '@/components/search-key';

export const runtime = 'edge';

async function fetchOS(udid: string): Promise<OSData> {
  const { DB } = getRequestContext().env;
  
  const os = await DB.prepare(
    `SELECT name, version, build, udid FROM os WHERE os.udid = ?;`
  ).bind(udid).first();

  if (!os) {
    notFound();
  }

  return os as unknown as OSData;
}

export default async function OSPage({ params }: { params: { udid: string } }) {
  const os = await fetchOS(params.udid);

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
          >
            ← Back to List
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          <header>
            <h1 className="text-3xl font-bold mb-6">{os.name} {os.version} ({os.build})</h1>
            <p className="text-sm text-gray-500">{os.udid}</p>
          </header>

          <SearchKey />

        </div>
      </div>
    </div>
  );
} 