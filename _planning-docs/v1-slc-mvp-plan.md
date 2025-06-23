# Genesis V1 SLC MVP Plan

## Project Overview

Genesis is a workflow visualization and management application built on Cloudflare Workers. The V1 SLC MVP focuses on creating a three-panel interface:

1. **Left Panel**: Existing Cloudflare chat interface (reuse as-is)
2. **Center Panel**: Vertical workflow visualization
3. **Right Panel**: Element inspection panel for detailed workflow information

## Architecture Overview

### Core Principles

- **Cloudflare-First**: Leverage existing Cloudflare ecosystem and components
- **Progressive Enhancement**: V1 focuses on viewing/inspection, V2 adds agent modification
- **Minimal Dependencies**: Keep bundle size small, avoid heavy libraries
- **Type Safety**: Full TypeScript integration throughout

### Three-Panel Layout

```
┌─────────────┬──────────────────────┬─────────────────┐
│    Chat     │    Workflow View     │   Inspector     │
│   (Reuse    │    (New - Center)    │   (New - Right) │
│  Existing)  │                      │                 │
│             │  ┌─────────────────┐ │                 │
│             │  │     Start       │ │  Selected Node  │
│             │  └─────────────────┘ │  Details:       │
│             │          │           │  - Type         │
│             │          ▼           │  - Properties   │
│             │  ┌─────────────────┐ │  - Status       │
│             │  │   Task Node     │ │  - Metadata     │
│             │  └─────────────────┘ │                 │
│             │          │           │                 │
│             │          ▼           │                 │
│             │  ┌─────────────────┐ │                 │
│             │  │   End Node      │ │                 │
│             │  └─────────────────┘ │                 │
└─────────────┴──────────────────────┴─────────────────┘
```

## System Design

### Architecture Overview

Genesis V1 follows a simple, component-based architecture with minimal state management. The system prioritizes developer experience through clear separation of concerns and strongly-typed interfaces.

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                           App.tsx                              │
│                    ┌─────────────────┐                        │
│                    │  selectedItemId │                        │
│                    │   (useState)    │                        │
│                    └─────────────────┘                        │
│  ┌─────────────────┬─────────────────┬─────────────────────┐   │
│  │   ChatPanel     │ WorkflowPanel   │   InspectorPanel    │   │
│  │   (existing)    │     (new)       │       (new)         │   │
│  │                 │                 │                     │   │
│  │  ┌───────────┐  │  ┌───────────┐  │  ┌───────────────┐  │   │
│  │  │Existing   │  │  │GoalCard   │  │  │Selected Item  │  │   │
│  │  │Chat UI    │  │  │ ├─Subtask │◄─┼──┤Details        │  │   │
│  │  │Components │  │  │ ├─Subtask │  │  │               │  │   │
│  │  │           │  │  │ └─Subtask │  │  │• Goal Info    │  │   │
│  │  └───────────┘  │  └───────────┘  │  │• Subtask Info │  │   │
│  │                 │        │        │  │• Metadata     │  │   │
│  │                 │        │ onClick │  └───────────────┘  │   │
│  │                 │        ▼        │         ▲           │   │
│  │                 │  ┌───────────┐  │         │           │   │
│  │                 │  │GoalCard   │  │         │           │   │
│  │                 │  │ ├─Subtask │──┼─────────┘           │   │
│  │                 │  │ ├─Subtask │  │                     │   │
│  │                 │  │ └─Subtask │  │                     │   │
│  │                 │  └───────────┘  │                     │   │
│  └─────────────────┴─────────────────┴─────────────────────┘   │
│                           │                                    │
│                           ▼                                    │
│                    ┌─────────────────┐                        │
│                    │ /workflows/     │                        │
│                    │ employee-       │                        │
│                    │ onboarding.json │                        │
│                    └─────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **App Initialization**: Loads WorkflowTemplate from static JSON file
2. **User Interaction**: User clicks on goal or subtask in WorkflowPanel
3. **State Update**: onClick handler updates `selectedItemId` in App state
4. **Inspector Update**: InspectorPanel receives selectedItemId and displays details
5. **Chat Independence**: ChatPanel operates independently with no data sharing

### Core Services & Components

#### 1. Data Layer (`/src/workflows/`)

