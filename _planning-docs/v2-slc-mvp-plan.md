# Genesis V2 SLC MVP Plan

## Project Evolution Overview

Genesis V2 represents a sophisticated workflow visualization platform supporting Goals + Constraints + Policies + Tasks + Forms with AI agent and human task assignment.

### V2 Architecture Overview

**Core Capabilities**:

- Complex WorkflowTemplate with Goals containing Constraints, Policies, Tasks, and Forms
- Dynamic workflow execution with AI agents and human task assignment
- Enhanced three-panel layout: Chat | Rich Workflow Visualization | Multi-Element Inspector
- Deep inspection of constraints, policies, task assignments, and form structures

## New Schema Architecture

### Core Workflow Elements

Based on `workflow_example.json`, the V2 schema introduces five key concepts:

#### 1. **Goals** (Enhanced)

```typescript
interface Goal {
  id: string;
  name: string;
  description: string;
  order: number;
  timeout_minutes?: number;
  activation_condition?: string;
  success_criteria?: {
    outputs_required: string[];
  };
  constraints: Constraint[];
  policies: Policy[];
  tasks: Task[];
  forms: Form[];
}
```

#### 2. **Constraints** (New)

Declarative rules that define boundaries and guardrails:

```typescript
interface Constraint {
  id: string;
  description: string;
  type:
    | "time_limit"
    | "data_validation"
    | "business_rule"
    | "rate_limit"
    | "access_control";
  enforcement: "hard_stop" | "block_progression" | "require_approval" | "warn";
  value?: any;
  condition?: string;
}
```

#### 3. **Policies** (New)

If-then logic that triggers actions based on conditions:

```typescript
interface Policy {
  id: string;
  name: string;
  if: {
    condition?: string;
    field?: string;
    operator?: string;
    value?: any;
    all_of?: any[];
    any_of?: any[];
  };
  then: {
    action: string;
    params: Record<string, any>;
  };
}
```

#### 4. **Tasks** (New)

Specific work items assignable to humans or AI agents:

```typescript
interface Task {
  id: string;
  description: string;
  assignee: {
    type: "ai_agent" | "human";
    model?: string;
    role?: string;
    capabilities?: string[];
  };
  inputs?: string[];
  outputs?: string[];
  timeout_minutes?: number;
  depends_on?: string[];
  trigger_condition?: string;
}
```

#### 5. **Forms** (New)

Information collection mechanisms:

```typescript
interface Form {
  id: string;
  name: string;
  description: string;
  type: "structured" | "conversational" | "automated";
  schema?: {
    sections: FormSection[];
  };
  agent?: string;
  template?: string;
}
```

### Complete Workflow Schema

```typescript
interface WorkflowTemplate {
  id: string;
  name: string;
  version: string;
  objective: string;
  metadata: {
    author: string;
    created_at: string;
    last_modified: string;
    tags: string[];
    integration?: string;
  };
  triggers?: WorkflowTrigger[];
  context_requirements?: Record<string, any>;
  goals: Goal[];
  global_settings?: {
    max_execution_time_hours: number;
    data_retention_days: number;
    default_timezone: string;
    notification_channels: Record<string, string[]>;
    integrations: Record<string, any>;
  };
}
```

## Implementation Phases

### Phase 1: Schema & UI Foundation (Week 1-2)

**Objective**: Update the UI to beautifully display all new workflow schema concepts using the InstaWork shift filling example.

**Key Tasks**:

#### 1.1 TypeScript Interface Updates

- Create new `types/workflow-v2.ts` with complete schema definitions
- Implement V2 schema as the single workflow standard
- Add proper type guards and validation utilities

#### 1.2 Workflow Data Creation

- Convert InstaWork example from `workflow_example.json` to TypeScript format
- Store as `src/workflows/instawork-shift-filling.json`
- Convert existing employee-onboarding workflow to V2 schema format
- Create unified workflow loader utilities for the V2 schema

#### 1.3 UI Component Evolution

**WorkflowPanel Enhancement**:

- Redesign goal cards to show constraint count, policy count, task count, form count
- Add visual indicators for goal complexity and execution requirements
- Maintain existing click-to-select functionality

**New Component Creation**:

- `ConstraintList.tsx`: Display constraints with type-specific icons and enforcement levels
- `PolicyList.tsx`: Show if-then policies with condition-action visualization
- `TaskList.tsx`: Display tasks with assignee types (AI agent vs human) and dependencies
- `FormList.tsx`: Show forms with type indicators and data collection purposes

**InspectorPanel Redesign**:

- Create tabbed interface for different element types
- `GoalInspector.tsx`: Enhanced with constraints, policies, tasks, forms
- `ConstraintInspector.tsx`: Detailed constraint rules and enforcement
- `PolicyInspector.tsx`: If-then logic visualization with condition trees
- `TaskInspector.tsx`: Task details, dependencies, and assignee information
- `FormInspector.tsx`: Form schema and field definitions

