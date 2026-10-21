/*
 * Xks.form.TimeSpinner
 *
 * HH:MM field with an up/down spinner trigger, as seen next to the Start/Stop
 * date pickers on every search form. The original was almost certainly
 * Ext.ux.form.SpinnerField (shipped with the Ext 3 examples, not in ext-all.js);
 * this is a minimal stand-in with the same look.
 */
Ext.ns('Xks.form');

Xks.form.TimeSpinner = Ext.extend(Ext.form.TriggerField, {
    triggerClass: 'xks-spinner-trigger',
    value: '00:00',
    maskRe: /[0-9:]/,
    regex: /^([01]\d|2[0-3]):[0-5]\d$/,
    regexText: 'Time must be HH:MM',
    stepMinutes: 60,

    onTriggerClick: function (e) {
        if (this.disabled) {
            return;
        }
        var region = this.trigger.getRegion(),
            up = e.getPageY() < region.top + (region.bottom - region.top) / 2;
        this.spin(up ? 1 : -1);
    },

    spin: function (dir) {
        var m = /^(\d{1,2}):(\d{2})$/.exec(this.getValue() || '00:00'),
            mins = m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
        mins = (mins + dir * this.stepMinutes + 1440) % 1440;
        this.setValue(String.leftPad(Math.floor(mins / 60), 2, '0') + ':' + String.leftPad(mins % 60, 2, '0'));
    }
});

Ext.reg('xks-timespinner', Xks.form.TimeSpinner);
