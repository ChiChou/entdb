"use client";

import { Download } from "lucide-react";
import { Button } from "./ui/button";

export function DownloadButton({
  content,
  filename,
}: {
  content: string;
  filename: string;
}) {
  const handleDownload = () => {
    const blob = new Blob([content], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" onClick={handleDownload}>
      <Download className="w-4 h-4" />
    </Button>
  );
}
