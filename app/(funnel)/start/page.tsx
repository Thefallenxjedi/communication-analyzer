"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy /start route — form now lives on the home page. */
export default function StartRoute() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/#get-report");
  }, [router]);
  return null;
}
