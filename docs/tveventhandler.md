---
id: tveventhandler
title: TVEventHandler
---

import TVEventHandlerMethods from './_tv-generated/tv-event-handler-methods.md';
import TVRemoteEvent from './_tv-generated/tv-remote-event.md';
import TVRemoteEventBody from './_tv-generated/tv-remote-event-body.md';

Listens for TV remote control events that are not already delivered as focus or press events.

Most TV interfaces need no event handler at all: directional navigation moves focus between `Pressable` and `Touchable` components on its own, and selecting a control fires its `onPress`. Reach for `TVEventHandler` when the app must respond to a button that is not tied to the focused control — a media transport key, the menu button, or directional input in a game.

For function components, prefer [`useTVEventHandler`](usetveventhandler.md).

```tsx
import {useEffect, useState} from 'react';
import {Text, TVEventHandler, View} from 'react-native';

const RemoteLog = () => {
  const [lastEvent, setLastEvent] = useState('');

  useEffect(() => {
    const subscription = TVEventHandler.addListener(event => {
      setLastEvent(event.eventType);
    });
    return () => subscription.remove();
  }, []);

  return (
    <View>
      <Text>{lastEvent}</Text>
    </View>
  );
};
```

Always keep the returned subscription and call `remove()` when the component unmounts. Listeners are global, so a leaked one keeps firing after the screen is gone.

## Event types

`eventType` identifies the button or gesture. The two platforms emit different sets, so branch on `Platform.OS` when handling anything outside the shared core.

**Both platforms**: `up`, `down`, `left`, `right`, `select`, `playPause`, `menu`.

**Apple TV only**: `longUp`, `longDown`, `longLeft`, `longRight`, `longSelect`, `longPlayPause`, `pageUp`, `pageDown`, `swipeUp`, `swipeDown`, `swipeLeft`, `swipeRight`, `pan`.

**Android TV only**: `play`, `pause`, `stop`, `rewind`, `fastForward`, `next`, `previous`, `channelUp`, `channelDown`, `info`.

The `swipe*` and `pan` events require [`TVEventControl.enableTVPanGesture()`](tveventcontrol.md).

On Android TV, `eventKeyAction` distinguishes a key going down from a key coming up, mirroring `KeyEvent.ACTION_DOWN` and `KeyEvent.ACTION_UP`. A single button press therefore produces two events. Apple TV does not set this field.

---

# Reference

## Methods

<TVEventHandlerMethods />

## Event object

<TVRemoteEvent />

### `body`

Populated for pan gestures on Apple TV.

<TVRemoteEventBody />
