import { LayoutGrid, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// The BSPG suite. Names carry the trailing underscore per brand convention.
const SUITE_APPS = [
  { id: "authority", name: "Authority_", tagline: "Decide the bet", url: "https://buildauthorityos.com" },
  { id: "outcomes", name: "Outcomes_", tagline: "Plan the build", url: "https://outcomeos.build" },
  { id: "system", name: "System_", tagline: "Run the day", url: "https://os.bspg.build" },
] as const;

export default function SuiteSwitcher({ current = "authority" }: { current?: "authority" | "outcomes" | "system" }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Switch BSPG app" className="h-8 w-8 shrink-0">
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
          BSPG Suite
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUITE_APPS.map((app) => {
          const isCurrent = app.id === current;
          const item = (
            <div className="flex w-full items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{app.name}</p>
                <p className="text-xs text-muted-foreground">{app.tagline}</p>
              </div>
              {isCurrent && <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />}
            </div>
          );
          return isCurrent ? (
            <DropdownMenuItem key={app.id} disabled className="opacity-100">
              {item}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={app.id} asChild>
              <a href={app.url} target="_blank" rel="noreferrer">
                {item}
              </a>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
