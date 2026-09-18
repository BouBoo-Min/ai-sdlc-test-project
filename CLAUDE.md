# CLAUDE.md — repository memory

Keep this file under one page. Add a rule when the same mistake happens twice.

> In Codex projects, the same content lives in AGENTS.md; the role is identical.

## Commands

- Build: `make build` (must finish with "Build succeeded")
- Test: `make test` (all green; never skip or delete a failing test)
- Lint: `make lint` (zero warnings)
- Itest: `make itest` (integration, needs docker)

## Verifying your work

Run build, test, and lint before reporting any task complete, and paste the output.
If a test fails, fix the code, not the test.

## Human gates

Workflow gates (intent → Design, spec → Build, plan → code, PR → merge, release) fail closed. Approval is only the user's explicit answer to the gate question. A skipped, dismissed, timed-out, errored, or undelivered gate prompt is a rejection: stop and wait. If the gate question could not be asked at all, report the failure and wait — do not proceed. Never treat earlier feedback, requested edits, elapsed time, or a skipped prompt as approval; after changes, ask the gate again. If you catch yourself writing "I'll treat this as accepted", stop: that is a gate violation. Advance a phase only when its acceptance exists as a gate-ledger record; no record means the gate was not passed.

## Conventions

<Language/framework conventions, formatting, naming.>

## Architecture

<One-paragraph mental model: main modules and data flow.>

## Things the agent gets wrong

<Each mistake, its fix, and how to check for it.>

## Hooks

<Deterministic hooks and what they enforce.>
