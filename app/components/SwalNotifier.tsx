"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";

export default function SwalNotifier() {
  const search = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const toast = search.get("toast");
    if (!toast) return;

    const msg = toast === "done" ? "Marked as Done" : toast;

    const run = async () => {
      await Swal.fire({
        icon: "success",
        title: msg,
        showConfirmButton: false,
        timer: 1400,
        timerProgressBar: true,
        position: "center",
      });
      // Clean the URL after showing
      const params = new URLSearchParams(search.toString());
      params.delete("toast");
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname);
    };

    run();
  }, [pathname, router, search]);

  return null;
}
