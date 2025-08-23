import { Metadata } from "next";

import { fetchAllOS } from "@/lib/data";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Keys from "@/components/keys";
import Paths from "@/components/paths";

export const metadata: Metadata = {
  title: "OS Details",
};

export async function generateStaticParams() {
  const list = await fetchAllOS();
  return list.map((os) => ({ id: os.id }));
}

export default async function OSDetail() {
  return (
    <div className="p-8">
      <Tabs defaultValue="keys">
        <TabsList>
          <TabsTrigger value="keys">Keys</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>
        <TabsContent value="keys">
          <Keys />
        </TabsContent>
        <TabsContent value="files">
          <Paths />
        </TabsContent>
      </Tabs>
    </div>
  );
}
