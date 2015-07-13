var Typeahead = Backbone.Typeahead;

var s, app = {
    settings: {
    	applicationId: "uJLDpdzRo0AS07SHiXDRUR6dX2egvU9rKcbHkIMP",
    	applicationKey: "LkeF59Hh5HXrketX8qw6SFWwFALnVu8vqJKwkp5n",
    	// facebookAppId: "890469204379378", // Production
    	facebookAppId: "900908010002164", //Test
    	routes: {
		    "class-list": "listClasses"
	  	}
    },
    init: function() {
        s = this.settings, this.initalizers(), this.bindUiActions();
    },
    initalizers: function() {
    	app.facebookUser = null;
    	app.receiptsFilter = {
			labels         : [],
			texts          : '',
			langs          : [],
			favorites      : false,
			allPublicAcces : false,
			user           : null,
			myPrivate      : false,
			orderBy        : 'updatedAt',
			orderAsc       : 'desc',
			limit          : 21,
			start          : 0
    	};

		window.fbAsyncInit = function() {
		    Parse.FacebookUtils.init({ // this line replaces FB.init({
		      appId      : s.facebookAppId, // Facebook App ID
		      status     : true,  // check Facebook Login status
		      cookie     : true,  // enable cookies to allow Parse to access the session
		      xfbml      : true,  // initialize Facebook social plugins on the page
		      version    : 'v2.3' // point to the latest Facebook Graph API version
		    });
		}

		Parse.initialize(s.applicationId, s.applicationKey);

		var AppRouter = Parse.Router.extend({
			routes: s.routes
		});

		app.Router = new AppRouter();
		Parse.history.start();

		//Models
		app.Receipt         = Parse.Object.extend("Receipt");
		app.Ingredient      = Parse.Object.extend("Ingredient");
		app.IngredientGroup = Parse.Object.extend("IngredientGroup");
		app.LabelGroup      = Parse.Object.extend("LabelGroup");
		app.Label           = Parse.Object.extend("Label");
		app.FacebookUser    = Parse.Object.extend("FacebookUser");

		//Views
		app.EditReceiptView = Backbone.View.extend({
			el       : '#editReceiptPlaceholder',
			template : _.template($('#editReceipt-tmpl').html()),
			events   : {
				'change .name'                 : 'onChangeName',
				'change .description'          : 'onChangeDescription',
				'change .ingredients'          : 'onChangeIngredients',
				'click #btnEditReceiptSave'    : 'onSave',
				'click #btnEditReceiptDiscard' : 'onDiscard'
			},

			initialize: function() {
				this.listenTo(this.model, 'sync change', this.render);
			    this.render();
			    this.renderLabelsGroups();
			},
			render: function() {
				var html = this.template(this.model.toJSON());
				this.$el.html(html);
				return this;
			},
			renderLabelsGroups: function() {
				var currentUser = Parse.User.current();
				var groups = app.labelGroupCollection.models;
				this.labelSelectors = new Array();
				this.$el.find('.labelGroups').empty();
				
				for (var i = 0; i<groups.length; i++) {					
					var glabels = new Array();
					for (var j = 0; j<app.labelCollection.models.length; j++) {
						if (app.labelCollection.models[j].get('labelgroup').id == groups[i].id) {
							glabels.push(app.labelCollection.models[j]);
						}
					};

					glabels = new Parse.Collection(glabels, {
						model: app.Label
					});

					var labelselector = new Backbone.LabelSelector({
						collection   : glabels,
						defaultLabel : {labelgroup: groups[i], user:currentUser}
					});
					var selectedLabels = this.model.get('labels');
					var sLabels = new Array();
					for (var j = 0; j < selectedLabels.length; j++) {
						var l = app.labelCollection.get(selectedLabels[j].id);
						if (l.get('labelgroup').id == groups[i].id) {
							sLabels.push(l);
						}
					};
					labelselector.selectedLabels = sLabels; //TODO

					this.labelSelectors.push(labelselector);

					var element = $('<div class="labelGroup"></div>');
					var item = $(this.$el.find('.labelGroups')).append(element);

					element.append('<label>'+groups[i].get('name')+'</label>');
					element.append('<div class="labelselector-' + groups[i].id + '"></div>');
					labelselector.setElement(element.find('.labelselector-' + groups[i].id)).render();
				}
			},
			onChangeName: function(evt) {
				this.model.set('name', evt.currentTarget.value);
			},
			onChangeDescription: function(evt) {
				this.model.set('description', evt.currentTarget.value);
			},
			onChangeIngredients: function(evt) {
				this.model.set('ingredients', evt.currentTarget.value);
			},
			onSave: function(evt) {
				app.spinnerStart();
				var currentUser = Parse.User.current();

				var selectedLabels = []
				for (var i = this.labelSelectors.length - 1; i >= 0; i--) {
					selectedLabels = _.union(selectedLabels, this.labelSelectors[i].selectedLabels);
				};

				this.model.set('labels', selectedLabels);
				this.model.set('locale', 'HU_hu'); //TODO
				this.model.set('user', currentUser);
				this.model.set('avatar', currentUser.get('avatar'));
				this.model.set('author', currentUser.get('name'));
				var searchMask = this.model.get('name')+' '+this.model.get('description')+' '+this.model.get('ingredients');
				this.model.set('searchMask', app.genSearchMask(searchMask));
				this.model.set('searchMaskStr', this.model.get('searchMask').join(" ") );

				// this.model.save();
				Parse.Object.saveAll(this.model).then(function(model) {
					var labels = model.get('labels'); 
					if (_.isArray(labels) && model.get('labels').length)  {
						var labelsRelation = model.relation('labelRelation');
						labelsRelation.add(model.get('labels'));
						model.save();
					}
					app.loadLabels();
					app.spinnerStop();
					app.viewReceipt(model);
				})
			},
			onDiscard:function() {
				// TODO
			}
		})

		app.ReceiptListItemView = Backbone.View.extend({
			tagName   : 'div',
			className : 'receipt-card col-sm-12 col-md-6 col-lg-4',
			template  : _.template($('#receiptListView-tmpl').html()),
			events : {
				'click .btnRead'    : 'onRead',
			},
			initialize: function() {
				this.listenTo(this.model, "change", this.render);
			},
			render: function() {
				var html = this.template(this.model.toJSON());
				this.$el.html(html);
				return this;
			},
			onRead: function(e) {
				app.editReceipt(this.model);
			}
		});

		app.ReceiptListView = Backbone.View.extend({
			el: '#receiptResultsList',
			initialize: function() {
				this.listenTo(this.collection, 'sync', this.render);
			},
			render: function() {
				var $list = this.$el.empty();
				var counter = 0;
				this.collection.each(function(model) {
					var item = new app.ReceiptListItemView({model: model});
					$list.append(item.render().$el);
					counter++;
					if(counter % 2 == 0) {
						$list.append('<div class="clearfix visible-md-block"></div>');
					}
					if(counter % 3 == 0) {
						$list.append('<div class="clearfix visible-lg-block"></div>');
					}
			    }, this);

				return this;
			}
		});

		// app.LabelView = Backbone.View.extend({

		// });

		app.LabelGroupView = Backbone.View.extend({
			el: '#LabelGroupsViewPlaceholder',
			template: _.template($('#LabelGroupsView-tmpl').html()),

			initialize: function() {
			    this.listenTo(this.collection, 'sync change', this.render);
			    this.render();
			},
			render: function() {
				this.$el.empty();
				this.collection.each(function(model) {
					// var item = new MuppetsListItemView({model: model});
					// $list.append(item.render().$el);
					var item = $("<h6>"+model.get('name')+"</h6>");
					this.$el.append(item);

					var labels = app.labelCollection;
					for (var i = labels.models.length - 1; i >= 0; i--) {
						if (labels.models[i].get('labelgroup').id==model.id) {
					  	// console.log(labels[i]);
						  	var element = '<a class="mdl-navigation__link" href=""><i class="mdl-color-text--light-green-400 material-icons">label</i>'+labels.models[i].get('name')+'</a>';
						  	// item = $(item).after(element);
						  	$(element).insertAfter(item);
						}
					};
			    }, this);

			    return this;
			}
		})

		//start
		app.startUser();
    },
    bindUiActions: function() {
		//Facebook login
		$('.btnSignIn').on('click', function(e){
			app.facebookLogin();
		})

		//Create receipt button
		$('#btnCreateReceipt').on('click', function(e) {
			app.createNewReceipt();
		})

		$('#search').keyup(function (e) {
		    if (e.keyCode == 13) {
				app.receiptsFilter.texts = $(e.target).val();
				app.listReceipts();
		    }
		});
    },
    spinnerStart: function() {
    	$('.appSpinner').addClass('is-active');
    },
    spinnerStop: function() {
    	$('.appSpinner').removeClass('is-active');
    },
    startUser: function() {
    	var currentUser = Parse.User.current();
    	if(currentUser) {

    		//load user data

    		//labels
    		this.loadLabels();
    		//
app.listReceipts();
    		$(".btnSignIn").addClass('hidden');
    		$(".btnLogout").show();
			$('.app-avatar').attr('src',currentUser.get('avatar'));
			$('.app-user-name').html(currentUser.get('name'));
    		
   			// var query = new Parse.Query(app.FacebookUser);
			// query.equalTo("user", Parse.User.current());
			// query.find({
			// 	success: function(results) {
			// 		var fuser = results[0];
			// 		$('.app-avatar').attr('src',fuser.get("picture"));
			// 		$('.app-user-name').html(fuser.get("name"));
			// 	}
			// })
    	}
    	else {
    		$(".btnSignIn").removeClass('hidden');
    		$(".btnLogout").hide();
    	}
    },
    loadLabels: function() {
    	var currentUser = Parse.User.current();
    	var labelGroupQuery = new Parse.Query(app.LabelGroup);
		labelGroupQuery.equalTo("user", currentUser);
		labelGroupQuery.find({
			success: function(labelgroups) {
				app.labelGroupCollection = new Parse.Collection(labelgroups, {model: app.LabelGroup});
				
				for (var j = app.labelGroupCollection.models.length - 1; j >= 0; j--) {
    				var labelQuery = new Parse.Query(app.Label);
		    		labelQuery.equalTo("user", currentUser);
		    		// labelQuery.equalTo("labelgroup", app.labelGroupCollection.models[j]);
		    		labelQuery.find({
		    			success: function(labels) {
		    				app.labelCollection = new Parse.Collection(labels, {model: app.Label});
		    				var labelGroupView = new app.LabelGroupView({collection: app.labelGroupCollection});
		    			}
		    		});
		    	}
			}
		});
    },
    createLabel: function(name, group) {
    	var user = Parse.User.current();
    	label = new app.Label({
    		name: name, 
    		labelgroup: group, 
    		user: user
    	});
    	label.save();
    	this.loadLabels();
    	return label;
    },    
    setFacebookUser: function() {
    	app.spinnerStart();
    	FB.getLoginStatus(function(response) {
		  	if (response && !response.error && response.status === 'connected') {
		    	console.log('Logged in.');
		    	FB.api('/me', {fields: 'id,name,last_name,first_name,gender,picture,link,timezone,updated_time,verified'}, function(response) {
		    		if (response && !response.error) {
					  	console.log('Your name is ' + response.name);
					  	console.log(response);
					  	app.facebookUser = response;
					  	if(app.facebookUser) {
							var fid = app.facebookUser.id
							var query = new Parse.Query(app.FacebookUser);
							query.equalTo("fid", fid);
							query.find({
								success: function(results) {
									var fid = app.facebookUser.id
									var currentUser = Parse.User.current();
							        if (results.length) {
								        // facebook user existing so check update
								        var fuser = results[0];
								        if (fuser.updated_time!=app.facebookUser.updated_time) {
								        	var id = fuser.id;
								        	var fuser = new app.FacebookUser(app.facebookUser);
											fuser.id  = id;
											fuser.set("picture", app.facebookUser.picture.data.url);
											fuser.set("fid",fid);
											fuser.set("user", currentUser);
											fuser.save();

											currentUser.set('avatar', fuser.get('picture'));
											currentUser.save();
								        }
							        }
							        else {
										// facebook user not existing so create
										var fuser = new app.FacebookUser(app.facebookUser);
										fuser.id = null;
										fuser.set("fid",fid);
										fuser.set("picture", app.facebookUser.picture.data.url);
										fuser.set("user", currentUser);
										fuser.save();
										currentUser.set('avatar', fuser.get('picture'));
										currentUser.save();
							        }
							        app.facebookUser.id=fid;
							        app.spinnerStop();
								},
								error: function(error) {
									console.log("Error: " + error.code + " " + error.message);
								}
							});
							$('.app-avatar').attr('src',app.facebookUser.picture.data.url);
							$('.app-user-name').html(app.facebookUser.name);
				    	}
					}
				});
		  	}
		  	else {
		    	app.spinnerStop();
		  	}
		});
    },
    facebookLogin: function() {
    	Parse.FacebookUtils.logIn("public_profile,email,user_birthday,user_hometown,user_location,publish_actions", {
			success: function(user) {
				if (!user.existed()) {
					alert("User signed up and logged in through Facebook!");
				} else {
				  	alert("User logged in through Facebook!");
				}
				app.setFacebookUser();
			},
		  	error: function(user, error) {
		    	alert("User cancelled the Facebook login or did not fully authorize.");
		  	}
		});
    },
    switchLayout: function(layout) {
    	var zones = ['receiptResultsList', 'receiptView', 'editReceipt' ]
    	zones.forEach(function(element, index, array){ 
    		$('#'+element).hide();
    	})

    	var buttons = ['btnCreateReceipt', 'btnEditReceipt'];
    	buttons.forEach(function(element, index, array){ 
    		$('#'+element).hide();
    	})
    	
    	switch(layout) {
	    	case 'list':
		    	$('#receiptResultsList').show();
		    	$('#btnCreateReceipt').show();
		    	break;
		    case 'view':
			    $('#receiptView').show();
			    $('#btnEditReceipt').show();
		    	break;	
	    	case 'edit':
		    	$('#editReceipt').show();
	    		break;
    	}

    },
    listReceipts: function() {
    	var qReceipt = new Parse.Query(app.Receipt);
		var currentUser = Parse.User.current();
		//keywords
		if (app.receiptsFilter.texts!='') {
			var keywords = app.receiptsFilter.texts.split(' ');
	    	if (Array.isArray(keywords) && keywords.length) {
	   //  		keywords = _.uniq(app.genSearchMask(keywords.join(' ')));
				// qReceipt.containsAll('searchMask', keywords);
	    	
	    		var re = ""
	    		for (var i = 0; i < keywords.length; i++) {
	    			keywords[i] = app.genSearchMask(keywords[i]);
	    			if (i == 0) 
	    				re += "(.*"+keywords[i]+".*)"
	    			else 
	    				re += "|(.*"+keywords[i]+".*)"
	    		};
				qReceipt.matches("searchMaskStr", re);

	    	}
		}


    	//labels
    	var labels = app.receiptsFilter.labels;
		if (Array.isArray(labels) && labels.length) {
			var qLabels = new Parse.Query(app.Label);
			qLabels.containsAll("label", labels);
			qReceipt.matchesKeyInQuery("label", qLabels);
		}

		if(app.receiptsFilter.allPublicAcces == false) {
			// qReceipt.include('user');
			qReceipt.equalTo('user', currentUser);
		}
		else {
			//TODO set public filter
		}

		if(app.receiptsFilter.user != null) {
			// qReceipt.include('user');
			qReceipt.equalTo('user', currentUser);	
		}
		
		if(app.receiptsFilter.myPrivate) {
			// qReceipt.include('user');
			qReceipt.equalTo('user', currentUser);
			//TODO private filter	
		}

    	var limit = (app.receiptsFilter.limit)?app.receiptsFilter.limit:21;
		qReceipt.limit(limit);

		if (app.receiptsFilter.orderBy) {
			qReceipt.descending(app.receiptsFilter.orderBy); 
		}

		app.spinnerStart();
		qReceipt.find().then(function (list) {
		    // use list
		    app.renderReceiptList(new Parse.Collection(list,{model:app.Receipt}));
		    app.spinnerStop();
		}, function (error) {
		    console.log(error);
		});
    },
    createNewReceipt: function() {
    	var currentUser = Parse.User.current();
    	newReceipt = new app.Receipt({
			name        :'new receipt name',
			description : 'description',
			ingredients : 'ingredients',
			user        : currentUser,
			avatar      : currentUser.get('avatar'),
			author      : currentUser.get('name'),
			labels      : new Array()
    	});

    	app.editReceipt(newReceipt);
    },
    editReceipt: function(receipt) {
    	editReceiptView = new app.EditReceiptView({model: receipt});
    	app.switchLayout('edit');
    },
    viewReceipt: function(receipt) {
    	return;

    	receiptView = new app.ReceiptView({model: receipt});
    	app.switchLayout('viewReceipt');
    },
    genSearchMask: function(text) {
    	text = text.toLowerCase();
    	var re = /[^A-Za-z\ ]/g;
		return _.uniq(text.replace(re, '').replace(/(.)\1{1,}/g, '$1').split(' '));
	},
	renderReceiptList: function(receiptList) {
		var receiptListView = new app.ReceiptListView({collection: receiptList});
		receiptListView.render();
	}
}

		