**Purpose**: Static JSON files containing WorkflowTemplate definitions
**Responsibility**: Provide workflow structure and metadata
**Interface**: File system access via import/fetch

#### 2. State Management (`App.tsx`)

**Purpose**: Manage application-wide state
**Responsibility**: Track selected item and workflow data
**Interface**: React useState for selectedItemId

#### 3. Layout Service (`ThreePanelLayout.tsx`)

**Purpose**: Manage three-panel layout structure
**Responsibility**: Position and size chat, workflow, and inspector panels
**Interface**: Renders child components in fixed layout

#### 4. Workflow Visualization (`WorkflowPanel/`)

**Purpose**: Render goals and subtasks visually
**Responsibility**: Display workflow structure, handle user clicks
**Interface**: Receives workflow data and selection handlers

#### 5. Inspection Service (`InspectorPanel/`)

**Purpose**: Display detailed information about selected items
**Responsibility**: Show goal/subtask details, metadata, and relationships
**Interface**: Receives selected item data and renders details

### Strongly Typed Interfaces

#### Core Data Types

```typescript
// src/types/workflow.ts

export interface Subtask {
  subtaskId: string;
  name: string;
  description: string;
  required: boolean;
  estimatedDuration: string;
}

export interface Goal {
  goalId: string;
  name: string;
  description: string;
  icon: string;
  owner: string;
  estimatedDuration: string;
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
```

#### Component Interfaces

```typescript
// src/types/components.ts

export interface SelectedItem {
  type: "goal" | "subtask";
  id: string;
  data: Goal | Subtask;
}

export interface WorkflowPanelProps {
  workflow: WorkflowTemplate;
  selectedItemId: string | null;
  onItemSelect: (type: "goal" | "subtask", id: string) => void;
}

export interface InspectorPanelProps {
  selectedItem: SelectedItem | null;
  workflow: WorkflowTemplate;
}

export interface GoalCardProps {
  goal: Goal;
  isSelected: boolean;
  selectedSubtaskId: string | null;
  onGoalSelect: (goalId: string) => void;
  onSubtaskSelect: (subtaskId: string) => void;
}
```

#### State Management Interface

```typescript
// src/types/state.ts

export interface AppState {
  workflow: WorkflowTemplate | null;
  selectedItemId: string | null;
  selectedItemType: "goal" | "subtask" | null;
}

export interface SelectionHandlers {
  selectGoal: (goalId: string) => void;
  selectSubtask: (subtaskId: string) => void;
  clearSelection: () => void;
}
```

### File Structure

```
src/
├── components/
│   ├── workflow/
│   │   ├── WorkflowPanel.tsx      # Main workflow container
│   │   ├── GoalCard.tsx           # Individual goal component
│   │   ├── SubtaskList.tsx        # Subtask list within goal
│   │   └── SubtaskItem.tsx        # Individual subtask component
│   ├── inspector/
│   │   ├── InspectorPanel.tsx     # Main inspector container
│   │   ├── GoalInspector.tsx      # Goal detail display
│   │   └── SubtaskInspector.tsx   # Subtask detail display
│   └── layout/
│       └── ThreePanelLayout.tsx   # Layout container
├── types/
│   ├── workflow.ts                # Core data types
│   ├── components.ts              # Component prop types
│   └── state.ts                   # State management types
├── workflows/
│   ├── employee-onboarding.json   # Sample workflow template
│   └── index.ts                   # Workflow loader utilities
└── App.tsx                        # Main application entry
```

### Service Contracts

#### Workflow Loading Service

```typescript
// src/workflows/index.ts

export async function loadWorkflowTemplate(
  templateId: string
): Promise<WorkflowTemplate> {
  // Load and validate workflow template
  // Return typed WorkflowTemplate object
}

export function getWorkflowTemplateList(): string[] {
  // Return list of available template IDs
}
```

#### Selection Service

```typescript
// src/utils/selection.ts

export function findSelectedItem(
  workflow: WorkflowTemplate,
  itemId: string,
  type: "goal" | "subtask"
): SelectedItem | null {
  // Find and return selected item with type safety
}

export function getItemBreadcrumb(
  workflow: WorkflowTemplate,
  itemId: string,
  type: "goal" | "subtask"
): string[] {
  // Return breadcrumb path for navigation
}
```

