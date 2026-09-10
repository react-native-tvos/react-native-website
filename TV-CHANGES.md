# Retarget react-native-website to react-native-tvos

## Context

This is a local copy of the React Native website (Docusaurus 3.10 monorepo, remote `react/react-native-website`). It builds reactnative.dev, whose source of truth is core React Native. The goal is to make `react-native-tvos` — the TV fork shipping Apple TV and Android TV support — the source of truth instead.

**The headline finding: this site has no generation step today.** Every doc page, the release-branch table, the release schedule, and the showcase are hand-written and committed. `yarn start` runs `docusaurus start` with nothing before it. `website/releases/branches.md` even claims its values are "read from the tip of the corresponding `X-stable` branch" — no script does that; a human copies them in.

So every generation script below is new. They are worth adding because the TV fork publishes machine-readable data the upstream site never wired up — in particular a per-branch TSDoc file carrying prose descriptions for every TV prop.

### Confirmed decisions

| Decision      | Choice                                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Docs scope    | Keep all current docs. Add a TV Components / TV APIs section. Hand-annotate pages with significant TV behavior changes. |
| Source access | Local sibling checkout `/Users/dlowder/iosProjects/react-native-tvos`                                                   |
| Versions      | 0.86, 0.87, and `main` (next) only. Drop 0.77–0.85.                                                                     |
| API source    | **Stopgap:** the already-generated `types_generated/` in the local `main` checkout. One ref, not per-branch.            |
| Deploy target | Undecided — `url` becomes a marked placeholder, `baseUrl` stays `/`                                                     |

### Open item

You are checking whether upstream doc content was generated elsewhere (possibly in the React Native repo) before being hand-committed. If it was, the Phase 3 annotation work should become a fork of that generator instead. Nothing else here depends on the answer.

---

## Verified facts (several correct a wrong initial assumption)

**The TV code is on `tvos-v0.XX.0`, not `branch-v0.XX.0`.** This was verified directly and it reverses the branch convention we first picked:

```
branch-v0.87.0  TV files: 0      branch-v0.83.0  TV files: 0
tvos-v0.87.0    TV files: 11     tvos-v0.83.0    TV files: 9
```

`branch-v*` mirrors upstream core React Native. Any script reading it for TV content silently produces nothing.

**Released versions come from npm dist-tags, not git tags.** The repo carries inherited upstream core RN tags (`v0.87.1`, `v0.86.3`) that are _not_ TV releases — `v0.85.3` and `v0.86.3` are both reachable from `upstream/*`. RNTV's own releases carry the `-N` suffix. Deriving "latest" from git tags gets 0.87 wrong. The npm dist-tags are authoritative and were fetched:

```
0.86-stable  0.86.2-0     0.87-stable  0.87.1-0     latest  0.87.1-0
```

Also note standard semver sorts `0.85.3-3` _before_ `0.85.3` (prerelease ordering), while RNTV means it as _newer_. Never sort RNTV versions with a semver library.

**The TypeScript API is generated from Flow source, and as of 0.87 the generated API is the default** (`docs/strict-typescript-api.md`). The old hand-maintained types are the reason `ReactNativeTVTypes.d.ts` now sits in `types_DEPRECATED/` — that file is on its way out and must **not** be the generator's foundation. `yarn build-types` in the TV repo (`node ./scripts/js-api/build-types`, translating Flow via `flow-api-translator` and rolling up via `@microsoft/api-extractor`) produces two outputs with different properties:

| Output                                      | Committed?                          | Prose?                               | Use                        |
| ------------------------------------------- | ----------------------------------- | ------------------------------------ | -------------------------- |
| `packages/react-native/types_generated/`    | No — gitignored, but shipped to npm | **Yes**                              | The generator's input      |
| `packages/react-native/ReactNativeApi.d.ts` | Yes                                 | No — 9 `*` lines, all license header | Cheap CI completeness gate |

