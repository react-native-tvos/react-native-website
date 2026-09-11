---
id: platform-differences-pressable
title: Pressable
---

`Pressable` is where the out-of-tree platforms diverge most, because each one added the input model its hardware needed: focus and a directional remote for TV, keyboard and pointer for desktop. Those additions were made independently, so the same concept is sometimes spelled differently, and sometimes typed differently.

This page compares the prop surfaces so that a unified API can be designed from what actually ships rather than from memory.

## What is compared

| Platform | Package              | Version | Source           |
| -------- | -------------------- | ------- | ---------------- |
| Mobile   | `react-native`       | 0.87    | `branch-v0.87.0` |
| TV       | `react-native-tvos`  | 0.87    | `tvos-v0.87.0`   |
| Desktop  | `react-native-macos` | 0.81    | `main`           |

Props are read from the Flow sources, which define the API on all three. `react-native-macos` tracks core 0.81, so core 0.81 is included below wherever a difference could otherwise be mistaken for a platform decision.

:::note

Core `Pressable` declares exactly the same event handlers at 0.81 and 0.87. Every handler difference below is therefore a platform addition, not version drift. The one place version does matter is return types, called out under [Type mismatches](#type-mismatches).

:::

## Event handlers on Pressable

| Handler          | Mobile | TV  | Desktop | Notes                                              |
| ---------------- | ------ | --- | ------- | -------------------------------------------------- |
| `onPress`        | ✅     | ✅  | ✅      |                                                    |
| `onPressIn`      | ✅     | ✅  | ✅      | TV: fires on remote select down                    |
| `onPressOut`     | ✅     | ✅  | ✅      | TV: fires on remote select release                 |
| `onLongPress`    | ✅     | ✅  | ✅      |                                                    |
| `onPressMove`    | ✅     | ✅  | ✅      |                                                    |
| `onHoverIn`      | ✅     | ✅  | ✅      |                                                    |
| `onHoverOut`     | ✅     | ✅  | ✅      |                                                    |
| `onLayout`       | ✅     | ✅  | ✅      |                                                    |
| `onFocus`        | ✅     | ✅  | ✅      | Core inherits from `View`; both forks redeclare it |
| `onBlur`         | ✅     | ✅  | ✅      | Core inherits from `View`; both forks redeclare it |
| `onFocusCapture` | —      | ✅  | —       | TV only                                            |
| `onBlurCapture`  | —      | ✅  | —       | TV only                                            |
| `onKeyDown`      | —      | —   | ✅      | Desktop only; TV uses `TVEventHandler`             |
| `onKeyUp`        | —      | —   | ✅      | Desktop only                                       |
| `onDragEnter`    | —      | —   | ✅      | Desktop only                                       |
| `onDragLeave`    | —      | —   | ✅      | Desktop only                                       |
| `onDrop`         | —      | —   | ✅      | Desktop only                                       |

A ✅ here means the prop is accepted, whether declared on `Pressable` itself or inherited through `ViewProps`. That distinction matters for `onFocus` and `onBlur`: core does not declare them on `Pressable`, but it does accept them from `View` and forward them to `Pressability`, as the [Pressability](#pressability) section shows. The forks redeclare them, which is where the type disagreement comes from.

## Other props on Pressable

| Prop                                  | Mobile | TV  | Desktop | Purpose                                      |
| ------------------------------------- | ------ | --- | ------- | -------------------------------------------- |
| `hasTVPreferredFocus`                 | —      | ✅  | —       | Claim focus on mount                         |
| `nextFocusUp/Down/Left/Right/Forward` | —      | ✅  | —       | Override the focus engine's geometric choice |
| `isTVSelectable`                      | —      | ✅  | —       | Deprecated; superseded by `focusable`        |
| `tvParallaxProperties`                | —      | ✅  | —       | Apple TV parallax tuning                     |
| `enableFocusRing`                     | —      | —   | ✅      | Draw the macOS focus ring                    |
| `acceptsFirstMouse`                   | —      | —   | ✅      | Respond to the click that focused the window |
| `mouseDownCanMoveWindow`              | —      | —   | ✅      | Let a drag move the window                   |
| `keyDownEvents`                       | —      | —   | ✅      | Declare which keys to handle natively        |
| `keyUpEvents`                         | —      | —   | ✅      | Declare which keys to handle natively        |
| `draggedTypes`                        | —      | —   | ✅      | Pasteboard types the view accepts            |
| `tooltip`                             | —      | —   | ✅      | Native tooltip text                          |
| `allowsVibrancy`                      | —      | —   | ✅      | Vibrancy blending                            |

Both forks solve "claim focus" and "style the focused state", but neither prop is shared.

## Focus state

`PressableStateCallbackType` is what the `style` and `children` callbacks receive:

| Field     | Mobile | TV  | Desktop |
| --------- | ------ | --- | ------- |
| `pressed` | ✅     | ✅  | ✅      |
| `focused` | —      | ✅  | —       |

Desktop has focus handlers but no `focused` flag, so a desktop app must track focus in component state to style it, while a TV app can do it inline. This is the sharpest asymmetry in the comparison: the two platforms that both added focus disagree on how it is consumed.

## Type mismatches

Presence is only half the problem. The shared handlers do not agree on their signatures.

| Handler                            | Mobile 0.87                  | TV 0.87           | Desktop 0.81                |
| ---------------------------------- | ---------------------------- | ----------------- | --------------------------- |
| `onPress` and friends              | `?(e) => unknown`            | `?(e) => unknown` | `?(e) => mixed`             |
| `onFocus` / `onBlur`               | `?(e) => void` (from `View`) | `?(e) => mixed`   | `?(e) => void`              |
| `onFocusCapture` / `onBlurCapture` | —                            | `?(e) => void`    | —                           |
| `onDragEnter` / `onDrop`           | —                            | —                 | `(e) => void`, not nullable |

Three things worth separating here:

- **Desktop's `mixed` on press handlers is version drift.** Core used `mixed` at 0.81 and `unknown` at 0.87, so this resolves itself when `react-native-macos` rebases.
- **`onFocus` and `onBlur` genuinely disagree.** TV returns `mixed`, desktop returns `void`. TV is also internally inconsistent: its capture variants return `void` while the handlers themselves return `mixed`. All three platforms' `View` declares these four identically as `?(event) => void`, so the disagreement exists only in the `Pressable` redeclarations, and TV is the sole outlier.
- **Desktop's drag handlers are optional but not nullable**, unlike every other handler on all three platforms. Passing `null` is a type error there and legal everywhere else.

## Handlers inherited from View

`Pressable` spreads `ViewProps`, so `View`'s handlers are part of its surface even when `Pressable` does not redeclare them. `View` carries 55 handlers common to all three platforms, including the full pointer, touch, and responder sets.

The differences that matter for `Pressable`:

| Handler                                  | Mobile | TV  | Desktop | Notes                          |
| ---------------------------------------- | ------ | --- | ------- | ------------------------------ |
| `onFocus` / `onBlur`                     | ✅     | ✅  | ✅      | Already on `View` everywhere   |
| `onFocusCapture` / `onBlurCapture`       | ✅     | ✅  | ✅      | Already on `View` everywhere   |
| `onKeyDown` / `onKeyUp`                  | ✅     | ✅  | ✅      | Already on `View` everywhere   |
| `onKeyDownCapture` / `onKeyUpCapture`    | ✅     | ✅  | —       | Absent from desktop `View`     |
| `onPressIn` / `onPressOut`               | —      | ✅  | —       | TV adds these to `View` itself |
| `onAuxClick`, `onDoubleClick`            | —      | —   | ✅      | Desktop only                   |
| `onDragEnter` / `onDragLeave` / `onDrop` | —      | —   | ✅      | Desktop only                   |
| `onInvertedDidChange`                    | —      | —   | ✅      | Desktop only                   |
| `onPreferredScrollerStyleDidChange`      | —      | —   | ✅      | Desktop only                   |

This reframes the `Pressable` additions above. `onFocus`, `onBlur`, `onKeyDown`, and `onKeyUp` were already reachable on every platform through `ViewProps`; what each fork actually did was **redeclare** them on `Pressable` — and in doing so, changed their types. TV's redeclaration is what makes `onFocus` return `mixed` instead of `View`'s `void`.

## Pressability

`Pressable` is a thin wrapper over `Pressability`, which owns the gesture state machine. Some of what looks like a platform difference on `Pressable` turns out to live here, and some apparent gaps are not gaps at all.

`PressabilityConfig` is what `Pressable` passes in:

| Config handler                                                     | Mobile | TV  | Desktop |
| ------------------------------------------------------------------ | ------ | --- | ------- |
| `onPress`, `onPressIn`, `onPressOut`, `onPressMove`, `onLongPress` | ✅     | ✅  | ✅      |
| `onHoverIn`, `onHoverOut`                                          | ✅     | ✅  | ✅      |
| `onFocus`, `onBlur`                                                | ✅     | ✅  | ✅      |
| `onKeyDown`, `onKeyUp`                                             | —      | —   | ✅      |
| `onTVEvent`                                                        | —      | ✅  | —       |

**Core `Pressability` has supported focus all along.** `onFocus` and `onBlur` are in its config on every platform, and core's `Pressable` destructures them from props and forwards them. Core never redeclared them on `PressableBaseProps`, because `ViewProps` already supplies them.

`EventHandlers` is what `Pressability` returns for the underlying view to spread:

| Attached handler                            | Mobile | TV  | Desktop |
| ------------------------------------------- | ------ | --- | ------- |
| `onBlur`, `onFocus`, `onClick`              | ✅     | ✅  | ✅      |
| `onMouseEnter`, `onMouseLeave`              | ✅     | ✅  | ✅      |
| `onPointerEnter`, `onPointerLeave`          | ✅     | ✅  | ✅      |
| `onResponder*`, `onStartShouldSetResponder` | ✅     | ✅  | ✅      |
| `onKeyDown`, `onKeyUp`                      | —      | —   | ✅      |
| `onPressIn`, `onPressOut`                   | —      | ✅  | —       |

`onTVEvent` is typed `?(event: any) => void`, the only untyped event payload across the three platforms.

### On `onMouseEnter` and `onMouseLeave`

These are often misread as a desktop addition, so they are worth stating plainly.

All four sources — core 0.81, core 0.87, TV, and desktop — declare them identically in `Pressability`'s `EventHandlers`, and all four `Pressable` implementations omit them from `ViewProps` with the same `Omit<ViewProps, 'onMouseEnter' | 'onMouseLeave'>`. They are internal: `Pressability` attaches them to the underlying view and derives `onHoverIn` and `onHoverOut` from them. No platform accepts them as `Pressable` props.

The `react-native-macos` documentation site lists them as `Pressable` props anyway. The cause is the legacy hand-maintained TypeScript types, not the macOS code: there `PressableProps` extends `Omit<ViewProps, 'children' | 'style' | 'hitSlop'>`, which does not exclude the mouse handlers, so they leak in from `ViewProps`. Core 0.81 declares that `Omit` exactly the same way, so macOS inherited this rather than introducing it, and core's move to types generated from Flow fixed it in 0.87 — the generated `PressableProps` carries the correct omission. `react-native-macos` picks the fix up when it rebases.

## Implications for a unified API

The comparison suggests the divergence is narrower than it looks, and mostly accidental:

1. **`onFocus` and `onBlur` need no new API, on any platform.** They are already in `PressabilityConfig` everywhere, already declared identically on `View` everywhere as `?(event) => void`, and core's `Pressable` already forwards them. The forks' `Pressable` redeclarations add no behavior; they only change the types. Deleting them aligns all three and loses nothing.
2. **`focused` on `PressableStateCallbackType` is the one genuine gap.** It is the only focus-related capability a platform has that another cannot express, and it is useful anywhere focus exists — TV, desktop, and web.
3. **Capture variants should be symmetric.** Desktop `View` is missing `onKeyDownCapture` and `onKeyUpCapture`; desktop `Pressable` is missing the focus capture variants that TV has.
4. **Nullability and return types should be settled once.** `?(e) => void` for handlers whose result is ignored is the core convention; `mixed` and `unknown` appear only where a fork or an older core version diverged.
5. **Genuinely platform-specific input stays platform-specific.** Drag-and-drop, window behavior, and parallax are not candidates for a shared API; they describe hardware that only one platform has.