### Development Principles

1. **Single Responsibility**: Each component has one clear purpose
2. **Type Safety**: All interfaces strongly typed with TypeScript
3. **Prop Drilling Minimization**: State lives in App.tsx, passed down explicitly
4. **Static Data**: No APIs or databases, just JSON file imports
5. **Component Isolation**: Chat panel completely independent
6. **Clear Contracts**: All component props and state explicitly typed

This design ensures a simple, maintainable codebase that can evolve incrementally while maintaining type safety and clear separation of concerns.

## Technical Decisions

### Workflow Schema

**Decision**: Sequential Goals with Subtasks model
**Rationale**:

- Aligns with how business processes actually work (sequential phases)
- No coordinate system needed - simple top-to-bottom rendering
- Visual edges only between goals, not complex graph structure
- Perfect for viewing/inspection use case in V1

#### WorkflowTemplate vs WorkflowInstance

**V1 Focus**: `WorkflowTemplate` - the static blueprint definition
**V2 Addition**: `WorkflowInstance` - live execution tracking for specific subjects

#### Example Employee Onboarding WorkflowTemplate

```json
{
  "templateId": "employee-onboarding",
  "name": "Employee Onboarding Process",
  "version": "1.0.0",
  "description": "Standard onboarding workflow for new employees",
  "createdAt": "2024-01-01T00:00:00Z",
  "goals": [
    {
      "goalId": "documentation-paperwork",
      "name": "Documentation & Paperwork",
      "description": "Complete all required employment documentation",
      "icon": "📄",
      "owner": "HR",
      "estimatedDuration": "1 hour",
      "subtasks": [
        {
          "subtaskId": "i9-form",
          "name": "Complete I-9 Form",
          "description": "Employment eligibility verification",
          "required": true,
          "estimatedDuration": "15 minutes"
        },
        {
          "subtaskId": "w4-form",
          "name": "Complete W-4 Form",
          "description": "Federal tax withholding information",
          "required": true,
          "estimatedDuration": "10 minutes"
        },
        {
          "subtaskId": "emergency-contacts",
          "name": "Emergency Contact Information",
          "description": "Provide emergency contact details",
          "required": true,
          "estimatedDuration": "5 minutes"
        },
        {
          "subtaskId": "direct-deposit",
          "name": "Direct Deposit Setup",
          "description": "Banking information for payroll",
          "required": false,
          "estimatedDuration": "10 minutes"
        }
      ]
    },
    {
      "goalId": "background-verification",
      "name": "Background Verification",
      "description": "Complete security and reference checks",
      "icon": "🔍",
      "owner": "Security",
      "estimatedDuration": "2-3 business days",
      "subtasks": [
        {
          "subtaskId": "reference-check",
          "name": "Reference Verification",
          "description": "Contact previous employers and references",
          "required": true,
          "estimatedDuration": "1 business day"
        },
        {
          "subtaskId": "employment-history",
          "name": "Employment History Verification",
          "description": "Verify previous employment records",
          "required": true,
          "estimatedDuration": "1-2 business days"
        },
        {
          "subtaskId": "criminal-background",
          "name": "Criminal Background Check",
          "description": "Standard background screening",
          "required": true,
          "estimatedDuration": "1 business day"
        }
      ]
    },
    {
      "goalId": "equipment-access",
      "name": "Equipment & Access Setup",
      "description": "Provision technology and system access",
      "icon": "💻",
      "owner": "IT",
      "estimatedDuration": "2 hours",
      "subtasks": [
        {
          "subtaskId": "laptop-setup",
          "name": "Laptop Configuration",
          "description": "Set up company laptop with required software",
          "required": true,
          "estimatedDuration": "1 hour"
        },
        {
          "subtaskId": "account-creation",
          "name": "Create System Accounts",
          "description": "Email, Slack, project management tools",
          "required": true,
          "estimatedDuration": "30 minutes"
        },
        {
          "subtaskId": "security-badge",
          "name": "Security Badge & Building Access",
          "description": "Physical access to office facilities",
          "required": true,
          "estimatedDuration": "15 minutes"
        },
        {
          "subtaskId": "software-licenses",
          "name": "Software License Assignment",
          "description": "Assign licenses for productivity tools",
          "required": false,
          "estimatedDuration": "15 minutes"
        }
      ]
    },
    {
      "goalId": "orientation-training",
      "name": "Orientation & Training",
      "description": "Schedule and complete initial training",
      "icon": "📅",
      "owner": "HR",
      "estimatedDuration": "4 hours",
      "subtasks": [
        {
          "subtaskId": "schedule-orientation",
          "name": "Schedule Orientation Session",
          "description": "Book first-day orientation meeting",
          "required": true,
          "estimatedDuration": "15 minutes"
        },
        {
          "subtaskId": "assign-buddy",
          "name": "Assign Onboarding Buddy",
          "description": "Pair with experienced team member",
          "required": true,
          "estimatedDuration": "10 minutes"
        },
        {
          "subtaskId": "first-day-meeting",
          "name": "First Day Team Meeting",
          "description": "Introduction to immediate team and role",
          "required": true,
          "estimatedDuration": "1 hour"
        },
        {
          "subtaskId": "security-training",
          "name": "Security & Compliance Training",
          "description": "Company security policies and procedures",
          "required": true,
          "estimatedDuration": "2 hours"
        }
      ]
    }
  ]
}
```

