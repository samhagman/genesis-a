import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ThreePanelLayout } from "@/components/layout/ThreePanelLayout";

describe("ThreePanelLayout", () => {
  it("renders three panels with provided content", () => {
    const leftContent = <div data-testid="left-panel">Left Panel Content</div>;
    const centerContent = (
      <div data-testid="center-panel">Center Panel Content</div>
    );
    const rightContent = (
      <div data-testid="right-panel">Right Panel Content</div>
    );

    render(
      <ThreePanelLayout
        leftPanel={leftContent}
        centerPanel={centerContent}
        rightPanel={rightContent}
      />
    );

    expect(screen.getByTestId("left-panel")).toBeInTheDocument();
    expect(screen.getByTestId("center-panel")).toBeInTheDocument();
    expect(screen.getByTestId("right-panel")).toBeInTheDocument();
  });

  it("applies correct CSS classes for layout structure", () => {
    const { container } = render(
      <ThreePanelLayout
        leftPanel={<div>Left</div>}
        centerPanel={<div>Center</div>}
        rightPanel={<div>Right</div>}
      />
    );

    const layoutContainer = container.firstChild as HTMLElement;
    expect(layoutContainer).toHaveClass("h-screen", "w-full", "flex");

    const panels = layoutContainer.children;
    expect(panels).toHaveLength(3);

    // Left panel should have fixed width
    expect(panels[0]).toHaveClass("w-96", "flex-shrink-0");

    // Center panel should be flexible
    expect(panels[1]).toHaveClass("flex-1");

    // Right panel should have fixed width
    expect(panels[2]).toHaveClass("w-80", "flex-shrink-0");
  });
});
