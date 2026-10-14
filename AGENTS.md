# Project conventions

- Keep the public casino presentation in the shared SiteShell and casino components so theme and navigation changes stay consistent across routes.
- Define visual roles in src/styles.css and use the existing Button component for interactive controls to preserve theming and accessibility.
- Keep banner artwork separate from HTML campaign text; preserve administrator-managed banners and use bundled branded artwork only as fallbacks.
- Keep redesign work in presentation code; preserve game, authentication and payment integrations and their business rules.