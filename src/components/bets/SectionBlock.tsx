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
          className="flex items-center gap-1.5 eyebrow-mono hover:text-foreground transition-colors"
        >
          <span className="text-xs">{open ? "\u25BC" : "\u25B6"}</span>
          {`// ${label.toUpperCase()}`}
        </button>
      ) : (
        <span className="eyebrow-mono block">
          {`// ${label.toUpperCase()}`}
        </span>
      )}
      {open && <div>{children}</div>}
    </div>
  );
}
