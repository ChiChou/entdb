import OSList from "@/components/oslist";

export default async function Home() {
  return (
    <div className="font-sans">
      <div className="items-center justify-center m-4 md:m-16">
        <OSList />
      </div>
    </div>
  );
}
