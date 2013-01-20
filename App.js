var nameRenderer = function(value, metaData, record, rowIndex, colIndex, store, view) {
    var item = record.getData();
    var url = Rally.util.Navigation.createRallyDetailUrl(item);
    var formatted_string = "<a href='" + url + "'>" + item.FormattedID + "</a>: " + item.Name;
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
        this._addSubselector("Iteration");
    	//this._getMarkedStories();
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
                        that._getMarkedStories();
                    },
                    change: function( field, newValue, oldValue, eOpts ) {
                        that.timebox = field.getRecord().data;
                        that.title = "<strong>Summary Status: " + that.timebox.Name + "</strong>";
                        that._getMarkedStories();
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
    _getMarkedStories: function() {
    	window.console && console.log( "_getMarkedStories" );
        this._clearBoxes();
        
    	var filters = [ { property: 'Iteration.Name', operator: '=', value: this.timebox.Name }];
    	this.stories = Ext.create( 'Rally.data.WsapiDataStore', {
    		autoLoad: true,
    		model: 'User Story',
    		filters: filters,
    		listeners: {
    			load: function(store,data,success) {
    				this._formatData(data);
    			},
    			scope: this
    		},
    		fetch: [ 'Name', 'ScheduleState', 'Parent', 'ObjectID', 'PlanEstimate', 
                'FormattedID', 'AcceptedDate', 'Description', 'Project',
                'TestCases', 'LastVerdict', 'LastRun' ]
    	});
    },
    _formatData: function(data) {
        // WE ARE ASSUMING THAT ALL CHILDREN ARE IN THE SAME ITERATION/RELEASE.
        window.console && console.log( "_formatData", data );
        var that = this;
        var summaries = {};
        Ext.Array.each( data, function(story_shell) {
            var story = story_shell.data;
            if ( story.Parent ) { 
                var summary = summaries[ story.Parent.ObjectID ] || Ext.create('Summary', story.Parent );
                summary.addChild( story );
                summary.set('ProjectName', story.Project.Name );
                summaries[ story.Parent.ObjectID ] =  summary ;
            } else {
                var summary = Ext.create('Summary', story);
                summary.set('ProjectName', story.Project.Name );
                summaries[ story.ObjectID ] =  summary ;
            }
        });
        
        var store = Ext.create( 'Rally.data.custom.Store', {
            data: this._hashToArray( summaries )
        });
        this._makeSummaryGrid(summaries,store);
    },
    _makeSummaryGrid: function(summaries,store) {
    	window.console && console.log('_makeSummaryGrid');
        var that = this;
        var grid = Ext.create('Rally.ui.grid.Grid', {
            store: store,
            width: 500,
            showPagingToolbar: false,
            columnCfgs: [
                { text: 'Name', dataIndex: 'Name', sortable: false, renderer: nameRenderer, flex: 1 },
                { text: 'Acceptance Rate',
				    xtype: 'templatecolumn',
				    tpl: Ext.create('Rally.ui.renderer.template.PercentDoneTemplate', {
				         percentDoneName: 'CompletenessByPoints'
				    })
                },
                { text: 'Accepted Date', dataIndex: 'AcceptedDate', sortable: false },
                { text: 'Project', dataIndex: 'ProjectName', sortable: false }
            ]
        });

        this.down('#summary_box').add(
            { xtype: 'component', renderTpl: this.title, cls: 'head1', width: 500, padding: 5 } );
        
        this.down('#summary_box').add(grid);
        
        for ( var i in summaries ) {
            if ( summaries.hasOwnProperty(i) ) {
                that._makeRequirementBox( summaries[i] );
            }
        }
    },
    _makeRequirementBox: function( requirement ) {
        window.console && console.log( "_makeRequirementBox" );
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
    }
});