### Visualization Approach

**Decision**: Simple React component-based vertical renderer
**Rationale**:

- Sequential goals render as vertical cards (no coordinate system needed)
- Subtasks display as expandable lists within each goal card
- Simple connecting lines between goals (CSS-based, not SVG)
- Leverages existing Tailwind/Card components from codebase
- Perfect for business process visualization

### Visual Structure

```
Goal 1: Documentation & Paperwork    [COMPLETED ✅]
├── Complete I-9 Form               [✅]
├── Complete W-4 Form               [✅]
├── Emergency Contact Info          [✅]
└── Direct Deposit Setup            [✅]
         │
         ▼ (simple CSS line)
Goal 2: Background Verification      [IN PROGRESS 🔄]
├── Reference Verification          [✅]
├── Employment History               [🔄]
└── Criminal Background Check        [⏳]
         │
         ▼
Goal 3: Equipment & Access           [PENDING ⏳]
├── Laptop Configuration             [⏳]
├── Create System Accounts           [⏳]
├── Security Badge                   [⏳]
└── Software Licenses                [⏳]
         │
         ▼
Goal 4: Orientation & Training       [PENDING ⏳]
├── Schedule Orientation             [⏳]
├── Assign Buddy                     [⏳]
├── First Day Meeting                [⏳]
└── Security Training                [⏳]
```

### Component Structure

```
src/
├── components/
│   ├── workflow/
│   │   ├── WorkflowView.tsx            # Main workflow container
│   │   ├── GoalCard.tsx                # Individual goal renderer
│   │   ├── SubtaskList.tsx             # Expandable subtask list
│   │   ├── SubtaskItem.tsx             # Individual subtask display
│   │   └── ProgressConnector.tsx       # Simple line between goals
│   ├── inspector/
│   │   ├── InspectorPanel.tsx          # Right panel container
│   │   ├── GoalInspector.tsx           # Goal detail view
│   │   ├── SubtaskInspector.tsx        # Subtask detail view
│   │   └── WorkflowInspector.tsx       # Overall workflow info
│   └── layout/
│       └── ThreePanelLayout.tsx        # Main layout component
```

## Implementation Phases

### Phase 1: Layout Foundation (Week 1)

**Goal**: Create the three-panel layout with existing chat integration

**Tasks**:

- [x] Create `ThreePanelLayout.tsx` component
- [x] Integrate existing chat component into left panel

**Acceptance Criteria**:

- Three panels visible and functional
- Chat works exactly as before

### Phase 2: Workflow Visualization Core (Week 2)

**Goal**: Build sequential goal-based workflow display

**Tasks**:

- [x] Define TypeScript interfaces for WorkflowTemplate schema
- [x] Create `WorkflowPanel.tsx` container component (implemented as WorkflowPanel instead of WorkflowView)
- [x] Implement `GoalCard.tsx` with status indicators and icons
- [x] Implement `SubtaskList.tsx` with expandable/collapsible functionality
- [x] Subtask rendering integrated into SubtaskList (no separate SubtaskItem component needed)
- [x] Add `ProgressConnector.tsx` for simple lines between goals
- [x] Add click handlers for goal and subtask selection