The generated types carry full TSDoc, `@platform`, and `@deprecated` tags, plus a per-file `@generated SignedSource<<hash>>` for staleness detection. Verified in `types_generated/Libraries/Components/TV/TVViewPropTypes.d.ts`:

```
export type TVParallaxPropertiesType = Readonly<{
  /** If true, parallax effects are enabled.  Defaults to true. */
  enabled?: boolean | undefined;
```

Input files needed: `Libraries/Components/TV/` (`TVViewPropTypes`, `TVFocusGuideView`, `TVTextScrollView`, `TVEventControl`, `TVEventHandler`, `useTVEventHandler`) and `Libraries/Components/ScrollView/ScrollView.d.ts` (which is where `scrollAnimationEnabled` / `snapToItemPadding` land).

Note the generated types are also _more current_ than the deprecated manual file — e.g. the Flow docblock for `TVFocusGuideView.enabled` adds "Useful for absolute focus guides without children", which the manual file lacks.

**The TV badge mechanism already exists.** `website/src/css/customTheme.scss:2048,2127` styles `.label.tv`, and `docs/button.md` already uses `<div className="label tv">TV</div>` six times. No new CSS or components needed.

**The sidebar already has the right shape.** `website/sidebars.ts` has `Android APIs`/`iOS APIs` (lines 278–289) and `Android Components`/`iOS Components` (lines 315–326). TV categories drop in alongside.

**`PlatformSupport` already renders a TV badge** — `website/src/theme/PlatformSupport/index.tsx`, icon at `website/src/theme/Icon/TV/index.tsx`, used by `docs/getting-started.md:33`.

---

## Phase 0 — Branch and record the plan

The repo is currently on `main` with a clean working tree. Before any edits:

1. `git checkout -b tvos`
2. Write this plan to `TV-CHANGES.md` at the repo root.
3. Commit it alone, so the first commit on the branch is the rationale and every later commit is reviewable against it.

All subsequent work happens on `tvos`; nothing lands on `main`.

## Phase 1 — Config and branding

**`website/docusaurus.config.ts`** (the single highest-value file):

- `title` → `React Native for TV`; `tagline` → TV-specific
- `organizationName` → `react-native-tvos`; `projectName` → `react-native-tvos`
- `url` → a single named placeholder constant, `baseUrl` `/`. Also update the JSON-LD `headTags` (lines 123–178), which hard-code `https://reactnative.dev/` six times, and the `metadata` og/twitter image URLs (591–603).
- `copyright` (line 26) — currently `Copyright © Meta Platforms, Inc.`
- **Remove `algolia`** (585–590). Index `react-native-v2` is Meta's; querying it would return reactnative.dev results. Search is disabled until a TV index exists.
- **Remove `gtag`** (219–221) — `G-58L13S6BDP` is Meta's property.
- **Remove the SurveyMonkey script** (106–108) — a Meta feedback widget.
- `customFields.facebookAppId` (116) — drop.
- Navbar GitHub link (482) and footer GitHub link (552) → `react-native-tvos/react-native-tvos`.
- Footer: Code of Conduct (531) → the TV repo; X/Bluesky (544–549) → remove or repoint; the Meta OSS footer logo (578–582) → replace.
- `editUrl` base (line 40) → this repo's eventual remote.

**`website/core/RNRepoLink.tsx`** — builds `https://github.com/facebook/react-native/blob/<branch>/<href>` and is used by 10 docs. Repoint to the TV repo and switch it to the `tvos-v*` naming.

**`website/src/getTemplateBranchNameForCurrentVersion.ts`** returns `<label>-stable`; **`getCoreBranchNameForCurrentVersion.ts`** returns `v<label>.0`. Neither matches TV branch naming. Replace with one helper returning `main` or `tvos-v<label>.0`.

**Other branding:** `website/static/manifest.json`, `website/static/CNAME`, `website/src/pages/index.tsx` (title/og/twitter), `website/src/components/Home/Hero/index.tsx` (h1, GitHub star button, `aria-label="Star facebook/react-native on GitHub"`), `website/src/components/Home/Community/PartnersShowcase.tsx`, `website/src/components/Home/Watch/index.tsx`, `website/package.json` (`homepage`, `repository`, `bugs`).

