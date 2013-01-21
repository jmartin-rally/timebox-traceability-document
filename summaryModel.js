/*
 * CompletenessByCount/ByPoints for items that have no children but are
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
         { name: '_ref', type: 'string' },
         { name: 'FormattedID', type: 'string' },
         { name: 'ObjectID', type: 'int' },
         { name: 'ScheduleState', type: 'string' },
         { name: 'Description', type: 'string' },
         { name: 'AcceptedDate', type: 'date' },
         { name: 'PlanEstimate', type: 'float' },
         { name: 'ProjectName', type: 'string', defaultValue: '--' },
         { name: 'ParentID', type: 'int', defaultValue: 0 },
         { name: 'CompletenessByCount', type: 'float', defaultValue: 0, min: 0, max: 1, convert: convertAcceptedOrphan },
         { name: 'CompletenessByPoints', type: 'float', defaultValue: 0, min: 0, max: 1, convert: convertAcceptedOrphan },
         { name: 'CountChildren', type: 'int', defaultValue: 0, min: 0 },
         { name: 'CountTests', type: 'int', defaultValue: 0, min: 0 },
         { name: 'CountPassedTests', type: 'int', defaultValue: 0 },
         { name: 'CompletenessByTests', type: 'float', defaultValue: 0, min: 0, max: 1 },
         { name: 'CountAcceptedChildren', type: 'int', defaultValue: 0, min: 0 },
         { name: 'SumAcceptedChildren', type: 'float', defaultValue: 0, min: 0 }
    ],
    hasMany: [ { model: 'User Story', name: 'Children' }, { model: 'Test Case', name: 'TestCases' } ],
    addTestCases: function( tc_array ) {
    	var that = this;
    	Ext.Array.each( tc_array , function(tc) {that.addTestCase(tc);});
    },
    addTestCase: function( tc ) {
    	var tc_count = this.get('CountTests') + 1;
    	var pass_count = this.get('CountPassedTests');
    	
    	this.set('CountTests', tc_count);
    	if ( tc.LastVerdict === "Pass" ) {
    		pass_count += 1;
    		this.set('CountPassedTests', pass_count );	
    	}
    	this.set('CompletenessByTests', pass_count / tc_count );

    	if ( this.get('TestCases') ) {
    		var tests = this.get('TestCases');
    		tests.push(tc);
    		this.set('TestCases', tests );
    	} else {
    		this.set('TestCases', [tc]);
    	}
    },
    addChild: function( child ) {
    	var child_count = this.get('CountChildren') + 1;
    	this.set( 'CountChildren', child_count );
    	if ( child.ScheduleState === "Accepted" ) {
    		var accepted_total = this.get('CountAcceptedChildren') + 1;
    		var accepted_points = this.get('SumAcceptedChildren');
    		
    		this.set('CountAcceptedChildren', accepted_total );
    		this.set('CompletenessByCount', accepted_total / child_count );
    		if (child.PlanEstimate && child.PlanEstimate > 0 ) { 
    			accepted_points += child.PlanEstimate;
    			this.set('SumAcceptedChildren',accepted_points);
    			this.set('CompletenessByPoints', accepted_points/this.get('PlanEstimate') );
    		}
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