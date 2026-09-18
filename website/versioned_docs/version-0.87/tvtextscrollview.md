---
id: tvtextscrollview
title: TVTextScrollView
---

import TVTextScrollViewProps from './_tv-generated/tv-text-scroll-view-props.md';

A scroll view that responds to swipe gestures on the TV remote.

On Apple TV a plain `ScrollView` only scrolls when it contains focusable items, because scrolling is a side effect of moving focus. That makes it unsuitable for long passages of text, which have nothing to focus. `TVTextScrollView` uses native code to scroll in response to remote swipes instead, and works the same way on Apple TV and Android TV.

Use it for text the user reads rather than navigates: terms of service, episode synopses, credits.

```tsx
import {Text, TVTextScrollView} from 'react-native';

const Terms = ({body}: {body: string}) => (
  <TVTextScrollView scrollDuration={0.3}>
    <Text>{body}</Text>
  </TVTextScrollView>
);
```

`snapToStart` and `snapToEnd` control what happens when focus moves past either end of the scroller; both default to `true`.

---

# Reference

## Props

Inherits [ScrollView Props](scrollview.md#props), except `onFocus` and `onBlur`, which this component defines itself.

<TVTextScrollViewProps />
