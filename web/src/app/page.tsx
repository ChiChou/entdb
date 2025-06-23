import Link from 'next/link';

import { OS } from '@/types';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

async function fetchOSList(): Promise<OS[]> {
  const { DB } = getRequestContext().env;
  const list = await DB.prepare(
    `SELECT name, version, build, udid FROM os ORDER BY name, version, build;`
  ).all();

  if (list.error)
    throw new Error(list.error);

  return list.results as unknown[] as OS[];
}

export default async function Home() {
  let osList: OS[] = [];
  let error: string | null = null;

  try {
    osList = await fetchOSList();
  } catch (err) {
    error = err instanceof Error ? err.message : 'An error occurred';
  }

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="row-start-2 w-full max-w-4xl">
        <p className="text-center text-gray-700 mb-8">
          Open source entitlement database for iOS and macOS binaries than you can host your own.
        </p>

        {error && (
          <div className="text-center text-red-500">错误: {error}</div>
        )}

        {!error && (
          <ul className="space-y-2">
            {osList.map((os, index) => (
              <li key={index}>
                <Link
                  href={`/os/${os.udid}`}
                  className="block p-4 border rounded-lg shadow-sm hover:shadow-md transition-all hover:bg-gray-50"
                >
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg">{os.name} {os.version} ({os.build})</h2>
                    <div className="text-sm text-gray-500">{os.udid}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
