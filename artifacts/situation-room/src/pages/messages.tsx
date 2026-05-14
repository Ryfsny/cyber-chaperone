import { useListMessages, useListTrips, useUpdateMessage, getListMessagesQueryKey, getGetTripMessagesQueryKey, getListTripsQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { MessageSquare, Link as LinkIcon, User, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function Messages() {
  const { data: messages = [], isLoading: isLoadingMessages } = useListMessages();
  const { data: trips = [] } = useListTrips();
  const updateMessage = useUpdateMessage();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleAssign = (messageId: number, tripId: string) => {
    updateMessage.mutate({
      id: messageId,
      data: { tripId: tripId === "unassigned" ? null : parseInt(tripId) }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListTripsQueryKey() });
        toast({ title: "Message assigned successfully" });
      },
      onError: () => {
        toast({ title: "Failed to assign message", variant: "destructive" });
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="h-14 px-6 flex items-center gap-4 border-b border-border bg-card shrink-0">
        <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-xs uppercase tracking-widest">
          <ArrowLeft className="w-3.5 h-3.5" /> Home
        </Link>
        <div className="h-4 w-px bg-border" />
        <h1 className="text-sm uppercase tracking-widest font-bold text-foreground">Message History</h1>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          {isLoadingMessages ? (
            [1, 2, 3].map(i => <div key={i} className="h-24 bg-card border border-border animate-pulse" />)
          ) : messages.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground uppercase tracking-widest text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-4 opacity-50" />
              No messages
            </div>
          ) : (
            messages.map(message => {
              const assignedTrip = trips.find(t => t.id === message.tripId);
              return (
                <div key={message.id} className="border border-border bg-card p-4 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
                        <User className="w-3 h-3" />
                        <span>{message.fromNumber}</span>
                        <span>&middot;</span>
                        <span>{format(new Date(message.receivedAt), "MMM d, HH:mm")}</span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap font-sans">{message.body}</p>
                    </div>
                    
                    <div className="w-64 shrink-0 flex flex-col items-end gap-2">
                      <Select 
                        value={message.tripId ? String(message.tripId) : "unassigned"} 
                        onValueChange={(val) => handleAssign(message.id, val)}
                      >
                        <SelectTrigger className="w-full text-xs uppercase tracking-wider h-8">
                          <SelectValue placeholder="Assign to Trip..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned" className="text-xs uppercase tracking-wider">Unassigned</SelectItem>
                          {trips.map(trip => (
                            <SelectItem key={trip.id} value={String(trip.id)} className="text-xs uppercase tracking-wider">
                              {trip.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {assignedTrip && (
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" />
                          Assigned to {assignedTrip.title}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
