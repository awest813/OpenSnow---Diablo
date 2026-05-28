# Design Tokens

OpenTristam's UI styling now uses CSS custom properties as a single source of truth for shared values.

## Colors

- `--color-bg-app`, `--color-bg-panel`, `--color-bg-panel-alt`
- `--color-gold-primary`, `--color-gold-soft`, `--color-gold-border`
- `--color-text-primary`, `--color-text-muted`, `--color-text-strong`
- `--color-danger-primary`, `--color-danger-soft`
- `--color-focus-ring`

## Spacing

- `--space-xs`: 4px
- `--space-sm`: 8px
- `--space-md`: 12px
- `--space-lg`: 16px
- `--space-xl`: 24px

## Motion

- `--transition-fast`: 0.15s ease
- `--transition-normal`: 0.25s ease
- `--transition-slow`: 0.35s ease

## Usage rules

- Prefer tokens over hard-coded values in component and layout styles.
- Keep semantic token names (purpose-oriented) over literal names.
- Update this file when introducing new shared tokens.