#### 1.4 Visual Design System

**Enhanced Status System**:

- Goal status: PENDING, ACTIVE, COMPLETED, BLOCKED, SKIPPED
- Constraint status: SATISFIED, VIOLATED, PENDING_CHECK
- Policy status: TRIGGERED, DORMANT, EVALUATING
- Task status: NOT_ASSIGNED, ASSIGNED, IN_PROGRESS, COMPLETED, FAILED
- Form status: EMPTY, PARTIALLY_FILLED, COMPLETED, VALIDATED

**Visual Hierarchy**:

```
Goal Card
├── Goal Header (name, status, progress indicator)
├── Constraints Section (count badge, preview icons)
├── Policies Section (count badge, active policy indicators)
├── Tasks Section (count badge, assignee type distribution)
└── Forms Section (count badge, completion status)
```

**Color Coding System**:

- Goals: Blue accent (primary workflow elements)
- Constraints: Red accent (boundaries and rules)
- Policies: Green accent (automated logic)
- Tasks: Purple accent (work assignments)
- Forms: Orange accent (data collection)

### Phase 2: Enhanced Inspection & Detail Views (Week 3)

**Objective**: Create rich, detailed inspection panels for each workflow element type.

#### 2.1 Deep Constraint Inspection

- Time limit constraints with countdown displays
- Data validation constraints with schema previews
- Business rule constraints with condition explanations
- Rate limit constraints with current usage tracking

#### 2.2 Policy Logic Visualization

- Condition tree visualization for complex if-then logic
- Policy dependency graphs
- Action outcome previews
- Policy conflict detection and warnings

#### 2.3 Task Detail & Dependency Views

- Task dependency flow diagrams
- AI agent capability requirements
- Human role and skill requirements
- Input/output data flow visualization

#### 2.4 Form Schema & Structure Display

- Interactive form schema previews
- Field validation rules display
- Conditional logic within forms
- Data collection flow visualization

### Phase 3: Basic State Management (Week 4)

**Objective**: Prepare foundation for future execution without implementing actual workflow execution.

#### 3.1 Workflow Instance State Structure

- Separate WorkflowTemplate (blueprint) from WorkflowInstance (execution state)
- Track goal activation, constraint satisfaction, policy evaluation
- Task assignment and completion state
- Form data collection progress

#### 3.2 State Management Architecture

- Use React Context or Zustand for workflow instance state
- Maintain clear separation between template and instance data
- Implement state persistence for development convenience

#### 3.3 Mock State Population

- Create realistic mock data for workflow instance state
- Simulate various execution scenarios for UI testing
- Enable toggling between different mock states for development

### Phase 4: Testing & Documentation (Week 5)

**Objective**: Ensure comprehensive testing and documentation for Phase 1-3 deliverables.

#### 4.1 Component Testing

- Unit tests for all new UI components
- Integration tests for workflow data loading
- Visual regression tests for layout changes
- Accessibility testing for complex UI elements

#### 4.2 Type Safety & Schema Validation

- Runtime validation for workflow schema
- Comprehensive type guards for V2 schema
- Error handling for malformed workflow data
- Schema validation utilities

## Future Phases (Require Additional Planning)

### Phase 5: Policy Evaluation Engine

- Basic if-then rule processing
- Condition evaluation with workflow context
- Action triggering and side effects
- Policy conflict resolution

### Phase 6: Task Assignment System

- Human task queue management
- AI agent integration points
- Task dependency resolution
- Assignment routing and notifications

### Phase 7: Form Engine & Data Collection

- Dynamic form generation
- Conversational form agents
- Data validation and submission
- Form state management

### Phase 8: Workflow Execution Engine

- Goal progression logic
- Constraint enforcement
- Workflow state transitions
- Error handling and recovery

## Technical Architecture Decisions

### Component Structure Evolution

