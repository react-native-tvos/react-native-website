/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type * as PluginContentDocs from '@docusaurus/plugin-content-docs';
import type * as Preset from '@docusaurus/preset-classic';
import type {Config} from '@docusaurus/types';
import path from 'path';

import users from './showcase.json';
import versions from './versions.json';
import prismThemeDark from './core/PrismThemeDark';
import prismThemeLight from './core/PrismThemeLight';

import remarkSnackPlayer from '@react-native-website/remark-snackplayer';
import remarkCodeblockLanguageTitle from '@react-native-website/remark-codeblock-language-as-title';

const isProductionDeployment =
  (!!process.env.NETLIFY && process.env.CONTEXT === 'production') ||
  (!!process.env.VERCEL && process.env.VERCEL_ENV === 'production');

const lastVersion = versions[0];
const copyright = `Copyright © react-native-tvos contributors.`;

/**
 * PLACEHOLDER: the deploy target for this site is not yet decided.
 * When it is, update this constant and `website/static/CNAME`.
 */
const SITE_URL = 'https://tv.example.com';

/** Upstream repository that this site documents. */
const TV_REPO_URL = 'https://github.com/react-native-tvos/react-native-tvos';

/** Repository holding this site's source, used for "Edit this page" links. */
const SITE_REPO_EDIT_URL =
  'https://github.com/react-native-tvos/react-native-website/edit/main';

const SITE_NAME = 'React Native for TV';
const SITE_DESCRIPTION =
  'A framework for building native apps for Apple TV and Android TV using React';

export type EditUrlButton = {
  label: string;
  href: string;
};

const commonDocsOptions: PluginContentDocs.Options = {
  admonitions: {keywords: ['important'], extendDefaults: true},
  breadcrumbs: false,
  showLastUpdateAuthor: false,
  showLastUpdateTime: true,
  editUrl: (options => {
    const baseUrl = SITE_REPO_EDIT_URL;
    const nextReleasePath = `docs/${options.docPath}`;
    const isNextRelease = options.version === 'current';
    const buttons: EditUrlButton[] = [
      {
        label: isNextRelease ? 'Edit this page' : 'Edit page for next release',
        href: `${baseUrl}/${nextReleasePath}`,
      },
    ];
    if (!isNextRelease) {
      const label =
        options.version === lastVersion
          ? 'Edit page for current release'
          : `Edit page for ${options.version} release`;
      const thisVersionPath = path.posix.join(
        'website',
        options.versionDocsDirPath,
        options.docPath
      );
      buttons.push({
        label,
        href: `${baseUrl}/${thisVersionPath}`,
      });
    }
    return JSON.stringify(buttons);
  }) as PluginContentDocs.EditUrlFunction,
  remarkPlugins: [remarkSnackPlayer, remarkCodeblockLanguageTitle],
};

const isDeployPreview =
  process.env.PREVIEW_DEPLOY === 'true' ||
  (!!process.env.VERCEL && process.env.VERCEL_ENV === 'preview');

