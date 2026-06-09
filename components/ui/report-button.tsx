"use client";

import { useState } from "react";
import { MessageSquareWarning } from "lucide-react";
import ReportModal from "@/components/ui/report-modal";

export default function ReportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Reportar un problema"
        aria-label="Reportar un problema"
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-gray-900 text-white shadow-lg hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white transition-colors"
      >
        <MessageSquareWarning className="w-5 h-5" />
      </button>

      <ReportModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