**`website/showcase.json`** — currently Meta/Microsoft/Shopify phone apps. Replace with TV apps or empty it; leaving it is actively misleading.

---

## Phase 2 — Generation scripts

Three new files under `scripts/src/`, matching the existing style in `scripts/src/sync-vercel-redirects.ts` (Meta header, `node:fs`/`node:path`, `node:assert`, non-zero exit with usage). Node 22 runs TypeScript directly; no build step.

### Design decisions

**Generate and commit; keep generation out of `yarn start`.** This matches the repo's one precedent (`sync-vercel-redirects` + the `check-vercel-redirects` CI job). It means a docs contributor with no sibling checkout can still run `yarn start`, the output is reviewable in PR diffs, and `docusaurus start` stays fast and deterministic.

**Emit partials, not whole pages.** Prose and examples must be hand-written; prop lists must not drift. The repo already uses this pattern — `docs/set-up-your-environment.md:14` imports `./_getting-started-macos-ios.md`.

**Partials live under `docs/_tv-generated/`, not `website/src/`.** Docusaurus freezes `versioned_docs/` at cut time. Only a path under `docs/` gets snapshotted by `yarn version:cut`; a partial under `website/src/` would be shared live by every frozen version. The `_` prefix keeps Docusaurus from routing the directory. (Under the stopgap the 0.86 partials are generated from `main` anyway — but placing them correctly now means per-version generation is a drop-in change later, not a restructure.)

### Step 0 — the types are already generated (stopgap)

`types_generated/` is gitignored, so it cannot be read from a git ref. **It has already been generated in the local `main` checkout**, so implementation can start immediately against `/Users/dlowder/iosProjects/react-native-tvos/packages/react-native/types_generated/`.

**One ref, not per-branch.** Every partial — including the ones snapshotted into `versioned_docs/version-0.86` — is generated from `main`. This is a deliberate stopgap while the npm artifacts are broken. Its cost: the 0.86 pages will show `main`'s props. Because 0.86 and 0.87 are adjacent releases the drift is small, but it is real, so the 0.86 TV pages should carry a short note saying the prop tables track the latest release. Revisit once npm ships the artifacts and per-version generation becomes cheap.

To regenerate later, run **in the TV repo**:

```sh
yarn
patch -p1 < tools/rntv-workflows/microsoft-api-extractor.patch
yarn --cwd packages/react-native-codegen build
yarn build-types --skip-snapshot
patch -p1 -R < tools/rntv-workflows/microsoft-api-extractor.patch
```

This is the types-only subset of `tools/rntv-workflows/scripts/run-tv-unit-tests.sh`; **confirm the minimal subset by running it once** before committing to it. This runs when refreshing TV docs, not on every website build.

_The npm route is currently blocked._ The README states `types_generated/` is "shipped to npm", which would have skipped this setup and made CI reproducible without a TV checkout. But a build error omitted the generated API artifacts from `react-native-tvos@0.87.1-0`, so the published package does not currently contain them. **Build the local-checkout path.** Revisit npm only once a release ships with the artifacts present — at which point the CI story gets substantially simpler, so it is worth re-checking when the packaging fix lands.

### `scripts/src/lib/rntv-source.ts`

Shared helper. Resolves the checkout (`--repo` argv → `RNTV_REPO` env → `tv-source.json` → default `../react-native-tvos`).

Two access modes, deliberately different:

- **Working-tree read** for `types_generated/` only — it exists in no git ref. Guarded by asserting the directory exists and every file carries a `@generated SignedSource` header; a hand-edited or absent file fails with the `yarn build-types` remedy.
- **Git-ref read** (`git -C <checkout> show <ref>:<path>`) for everything else, so a dirty or wrong-branch checkout cannot corrupt output.

