import { Switch, Route, Router as WouterRouter } from "wouter";
import HomePage from "@/pages/Home";
import MemberLogin from "@/pages/MemberLogin";
import MemberDashboard from "@/pages/MemberDashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/login" component={MemberLogin} />
      <Route path="/member" component={MemberDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Router />
    </WouterRouter>
  );
}

export default App;