**Acceptance Criteria**:

- Can load and display employee onboarding workflow template
- Goals render as cards with proper status indicators (COMPLETED, IN_PROGRESS, PENDING)
- Subtasks display in expandable lists within goal cards
- Simple connecting lines show progression between goals
- Clicking goals/subtasks selects them with visual feedback
- Vertical layout flows sequentially from top to bottom

### Phase 3: Inspector Panel (Week 3)

**Goal**: Add detailed inspection capabilities for goals and subtasks

**Tasks**:

- [x] Create `InspectorPanel.tsx` for right panel container
- [x] Implement `GoalInspector.tsx` for selected goal details
- [x] Implement `SubtaskInspector.tsx` for selected subtask details
- [x] Add `WorkflowInspector.tsx` for overall workflow template info
- [x] Display goal metadata (owner, duration, description, subtask count)
- [x] Display subtask metadata (required status, duration, description)
- [x] Add workflow statistics (total goals, subtasks, estimated duration)
- [x] Style inspector with consistent design system

**Acceptance Criteria**:

- Right panel shows goal details when goal card is selected
- Right panel shows subtask details when individual subtask is clicked
- Goal information displays correctly (owner, icon, duration, subtasks)
- Subtask information shows all metadata (required, description, timing)
- Workflow overview shows summary statistics and progress
- Inspector panel scrolls properly for long content
- Consistent styling with rest of application

### Phase 4: Workflow Progress Highlighting (Week 4)

**Goal**: Add workflow progress highlighting (completed vs pending goals and subtasks)

**Tasks**:

- [x] Extend WorkflowTemplate schema to include status fields for goals and subtasks
- [x] Implement visual status indicators for goals (COMPLETED ✅, IN_PROGRESS 🔄, PENDING ⏳)
- [x] Implement visual status indicators for subtasks with consistent iconography
- [x] Add progress highlighting in GoalCard components with color-coded borders/backgrounds
- [x] Add progress highlighting in SubtaskList components with status icons
- [x] Update ProgressConnector between goals to show completion flow
- [x] Enhance inspector panel to display goal/subtask completion status and metadata
- [x] Add overall workflow progress summary (e.g., "2 of 4 goals completed")

**Acceptance Criteria**:

- Goals visually indicate their status (completed, in progress, pending) with distinct colors and icons
- Subtasks within goals show individual completion status with clear visual hierarchy
- Progress connectors between goals reflect the sequential completion flow
- Inspector panel displays detailed status information for selected goals/subtasks
- Overall workflow progress is clearly communicated through visual indicators
- Status highlighting works consistently across the entire workflow visualization
- Progress indicators are accessible and follow established design patterns

## Data Management

### Workflow Storage

**V1 Approach**: Static WorkflowTemplate JSON files in `/src/workflows/` directory
**V2 Future**:

- WorkflowTemplates in Cloudflare KV for versioning
- WorkflowInstances in Cloudflare D1 for live tracking

### V2 Preview: WorkflowInstance Example

For V2 when we add live tracking, a WorkflowInstance would look like:

```json
{
  "instanceId": "inst_jane_doe_onboarding",
  "templateId": "employee-onboarding",
  "templateVersion": "1.0.0",
  "subjectId": "employee_jane_doe",
  "subjectName": "Jane Doe",
  "status": "IN_PROGRESS",
  "createdAt": "2024-01-15T09:00:00Z",
  "updatedAt": "2024-01-16T14:30:00Z",
  "currentGoal": "background-verification",
  "goalStatuses": [
    {
      "goalId": "documentation-paperwork",
      "status": "COMPLETED",
      "completedAt": "2024-01-15T11:00:00Z",
      "subtaskStatuses": [
        {
          "subtaskId": "i9-form",
          "status": "COMPLETED",
          "completedAt": "2024-01-15T09:30:00Z",
          "completedBy": "jane.doe"
        },
        {
          "subtaskId": "w4-form",
          "status": "COMPLETED",
          "completedAt": "2024-01-15T10:00:00Z",
          "completedBy": "jane.doe"
        },
        {
          "subtaskId": "emergency-contacts",
          "status": "COMPLETED",
          "completedAt": "2024-01-15T10:15:00Z",
          "completedBy": "jane.doe"
        },
        {
          "subtaskId": "direct-deposit",
          "status": "COMPLETED",
          "completedAt": "2024-01-15T10:45:00Z",
          "completedBy": "jane.doe"
        }
      ]
    },
    {
      "goalId": "background-verification",
      "status": "IN_PROGRESS",
      "startedAt": "2024-01-15T11:00:00Z",
      "subtaskStatuses": [
        {
          "subtaskId": "reference-check",
          "status": "COMPLETED",
          "completedAt": "2024-01-16T12:00:00Z",
          "completedBy": "security.team"
        },
        {
          "subtaskId": "employment-history",
          "status": "IN_PROGRESS",
          "startedAt": "2024-01-16T10:00:00Z",
          "assignedTo": "security.team"
        },
        { "subtaskId": "criminal-background", "status": "PENDING" }
      ]
    },
    {
      "goalId": "equipment-access",
      "status": "PENDING"
    },
    {
      "goalId": "orientation-training",
      "status": "PENDING"
    }
  ]
}
```

