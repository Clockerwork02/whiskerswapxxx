import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { CheckCircle, AlertTriangle, ExternalLink, Loader2 } from "lucide-react";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: "loading" | "success" | "error";
  transactionHash?: string;
  error?: string;
}

export function TransactionModal({
  isOpen,
  onClose,
  status,
  transactionHash,
  error
}: TransactionModalProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="w-8 h-8 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case "error":
        return <AlertTriangle className="w-8 h-8 text-red-500" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case "loading":
        return "Processing Transaction";
      case "success":
        return "Transaction Successful";
      case "error":
        return "Transaction Failed";
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case "loading":
        return "Please wait while your transaction is being processed...";
      case "success":
        return "Your transaction has been completed successfully.";
      case "error":
        return error || "An error occurred while processing your transaction.";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            {getStatusTitle()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {getStatusMessage()}
          </p>
          
          {transactionHash && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Transaction Hash:</p>
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono bg-muted p-2 rounded truncate flex-1">
                  {transactionHash}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://explorer.hyperliquid.xyz/tx/${transactionHash}`, '_blank')}
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}