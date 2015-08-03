(function(Backbone, _, $) {
  'use strict';

	var LabelSelector = function(models, options) {
		if (_.isArray(models)) {
	      	// It is copied to prevent overwrite
	      	// TODO this copy may be unnecessary
	     	models = models.slice(0);
	      	if (!_.isObject(options)) {options = {};}
	    } else if (_.isObject(models)) {
	      	options = models;
	      	// TODO Should also error if no collection was provided in options
	    } else {
	      	throw new Error('A typeahead must be created with either initial models or have its collection specified in an options object');
	    }
		// Initialize
	    this.preInitialize.call(this, models, options);
	    Backbone.View.call(this, options);
	    this.postInitialize();
	}

	LabelSelector.VERSION = '0.2.1';
	LabelSelector.extend = Backbone.View.extend;

	LabelSelector.LabelView = Backbone.View.extend({
	    tagName: 'span',
	    events: {
	        'click': 'removeLabel',
	    },
	    initialize: function(options) {
	        // A reference to the parent view (aka the LabelSelector) is required
	        this.parent = options.parent;
	    },
	    render: function() {
	        // TODO Template should be cached
	        this.$el.html(_.template(this.template)(this.model.toJSON()));
	        this.$el.attr("class", this.design);
	        return this;
	    },
	    // TODO Or use triggers instead?
	    removeLabel: function() {
	        this.parent.removeLabel(this.model);
	    },
	});

	_.extend(LabelSelector.prototype, Backbone.View.prototype, {
		template: '<span class="labels"></span><span class="typeahead"></span>',
		preInitialize: function(models, options) {
			options.key = options.key || 'name';
			this.selectedLabels = new Array();

			if (_.isUndefined(options.collection) && _.isArray(models)) {
				options.collection = new Backbone.Collection(models, options);
			}
			// Attach native events, deferring to custom events
			// this.events = _.extend({}, this.nativeEvents, _.result(this, 'events'));

			this.labelView = LabelSelector.LabelView.extend({
	            // Dynamically construct a template with the key
	            template: options.labelTemplate || '<%= ' + options.key + ' %>',
	            //set css classes
	            design:   options.labelClass || "label label-success"
	        });

			// Backbone 1.1 no longer binds options to this by default
			this.options = options;

			// Typeahead
			this.typeahead = new Backbone.Typeahead(this.options);
			this.typeahead.labelSelector = this;
			this.typeahead.keyup = function(evt) {
		      switch(evt.keyCode) {
		        case 40: // Down arrow
		        case 38: // Up arrow
		        case 16: // Shift
		        case 17: // Ctrl
		        case 18: // Alt
		          break;
		        // case 9: // Tab - disabled to prevent rogue select on tabbed focus
		        // TODO tab should also leave focus
		        case 13: // Enter
		          // TODO shown needs to be returned to its original function (as an
		          // indicator of whether the menu is currently displayed or not)
		          if (!this.shown) {
		          	this.trigger('newitem', this.$input.val(), this.collection);
		          	return;
		          }
		          this.select();
		          break;
		        case 27: // escape
		          if (!this.shown) {return;}
		          this.hide();
		          break;
		        default:
		          this.searchInput();
		      }
		      evt.stopPropagation();
		      evt.preventDefault();
		    };
			
			this.typeahead.on('selected', function(label) {
				this.clearInput();
				this.labelSelector.selectedLabels.push(label);
				this.labelSelector.renderLabels(this.labelSelector.selectedLabels);
				this.labelSelector.refreshTypeaheadCollection();
				this.labelSelector.trigger('selected', label, this.labelSelector.selectedLabels, this.collection);
			});
			this.typeahead.on('newitem', function(name) {
				var newLabel = this.labelSelector.createLabel(name);
				this.labelSelector.selectedLabels.push(newLabel);
				this.labelSelector.renderLabels(this.labelSelector.selectedLabels);
				this.labelSelector.refreshTypeaheadCollection();
				this.labelSelector.trigger('selected', newLabel, this.labelSelector.selectedLabels, this.collection);
			});
		},
		postInitialize: function() {
			
		},
	    render: function() {
	      this.$el.html(this.template);
	      this.$labels = this.$('span.labels');
	      this.$typeahead = this.$('span.typeahead');

	      this.renderLabels(this.selectedLabels);
	      this.renderTypeahead();

	      return this;
	    },
	    renderLabels: function(labels) {
	    	this.$labels.empty();
	    	for (var i = 0; labels.length>i; i++) {
	    		this.renderLabelModel(labels[i])
	    	};
	    },
	    renderLabelModel: function(model) {
	        // TODO Do not re-render views?
	        this.$labels.append((new this.labelView({model: model, parent: this})).render().el);
	    },
	    renderTypeahead: function() {
	    	this.typeahead.setElement(this.$typeahead).render();
	    },
	    refreshTypeaheadCollection: function() {
	    	this.typeahead.collection = this.options.collection;
	    	this.typeahead.collection = new Parse.Collection(this.options.collection.models);

			for (var i = 0; i < this.selectedLabels.length; i++) {
				this.typeahead.collection.remove(this.selectedLabels[i]);
			};
			this.typeahead.render();
	    },
	    removeLabel: function(label) {
	    	var index = this.selectedLabels.indexOf(label)
			if (index > -1) {
			    this.selectedLabels.splice(index, 1);
			}
			this.renderLabels(this.selectedLabels);
			this.refreshTypeaheadCollection();
	    },
	    createLabel: function(name) {
	    	var newLabel =  new this.options.collection.model(this.options.defaultLabel);
	    	newLabel.set('name', name);
	    	this.options.collection.add(newLabel);
	    	return newLabel;
	    }

	});

	Backbone.LabelSelector = LabelSelector;

})(Backbone, _, $);