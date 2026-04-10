"use client";

import { Copy } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

export function CopyButton({ text }: { text: string }) {
  return (
    <div>
      <Button
        variant="outline"
        onClick={() => {
          navigator.clipboard.writeText(text);
          toast("Copied");
        }}
      >
        <Copy className="w-4 h-4" />
      </Button>
    </div>
  );
}
