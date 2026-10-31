# Project conventions

- Keep the public casino presentation in the shared SiteShell and casino components so theme and navigation changes stay consistent across routes.
- Define visual roles in src/styles.css and use the existing Button component for interactive controls to preserve theming and accessibility.
- Keep banner artwork separate from HTML campaign text; preserve administrator-managed banners and use bundled branded artwork only as fallbacks.
- Keep redesign work in presentation code; preserve game, authentication and payment integrations and their business rules.
- Keep authenticated header controls in HeaderAccount so the shared Header stays focused on layout and public navigation.
- Use pageMeta for leaf routes that share the standard metadata shape, supplying a unique page-specific title and description.
- Keep ESPN parsing and source-price rules in sports-data.ts; fetch scoreboards through sports.functions.ts with shared polling and request deduplication so every sports view uses the same real data.
- Match alternative casino artwork by both game title and provider, never by generic game type, to avoid showing a different product's cover.- Credit VeoPag deposits only after re-checking status with the VeoPag API (webhook bodies are unsigned); keep that logic in src/lib/veopag.server.ts.
