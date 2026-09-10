import A from '@theme/MDXComponents/A';
import type {ComponentProps} from 'react';
import {getTvBranchNameForCurrentVersion} from '../src/getTvBranchNameForCurrentVersion';

type Props = ComponentProps<'a'>;

export default function RNRepoLink({href, children, ...rest}: Props) {
  return (
    <A
      href={`https://github.com/react-native-tvos/react-native-tvos/blob/${getTvBranchNameForCurrentVersion()}/${href.startsWith('/') ? href.slice(1) : href}`}
      {...rest}>
      {children}
    </A>
  );
}
