import { useState } from "react";
import { cn } from "@/lib/utils";

interface SectionBlockProps {
  label: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

export default function SectionBlock({
  label,
  children,
  collapsible = false,
  defaultOpen = true,
  className,
}: SectionBlockProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("space-y-1", className)}>
      {collapsible ? (
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="text-xs">{open ? "\u25BC" : "\u25B6"}</span>
          {label}
        </button>
      ) : (
        <span className="text-xs text-muted-foreground block">
          {label}
        </span>
      )}
      {open && <div>{children}</div>}
    </div>
  );
}
