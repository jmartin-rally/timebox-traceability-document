var nameRenderer = function(value, metaData, record, rowIndex, colIndex, store, view) {
    var item = record.getData();
    var url = Rally.util.Navigation.createRallyDetailUrl(item);
    var formatted_string = "<a target='_top' href='/#" + url + "'>" + item.FormattedID + "</a>: " + item.Name;
    if ( item.ParentID > 0 ) { 
        formatted_string = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + formatted_string
    }
    return formatted_string;  
};

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    defaults: { margin: 5 },
    items: [ 
            { xtype: 'container', itemId: 'selector_box' },
	        { xtype: 'container', itemId: 'summary_box' } ,
            { xtype: 'container', itemId: 'detail_box' }
    ],
    launch: function() {
        //Write app code here
        this._addSelector();
    	//this._getMarkedStories();
    },
    _addSelector: function() {
        var that = this;
        var range_types = Ext.create('Ext.data.Store',{
            fields: ['name'],
            data: [
            { 'name': 'Iteration' },
            { 'name': 'Release' }
            ]
        });
        this.down('#selector_box').add(Ext.create('Ext.form.ComboBox', {
            fieldLabel: '',
            store: range_types,
            queryMode: 'local',
            displayField: 'name',
            valueField: 'name',
            value: 'Release',
            listeners: {
                change: function( field, newValue, oldValue, opts ) {
                    that._addSubselector(newValue);
                },
                added: function( field, container ) {
                    that._addSubselector(field.getValue());
                }
            }
        }));  
    },
    _addSubselector: function(rangeType) {
        window.console && console.log( "_addSubselector", rangeType );
        var that = this;
        if ( this.subselector ) { 
            this.subselector.destroy();
        }
        
        if ( rangeType == "Iteration" ) {
            this.subselector = Ext.create('Rally.ui.combobox.IterationComboBox',{
                value: null,
                listeners: {
                    ready: function( field ) {
                        that.timebox = field.getRecord().data;
                        that.title = "<strong>Summary Status: " + that.timebox.Name + "</strong>";
                        that._getMarkedStories(rangeType);
                    },
                    change: function( field, newValue, oldValue, eOpts ) {
                        that.timebox = field.getRecord().data;
                        that.title = "<strong>Summary Status: " + that.timebox.Name + "</strong>";
                        that._getMarkedStories(rangeType);
                    }
                }
            });
            this.down('#selector_box').add(this.subselector);
        } else if ( rangeType == "Release" ) {
            this.subselector = Ext.create('Rally.ui.combobox.ReleaseComboBox',{
                value: null,
                listeners: {
                    ready: function( field ) {
                        that.timebox = field.getRecord().data;
                        that.title = "<strong>Summary Status: " + that.timebox.Name + "</strong>";
                        that._getMarkedStories(rangeType);
                    },
                    change: function( field, newValue, oldValue, eOpts ) {
                        that.timebox = field.getRecord().data;
                        that.title = "<strong>Summary Status: " + that.timebox.Name + "</strong>";
                        that._getMarkedStories(rangeType);
                    }
                }
            });
            this.down('#selector_box').add(this.subselector);
        } 
    },
    _clearBoxes: function() {
        Ext.Array.each ( this.down('#summary_box').items.items, function(item) { 
            if ( item ) {  item.hide(); }
        });
        
        Ext.Array.each( this.down('#detail_box').items.items, function(item){
           if (item) { item.hide(); } 
        });
    },
    _getMarkedStories: function(rangeType) {
    	window.console && console.log( "_getMarkedStories", rangeType );
        this._clearBoxes();
        
    	//var filters = [ { property: rangeType + '.Name', operator: '=', value: this.timebox.Name }];
    	this.stories = Ext.create( 'Rally.data.WsapiDataStore', {
    		autoLoad: true,
    		model: 'User Story',
    		//filters: filters,
    		listeners: {
    			load: function(store,data,success) {
    				this._formatData(data);
    			},
    			scope: this
    		},
    		fetch: [ 'Name', 'ScheduleState', 'ObjectID', 'PlanEstimate', 
                'FormattedID', 'AcceptedDate', 'Description', 'Project',
                'TestCases', 'LastVerdict', 'LastRun', 'Children', rangeType ]
    	});
    },
    _formatData: function(data) {
        // given a bunch of parents with their children
        window.console && console.log( "_formatData", data, this.timebox);
        
        var that = this;
        var timebox_type = this.timebox._type[0].toUpperCase() +  this.timebox._type.slice(1);
        var summaries = {};
        Ext.Array.each( data, function(story_shell) {
            var story = story_shell.data;
	        var summary = Ext.create('Summary', story);
	        summary.set('ProjectName', story.Project.Name );
	        summary.addTestCases(story.TestCases);
            summaries[ story.ObjectID ] =  summary ;

            Ext.Array.each( story.Children, function(child) {                
                if ( child[timebox_type] && child[timebox_type].Name === that.timebox.Name ) {
	                // add to parent
	                summary.addChild( child );
	                var child_summary = Ext.create('Summary', child);
	                child_summary.set('ParentID',story.ObjectID);
	                child_summary.set('ProjectName', child.Project.Name );
	                child_summary.addTestCases(child.TestCases);
	                summary.addTestCases(child.TestCases); // also update parent
	                summaries[ child.ObjectID ] = child_summary;
                }
            });
        });
        
        window.console && console.log( 'summaries', summaries );
        
        var sorted_summary = this._hashToArray(summaries);
        
        var store = Ext.create( 'Rally.data.custom.Store', {
            data: sorted_summary
        });
        this._makeSummaryGrid(summaries,store);
    },
    _makeSummaryGrid: function(summaries,store) {
    	window.console && console.log('_makeSummaryGrid');
        var that = this;
        var grid = Ext.create('Rally.ui.grid.Grid', {
            store: store,
            width: 600,
            showPagingToolbar: false,
            columnCfgs: [
                { text: 'Name', dataIndex: 'Name', sortable: false, renderer: nameRenderer, flex: 1 },
                { text: 'Acceptance Rate',
				    xtype: 'templatecolumn',
				    tpl: Ext.create('Rally.ui.renderer.template.PercentDoneTemplate', {
				         percentDoneName: 'CompletenessByPoints'
				    })
                },
                { text: 'Passed Tests',
                    xtype: 'templatecolumn',
                    tpl: Ext.create('Rally.ui.renderer.template.PercentDoneTemplate', {
                         percentDoneName: 'CompletenessByTests'
                    })
                },
                { text: 'Accepted Date', dataIndex: 'AcceptedDate', sortable: false },
                { text: 'Project', dataIndex: 'ProjectName', sortable: false }
            ]
        });

        this.down('#summary_box').add(
            { xtype: 'component', renderTpl: this.title, cls: 'head1', width: 600, padding: 5 } );
        
        this.down('#summary_box').add(grid);
        
        for ( var i in summaries ) {
            if ( summaries.hasOwnProperty(i) ) {
                if ( summaries[i].getData().ParentID == 0 ) {
                    that._makeRequirementBox( summaries[i] );
                }
            }
        }
    },
    _makeRequirementBox: function( requirement ) {
        window.console && console.log( "_makeRequirementBox", requirement );
        var that = this;
        var store = Ext.create('Rally.data.custom.Store', {
            data: [
                { Label: 'Specification:', Value: requirement.get("FormattedID") + ": " + requirement.get("Name" ) },
                { Label: 'Description:', Value: requirement.get("Description")},
                { Label: 'Functional Stories', Value: requirement.getFormattedChildren() }
            ]
        });
        
        var grid = Ext.create('Rally.ui.grid.Grid', {
            width: 710,
            store: store,
            showPagingToolbar: false,
            viewConfig: {
                stripeCols: true,
                plugins: [ new Ext.ux.plugins.grid.stripeCols() ]
            },
            columnCfgs: [
	            { dataIndex: 'Label', sortable: false },
	            { dataIndex: 'Value', sortable: false, flex: 1 }
            ]
        } );
        
        this.down('#detail_box').add(
        { 
            xtype: 'component', 
            renderTpl: "System Requirement", 
            cls: 'head1', 
            width: 710, 
            padding: 5
        });
        this.down('#detail_box').add(grid);
        
        var stories = requirement.get('Children');
        Ext.Array.each(stories, function(story) {
            var test_cases = story.TestCases;
            Ext.Array.each(test_cases, function(test_case) {
                that._makeTestCaseBox(story, test_case);
            });
        });
    },
    _makeTestCaseBox: function(story, test_case) {
        window.console && console.log("_makeTestCaseBox", test_case);  
        var store = Ext.create( 'Rally.data.custom.Store', {
            data: [
            { Label: 'Test Case:', Value: test_case.FormattedID + ": " + test_case.Name },
            { Label: 'Story:', Value: story.FormattedID + ": " + story.Name },
            { Label: 'Test Case Description:', Value: test_case.Description },
            { Label: 'Last Run:', Value: test_case.LastRun + " (" + test_case.LastVerdict + ")" }
            ]
        });
       
        var grid = Ext.create('Rally.ui.grid.Grid', {
            width: 700,
            store: store,
            showPagingToolbar: false,
            viewConfig: {
                stripeCols: true,
                plugins: [ new Ext.ux.plugins.grid.stripeCols() ]
            },
            columnCfgs: [
                { dataIndex: 'Label', sortable: false },
                { dataIndex: 'Value', sortable: false, flex: 1 }
            ]
        } );
        
        this.down('#detail_box').add( { xtype: 'container', margin: 15, itemId: 'x' + test_case.FormattedID });
        
        this.down('#x' + test_case.FormattedID).add(
        { 
            xtype: 'component', 
            renderTpl: "Test Case", 
            cls: 'head1', 
            width: 700, 
            padding: 5
        });
        this.down('#x' + test_case.FormattedID).add(grid);
    },
    _hashToArray: function(hash) {
        var theArray = [];
        for ( var i in hash ) {
            if ( hash.hasOwnProperty(i) ) {
                theArray.push(hash[i]);
            }
        }
        return theArray;
    },
    _hashToArrayByParent: function( summary_hash ) {
        var sorted_array = [];
        
        for ( var id in summary_hash ) {
            if ( summary_hash.hasOwnProperty(id) ) {
                var summary = summary_hash[id];
                if ( summary.getData().ParentID === 0 ) {
                    sorted_array.push( summary );
                    if ( summary.getData().CountChildren > 0 ) {
                        Ext.Array.each( summary.get('Children'), function(child) {
                            if ( child.Parent && summary_hash.hasOwnProperty(child.ObjectID ) ) {
                               sorted_array.push( summary_hash[child.ObjectID]); 
                            }
                        });
                    }
                }
            }
        }

        return sorted_array;
    }
});
