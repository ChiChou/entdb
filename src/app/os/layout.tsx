"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function OSDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useSearchParams();
  const os = params.get("os") || "";

  useEffect(() => {
    if (os) document.title = `${os} - Entitlement Database`;
  }, [os]);

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 md:p-6">
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
