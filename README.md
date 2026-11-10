# Triland

A GNOME Shell extension that splits the top bar into three floating islands
(left, center, right) over a transparent panel.

- Target: **GNOME Shell 50** only (`metadata.json`). Tested on GNOME Shell 50.1, Ubuntu.
- No blur: islands use a translucent black background.
- Does not touch the dock or other extensions. Items from other extensions
  (app indicators, media controllers) simply sit inside the island they live in.

## Settings

| Key | Default | Range | Meaning |
|---|---|---|---|
| `panel-height` | 36 | 24-64 | Top bar height (px) |
| `margin-x` | 8 | 0-64 | Distance of the outer islands from the screen sides (px) |
| `margin-top` | 4 | 0-32 | Distance from the top edge (px) |
| `radius` | 18 | 0-32 | Island corner radius (px) |
| `opacity` | 55 | 0-100 | Island background opacity (%) |
| `island-padding` | 10 | 0-32 | Horizontal padding inside each island (px) |
| `autohide` | off | on/off | Slide the bar out of view; touch the top edge to bring it back |
| `intellihide` | on | on/off | With `autohide` on, hide only while a window overlaps the bar |
| `hide-clock` | off | on/off | Hide the middle island (clock and notification menu) while no app window is open |

### Auto hide

With `autohide` on, the bar stays out of view and does not reserve screen
space (maximized windows reach the top edge). Holding the pointer on the top
edge for about 0.2 s slides it back in; it hides again when the pointer
leaves. With `intellihide` on (default) the bar hides only while a window
overlaps it. It stays visible in the Overview and while a panel menu is open.
Only the primary monitor is handled.

### Hide the clock on the desktop

With `hide-clock` on, the middle island (clock and notification menu) is hidden
while no app window is open on the active workspace of the primary monitor, so
a desktop clock widget is not shown twice. It appears again as soon as a window
is open (minimized windows do not count) and in the Overview. The notification
menu is hidden with the clock; Super+M still opens it.

Open the preferences with `gnome-extensions prefs triland@knight.local`.

## Install

```bash
git clone https://github.com/564448/Triland.git
ln -s "$PWD/Triland" ~/.local/share/gnome-shell/extensions/triland@knight.local
```

On Wayland, log out and back in so GNOME Shell discovers the extension, then:

```bash
gnome-extensions enable triland@knight.local
```

## Known limits

- Panel height and padding are applied through inline styles; if a theme
  overrides them, the values may not take effect.
- Only checked on one machine (GNOME Shell 50.1). Auto hide was tested in a
  headless session with a virtual pointer, not yet on a real desktop.

## License

MIT, see [LICENSE](LICENSE).