```
src/
├── components/
│   ├── workflow/
│   │   ├── WorkflowPanel.tsx           # Enhanced main container
│   │   ├── GoalCard.tsx                # Enhanced with new elements
│   │   ├── ConstraintList.tsx          # New: constraint display
│   │   ├── PolicyList.tsx              # New: policy visualization
│   │   ├── TaskList.tsx                # New: task assignments
│   │   ├── FormList.tsx                # New: form collection
│   │   └── ProgressConnector.tsx       # Updated for complex flows
│   ├── inspector/
│   │   ├── InspectorPanel.tsx          # Enhanced with tabs
│   │   ├── GoalInspector.tsx           # Enhanced goal details
│   │   ├── ConstraintInspector.tsx     # New: constraint details
│   │   ├── PolicyInspector.tsx         # New: policy details
│   │   ├── TaskInspector.tsx           # New: task details
│   │   ├── FormInspector.tsx           # New: form details
│   │   └── WorkflowInspector.tsx       # Enhanced workflow overview
│   └── layout/
│       └── ThreePanelLayout.tsx        # Maintained structure
├── types/
│   ├── workflow-v2.ts                  # V2 schema types
│   ├── components.ts                   # Updated component props
│   └── state.ts                        # Enhanced state types
├── workflows/
│   ├── employee-onboarding-v2.json     # V2 schema workflow
│   ├── instawork-shift-filling.json    # V2 example workflow
│   └── index.ts                        # V2 workflow loader
└── utils/
    ├── schema-validation.ts            # Runtime validation
    ├── error-handling.ts               # Error handling utilities
    └── status.ts                       # Enhanced status utilities
```

### Data Flow Architecture

```
App.tsx
├── Load WorkflowTemplateV2 (V2 Schema)
├── Initialize WorkflowInstance State (for future execution)
├── Pass to ThreePanelLayout
│   ├── ChatPanel (unchanged)
│   ├── WorkflowPanel
│   │   ├── Render goal cards with constraints, policies, tasks, forms
│   │   └── Handle element selection (goals, constraints, policies, tasks, forms)
│   └── InspectorPanel
│       ├── Switch on selected element type
│       ├── Route to appropriate inspector component
│       └── Display detailed information for selected element
```

### V2 Schema Implementation

- Implement V2 workflows with rich schema format
- Unified workflow loading and processing
- Single schema validation and type system
- Streamlined component architecture for V2 elements

## Example Workflow: InstaWork Shift Filling

The primary example workflow demonstrates all V2 concepts:

**3 Goals**:

1. **Categorize Shift Group** (4 constraints, 4 policies, 3 tasks, 1 form)
2. **Execute Fill Actions** (5 constraints, 5 policies, 6 tasks, 3 forms)
3. **Analyze & Improve** (4 constraints, 4 policies, 4 tasks, 3 forms)

**Total Complexity**:

- 13 constraints across time limits, data validation, business rules
- 13 policies with complex if-then logic
- 13 tasks split between AI agents and humans
- 7 forms including structured, conversational, and automated types

This complexity showcases the full power of the V2 schema while providing a realistic business workflow example.

## Success Criteria

### Phase 1 Success Metrics

- [ ] InstaWork workflow loads and displays correctly
- [ ] All 3 goals show constraint/policy/task/form counts
- [ ] Clicking any element shows appropriate inspector detail
- [ ] Visual hierarchy clearly distinguishes element types
- [ ] UI maintains responsive design and accessibility
- [ ] Employee onboarding workflow implemented in V2 schema and working
- [ ] All tests updated and passing with V2 schema

### Phase 2 Success Metrics

- [ ] Deep inspection panels show comprehensive detail
- [ ] Complex policy logic visualized clearly
- [ ] Task dependencies and assignments displayed
- [ ] Form schemas rendered with full detail
- [ ] Performance remains smooth with complex workflows

### Phase 3 Success Metrics

- [ ] Workflow instance state structure implemented
- [ ] Mock state enables realistic UI testing
- [ ] State management architecture ready for execution
- [ ] Clear separation between template and instance data

### User Experience Goals

- Intuitive navigation between workflow elements
- Clear visual distinction between element types
- Comprehensive detail without overwhelming complexity
- Smooth transitions between inspection views
- Consistent with existing Cloudflare design patterns

## Risk Mitigation

### Technical Risks

- **Schema Complexity**: Comprehensive V2 schema implementation
- **Performance**: Efficient rendering with React optimization
- **Type Safety**: Comprehensive TypeScript coverage
- **Testing Coverage**: Automated testing for all new components

### Product Risks

- **User Confusion**: Clear visual hierarchy and progressive disclosure
- **Feature Creep**: Strict focus on visualization before execution
- **Schema Complexity**: Intuitive UI design to handle rich workflow elements

## Next Steps

1. **Immediate**: Begin Phase 1 implementation with TypeScript interfaces
2. **Week 2**: User testing with InstaWork workflow visualization
3. **Week 3**: Gather feedback and iterate on inspection panels
4. **Week 4**: State management foundation and mock data
5. **Week 5**: Testing and Phase 4 completion
6. **Future**: Detailed planning for execution phases

---

_This plan represents the complete V2 SLC MVP scope focused on rich workflow schema visualization. Each phase builds incrementally toward a comprehensive system that displays WorkflowTemplateV2 with goals, constraints, policies, tasks, and forms, setting the foundation for future workflow execution capabilities while maintaining the SLC MVP principle of core functionality focus._
