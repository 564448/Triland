import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const ROWS = [
  ['panel-height', 'Bar height', 'px'],
  ['margin-x', 'Side margin', 'px'],
  ['margin-top', 'Top margin', 'px'],
  ['radius', 'Corner radius', 'px'],
  ['opacity', 'Background opacity', '%'],
  ['island-padding', 'Island padding', 'px'],
];

export default class TrilandPrefs extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();
    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup({title: 'Islands'});
    page.add(group);

    for (const [key, title, unit] of ROWS) {
      const range = settings.settings_schema.get_key(key).get_range().deepUnpack()[1].deepUnpack();
      const row = new Adw.SpinRow({
        title: `${title} (${unit})`,
        adjustment: new Gtk.Adjustment({
          lower: range[0],
          upper: range[1],
          step_increment: 1,
          value: settings.get_int(key),
        }),
      });
      settings.bind(key, row, 'value', 0);
      group.add(row);
    }
    window.add(page);
  }
}
