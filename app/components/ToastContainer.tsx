"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function ToastContainer() {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const toastParam = search.get("toast");
  const [msg, setMsg] = useState<string | null>(null);

  const message = useMemo(() => {
    if (toastParam === "done") return "Marked as done";
    if (toastParam === "saved") return "Saved successfully";
    if (toastParam === "error") return "Something went wrong";
    return null;
  }, [toastParam]);

  useEffect(() => {
    if (!message) return;
    setMsg(message);
    const t = setTimeout(() => setMsg(null), 1600);
    const clean = setTimeout(() => {
      const params = new URLSearchParams(search.toString());
      params.delete("toast");
      router.replace(`${pathname}${params.toString() ? `?${params}` : ""}`);
    }, 1000);
    return () => {
      clearTimeout(t);
      clearTimeout(clean);
    };
  }, [message, pathname, router, search]);

  if (!msg) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100]">
      <div
        className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 shadow-lg text-sm text-[#111827]
                   dark:bg-[#111827] dark:text-[#E5E7EB] dark:border-[#374151] flex items-center gap-2
                   transition-all duration-200 transform translate-y-0 opacity-100"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-[#0F3D73]">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span>{msg}</span>
      </div>
    </div>
  );
}
