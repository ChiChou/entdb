import OSList from "@/components/oslist";

export default async function Home() {
  return (
    <div className="font-sans">
      <h1 className="text-4xl text-center mt-16">Entitlement Database</h1>
      <div className="items-center justify-center sm:m-4 md:m-16">
        <OSList />
      </div>
    </div>
  );
}
