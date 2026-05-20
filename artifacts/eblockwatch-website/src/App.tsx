import { Switch, Route, Router as WouterRouter } from "wouter";
import HomePage from "@/pages/Home";
import MemberLogin from "@/pages/MemberLogin";
import MemberDashboard from "@/pages/MemberDashboard";
import UpgradePage from "@/pages/UpgradePage";
import RegisterPage from "@/pages/RegisterPage";
import JoinPage from "@/pages/JoinPage";
import NotFound from "@/pages/not-found";
import TermsAndConditions from "@/pages/TermsAndConditions";
import BackAppInstall from "@/pages/BackAppInstall";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/join" component={JoinPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/login" component={MemberLogin} />
      <Route path="/member" component={MemberDashboard} />
      <Route path="/my-account" component={MemberDashboard} />
      <Route path="/upgrade" component={UpgradePage} />
      <Route path="/terms" component={TermsAndConditions} />
      <Route path="/backapp" component={BackAppInstall} />
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
