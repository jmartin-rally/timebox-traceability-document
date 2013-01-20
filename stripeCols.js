// Create the namespace
Ext.ns('Ext.ux.plugins.grid');

/**
 * Ext.ux.plugins.grid.stripeCols plugin for Ext.grid.GridPanel
 *
 * A GridPanel plugin that enables alternating cell formatting
 * in grids by setting 'stripeCols: true', similar to the
 * stripeRows option.
 *
 * To omit certain columns from being striped, you can pass the
 * parameter 'excludeCStripe: ['col1',...]' to the grid config,
 * listing all data indexes that should be left out. Note that
 * this doesn't affect the striping of other columns.
 *
 * To omit columns from being striped but stripe the immediately
 * following one, use the 'skipCStripe: ['col1',...]' parameter
 * instead.
 *
 * Release Date: March 23, 2009
 * @author  BitPoet
 * @date    December 22, 2011
 * @version 4.01
 * @changelog:
 * @version 4.01
 * @date       22-Dec-2011
 *             - Yaron Yogev (extjs id: yyogev): Migrated to ExtJS 4
 *
 * @class Ext.ux.plugins.grid.stripeCols
 * @extends Ext.util.Observable
 */
Ext.ux.plugins.grid.stripeCols = Ext.extend( Ext.util.Observable, {
    init:
    function(grid) {
        var v = grid /* grid.getView()*/;
        if (typeof v != "object")
            Ext.Msg.alert("Error", "stripeCols.init: view is not an object");
        v.afterRender = Ext.Function.createSequence(v.afterRender, this.setCss);
        v.on('rowsinserted', Ext.Function.bind(this.setCss, v));
        v.on('rowremoved', Ext.Function.bind(this.setCss, v));
        grid.on('columnmoved', Ext.Function.bind(this.setCss, v));
        grid.on('columnhide', Ext.Function.bind(this.setCss, v));
        grid.on('columnshow', Ext.Function.bind(this.setCss, v));
        v.on('refresh', Ext.Function.bind(this.setCss, v));
    }
    ,setCss:    function() {
        for(var j = 0; j < this.store.getCount(); j++) {
            var markop = 1;
            var r = this.store.getAt(j);
            if (!r)
                continue;
            var columns = this.getGridColumns();
            var column_count = columns.length;
            for (var i = 0; i < column_count; i++) {
                var cell = this.getCell(r, this.getHeaderAtIndex(i));

                var header = this.getHeaderAtIndex(i);
                var stripe_exclude = this.excludeCStripe &&
                    this.excludeCStripe.indexOf(header.dataIndex) != -1;
                if (this.stripeCols && i % 2 == markop  && !stripe_exclude) {
                	if( Ext.Element.get(cell) ) {
                        cell.removeCls('x-grid3-col-alt');
                    }
                } else {
                    var stripe_skip = this.skipCStripe &&
                    this.skipCStripe.indexOf(header.dataIndex) != -1;
	                if (header.isHidden() || stripe_skip)
	                {
	                    markop ^= 1;
	                } else {
	                    if( Ext.Element.get(cell) ) {
	                        cell.addCls('x-grid3-col-alt');
	                    }
	                }
                
                    
                }
            }
        }
    }
});
/* EOF Ext.ux.plugins.grid.stripeCols */

