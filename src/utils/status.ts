import type { Status } from "@/types/workflow";

export interface StatusConfig {
  icon: string;
  label: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
}

export const getStatusConfig = (status: Status): StatusConfig => {
  switch (status) {
    case "COMPLETED":
      return {
        icon: "✅",
        label: "Completed",
        bgColor: "bg-green-50 dark:bg-green-900/20",
        borderColor: "border-green-200 dark:border-green-800",
        textColor: "text-green-700 dark:text-green-300",
        iconColor: "text-green-600 dark:text-green-400",
      };
    case "IN_PROGRESS":
      return {
        icon: "🔄",
        label: "In Progress",
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
        borderColor: "border-blue-200 dark:border-blue-800",
        textColor: "text-blue-700 dark:text-blue-300",
        iconColor: "text-blue-600 dark:text-blue-400",
      };
    case "PENDING":
      return {
        icon: "⏳",
        label: "Pending",
        bgColor: "bg-neutral-50 dark:bg-neutral-800",
        borderColor: "border-neutral-200 dark:border-neutral-700",
        textColor: "text-neutral-600 dark:text-neutral-400",
        iconColor: "text-neutral-500 dark:text-neutral-400",
      };
    default:
      // Fallback to PENDING
      return getStatusConfig("PENDING");
  }
};

export const getStatusIcon = (status: Status): string => {
  return getStatusConfig(status).icon;
};

export const getStatusLabel = (status: Status): string => {
  return getStatusConfig(status).label;
};

export const getStatusColors = (status: Status) => {
  const config = getStatusConfig(status);
  return {
    bgColor: config.bgColor,
    borderColor: config.borderColor,
    textColor: config.textColor,
    iconColor: config.iconColor,
  };
};

// Helper function to get goal border styling based on status
export const getGoalBorderStyling = (
  status: Status,
  isSelected: boolean
): string => {
  const config = getStatusConfig(status);

  if (isSelected) {
    return "border-blue-500 bg-blue-50 dark:bg-blue-900/20";
  }

  return `${config.borderColor} ${config.bgColor} hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-750`;
};

// Helper function to get subtask styling based on status
export const getSubtaskStyling = (
  status: Status,
  isSelected: boolean
): string => {
  const config = getStatusConfig(status);

  if (isSelected) {
    return "bg-blue-100 dark:bg-blue-800/30 border border-blue-200 dark:border-blue-700";
  }

  return `${config.bgColor} ${config.borderColor} hover:bg-neutral-50 dark:hover:bg-neutral-800`;
};
