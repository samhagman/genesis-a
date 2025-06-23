## Conversation Summary: Workflow System Design for Shift Filling

### System Components Overview

The user is designing a workflow system with these core components:

**Core Objects:**

- **Goals**: High-level descriptions of what needs to be accomplished, written in a prompt-like style suitable for AI agents
- **Constraints**: Declarative rules that define boundaries - things that must/must not be done. These are NOT steps to complete, but rather guardrails (e.g., "You must not contact any worker more than once per shift group")
- **Policies**: If-then logic that triggers actions based on conditions ("if X and Y occur, then do Z")
- **Tasks**: Specific work items assignable to either humans or AI agents. These are high-level assignments, not detailed steps (e.g., "Analyze shift group and collect all relevant data (AI agent)")
- **Forms**: Information collection mechanisms that can be traditional forms, chat interfaces with form agents, or support file uploads

**Structure:**

- **Workflows**: Container holding sequential goals (Goal 1 → Goal 2 → Goal 3...)
- Each goal contains its own constraints, policies, tasks, and forms

**Actors:**

- Human users (can be assigned tasks)
- AI assistants/agents (can be assigned tasks)
- Form agents (specialized for conversational form completion)

### Specific Use Case: InstaWork Shift Filling

The workflow's objective is to maximize fill rate for shifts on the InstaWork platform. When a shift group is booked (e.g., "10 prep cooks on June 15th from 7am-7pm at 555 Main Street, Seattle for Stanley's Events"), the workflow kicks off.

**Three Goals:**

1. **Categorize Shift Group**: Determine if the shift group needs no help, needs help this workflow can provide, or needs manual intervention outside the workflow

2. **Execute Fill Actions**: Deploy interventions like personalized worker outreach, bonus incentives, recruitment ads, or requesting company modifications

3. **Analyze & Improve**: Post-shift analysis to identify patterns and suggest improvements to all three goals (self-improving system)

### Key Design Clarifications

The user clarified that:

- Constraints are boundaries/rules, NOT action items
- Tasks should be high-level assignments to agents/humans, NOT detailed step-by-step instructions
- The system should be self-improving through Goal 3's analysis

### Current State

We've developed a complete workflow structure:

## Workflow: Maximize Shift Fill Rate

### Goal 1: Categorize Shift Group

**Description**: Analyze incoming shift group to determine appropriate intervention level and collect relevant information for downstream processing.

**Constraints**:

- You must not spend more than 30 minutes on initial categorization
- You must not proceed if shift data is incomplete (missing location, time, or role)
- You must not categorize groups starting in less than 4 hours

**Policies**:

- If shift starts in <4 hours, then mark as "No intervention - too late"
- If shift location has >80% historical fill rate AND >50 qualified workers in area, then recommend "No intervention needed"
- If shift requires certifications with <10 qualified workers in 50mi radius, then recommend "Manual intervention required"
- If confidence score <70%, then escalate to human review

**Tasks**:

1. Analyze shift group and collect all relevant data (AI agent)
2. Categorize shift group into one of three intervention categories (AI agent)
3. Review categorization if confidence <70% (Human)

**Forms**:

- Shift Analysis Summary (collects all data points and outputs categorization decision)

### Goal 2: Execute Fill Actions

**Description**: Deploy targeted interventions to maximize probability of filling all shifts in the group.

**Constraints**:

- You must not contact any worker more than once per shift group
- You must not offer bonuses exceeding 25% of base pay
- You must not send messages outside workers' preferred hours
- You must not share shift details with non-qualified workers
- You must not promise anything not explicitly approved by the company

**Policies**:

- If fill rate <50% at 48hrs before shift, then activate 10% bonus
- If fill rate <30% at 24hrs before shift, then activate 20% bonus
- If <2x qualified workers vs shifts needed, then initiate external recruitment
- If 3+ workers cite same issue in decline, then contact company for clarification
- If worker hasn't opened app in 30+ days, then skip outreach

**Tasks**:

1. Create and execute worker outreach campaign (AI agent)
2. Monitor fill progress and adjust strategy (AI agent)
3. Activate bonus incentives if needed (AI agent)
4. Create and place recruitment ads if needed (AI agent with Human review)
5. Contact company for shift modifications if needed (Human)
6. Approve exceptional bonus amounts >20% (Human)

**Forms**:

- Message Template Builder (chat form to create personalized outreach)
- Recruitment Ad Creator (generates ad content based on shift details)
- Company Communication Request (structured request for shift modifications)

### Goal 3: Analyze & Improve

**Description**: Post-shift analysis to identify patterns, anomalies, and improvement opportunities across all workflow components.

**Constraints**:

- You must not begin analysis until shift has completed
- You must not automatically implement workflow changes without human approval
- You must not delete or modify historical intervention data
- You must not share individual worker data in reports

**Policies**:

- If fill rate delta >30% from prediction, then trigger deep dive analysis
- If intervention achieved >20% lift vs control, then flag for potential standard adoption
- If unusual patterns detected (e.g., mass cancellations), then escalate to fraud team
- If company feedback is negative, then flag for account management review

**Tasks**:

1. Analyze shift outcomes and intervention effectiveness (AI agent)
2. Identify patterns and generate improvement recommendations (AI agent)
3. Review anomalies and potential fraud indicators (Human)
4. Approve proposed workflow improvements (Human)

**Forms**:

- Post-Shift Analysis Report (automated data collection and summary)
- Improvement Proposal (chat form discussing potential workflow updates with human)
- Anomaly Investigation (structured form for documenting unusual patterns)

And we just began creating a JSON schema. The basic schema structure is:

```json
{
  "workflow": {
    "name": "Maximize Shift Fill Rate",
    "objective": "Fill as many open shifts as possible",
    "goals": [
      {
        "id": "goal_1",
        "name": "Categorize Shift Group",
        "description": "...",
        "constraints": ["..."],
        "policies": [{ "if": "...", "then": "..." }],
        "tasks": [{ "description": "...", "assignee": "..." }],
        "forms": [{ "name": "...", "description": "..." }]
      }
    ]
  }
}
```
