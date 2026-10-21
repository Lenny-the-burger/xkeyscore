/*
 * Small helpers missing from Ext JS 3.
 */
Ext.ns('Xks');

// Ext.Array.map arrived in Ext 4
Xks.map = function (arr, fn, scope) {
    var out = [];
    Ext.each(arr, function (v, i) {
        out.push(fn.call(scope || v, v, i));
    });
    return out;
};
