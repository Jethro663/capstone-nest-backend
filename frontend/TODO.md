- [x] Add resetPassword state to formData (boolean, default false)
- [x] Add resetPassword checkbox in JSX (only when editing)
- [x] Conditionally show password field (for new user or when resetPassword checked)
- [x] Update validation to require password when resetPassword is checked during edit
- [x] Update payload to include password only when appropriate (new user or reset checked)

- [ ] Modify LoginPage to remove role-specific logic and role guard
- [ ] Update SplashScreen to have a single "Login" button instead of role-specific ones
- [ ] Update App.jsx to remove role passing to LoginPage
- [ ] Test login flow for all user roles
