import type { WorkflowTemplate } from "@/types/workflow";
import employeeOnboardingData from "./employee-onboarding.json";

export async function loadWorkflowTemplate(
  templateId: string
): Promise<WorkflowTemplate> {
  // For V1, we only have the employee onboarding template
  if (templateId === "employee-onboarding") {
    return employeeOnboardingData as WorkflowTemplate;
  }

  throw new Error(`Workflow template "${templateId}" not found`);
}

export function getWorkflowTemplateList(): string[] {
  return ["employee-onboarding"];
}
