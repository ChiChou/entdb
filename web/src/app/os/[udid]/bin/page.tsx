import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { Binary } from '@/types';
import { CopyButton } from '@/components/copy-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { headers } from 'next/headers';

export const runtime = 'edge';
export const metadata = {
  title: 'Binary Details',
  description: 'Binary',
};

type Params = Promise<{ udid: string }>
type SearchParams = Promise<{ path?: string }>

async function fetchBinary(udid: string, path: string): Promise<Binary> {
  const { DB } = getRequestContext().env;

  const binary = await DB.prepare(
    `SELECT b.xml, b.json, b.path FROM os AS o
      JOIN bin as b ON o.id = b.os_id WHERE o.udid = ? AND b.path = ?;`
  ).bind(udid, path).first();

  if (!binary)
    notFound();

  return binary as unknown as Binary;
}

export default async function BinaryPage(props: { params: Params, searchParams: SearchParams }) {
  const { udid } = await props.params;
  const { path } = await props.searchParams;

  const hdrs = await headers();
  const referer = hdrs.get('referer');

  if (!path)
    notFound();

  const bin = await fetchBinary(udid, path);
  const basename = bin.path.split('/').pop();

  const title = `${basename} - ${udid}`;
  metadata.title = title;
  metadata.description = path;

  const json = JSON.parse(bin.json);
  const xmlKeys = Object.keys(json);

  return (
    <div className="p-8 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-4xl mx-auto">
        <slot name="back">
          <div className="mb-6">
            <Link
              href={referer || `/os/${udid}`}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
            >
              ← Back
            </Link>
          </div>
        </slot>

        <div className="flex flex-col gap-4">
          <header>
            <h1 className="text-3xl font-bold mb-6 break-all">{basename}</h1>
            <p className="text-sm text-gray-500 break-all">{bin.path}</p>
          </header>

          <main className="space-y-6">
            <Tabs defaultValue="xml">
              <TabsList>
                <TabsTrigger value="xml">Content</TabsTrigger>
                <TabsTrigger value="json">Keys</TabsTrigger>
              </TabsList>

              <TabsContent value="xml">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold">XML</h2>
                  <CopyButton text={bin.xml} />
                </div>
                <SyntaxHighlighter
                  language="xml"
                  showLineNumbers={true}
                  style={tomorrow}
                  customStyle={{
                    margin: 0,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                  lineProps={{
                    onClick: (line) => {
                      console.log(line);
                    }
                  }}
                >
                  {bin.xml}
                </SyntaxHighlighter>
              </TabsContent>

              <TabsContent value="json">
                <ul>
                  {xmlKeys.map((key) => (
                    <li key={key}>
                      <Link
                        href={`/os/${udid}?key=${key}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {key}
                      </Link>
                    </li>
                  ))}
                </ul>
              </TabsContent>
            </Tabs>

          </main>
        </div>
      </div>
    </div>
  );
} 