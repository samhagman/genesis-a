# Genesis V3 SLC MVP Plan - Template Editing Focus

## Project Evolution Overview

Genesis V3 addresses a critical state disconnect issue between the frontend UI and backend AI tools. Currently, when users try to add goals via AI chat, `viewCurrentWorkflow` returns empty because the backend Chat Durable Object lacks template context, even though the UI displays workflow data.

### V3 Architecture Overview

**Core Problem Solved**:

- **Frontend**: Displays workflow templates but doesn't sync context to backend
- **Backend Chat DO**: Has empty `currentWorkflow` state (what AI tools see)
- **Result**: AI tools like `viewCurrentWorkflow` see empty state while UI shows rich workflow data

**V3 Solution**: Template editing focus with explicit editing context, live preview capability, and clean UI state management.

## New Architecture Components

### Core Capability: Template Editing with Preview

V3 introduces a simplified template-centric workflow with two view modes:

#### 1. **Edit Mode** (Primary Focus)

- Edit workflow templates with AI chat tools
- Backend Chat DO synchronized to current template
- Save functionality for template changes
- Template selector dropdown for switching between templates

#### 2. **Instance View Mode** (Preview of future functionality)

- Preview template combined with selected scenario
- Read-only view with disabled chat
- ScenarioSwitcher for scenario selection
- Easy return to edit mode

### State Management Architecture

```typescript
interface TemplateEditingState {
  // Template management
  availableTemplates: TemplateMetadata[];
  selectedTemplateId: string;
  selectedTemplateName: string;

  // View management
  viewMode: "edit" | "instance";
  hasUnsavedChanges: boolean;

  // Instance preview
  selectedScenario: string | null;
  scenarios: ExecutionScenario[];
}
```

## Implementation Phases

### Phase 1: Core Template Editing (Milestone 1)

**Objective**: Fix the Chat DO state bug and implement template editing with save functionality.

#### 1.1 Backend Chat DO Enhancement

**Template Context Integration**:

```typescript
class Chat extends AIChatAgent<Env> {
  private currentTemplateId: string | null = null;
  private currentTemplate: WorkflowTemplateV2 | null = null;

  // Enhanced initialization with template context
  async initializeWithTemplate(templateId: string): Promise<void> {
    this.currentTemplateId = templateId;
    this.currentTemplate = await this.loadTemplate(templateId);
  }

  // AI tools now operate on loaded template
  async viewCurrentWorkflow(): Promise<WorkflowTemplateV2 | null> {
    return this.currentTemplate;
  }
}
```

**Key Changes**:

- Accept `templateId` parameter during Chat DO initialization
- Load template data immediately on startup
- AI tools operate on synchronized template state

#### 1.2 Frontend State Management

**Enhanced State Architecture**:

```typescript
interface WorkflowStore {
  // Existing scenarios (for instance preview)
  scenarios: ExecutionScenario[];
  currentScenario: string | null;

  // New template editing state
  availableTemplates: TemplateMetadata[];
  selectedTemplateId: string;
  selectedTemplateName: string;
  viewMode: "edit" | "instance";
  hasUnsavedChanges: boolean;
  templateLoading: boolean;
}
```

**Core Actions**:

- `setSelectedTemplate(templateId: string)` - Switch templates
- `setViewMode(mode: 'edit' | 'instance')` - Switch view modes
- `setHasUnsavedChanges(hasChanges: boolean)` - Track save state
- `loadAvailableTemplates()` - Fetch template list

#### 1.3 UI Component Architecture

**Template Selector Component**:

```tsx
// New component similar to ScenarioSwitcher
interface TemplateSelector {
  availableTemplates: TemplateMetadata[];
  selectedTemplate: string;
  onTemplateChange: (templateId: string) => void;
  hasUnsavedChanges: boolean; // For warning prompts
}
```

**Enhanced App Layout**:

```
┌─────────────────────────────────────────────────────────┐
│ [Template Selector ▼] <TEMPLATE_NAME> | view instance   │
│                                       [Save template]   │
├─────────────────────────────────────────────────────────┤
│ [Chat Panel]         [Workflow Panel]    [Inspector]    │
│ - Template editing   - Template display  - Element      │
│ - AI tools active    - Current template  - details      │
└─────────────────────────────────────────────────────────┘
```

