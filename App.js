var nameRenderer = function(value, metaData, record, rowIndex, colIndex, store, view) {
    var item = record.getData();
    var url = Rally.util.Navigation.createRallyDetailUrl(item);
    var formatted_string = "<a target='_top' href='" + url + "'>" + item.FormattedID + "</a>: " + item.Name;
    if ( item.ParentID > 0 ) { 
        formatted_string = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + formatted_string
    }
    return formatted_string;  
};
var logme = function() {
    window.console && console.log( "-----", new Date(), "-----" );
    Ext.Array.each( arguments, function(msg) {
        window.console && console.log( "..", msg );
    });
};

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    defaults: { margin: 5 },
    items: [ 
            { xtype: 'container', itemId: 'selector_box', defaults: { margin: 5 }, layout: { type: 'hbox' } },
	        { xtype: 'container', itemId: 'summary_box' } ,
            { xtype: 'container', itemId: 'detail_box' }
    ],
    detail_counter: 0,
    launch: function() {
        //App starts here
        this._addPackageSelector();
        this._addDetailsButton();
    },
    _addDetailsButton: function() {
        var that = this;
        this.details_button = Ext.create('Rally.ui.Button',{
            text: 'Print Details',
            disabled: true,
            handler: function() {
                this.disable();
                that._buildDetailsData();
                //that._makeDetailsBox();
            }
        });
        this.down('#selector_box').add(this.details_button);
    },
    _addPackageSelector: function() {
        logme("_addPackageSelector");
        var that = this;
        var rangeType = "Package";
        
        if ( this.subselector ) { 
            this.subselector.destroy();
        }
        
        this.subselector = Ext.create('Rally.ui.combobox.AttributeComboBox',{
            value: "Package ITCR 1.4",
            model: 'UserStory',
            field: 'Package',
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
    },
    _addTimeboxSelectors: function() {
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
        logme( "_addSubselector", rangeType );
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
    	logme( "_getMarkedStories", rangeType, this.timebox );
        this._clearBoxes();
        this.details_button.disable();
        var filters = [{property: 'ObjectID', operator: ">", value: 0 }];
        if (rangeType === "Package") {
            filters = [{property:'Package', operator: '=', value: this.timebox.name }];
        }
    	//var filters = [ { property: rangeType + '.Name', operator: '=', value: this.timebox.Name }];
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
    		fetch: [ 'Name', 'ScheduleState', 'ObjectID', 'PlanEstimate', 
                'FormattedID', 'AcceptedDate', 'Description', 'Project',
                'TestCases', 'LastVerdict', 'LastRun', 'Children', rangeType ]
    	});
    },
    _formatData: function(data) {
        // given a bunch of parents with their children
        logme( "_formatData", data, this.timebox);
        
        var that = this;
        var timebox_type = "Package";
        var timebox_value = this.timebox.name;
        
        if ( this.timebox._type ) {
            this.timebox._type[0].toUpperCase() +  this.timebox._type.slice(1);
            timebox_value = this.timebox.Name;
        }
        var summaries = {};
        
        Ext.Array.each( data, function(story_shell) {
            var story = story_shell.data;
	        var summary = Ext.create('Summary', story);
	        summary.set('ProjectName', story.Project.Name );
	        summary.addTestCases(story.TestCases);
            summaries[ story.ObjectID ] =  summary ;
            

            Ext.Array.each( story.Children, function(child) {                
                if ( child[timebox_type] && ( child[timebox_type].Name === timebox_value || child[timebox_type] === timebox_value )) {
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
        
        logme( 'summaries', summaries );
        
        var sorted_summary = this._hashToArray(summaries);
        this._makeSummaryGrid(sorted_summary);
        
        this.summaries = summaries;
        if ( data.length > 0 ) { 
            this.details_button.enable();
        }
        
    },
    _getBaseURL: function() {
        var base_url = this.getContext().getWorkspace()._ref.replace(/slm[\w\W]*/,"");
        return base_url;
    },
    _buildDetailsData: function() {
        var rows = [];
        var prefix = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
        
        if ( this.summaries ) {
            for ( var i in this.summaries ) {
                if ( this.summaries.hasOwnProperty(i) ) {
                    var summary = this.summaries[i];
                    if ( summary.get("ParentID") === 0 ) {
	                    logme( summary.get("FormattedID") );
	                    rows.push({ 
	                        Label: summary.get("FormattedID") + ": " + summary.get("Name" ) , 
	                        Value: "",
                            Cut: true
	                    });
	                    rows.push({
	                        Label: prefix + 'Description:', 
	                        Value: summary.get("Description")
	                    });
	                    rows.push({
	                        Label: prefix + 'Functional Stories:', 
	                        Value: summary.getFormattedChildren() 
	                    });
	                    
	                    var children = summary.get('Children');
				        Ext.Array.each(children, function(child) {
				            var test_cases = child.TestCases;
				            Ext.Array.each(test_cases, function(test_case) {         
                                rows.push({ Label: prefix + 'Test Case', Value: "" });
                                rows.push({ Label: prefix + prefix + 'ID:', Value: test_case.FormattedID + ": " + test_case.Name });
					            rows.push({ Label: prefix + prefix + 'Story:', Value: child.FormattedID + ": " + child.Name });
					            rows.push({ Label: prefix + prefix +  'Test Description:', Value: test_case.Description });
					            rows.push({ Label: prefix + prefix +  'Last Run:', Value: test_case.LastRun + " (" + test_case.LastVerdict + ")" });
				            });
				        });
                    }
                }
            }
        }
        //this._makeDetailsGrid(rows);
        this._makeDetailsForPrint(rows);
    },
    _makeDetailsForPrint: function(rows) {
        logme( "_makeDetailsForPrint" );
        var that = this;
        this.hidden_window = Ext.create( 'Ext.window.Window', {
            title: '',
            width: 1048,
            overflowX: 'hidden',
            layout: 'fit',
            items: [ 
                { xtype: 'component', html: '<b><i>Please Wait While I Build the Page...</b></i>' } , 
                { xtype: 'container', itemId: 'grid_box' } 
            ]
        }).show();
        
        // doing this text stuff because too many container elements kills the browser
        var html = "";
        Ext.Array.each( rows, function(row) {
            if ( row.Cut ) { html += "<hr/>"; }
            html += "<div style='display:table'>";
            
            html += "<div class='pxs-no-break pxs-print-cell' style='display:table-cell;width:200px'>" + row.Label + "</div>";
            html += "<div class='pxs-no-break pxs-print-cell' style='display:table-cell;'>" + row.Value + "</div>";
            html += "<div class='x-clear'></div>";
            html += "</div>";
        });
        this.hidden_window.down('#grid_box').add( { xtype: 'container', html: html } );
        this._printWindow();
        
    },
    _makeDetailsGrid: function(rows) {
        var that = this;
        this.hidden_window = Ext.create( 'Ext.window.Window', {
            title: '',
            width: 1048,
            overflowX: 'hidden',
            layout: 'fit',
            items: [ 
                { xtype: 'component', html: '<b><i>Please Wait While I Build the Page...</b></i>' } , 
                { xtype: 'container', itemId: 'grid_box' } 
            ]
        }).show();
        
        var grid = Ext.create('Rally.ui.grid.Grid', {
            overflowX: 'hidden',
            margin: 5,
            layout: 'fit',            
            store: Ext.create('Rally.data.custom.Store', { data: rows, pageSize: 2000 }),
            showPagingToolbar: false,
            columnCfgs: [
                { dataIndex: 'Label', sortable: false, flex: 1 },
                { dataIndex: 'Value', sortable: false, flex: 3 }
            ],
            listeners: {
                viewready: function( grid, options ) {
                    that._printWindow();
                }
            }
        });
        
        this.hidden_window.down('#grid_box').add(grid);
    },
    _makeDetailsBox: function() {
        this.hidden_window = Ext.create( 'Ext.window.Window', {
            title: '',
            width: 1048,
            overflowX: 'hidden',
            layout: 'fit',
            items: [ 
                { xtype: 'component', html: '<b><i>Please Wait While I Build the Page...</b></i>' } , 
                { xtype: 'container', itemId: 'grid_box' } 
            ]
        }).show();
        
        this.detail_counter = 0;
        
        if ( this.summaries ) {
            var summaries = this.summaries;
	        for ( var i in summaries ) {
	            if ( summaries.hasOwnProperty(i) ) {
	                if ( summaries[i].getData().ParentID == 0 ) {
                        this.detail_counter++;
	                    this._makeRequirementBox( summaries[i], this.hidden_window.down('#grid_box') );
	                }
	            }
	        }
        }                     
    },
    _printWindow: function() {
        var print_window = window.open('','', 'width=1100,height=200');
        print_window.focus();
        print_window.document.write( '<html><head>');
        print_window.document.write('<title>Print</title>');
        print_window.document.write('<link rel="Stylesheet" type="text/css" href="' + this._getBaseURL() + 'apps/2.0p5/rui/resources/css/rui.css" />');
        print_window.document.write('<style type="text/css">');
        print_window.document.write('.pxs-no-break    { page-break-inside:avoid; page-break-after:auto }');
        print_window.document.write('.pxs-print-section { margin: 5px; padding: 5px; } ');
        print_window.document.write('.pxs-print-cell { margin: 5px; padding: 5px; }' );
        print_window.document.write('</style>');
        
        print_window.document.write('</head>');
        print_window.document.write('<body>');
        print_window.document.write( this.hidden_window.down('#grid_box').getEl().getHTML() );
        print_window.document.write('</body>');
        print_window.document.write('</html>'); 
        
        this.hidden_window.hide();
        print_window.print();
        print_window.close();
        this.details_button.enable();
    },
    _makeSummaryGrid: function(summaries) {
    	logme('_makeSummaryGrid');
        var that = this;
        var store = Ext.create( 'Rally.data.custom.Store', {
            data: summaries,
            pageSize: 400,
            autoLoad: true
        });
        
        var grid = Ext.create('Rally.ui.grid.Grid', {
            store: store,
            width: 600,
            autoShow: true,
            autoRender: true,
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
                { text: 'Accepted Date', dataIndex: 'AcceptedDate', sortable: false }
            ]
        });

        this.down('#summary_box').add(
            { xtype: 'component', renderTpl: this.title, cls: 'head1', width: 600, padding: 5 } );
        
        this.down('#summary_box').add(grid);
        grid.show();
       
    },
    _makeRequirementBox: function( requirement, target_container ) {
        logme( "_makeRequirementBox" );
        var that = this;
        var store = Ext.create('Rally.data.custom.Store', {
            data: [
                { Label: 'Specification:', Value: requirement.get("FormattedID") + ": " + requirement.get("Name" ) },
                { Label: 'Description:', Value: requirement.get("Description")},
                { Label: 'Functional Stories', Value: requirement.getFormattedChildren() }
            ]
        });
        
        var grid = Ext.create('Rally.ui.grid.Grid', {
	        overflowX: 'hidden',
	        margin: 5,
	        layout: 'fit',            
            store: store,
            showPagingToolbar: false,
            viewConfig: {
                stripeCols: true,
                plugins: [ new Ext.ux.plugins.grid.stripeCols() ]
            },
            columnCfgs: [
	            { dataIndex: 'Label', sortable: false },
	            { dataIndex: 'Value', sortable: false, flex: 1 }
            ],
            listeners: {
                            viewready: function( grid, options ) {
                                that.detail_counter = that.detail_counter - 1;
                                logme( "Counter: " + that.detail_counter );
                                if ( that.detail_counter < 1 ) {
                                    that._printWindow();
                                }
                            }
            }
        } );
        
        target_container.add(
        { 
            xtype: 'component', 
            renderTpl: "System Requirement", 
            cls: 'head1', 
            width: 710, 
            padding: 5
        });
        target_container.add(grid).show();
        
        var stories = requirement.get('Children');
        Ext.Array.each(stories, function(story) {
            var test_cases = story.TestCases;
            Ext.Array.each(test_cases, function(test_case) {
                that._makeTestCaseBox(story, test_case, target_container);
            });
        });
    },
    _makeTestCaseBox: function(story, test_case, target_container) {
        logme("_makeTestCaseBox", test_case); 
        var that = this;
        this.detail_counter++;
        
        var store = Ext.create( 'Rally.data.custom.Store', {
            data: [
            { Label: 'Test Case:', Value: test_case.FormattedID + ": " + test_case.Name },
            { Label: 'Story:', Value: story.FormattedID + ": " + story.Name },
            { Label: 'Test Description:', Value: test_case.Description },
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
            ],
            listeners: {
                            viewready: function( grid, options ) {
                                that.detail_counter = that.detail_counter - 1;
                                logme( "Counter (after tc box): " + that.detail_counter );
                                if ( that.detail_counter < 1 ) {
                                    that._printWindow();
                                }
                            }
            }
        } );
        
        target_container.add( { xtype: 'container', margin: 15, itemId: 'x' + test_case.FormattedID });
        
        target_container.down('#x' + test_case.FormattedID).add(
        { 
            xtype: 'component', 
            renderTpl: "Test Case", 
            cls: 'head1', 
            width: 700, 
            padding: 5
        });
        target_container.down('#x' + test_case.FormattedID).add(grid).show();
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
