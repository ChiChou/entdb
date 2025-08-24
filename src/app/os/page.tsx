"use client";

import { addBasePath } from "@/lib/env";
import { useSearchParams, redirect } from "next/navigation";

export default function OSDetail() {
  const params = useSearchParams();
  const os = params.get("os");

  if (typeof os !== "string") {
    return <div className="p-8">Invalid OS</div>;
  }

  redirect(addBasePath(`/os/keys?os=${os}`));
}
