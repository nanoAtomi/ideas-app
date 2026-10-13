# AGENTS.md

Ideas - an app of the nicasso platform (`https://ideas.nicasso.de`), running behind
the portal's gateway. A collecting point for app ideas: signed-in people suggest apps
through a few simple questions plus free text, everyone can browse and vote, and the
admin picks what gets built.

## Rules for agents

- This app follows the **nicasso app blueprint** in the platform repository
  (`github.com/nanoAtomi/multi-app`, usually checked out as `../multi-app`):
  `.agents/skills/app-blueprint/` - contract, golden-path stack, UI guidelines,
  checklist. Read the relevant part before changing auth, deploy, `portal.yml` or UI.
- The Todo app (`../todo-app`) is the reference implementation: look there before
  inventing a pattern.
- Decisions and phases live in [`docs/plan.md`](docs/plan.md) - read it first, keep it
  current when a decision changes.
- Talk to the user in German; code, comments, commits and docs in English.
- No secrets in the repo: they are set in the portal (Admin → Apps → Ideas → Runtime).
- No deploy without the user's go (Actions → Deploy, see README).
- A pretty UI matters here: spend care on the wizard, the cards and empty states.

## Build and test

| Part | Command |
|---|---|
| Backend | `cd backend && python -m pytest -q` |
| Frontend | `cd frontend && npm run typecheck && npm test` |
| Image | `docker build -t ideas-app .` |
