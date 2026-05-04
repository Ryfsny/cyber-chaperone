import { useGetTrip, useGetTripMessages, useUpdateTrip, getGetTripQueryKey, getListTripsQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Loader2, Save, Activity, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { TripAiPanel } from "@/components/ai/TripAiPanel";

export default function TripDetail() {
  const { id } = useParams();
  const tripId = parseInt(id || "0", 10);
  
  const { data: trip, isLoading: isLoadingTrip } = useGetTrip(tripId, { 
    query: { enabled: !!tripId, queryKey: getGetTripQueryKey(tripId) } 
  });
  const { data: messages = [], isLoading: isLoadingMessages } = useGetTripMessages(tripId, {
    query: { enabled: !!tripId }
  });
  
  const updateTrip = useUpdateTrip();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [inferenceNotes, setInferenceNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [operatorNotes, setOperatorNotes] = useState("");

  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (trip && initializedForId.current !== trip.id) {
      initializedForId.current = trip.id;
      setEvidenceNotes(trip.evidenceNotes || "");
      setInferenceNotes(trip.inferenceNotes || "");
      setNextAction(trip.nextAction || "");
      setOperatorNotes(trip.operatorNotes || "");
    }
  }, [trip]);

  const handleSaveNotes = () => {
    updateTrip.mutate({
      id: tripId,
      data: {
        evidenceNotes,
        inferenceNotes,
        nextAction,
        operatorNotes
      }
    }, {
      onSuccess: (updatedTrip) => {
        queryClient.setQueryData(getGetTripQueryKey(tripId), updatedTrip);
        toast({ title: "Notes saved successfully" });
      }
    });
  };

  const handleStatusChange = (status: "green" | "amber" | "red") => {
    updateTrip.mutate({
      id: tripId,
      data: { status }
    }, {
      onSuccess: (updatedTrip) => {
        queryClient.setQueryData(getGetTripQueryKey(tripId), updatedTrip);
        queryClient.invalidateQueries({ queryKey: getListTripsQueryKey() });
        toast({ title: `Status updated to ${status.toUpperCase()}` });
      }
    });
  };

  const handleCloseTrip = () => {
    updateTrip.mutate({
      id: tripId,
      data: { status: "completed" }
    }, {
      onSuccess: (updatedTrip) => {
        queryClient.setQueryData(getGetTripQueryKey(tripId), updatedTrip);
        queryClient.invalidateQueries({ queryKey: getListTripsQueryKey() });
        toast({ title: "Trip closed" });
      }
    });
  };

  if (isLoadingTrip) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!trip) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground uppercase tracking-widest text-sm">Operation not found</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      <header className={cn(
        "h-20 px-8 flex items-center justify-between border-b shrink-0 transition-colors",
        trip.status === 'red' ? "bg-status-red/10 border-status-red" :
        trip.status === 'amber' ? "bg-status-amber/10 border-status-amber" :
        trip.status === 'completed' ? "bg-muted/30 border-border" : "bg-status-green/10 border-status-green/30"
      )}>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl uppercase tracking-widest font-bold text-foreground flex items-center gap-3">
              {trip.title}
              <span className={cn(
                "px-2 py-0.5 text-xs rounded-sm",
                trip.status === 'red' ? "bg-status-red text-destructive-foreground" :
                trip.status === 'amber' ? "bg-status-amber text-primary-foreground" :
                trip.status === 'completed' ? "bg-muted text-muted-foreground" : "bg-status-green text-primary-foreground"
              )}>
                {trip.status}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground font-sans mt-1">
              {trip.travelerName} &middot; {trip.travelerPhone}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {trip.status !== 'completed' && (
            <>
              <button
                onClick={() => handleStatusChange('green')}
                className={cn("px-4 py-2 text-xs uppercase tracking-widest font-bold border transition-colors", trip.status === 'green' ? "bg-status-green text-primary-foreground border-status-green" : "border-border text-muted-foreground hover:text-foreground")}
              >Green</button>
              <button
                onClick={() => handleStatusChange('amber')}
                className={cn("px-4 py-2 text-xs uppercase tracking-widest font-bold border transition-colors", trip.status === 'amber' ? "bg-status-amber text-primary-foreground border-status-amber" : "border-border text-muted-foreground hover:text-foreground")}
              >Amber</button>
              <button
                onClick={() => handleStatusChange('red')}
                className={cn("px-4 py-2 text-xs uppercase tracking-widest font-bold border transition-colors", trip.status === 'red' ? "bg-status-red text-destructive-foreground border-status-red" : "border-border text-muted-foreground hover:text-foreground")}
              >Red</button>
              <div className="w-px h-6 bg-border mx-1" />
              <button
                onClick={handleCloseTrip}
                disabled={updateTrip.isPending}
                className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest font-bold border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors disabled:opacity-50"
              >
                {updateTrip.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Close Trip
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Structured Notes */}
        <div className="w-1/2 p-8 overflow-auto border-r border-border">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg uppercase tracking-widest font-bold flex items-center gap-2">
              <Activity className="w-5 h-5" /> Situation Report
            </h2>
            <button 
              onClick={handleSaveNotes}
              disabled={updateTrip.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs uppercase tracking-widest font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {updateTrip.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Notes
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Evidence (What do we know?)</label>
              <Textarea 
                value={evidenceNotes}
                onChange={(e) => setEvidenceNotes(e.target.value)}
                className="min-h-32 font-sans bg-card border-border"
                placeholder="Observed facts..."
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Inference (What does it mean?)</label>
              <Textarea 
                value={inferenceNotes}
                onChange={(e) => setInferenceNotes(e.target.value)}
                className="min-h-32 font-sans bg-card border-border"
                placeholder="Deductions and analysis..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Next Action</label>
              <Textarea 
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                className="min-h-24 font-sans bg-card border-border border-l-4 border-l-primary"
                placeholder="Required steps..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Operator Notes</label>
              <Textarea 
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                className="min-h-32 font-sans bg-card border-border"
                placeholder="Internal context..."
              />
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-border">
            <TripAiPanel tripId={tripId} tripStatus={trip.status} />
          </div>
        </div>

        {/* Right: Message Feed */}
        <div className="w-1/2 flex flex-col bg-card">
          <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between shrink-0">
            <h2 className="text-sm uppercase tracking-widest font-bold">Comms Feed</h2>
            <span className="text-xs text-muted-foreground font-mono">{messages.length} msgs</span>
          </div>
          
          <div className="flex-1 p-6 overflow-auto space-y-6">
            {isLoadingMessages ? (
              <div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground uppercase tracking-widest text-xs mt-10">No messages attached</div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className="border border-border p-4 bg-background">
                  <div className="flex items-center justify-between mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                    <span className="font-bold">{msg.fromNumber}</span>
                    <span>{format(new Date(msg.receivedAt), "MMM d, HH:mm")}</span>
                  </div>
                  <p className="text-sm font-sans whitespace-pre-wrap">{msg.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
