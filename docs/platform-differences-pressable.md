---
id: platform-differences-pressable
title: Pressable
---

`Pressable` is where the out-of-tree platforms diverge most, because each added the input model its hardware needed: focus and a directional remote for TV, keyboard and pointer for desktop, hover and tab order for the web. Those additions were made independently, so the same concept is sometimes spelled differently, and sometimes typed differently.

This page compares the prop surfaces so that a unified API can be designed from what actually ships rather than from memory.

## What is compared

| Platform | Package              | Version | Source                                 |
| -------- | -------------------- | ------- | -------------------------------------- |
| Mobile   | `react-native`       | 0.87    | `branch-v0.87.0`                       |
| TV       | `react-native-tvos`  | 0.87    | `tvos-v0.87.0`                         |
| Desktop  | `react-native-macos` | 0.81    | `main`                                 |
| Web      | `react-native-web`   | 0.21.2  | `update-normalize-colors` (TypeScript) |

The three native platforms are read from their Flow sources. `react-native-web` is read from the TypeScript branch that replaces Flow, so its types are written differently — `Nullable<T>` rather than Flow's `?T` — but the shapes are comparable.

`react-native-macos` tracks core 0.81, so core 0.81 is included below wherever a difference could otherwise be mistaken for a platform decision.

:::note

