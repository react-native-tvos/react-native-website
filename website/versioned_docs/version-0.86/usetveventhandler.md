---
id: usetveventhandler
title: useTVEventHandler
---

A hook that subscribes to TV remote control events for the life of the component.

It wraps [`TVEventHandler`](tveventhandler.md) and handles the subscription, so there is no listener to remove by hand. Prefer it in function components.

```tsx
import {useState} from 'react';
import {Text, useTVEventHandler, View} from 'react-native';

const RemoteLog = () => {
  const [lastEvent, setLastEvent] = useState('');

  useTVEventHandler(event => {
    setLastEvent(event.eventType);
  });

  return (
    <View>
      <Text>{lastEvent}</Text>
    </View>
  );
};
```

The callback receives the same event object as `TVEventHandler`, described in [Event types](tveventhandler.md#event-types).

:::note

The hook fires for every remote event the app receives, not only those aimed at the focused view. Check `eventType` before acting, and remember that on Android TV each button press arrives twice, once per `eventKeyAction`.

:::

---

# Reference

## Definition

```tsx
useTVEventHandler(handleEvent: (event: TVRemoteEvent) => void): void;
```