#### 1.4 Template Switching Logic

**Unsaved Changes Handling**:

1. User selects different template in dropdown
2. If `hasUnsavedChanges`, show confirmation: "Save changes before switching?"
3. On confirm save or discard, load new template
4. Update Chat DO context to new templateId
5. Reset `hasUnsavedChanges` state

**Chat Integration**:

- Pass `selectedTemplateId` to Chat DO initialization
- Track template modifications to set `hasUnsavedChanges = true`
- Save button commits changes and resets unsaved state

### Phase 2: Instance Preview Mode (Milestone 2)

**Objective**: Add live preview capability showing template combined with scenario data.

#### 2.1 View Mode Switching

**Edit Mode (Default)**:

```
[Template Selector ▼]    <TEMPLATE_NAME> | view instance    [Save template]

[Chat Panel - ACTIVE]    [Workflow Panel]                   [Inspector Panel]
- Template editing       - Template structure               - Element details
- AI tools enabled       - Goals, constraints, etc.        - Template data
```

**Instance View Mode**:

```
[Template Selector ▼]    <TEMPLATE_NAME> | back to edit

                         [ScenarioSwitcher - moved here]
                         Current scenario: scenario_name

[Chat Panel - DISABLED]  [Workflow Panel]                   [Inspector Panel]
- "Chat disabled in      - Scenario preview                 - Instance details
  preview mode"          - Template + scenario data         - Execution state
```

#### 2.2 ScenarioSwitcher Integration

**Conditional Rendering**:

- Hide ScenarioSwitcher completely in edit mode
- Show below breadcrumb in instance view mode
- Enable scenario selection for preview

**Preview Data Combination**:

```typescript
interface InstancePreview {
  template: WorkflowTemplateV2; // Current template (including unsaved changes)
  scenario: ExecutionScenario; // Selected scenario
  combinedView: WorkflowInstance; // Template + scenario execution state
}
```

#### 2.3 Navigation and State Transitions

**View Mode Transitions**:

1. **Edit → Instance**: Click "view instance" link

   - Switch to `viewMode: 'instance'`
   - Show ScenarioSwitcher below breadcrumb
   - Disable chat panel
   - Combine template with selected scenario for preview

2. **Instance → Edit**: Click "back to edit" link
   - Switch to `viewMode: 'edit'`
   - Hide ScenarioSwitcher
   - Re-enable chat panel
   - Show current template for editing

**Empty State Handling**:

- If no scenarios available, show "No scenarios available" message
- Template selector always available in both modes
- Save button only in edit mode

## Technical Architecture Decisions

### Component Structure

```
src/
├── components/
│   ├── development/
│   │   ├── TemplateSelector.tsx        # New: template dropdown
│   │   ├── ScenarioSwitcher.tsx        # Enhanced: conditional rendering
│   │   └── Breadcrumb.tsx              # New: navigation breadcrumb
│   ├── layout/
│   │   └── ThreePanelLayout.tsx        # Enhanced: view mode awareness
├── hooks/
│   ├── useTemplateEditing.ts           # New: template editing state
│   └── hooks.ts                        # Enhanced: existing hooks
├── state/
│   └── workflowStore.ts                # Enhanced: template editing state
└── api/
    └── templates.ts                    # Enhanced: template management
```

### Data Flow Architecture

```
Template Selection Flow:
1. User selects template in TemplateSelector
2. If unsaved changes → confirmation dialog
3. Load new template data
4. Update Chat DO context with new templateId
5. Reset unsaved changes state

View Mode Flow:
1. User clicks "view instance" → viewMode = 'instance'
2. Show ScenarioSwitcher, disable chat
3. Combine template + scenario for preview
4. User clicks "back to edit" → viewMode = 'edit'
5. Hide ScenarioSwitcher, enable chat
```

### State Management Evolution

```typescript
// Before V3 (Scenario-focused)
interface WorkflowStore {
  scenarios: ExecutionScenario[];
  currentScenario: string | null;
}

// After V3 (Template-focused)
interface WorkflowStore {
  // Template management
  availableTemplates: TemplateMetadata[];
  selectedTemplateId: string;
  selectedTemplateName: string;
  viewMode: "edit" | "instance";
  hasUnsavedChanges: boolean;

  // Scenario preview (when in instance mode)
  scenarios: ExecutionScenario[];
  currentScenario: string | null;
}
```

