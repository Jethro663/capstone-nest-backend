# Nexora Diagram Package (Current Backend)

This folder contains Mermaid diagrams based on the implemented NestJS backend.

- `use-case-current-backend.mmd`: use-case view (Mermaid flowchart) for Student, Teacher, Admin, and external services.
- `erd-core-domain.mmd`: core-domain ERD using current Drizzle schema relations.
- `use-case-current-backend.puml`: UML use-case source with actor/use-case shapes.
- `erd-core-domain.puml`: ERD source in PlantUML crow's-foot notation.

## Source of Truth

- API/use-case mapping: `backend/src/modules/*/*.controller.ts`
- Data model and FK relations: `backend/src/drizzle/schema/*.ts`

## Render Instructions

1. Open [Mermaid Live Editor](https://mermaid.live/).
2. Paste the contents of one `.mmd` file.
3. Export as PNG/SVG for reports.

You can also embed these in Markdown:

```mermaid
%% paste file content here
```

## Recommended for Non-Pixelated Zoom

Use the `.puml` files in any PlantUML-capable tool (VS Code PlantUML extension, IntelliJ plugin, PlantUML server) and export as `SVG` for presentation. SVG stays crisp at any zoom level.

## Scope Notes

- Scope is the **current implemented backend**, not future-only concept-paper modules.
- ERD is **core-domain focused** (learning, assessment, class record, performance, LXP, AI mentor, files, announcements/notifications).