Also exports `assertRefPresent` (fails with the exact `git fetch` remedy — the checkout is currently 9 days stale) and `assertIsTvBranch` (requires `Libraries/Components/TV/TVFocusGuideView.js` at the ref, so a `branch-v*` mistake fails loudly instead of emitting nothing).

### `scripts/src/generate-tv-api.ts`

**In:** the seven `types_generated/` files listed above. **Out:** one Markdown prop-table partial per exported type in `docs/_tv-generated/`, plus `docs/_tv-generated/manifest.json` recording the TV repo commit SHA and each input's `SignedSource` hash.

Parse with the TypeScript compiler API — `typescript` is already a root devDependency (`^6.0.3`), so no new dependency. `ts.createSourceFile` with `setParentNodes: true`; no `createProgram` and no typechecker, so the files' relative imports are never resolved and no RN `node_modules` is needed. Text extraction is not viable: `scrollAnimationEasing` is a multi-line union containing a tuple and six quoted literals, and several types nest angle brackets (`Readonly<Omit<ViewProps, ...> & {...}>`). `ts.getJSDocCommentsAndTags` is also the only reliable way to bind each doc block to its property.

Per member emit name, required (`questionToken`), type, description, `@platform`, `@deprecated`. Strip the trailing `| undefined` that the generator adds to every optional prop — the Required column already carries it. Sort alphabetically. **Escape before writing** — `|` → `\|`, `{` → `&#123;`, `<` → `&lt;`, newline → `<br />`; the pipe unions will otherwise destroy the table. Write an `@generated` header naming the script and source file. Format output with the installed Prettier API so husky's `pretty-quick` cannot fight the generator.

**Cross-check** the emitted names against `ReactNativeApi.d.ts` — which _is_ committed, so CI reads it from a git ref cheaply, with no `build-types` run. Asymmetric severity: **in the API but undocumented → exit 1** (a new TV prop shipped and the docs missed it); **documented but absent from the API → warn** (the snapshot mangles identifiers like `TVRemoteEvent_2` and `$$PARAM_0$$`). Keep a small name map plus a reviewable allowlist.

This split is the point of the design: the heavy `build-types` run produces prose and happens rarely; the cheap committed snapshot powers the CI gate on every PR.

### `scripts/src/generate-tv-releases.ts`

**In:** `npm view react-native-tvos dist-tags --json` for released versions (authoritative — see above), plus one `git show` per in-scope branch — now just `tvos-v0.86.0` and `tvos-v0.87.0`, plus `main` for next — for: `packages/react-native/package.json` → `peerDependencies.react`; `packages/react-native/gradle/libs.versions.toml` → `minSdk`/`targetSdk`/`compileSdk`/`ndkVersion`; `packages/react-native/scripts/cocoapods/helpers.rb` → `min_ios_version_supported`. Three refs, trivial cost.

Never read the `name`/`version` fields from `package.json`: on `tvos-v0.87.0` `name` is `"react-native"` and `version` is `1000.0.0`-style placeholder data.

**Out:** `website/tv-releases.json` and `website/releases/_tv-branches-table.md`, imported by the hand-written `website/releases/branches.md`.

**Columns:** keep **React**; add **`react-native-tvos` npm version**, **min tvOS**, **Android minSdk/targetSdk/compileSdk/ndkVersion** — fork-relevant and non-obvious (minSdk is non-monotonic across releases). **Drop Hermes (Legacy), Hermes V1, Yoga, DevTools frontend** — these are properties of the underlying core release, identical to what reactnative.dev already publishes for the same core version, and they'd require a second loop against the `branch-v*` core-mirror family for zero TV-specific signal. Replace with one "Core RN" column deep-linking to the matching reactnative.dev row.

**This script must not write `website/versions.json`.** That file is Docusaurus's own manifest and must match the directories under `versioned_docs/`; writing it from npm tags breaks the build with a missing-directory error. Instead it warns when a released minor has no matching `versioned_docs/version-X` and tells the human to run `yarn version:cut`.

### Wiring

Root `package.json` gains three scripts; `website/package.json` is unchanged and `start` stays `docusaurus start`:

