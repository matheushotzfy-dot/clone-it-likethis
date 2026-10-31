# Project conventions

- Keep advertising attribution collection centralized in tracking.ts; its current disabled mode must not read browser identifiers or attach them to signup metadata, so all signup callers honor the same privacy choice.

- Account dialogs share auth-sheet mobile sizing and internal scrolling so safe areas, close controls and keyboard navigation stay consistent; closing a deposit never cancels its pending payment.

- PlayFivers callbacks must fail closed without validated agent credentials and nonnegative numeric amounts; never persist callback secrets. Refunds need a separately verified original-round reconciliation before they can be enabled.

- Public game tiles must use the shared game-image availability rule and disappear on artwork failure; grid wrappers must not leave empty cells.

- Keep the public casino presentation in the shared SiteShell and casino components so theme and navigation changes stay consistent across routes.
- Define visual roles in src/styles.css and use the existing Button component for interactive controls to preserve theming and accessibility.
- Keep banner artwork separate from HTML campaign text; preserve administrator-managed banners and use bundled branded artwork only as fallbacks.
- Keep redesign work in presentation code; preserve game, authentication and payment integrations and their business rules.
- Keep authenticated header controls in HeaderAccount so the shared Header stays focused on layout and public navigation.
- Scope phone-density adjustments to the max-width: 639px styles and named presentation hooks; preserve desktop layout and native pinch zoom.
- Use pageMeta for leaf routes that share the standard metadata shape, supplying a unique page-specific title and description.
- Keep ESPN parsing and source-price rules in sports-data.ts; fetch scoreboards through sports.functions.ts with shared polling and request deduplication so every sports view uses the same real data.
- Match alternative casino artwork by both game title and provider, never by generic game type, to avoid showing a different product's cover.- Credit VeoPag deposits only after re-checking status with the VeoPag API (webhook bodies are unsigned); keep that logic in src/lib/veopag.server.ts.