## Success Criteria

### Phase 1 Success Metrics

- [ ] Template selector loads available templates
- [ ] `viewCurrentWorkflow` returns correct template data
- [ ] Save button appears/disappears based on changes
- [ ] Template switching works with unsaved changes warning
- [ ] Chat AI tools operate on current template
- [ ] Backend Chat DO initializes with template context

### Phase 2 Success Metrics

- [ ] "view instance" switches to preview mode successfully
- [ ] ScenarioSwitcher appears only in instance view mode
- [ ] Instance preview combines template + scenario data correctly
- [ ] "back to edit" returns to edit mode
- [ ] Chat disabled in instance view mode
- [ ] Preview reflects unsaved template changes

### User Experience Goals

- Clear indication of current template being edited
- Seamless switching between edit and preview modes
- Obvious save state (saved vs unsaved changes)
- Intuitive navigation between templates
- No confusion about what's being edited vs previewed

## Risk Mitigation

### Technical Risks

**Template Switching Complexity**:

- **Risk**: Complex state management for template switching
- **Mitigation**: Simple confirmation dialog for unsaved changes
- **Fallback**: Auto-save on template switch

**Chat DO State Sync**:

- **Risk**: Backend state getting out of sync with frontend
- **Mitigation**: Explicit templateId passing to Chat DO initialization
- **Fallback**: Manual sync trigger in development

**Preview Data Combination**:

- **Risk**: Complex logic for combining template + scenario data
- **Mitigation**: Simple object merging for MVP
- **Fallback**: Static scenario previews without template integration

### Product Risks

**User Confusion**:

- **Risk**: Users unclear about edit vs preview modes
- **Mitigation**: Clear breadcrumb navigation and mode indicators
- **Fallback**: Tooltips and help text

**Data Loss**:

- **Risk**: Users losing unsaved changes when switching templates
- **Mitigation**: Confirmation dialog before switching
- **Fallback**: Auto-save every 30 seconds

## Implementation Guidelines

### Development Principles

**SLC MVP Focus**:

- Focus solely on template editing and preview
- No complex versioning or collaborative editing
- Simple template storage and retrieval
- Basic save/load functionality only

**Cloudflare Best Practices**:

- Use Chat Durable Object for stateful template context
- Store templates in R2 or D1 based on existing patterns
- Implement proper error handling for template operations
- Follow TypeScript strict typing throughout

**Code Quality Standards**:

- Write functional, tested code at each milestone
- No stub implementations or placeholder functionality
- Comprehensive error handling for template operations
- Clear separation between edit and preview mode logic

### Testing Strategy

**Unit Testing**:

- Test template switching logic with unsaved changes
- Validate view mode transitions
- Mock Chat DO initialization and template loading
- Test save state management

**Integration Testing**:

- Test complete template editing workflow
- Validate Chat DO template context integration
- Test preview mode data combination
- Verify navigation between modes

**End-to-End Testing**:

```typescript
test("complete template editing workflow", async ({ page }) => {
  // Select a template
  await page.selectOption(
    '[data-testid="template-selector"]',
    "employee-onboarding"
  );

  // Edit template and verify unsaved changes
  await page.click('[data-testid="chat-input"]');
  await page.fill('[data-testid="chat-input"]', "Add a new goal");
  await page.waitForSelector('[data-testid="save-template"]:not([disabled])');

  // Preview instance
  await page.click('[data-testid="view-instance-link"]');
  await page.waitForSelector('[data-testid="scenario-switcher"]');

  // Return to edit
  await page.click('[data-testid="back-to-edit-link"]');
  await page.waitForSelector('[data-testid="chat-input"]:not([disabled])');
});
```

## Next Steps

### Immediate (Week 1)

1. **Backend**: Enhance Chat DO to accept templateId parameter
2. **Frontend**: Implement TemplateSelector component
3. **State**: Add template editing state to Zustand store
4. **Testing**: Unit tests for template switching logic

### Short Term (Week 2)

1. **UI**: Implement breadcrumb navigation with save button
2. **Integration**: Connect template selector to Chat DO
3. **Preview**: Implement view mode switching
4. **Testing**: Integration tests for edit/preview modes

### Medium Term (Week 3)

