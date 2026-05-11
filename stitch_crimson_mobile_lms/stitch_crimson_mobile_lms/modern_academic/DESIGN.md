---
name: Modern Academic
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#444653'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#2d3449'
  on-tertiary: '#ffffff'
  tertiary-container: '#434b60'
  on-tertiary-container: '#b4bbd5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  margin-mobile: 20px
  gutter-mobile: 12px
---

## Brand & Style

The visual identity of this design system centers on the concept of "Structured Clarity." It is designed for a mobile Learning Management System (LMS) that prioritizes focus, academic rigor, and professional growth. The aesthetic leans into a **Corporate/Modern** style with a heavy emphasis on minimalism to reduce cognitive load during the learning process.

The target audience—students and professionals—requires an environment that feels authoritative yet accessible. The UI evokes a sense of "digital stationary"—clean, organized, and intentional. By utilizing a high-contrast white base and a disciplined application of professional blue, the system establishes a clear hierarchy that guides the user through complex educational data without visual fatigue.

## Colors

The palette is anchored in **Professional Blue (#1E40AF)**, used exclusively for primary actions, progress indicators, and active states. This choice provides a deep, trustworthy contrast against the neutral backgrounds.

- **Surface & Backgrounds:** The system uses a "layered white" approach. The main canvas is pure white (#FFFFFF), while secondary sections, sidebars, or inactive cards use a very light gray (#F8FAFC) to create subtle containment.
- **Typography & Neutrals:** Text utilizes a dark navy (#0F172A) for headings to ensure maximum readability, while secondary information uses a muted slate (#64748B).
- **Functional Accents:** Semantic colors for "Pass/Fail" or "Complete/Incomplete" statuses use desaturated versions of green and amber to maintain the professional tone without appearing overly vibrant or distracting.

## Typography

This design system utilizes **Inter** for its exceptional legibility and systematic, neutral character. The type scale is strictly mathematical to reinforce the "data-driven" academic feel.

- **Headlines:** Use a bold weight and slight negative letter-spacing to create a strong visual anchor for module titles and course names.
- **Body Text:** Standardized at 16px for primary reading material to ensure accessibility on mobile devices. Line height is generous (1.5x) to prevent "wall-of-text" fatigue during long reading sessions.
- **Labels:** Small caps or medium-weight labels are used for metadata (e.g., "Time to complete," "Category") to distinguish them clearly from interactive text or body copy.

## Layout & Spacing

The layout follows a **fluid grid** model optimized for mobile-first consumption. 

- **Grid:** A 4-column grid is used for mobile portrait orientations.
- **Margins:** A consistent 20px outer margin ensures content does not feel cramped against device edges.
- **Rhythm:** An 8pt spatial system governs all padding and margins. Vertical rhythm is critical; use 24px (lg) between distinct sections (e.g., between "Recent Lessons" and "Upcoming Exams") and 12px (gutter) between elements within a group (e.g., items in a list).
- **Whitespace:** Emphasize generous top-and-bottom padding in lesson views to create a "focused reading mode" that mimics a well-laid-out textbook.

## Elevation & Depth

This design system avoids heavy shadows in favor of **Tonal Layers** and **Low-Contrast Outlines**. Depth is used sparingly to denote interactivity and information hierarchy.

- **The Base Layer:** The primary background is #FFFFFF.
- **The Container Layer:** Content cards and input fields use a subtle 1px border (#E2E8F0) instead of a shadow. 
- **Active Elevation:** Only when an element is "picked up" (e.g., dragging a task) or highly emphasized should a shadow be used. In these cases, use a very soft, diffused ambient shadow: `0px 4px 12px rgba(15, 23, 42, 0.05)`.
- **Modals & Overlays:** Use a semi-transparent backdrop blur (12px) with a #0F172A at 40% opacity to keep the focus entirely on the foreground task.

## Shapes

The shape language is defined by **Moderate Roundness (ROUND_EIGHT)**. This provides a balance between the "sharp" seriousness of traditional academia and the "soft" approachability of modern mobile apps.

- **Standard Components:** Buttons, Input Fields, and Cards use a 0.5rem (8px) corner radius.
- **Large Containers:** Bottom sheets and large modal surfaces use 1rem (16px) for the top corners.
- **Indicators:** Progress bars and small tags (e.g., "Draft") may use pill-shaped (fully rounded) corners to differentiate them from structural layout elements.

## Components

- **Buttons:** Primary buttons are solid #1E40AF with white text. Secondary buttons use a white fill with a #E2E8F0 border and #0F172A text. Button height is standardized at 48px for a comfortable mobile tap target.
- **Cards:** Cards are the primary container for courses and modules. They should have a 1px border (#E2E8F0), no shadow, and 16px internal padding. 
- **Input Fields:** Use a light gray background (#F8FAFC) with a subtle bottom border or a full 1px border that shifts to #1E40AF upon focus.
- **Progress Indicators:** Linear progress bars should be used for course completion. The "track" is a light #E2E8F0 and the "fill" is the primary Professional Blue.
- **List Items:** Use "Divided Lists" where each item is separated by a 1px line. Provide clear chevron icons for navigation-heavy lists.
- **Chips/Badges:** Use for categories (e.g., "Science," "Mandatory"). These should be low-contrast (light gray background with dark slate text) to keep them secondary to primary action buttons.