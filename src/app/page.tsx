import OSList from "@/components/oslist";

export default async function Home() {
  return (
    <div className="font-sans">
      <h1 className="text-2xl md:text-4xl text-center md-mt-16 mt-8">
        Entitlement Database
      </h1>
      <div className="items-center justify-center m-4 md:m-16">
        <OSList />
      </div>
    </div>
  );
}
