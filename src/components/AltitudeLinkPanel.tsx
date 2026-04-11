import { useState, useEffect } from "react";
import {
  fetchLinkedOKR,
  fetchLinkedOutcomes,
  type LinkedOKR,
  type LinkedOutcome,
} from "@/lib/crossApp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AltitudeLinkPanelProps {
  betId: string;
  betTitle: string;
  linkedOkrId: string | null;
  linkedOkrTitle: string | null;
  linkedOutcomeIds: string[];
  linkedOutcomeTitles: Record<string, string>;
  onLinkOkr: (okrId: string, okrTitle: string) => Promise<void>;
  onUnlinkOkr: () => Promise<void>;
  onLinkOutcome: (outcomeId: string, outcomeTitle: string) => Promise<void>;
  onUnlinkOutcome: (outcomeId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function OkrCard({ okr, cached, onUnlink }: { okr: LinkedOKR | null; cached: string | null; onUnlink: () => void }) {
  const title = okr?.title ?? cached ?? "Loading...";
  const statusLabel = okr?.status === "active" ? "Active" : okr?.status === "closed" ? "Closed" : okr?.status ?? "";
  const progress = okr?.progress_percentage != null ? `${okr.progress_percentage}%` : null;
  const krCount = okr?.key_results_count ?? 0;

  return (
    <div className="border border-border/60 rounded-lg p-3 group relative">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{title}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {statusLabel && <span>{statusLabel}</span>}
            {progress && <><span>·</span><span>{progress}</span></>}
            {krCount > 0 && <><span>·</span><span>{krCount} key result{krCount !== 1 ? "s" : ""}</span></>}
          </div>
        </div>
        <button
          onClick={onUnlink}
          className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-destructive transition-opacity"
          title="Unlink OKR"
        >
          ✕
        </button>
      </div>
      {okr?.url && (
        <a
          href={okr.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-muted-foreground hover:text-foreground mt-1 inline-block"
        >
          Open in TrueNorthOS ↗
        </a>
      )}
    </div>
  );
}

function OutcomeCard({ outcome, cached, onUnlink }: { outcome: LinkedOutcome | null; cached: string | null; onUnlink: () => void }) {
  const title = outcome?.title ?? cached ?? "Loading...";

  return (
    <div className="border border-border/60 rounded-lg p-3 group relative">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium truncate flex-1">{title}</p>
        <button
          onClick={onUnlink}
          className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-destructive transition-opacity"
          title="Unlink outcome"
        >
          ✕
        </button>
      </div>
      {outcome?.url && (
        <a
          href={outcome.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-muted-foreground hover:text-foreground mt-1 inline-block"
        >
          Open in OutcomeOS ↗
        </a>
      )}
    </div>
  );
}

function LinkDialog({
  open,
  onOpenChange,
  title,
  placeholder,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  placeholder: string;
  onConfirm: (id: string, fetchedTitle: string) => void;
}) {
  const [inputId, setInputId] = useState("");
  const [preview, setPreview] = useState<{ id: string; title: string } | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOkr = title.toLowerCase().includes("okr");

  const handlePreview = async () => {
    const id = inputId.trim();
    if (!id) return;
    setFetching(true);
    setError(null);
    setPreview(null);
    try {
      if (isOkr) {
        const okr = await fetchLinkedOKR(id);
        if (okr) setPreview({ id: okr.id, title: okr.title });
        else setError("OKR not found. Check the ID and try again.");
      } else {
        const outcomes = await fetchLinkedOutcomes([id]);
        if (outcomes.length > 0) setPreview({ id: outcomes[0].id, title: outcomes[0].title });
        else setError("Outcome not found. Check the ID and try again.");
      }
    } catch {
      setError("Failed to fetch. Please try again.");
    } finally {
      setFetching(false);
    }
  };

  const handleConfirm = () => {
    if (preview) {
      onConfirm(preview.id, preview.title);
      setInputId("");
      setPreview(null);
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setInputId(""); setPreview(null); setError(null); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex gap-2">
            <Input
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              placeholder={placeholder}
              className="flex-1 font-mono text-xs"
              onKeyDown={(e) => { if (e.key === "Enter") handlePreview(); }}
            />
            <Button variant="outline" size="sm" onClick={handlePreview} disabled={fetching || !inputId.trim()}>
              {fetching ? "..." : "Fetch"}
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {preview && (
            <div className="border border-border rounded-lg p-3 bg-muted/30">
              <p className="text-sm font-medium">{preview.title}</p>
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">{preview.id}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!preview}>Confirm Link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AltitudeLinkPanel({
  betId: _betId,
  betTitle: _betTitle,
  linkedOkrId,
  linkedOkrTitle,
  linkedOutcomeIds,
  linkedOutcomeTitles,
  onLinkOkr,
  onUnlinkOkr,
  onLinkOutcome,
  onUnlinkOutcome,
}: AltitudeLinkPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [okrData, setOkrData] = useState<LinkedOKR | null>(null);
  const [outcomesData, setOutcomesData] = useState<LinkedOutcome[]>([]);
  const [okrDialogOpen, setOkrDialogOpen] = useState(false);
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);

  const hasLinks = !!linkedOkrId || linkedOutcomeIds.length > 0;

  // Fetch OKR data
  useEffect(() => {
    if (!linkedOkrId) { setOkrData(null); return; }
    fetchLinkedOKR(linkedOkrId).then(setOkrData);
  }, [linkedOkrId]);

  // Fetch outcomes data
  useEffect(() => {
    if (linkedOutcomeIds.length === 0) { setOutcomesData([]); return; }
    fetchLinkedOutcomes(linkedOutcomeIds).then(setOutcomesData);
  }, [linkedOutcomeIds.join(",")]);

  return (
    <div className="border-t">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 md:px-5 py-2.5 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
      >
        <span className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">
          Altitude Connections
          {hasLinks && (
            <span className="ml-2 text-[10px] font-normal">
              ({(linkedOkrId ? 1 : 0) + linkedOutcomeIds.length} linked)
            </span>
          )}
        </span>
        <span className="text-muted-foreground text-[10px]">{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className="px-4 md:px-5 pb-4 space-y-4">
          {/* GOALS ALTITUDE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                Goals Altitude
              </span>
              <a
                href="https://truenorthos.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                TrueNorthOS ↗
              </a>
            </div>
            {linkedOkrId ? (
              <OkrCard okr={okrData} cached={linkedOkrTitle} onUnlink={onUnlinkOkr} />
            ) : (
              <button
                onClick={() => setOkrDialogOpen(true)}
                className="w-full border border-dashed border-border/60 rounded-lg p-3 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors text-center"
              >
                + Link an OKR
              </button>
            )}
          </div>

          {/* THIS BET divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 border-t border-border/40" />
            <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">This Bet</span>
            <div className="flex-1 border-t border-border/40" />
          </div>

          {/* BUILD ALTITUDE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                Build Altitude
              </span>
              <a
                href="https://outcomeos.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                OutcomeOS ↗
              </a>
            </div>
            {linkedOutcomeIds.length > 0 && (
              <div className="space-y-2 mb-2">
                {linkedOutcomeIds.map((id) => {
                  const data = outcomesData.find((o) => o.id === id) ?? null;
                  return (
                    <OutcomeCard
                      key={id}
                      outcome={data}
                      cached={linkedOutcomeTitles[id] ?? null}
                      onUnlink={() => onUnlinkOutcome(id)}
                    />
                  );
                })}
              </div>
            )}
            <button
              onClick={() => setOutcomeDialogOpen(true)}
              className="w-full border border-dashed border-border/60 rounded-lg p-3 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors text-center"
            >
              + Link an Outcome
            </button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <LinkDialog
        open={okrDialogOpen}
        onOpenChange={setOkrDialogOpen}
        title="Link an OKR from TrueNorthOS"
        placeholder="Paste OKR ID (UUID)"
        onConfirm={(id, title) => onLinkOkr(id, title)}
      />
      <LinkDialog
        open={outcomeDialogOpen}
        onOpenChange={setOutcomeDialogOpen}
        title="Link an Outcome from OutcomeOS"
        placeholder="Paste Outcome ID (UUID)"
        onConfirm={(id, title) => onLinkOutcome(id, title)}
      />
    </div>
  );
}
