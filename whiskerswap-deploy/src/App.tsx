import { Switch, Route } from "wouter";
import { TooltipProvider } from "./components/ui/tooltip";
import Swap from "./pages/swap";
import Points from "./pages/points";
import Referral from "./pages/referral";
import Docs from "./pages/docs";
import Liquidity from "./pages/liquidity";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Swap} />
      <Route path="/liquidity" component={Liquidity} />
      <Route path="/points" component={Points} />
      <Route path="/referral" component={Referral} />
      <Route path="/docs" component={Docs} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-slate-900 to-slate-800">
        <Router />
      </div>
    </TooltipProvider>
  );
}

export default App;
