/**
 * Reads source data out of a local react-native-tvos checkout.
 *
 * Two access modes, deliberately different:
 *
 * - `readGeneratedType` reads the working tree, because `types_generated/` is
 *   gitignored in react-native-tvos and so exists in no git ref. It is produced
 *   by `yarn build-types` there.
 * - `readAtRef` reads through `git show`, so a dirty, detached or wrong-branch
 *   checkout cannot silently change what this site documents.
 */

import assert from 'node:assert';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');

const SOURCE_CONFIG_PATH = path.join(REPO_ROOT, 'tv-source.json');

/** Relative path, inside the checkout, of the generated TypeScript types. */
export const TYPES_GENERATED_DIR = 'packages/react-native/types_generated';

/** Relative path, inside the checkout, of the committed public API snapshot. */
export const API_SNAPSHOT_PATH = 'packages/react-native/ReactNativeApi.d.ts';

/** A file whose presence proves a ref belongs to the TV fork's branch family. */
const TV_MARKER_PATH =
  'packages/react-native/Libraries/Components/TV/TVFocusGuideView.js';

export type TvSourceConfig = {
  repo: string;
  apiRef: string;
  localPath?: string;
  versions: string[];
};

export function readSourceConfig(): TvSourceConfig {
  assert(
    fs.existsSync(SOURCE_CONFIG_PATH),
    `Missing ${SOURCE_CONFIG_PATH}. It pins which react-native-tvos ref this site documents.`
  );
  return JSON.parse(fs.readFileSync(SOURCE_CONFIG_PATH, 'utf8'));
}

function candidateCheckouts(config: TvSourceConfig): string[] {
  const fromArgv = process.argv
    .find(arg => arg.startsWith('--repo='))
    ?.slice('--repo='.length);
  return [
    fromArgv,
    process.env.RNTV_REPO,
    config.localPath,
    path.resolve(REPO_ROOT, '../react-native-tvos'),
  ].filter((p): p is string => Boolean(p));
}

/** Absolute path of the react-native-tvos checkout, or a fatal error. */
export function resolveCheckout(config = readSourceConfig()): string {
  const candidates = candidateCheckouts(config);
  for (const candidate of candidates) {
    const resolved = path.resolve(REPO_ROOT, candidate);
    if (fs.existsSync(path.join(resolved, '.git'))) {
      return resolved;
    }
  }
  throw new Error(
    `Could not find a react-native-tvos checkout. Looked in:\n` +
      candidates.map(c => `  - ${path.resolve(REPO_ROOT, c)}`).join('\n') +
      `\n\nClone ${config.repo}, then set RNTV_REPO or pass --repo=<path>.`
  );
}

function git(repo: string, args: string[]): string {
  return execFileSync('git', ['-C', repo, ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    // Callers turn failures into actionable errors of their own; git's own
    // stderr would otherwise print alongside and bury them.
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

/** Fails unless `ref` resolves to a commit in the checkout's object store. */
export function assertRefPresent(repo: string, ref: string): void {
  try {
    git(repo, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  } catch {
    throw new Error(
      `Ref '${ref}' is not in ${repo}.\n` +
        `A sibling checkout is easily many days stale. Fetch it:\n` +
        `  git -C ${repo} fetch origin --tags`
    );
  }
}

/**
 * Fails unless `ref` carries TV source.
 *
 * react-native-tvos has two branch families. `tvos-v<version>.0` holds the TV
 * fork; `branch-v<version>.0` mirrors upstream core React Native and contains
 * no TV code at all, so reading it yields empty output rather than an error.
 */
export function assertIsTvBranch(repo: string, ref: string): void {
  assertRefPresent(repo, ref);
  try {
    git(repo, ['cat-file', '-e', `${ref}:${TV_MARKER_PATH}`]);
  } catch {
    throw new Error(
      `Ref '${ref}' has no TV source (${TV_MARKER_PATH} is missing).\n` +
        `The TV fork's release branches are named 'tvos-v<version>.0'. The ` +
        `'branch-v<version>.0' family mirrors upstream core React Native and ` +
        `must not be used here.`
    );
  }
}

/** Contents of `filePath` as committed at `ref`. */
export function readAtRef(repo: string, ref: string, filePath: string): string {
  try {
    return git(repo, ['show', `${ref}:${filePath}`]);
  } catch {
    throw new Error(`Cannot read '${filePath}' at ref '${ref}' in ${repo}.`);
  }
}

/** Whether `filePath` exists at `ref`. */
export function existsAtRef(
  repo: string,
  ref: string,
  filePath: string
): boolean {
  try {
    git(repo, ['cat-file', '-e', `${ref}:${filePath}`]);
    return true;
  } catch {
    return false;
  }
}

/** Short commit sha that `ref` currently points at. */
export function resolveCommit(repo: string, ref: string): string {
  return git(repo, ['rev-parse', ref]).trim();
}

export type GeneratedType = {
  /** Path relative to `TYPES_GENERATED_DIR`. */
  relPath: string;
  text: string;
  /** The `@generated SignedSource` hash, used to detect stale output. */
  signedSource: string;
};

/**
 * Reads one file from the checkout's generated types.
 *
 * These are build output, so this reads the working tree. It insists on the
 * `@generated SignedSource` header, which catches both a missing build and a
 * hand-edited file.
 */
export function readGeneratedType(
  repo: string,
  relPath: string
): GeneratedType {
  const absPath = path.join(repo, TYPES_GENERATED_DIR, relPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(
      `Missing generated type '${relPath}'.\n` +
        `Expected it at ${absPath}.\n\n` +
        `types_generated/ is gitignored in react-native-tvos, so it must be ` +
        `built. In that checkout run:\n` +
        `  yarn\n` +
        `  patch -p1 < tools/rntv-workflows/microsoft-api-extractor.patch\n` +
        `  yarn --cwd packages/react-native-codegen build\n` +
        `  yarn build-types --skip-snapshot\n` +
        `  patch -p1 -R < tools/rntv-workflows/microsoft-api-extractor.patch`
    );
  }
  const text = fs.readFileSync(absPath, 'utf8');
  const signedSource = /@generated SignedSource<<([0-9a-f]+)>>/.exec(text)?.[1];
  assert(
    signedSource,
    `'${relPath}' has no @generated SignedSource header, so it is not ` +
      `build output. Refusing to document a hand-edited file.`
  );
  return {relPath, text, signedSource};
}
