# Ideas – plan

A collecting point for app ideas: signed-in people suggest apps through a few simple
questions plus free text, everyone can browse and vote, and the admin picks what gets built.

## Decisions

| Topic | Decision |
|---|---|
| Users | Anyone signed in to the platform. Until P3: testers added by hand to `/apps/ideas`; from P3: open to every signed-in user (portal flag, self-registration via Keycloak) |
| Sharing & roles | Submitter owns their ideas. Admins have the app role `admin` (portal.yml `roles`, assigned under Portal → Users) see and manage everything. Everyone else sees the board |
| Submitting | Wizard, one question per card with a progress bar: (1) Which problem bugs you? (required), (2) Who has it? (3) How often? (4) How would an app help? (5) Name or emoji idea? Then free text "Tell us whatever you like". Each step shows a rotating inspiration prompt. Up to 3 imgur image links |
| Visibility | Per idea: "on the board" (default) or "only for Nico". Optional "anonymous" hides the name on the board (admins still see it) |
| Board | All board ideas, sorted by votes or newest; one 👍 vote per person and idea; no comments in v1 |
| Own ideas | Edit any time. Delete = soft delete: gone from the board and "My ideas", still visible to admins marked as deleted. The delete dialog says so honestly. Admins can delete permanently on request (GDPR) |
| Admin | Own Kanban board: columns = status (new → seen → planned → in development → built / not now), drag & drop (`dnd-kit`); a short reply to the submitter, shown in "My ideas"; hide an idea from the board |
| Versions | Every save keeps a version (who, when, which fields). A history compares two versions side by side and can restore one. Authors edit their ideas; admins edit any idea with a required short reason ("completed", "against the rules: hate speech"), which the author sees as "edited by an admin". Rules page linked from the wizard (no racism, hate, malware, phishing, ...) |
| Operator notebook | The owner's own ideas - for a new app or an existing one ("concerns: new app / Todo / Finance / ...") - as admin-only ideas with versions and a filter by app. A quick-capture page `/quick` with its own manifest, added to the phone's home screen (or opened from an iOS Shortcuts widget), records one in seconds |
| Later | Own image upload; AI help in the wizard (placeholders, tips, follow-up questions) - see the platform's TODO |
| Data | `users`, `ideas` (answers, free text, image links, visibility, anonymous, status, admin reply, hidden, deleted_at), `votes` (user, idea; unique). Personal data: display name + idea texts. Privacy page at `/privacy` (public) mentions imgur |
| Stack | Golden path (FastAPI + React), no deviation |
| Database / files | `database: true`; no `dataMountPath` (images live on imgur) |
| External services | imgur only as image host: links validated to `imgur.com` / `i.imgur.com`, previews embedded (CSP `img-src 'self' https://i.imgur.com`; imgur sees the viewer's IP). No secrets beyond the platform's |
| Devices | Desktop + phone; PWA no; push no; offline no |
| Views | Discover (board, start page) · Submit (wizard) · My ideas · Admin board (admins only). Phone: bottom nav with a big 💡 "+" in the middle; desktop: top nav |
| Look | Platform tokens, warm yellow-orange accent gradient (light bulb), light/dark from the device. A pretty UI matters to the owner: spend time on the wizard and the cards |
| Languages | DE + EN |
| Platform | portal link, sign-out, feedback; showcase on nicasso.de/apps/ideas |

## Phases

| Phase | Result | Status |
|---|---|---|
| **P0** Skeleton | repo from the blueprint: gateway auth, health, `/api/me` (with `is_admin`), DE/EN shell with nav, `portal.yml`, build + deploy workflows, first deploy | ✅ |
| **P1** Submit + admin | wizard with inspiration prompts, "My ideas" with status and reply, edit, soft delete with honest hint, admin Kanban (status, reply, hide, permanent delete) | ✅ |
| **P2** Board | Discover with visibility and anonymous, votes, sort by votes/newest, imgur links with preview, privacy page | ✅ |
| **P3** Open to everyone (platform repo) | done by the platform's access modes (`multi-app` docs/access-and-roles.md): Ideas is "open" | ✅ |
| **P4** Wizard on iOS, "in development" | wizard shows exactly one question on the iPhone home-screen app too; Kanban column "in development" | column built; iOS: waiting for the owner's check (stale home-screen app?) |
| **P5** Versions, admin edit, notebook | versions with compare/restore; admin edit with reason; rules page; "concerns" field and filter; `/quick` capture page | built, deploy pending |
| **P6** Talk and hand-over | comments on board ideas; "copy to Todo" as a confirm-first link (`todo/?add=&notes=`, no token API); mail to the admin on a new idea (open: how apps send mail) | comments + copy built; mail open |
| **Later** | own image upload; AI help | |

Every phase ends with a deploy that can be tried right away.