Core `Pressable` declares exactly the same event handlers at 0.81 and 0.87, so every handler difference below is a platform addition rather than version drift. The one place version does matter is return types, called out under [Type mismatches](#type-mismatches).

:::

## Event handlers on Pressable

| Handler          | Mobile | TV  | Desktop | Web | Notes                                                                    |
| ---------------- | ------ | --- | ------- | --- | ------------------------------------------------------------------------ |
| `onPress`        | ✅     | ✅  | ✅      | ✅  |                                                                          |
| `onPressIn`      | ✅     | ✅  | ✅      | ✅  | TV: remote select down. Web maps to `onPressStart`                       |
| `onPressOut`     | ✅     | ✅  | ✅      | ✅  | TV: remote select release. Web maps to `onPressEnd`                      |
| `onLongPress`    | ✅     | ✅  | ✅      | ✅  |                                                                          |
| `onPressMove`    | ✅     | ✅  | ✅      | ✅  |                                                                          |
| `onHoverIn`      | ✅     | ✅  | ✅      | ✅  |                                                                          |
| `onHoverOut`     | ✅     | ✅  | ✅      | ✅  |                                                                          |
| `onLayout`       | ✅     | ✅  | ✅      | ✅  |                                                                          |
| `onFocus`        | ✅     | ✅  | ✅      | ✅  | Inherited from `View` on mobile and web; redeclared by both native forks |
| `onBlur`         | ✅     | ✅  | ✅      | ✅  | Inherited from `View` on mobile and web; redeclared by both native forks |
| `onKeyDown`      | ✅     | ✅  | ✅      | ✅  | On `View` everywhere; desktop also redeclares it                         |
| `onKeyUp`        | ✅     | ✅  | ✅      | ✅  | On `View` everywhere; desktop also redeclares it                         |
| `onFocusCapture` | ✅     | ✅  | ✅      | —   | Web has no capture props at all                                          |
| `onBlurCapture`  | ✅     | ✅  | ✅      | —   | Web has no capture props at all                                          |
| `onContextMenu`  | —      | —   | —       | ✅  | Web only                                                                 |
| `onMouseEnter`   | —      | —   | —       | ✅  | See [the note below](#on-onmouseenter-and-onmouseleave)                  |
| `onMouseLeave`   | —      | —   | —       | ✅  | See [the note below](#on-onmouseenter-and-onmouseleave)                  |
| `onDragEnter`    | —      | —   | ✅      | —   | Desktop only                                                             |
| `onDragLeave`    | —      | —   | ✅      | —   | Desktop only                                                             |
| `onDrop`         | —      | —   | ✅      | —   | Desktop only                                                             |

A ✅ means the prop is accepted, whether declared on `Pressable` itself or inherited through `ViewProps`. That distinction carries most of the interest here. Only eight handlers are declared on `Pressable` by every platform — the press and hover set. Everything else arrives from `View`, and the forks differ mainly in whether they _redeclare_ what they already inherit.

## Other props on Pressable

| Prop                                  | Mobile | TV  | Desktop | Web | Purpose                                                                     |
| ------------------------------------- | ------ | --- | ------- | --- | --------------------------------------------------------------------------- |
| `disabled`                            | ✅     | ✅  | ✅      | ✅  |                                                                             |
| `delayLongPress`                      | ✅     | ✅  | ✅      | ✅  |                                                                             |
| `delayPressIn` / `delayPressOut`      | —      | —   | —       | ✅  | Native exposes `unstable_pressDelay` for the in-delay, and has no out-delay |
| `delayHoverIn` / `delayHoverOut`      | ✅     | ✅  | ✅      | —   | Native only                                                                 |
| `unstable_pressDelay`                 | ✅     | ✅  | ✅      | —   | Native only; web's `delayPressIn` is the stable equivalent                  |
| `hasTVPreferredFocus`                 | —      | ✅  | —       | —   | Claim focus on mount                                                        |
| `nextFocusUp/Down/Left/Right/Forward` | —      | ✅  | —       | —   | Override the focus engine's geometric choice                                |
| `isTVSelectable`                      | —      | ✅  | —       | —   | Deprecated; superseded by `focusable`                                       |
| `tvParallaxProperties`                | —      | ✅  | —       | —   | Apple TV parallax tuning                                                    |
| `enableFocusRing`                     | —      | —   | ✅      | —   | Draw the macOS focus ring                                                   |
| `acceptsFirstMouse`                   | —      | —   | ✅      | —   | Respond to the click that focused the window                                |
| `mouseDownCanMoveWindow`              | —      | —   | ✅      | —   | Let a drag move the window                                                  |
| `keyDownEvents` / `keyUpEvents`       | —      | —   | ✅      | —   | Declare which keys to handle natively                                       |
| `draggedTypes`                        | —      | —   | ✅      | —   | Pasteboard types the view accepts                                           |
| `tooltip`                             | —      | —   | ✅      | —   | Native tooltip text                                                         |
| `tabIndex`                            | —      | —   | —       | ✅  | Tab order, via `ViewProps`                                                  |
| `href` / `hrefAttrs`                  | —      | —   | —       | ✅  | Render as an anchor, via `ViewProps`                                        |

## Focus and hover state

`PressableStateCallbackType` — `StateCallbackType` on web — is what the `style` and `children` callbacks receive:

| Field     | Mobile | TV  | Desktop | Web |
| --------- | ------ | --- | ------- | --- |
| `pressed` | ✅     | ✅  | ✅      | ✅  |
| `focused` | —      | ✅  | —       | ✅  |
| `hovered` | —      | —   | —       | ✅  |

This is the sharpest asymmetry in the comparison. Web is the most complete, and for good reason: hover matches how a pointer behaves on an ordinary web page, and focus is how tab navigation works. TV needs `focused` for the same reason it needs a focus engine. Desktop has focus handlers but no `focused` flag, so a desktop app must track focus in component state to style it, while TV and web can do it inline.

## Type mismatches

Presence is only half the problem. The shared handlers do not agree on their signatures.

| Handler                            | Mobile 0.87                  | TV 0.87           | Desktop 0.81                | Web 0.21                    |
| ---------------------------------- | ---------------------------- | ----------------- | --------------------------- | --------------------------- |
| `onPress` and friends              | `?(e) => unknown`            | `?(e) => unknown` | `?(e) => mixed`             | `Nullable<(e) => void>`     |
| `onFocus` / `onBlur`               | `?(e) => void` (from `View`) | `?(e) => mixed`   | `?(e) => void`              | `(e) => void` (from `View`) |
| `onFocusCapture` / `onBlurCapture` | `?(e) => void`               | `?(e) => void`    | `?(e) => void`              | —                           |
| `onDragEnter` / `onDrop`           | —                            | —                 | `(e) => void`, not nullable | —                           |

Four things worth separating:

- **Desktop's `mixed` on press handlers is version drift.** Core used `mixed` at 0.81 and `unknown` at 0.87, so it resolves itself when `react-native-macos` rebases.
- **`onFocus` and `onBlur` genuinely disagree.** TV returns `mixed`; mobile, desktop, and web all effectively return `void`. TV is also internally inconsistent: its capture variants return `void` while the handlers themselves return `mixed`. All four platforms declare these identically on `View`, so the disagreement exists only in TV's `Pressable` redeclaration.
- **Desktop's drag handlers are optional but not nullable**, unlike every other handler on any platform.
- **Web has no capture props by design.** The DOM exposes the capture phase as an `addEventListener` option rather than a second prop, so the absence is principled rather than a gap.

## Pressability

`Pressable` is a thin wrapper over a gesture state machine — `Pressability` on native, `PressResponder` on web. Some of what looks like a platform difference on `Pressable` lives here instead.

The config that `Pressable` passes in:

| Config handler                          | Mobile | TV  | Desktop | Web                                     |
| --------------------------------------- | ------ | --- | ------- | --------------------------------------- |
| `onPress`, `onPressMove`, `onLongPress` | ✅     | ✅  | ✅      | ✅                                      |
| `onPressIn` / `onPressOut`              | ✅     | ✅  | ✅      | named `onPressStart` / `onPressEnd`     |
| `onPressChange`                         | —      | —   | —       | ✅                                      |
| `onHoverIn`, `onHoverOut`               | ✅     | ✅  | ✅      | handled by a separate `useHover` module |
| `onFocus`, `onBlur`                     | ✅     | ✅  | ✅      | handled in `Pressable` itself           |
| `onKeyDown`, `onKeyUp`                  | —      | —   | ✅      | —                                       |
| `onTVEvent`                             | —      | ✅  | —       | —                                       |
| `cancelable`                            | —      | —   | —       | ✅                                      |

**Core `Pressability` has supported focus all along.** `onFocus` and `onBlur` are in its config on all three native platforms, and core's `Pressable` destructures them from props and forwards them. Core never redeclared them on `PressableBaseProps` because `ViewProps` already supplies them. Web reaches the same result by a different route: `Pressable` handles focus directly, tracking `focused` state so it can expose it to the style callback.

The handlers the state machine returns for the underlying view to spread:

| Attached handler                            | Mobile | TV  | Desktop | Web |
| ------------------------------------------- | ------ | --- | ------- | --- |
| `onClick`                                   | ✅     | ✅  | ✅      | ✅  |
| `onResponder*`, `onStartShouldSetResponder` | ✅     | ✅  | ✅      | ✅  |
| `onBlur`, `onFocus`                         | ✅     | ✅  | ✅      | —   |
| `onMouseEnter`, `onMouseLeave`              | ✅     | ✅  | ✅      | —   |
| `onPointerEnter`, `onPointerLeave`          | ✅     | ✅  | ✅      | —   |
| `onKeyDown`                                 | —      | —   | ✅      | ✅  |
| `onKeyUp`                                   | —      | —   | ✅      | —   |
| `onContextMenu`                             | —      | —   | —       | ✅  |
| `onPressIn`, `onPressOut`                   | —      | ✅  | —       | —   |

`onTVEvent` is typed `?(event: any) => void`, the only untyped event payload across the four platforms.

### Hover versus mouse enter and leave

`onHoverIn` and `onMouseEnter` look like synonyms. They are not, on either platform that exposes both, and the difference is deliberate on each.

**On native, `onMouseEnter` is the transport and `onHoverIn` is the API.** `Pressability` attaches `onMouseEnter` and `onMouseLeave` to the underlying view and derives the hover callbacks from them, adding three things the raw events do not have:

- **Touch suppression.** The mouse path is wrapped in `isHoverEnabled()`, so a touch that synthesises mouse events does not produce a hover.
- **Delays.** `delayHoverIn` and `delayHoverOut` schedule the callback, with each entry cancelling a pending exit and vice versa.
- **State.** An internal `_isHovered` flag means `onHoverOut` only fires if a matching `onHoverIn` did.

Which DOM-like events carry this is itself version-dependent. Behind the `shouldPressibilityUseW3CPointerEventsForHover` feature flag, `Pressability` switches to `onPointerEnter` and `onPointerLeave` and converts the payload back to a mouse event for the callback. The pointer path drops the `isHoverEnabled()` gate, because pointer events already report `pointerType`.

**On web, the two are independent paths to the same element.** `onHoverIn` and `onHoverOut` are served by a separate `useHover` module that `Pressable` calls with `contain: true`, while `onMouseEnter` and `onMouseLeave` pass straight through to the DOM as ordinary React props. `useHover` adds:

- **Touch suppression**, by checking `getPointerType(event) !== 'touch'` — the same intent as native's `isHoverEnabled()`, done with the information the event already carries.
- **Containment**, so a hoverable nested inside another does not fire both.
- **Respect for `disabled`**, which is passed into the hover config. A disabled `Pressable` still emits `onMouseEnter`.
- **Pointer events where available**, falling back to `mouseenter` and `mouseleave` only when the browser lacks them.

It attaches these imperatively as passive listeners rather than as React props, which is why they do not appear in the responder's `EventHandlers`.

So on both platforms the rule is the same: **`onHoverIn` and `onHoverOut` describe a user hovering; `onMouseEnter` and `onMouseLeave` describe a mouse cursor crossing a boundary.** The first is filtered, stateful, and on native delayable; the second is raw. They diverge whenever input is touch, the component is disabled, or hoverables are nested.

One consequence for a unified API: web has no `delayHoverIn` or `delayHoverOut`, and native has no hover containment or `onHoverChange`. Each has a capability the other lacks, and both are useful.

### On `onMouseEnter` and `onMouseLeave`

These are often misread as a desktop addition, so they are worth stating plainly.

On all three native platforms they are internal. Core 0.81, core 0.87, TV, and desktop all declare them in `Pressability`'s `EventHandlers`, and all four `Pressable` implementations omit them from `ViewProps` with the same `Omit<ViewProps, 'onMouseEnter' | 'onMouseLeave'>`. `Pressability` attaches them to the underlying view and derives `onHoverIn` and `onHoverOut` from them, so no native platform accepts them as `Pressable` props.

Web is the exception, and deliberately so: its `Pressable` omits only `children` and `style` from `ViewProps`, so `onMouseEnter` and `onMouseLeave` pass straight through to the DOM element alongside `onHoverIn` and `onHoverOut`.

The `react-native-macos` documentation site also lists them as `Pressable` props, but for a different and less intentional reason. Its legacy hand-maintained `PressableProps` extends `Omit<ViewProps, 'children' | 'style' | 'hitSlop'>`, which does not exclude the mouse handlers, so they leak in from `ViewProps` even though the Flow source omits them. Core 0.81 declares that `Omit` exactly the same way, so macOS inherited the discrepancy rather than introducing it, and core's move to types generated from Flow fixed it in 0.87. `react-native-macos` picks the fix up when it rebases.

A second inherited issue sits in the same code path. In the legacy mouse branch, `onMouseLeave` stores its delayed `onHoverOut` timer in `_hoverInDelayTimeout` rather than `_hoverOutDelayTimeout`. Because a subsequent `onMouseEnter` cancels only the hover-out slot, a pending delayed `onHoverOut` survives and fires after the pointer has already returned. Core 0.81 has the same line and core 0.87 corrects it, so this too resolves on rebase. It only bites when `delayHoverOut` is set.

## Handlers inherited from View

`Pressable` spreads `ViewProps` on every platform, so `View`'s handlers are part of its surface even where `Pressable` does not redeclare them. The differences that matter:

| Handler                                  | Mobile | TV  | Desktop | Web | Notes                                  |
| ---------------------------------------- | ------ | --- | ------- | --- | -------------------------------------- |
| `onFocus` / `onBlur`                     | ✅     | ✅  | ✅      | ✅  | Identical signature on all four        |
| `onKeyDown` / `onKeyUp`                  | ✅     | ✅  | ✅      | ✅  |                                        |
| `onFocusCapture` / `onBlurCapture`       | ✅     | ✅  | ✅      | —   | Web has no capture props               |
| `onKeyDownCapture` / `onKeyUpCapture`    | ✅     | ✅  | —       | —   | Absent from desktop `View`             |
| `onMouseEnter` / `onMouseLeave`          | ✅     | ✅  | ✅      | ✅  | Omitted from `Pressable` except on web |
| `onPressIn` / `onPressOut`               | —      | ✅  | —       | —   | TV adds these to `View` itself         |
| `onAuxClick`                             | —      | —   | ✅      | ✅  |                                        |
| `onContextMenu`, `onWheel`, `onScroll`   | —      | —   | —       | ✅  | Web only                               |
| `onMouseDown/Move/Out/Over/Up`           | —      | —   | —       | ✅  | Web only                               |
| `onDoubleClick`                          | —      | —   | ✅      | —   | Desktop only                           |
| `onDragEnter` / `onDragLeave` / `onDrop` | —      | —   | ✅      | —   | Desktop only                           |
| `onAccessibilityAction/Escape/Tap`       | ✅     | ✅  | ✅      | —   | Native only                            |

This reframes the `Pressable` additions above. `onFocus`, `onBlur`, `onKeyDown`, and `onKeyUp` are reachable on every platform through `ViewProps`; what each fork did was **redeclare** some of them on `Pressable` — and in TV's case, change their types while doing so.

## Implications for a unified API

The comparison suggests the divergence is narrower than it looks, and mostly accidental:

1. **`onFocus` and `onBlur` need no new API, on any platform.** They are already in the native `PressabilityConfig`, already declared identically on `View` everywhere, and already forwarded by core's `Pressable`. The native forks' redeclarations add no behavior; they only change types. Deleting them aligns all four platforms and loses nothing.
2. **`focused` and `hovered` on the state callback are the real gaps.** Web has both, TV has `focused`, mobile and desktop have neither. They are the only focus-related capabilities one platform has that another cannot express, and both are meaningful anywhere a pointer or a focus ring exists. Web's shape is the one to copy.
3. **Press naming should be settled.** Native says `onPressIn` and `onPressOut`; web's responder says `onPressStart` and `onPressEnd` and adds `onPressChange`. The component-level names already agree, so this is a question about the shared gesture layer rather than the public API.
4. **Capture variants are a native-only concept.** Web deliberately has none, because the DOM exposes capture as a listener option. A unified API should not require them, and should not treat their absence on web as a gap.
5. **Nullability and return types should be settled once.** `?(e) => void` for handlers whose result is ignored is the core convention; `mixed` and `unknown` appear only where a fork or an older core version diverged.
6. **Genuinely platform-specific input stays platform-specific.** Drag-and-drop and window behavior on desktop, parallax and the remote on TV, `href` and context menus on web: these describe hardware or a document model that only one platform has.
