"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, type ReactNode } from "react";

export const HEADER_PORTAL_ID = "header-controls-portal";

export function HeaderPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const target = document.getElementById(HEADER_PORTAL_ID);
  if (!target) return null;

  return createPortal(children, target);
}
