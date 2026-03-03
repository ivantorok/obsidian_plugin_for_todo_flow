# Template: Interaction Contract

Use this template to express UI requirements as a technical "contract" that bridges aesthetic vision with implementation logic.

## [Component Name] Contract

**Vision**: [Briefly describe the visual goal, e.g., "High-Density Linear List"]

### 1. Structure (Layout & Typography)
- **[Element 1]**: [e.g., Time-Stamp: Monospace, high-contrast]
- **[Element 2]**: [e.g., Duration: Muted monospace, immediately following]
- **[Element 3]**: [e.g., Label: Interface font, truncated]

### 2. Interaction & States
- **[State Name]**: [e.g., Completion State: Typographic strike-through, 50% opacity]
- **[State Name]**: [e.g., Anchored State: Surface Token background shift to --background-secondary-accent]

### 3. Constraints
- **Touch Targets**: [e.g., Strict 44px min-height]
- **Sovereignty**: [e.g., No internal vertical padding, horizontal alignment only]

### 4. TDD Contract (Proposed Tests)
- Test: "Should render [Element] with [Class/Property]"
- Test: "Should apply [Visual Style] when [State] is active"
