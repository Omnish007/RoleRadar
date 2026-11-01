# RoleRadar design system

## Design principles
Inspired by the clarity, hierarchy and restraint found in Apple's HIG and Google's Material design:
- Make primary actions obvious; keep secondary actions quiet.
- Use spacing, alignment and typography before decorative borders.
- Group related controls and keep important content above the fold.
- Prefer familiar desktop patterns: persistent sidebar, clear page title, focused content.
- Give immediate feedback for copy, save, loading and error states.
- Avoid using color as the only status indicator.

## Color tokens
- Canvas: `#F5F6F7` — neutral, low-glare workspace background.
- Surface: `#FFFFFF` — primary content surface.
- Primary: `#245FCE` — restrained blue for primary actions and selected navigation.
- Text: `#20242B` — high-contrast primary text.
- Muted: `#66717D` — supporting text; recheck contrast whenever this token changes.
- Border: `#E5E8EC` — quiet separation.
- Success: `#14734F`; warning: `#8A6B36`; destructive: use a tested accessible red token when added.

## Verified text contrast (WCAG 2.2 AA target)
Contrast ratios below were calculated using the WCAG relative-luminance formula for normal text:
- Primary text `#20242B` on white: 15.57:1; on canvas `#F5F6F7`: 14.39:1.
- Muted text `#66717D` on white: 4.97:1; on canvas: 4.60:1.
- Primary blue `#245FCE` on white: 5.83:1; on canvas: 5.39:1.
- Success `#14734F` on white: 5.84:1; on canvas: 5.40:1.
- Warning `#8A6B36` on white: 4.96:1; on canvas: 4.58:1.

Decorative borders and low-contrast surface fills are not used as text colors. Interactive outlines must still be checked for non-text contrast in a rendered accessibility audit.

## Accessibility
- Never communicate status through color alone.
- Preserve visible focus indicators.
- Keep interactive targets comfortably sized.
- Verify contrast for text and controls against WCAG 2.2 AA before release.
- Respect reduced-motion preferences in future animated components.

## Typography and density
- Use system UI fonts with Inter and SF Pro fallbacks for a native-feeling hierarchy.
- Page title 29px; section title 14px; body 11–13px; metadata 9–10px.
- Use consistent 4/8px spacing increments.
- Dense data tables should remain readable, not compressed for decoration.

## Sources
- Apple Human Interface Guidelines: Design principles and layout.
- Material Design 3: Color roles and accessible color systems.
- Tailwind CSS v4 and shadcn/ui: token-driven styling and composable components.

## Product polish guardrails
- Prefer a clear hierarchy and compact utility over decorative hero panels, gradients, glow effects or repeated pill badges.
- Use one restrained accent color; status color must communicate a real state.
- Keep navigation, form controls and result surfaces consistent across workspaces.
- Use 12–14px for everyday interface text where density allows; preserve readable metadata.
- Keep the search brief visually quiet and show that its interpretation can be reviewed before compiling platform searches.
- Keep the existing workflows and information architecture stable during visual refinement.
