Improve the mobile registration experience, professionalize the deposit flow, and organize games according to user preferences.

### Phase 1: Registration Improvements
- **CPF Validation and Masking**: Implement a mask for CPF (000.000.000-00) and add a basic checksum validation in `src/components/auth/register-dialog.tsx`.
- **Email Domain Hints**: Add a dropdown/list of common email domains (@gmail.com, @hotmail.com, etc.) that appears when the user types '@' in the email field.
- **Mobile UX Fixes**:
  - Add `inputmode="numeric"` to CPF and Phone fields to trigger the numeric keyboard.
  - Set `font-size: 16px` on all inputs to prevent automatic mobile zoom on focus.
  - Set `overflow: hidden` on the body when dialogs are open if not already handled.
  - Ensure the dialog content is properly scrollable and doesn't shift the screen layout.
- **Post-Registration Logic**: Automatically trigger the `deposit` dialog after a successful registration in `RegisterDialog.tsx` and `registro.tsx`.

### Phase 2: UI & Game Organization
- **Game Categories**: Reorder categories in `src/lib/games.ts` to place "Crash Games" last.
- **Mobile Navigation**: Simplify `CategoryPills.tsx` to be more compact on mobile, reducing the number of redundant selection elements.
- **Home Page**: Update `src/routes/index.tsx` to ensure sections follow the new priority.

### Phase 3: Deposit Dialog Polishing
- **Visual Enhancements**: Improve the `DepositDialog.tsx` layout with better spacing, clearer icons, and a more "premium" feel.
- **Validation**: Ensure minimum/maximum deposit amounts are clearly enforced with visual feedback.

### Technical Details
- Use `lucide-react` for consistent iconography.
- Implement CPF masking using a simple string manipulation approach in the `onChange` handler.
- Use `useAuthDialog` context to switch between `register` and `deposit` states.
- Ensure all inputs have `autoComplete` attributes correctly set.