```json
"generate:tv-api": "node scripts/src/generate-tv-api.ts",
"generate:tv-releases": "node scripts/src/generate-tv-releases.ts",
"generate:tv": "yarn generate:tv-api && yarn generate:tv-releases"
```

### Drift detection

Two jobs in `.github/workflows/pre-merge.yml`, modeled on `check-vercel-redirects`:

- **`check-tv-api-surface`** — on every PR. Checks out the pinned TV commit at depth 1 and reads only the committed `ReactNativeApi.d.ts`, then runs the cross-check against the committed partials. **No `build-types` run**, so the job stays fast. This catches the case that matters: a TV prop exists in the shipped API and the docs don't document it. It cannot catch prose-only changes — that's what the manifest is for.
- **`check-tv-releases`** — `workflow_dispatch` + weekly `schedule`, not on PRs. Release metadata changes when RNTV ships, not when someone edits a doc. On drift it opens a PR. The fresh clone also solves checkout staleness.

Note the deliberate departure from the `check-vercel-redirects` precedent: that job uses `git diff --exit-code`, which is safe because it edits one existing file. Any drift check over `docs/_tv-generated/` must use `git status --porcelain -uall`, because this generator _creates_ files and plain `git diff` cannot see a new untracked partial.

---

## Phase 3 — Content

### New TV pages (hand-written prose, generated prop tables)

Under `docs/`, added to `website/sidebars.ts` alongside the existing platform categories:

- `TV Components`: `tvfocusguideview.md`, `tvtextscrollview.md`
- `TV APIs`: `tveventcontrol.md`, `tveventhandler.md`, `usetveventhandler.md`

Each imports its partial from `docs/_tv-generated/`.

### Guide pages

`docs/building-for-tv.md` is currently an 11-line deprecation stub (`🗑️ Building For TV Devices`, "TV support has moved to…"). It becomes the real TV hub. Source material is the TV repo's 352-line `README.md`: Hermes support, new architecture, the precompiled iOS/tvOS framework, minimum OS versions (iOS/tvOS 15.1, Android API 24), Podfile single-target constraint, Maven group `io.github.react-native-tvos`, project creation via Expo (`with-router-tv`) and Community CLI (`@react-native-tvos/template-tv`), and TV-specific file extensions (`.ios.tv.tsx` resolution order).

Also update `docs/getting-started.md` and `docs/out-of-tree-platforms.md:17` (which currently lists the TV fork as an out-of-tree platform — on this site it is the platform).

### Annotations (measured scope)

Pages that document focus props but label them Android/iOS-only — add `<div className="label tv">TV</div>`:
`touchableopacity.md`, `touchablehighlight.md`, `touchablewithoutfeedback.md`, `touchablenativefeedback.md`, `view.md`, `textinput.md`

Pages documenting **zero** focus props that need them (`pressable.md` is the notable one — it is the primary TV focus target and has no focus coverage at all):
`pressable.md`, `flatlist.md`, `virtualizedlist.md`, `scrollview.md`, `sectionlist.md`

`platform.md` documents `isTV` but not `isTVOS`.

The generated types supply the descriptions for these props (`TVViewPropTypes.d.ts` for the focus props, `ScrollView.d.ts` for the TV scroll props), so the annotations import the same generated partials rather than retyping prose that would then drift.

Worth noting: the generated `Pressable.d.ts` already carries the `nextFocus*` props, so `pressable.md` is missing documentation for props the API has shipped all along.

### SnackPlayer — flagged, needs your call

76 of 219 doc pages embed Expo Snack (171 blocks). Snack has no TV target and no D-pad, so every embed on this site demonstrates phone behavior. Options: leave them (fastest, quietly wrong for focus-related pages), strip them from TV-relevant pages only, or replace with static code blocks. Recommend the middle option — the remark plugin is at `plugins/remark-snackplayer/`. This is a content decision, not a technical blocker.

---

## Phase 4 — Versions and pruning

