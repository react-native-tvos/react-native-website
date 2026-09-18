---
id: building-for-tv
title: Building for TV Devices
---

import PlatformSupport from '@theme/PlatformSupport';

<PlatformSupport platforms={['tv']} />

Apple TV and Android TV support lives in [`react-native-tvos`](https://github.com/react-native-tvos/react-native-tvos), a full fork of React Native carrying only the changes TV needs. It is published to npm as `react-native-tvos`, and this site documents it.

The goal is that an existing React Native application runs on TV with few or no changes to its JavaScript. What does change is how the user reaches things: a TV has no touch screen, so every interaction goes through a directional remote and a focus engine.

## Using the package

Alias `react-native` to `react-native-tvos` in `package.json`:

```json title="package.json"
{
  "dependencies": {
    "react-native": "npm:react-native-tvos@latest"
  }
}
```

A project cannot depend on `react-native` and `react-native-tvos` at the same time.

Releases follow a `0.xx.x-y` format, where `0.xx.x` is the core React Native release the fork is based on and `y` counts the fork's own releases on top of it. So `0.87.1-0` derives from core React Native `0.87.1`. Note that this suffix means _newer_, which is the opposite of how semantic versioning reads a prerelease tag; do not sort these versions with a semver library.

Each supported release train also has an npm dist-tag, such as `0.87-stable`.

## Starting a project

### With Expo

Expo's [continuous native generation](https://docs.expo.dev/workflow/continuous-native-generation/) builds mobile and TV apps from one codebase, and is the recommended path for new projects:

```sh
npx create-expo TVProject -e with-router-tv
```

See Expo's [Building for TV](https://docs.expo.dev/guides/building-for-tv/) guide for supported modules and current limitations.

### With the Community CLI

[`template-tv`](https://github.com/react-native-tvos/template-tv) extends the Community CLI with `run-tvos`, `build-tvos`, and `log-tvos`:

```sh
npx @react-native-community/cli@latest init TVTest --template @react-native-tvos/template-tv
cd TVTest

npx react-native run-tvos --simulator "Apple TV"
npx react-native run-android --device tv_api_31
```

This template targets Apple TV and Android TV only. A Podfile can no longer declare multiple platform targets, so one project builds for one of them.

:::warning

Do not install `react-native` or `react-native-tvos` globally. Doing so produces build errors such as `ld: library not found for -lPods-TestApp-tvOS`.

:::

## Designing for the focus engine

Focus is the whole interaction model. The engine moves focus geometrically — pressing right looks for something to the right of the focused view — which has consequences worth designing around:

- Every interactive control must be focusable. `Pressable`, `TouchableHighlight`, and `TouchableOpacity` receive focus and fire `onFocus` and `onBlur`. `TouchableNativeFeedback` and `TouchableWithoutFeedback` respond to presses but never receive focus, so avoid them on TV.
- A control that is not geometrically aligned with anything in a given direction cannot be reached from that direction. [`TVFocusGuideView`](tvfocusguideview.md) redirects focus into such controls, or manages focus for a group of them.
- Focus must be visible. A TV is viewed from across a room, so the focused control needs an unmistakable treatment — scale, border, or elevation, not a subtle tint.
- Text that is read rather than navigated will not scroll, because scrolling follows focus. Use [`TVTextScrollView`](tvtextscrollview.md) for long passages.

For remote buttons that are not tied to the focused control, such as media transport keys, subscribe with [`useTVEventHandler`](usetveventhandler.md).

## Detecting TV at runtime

`Platform.isTV` is true on both Apple TV and Android TV:

```tsx
import {Platform} from 'react-native';

if (Platform.isTV) {
  // TV-specific behavior
}
```

To single out Apple TV, combine it with `Platform.OS`:

```tsx
const isAppleTV = Platform.OS === 'ios' && Platform.isTV;
```

## TV-specific source files

Metro can resolve TV-specific files by extension, so a component can have a separate TV implementation without branching at runtime. Enabled, the resolution order for `.tsx` is:

1. `file.ios.tv.tsx` or `file.android.tv.tsx`
2. `file.tv.tsx`
3. `file.ios.tsx` or `file.android.tsx`
4. `file.tsx`

The same applies to the other source extensions. This is off by default because it slows bundling; the [template's Metro config](https://github.com/react-native-tvos/template-tv) shows how to turn it on.

## Platform requirements

Minimum operating system versions and the Android SDK levels for each release are listed under [Branches](/releases/branches).

Android artifacts are published to the Maven group `io.github.react-native-tvos` rather than `com.facebook.react`. The Gradle plugin resolves this automatically.

## Engine and architecture

Hermes is enabled by default and fully supported on both platforms. The New Architecture is implemented identically to core React Native, and can be turned off the same way:

- **Expo**: see [disabling the New Architecture](https://docs.expo.dev/guides/new-architecture/#disable-the-new-architecture-in-an-existing-project).
- **Apple TV**: `RCT_NEW_ARCH_ENABLED=0 bundle exec pod install`
- **Android TV**: set `newArchEnabled=false` in `android/gradle.properties`, then rebuild clean.

## Opening the dev menu

- **Apple TV simulator**: `Cmd+D`
- **Apple TV device**: long press play/pause on the remote
- **Android TV**: as on an Android phone
