/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Generates TV prop-table partials from react-native-tvos' generated types.
 *
 * Prose and examples stay hand-written in docs/; only the prop lists are
 * generated, so they cannot drift from the shipped API. Output is committed,
 * which keeps `yarn start` working for contributors with no TV checkout and
 * makes an upstream prop rename visible in review.
 *
 * Usage: node scripts/src/generate-tv-api.ts [--repo=<path>] [--check]
 */

import fs from 'node:fs';
import path from 'node:path';
import prettier from 'prettier';

import {
  API_SNAPSHOT_PATH,
  REPO_ROOT,
  readGeneratedType,
  readSourceConfig,
  resolveCheckout,
  resolveCommit,
  readAtRef,
  existsAtRef,
} from './lib/rntv-source.ts';
import {extractMembers, parse, type Member} from './lib/tv-api-extract.ts';

const OUT_DIR = path.join(REPO_ROOT, 'docs', '_tv-generated');

const TV = 'Libraries/Components/TV';
const SCROLL_VIEW = 'Libraries/Components/ScrollView/ScrollView.d.ts';
const VIEW_PROPS = 'Libraries/Components/View/ViewPropTypes.d.ts';

type Target = {
  /** Output basename under docs/_tv-generated/. */
  out: string;
  /** Source file, relative to types_generated/. */
  file: string;
  /** Declaration to read members from. */
  decl: string;
  /** When set, only these members are emitted, and all must exist. */
  only?: string[];
  /** What this partial documents; recorded in the generated header. */
  title: string;
  /**
   * How to lay the members out.
   *
   * `props` and `methods` mirror how the hand-written docs render each, as a
   * heading per member. `table` suits plain object payloads, which the
   * hand-written docs also render as a single table.
   */
  render: 'props' | 'methods' | 'table';
  /**
   * Where to take descriptions for members the primary declaration documents
   * with no doc comment. Some declarations carry the authoritative prop set
   * but no prose, while another declaration upstream documents the same names.
   * Both are generated output, so prose still cannot drift from source.
   */
  descriptionsFrom?: {file: string; decl: string};
};

const TARGETS: Target[] = [
  {
    out: 'tv-view-props',
    file: `${TV}/TVViewPropTypes.d.ts`,
    decl: 'TVViewProps',
    title: 'TV props',
    render: 'props',
  },
  {
    // Focus and blur are how a TV app observes the focus engine. They live on
    // View via FocusEventProps, not in TVViewProps, so they need their own
    // target; Pressable's local TVProps re-declares them but adds nothing.
    out: 'tv-focus-events',
    file: VIEW_PROPS,
    decl: 'FocusEventProps',
    title: 'TV focus event props',
    render: 'props',
  },
  {
    out: 'tv-parallax-properties',
    file: `${TV}/TVViewPropTypes.d.ts`,
    decl: 'TVParallaxPropertiesType',
    title: 'TVParallaxProperties',
    render: 'props',
  },
  {
    out: 'tv-focus-guide-view-props',
    file: `${TV}/TVFocusGuideView.d.ts`,
    decl: 'TVFocusGuideViewProps',
    title: 'TVFocusGuideView props',
    render: 'props',
  },
  {
    out: 'tv-focus-guide-view-methods',
    file: `${TV}/TVFocusGuideView.d.ts`,
    decl: 'TVFocusGuideViewImperativeMethods',
    title: 'TVFocusGuideView methods',
    render: 'methods',
  },
  {
    out: 'tv-text-scroll-view-props',
    file: `${TV}/TVTextScrollView.d.ts`,
    decl: 'TVTextScrollView',
    title: 'TVTextScrollView props',
    render: 'props',
  },
  {
    out: 'tv-event-control-methods',
    file: `${TV}/TVEventControl.d.ts`,
    decl: 'TVEventControl',
    title: 'TVEventControl methods',
    render: 'methods',
  },
  {
    out: 'tv-event-handler-methods',
    file: `${TV}/TVEventHandler.d.ts`,
    decl: 'TVEventHandlerType',
    title: 'TVEventHandler methods',
    render: 'methods',
  },
  {
    out: 'tv-remote-event',
    file: `${TV}/TVEventHandler.d.ts`,
    decl: 'TVRemoteEvent',
    title: 'TVRemoteEvent',
    render: 'table',
  },
  {
    out: 'tv-remote-event-body',
    file: `${TV}/TVEventHandler.d.ts`,
    decl: 'TVRemoteEventBody',
    title: 'TVRemoteEvent body',
    render: 'table',
  },
  {
    out: 'tv-scroll-view-props',
    file: SCROLL_VIEW,
    decl: 'ScrollViewBaseProps',
    only: [
      'scrollAnimationDuration',
      'scrollAnimationEasing',
      'scrollAnimationEnabled',
      'snapToItemPadding',
    ],
    title: 'TV scroll props',
    render: 'props',
  },
];

