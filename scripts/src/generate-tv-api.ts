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
  REPO_ROOT,
  fetchPackage,
  readGeneratedType,
  readPackageFile,
  readSourceConfig,
  TYPES_ENTRY,
  type TvPackage,
} from './lib/rntv-source.ts';
import {extractMembers, parse, type Member} from './lib/tv-api-extract.ts';

/** Partials for the unreleased docs. */
const NEXT_OUT_DIR = path.join(REPO_ROOT, 'docs', '_tv-generated');

/** Partials for a released version's frozen docs. */
function versionedOutDir(version: string): string {
  return path.join(
    REPO_ROOT,
    'website',
    'versioned_docs',
    `version-${version}`,
    '_tv-generated'
  );
}

const TV = 'Libraries/Components/TV';
const SCROLL_VIEW = 'Libraries/Components/ScrollView/ScrollView.d.ts';
const PRESSABLE = 'Libraries/Components/Pressable/Pressable.d.ts';
const CORE_EVENTS = 'Libraries/Types/CoreEventTypes.d.ts';
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
  /**
   * Members emitted when present. Unlike `only`, absence is not an error:
   * these were added in a later release than the oldest one documented.
   */
  optional?: string[];
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
    file: CORE_EVENTS,
    decl: 'TVRemoteEvent',
    title: 'TVRemoteEvent',
    render: 'table',
  },
  {
    out: 'tv-scroll-view-props',
    file: SCROLL_VIEW,
    decl: 'ScrollViewBaseProps',
    only: ['scrollAnimationEnabled', 'snapToItemPadding'],
    // Added in 0.87; absent from 0.86.
    optional: ['scrollAnimationDuration', 'scrollAnimationEasing'],
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

/** Member names present in a committed set of partials. */
function documentedIn(outDir: string): Set<string> {
  const names = new Set<string>();
  for (const target of TARGETS) {
    const file = path.join(outDir, `${target.out}.md`);
    if (!fs.existsSync(file)) {
      throw new Error(
        `Missing ${path.relative(REPO_ROOT, file)}. Run \`yarn generate:tv-api\`.`
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

/** Every TV name the package's public entry point exports. */
function exportedTvNames(pkg: TvPackage): string[] {
  const entry = readPackageFile(pkg, TYPES_ENTRY);
  const names = new Set<string>();
  for (const match of entry.matchAll(
    /\b(TV[A-Za-z0-9_]*|useTV[A-Za-z0-9_]*)\b/g
  )) {
    names.add(match[1]!);
  }
  return [...names].sort();
}

/**
 * Fails when a TV member the package ships is documented nowhere.
 *
 * Reads the same published artifact the generator does, so the check needs no
 * repository checkout. It compares member names rather than type names: the
 * entry point re-exports types under names that differ from the declarations
 * they come from.
 */
function crossCheck(pkg: TvPackage, documented: Set<string>): void {
  const allowPath = path.join(REPO_ROOT, 'scripts', 'tv-api-allowlist.json');
  const allowed: string[] = fs.existsSync(allowPath)
    ? JSON.parse(fs.readFileSync(allowPath, 'utf8')).undocumented
    : [];

  const missing: string[] = [];
  for (const target of AUDIT) {
    let members: Member[];
    try {
      members = extractMembers(
        parse(target.file, readGeneratedType(pkg, target.file)),
        target.decl
      );
    } catch {
      console.warn(
        `${pkg.label}: no '${target.decl}' in ${target.file}; it may have been renamed.`
      );
      continue;
    }
    for (const member of members) {
      if (!documented.has(member.name) && !allowed.includes(member.name)) {
        missing.push(`${target.decl}.${member.name}`);
      }
    }
  }

  // A TV export the entry point advertises but no target covers.
  const covered = new Set(TARGETS.map(t => t.decl));
  const uncovered = exportedTvNames(pkg).filter(
    n => !covered.has(n) && !documented.has(n) && !allowed.includes(n)
  );

  if (missing.length > 0) {
    console.error(
      `${pkg.label}: these TV members ship in ${pkg.distTag} but appear in no ` +
        `generated partial:\n` +
        missing.map(m => `  - ${m}`).join('\n') +
        `\n\nAdd them to a target in TARGETS, or record the omission in ` +
        `scripts/tv-api-allowlist.json.`
    );
    process.exitCode = 1;
  }
  if (uncovered.length > 0) {
    console.warn(
      `${pkg.label}: exported TV names with no target: ${uncovered.join(', ')}`
    );
  }
}

/**
 * Declarations whose members must all be documented.
 *
 * These are the generated declarations themselves, read from the package, so
 * there is no rollup naming to compensate for.
 */
const AUDIT: {file: string; decl: string}[] = [
  {file: `${TV}/TVViewPropTypes.d.ts`, decl: 'TVViewProps'},
  {file: `${TV}/TVViewPropTypes.d.ts`, decl: 'TVParallaxPropertiesType'},
  {file: `${TV}/TVFocusGuideView.d.ts`, decl: 'TVFocusGuideViewProps'},
  {file: `${TV}/TVEventControl.d.ts`, decl: 'TVEventControl'},
  {file: CORE_EVENTS, decl: 'TVRemoteEvent'},
  {file: PRESSABLE, decl: 'TVProps'},
];

/** Generates one complete set of partials from one package. */
async function generateSet(
  pkg: TvPackage,
  outDir: string,
  check: boolean
): Promise<void> {
  const prettierOptions = await prettier.resolveConfig(
    path.join(outDir, 'x.md')
  );
  const sources = new Map<string, string>();
  const read = (file: string) => {
    if (!sources.has(file)) {
      sources.set(file, readGeneratedType(pkg, file));
    }
    return sources.get(file)!;
  };

  fs.mkdirSync(outDir, {recursive: true});
  const documented = new Set<string>();

  for (const target of TARGETS) {
    let members = extractMembers(
      parse(target.file, read(target.file)),
      target.decl,
      target.only,
      target.optional
    );
    if (target.descriptionsFrom) {
      const from = target.descriptionsFrom;
      const fallbacks = new Map(
        extractMembers(parse(from.file, read(from.file)), from.decl).map(m => [
          m.name,
          m,
        ])
      );
      members = members.map(member => {
        const fallback = fallbacks.get(member.name);
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
    const outPath = path.join(outDir, `${target.out}.md`);
    const existing = fs.existsSync(outPath)
      ? fs.readFileSync(outPath, 'utf8')
      : null;
    if (existing !== formatted) {
      if (check) {
        console.error(`Stale: ${path.relative(REPO_ROOT, outPath)}`);
        process.exitCode = 1;
      } else {
        fs.writeFileSync(outPath, formatted);
      }
    }
  }

  const manifest =
    JSON.stringify(
      {
        package: pkg.distTag,
        version: pkg.version,
        documents: pkg.label,
        outputs: TARGETS.map(t => t.out).sort(),
      },
      null,
      2
    ) + '\n';
  const manifestPath = path.join(outDir, 'manifest.json');
  const existingManifest = fs.existsSync(manifestPath)
    ? fs.readFileSync(manifestPath, 'utf8')
    : null;
  if (existingManifest !== manifest && !check) {
    fs.writeFileSync(manifestPath, manifest);
  }

  crossCheck(pkg, documented);
}

/** Every package this site documents, newest first. */
function plannedSets(
  config: ReturnType<typeof readSourceConfig>
): {distTag: string; label: string; outDir: string}[] {
  const sets = [{distTag: config.next, label: 'next', outDir: NEXT_OUT_DIR}];
  for (const [version, distTag] of Object.entries(config.versions)) {
    const outDir = versionedOutDir(version);
    if (fs.existsSync(path.dirname(outDir))) {
      sets.push({distTag, label: version, outDir});
    }
  }
  return sets;
}

/**
 * Verifies the committed partials against the packages, without regenerating.
 *
 * This is the CI gate. It reads only the published entry point and type
 * declarations, so it needs no repository checkout.
 */
function surfaceOnly(): void {
  const config = readSourceConfig();
  for (const set of plannedSets(config)) {
    const pkg = fetchPackage(config.package, set.distTag, set.label);
    crossCheck(pkg, documentedIn(set.outDir));
  }
  if (!process.exitCode) {
    console.log('Every TV member the packages ship appears in the docs.');
  }
}

async function main() {
  if (process.argv.includes('--surface')) {
    surfaceOnly();
    return;
  }
  const check = process.argv.includes('--check');
  const config = readSourceConfig();

  for (const set of plannedSets(config)) {
    const pkg = fetchPackage(config.package, set.distTag, set.label);
    await generateSet(pkg, set.outDir, check);
    console.log(
      `${check ? 'Checked' : 'Wrote'} ${TARGETS.length} partials for ` +
        `${set.label} from ${config.package}@${pkg.version}`
    );
  }
}

await main();
