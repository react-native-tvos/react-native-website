import {useActiveVersion} from '@docusaurus/plugin-content-docs/client';

/**
 * Branch name in react-native-tvos matching the docs version being viewed.
 *
 * The TV fork's release branches are named `tvos-v<major>.<minor>.0`. Note the
 * sibling `branch-v<major>.<minor>.0` family mirrors upstream core React Native
 * and contains no TV code, so it must not be used here.
 */
export function getTvBranchNameForCurrentVersion() {
  const version = useActiveVersion(undefined);
  return version.label === 'Next' ? 'main' : `tvos-v${version.label}.0`;
}