### Sample WorkflowTemplates

- **Employee Onboarding** (primary example - 4 goals, 15 subtasks)
- **Customer Support Ticket Resolution** (5 goals: Triage → Investigation → Resolution → Testing → Closure)
- **Invoice Approval Process** (3 goals: Validation → Approval → Payment Processing)
- **IT Help Desk Request** (4 goals: Intake → Diagnosis → Implementation → Verification)

## Testing Strategy

### Unit Tests

- Component rendering tests for all workflow components (GoalCard, SubtaskList, etc.)
- Schema validation tests for WorkflowTemplate JSON
- Goal expansion/collapse functionality tests
- Status indicator rendering tests

### Integration Tests

- Three-panel layout interaction tests
- WorkflowTemplate loading and display tests
- Inspector panel data binding tests (goal ↔ subtask details)
- Search and filter functionality tests

### E2E Tests

- Full user journey: load workflow → click goal → expand subtasks → inspect details

## V2 Preparation

### Agent Integration Points

- Define WorkflowTemplate modification API (add/remove goals/subtasks)
- Plan for real-time collaboration between chat and workflow visualization
- Design WorkflowInstance creation and status tracking
- Consider agent-driven subtask completion and goal progression

### Extensibility Hooks

- Template versioning system for schema evolution
- Custom goal/subtask metadata field support
- Export/import functionality for WorkflowTemplates

## Technical Debt & Risks

### Known V1 Limitations

- Static WorkflowTemplates only (no dynamic loading from APIs)
- No WorkflowInstance support (no live status tracking)
- No real-time collaboration or multi-user access
- No workflow execution (visualization and inspection only)
- Limited to sequential goal progression (no parallel paths)

### Risk Mitigation

- WorkflowTemplate schema versioning to handle future changes
- Component abstraction to allow different visualization modes
- Clear separation between template and instance data models

## Success Metrics

### V1 Success Criteria

- [x] All three panels functional and integrated with existing chat
- [x] Employee onboarding WorkflowTemplate displays correctly with 4 goals
- [x] Inspector panel shows comprehensive goal and subtask details
- [x] Goal expansion/collapse works smoothly (subtasks always visible with interactive selection)
- [x] Full test coverage (>90% for workflow components) - 54 tests passing

### User Experience Goals

- Intuitive goal and subtask navigation
- Clear visual hierarchy between goals and subtasks
- Consistent with existing Cloudflare design patterns
- Smooth interactions for expand/collapse and selection

## Next Steps

1. **Immediate**: Begin Phase 1 implementation (three-panel layout foundation)
2. **Week 2**: User testing with employee onboarding WorkflowTemplate
3. **Week 3**: Gather feedback and iterate on goal/subtask inspector panel
4. **Week 4**: Performance optimization and enhanced interactions
5. **Future**: Plan V2 WorkflowInstance tracking and agent integration

---

_This plan represents the complete V1 SLC MVP scope focused on sequential goal-based workflow visualization. Each phase builds incrementally toward a functional system that displays WorkflowTemplates with goals and subtasks, integrating seamlessly with the existing Cloudflare chat interface. The simplified approach eliminates complex graph structures in favor of intuitive business process visualization._
