import { Metadata } from "next";
import Keys from "@/components/keys";

export const metadata: Metadata = {
  title: "Entitlement Keys",
};

export default async function OSKeysPage() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <Keys />
    </div>
  );
}
