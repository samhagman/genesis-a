import { ChatCircle, PencilSimple } from "@phosphor-icons/react";

export interface EditModeToggleProps {
  editMode: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export function EditModeToggle({
  editMode,
  onToggle,
  disabled = false,
}: EditModeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <ChatCircle
          size={16}
          className={editMode ? "text-neutral-400" : "text-[#F48120]"}
        />
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
          Chat
        </span>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onToggle(!editMode)}
        className={`h-6.5 w-10.5 rounded-full border border-transparent p-1 transition-colors ${
          disabled
            ? "cursor-not-allowed opacity-50 bg-neutral-200 dark:bg-neutral-700"
            : "cursor-pointer bg-neutral-250 dark:bg-neutral-750 hover:bg-neutral-300 dark:hover:bg-neutral-700"
        } ${
          editMode
            ? "bg-neutral-900 dark:bg-neutral-500 hover:bg-neutral-700 dark:hover:bg-neutral-450"
            : ""
        }`}
      >
        <div
          className={`aspect-square h-full rounded-full bg-white transition-all ${
            editMode ? "translate-x-full" : ""
          }`}
        />
      </button>

      <div className="flex items-center gap-1">
        <PencilSimple
          size={16}
          className={editMode ? "text-[#F48120]" : "text-neutral-400"}
        />
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
          Edit
        </span>
      </div>
    </div>
  );
}
