import { useState } from "react";
import { Sparkles, Copy, Check, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface TripAiPanelProps {
  tripId: number;
  tripStatus: string;
  onSendReply?: (draft: string) => void;
}

export function TripAiPanel({ tripId, tripStatus, onSendReply }: TripAiPanelProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [draft, setDraft] = useState<string | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  const generateSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`${base}/api/ai/trips/${tripId}/summary`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { summary?: string; error?: string };
      setSummary(data.summary ?? data.error ?? "Unable to generate summary.");
    } catch {
      setSummary("Connection error. Please try again.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const generateDraft = async () => {
    setDraftLoading(true);
    setDraft(null);
    try {
      const res = await fetch(`${base}/api/ai/trips/${tripId}/reply-draft`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { draft?: string; error?: string };
      setDraft(data.draft ?? data.error ?? "Unable to generate draft.");
    } catch {
      setDraft("Connection error. Please try again.");
    } finally {
      setDraftLoading(false);
    }
  };

  const copyDraft = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const useDraft = () => {
    if (!draft) return;
    if (onSendReply) onSendReply(draft);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-foreground">
        <Sparkles className="w-4 h-4 text-primary" />
        AI Tools
      </div>

      {/* Trip Summary */}
      <div className="border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Trip Summary</span>
          <button
            onClick={() => void generateSummary()}
            disabled={summaryLoading}
            className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
          >
            {summaryLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            {summary ? "Regenerate" : "Generate"}
          </button>
        </div>
        {summary ? (
          <p className="text-sm font-sans leading-relaxed text-foreground">{summary}</p>
        ) : (
          <p className="text-xs text-muted-foreground font-sans">
            Generate an AI summary of this trip's activity, risk events, and outcome.
          </p>
        )}
      </div>

      {/* Smart Reply Draft */}
      {tripStatus !== "completed" && (
        <div className="border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Reply Draft</span>
            <button
              onClick={() => void generateDraft()}
              disabled={draftLoading}
              className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
            >
              {draftLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              {draft ? "Regenerate" : "Draft Reply"}
            </button>
          </div>
          {draft ? (
            <div className="space-y-2">
              <p className="text-sm font-sans leading-relaxed text-foreground bg-background border border-border px-3 py-2">
                {draft}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => void copyDraft()}
                  className={cn(
                    "flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold transition-colors",
                    copied ? "text-green-500" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                {onSendReply && (
                  <button
                    onClick={useDraft}
                    className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-primary hover:text-primary/80 transition-colors"
                  >
                    Use draft
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground font-sans">
              Draft a smart WhatsApp reply based on the traveller's latest message.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
