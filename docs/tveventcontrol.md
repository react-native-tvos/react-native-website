---
id: tveventcontrol
title: TVEventControl
---

import TVEventControlMethods from './_tv-generated/tv-event-control-methods.md';

Enables and disables gesture recognizers on the Apple TV Siri remote.

These are Apple TV concerns. The methods exist on Android TV so that shared code need not branch, but they do nothing there.

## Menu key

Apple's guidelines expect the menu button to move back through the app and, at the top level, return to the Apple TV home screen. An app that always intercepts the menu key leaves the user with no way out.

Enable the recognizer on screens that have somewhere to go back to, and disable it at the root:

```tsx
import {useEffect} from 'react';
import {TVEventControl} from 'react-native';

const DetailScreen = () => {
  useEffect(() => {
    TVEventControl.enableTVMenuKey();
    return () => TVEventControl.disableTVMenuKey();
  }, []);

  // ...
};
```

With the recognizer enabled, menu presses arrive through [`TVEventHandler`](tveventhandler.md) as `menu` events, and `BackHandler` also responds to them.

## Pan gesture

Panning reports a finger moving across the Siri remote touch surface. It is off by default because it produces a high volume of events:

```tsx
TVEventControl.enableTVPanGesture();
TVEventControl.disableTVPanGesture();
```

While enabled, `TVEventHandler` delivers `pan` events whose `body` carries the touch position and velocity.

## Gesture handler touch cancellation

Controls whether the remote's gesture recognizers cancel touches already in progress:

```tsx
TVEventControl.enableGestureHandlersCancelTouches();
TVEventControl.disableGestureHandlersCancelTouches();
```

Cancelling is the default. Disabling it lets a library such as `react-native-gesture-handler` see a gesture through to completion.

---

# Reference

## Methods

<TVEventControlMethods />
