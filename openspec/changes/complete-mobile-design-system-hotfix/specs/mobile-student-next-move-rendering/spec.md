## ADDED Requirements

### Requirement: Stable next-move row geometry
Student Home next-move records SHALL render as full-width horizontal rows with a fixed semantic icon slot, flexible bounded copy, and no narrow-width two-column arrangement.

#### Scenario: Interactive next move renders
- **WHEN** a next move has a navigation callback
- **THEN** its icon and copy render in one horizontal row with an optional trailing affordance and the row invokes the callback when pressed

#### Scenario: Informational next move renders
- **WHEN** a next move has no navigation callback
- **THEN** it uses the same horizontal geometry as a non-interactive view and is not exposed as a disabled button

#### Scenario: Copy grows within a compact row
- **WHEN** a title or subtitle needs additional space at a narrow width or supported larger text setting
- **THEN** copy can wrap within the flexible text region without moving the icon above the copy or clipping the row

### Requirement: Rendered regression evidence
The next-move contract SHALL be verified by mounting the interactive and informational component states rather than inspecting source text alone.

#### Scenario: Layout implementation regresses
- **WHEN** the component changes from horizontal row geometry or loses its flexible-copy constraints
- **THEN** the rendered component test fails before release
