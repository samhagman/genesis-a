export type Status = "COMPLETED" | "IN_PROGRESS" | "PENDING";

export interface Subtask {
  subtaskId: string;
  name: string;
  description: string;
  required: boolean;
  estimatedDuration: string;
  status: Status;
}

export interface Goal {
  goalId: string;
  name: string;
  description: string;
  icon: string;
  owner: string;
  estimatedDuration: string;
  status: Status;
  subtasks: Subtask[];
}

export interface WorkflowTemplate {
  templateId: string;
  name: string;
  version: string;
  description: string;
  createdAt: string;
  goals: Goal[];
}
