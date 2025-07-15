import type { ReactNode } from "react";

export interface ThreePanelLayoutProps {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
}

export function ThreePanelLayout({
  leftPanel,
  centerPanel,
  rightPanel,
}: ThreePanelLayoutProps) {
  return (
    <div className="h-full w-full flex bg-white dark:bg-neutral-950 overflow-hidden">
      {/* Left Panel - Chat */}
      <div className="w-96 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        {leftPanel}
      </div>

      {/* Center Panel - Workflow Visualization */}
      <div className="flex-1 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        {centerPanel}
      </div>

      {/* Right Panel - Inspector */}
      <div className="w-80 flex-shrink-0 bg-neutral-50 dark:bg-neutral-900">
        {rightPanel}
      </div>
    </div>
  );
}