/** Escapes text for a Markdown table cell inside MDX. */
function cell(text: string): string {
  return text
    .replace(/\|/g, '\\|')
    .replace(/</g, '&lt;')
    .replace(/\{/g, '&#123;')
    .replace(/\n+/g, '<br />')
    .trim();
}

/** Matches the badge markup and casing used by the hand-written docs. */
const PLATFORM_LABELS: Record<string, string> = {
  ios: 'iOS',
  android: 'Android',
  tv: 'TV',
};

function platformBadges(platforms: string[]): string {
  return platforms
    .map(p => `<div className="label ${p}">${PLATFORM_LABELS[p] ?? p}</div>`)
    .join(' ');
}

/**
 * Escapes characters MDX would read as JSX, leaving inline code untouched.
 *
 * Doc comments are prose, so a bare `<` means less-than, not a tag. Escaping
 * inside a code span would surface the entity to the reader, so code spans are
 * passed through: MDX does not parse JSX there either.
 */
function escapeMdxProse(text: string): string {
  return text
    .split(/(`+[^`]*`+)/)
    .map((part, index) =>
      index % 2 === 1
        ? part
        : part.replace(/</g, '&lt;').replace(/\{/g, '&#123;')
    )
    .join('');
}

/** Description for an expanded section, or empty when upstream documents none. */
function describeExpanded(member: Member): string {
  const parts: string[] = [];
  if (member.deprecated !== null) {
    parts.push(`**Deprecated.** ${member.deprecated}`.trim());
  }
  if (member.description) {
    parts.push(member.description);
  }
  return escapeMdxProse(parts.join('\n\n'));
}

function describe(member: Member): string {
  const parts: string[] = [];
  if (member.deprecated !== null) {
    parts.push(`**Deprecated.** ${member.deprecated}`.trim());
  }
  if (member.description) {
    parts.push(member.description);
  }
  return parts.join('\n') || '—';
}

/** Splits `(params) => ret` out of a function type's text. */
function signatureOf(name: string, type: string): string {
  const match = /^\(?\((.*)\)\s*=>\s*(.+?)\)?$/s.exec(type);
  if (!match) {
    return `${name}()`;
  }
  const [, params = '', returns = 'void'] = match;
  const suffix = returns === 'void' ? '' : `: ${returns}`;
  return `${name}(${params})${suffix}`;
}

function generatedHeader(target: Target): string[] {
  // These partials are imported into MDX pages, so they are compiled as MDX.
  // HTML comments are a syntax error there; MDX expression comments are not.
  return [
    `{/* @generated by scripts/src/generate-tv-api.ts — ${target.title}.`,
    `    Source: react-native-tvos ${target.file} (${target.decl}).`,
    `    Do not edit by hand; run \`yarn generate:tv-api\`. */}`,
    '',
  ];
}

/** One heading per prop, matching how the hand-written prop docs read. */
function renderProps(target: Target, members: Member[]): string {
  const sections = members.flatMap(member => {
    const badges = platformBadges(member.platforms);
    const heading = member.required
      ? `### <div className="label required basic">Required</div>**\`${member.name}\`**`
      : `### \`${member.name}\`${badges ? ` ${badges}` : ''}`;
    const description = describeExpanded(member);
    return [
      heading,
      '',
      ...(description ? [description, ''] : []),
      '| Type |',
      '| ---- |',
      `| \`${cell(member.type)}\` |`,
      '',
      '---',
      '',
    ];
  });
  return [...generatedHeader(target), ...sections].join('\n');
}

/** One heading per method, matching how the hand-written method docs read. */
function renderMethods(target: Target, members: Member[]): string {
  const sections = members.flatMap(member => {
    const description = describeExpanded(member);
    return [
      `### \`${member.name}()\``,
      '',
      '```tsx',
      signatureOf(member.name, member.type),
      '```',
      '',
      ...(description ? [description, ''] : []),
      '---',
      '',
    ];
  });
  return [...generatedHeader(target), ...sections].join('\n');
}

