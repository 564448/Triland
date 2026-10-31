import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const KEYS = [
  'panel-height',
  'margin-x',
  'margin-top',
  'radius',
  'opacity',
  'island-padding',
];

export default class Triland extends Extension {
  enable() {
    this._settings = this.getSettings();
    this._ids = KEYS.map((k) =>
      this._settings.connect(`changed::${k}`, () => this._apply())
    );
    Main.panel.add_style_class_name('triland');
    this._apply();
  }

  disable() {
    this._ids.forEach((id) => this._settings.disconnect(id));
    this._ids = null;
    this._settings = null;

    Main.panel.remove_style_class_name('triland');
    Main.panel.style = null;
    Main.layoutManager.panelBox.style = null;
    for (const box of this._islands()) box.style = null;
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