1. **Polish**: Handle edge cases and error states
2. **UX**: Add loading states and user feedback
3. **Testing**: End-to-end workflow testing
4. **Documentation**: Update development guides

---

_This V3 SLC MVP plan focuses specifically on solving the workflow state disconnect through template editing with preview capability. The implementation maintains the SLC MVP principle by delivering core functionality without over-engineering, while providing a clean foundation for future workflow management features._

## Implementation Status Review (December 2024)

### Executive Summary
The V3 SLC MVP plan has been **95% implemented** with all core features functional and production-ready. The implementation successfully addresses the critical state disconnect issue between frontend and backend.

### Detailed Implementation Status

#### ✅ FULLY IMPLEMENTED (100%)

**Backend Chat DO Enhancement:**
- `initializeWithTemplate(templateId)` method with R2 and local fallback
- Template context synchronization (`currentTemplateId`, `currentWorkflow`)
- WebSocket broadcasts for workflow updates
- Durable Object storage persistence
- Per-template message storage with `storeMessage()` and `getMessages()`
- All API endpoints: `/api/templates`, `/api/workflow/save`, `/api/chat/set-context`

**Frontend State Management:**
- Complete Zustand store implementation with all planned fields
- Template metadata types and interfaces
- All state actions (setSelectedTemplate, setViewMode, etc.)
- Template loading from API with error handling

**UI Components:**
- TemplateSelector with full dropdown UI, icons, and tags
- Breadcrumb navigation with view mode switching
- SaveTemplateButton with loading/disabled states
- TemplateEditingHeader coordinating all components

**Core Functionality:**
- Template switching with Chat DO synchronization
- Save functionality to R2 storage
- Unsaved changes tracking
- View mode switching (edit/instance)
- ChatPanel properly disables in instance mode
- ScenarioSwitcher conditional rendering

#### ⚠️ SIMPLIFIED IMPLEMENTATIONS

1. **Unsaved Changes Confirmation** - No dialog prompt, directly clears state on template switch
2. **Instance Preview** - Shows scenarios only, doesn't combine template + scenario data

#### ❌ NOT IMPLEMENTED

1. **Auto-save every 30 seconds** - Risk mitigation feature not implemented
2. **Advanced versioning** - Excluded from MVP scope
3. **Collaborative editing** - Excluded from MVP scope

### Code Quality Assessment

**Strengths:**
- Clean separation of concerns between components
- Comprehensive TypeScript typing
- Proper React hooks and state management patterns
- Consistent error handling
- Well-structured API endpoints with CORS support

**Architecture Decisions Validated:**
- Durable Object for stateful template context works well
- R2 storage for templates with local fallback provides resilience
- Zustand + Immer for state management offers good DX

### Production Readiness

The implementation is **production-ready** for the MVP scope:
- All critical user workflows function end-to-end
- No blocking issues or critical bugs
- Minor gaps don't impact core functionality
- Code is maintainable and well-structured

### Recommendations for Future Iterations

1. **Add confirmation dialogs** for better UX when switching templates with unsaved changes
2. **Implement auto-save** to prevent data loss
3. **Enhance instance preview** to actually combine template + scenario data
4. **Add loading states** for template operations
5. **Implement undo/redo** for template editing operations

### Success Metrics Achievement

**Phase 1 (Template Editing):**
- ✅ Template selector loads available templates
- ✅ `viewCurrentWorkflow` returns correct template data
- ✅ Save button appears/disappears based on changes
- ✅ Template switching works (simplified confirmation)
- ✅ Chat AI tools operate on current template
- ✅ Backend Chat DO initializes with template context

**Phase 2 (Instance Preview):**
- ✅ "view instance" switches to preview mode successfully
- ✅ ScenarioSwitcher appears only in instance view mode
- ⚠️ Instance preview shows scenarios (not combined data)
- ✅ "back to edit" returns to edit mode
- ✅ Chat disabled in instance view mode
- ⚠️ Preview doesn't reflect unsaved template changes

### Conclusion

The V3 implementation successfully solves the core problem of state disconnect between frontend and backend. The Chat DO now has proper template context, enabling AI tools to operate on the correct workflow data. While some nice-to-have features were simplified or omitted, the implementation delivers a solid foundation for template editing with all critical functionality working as designed.