/** A single table, for plain object payloads. */
function renderTable(target: Target, members: Member[]): string {
  const rows = members.map(m => {
    const badges = platformBadges(m.platforms);
    const name = badges ? `\`${m.name}\` ${badges}` : `\`${m.name}\``;
    return `| ${name} | \`${cell(m.type)}\` | ${m.required ? 'Yes' : 'No'} | ${cell(describe(m))} |`;
  });
  return [
    ...generatedHeader(target),
    `| Name | Type | Required | Description |`,
    `| ---- | ---- | -------- | ----------- |`,
    ...rows,
    '',
  ].join('\n');
}

function render(target: Target, members: Member[]): string {
  switch (target.render) {
    case 'props':
      return renderProps(target, members);
    case 'methods':
      return renderMethods(target, members);
    case 'table':
      return renderTable(target, members);
  }
}

/** Member names already present in the committed partials. */
function documentedInCommittedPartials(): Set<string> {
  const names = new Set<string>();
  for (const target of TARGETS) {
    const file = path.join(OUT_DIR, `${target.out}.md`);
    if (!fs.existsSync(file)) {
      throw new Error(
        `Missing docs/_tv-generated/${target.out}.md. Run \`yarn generate:tv-api\`.`
      );
    }
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      // Matches both a table row and an expanded section heading.
      const name =
        /^\|\s*`([A-Za-z_$][\w$]*)`/.exec(line)?.[1] ??
        /^###\s+(?:<div[^>]*>[^<]*<\/div>)?\s*\*{0,2}`([A-Za-z_$][\w$]*)\(?\)?`/.exec(
          line
        )?.[1];
      if (name) {
        names.add(name);
      }
    }
  }
  return names;
}

/**
 * Checks the shipped API against the committed partials, without regenerating.
 *
 * This is the CI gate. It needs only the committed ReactNativeApi.d.ts, read
 * from a git ref, so it runs without the `yarn build-types` output that full
 * generation requires and that is gitignored upstream.
 */
function surfaceOnly(): void {
  const config = readSourceConfig();
  const repo = resolveCheckout(config);
  crossCheck(repo, config.apiRef, documentedInCommittedPartials());
  if (!process.exitCode) {
    console.log(
      `Every TV member in the public API appears in docs/_tv-generated.`
    );
  }
}

async function main() {
  if (process.argv.includes('--surface')) {
    surfaceOnly();
    return;
  }
  const check = process.argv.includes('--check');
  const config = readSourceConfig();
  const repo = resolveCheckout(config);
  const commit = resolveCommit(repo, config.apiRef);

  const prettierOptions = await prettier.resolveConfig(
    path.join(OUT_DIR, 'x.md')
  );

  const sources = new Map<string, ReturnType<typeof readGeneratedType>>();
  const written: Record<string, string> = {};
  const documented = new Set<string>();

  fs.mkdirSync(OUT_DIR, {recursive: true});

  for (const target of TARGETS) {
    if (!sources.has(target.file)) {
      sources.set(target.file, readGeneratedType(repo, target.file));
    }
    const source = sources.get(target.file)!;
    let members = extractMembers(
      parse(target.file, source.text),
      target.decl,
      target.only
    );
    if (target.descriptionsFrom) {
      const from = target.descriptionsFrom;
      if (!sources.has(from.file)) {
        sources.set(from.file, readGeneratedType(repo, from.file));
      }
      const documented = new Map(
        extractMembers(
          parse(from.file, sources.get(from.file)!.text),
          from.decl
        ).map(m => [m.name, m])
      );
      members = members.map(member => {
        const fallback = documented.get(member.name);
        if (member.description || !fallback?.description) {
          return member;
        }
        return {
          ...member,
          description: fallback.description,
          platforms: member.platforms.length
            ? member.platforms
            : fallback.platforms,
          deprecated: member.deprecated ?? fallback.deprecated,
        };
      });
    }
    members.forEach(m => documented.add(m.name));

    const formatted = await prettier.format(render(target, members), {
      ...prettierOptions,
      parser: 'markdown',
    });
    const outPath = path.join(OUT_DIR, `${target.out}.md`);
    const existing = fs.existsSync(outPath)
      ? fs.readFileSync(outPath, 'utf8')
      : null;
    if (existing !== formatted) {
      if (check) {
        console.error(`Stale: docs/_tv-generated/${target.out}.md`);
        process.exitCode = 1;
      } else {
        fs.writeFileSync(outPath, formatted);
      }
    }
    written[target.out] = `${target.file}#${target.decl}`;
  }

  const manifest =
    JSON.stringify(
      {
        source: config.repo,
        ref: config.apiRef,
        commit,
        inputs: Object.fromEntries(
          [...sources.values()].map(s => [s.relPath, s.signedSource])
        ),
        outputs: written,
      },
      null,
      2
    ) + '\n';
  const manifestPath = path.join(OUT_DIR, 'manifest.json');
  const existingManifest = fs.existsSync(manifestPath)
    ? fs.readFileSync(manifestPath, 'utf8')
    : null;
  if (existingManifest !== manifest && !check) {
    fs.writeFileSync(manifestPath, manifest);
  }

  crossCheck(repo, config.apiRef, documented);

  console.log(
    `${check ? 'Checked' : 'Wrote'} ${TARGETS.length} TV partials from ` +
      `${config.repo} @ ${commit.slice(0, 9)}`
  );
}

