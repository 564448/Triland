import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {AutoHide} from './autohide.js';

const KEYS = [
  'panel-height',
  'margin-x',
  'margin-top',
  'radius',
  'opacity',
  'island-padding',
];
const APP_WINDOW_TYPES = [
  Meta.WindowType.NORMAL,
  Meta.WindowType.DIALOG,
  Meta.WindowType.MODAL_DIALOG,
  Meta.WindowType.UTILITY,
];
const AUTOHIDE_KEYS = ['autohide', 'intellihide'];

export default class Triland extends Extension {
  enable() {
    this._settings = this.getSettings();
    this._ids = KEYS.map((k) =>
      this._settings.connect(`changed::${k}`, () => this._apply())
    );
    Main.panel.add_style_class_name('triland');
    this._apply();

    this._clockId = this._settings.connect('changed::hide-clock', () => this._applyClock());
    this._watchDesktop();
    this._applyClock();

    this._autohide = new AutoHide(this._settings);
    this._autohide.enable();
    this._hideIds = AUTOHIDE_KEYS.map((k) =>
      this._settings.connect(`changed::${k}`, () => this._autohide.refresh())
    );
  }

  disable() {
    this._settings.disconnect(this._clockId);
    this._clockId = null;
    this._unwatchDesktop();
    Main.panel._centerBox.visible = true;

    this._hideIds.forEach((id) => this._settings.disconnect(id));
    this._hideIds = null;
    this._autohide.disable();
    this._autohide = null;

    this._ids.forEach((id) => this._settings.disconnect(id));
    this._ids = null;
    this._settings = null;

    Main.panel.remove_style_class_name('triland');
    Main.panel.style = null;
    Main.layoutManager.panelBox.style = null;
    for (const box of this._islands()) box.style = null;
  }

  // The clock is hidden only on the desktop: no app window open on this
  // workspace and the overview closed.
  _applyClock() {
    const hide = this._settings.get_boolean('hide-clock') &&
      !Main.overview.visible && !this._windowOnDesktop();
    Main.panel._centerBox.visible = !hide;
  }

  _windowOnDesktop() {
    const ws = global.workspace_manager.get_active_workspace();
    const primary = Main.layoutManager.primaryIndex;
    return global.get_window_actors().some((a) => {
      const w = a.get_meta_window();
      return w && !w.minimized && APP_WINDOW_TYPES.includes(w.get_window_type()) &&
        w.get_workspace() === ws && w.get_monitor() === primary;
    });
  }

  _watchDesktop() {
    const queue = () => {
      if (this._clockTimer) return;
      this._clockTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
        this._clockTimer = null;
        this._applyClock();
        return GLib.SOURCE_REMOVE;
      });
    };
    const wm = global.window_manager;
    this._watch = [
      [global.display, ['restacked', 'notify::focus-window'].map((n) => global.display.connect(n, queue))],
      [wm, ['map', 'destroy', 'minimize', 'unminimize'].map((n) => wm.connect(n, queue))],
      [global.workspace_manager, [global.workspace_manager.connect('active-workspace-changed', queue)]],
      [Main.overview, ['showing', 'hidden'].map((n) => Main.overview.connect(n, queue))],
    ];
  }

  _unwatchDesktop() {
    if (this._clockTimer) GLib.source_remove(this._clockTimer);
    this._clockTimer = null;
    for (const [obj, ids] of this._watch) ids.forEach((id) => obj.disconnect(id));
    this._watch = null;
  }

  _islands() {
    return [Main.panel._leftBox, Main.panel._centerBox, Main.panel._rightBox];
  }

  _apply() {
    const s = this._settings;
    const height = s.get_int('panel-height');
    const mx = s.get_int('margin-x');
    const mt = s.get_int('margin-top');
    const radius = s.get_int('radius');
    const alpha = s.get_int('opacity') / 100;
    const pad = s.get_int('island-padding');

    Main.layoutManager.panelBox.style = `padding-top: ${mt}px;`;
    Main.panel.style = `height: ${height}px; padding: 0 ${mx}px;`;

    const island =
      `background-color: rgba(0, 0, 0, ${alpha}); ` +
      `border-radius: ${radius}px; padding: 0 ${pad}px;`;
    for (const box of this._islands()) box.style = island;
  }
}
