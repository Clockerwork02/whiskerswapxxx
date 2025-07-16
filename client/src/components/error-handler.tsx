import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorHandlerProps {
  error: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export function ErrorHandler({ error, onRetry, isRetrying = false }: ErrorHandlerProps) {
  // Detect specific error types
  const isRateLimit = error.includes('rate limit') || error.includes('upstream') || error.includes('-32603');
  const isInsufficientFunds = error.includes('insufficient funds');
  const isUserRejected = error.includes('User rejected') || error.includes('cancelled');

  let title = 'Transaction Failed';
  let description = 'An unexpected error occurred.';
  let solution = 'Please try again or check your wallet connection.';

  if (isRateLimit) {
    title = 'Network Congestion';
    description = 'HyperEVM RPC endpoints are experiencing high traffic.';
    solution = 'Click retry to use backup RPC endpoints.';
  } else if (isInsufficientFunds) {
    title = 'Insufficient Balance';
    description = 'Not enough HYPE for transaction and gas fees.';
    solution = 'Add more HYPE to your wallet.';
  } else if (isUserRejected) {
    title = 'Transaction Cancelled';
    description = 'You cancelled the transaction in your wallet.';
    solution = 'Try again and approve the transaction.';
  }

  return (
    <Alert className="border-red-500/50 bg-red-500/10">
      <AlertTriangle className="h-4 w-4 text-red-500" />
      <AlertDescription>
        <div className="space-y-3">
          <div>
            <div className="font-semibold text-red-400">{title}</div>
            <div className="text-sm text-gray-300 mt-1">{description}</div>
          </div>
          
          <div className="text-sm text-gray-400">
            <strong>Solution:</strong> {solution}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={onRetry}
              disabled={isRetrying}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  {isRateLimit ? 'Retry with Backup RPC' : 'Retry Transaction'}
                </>
              )}
            </Button>
          </div>

          {isRateLimit && (
            <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="text-xs text-blue-300">
                <strong>RPC Status:</strong> Switching to backup servers
                <br />
                <strong>Network:</strong> HyperEVM (Chain ID: 999)
                <br />
                <strong>Available:</strong> 3 backup RPC endpoints
              </div>
            </div>
          )}

          <div className="mt-2 p-2 bg-slate-800/50 rounded text-xs text-gray-400 font-mono break-all">
            {error}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}