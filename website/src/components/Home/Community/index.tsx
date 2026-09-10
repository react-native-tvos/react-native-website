/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import PartnersShowcase from './PartnersShowcase';
import Section from '../Section';
import SectionTitle from '../SectionTitle';

import styles from './styles.module.css';

function Community() {
  return (
    <Section>
      <SectionTitle
        title="Community driven."
        description={
          <>
            React Native for TV tracks upstream React Native closely,
            <br />
            adding focus navigation and remote input for Apple TV and Android
            TV.
          </>
        }
      />
      <div className={styles.communityNote}>
        <p>
          React Native for TV is maintained by the community as a fork of React
          Native.
          <br />
          React Native itself is supported by contributions from individuals and
          companies around the world including:
        </p>
        <PartnersShowcase />
        <p>
          Additionally, our community is always shipping exciting new projects
          and expanding beyond Android and iOS with initiatives like{' '}
          <a
            href="https://reactnative.dev/"
            target="_blank"
            rel="noopener noreferrer">
            React Native
          </a>{' '}
          for Android and iOS,{' '}
          <a
            href="https://microsoft.github.io/react-native-windows/"
            target="_blank"
            rel="noopener noreferrer">
            React Native Windows
          </a>
          ,{' '}
          <a
            href="https://microsoft.github.io/react-native-macos/"
            target="_blank"
            rel="noopener noreferrer">
            React Native macOS
          </a>{' '}
          and{' '}
          <a
            href="https://necolas.github.io/react-native-web/"
            target="_blank"
            rel="noopener noreferrer">
            React Native Web
          </a>
        </p>
      </div>
      <a
        href="https://github.com/react-native-tvos/react-native-tvos/blob/main/ECOSYSTEM.md"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.secondaryButton}>
        Learn more about the Ecosystem
      </a>
    </Section>
  );
}

export default Community;
