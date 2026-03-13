# Changelog

## [1.2.184] - 2026-03-13

### Added
- **Protocol: The Slide**: Formalized deterministic scheduling logic in `docs/discovery/THE_SLIDE_PROTOCOL.md`.
- **Protocol: Greedy Duration**: Formalized recursive duration rollup logic in `docs/discovery/GREEDY_DURATION_PROTOCOL.md`.
- **Architecture Synchronization**: Interlinked new protocols in `docs/ARCHITECTURE.md`.

### Fixed
- **STAB-03 (Sanitary Log Policy)**: Redirected ephemeral test logs (Vitest, WDIO) to session artifacts to eliminate "Allow directory access" prompts in sandboxed environments.

### Stability
- Confirmed "Green Baseline" with 100% pass rate on unit tests and critical E2E flows.
