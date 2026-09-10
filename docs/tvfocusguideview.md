---
id: tvfocusguideview
title: TVFocusGuideView
---

import TVFocusGuideViewProps from './_tv-generated/tv-focus-guide-view-props.md';
import TVFocusGuideViewMethods from './_tv-generated/tv-focus-guide-view-methods.md';

`TVFocusGuideView` helps the focus engine reach controls it would otherwise skip. It wraps Apple's [`UIFocusGuide`](https://developer.apple.com/documentation/uikit/uifocusguide) on Apple TV, and the same behavior is implemented natively on Android TV.

The focus engine moves focus geometrically: pressing right looks for something to the right of the focused view. A control that is not aligned with anything in that direction becomes unreachable. `TVFocusGuideView` solves this by redirecting focus into a set of destinations, or by managing focus for its own children.

## Redirecting focus to destinations

Register the views focus should land on when it enters the guide:

```tsx
import {useRef} from 'react';
import {
  Pressable,
  Text,
  TVFocusGuideView,
  View,
} from 'react-native';

const Row = () => {
  const target = useRef(null);

  return (
    <View>
      <TVFocusGuideView destinations={[target.current]}>
        <Text>Focus entering here is redirected below</Text>
      </TVFocusGuideView>
      <Pressable ref={target}>
        <Text>Reachable</Text>
      </Pressable>
    </View>
  );
};
```

## Managing focus automatically

With `autoFocus`, the guide sends focus to its first focusable child the first time it is entered, then restores the last focused child on later visits. This is the common case for a row or column of controls:

```tsx
<TVFocusGuideView autoFocus>
  <Pressable onPress={onFirst}>
    <Text>First</Text>
  </Pressable>
  <Pressable onPress={onSecond}>
    <Text>Second</Text>
  </Pressable>
</TVFocusGuideView>
```

`destinations` takes precedence over `autoFocus` when both are set.

## Trapping focus

The `trapFocus*` props stop focus leaving the guide in a given direction. Use them for modals and menus, where focus escaping to the content behind would be wrong:

```tsx
<TVFocusGuideView autoFocus trapFocusLeft trapFocusRight>
  <Pressable onPress={onConfirm}>
    <Text>Confirm</Text>
  </Pressable>
  <Pressable onPress={onCancel}>
    <Text>Cancel</Text>
  </Pressable>
</TVFocusGuideView>
```

:::note

`FlatList` and other `VirtualizedList`-based components already wrap their contents in a `TVFocusGuideView` with the appropriate `trapFocus*` props. This keeps focus inside the list while rows are still virtualized, rather than letting it escape into whatever happens to be rendered. You do not need to add your own guide around a list.

:::

---

# Reference

## Props

Inherits [View Props](view.md#props).

<TVFocusGuideViewProps />

## Methods

Available on a ref to the component.

<TVFocusGuideViewMethods />
