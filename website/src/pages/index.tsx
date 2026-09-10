/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';

import Head from '@docusaurus/Head';
import Layout from '@theme/Layout';

import Home from '../components/Home';

const Index = () => {
  return (
    <Layout
      description="A framework for building native apps for Apple TV and Android TV using React"
      wrapperClassName="homepage">
      <Head>
        <title>React Native for TV</title>
        <meta property="og:title" content="React Native for TV" />
        <meta property="twitter:title" content="React Native for TV" />
      </Head>
      <Home />
    </Layout>
  );
};

export default Index;
