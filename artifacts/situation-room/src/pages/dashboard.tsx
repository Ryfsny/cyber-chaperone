import { useListTrips } from "@workspace/api-client-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { AlertCircle, CheckCircle2, AlertTriangle, MessageSquare, Clock } from "lucide-react";

type Trip = ReturnType<typeof useListTrips>["data"] extends (infer T)[] | undefined ? T : never;

function TripCard({ trip }: { trip: Trip }) {
  const StatusIcon =
    trip.status === "red" ? AlertCircle :
    trip.status === "amber" ? AlertTriangle : CheckCircle2;

  const isCompleted = trip.status === "completed";

  return (
    <Link key={trip.id} href={`/trips/${trip.id}`} className="block group">
      <div className={cn(
        "border transition-colors h-full bg-card hover:bg-secondary",
        trip.status === "red" ? "border-status-red" :
        trip.status === "amber" ? "border-status-amber" :
        isCompleted ? "border-border opacity-60" : "border-status-green/30"
      )}>
        <div className={cn(
          "px-4 py-2 border-b flex justify-between items-center",
          trip.status === "red" ? "bg-status-red/10 border-status-red" :
          trip.status === "amber" ? "bg-status-amber/10 border-status-amber" :
          isCompleted ? "bg-muted/30 border-border" : "bg-status-green/10 border-status-green/30"
        )}>
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            ) : (
              <StatusIcon className={cn(
                "w-4 h-4",
                trip.status === "red" ? "text-status-red" :
                trip.status === "amber" ? "text-status-amber" : "text-status-green"
              )} />
            )}
            <span className={cn(
              "uppercase text-xs font-bold tracking-widest",
              trip.status === "red" ? "text-status-red" :
              trip.status === "amber" ? "text-status-amber" :
              isCompleted ? "text-muted-foreground" : "text-status-green"
            )}>{trip.status}</span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground text-xs uppercase tracking-wider">
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              <span>{trip.messageCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{format(new Date(trip.updatedAt), "HH:mm")}</span>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
              {trip.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {trip.travelerName} &middot; {trip.travelerPhone}
            </p>
          </div>

          {(trip.nextAction || trip.operatorNotes) && (
            <div className="pt-4 border-t border-border space-y-3">
              {trip.nextAction && (
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Next Action</span>
                  <p className="text-sm text-foreground line-clamp-2">{trip.nextAction}</p>
                </div>
              )}
              {trip.operatorNotes && !trip.nextAction && (
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Notes</span>
                  <p className="text-sm text-foreground line-clamp-2">{trip.operatorNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: trips = [], isLoading } = useListTrips();

  const activeTrips = [...trips]
    .filter((t) => t.status !== "completed")
    .sort((a, b) => {
      const order: Record<string, number> = { red: 0, amber: 1, green: 2 };
      const oa = order[a.status] ?? 3;
      const ob = order[b.status] ?? 3;
      if (oa !== ob) return oa - ob;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const completedTrips = [...trips]
    .filter((t) => t.status === "completed")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="h-16 px-8 flex items-center border-b border-border bg-card shrink-0">
        <h1 className="text-lg uppercase tracking-widest font-bold text-foreground">Active Operations</h1>
      </header>

      <div className="flex-1 overflow-auto p-8 space-y-10">
        {isLoading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 border border-border bg-card animate-pulse rounded-sm" />
            ))}
          </div>
        ) : (
          <>
            <section>
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border">
                Active Trips
                <span className="ml-3 text-foreground font-bold">{activeTrips.length}</span>
              </h2>
              {activeTrips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <div className="w-12 h-12 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6 opacity-50" />
                  </div>
                  <p className="uppercase tracking-widest text-sm">No active trips</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                  {activeTrips.map((trip) => <TripCard key={trip.id} trip={trip} />)}
                </div>
              )}
            </section>

            {completedTrips.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border">
                  Completed Trips
                  <span className="ml-3 text-foreground font-bold">{completedTrips.length}</span>
                </h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                  {completedTrips.map((trip) => <TripCard key={trip.id} trip={trip} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
