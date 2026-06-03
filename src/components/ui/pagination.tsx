import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPageSlots(page: number, totalPages: number): (number | "…")[] {
  const set = new Set([
    1,
    Math.max(1, page - 1),
    page,
    Math.min(totalPages, page + 1),
    totalPages,
  ]);
  const pages = Array.from(set).sort((a, b) => a - b);

  const result: (number | "…")[] = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) {
      result.push("…");
    }
    result.push(pages[i]);
  }
  return result;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const slots = getPageSlots(page, totalPages);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page">
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {slots.map((slot, i) =>
        slot === "…" ? (
          <span
            key={`ellipsis-${i}`}
            className="flex h-8 w-8 items-center justify-center text-sm text-slate-400 select-none">
            …
          </span>
        ) : (
          <Button
            key={slot}
            variant={slot === page ? "default" : "outline"}
            size="sm"
            className={cn("h-8 w-8 p-0")}
            onClick={() => onPageChange(slot)}
            aria-label={`Page ${slot}`}
            aria-current={slot === page ? "page" : undefined}>
            {slot}
          </Button>
        ),
      )}

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page">
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
