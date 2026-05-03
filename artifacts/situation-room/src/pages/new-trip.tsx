import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useCreateTrip, getListTripsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  travelerName: z.string().min(1, "Traveler name is required"),
  travelerPhone: z.string().min(1, "Traveler phone is required"),
  status: z.enum(["green", "amber", "red"]),
});

export default function NewTrip() {
  const [, setLocation] = useLocation();
  const createTrip = useCreateTrip();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      travelerName: "",
      travelerPhone: "",
      status: "green",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createTrip.mutate({ data: values }, {
      onSuccess: (newTrip) => {
        queryClient.invalidateQueries({ queryKey: getListTripsQueryKey() });
        toast({ title: "Operation created successfully" });
        setLocation(`/trips/${newTrip.id}`);
      },
      onError: () => {
        toast({ title: "Failed to create operation", variant: "destructive" });
      }
    });
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      <header className="h-16 px-8 flex items-center gap-4 border-b border-border bg-card shrink-0">
        <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg uppercase tracking-widest font-bold text-foreground">Initiate Operation</h1>
      </header>

      <div className="flex-1 overflow-auto p-8 flex justify-center items-start">
        <div className="w-full max-w-xl border border-border bg-card p-8">
          <div className="flex items-center gap-3 mb-8 text-primary">
            <Shield className="w-6 h-6" />
            <h2 className="text-xl uppercase tracking-widest font-bold">Operation Details</h2>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase tracking-widest text-xs text-muted-foreground">Operation Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. VIP Transport LHR to City" className="font-sans" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="travelerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase tracking-widest text-xs text-muted-foreground">Traveler Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" className="font-sans" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="travelerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase tracking-widest text-xs text-muted-foreground">Traveler Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" className="font-sans" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase tracking-widest text-xs text-muted-foreground">Initial Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="uppercase tracking-widest font-bold">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="green" className="text-status-green uppercase font-bold tracking-widest">Green</SelectItem>
                        <SelectItem value="amber" className="text-status-amber uppercase font-bold tracking-widest">Amber</SelectItem>
                        <SelectItem value="red" className="text-status-red uppercase font-bold tracking-widest">Red</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-6 border-t border-border flex justify-end">
                <Button 
                  type="submit" 
                  disabled={createTrip.isPending}
                  className="uppercase tracking-widest font-bold px-8"
                >
                  {createTrip.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Initiate"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
