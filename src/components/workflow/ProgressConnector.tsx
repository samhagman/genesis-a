import type { Status } from "@/types/workflow";

export interface ProgressConnectorProps {
  className?: string;
  fromStatus: Status;
  toStatus: Status;
}

export function ProgressConnector({
  className = "",
  fromStatus,
  toStatus,
}: ProgressConnectorProps) {
  // Determine connector styling based on flow status
  const getConnectorStyling = () => {
    // If previous goal is completed, show active connection
    if (fromStatus === "COMPLETED") {
      return {
        lineColor: "bg-green-400 dark:bg-green-500",
        arrowColor: "border-t-green-400 dark:border-t-green-500",
      };
    }

    // If previous goal is in progress, show partial connection
    if (fromStatus === "IN_PROGRESS") {
      return {
        lineColor: "bg-blue-400 dark:bg-blue-500",
        arrowColor: "border-t-blue-400 dark:border-t-blue-500",
      };
    }

    // Default to neutral for pending
    return {
      lineColor: "bg-neutral-300 dark:bg-neutral-600",
      arrowColor: "border-t-neutral-300 dark:border-t-neutral-600",
    };
  };

  const styling = getConnectorStyling();

  return (
    <div className={`flex justify-center py-2 ${className}`}>
      <div
        className={`w-px h-8 ${styling.lineColor} relative transition-colors duration-300`}
      >
        {/* Arrow indicator */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1">
          <div
            className={`w-0 h-0 border-l-2 border-r-2 border-t-4 border-l-transparent border-r-transparent ${styling.arrowColor} transition-colors duration-300`}
          />
        </div>
      </div>
    </div>
  );
}