Keep 0.86 and 0.87 plus `next` (main). Delete `website/versioned_docs/version-0.77` … `version-0.85`, the nine matching `versioned_sidebars/` files, and trim `website/versions.json` to `["0.87", "0.86"]`.

This also shrinks the repo sharply: `versioned_docs/` is 2358 files across 11 versions today, dropping to roughly 430 across two.

`website/versionsArchived.json` maps 0.60–0.76 to reactnative.dev Netlify archives — clear it, or the version page links TV readers to core RN docs.

`website/src/pages/versions.tsx` hard-codes `https://github.com/react/react-native/releases` and a `<version>-stable...main` compare URL (lines 42–48). Repoint to the TV repo and its `tvos-v*` naming.

`website/src/components/releases/_releases-table.md` is a hand-maintained schedule table whose rows link core RN blog posts. Rebuild for TV release trains or remove the section.

**Blog:** 95 posts, all core React Native announcements (2015–2026), plus `website/blog/authors.yml`. On a TV site they are someone else's release notes. Recommend removing the blog and its navbar/footer entries; the alternative is keeping it clearly attributed as upstream. Your call — flagging rather than assuming.

**`packages/lint-examples/package.json`** pins `react-native@^0.87.1` and four `@react-native/*` packages for linting doc examples. Repoint to `react-native-tvos` so examples lint against the TV API.

---

## Verification

1. Confirm `types_generated/Libraries/Components/TV/` is present in the local `main` checkout (it was generated ahead of this work, so no `build-types` run is needed to start).
2. `yarn generate:tv` — confirm partials appear in `docs/_tv-generated/`, the manifest records SHA + SignedSource hashes, and the cross-check passes.
3. Re-run it; confirm zero diff (Prettier fixed point).
4. Delete `types_generated/` and re-run — confirm it fails with the `yarn build-types` remedy rather than emitting empty tables.
5. Point the release generator at a `branch-v0.87.0` ref and confirm `assertIsTvBranch` **fails loudly** — this is the guard for the branch-family mistake that this plan already made once.
6. Remove the sibling checkout from the path and confirm `yarn start` still works (the payoff for committing output).
7. `yarn start` — check `/docs/building-for-tv`, the new TV component and API pages (prop tables render; no broken Markdown from pipe unions), `/releases/branches`, `/versions`.
8. `yarn build` — `onBrokenLinks: 'warn'`, so review the warnings; removing the blog and archived versions will create some.
9. `yarn lint:website` and `yarn --cwd website lint:markdown:images`.
10. Grep for residual `facebook/react-native`, `react/react-native`, and `reactnative.dev` outside `versioned_docs/`; confirm each remaining hit is a deliberate upstream reference.

## Risks

- **The generator depends on a build artifact, not a committed file, and has no fallback right now.** `types_generated/` requires the TV repo's toolchain (including an `@microsoft/api-extractor` patch). The obvious mitigation — read the artifacts from the published npm package — is unavailable, because a build error omitted them from `react-native-tvos@0.87.1-0`. So if the local `build-types` setup breaks, TV doc refreshes stall with nothing to fall back to. Two consequences: keep the committed partials as the source of truth for the site (a broken toolchain degrades to stale docs, not a broken build), and treat the npm packaging fix as the thing that retires this risk.
- **Prose changes are invisible to the PR-time CI gate.** The cheap gate only sees the API surface via `ReactNativeApi.d.ts`. A reworded docblock upstream won't fail CI; the manifest's SignedSource hashes make it detectable, but only when someone re-runs the generator. The weekly job should cover this.
- **0.86 prop tables are generated from `main`, not from `tvos-v0.86.0`.** This is the accepted stopgap. The drift between adjacent releases is small but not zero, so the 0.86 TV pages need a note saying prop tables track the latest release. Removing this compromise means per-branch `build-types` runs, which is worth doing only once the npm artifacts land.
- The API sources disagree in places (`destinations` has three type spellings across files). The cross-check surfaces this rather than hiding it; expect an initial allowlist.
