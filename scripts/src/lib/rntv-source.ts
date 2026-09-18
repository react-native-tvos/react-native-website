/**
 * Reads react-native-tvos type definitions from the published npm packages.
 *
 * The package ships `types_generated/`, the Strict TypeScript API that
 * consumers actually receive — its `exports` map points the `types` condition
 * there. Reading the published artifact rather than a local checkout means the
 * docs describe exactly what a given release installs, needs no `build-types`
 * run, and reproduces in CI from the registry alone.
 *
 * Packages are unpacked into a gitignored cache keyed by resolved version, so
 * repeat runs and multiple versions cost one download each.
 */

import assert from 'node:assert';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');

const SOURCE_CONFIG_PATH = path.join(REPO_ROOT, 'tv-source.json');

/** Unpacked packages live here; see .gitignore. */
const CACHE_DIR = path.join(REPO_ROOT, 'node_modules', '.cache', 'rntv');

/** Where the generated types sit inside the package. */
export const TYPES_DIR = 'types_generated';

/** The package's public API entry point, per its `exports` map. */
export const TYPES_ENTRY = `${TYPES_DIR}/index.d.ts`;

/** A file whose presence proves the package carries the generated types. */
const TYPES_MARKER = `${TYPES_DIR}/Libraries/Components/TV/TVFocusGuideView.d.ts`;

export type TvSourceConfig = {
  package: string;
  /** Dist-tag used for the current, unreleased docs. */
  next: string;
  /** Docs version to dist-tag, e.g. `{"0.87": "0.87-stable"}`. */
  versions: Record<string, string>;
};

export function readSourceConfig(): TvSourceConfig {
  assert(
    fs.existsSync(SOURCE_CONFIG_PATH),
    `Missing ${SOURCE_CONFIG_PATH}. It pins which react-native-tvos releases this site documents.`
  );
  return JSON.parse(fs.readFileSync(SOURCE_CONFIG_PATH, 'utf8'));
}

function npm(args: string[], cwd = REPO_ROOT): string {
  return execFileSync('npm', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

/** Concrete version a dist-tag currently points at. */
export function resolveVersion(pkg: string, distTag: string): string {
  let version: string;
  try {
    version = npm(['view', `${pkg}@${distTag}`, 'version']).trim();
  } catch {
    throw new Error(
      `npm has no '${distTag}' tag for ${pkg}.\n` +
        `Check the published tags with: npm view ${pkg} dist-tags`
    );
  }
  assert(
    version,
    `npm returned no version for ${pkg}@${distTag}. The tag may have been removed.`
  );
  return version;
}

export type TvPackage = {
  /** Docs version this package documents, or 'next'. */
  label: string;
  distTag: string;
  version: string;
  /** Absolute path of the unpacked package root. */
  root: string;
};

/**
 * Downloads and unpacks one release, or reuses the cached copy.
 *
 * Keyed by resolved version rather than dist-tag, so a tag moving to a new
 * release fetches afresh instead of serving the previous one.
 */
export function fetchPackage(
  pkg: string,
  distTag: string,
  label: string
): TvPackage {
  const version = resolveVersion(pkg, distTag);
  const root = path.join(CACHE_DIR, `${pkg}@${version}`, 'package');

  if (!fs.existsSync(path.join(root, TYPES_MARKER))) {
    fs.rmSync(path.dirname(root), {recursive: true, force: true});
    fs.mkdirSync(path.dirname(root), {recursive: true});

    const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'rntv-pack-'));
    try {
      const packed = JSON.parse(
        npm([
          'pack',
          `${pkg}@${version}`,
          '--json',
          '--pack-destination',
          staging,
        ])
      );
      const tarball = path.join(staging, packed[0].filename);
      execFileSync('tar', ['-xzf', tarball, '-C', path.dirname(root)], {
        stdio: ['ignore', 'ignore', 'ignore'],
      });
    } finally {
      fs.rmSync(staging, {recursive: true, force: true});
    }
  }

  assert(
    fs.existsSync(path.join(root, TYPES_MARKER)),
    `${pkg}@${version} does not contain ${TYPES_MARKER}.\n` +
      `Releases before the packaging fix omitted types_generated; pick a newer release.`
  );
  return {label, distTag, version, root};
}

/** Reads one file from an unpacked package. */
export function readPackageFile(pkg: TvPackage, relPath: string): string {
  const absPath = path.join(pkg.root, relPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(
      `${pkg.label}: ${relPath} is not in ${pkg.distTag} (${pkg.version}).\n` +
        `The package layout may have changed between releases.`
    );
  }
  return fs.readFileSync(absPath, 'utf8');
}

/** Reads one generated type file, relative to `types_generated/`. */
export function readGeneratedType(pkg: TvPackage, relPath: string): string {
  return readPackageFile(pkg, path.join(TYPES_DIR, relPath));
}
