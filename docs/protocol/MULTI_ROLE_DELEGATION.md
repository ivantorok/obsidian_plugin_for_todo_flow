# Protocol: Multi-Role Delegation

This protocol defines how different responsibilities are delegated within the Todo Flow development cycle to ensure architectural integrity and quality.

## Role Definitions

| Role | Scope | Primary Artifacts |
| :--- | :--- | :--- |
| **Atlas Guardian (AG)** | Architectural "Laws of Physics" | `Concept Atlas`, `UX Governance` |
| **Implementation Lead (IL)** | TDD & Logic Implementation | Source Code, `Vitest` Logic Tests |
| **Verification Officer (VO)** | User Contract & E2E Verification | `QA Checklist`, `WebdriverIO` Specs |
| **Diagnostic Engineer (DE)** | Technical Forensics & Evidence | `Forensic Specs`, `Trace Logs` |
| **Release Manager (RM)** | Release Audit & Execution | `Mission Log`, `Shipment Report` |
| **Process Governor (PG)** | Holistic Coordination & Oversight | All folders, Escalation decisions |

---

## Output Architecture

### 1. Folder Structure
- **Common Workload**: `docs/protocol/roles/common/` (Shared triage area).
- **Dedicated Results**: `docs/protocol/roles/<role_id>/` (Finalized role-specific work).
- **Forensics Repository**: `tests/forensics/` (Ephemeral evidence specs).

### 2. The Mission Log (Central Traceability)
For every significant task, the **Process Governor** creates a `MISSION_LOG.md` in `docs/protocol/roles/common/`.
- Every role involved in the task MUST append their contribution to this log before handing off.
- This creates a **Chain of Custody** that the **Release Manager** audits before shipping.

### 2. Output Marking & Storage
Every output MUST be marked and saved based on its relationship to the role's scope.

- **[RESULT-SPECIFIC]**: A concrete output within the role's primary responsibility. 
  - *Save to: `docs/protocol/roles/<role_id>/`*
- **[OBSERVATION-SPECIFIC]**: A qualitative insight about the role's primary scope.
  - *Save to: `docs/protocol/roles/<role_id>/`*
- **[RESULT-GENERIC]**: A tool-generated result or data that might be useful to multiple roles.
  - *Save to: `docs/protocol/roles/common/`*
- **[OBSERVATION-GENERIC]**: A general insight about the project or process.
  - *Save to: `docs/protocol/roles/common/`*

---

## The "Triage & Handle" Ritual

To prevent information silos and ensure cross-role awareness, roles follow this intake ritual:

1.  **Scan Commons**: At the start of a task, roles check `docs/protocol/roles/common/` for new items.
2.  **Claiming Ownership**: If an item in the common folder relates to a role's scope:
    - **Mark handled**: Prepend `[HANDLED BY: <ROLE_ID>]` to the first line of the common file.
    - **Annex**: Copy or move the findings to the role's dedicated folder for further processing.
3.  **Governor Oversight**: The **Process Governor** scans all folders regularly to detect:
    - Unhandled generic items (orphans).
    - Conflicts between role-specific results.
    - Loop efficiency and escalation needs.

---

## The "Discovery Request" (Forensics)

Any role (AG, IL, VO, PG) can invoke the **Diagnostic Engineer (DE)** to gather technical proof of a suspected bug or mechanical flaw.

- **Protocol**: 
    1. Create a `DISCOVERY_REQUEST.md` in `docs/protocol/roles/common/` detailing the suspicion.
    2. Invoke the **DE** via the [Diagnostic Engineer Skill](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/.agent/skills/roles/diagnostic_engineer/SKILL.md).
    3. The DE provides an "Evidence Report" before the calling role proceeds with design or implementation.

---

## How to Embody & Invoke a Role

Roles are invoked at the start of a session or task. To "become" a role, the agent MUST read its specialized **Skill Persona** file.

### 1. The Entry Point (The "First Listener")
When new user feedback or a fresh task is received, the session ALWAYS begins with the **Process Governor (PG)**.
- **Action**: PG scans the `common/` folder, triages the input, and "calls" the next role (usually the AG for distillation).

### 2. Role Skill Personas
Each role has a dedicated skill file defining its expertise, attitude, and detailed process instructions:

- **Process Governor**: [.agent/skills/roles/process_governor/SKILL.md](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/.agent/skills/roles/process_governor/SKILL.md)
- **Atlas Guardian**: [.agent/skills/roles/atlas_guardian/SKILL.md](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/.agent/skills/roles/atlas_guardian/SKILL.md)
- **Implementation Lead**: [.agent/skills/roles/implementation_lead/SKILL.md](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/.agent/skills/roles/implementation_lead/SKILL.md)
- **Verification Officer**: [.agent/skills/roles/verification_officer/SKILL.md](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/.agent/skills/roles/verification_officer/SKILL.md)
- **Diagnostic Engineer**: [.agent/skills/roles/diagnostic_engineer/SKILL.md](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/.agent/skills/roles/diagnostic_engineer/SKILL.md)
- **Release Manager**: [.agent/skills/roles/release_manager/SKILL.md](file:///home/ivan/projects/obsidian_plugin_for_todo_flow/.agent/skills/roles/release_manager/SKILL.md)

---

## Chronological Integrity
All results and observations MUST include a `yyyy-mm-dd hh:mm:ss` timestamp to ensure proper sequencing during history audits.

