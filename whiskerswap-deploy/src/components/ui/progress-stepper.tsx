import { cn } from "../../lib/utils";

interface Step {
  number: number;
  title: string;
  completed: boolean;
  active: boolean;
}

interface ProgressStepperProps {
  steps: Step[];
  className?: string;
}

export function ProgressStepper({ steps, className }: ProgressStepperProps) {
  return (
    <div className={cn("flex items-center justify-center space-x-2 sm:space-x-4 text-xs sm:text-sm px-2", className)}>
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div
              className={cn(
                "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-medium transition-colors text-xs sm:text-sm",
                step.completed || step.active
                  ? "bg-hyper-purple text-white glow"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {step.number}
            </div>
            <span
              className={cn(
                "transition-colors text-xs sm:text-sm",
                step.completed || step.active
                  ? "text-hyper-purple font-medium"
                  : "text-muted-foreground",
                "hidden xs:inline sm:inline"
              )}
            >
              {step.title}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "w-8 sm:w-16 h-0.5 mx-2 sm:mx-4 transition-colors",
                step.completed ? "bg-hyper-purple" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