/**
 * Snapshot declarations whose members must all be documented.
 *
 * The snapshot contains BOTH the deprecated hand-maintained types and the
 * generated ones, and api-extractor disambiguates the collisions with `_N`
 * and `_default` suffixes. The generated side is authoritative, so these are
 * deliberately the suffixed names:
 *
 * - `TVRemoteEvent_2` is generated; `TVRemoteEvent` is the deprecated manual
 *   type, which still carries a `target` field the fork no longer emits.
 * - `TVEventControl_default` holds the members; `TVEventControl` is a
 *   `typeof` alias of it.
 *
 * Auditing the deprecated names instead reports props that no longer ship.
 */
const SNAPSHOT_AUDIT = [
  'TVViewProps',
  'TVProps',
  'TVFocusGuideViewProps',
  'TVParallaxPropertiesType',
  'TVRemoteEvent_2',
  'TVRemoteEventBody',
  'TVEventControl_default',
];

/**
 * Fails when the shipped API declares a TV member the docs never mention.
 *
 * ReactNativeApi.d.ts is committed, so this runs from a git ref with no
 * build-types run, which is what makes it usable as a cheap CI gate. It
 * compares member names rather than type names: the snapshot renames and
 * rolls up types (TVViewProps becomes TVProps, TVViewPropsIOS is a bare
 * alias), so type-name comparison is pure noise.
 *
 * The reverse direction is not checked. The snapshot omits `declare module`
 * augmentations and mangles identifiers, so a name absent from it proves
 * nothing.
 */
function crossCheck(repo: string, ref: string, documented: Set<string>): void {
  if (!existsAtRef(repo, ref, API_SNAPSHOT_PATH)) {
    console.warn(
      `No ${API_SNAPSHOT_PATH} at ${ref}; skipped the completeness check.`
    );
    return;
  }
  const allowPath = path.join(REPO_ROOT, 'scripts', 'tv-api-allowlist.json');
  const allowed: string[] = fs.existsSync(allowPath)
    ? JSON.parse(fs.readFileSync(allowPath, 'utf8')).undocumented
    : [];

  const snapshot = parse(
    API_SNAPSHOT_PATH,
    readAtRef(repo, ref, API_SNAPSHOT_PATH)
  );

  const missing: string[] = [];
  for (const decl of SNAPSHOT_AUDIT) {
    let members: Member[];
    try {
      members = extractMembers(snapshot, decl);
    } catch {
      console.warn(`Snapshot has no '${decl}'; it may have been renamed.`);
      continue;
    }
    for (const member of members) {
      if (!documented.has(member.name) && !allowed.includes(member.name)) {
        missing.push(`${decl}.${member.name}`);
      }
    }
  }

  if (missing.length > 0) {
    console.error(
      `These TV members ship in the public API but appear in no generated ` +
        `partial:\n` +
        missing.map(m => `  - ${m}`).join('\n') +
        `\n\nAdd them to a target in TARGETS, or record the omission in ` +
        `scripts/tv-api-allowlist.json.`
    );
    process.exitCode = 1;
  }
}

await main();
