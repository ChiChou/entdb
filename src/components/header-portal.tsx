"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, type ReactNode } from "react";

export const HEADER_PORTAL_ID = "header-controls-portal";
export const HEADER_PORTAL_LEFT_ID = "header-controls-portal-left";

interface HeaderPortalProps {
  children: ReactNode;
  position?: "left" | "right";
}

export function HeaderPortal({ children, position = "right" }: HeaderPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const targetId = position === "left" ? HEADER_PORTAL_LEFT_ID : HEADER_PORTAL_ID;
  const target = document.getElementById(targetId);
  if (!target) return null;

  return createPortal(children, target);
}
