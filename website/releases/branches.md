---
title: Branches
sidebar_label: Branches
---

import TvBranchesTable from './_tv-branches-table.md';

Each React Native for TV release tracks an upstream React Native core release and pins its own platform requirements.

The table below is generated from the tip of each `tvos-v<version>.0` branch in [`react-native-tvos`](https://github.com/react-native-tvos/react-native-tvos), and from the `<version>-stable` dist-tags published to npm. Run `yarn generate:tv-releases` to refresh it.

## Platform Versions

<div className="table-scroll">

<TvBranchesTable />

</div>

## Branch families

`react-native-tvos` keeps two families of release branch, and only one carries TV code:

- **`tvos-v<version>.0`** is the TV fork. This is what the releases above are built from.
- **`branch-v<version>.0`** mirrors upstream core React Native and contains no TV sources at all.

The distinction matters when reading source: a link into `branch-v<version>.0` shows upstream code, not the TV fork's.

## Core React Native

Hermes, Yoga, and the React Native DevTools frontend are pinned by the upstream core release rather than by this fork. The Core RN column links to the matching version on [reactnative.dev](https://reactnative.dev/versions), which documents those versions.
