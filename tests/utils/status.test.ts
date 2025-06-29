import type { Status } from "@/types/workflow";
import {
  getGoalBorderStyling,
  getStatusColors,
  getStatusConfig,
  getStatusIcon,
  getStatusLabel,
  getSubtaskStyling,
} from "@/utils/status";
import { describe, expect, it } from "vitest";

describe("Status Utilities", () => {
  describe("getStatusConfig", () => {
    it("returns correct config for COMPLETED status", () => {
      const config = getStatusConfig("COMPLETED");
      expect(config.icon).toBe("✅");
      expect(config.label).toBe("Completed");
      expect(config.bgColor).toContain("green");
      expect(config.borderColor).toContain("green");
      expect(config.textColor).toContain("green");
    });

    it("returns correct config for IN_PROGRESS status", () => {
      const config = getStatusConfig("IN_PROGRESS");
      expect(config.icon).toBe("🔄");
      expect(config.label).toBe("In Progress");
      expect(config.bgColor).toContain("blue");
      expect(config.borderColor).toContain("blue");
      expect(config.textColor).toContain("blue");
    });

    it("returns correct config for PENDING status", () => {
      const config = getStatusConfig("PENDING");
      expect(config.icon).toBe("⏳");
      expect(config.label).toBe("Pending");
      expect(config.bgColor).toContain("neutral");
      expect(config.borderColor).toContain("neutral");
      expect(config.textColor).toContain("neutral");
    });
  });

  describe("getStatusIcon", () => {
    it("returns correct icons for all statuses", () => {
      expect(getStatusIcon("COMPLETED")).toBe("✅");
      expect(getStatusIcon("IN_PROGRESS")).toBe("🔄");
      expect(getStatusIcon("PENDING")).toBe("⏳");
    });
  });

  describe("getStatusLabel", () => {
    it("returns correct labels for all statuses", () => {
      expect(getStatusLabel("COMPLETED")).toBe("Completed");
      expect(getStatusLabel("IN_PROGRESS")).toBe("In Progress");
      expect(getStatusLabel("PENDING")).toBe("Pending");
    });
  });

  describe("getStatusColors", () => {
    it("returns color object with all required properties", () => {
      const colors = getStatusColors("COMPLETED");
      expect(colors).toHaveProperty("bgColor");
      expect(colors).toHaveProperty("borderColor");
      expect(colors).toHaveProperty("textColor");
      expect(colors).toHaveProperty("iconColor");
    });
  });

  describe("getGoalBorderStyling", () => {
    it("returns selected styling when goal is selected", () => {
      const styling = getGoalBorderStyling("PENDING", true);
      expect(styling).toContain("border-blue-500");
      expect(styling).toContain("bg-blue-50");
    });

    it("returns status-based styling when goal is not selected", () => {
      const completedStyling = getGoalBorderStyling("COMPLETED", false);
      expect(completedStyling).toContain("border-green");
      expect(completedStyling).toContain("bg-green");

      const pendingStyling = getGoalBorderStyling("PENDING", false);
      expect(pendingStyling).toContain("border-neutral");
      expect(pendingStyling).toContain("bg-neutral");
    });
  });

  describe("getSubtaskStyling", () => {
    it("returns selected styling when subtask is selected", () => {
      const styling = getSubtaskStyling("PENDING", true);
      expect(styling).toContain("bg-blue-100");
      expect(styling).toContain("border-blue-200");
    });

    it("returns status-based styling when subtask is not selected", () => {
      const completedStyling = getSubtaskStyling("COMPLETED", false);
      expect(completedStyling).toContain("bg-green");
      expect(completedStyling).toContain("border-green");

      const pendingStyling = getSubtaskStyling("PENDING", false);
      expect(pendingStyling).toContain("bg-neutral");
      expect(pendingStyling).toContain("border-neutral");
    });
  });

  describe("Type Safety", () => {
    it("handles all valid status values", () => {
      const statuses: Status[] = ["COMPLETED", "IN_PROGRESS", "PENDING"];

      for (const status of statuses) {
        expect(() => getStatusConfig(status)).not.toThrow();
        expect(getStatusIcon(status)).toBeTruthy();
        expect(getStatusLabel(status)).toBeTruthy();
      }
    });
  });
});
