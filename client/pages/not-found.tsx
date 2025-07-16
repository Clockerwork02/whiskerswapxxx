import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <Card className="bg-slate-800/90 backdrop-blur-md border-hyper-mint/30 shadow-2xl">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-6xl font-bold text-hyper-mint">404</div>
                <h1 className="text-2xl font-bold text-white">Page Not Found</h1>
                <p className="text-gray-400">
                  The page you're looking for doesn't exist or has been moved.
                </p>
                <div className="flex gap-2 justify-center">
                  <Link href="/">
                    <Button className="bg-gradient-to-r from-hyper-mint to-hyper-glow hover:from-hyper-mint/80 hover:to-hyper-glow/80 text-black font-semibold">
                      <Home className="w-4 h-4 mr-2" />
                      Go Home
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={() => window.history.back()} className="border-hyper-mint text-hyper-mint hover:bg-hyper-mint hover:text-black">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go Back
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}