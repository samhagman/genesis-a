import { useState, useEffect } from "react";
import { Gear, CheckCircle, XCircle, Clock } from "@phosphor-icons/react";

export type AgentStatus =
  | "idle"
  | "thinking"
  | "validating"
  | "executing"
  | "success"
  | "error";

export interface AgentStatusDisplayProps {
  status: AgentStatus;
  message?: string;
  className?: string;
}

export function AgentStatusDisplay({
  status,
  message,
  className = "",
}: AgentStatusDisplayProps) {
  const [dots, setDots] = useState("");

  // Animate dots for loading states
  useEffect(() => {
    if (
      status === "thinking" ||
      status === "validating" ||
      status === "executing"
    ) {
      const interval = setInterval(() => {
        setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
      }, 500);
      return () => clearInterval(interval);
    } else {
      setDots("");
    }
  }, [status]);

  if (status === "idle") {
    return null;
  }

  const getStatusConfig = () => {
    switch (status) {
      case "thinking":
        return {
          icon: <Gear size={14} className="animate-spin" />,
          text: "Agent is thinking",
          color: "text-blue-600 dark:text-blue-400",
        };
      case "validating":
        return {
          icon: <CheckCircle size={14} className="animate-pulse" />,
          text: "Validating changes",
          color: "text-yellow-600 dark:text-yellow-400",
        };
      case "executing":
        return {
          icon: <Clock size={14} className="animate-pulse" />,
          text: "Executing workflow edit",
          color: "text-blue-600 dark:text-blue-400",
        };
      case "success":
        return {
          icon: <CheckCircle size={14} />,
          text: "Successfully updated workflow",
          color: "text-green-600 dark:text-green-400",
        };
      case "error":
        return {
          icon: <XCircle size={14} />,
          text: "Error updating workflow",
          color: "text-red-600 dark:text-red-400",
        };
      default:
        return {
          icon: <Gear size={14} />,
          text: "Processing",
          color: "text-neutral-600 dark:text-neutral-400",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg ${className}`}
    >
      <div className={config.color}>{config.icon}</div>
      <span className={`text-sm font-medium ${config.color}`}>
        {message || config.text}
        {dots}
      </span>
    </div>
  );
}