const config: Config = {
  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],
  future: {
    // Turns Docusaurus v4 future flags on to make it easier to upgrade later
    v4: true,
    // Make Docusaurus build faster - enabled by default
    // See https://github.com/facebook/docusaurus/issues/10556
    // See https://github.com/facebook/react-native-website/pull/4268
    // See https://docusaurus.io/blog/releases/3.6
    faster: (process.env.DOCUSAURUS_FASTER ?? 'true') === 'true',
  },

  title: SITE_NAME,
  tagline: SITE_DESCRIPTION,
  organizationName: 'react-native-tvos',
  projectName: 'react-native-tvos',
  url: SITE_URL,
  baseUrl: '/',
  clientModules: [
    './modules/snackPlayerInitializer.ts',
    './modules/jumpToFragment.ts',
  ],
  trailingSlash: false, // because trailing slashes can break some existing relative links
  scripts: [
    {
      src: 'https://cdn.jsdelivr.net/npm/focus-visible@5.2.0/dist/focus-visible.min.js',
      defer: true,
    },
    {src: 'https://snack.expo.dev/embed.js', defer: true},
    {src: 'https://platform.twitter.com/widgets.js', async: true},
  ],
  favicon: 'favicon.ico',
  titleDelimiter: '·',
  customFields: {
    users,
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  onBrokenLinks: 'warn',
  headTags: [
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json',
      },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org/',
        '@type': 'WebPage',
        '@id': `${SITE_URL}/`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        logo: `${SITE_URL}/img/pwa/manifest-icon-192.png`,
        inLanguage: 'en-US',
      }),
    },
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json',
      },
      innerHTML: JSON.stringify({
        '@type': 'WebSite',
        '@id': `${SITE_URL}/`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: 'react-native-tvos contributors',
        potentialAction: [
          {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${SITE_URL}/search?q={query}`,
            },
            'query-input': {
              '@type': 'PropertyValueSpecification',
              valueRequired: true,
              valueName: 'query',
            },
          },
        ],
        inLanguage: 'en-US',
      }),
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'apple-touch-icon',
        href: '/img/pwa/apple-icon-180.png',
      },
    },
  ],
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          path: '../docs',
          sidebarPath: require.resolve('./sidebars'),
          editCurrentVersion: true,
          onlyIncludeVersions: isDeployPreview
            ? ['current', ...versions.slice(0, 2)]
            : undefined,
          versions: {
            [lastVersion]: {
              badge: false, // Do not show version badge for last RN version
            },
          },
          ...commonDocsOptions,
        },
        blog: {
          path: 'blog',
          blogSidebarCount: 'ALL',
          blogSidebarTitle: 'All Blog Posts',
          feedOptions: {
            type: 'all',
            copyright,
          },
          onInlineAuthors: 'ignore',
          // Ignore for now due to old posts
          onUntruncatedBlogPosts: 'ignore',
        },
        theme: {
          customCss: [
            require.resolve('./src/css/customTheme.scss'),
            require.resolve('./src/css/index.scss'),
            require.resolve('./src/css/showcase.scss'),
            require.resolve('./src/css/versions.scss'),
            require.resolve('./src/css/docs-secondary-nav.scss'),
            require.resolve('./src/css/releases.scss'),
          ],
        },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    'docusaurus-plugin-sass',
    function disableExpensiveBundlerOptimizationPlugin() {
      return {
        name: 'disable-expensive-bundler-optimizations',
        configureWebpack(_config, isServer) {
          // This optimization is expensive and only reduces by 3% the JS assets size
          // Let's skip it for local and deploy preview builds
          // See also https://github.com/facebook/docusaurus/discussions/11199
          return {
            optimization: {
              concatenateModules: isProductionDeployment ? !isServer : false,
            },
          };
        },
      };
    },
    [
      'content-docs',
      {
        id: 'architecture',
        path: 'architecture',
        routeBasePath: '/architecture',
        sidebarPath: require.resolve('./sidebarsArchitecture'),
        ...commonDocsOptions,
      } satisfies PluginContentDocs.Options,
    ],
    [
      'content-docs',
      {
        id: 'contributing',
        path: 'contributing',
        routeBasePath: '/contributing',
        sidebarPath: require.resolve('./sidebarsContributing'),
        ...commonDocsOptions,
      } satisfies PluginContentDocs.Options,
    ],
    [
      'content-docs',
      {
        id: 'community',
        path: 'community',
        routeBasePath: '/community',
        sidebarPath: require.resolve('./sidebarsCommunity'),
        ...commonDocsOptions,
      } satisfies PluginContentDocs.Options,
    ],
    [
      'content-docs',
      {
        id: 'releases',
        path: 'releases',
        routeBasePath: '/releases',
        sidebarPath: require.resolve('./sidebarsReleases'),
        ...commonDocsOptions,
      } satisfies PluginContentDocs.Options,
    ],
    [
      '@docusaurus/plugin-pwa',
      {
        debug: true,
        offlineModeActivationStrategies: ['appInstalled', 'queryString'],
        pwaHead: [
          {
            tagName: 'link',
            rel: 'icon',
            href: '/img/pwa/manifest-icon-512.png',
          },
          {
            tagName: 'link',
            rel: 'manifest',
            href: '/manifest.json',
          },
          {
            tagName: 'meta',
            name: 'theme-color',
            content: '#20232a',
          },
          {
            tagName: 'meta',
            name: 'mobile-web-app-capable',
            content: 'yes',
          },
          {
            tagName: 'meta',
            name: 'apple-mobile-web-app-status-bar-style',
            content: '#20232a',
          },
          {
            tagName: 'link',
            rel: 'apple-touch-icon',
            href: '/img/pwa/manifest-icon-512.png',
          },
          {
            tagName: 'link',
            rel: 'mask-icon',
            href: '/img/pwa/manifest-icon-512.png',
            color: '#06bcee',
          },
          {
            tagName: 'meta',
            name: 'msapplication-TileImage',
            href: '/img/pwa/manifest-icon-512.png',
          },
          {
            tagName: 'meta',
            name: 'msapplication-TileColor',
            content: '#20232a',
          },
        ],
      },
    ],
    [
      '@signalwire/docusaurus-plugin-llms-txt',
      {
        siteTitle: SITE_NAME,
        siteDescription: SITE_DESCRIPTION,
        depth: 3,
        includeOrder: [
          '/docs/getting-started',
          '/docs/environment-setup',
          '/docs/set-up-your-environment',
          '/docs/integration-with-existing-apps',
          '/docs/integration-with-android-fragment',
          '/docs/intro-react-native-components',
          '/docs/intro-react',
          '/docs/handling-text-input',
          '/docs/using-a-scrollview',
          '/docs/using-a-listview',
          '/docs/troubleshooting',
          '/docs/platform-specific-code',
          '/docs/building-for-tv',
          '/docs/out-of-tree-platforms',
          '/docs/more-resources',
          '/docs/**',
          '/architecture/**',
          '/community/**',
          '/contributing/**',
          '/versions',
          '/blog/**',
        ],
        content: {
          includeBlog: true,
          includePages: true,
          includeVersionedDocs: false,
          enableLlmsFullTxt: true,
          excludeRoutes: [
            '/blog/201*/**',
            '/blog/2020/**',
            '/blog/2021/**',
            '/blog/2022/**',
            '/blog/page/**',
            '/blog/tags/**',
            '/blog/archive',
            '/blog/authors',
            '/releases',
            '/search',
          ],
        },
      },
    ],
  ],
  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    prism: {
      defaultLanguage: 'tsx',
      theme: prismThemeLight,
      darkTheme: prismThemeDark,
      additionalLanguages: [
        'diff',
        'bash',
        'json',
        'java',
        'kotlin',
        'objectivec',
        'swift',
        'groovy',
        'ruby',
        'flow',
      ],
      magicComments: [
        {
          className: 'theme-code-block-highlighted-line',
          line: 'highlight-next-line',
          block: {start: 'highlight-start', end: 'highlight-end'},
        },
        {
          className: 'code-add-line',
          line: 'highlight-add-next-line',
          block: {start: 'highlight-add-start', end: 'highlight-add-end'},
        },
        {
          className: 'code-remove-line',
          line: 'highlight-remove-next-line',
          block: {
            start: 'highlight-remove-start',
            end: 'highlight-remove-end',
          },
        },
      ],
    },
    navbar: {
      title: SITE_NAME,
      logo: {
        src: 'img/header_logo.svg',
        alt: '',
      },
      style: 'dark',
      items: [
        {
          type: 'dropdown',
          label: 'Docs',
          position: 'right',
          items: [
            {label: 'Guides', to: '/docs/getting-started'},
            {label: 'Components', to: '/docs/components-and-apis'},
            {label: 'APIs', to: '/docs/accessibilityinfo'},
            {label: 'Architecture', to: '/architecture/overview'},
          ],
        },
        {
          to: '/releases/overview',
          label: 'Releases',
          position: 'right',
          activeBaseRegex: '^/(releases|versions)',
        },
        {
          type: 'doc',
          docId: 'overview',
          label: 'Contributing',
          position: 'right',
          docsPluginId: 'contributing',
        },
        {
          type: 'doc',
          docId: 'overview',
          label: 'Community',
          position: 'right',
          docsPluginId: 'community',
        },
        {
          to: '/blog',
          label: 'Blog',
          position: 'right',
        },
        {
          href: TV_REPO_URL,
          'aria-label': 'GitHub repository',
          position: 'right',
          className: 'navbar-github-link',
        },
      ],
    },
    image: 'img/logo-share.png',
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Develop',
          items: [
            {
              label: 'Guides',
              to: 'docs/getting-started',
            },
            {
              label: 'Components',
              to: 'docs/components-and-apis',
            },
            {
              label: 'APIs',
              to: 'docs/accessibilityinfo',
            },
            {
              label: 'Architecture',
              to: 'architecture/overview',
            },
          ],
        },
        {
          title: 'Participate',
          items: [
            {
              label: 'Contributing',
              to: 'contributing/overview',
            },
            {
              label: 'Community',
              to: 'community/overview',
            },
            {
              label: 'Code of Conduct',
              href: `${TV_REPO_URL}/blob/main/CODE_OF_CONDUCT.md`,
            },
          ],
        },
        {
          title: 'Find us',
          items: [
            {
              label: 'Blog',
              to: 'blog',
            },
            {
              label: 'GitHub',
              href: TV_REPO_URL,
            },
            {
              label: 'Issues',
              href: `${TV_REPO_URL}/issues`,
            },
          ],
        },
        {
          title: 'Explore More',
          items: [
            {
              label: 'React',
              href: 'https://react.dev/',
            },
            {
              label: 'React Native',
              href: 'https://reactnative.dev/',
            },
            {
              label: 'Packages Directory',
              href: 'https://reactnative.directory/',
            },
          ],
        },
      ],
      copyright,
    },
    // TODO: search is disabled until a DocSearch index exists for this site.
    // The previous config pointed at Meta's 'react-native-v2' index, which
    // returns reactnative.dev results.
    metadata: [
      {
        property: 'og:image',
        content: `${SITE_URL}/img/logo-share.png`,
      },
      {name: 'twitter:card', content: 'summary_large_image'},
      {
        name: 'twitter:image',
        content: `${SITE_URL}/img/logo-share.png`,
      },
      {name: 'mobile-web-app-capable', content: 'yes'},
    ],
    mermaid: {
      theme: {
        light: 'neutral',
        dark: 'dark',
      },
      options: {
        fontFamily:
          '"Optimistic Display", system-ui, -apple-system, sans-serif',
      },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
