import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const SLIDE_MS = 200;
const REVEAL_DWELL_MS = 200;
const CHECK_DELAY_MS = 120;
const LEAVE_DELAY_MS = 300;
const EDGE_PX = 2;

const OVERLAP_TYPES = [
  Meta.WindowType.NORMAL,
  Meta.WindowType.DIALOG,
  Meta.WindowType.MODAL_DIALOG,
  Meta.WindowType.UTILITY,
];

// Slides the top bar out of view and brings it back from the top edge, like
// the dock: with intellihide it hides only while a window overlaps the bar.
export class AutoHide {
  constructor(settings) {
    this._settings = settings;
    this._box = Main.layoutManager.panelBox;
    this._hidden = false;
    this._timers = new Map();
    this._tracked = new Set();
    this._tracking = null;
  }

  enable() {
    this._edge = new St.Widget({reactive: false, visible: false});
    this._edge.connect('enter-event', () => this._later('reveal', REVEAL_DWELL_MS, () => this._show()));
    this._edge.connect('leave-event', () => this._cancel('reveal'));
    Main.layoutManager.addChrome(this._edge, {affectsStruts: false, trackFullscreen: true});

    this._hoverWas = [this._box.reactive, this._box.track_hover];
    this._box.set({reactive: true, track_hover: true});
    this._boxHoverId = this._box.connect('notify::hover', () => this._later('check', LEAVE_DELAY_MS, () => this._evaluate()));
    this._monitorsId = Main.layoutManager.connect('monitors-changed', () => this._placeEdge());

    this._display = global.display;
    this._displayIds = [
      this._display.connect('restacked', () => this._queue()),
      this._display.connect('notify::focus-window', () => this._queue()),
      this._display.connect('window-created', (_d, win) => this._track(win)),
    ];
    this._wsId = global.workspace_manager.connect('active-workspace-changed', () => this._queue());
    this._overviewIds = [
      Main.overview.connect('showing', () => this._queue()),
      Main.overview.connect('hidden', () => this._queue()),
    ];

    for (const actor of global.get_window_actors()) this._track(actor.get_meta_window());
    this._placeEdge();
    this._evaluate();
  }

  disable() {
    for (const id of this._timers.values()) GLib.source_remove(id);
    this._timers.clear();

    this._display.disconnect(this._displayIds[0]);
    this._display.disconnect(this._displayIds[1]);
    this._display.disconnect(this._displayIds[2]);
    global.workspace_manager.disconnect(this._wsId);
    Main.overview.disconnect(this._overviewIds[0]);
    Main.overview.disconnect(this._overviewIds[1]);
    Main.layoutManager.disconnect(this._monitorsId);
    this._box.disconnect(this._boxHoverId);
    this._box.set({reactive: this._hoverWas[0], track_hover: this._hoverWas[1]});

    for (const win of this._tracked) win.disconnectObject(this);
    this._tracked.clear();

    this._box.remove_all_transitions();
    this._box.translation_y = 0;
    this._restoreStruts();
    Main.layoutManager.removeChrome(this._edge);
    this._edge.destroy();
    this._edge = null;
  }

  // Called when a setting changes.
  refresh() {
    this._evaluate();
  }

  _later(name, ms, fn) {
    this._cancel(name);
    this._timers.set(name, GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
      this._timers.delete(name);
      fn();
      return GLib.SOURCE_REMOVE;
    }));
  }

  _cancel(name) {
    const id = this._timers.get(name);
    if (id === undefined) return;
    GLib.source_remove(id);
    this._timers.delete(name);
  }

  _queue() {
    this._later('check', CHECK_DELAY_MS, () => this._evaluate());
  }

  _track(win) {
    if (this._tracked.has(win)) return;
    this._tracked.add(win);
    win.connectObject(
      'position-changed', () => this._queue(),
      'size-changed', () => this._queue(),
      'notify::minimized', () => this._queue(),
      'unmanaged', () => this._tracked.delete(win),
      this
    );
  }

  // The bar normally reserves screen space; a bar that hides must not.
  _applyStruts() {
    if (this._struts !== undefined) return;
    const tracked = Main.layoutManager._trackedActors.find((t) => t.actor === this._box);
    if (!tracked) return;
    this._struts = tracked.affectsStruts;
    tracked.affectsStruts = false;
    Main.layoutManager._queueUpdateRegions();
  }

  _restoreStruts() {
    const tracked = Main.layoutManager._trackedActors.find((t) => t.actor === this._box);
    if (tracked && this._struts !== undefined) tracked.affectsStruts = this._struts;
    this._struts = undefined;
    Main.layoutManager._queueUpdateRegions();
  }

  _placeEdge() {
    const m = Main.layoutManager.primaryMonitor;
    if (!m) return;
    this._edge.set_position(m.x, m.y);
    this._edge.set_size(m.width, EDGE_PX);
  }

  _slide(hide) {
    this._hidden = hide;
    this._edge.visible = hide;
    this._edge.reactive = hide;
    this._box.ease({
      translation_y: hide ? -this._box.height : 0,
      duration: SLIDE_MS,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD,
    });
  }

  _show() {
    if (this._hidden) this._slide(false);
  }

  _hide() {
    if (!this._hidden) this._slide(true);
  }

  _pointerOnBar() {
    const m = Main.layoutManager.primaryMonitor;
    const [x, y] = global.get_pointer();
    return x >= m.x && x < m.x + m.width && y >= m.y && y < m.y + this._box.height;
  }

  _windowOverlapsBar() {
    const m = Main.layoutManager.primaryMonitor;
    const bottom = m.y + this._box.height;
    const ws = global.workspace_manager.get_active_workspace();
    return global.get_window_actors().some((a) => {
      const w = a.get_meta_window();
      if (!w || w.minimized || !OVERLAP_TYPES.includes(w.get_window_type())) return false;
      if (w.get_monitor() !== m.index || w.get_workspace() !== ws) return false;
      const f = w.get_frame_rect();
      return f.y < bottom && f.y + f.height > m.y;
    });
  }

  _evaluate() {
    if (!this._settings.get_boolean('autohide')) {
      this._show();
      this._restoreStruts();
      return;
    }
    this._applyStruts();
    const menuOpen = !!Main.panel.menuManager.activeMenu;
    if (menuOpen) this._later('check', LEAVE_DELAY_MS, () => this._evaluate());
    const keepShown = Main.overview.visible || menuOpen || this._pointerOnBar();
    const wantHidden = !keepShown &&
      (!this._settings.get_boolean('intellihide') || this._windowOverlapsBar());
    if (wantHidden) this._hide();
    else this._show();
  }
}
