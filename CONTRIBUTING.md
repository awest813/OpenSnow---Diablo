# Contributing to OpenTristam

Thanks for helping improve OpenTristam.

## Development setup

1. Install dependencies:
   - `npm ci --legacy-peer-deps`
2. Start local dev server:
   - `npm run start`

## Quality checks

Run all checks before opening a PR:

- `npm run lint`
- `npm test -- --watch=false`
- `npm run build`

## Pull requests

- Keep changes focused and small.
- Add or update tests for behavior changes.
- Update docs for user-facing or workflow changes.
- Fill out the PR template completely.

## Coding expectations

- Follow existing code style and naming patterns.
- Prefer accessibility-safe UI changes.
- Avoid introducing new dependencies unless necessary.

## Sign-off / legal

By contributing, you agree your contributions are licensed under the repository license.
No CLA is currently required and DCO sign-off is not currently required.
