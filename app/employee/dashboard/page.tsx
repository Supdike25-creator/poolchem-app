"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GuardDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/employee");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-semibold text-blue-700">Loading guard workbench</p>
        <p className="mt-2 text-slate-600">Routing you to your guard workspace...</p>
      </div>
    </div>
  );
}
