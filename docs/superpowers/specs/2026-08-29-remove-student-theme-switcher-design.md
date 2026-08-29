# Remove Student Theme Switcher Design

## Goal

Remove the legacy theme changer from the student dashboard top bar so it is no longer exposed in the normal product interface.

## Scope

- Remove the `StudentThemeSwitcher` import and rendered control from `TopBar`.
- Replace the existing top-bar test that expects the control with a regression test asserting that student, teacher, and admin shells do not render it.
- Keep `ThemeProvider`, theme definitions, stored-theme compatibility, and `/dashboard/theme-test` unchanged. These are outside the requested UI cleanup and may still support existing persisted preferences or internal diagnostics.

## Behavior

The student top bar will retain its APK download, system information, notifications, and profile actions. Removing the theme changer must not change the spacing, navigation, authentication, or behavior of those controls. Teacher and admin top bars remain unchanged.

## Verification

- Run the focused `TopBar` test and confirm the new regression assertion fails before the production removal and passes afterward.
- Run frontend lint.
- Run the production frontend build.

## Non-goals

- Deleting the theme provider or theme CSS.
- Removing the internal theme-test route.
- Migrating or clearing users' stored theme preferences.
- Changing mobile, backend, authentication, or dashboard routing behavior.
