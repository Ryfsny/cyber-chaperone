import { Switch, Route, Router as WouterRouter } from "wouter";
import Membership from "@/pages/membership";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import TripDetail from "@/pages/trip-detail";
import Messages from "@/pages/messages";
import NewTrip from "@/pages/new-trip";
import Radar from "@/pages/radar";
import Responders from "@/pages/responders";
import Members from "@/pages/members";
import MemberProfile from "@/pages/member-profile";
import Broadcast from "@/pages/broadcast";
import OperatorBroadcast from "@/pages/operator-broadcast";
import Conversations from "@/pages/conversations";
import AdminManagement from "@/pages/admin-management";
import BroadcastApprovals from "@/pages/broadcast-approvals";
import IncidentMap from "@/pages/incident-map";
import { Layout } from "@/components/layout/layout";
import { AuthGuard } from "@/components/auth-guard";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/trips/new" component={NewTrip} />
        <Route path="/trips/:id" component={TripDetail} />
        <Route path="/messages" component={Messages} />
        <Route path="/radar" component={Radar} />
        <Route path="/responders" component={Responders} />
        <Route path="/members/:id" component={MemberProfile} />
        <Route path="/members" component={Members} />
        <Route path="/membership" component={Membership} />
        <Route path="/broadcast" component={Broadcast} />
        <Route path="/operator/broadcast" component={OperatorBroadcast} />
        <Route path="/conversations" component={Conversations} />
        <Route path="/admin/admins" component={AdminManagement} />
        <Route path="/admin/approvals" component={BroadcastApprovals} />
        <Route path="/incidents" component={IncidentMap} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthGuard>
            <Router />
          </AuthGuard>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
