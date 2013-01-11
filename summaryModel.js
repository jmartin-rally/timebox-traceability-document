/*
 * Completeness for items that have no children but are
 * accepted should be 100%
 */
var convertAcceptedOrphan = function(value, record) {
	if ( record.data.ScheduleState === "Accepted" ) {
		return 1;
	} else {
		return value;
	}
};

Ext.define('Summary',{
	extend: 'Ext.data.Model',
	fields: [
         { name: 'Name', type: 'string' },
         { name: 'FormattedID', type: 'string' },
         { name: 'ObjectID', type: 'int' },
         { name: 'ScheduleState', type: 'string' },
         { name: 'Description', type: 'string' },
         { name: 'AcceptedDate', type: 'date' },
         { name: 'Completeness', type: 'float', defaultValue: 0, min: 0, max: 1, convert: convertAcceptedOrphan },
         { name: 'CountChildren', type: 'int', defaultValue: 0, min: 0 },
         { name: 'CountAcceptedChildren', type: 'int', defaultValue: 0, min: 0 }
    ],
    hasMany: [ { model: 'User Story', name: 'Children' } ],
    addChild: function( child ) {
    	var child_count = this.get('CountChildren') + 1;
    	this.set( 'CountChildren', child_count );
    	if ( child.ScheduleState === "Accepted" ) {
    		var accepted_total = this.get('CountAcceptedChildren') + 1;
    		this.set('CountAcceptedChildren', accepted_total );
    		this.set('Completeness', accepted_total / child_count );
    	}
    	if (this.get('Children')) {
    		var kids = this.get('Children');
    		kids.push(child);
    		this.set('Children', kids );
    	} else {
    		this.set('Children', [ child ] );
    	}
    },
    getFormattedChildren: function() {
    	var formatted_text = null;
    	if ( this.get('Children') ) {
    		var text_array = [];
    		Ext.Array.each( this.get('Children'), function(child) {
    			var tc_count = child.TestCases.length || 0;
    			var child_text = child.FormattedID + ": " + child.Name + " (" + 
    				tc_count + " Test Cases)";
    			text_array.push( child_text );
    		});
    		formatted_text = text_array.join("<br/>");
    	} else {
    		formatted_text = "No children stories";
    	}
    	return formatted_text;
    }
});