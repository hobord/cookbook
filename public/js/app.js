// var Typeahead = Backbone.Typeahead;

var s, app = {
    settings: {
    	applicationId: "uJLDpdzRo0AS07SHiXDRUR6dX2egvU9rKcbHkIMP",
    	applicationKey: "LkeF59Hh5HXrketX8qw6SFWwFALnVu8vqJKwkp5n",
    	// facebookAppId: "890469204379378", // Production
    	// facebookAppId: "900908010002164", //Test
    	facebookAppId: "905249916234640", //Test
    	AWSAccessKeyId: "AKIAJ5EPMLPXAQVXTNPQ",
    	amazonBucket: "cookbookimg"
    },
    templates: {
    	'application'          : '#application-tmpl',
		'viewRecipe'           : '#viewRecipe-tmpl',
		'editRecipe'           : '#editRecipe-tmpl',
		'recipeListItem'       : '#recipeListItem-tmpl',
		'navigationLabel'      : '#navigationLabel-tmpl',
		'navigationLabelGroup' : '#navigationLabelGroup-tmpl',
    },
    labelCollection: null,
    loginedUser: null, //User.labelCollection = null
    viewUser: null,
	recipeView: null,
	editRecipeView: null,
	recipeListView: null,
    init: function() {
        s = this.settings, this.initalizers(), this.bindUiActions();
    },
    initalizers: function() {
    	this.loadTemplates();
    	
    	this.detectedLang = (navigator.languages? navigator.languages[0] : (navigator.language || navigator.userLanguage)).substr(0,2);
    	if (app.TDict[this.detectedLang]) {
			app.TDict = underi18n.MessageFactory(app.TDict[this.detectedLang]);
    	} else {
			app.TDict = underi18n.MessageFactory('en');
    	}

		this.applicationView  = new this.ApplicationView();

		app.loginedUser = null;
    	this.facebookUser = null;
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

		// Models
		this.Recipe          = Parse.Object.extend("Recipe");
		this.Ingredient      = Parse.Object.extend("Ingredient");
		this.IngredientGroup = Parse.Object.extend("IngredientGroup");
		this.LabelGroup      = Parse.Object.extend("LabelGroup");
		this.Label           = Parse.Object.extend("Label");
		this.FacebookUser    = Parse.Object.extend("FacebookUser");

		// Views
		this.recipeView = null;
		this.editRecipeView = null;

		this.listedRecipes = new Parse.Collection( [], { model : app.Recipe } );
		this.recipesFiltermanager = new app.RecipesFiltermanager();
		this.recipesFiltermanagerView = new app.RecipesFiltermanagerView({model: app.recipesFiltermanager});
		//start
		this.startUser();

		this.router = new app.AppRouter();
		// AppRouter.history.start();
		Backbone.history.start();

    },
    loadTemplates: function() {
    	_.each(this.templates, function(item, key){
    		this.templates[key] = $(item).html();
    		$(item).remove();
    	}, this);
    },
    bindUiActions: function() {
		//Facebook login
		$('.btnSignIn').click(function(e){
            Parse.FacebookUtils.logIn("public_profile,email,user_birthday,user_hometown,user_location,publish_actions", {
				success: function(user) {
				    if (!user.existed()) {
				      // alert("User signed up and logged in through Facebook!");
				    } else {
				        // alert("User logged in through Facebook!");
				    }
				    app.setFacebookUser();
				},
				error: function(user, error) {
					// alert("User cancelled the Facebook login or did not fully authorize.");
				}
            });
		})

		//Create recipe button
		$('#btnCreateRecipe').on('click', function(e) {
			app.createNewRecipe();
		})

		$('#search').keyup(function (e) {
		    if (e.keyCode == 13) {
				app.recipesFiltermanager.set( { text: $(e.target).val() }, { validate:true } );
				app.switchLayout('list');
				app.recipesFiltermanager.search();
		    }
		});

		$('.cmdListMyRecipes').on('click', function(e) {
			if (app.loginedUser) {
				app.recipesFiltermanager.set( { user: app.loginedUser }, { validate:true } );
				app.router.navigate("/u/"+app.loginedUser.get('name')+"-"+app.loginedUser.id, {trigger: false});
				app.switchLayout('user');
				app.recipesFiltermanager.search();
			}
			return false;
		});

		$('.cmdListAllRecipes').on('click', function(e) {
			app.recipesFiltermanager.set( { user: null }, { validate:true } );
			app.router.navigate("/", {trigger: false});
			app.switchLayout('list');
			app.recipesFiltermanager.search();
		
			return false;
		});
		$('.cmdListFavoritedRecipes').on('click', function(e) {
			app.recipesFiltermanager.set( { user: null }, { validate:true } );
			app.router.navigate("/", {trigger: false});
			app.switchLayout('list');
			app.recipesFiltermanager.search();
		
			return false;
		});
    },
    spinnerStart: function() {
    	$('.appSpinner').addClass('is-active');
    },
    spinnerStop: function() {
    	$('.appSpinner').removeClass('is-active');
    },

    startUser: function() {
    	app.loginedUser = Parse.User.current();
    	if(app.loginedUser) {

    		//load user data
    		this.loadUserData(app.loginedUser);
    		//labels
    		//
    		$(".btnSignIn").addClass('hidden');
    		// $('.cmdListFavoritedRecipes').removeClass('hidden');
    		// $('.cmdListMyRecipes').removeClass('hidden');
    		$(".btnLogout").show();
    		$(".app-navigation .loginedUser").show();
    		
    	}
    	else {
    		$(".btnSignIn").removeClass('hidden');
    		// $('.cmdListFavoritedRecipes').addClass('hidden');
    		// $('.cmdListMyRecipes').addClass('hidden');
    		$(".btnLogout").hide();
    		$(".app-navigation .loginedUser").hide();
    	}
    },
    loadUserData: function(user) {
		this.loadLabels(app.loginedUser);
		var query = new Parse.Query(Parse.User);
		query.get(user.id, {
			success: function(user) {
			// The object was retrieved successfully.
				app.loginedUser = user;
				app.loadLabels(user);
				$('.app-avatar').attr('src',app.loginedUser.get('avatar'));
				$('.app-user-name').html(app.loginedUser.get('name'));

			},
			error: function(object, error) {
			// The object was not retrieved successfully.
			// error is a Parse.Error with an error code and message.
				console.log(error);
			}
		});
    },
    loadLabels: function(filterUser) {
    	var labelGroupQuery = new Parse.Query(app.LabelGroup);
		labelGroupQuery.equalTo("user", filterUser);
		labelGroupQuery.find({
			success: function(labelgroups) {
				var currentUser = Parse.User.current();
				app.labelGroupCollection = new Parse.Collection(labelgroups, {model: app.LabelGroup});
				
				if (app.loginedUser && labelgroups.length && currentUser && ( labelgroups[0].get('user').id == currentUser.id  )) {
					app.loginedUser.labelGroups = new Parse.Collection(labelgroups, {model: app.LabelGroup});
				}

				$(app.NavigationLabelGroupView.prototype.el).empty(); //#LabelGroupsViewPlaceholder'
				// for (var j = app.labelGroupCollection.models.length - 1; j >= 0; j--) {
    				var labelQuery = new Parse.Query(app.Label);
		    		labelQuery.equalTo("user", filterUser);
		    		labelQuery.find({
		    			success: function(labels) {
		    				app.labelCollection = new Parse.Collection(labels, {model: app.Label});
		    				var navigationLabelGroupView = new app.NavigationLabelGroupView({collection: app.labelGroupCollection});
		    				app.recipesFiltermanager.set('labels',[]);

		    				if (labels.length && currentUser && ( labels[0].get('user').id == currentUser.id  )) {
								app.loginedUser.labelCollection = new Parse.Collection(labels, {model: app.Label});
							}
		    				// app.recipesFiltermanager.search();
		    			}
		    		});
		    	// }
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
							app.startUser();
				    	}
					}
				});
		  	}
		  	else {
		    	app.spinnerStop();
		  	}
		});
    },
    switchLayout: function(layout) {
    	var zones = ['recipeResultsList', 'viewRecipe', 'editRecipe' ]
    	zones.forEach(function(element, index, array){ 
    		$('#'+element).hide();
    	})

    	var buttons = ['btnCreateRecipe', 'btnEditRecipe'];
    	buttons.forEach(function(element, index, array){ 
    		$('#'+element).hide();
    	})
    	
    	switch(layout) {
    		case 'user':
		    	$('#recipeResultsList').show();
		    	$('#btnCreateRecipe').show();
		    	if (app.recipesFiltermanager.get('user')) {
			    	$('.mdl-layout-title').html(app.recipesFiltermanager.get('user').get('name'));
		    	}
		    	else {
		    		$('.mdl-layout-title').html('');	
		    	}

		    	break;
	    	case 'list':
	    		app.router.navigate( "/", { trigger: false } );
		    	$('#recipeResultsList').show();
		    	$('#btnCreateRecipe').show()
		    	if (app.recipesFiltermanager.get('user')) {
			    	$('.mdl-layout-title').html(app.recipesFiltermanager.get('user').get('name'));
		    	}
		    	else {
		    		$('.mdl-layout-title').html('');	
		    	}
		    	break;
		    case 'view':
			    $('#viewRecipe').show();
			    $('#btnCreateRecipe').show();
			    $('.mdl-layout-title').html(app.recipeView.model.get('name'));
		    	break;	
	    	case 'edit':
		    	$("main").scrollTop();
		    	$('#editRecipe').show();
		    	$('.mdl-layout-title').html(app.recipeView.model.get('name'));
	    		break;
    	}

    },

    createNewRecipe: function() {
    	var currentUser = Parse.User.current();
    	newRecipe = new app.Recipe({
			name          :'new recipe name',
			coverImageUrl : '',
			description   : 'description',
			ingredients   : 'ingredients',
			directions    : 'directions',
			user          : currentUser,
			labels        : new Array(),
			private       : false
    	});

    	app.editRecipe(newRecipe);
    },
    cloneRecipe: function(orig) {
    	var currentUser = Parse.User.current();
    	newRecipe = new app.Recipe({
			name          : orig.get('name'),
			coverImageUrl : orig.get('coverImageUrl'),
			description   : orig.get('description'),
			ingredients   : orig.get('ingredients'),
			directions    : orig.get('directions'),
			user          : currentUser,
			labels        : new Array(),
			private       : false
    	});
    	return newRecipe;
    },
    editRecipe: function(recipe) { 
    	this.editRecipeView = new app.EditRecipeView({model: recipe});
    	app.switchLayout('edit');
    },
    viewRecipe: function(recipe) {
    	app.router.navigate( "/recipe/"+app.genUrlName(recipe.get('name'))+"-"+recipe.id, { trigger: false } );
    	this.recipeView = new app.RecipeView({model: recipe});
    	app.switchLayout('view');
    },
    genSearchMask: function(text) {
    	text = text.toLowerCase();
    	var re = /[^A-Za-z\ ]/g;
		return _.uniq(text.replace(re, '').replace(/(.)\1{1,}/g, '$1').split(' '));
	},
	genUrlName:function(text) {
		return text.replace(/\-/g, '_');
	},
	renderRecipeList: function(recipeList) {
		this.recipeListView = new app.RecipeListView({collection: recipeList});
		this.recipeListView.render();
	}
}


// Filter Manager ==========================================================================================================

	app.RecipesFiltermanager = Backbone.Model.extend({
		defaults: {
			labels         : [],
			text           : '',
			lang           : [],
			favorites      : false,
			user           : null,
			orderBy        : 'updatedAt',
			orderAsc       : 'desc',
			limit          : 21,
			start          : 0
	    },
	    validate: function(attrs) {
	    	if ( _.has(attrs,"user") ) {
				app.loadLabels(attrs.user);

				if(attrs.user) {
					$('.filter-user-avatar').attr('src',attrs.user.get('avatar'));
					$('.filter-user-name').html(attrs.user.get('name'));
				}
				else {
					// $('.filter-user-avatar').attr('src','images/user.png');
					$('.filter-user-avatar').attr('src','/icon_512.png');
					$('.filter-user-name').html('');
				}

				if(attrs.user==null) {
					this.set('labels', []);
				}
			}
	  	},
		addLabel: function(label) {
			var labels = this.get('labels');
			var index = _.indexOf(labels, label);
			if (index == -1) {
				labels.push(label);
				// this.set( { labels: labels }, { validate:true } );
				this.set( { labels: labels } );
			}
			this.setAllPublicAcces(false);
		},
		removeLabel: function(label) {
			var labels = this.get('labels');
			var index = _.indexOf(labels, label);
			if (index != -1) {
				labels.splice(index, 1);
			}
			// this.set( { labels: labels }, { validate:true } );
			this.set( { labels: labels } );
		},
		toggleLabel: function(label) {
			var labels = this.get('labels');
			var index = _.indexOf(labels, label);
			if (index == -1) {
				labels.push(label);
				this.set('allPublicAcces', false);
			}
			else {
				labels.splice(index, 1);
			}
			// this.set( { labels: labels }, { validate:true } );
			this.set( { labels: labels } );
		},
		toggleFavoritest: function() {
			this.set('favorites', !this.get('favorites'));
		},
		setAppTitle: function() {

		},
		search: function() {
	    	var qRecipe = new Parse.Query(app.Recipe);
			var currentUser = Parse.User.current();
			var navigationParams = [];
			// keywords
			if ( this.get('text') != '' ) {
				var keywords = this.get('text').split(' ');
		    	if ( Array.isArray(keywords) && keywords.length ) {
		   			// keywords = _.uniq(app.genSearchMask(keywords.join(' ')));
					// qRecipe.containsAll('searchMask', keywords);
		    		var re = ""
		    		for (var i = 0; i < keywords.length; i++) {
		    			keywords[i] = app.genSearchMask(keywords[i]);
	    				re += "(?=.*"+keywords[i]+".*)"; // AND Condition
		    			// OR Condition
		    			// if (i == 0) 
		    			// 	re += "(.*"+keywords[i]+".*)"
		    			// else 
		    			// 	re += "|(.*"+keywords[i]+".*)"

		    		};
					qRecipe.matches("searchMaskStr", re);
	    			navigationParams.push('k='+keywords.join(','));
		    	}
			}

	    	// labels
	    	var labels = this.get('labels');
	    	$('.app-navigation').find('.label').removeClass('mdl-color-text--light-green-400');
	    	$('.app-navigation').find('.label').addClass('mdl-color-text--light-green-900');
			if ( Array.isArray(labels) && labels.length ) {
				var ids = [];
				for (var i = 0; i < labels.length; i++) {
					var labelId = (labels[i].id)?labels[i].id:labels[i];
					ids.push( labelId );

					$('.label-'+labelId).addClass('mdl-color-text--light-green-400');
					$('.label-'+labelId).removeClass('mdl-color-text--light-green-900');
				};
				qRecipe.containsAll("labelsId", ids);  // AND
				// qRecipe.containedIn("labelsId", ids); //OR

				navigationParams.push('l='+ids.join(','));
			}

			// user
			$('.app-navigation').find('.cmdListAllRecipes i').removeClass('mdl-color-text--light-green-400');
	    	$('.app-navigation').find('.cmdListAllRecipes i').addClass('mdl-color-text--light-green-900');
			$('.app-navigation').find('.cmdListMyRecipes i').removeClass('mdl-color-text--light-green-400');
	    	$('.app-navigation').find('.cmdListMyRecipes i').addClass('mdl-color-text--light-green-900');
			if( this.get('user') != null ) {
				qRecipe.equalTo('user', this.get('user'));
				if (currentUser && currentUser.id == this.get('user').id) {
					$('.app-navigation').find('.cmdListMyRecipes i').addClass('mdl-color-text--light-green-400');
			    	$('.app-navigation').find('.cmdListMyRecipes i').removeClass('mdl-color-text--light-green-900');
				}
				else {
					$('.app-navigation').find('.cmdListAllRecipes i').addClass('mdl-color-text--light-green-400');
			    	$('.app-navigation').find('.cmdListAllRecipes i').removeClass('mdl-color-text--light-green-900');					
				}
				navigationParams.push('u='+this.get('user').id);
			}
			else {
				$('.app-navigation').find('.cmdListAllRecipes i').addClass('mdl-color-text--light-green-400');
		    	$('.app-navigation').find('.cmdListAllRecipes i').removeClass('mdl-color-text--light-green-900');					
			}
			
			// limit
	    	var limit = (this.get('limit'))?this.get('limit'):21;
			qRecipe.limit(limit);

			// order by
			if ( this.get('orderBy') ) {
				qRecipe.descending(this.get('orderBy')); 
			}

			var navigationUrl = navigationParams.join('&');
			if (navigationParams.length) {
				// app.router.navigate('/s/'+navigationUrl, {trigger: false});
			}

			// include
			qRecipe.include('labels');
			qRecipe.include('user');
 
			// do it
			app.spinnerStart();
			qRecipe.find().then(function (list) {
			    // use list
			    app.listedRecipes = new Parse.Collection(list, {model:app.Recipe});
			    app.renderRecipeList(app.listedRecipes);
			    app.spinnerStop();
			    if(list.length) {
			    	if(list.length == 1) {
			    		app.viewRecipe(list[0]);
			    		app.switchLayout('view');
			    	}
			    	else {
					    // app.switchLayout('list');
			    	}
			    }
			}, function (error) {
			    console.log(error);
			});
	    },
	});

// Router ==================================================================================================================

	app.AppRouter = Backbone.Router.extend({
		routes: {
		    "help":                 "help",    // #help
		    "recipe/:name-:rid":	"recipe",  // show recipe
		    "u/:name-:uid" : 		"user",	   // list user recipes
		    's/:search' : 			"search", 
		    '*path':  'defaultRoute'
	  	},
	  	initialize: function() {

	  	},
		user: function(name, uid) {
			var uQuery = new Parse.Query(Parse.User);
			uQuery.equalTo('objectId',uid);
			uQuery.find().then(function (list) {
				app.recipesFiltermanager.set( { user: list[0] }, { validate: true } );
				app.switchLayout('user');
				app.recipesFiltermanager.search();
			})
		},
		recipe: function(name, rid) {
			var rQuery = new Parse.Query(app.Recipe);
			rQuery.equalTo('objectId',rid);
			// include
			rQuery.include('labels');
			rQuery.include('user');
			rQuery.find().then(function (list) {
				app.viewRecipe(list[0]);
				app.switchLayout('view');
			})
		},
		search: function(search) {
			// u=dasda&l=sdsada,dsadas,dsada&f&a   =>  u=user l=labels f=favorites a=all
			var params = search.split('&');
			for (var i = 0; i < params.length; i++) {
				var param = params[i].split('=');
				if (param[0] == 'u') {
					app.recipesFiltermanager.set( { user: param[1] }, { validate: true } );
				}
				if (param[0] == 'l') {
					var labelIds = param[1].split(','); 
					app.recipesFiltermanager.set( { labels: labelIds }, { validate: true } );
				}
				if (param[0] == 'a') {
					app.recipesFiltermanager.set( { user: null }, { validate: true } );
				}
				if (param[0] == 'f') {
					app.recipesFiltermanager.set( { favorites: true }, { validate: true } );
				}
			};

			if (typeof app.recipesFiltermanager.get('user') == 'string') {
				var uQuery = new Parse.Query(Parse.User);
				uQuery.equalTo('objectId',uid);
				uQuery.find().then(function (list) {
					app.recipesFiltermanager.set( {user : list[0] }, { validate: true } );
					app.switchLayout('user');
					app.recipesFiltermanager.search();
				})
			}
			else {
				app.recipesFiltermanager.search();
				app.switchLayout('list');
			}
		},
		help: function(argument) {
			// body...
		},
		defaultRoute: function(argument) {
			app.switchLayout('list');
			app.recipesFiltermanager.search();
		}
	});

// Views ===================================================================================================================
	app.ApplicationView = Backbone.View.extend({
		el: 'body',
		initialize: function() {
			this.template = _.template(underi18n.template(app.templates.application, app.TDict));
		    this.render();
		},
		render: function() {
			var html = $(this.template({}));
			this.$el.html(html);
			return this;
		}
	});

	app.RecipeView = Backbone.View.extend({
		el       : '#viewRecipePlaceholder',
		events : {
			'click .btnEdit'    : 'onEdit',
			'click .btnClone'   : 'onClone',
			'click .author'     : 'onAuthor',
			'click .close'      : 'onDiscard',
		},

		initialize: function() {
			this.template = _.template(underi18n.template(app.templates.viewRecipe, app.TDict));
			this.listenTo(this.model, 'change', this.render);
		    this.render();
		},
		remove: function() {
			this.$el.empty().off(); /* off to unbind the events */
			this.stopListening();
			return this;
		},
		render: function() {
			var html = this.template({
				id: this.model.id, 
				recipe: this.model.toJSON(), 
				user: this.model.get('user').toJSON()
			});

			var recipeLabels = this.model.get('labels');

			this.$el.html(html);

			var labels = new Array();
			for (var j = 0; j < recipeLabels.length; j++) {
				this.$el.find('.labels').append('<span class="label label-success">' + recipeLabels[j].get('name') + '</span>');
			};
			return this;
		},
		onAuthor: function() {
			// body...
			app.router.navigate("/u/"+app.genUrlName(this.model.get('user').get('name'))+"-"+this.model.get('user').id, {trigger: true});
		},
		onEdit: function() {
			app.editRecipe(this.model);
		},
		onClone: function() {
			app.editRecipe(app.cloneRecipe(this.model));
		},
		onDiscard:function() {
			this.remove();
			app.switchLayout('list');
			if(app.listedRecipes.length == 0) {
				app.recipesFiltermanager.search();
			}
			app.recipeView = null;
			delete this;
		}
		
	});

	app.EditRecipeView = Backbone.View.extend({
		el       : '#editRecipePlaceholder',
		events   : {
			'change .name'                : 'onChangeName',
			'change .description'         : 'onChangeDescription',
			'change .ingredients'         : 'onChangeIngredients',
			'change .directions'          : 'onChangeDirections',
			'click #btnEditRecipeSave'    : 'onSave',
			'click .close'                : 'onDiscard',
			'click #btnEditRecipeDiscard' : 'onDiscard'
		},

		initialize: function() {
			this.template = _.template(underi18n.template(app.templates.editRecipe, app.TDict));
			// this.listenTo(this.model, 'change', this.render);
		    this.render();
		    this.renderLabelsGroups();
		},
		remove: function() {
			this.$el.empty().off(); /* off to unbind the events */
			this.stopListening();
			return this;
		},
		render: function() {
			$('.mdl-layout__header-row .recipeName').text(': '+this.model.get('name'));
			var html = this.template({id: this.model.id, recipe: this.model.toJSON()});
			this.$el.html(html);

			$('.upload_image').on('click', function() {
				$('#image_upload').click();
			});
			// Dropzone.options.myDropzone = {
			//   init: function() {
			//     this.on("processing", function(file) {
			//       this.options.url = "/some-other-url";
			//     });
			//   }
			// };
			// var myDropzone = new Dropzone(".upload_image",{
		 //        url: 'fake',
		 //        createImageThumbnails: false,
		 //        paramName: "file", // The name that will be used to transfer the file
		 //        enqueueForUpload: false
		 //    });

			// myDropzone.on("addedfile", function(file) {
			// /* Maybe display some more file information on your page */
			// });

			$('#image_upload').change(function (e) {
			    for (var i = 0; i < e.originalEvent.srcElement.files.length; i++) {
			        var file = e.originalEvent.srcElement.files[i];

			        var reader = new FileReader();
			        reader.onloadend = function() {
			            $('#editRecipe .image').attr('src', reader.result);
			        }
			        reader.readAsDataURL(file);
			    }
			});

			var editor = new MediumEditor('.editable', {
				toolbar: {
			        buttons: ['bold', 'italic', 'underline', 'strikethrough', 'quote', 'subscript', 'subscript', 
			        	'orderedlist', 'unorderedlist', 'indent', 'outdent', 'h2', 'h3',  'removeFormat'],
			    },
			    imageDragging: false,
			    paste: {
			        forcePlainText: false,
			        cleanPastedHTML: true,
			        cleanReplacements: [],
			        cleanAttrs: ['class', 'style', 'id', 'on', 'onclick'],
			        cleanTags: ['meta', 'script', 'img', 'a']
			    }
			});
			return this;
		},
		renderLabelsGroups: function() {
			var currentUser = Parse.User.current();
			// var groups = app.labelGroupCollection.models;
			var groups = app.loginedUser.labelGroups.models;
			this.labelSelectors = new Array();
			this.$el.find('.labelGroups').empty();
			
			for (var i = 0; i<groups.length; i++) {					
				var glabels = new Array();
				for (var j = 0; j<app.loginedUser.labelCollection.models.length; j++) {
					if (app.loginedUser.labelCollection.models[j].get('labelgroup').id == groups[i].id) {
						glabels.push(app.loginedUser.labelCollection.models[j]);
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
					var l = app.loginedUser.labelCollection.get(selectedLabels[j].id);
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
		onChangeDirections: function(evt) {
			this.model.set('directions', evt.currentTarget.value);
		},
		onSave: function(evt) {
			app.spinnerStart();
			var currentUser = Parse.User.current();

			var selectedLabels = [];
			for (var i = this.labelSelectors.length - 1; i >= 0; i--) {
				selectedLabels = _.union(selectedLabels, this.labelSelectors[i].selectedLabels);
			};

			this.model.set('description', $('#editRecipe .description').html());
			this.model.set('ingredients', $('#editRecipe .ingredients').html());
			this.model.set('directions', $('#editRecipe .directions').html());
			this.model.set('labels', selectedLabels);
			var recipeLanguage = franc(this.model.get('description')+' '+this.model.get('ingredients')+' '+this.model.get('directions'));
			this.model.set('locale', recipeLanguage); //TODO
			this.model.set('user', currentUser);
			var searchMask = this.model.get('name')+' '+this.model.get('description')+' '+this.model.get('ingredients')+' '+this.model.get('directions');
			this.model.set('searchMask', app.genSearchMask(searchMask));
			this.model.set('searchMaskStr', this.model.get('searchMask').join(" ") );

			// this.model.save();
			Parse.Object.saveAll(this.model).then(function(model) {
				var labels = model.get('labels'); 
				var ids = [];
				if (_.isArray(labels) && labels.length)  {
					var labelsRelation = model.relation('labelRelation');
					labelsRelation.add(labels);
					for (var i = 0; i < labels.length; i++) {
						ids.push(labels[i].id);
						//TODO Add to searchmask
					};
				}
				model.set('labelsId', ids);

				var currentACL = model.getACL();
				if (typeof currentACL === 'undefined') {
					currentACL = new Parse.ACL();
				}
				currentACL.setPublicReadAccess(true);
				currentACL.setPublicWriteAccess(false);
				currentACL.setWriteAccess(app.loginedUser.id, true);
				if(model.get('private')) {
					currentACL.setPublicReadAccess(false);
					currentACL.setReadAccess(app.loginedUser.id, true);
				}
				model.setACL(currentACL)

				//image
				var imageFile = document.getElementById('image_upload');
				if (imageFile && imageFile.files.length) {
					imageFile = imageFile.files[0];
					var imageExts = {
					  "image/png":"png",
					  "image/jpg":"jpg",
					  "image/jpeg":"jpg"
					}
					var imgUrl = 'https://s3.amazonaws.com/'+s.amazonBucket+'/users/'+app.loginedUser.id+'/recipes/'+model.id+'/cover.'+imageExts[imageFile.type];
					model.set('coverImageUrl',  imgUrl);
					model.save();
			        Parse.Cloud.run('awsInfo', {file: 'users/'+app.loginedUser.id+'/recipes/'+model.id+'/cover', fileType: imageFile.type}, {
			  			success: function(result) {
							console.log(result)
							$('[name=Policy]').val(result.policy);
							$('[name=Signature]').val(result.signature);

							var file = document.getElementById('image_upload').files[0];
						    var fd = new FormData();

						    fd.append('key', result.key);
						    fd.append('acl', 'public-read');   
						    fd.append('Content-Type', file.type);     
						    fd.append('AWSAccessKeyId', s.AWSAccessKeyId);
						    fd.append('policy', result.policy)
						    fd.append('signature', result.signature);

						    fd.append("file",file);

						    var xhr = new XMLHttpRequest();

						    // xhr.upload.addEventListener("progress", uploadProgress, false);
						    xhr.addEventListener("load", function() {
						    	console.log('img uploaded');
						    	var imageTags = $('.recipe-'+app.editRecipeView.model.id+' .image');
						    	$(imageTags).attr('src', imageTags[0].src +'?' +new Date().getTime());

						    	app.editRecipeView.model.get('user').fetch();
						    	app.loadLabels(app.loginedUser);
							    app.spinnerStop();
								app.viewRecipe(app.editRecipeView.model);
								app.editRecipeView.remove();
								if (app.recipeListView) {
									app.recipeListView.trigger('change');
								}
						    }, false);
						    // xhr.addEventListener("error", uploadFailed, false);
						    // xhr.addEventListener("abort", uploadCanceled, false);

						    xhr.open('POST', 'https://'+s.amazonBucket+'.s3.amazonaws.com/', true); //MUST BE LAST LINE BEFORE YOU SEND 
						    xhr.send(fd);
							// app.editRecipeView.model.save();
							
			  			},
			  			error: function(error) {
			  				console.log(error);
			  			}
					});
				}
				//end image
				else {
					model.save();
					model.get('user').fetch();
					app.loadLabels(app.loginedUser);
					app.spinnerStop();
					app.viewRecipe(app.editRecipeView.model);
					app.editRecipeView.remove();
					if (app.recipeListView) {
						app.recipeListView.trigger('change');
					}
				}
			})

			// this.remove();
		},
		onDiscard:function() {
			$('.mdl-layout__header-row .recipeName').text('');
			app.viewRecipe(this.model);
			this.remove();
			app.editRecipeView = null;
			delete this;
		}
	})

	app.RecipeListItemView = Backbone.View.extend({
		tagName   : 'div',
		className : 'recipe-card col-sm-12 col-md-6 col-lg-4',
		events : {
			'click .btnRead'    : 'onRead',
			'click .author'     : 'onAuthor',
			'click .name'       : 'onRead',
			'click .image'      : 'onRead',
		},
		initialize: function() {
			this.template = _.template(underi18n.template(app.templates.recipeListItem, app.TDict));
			this.listenTo(this.model, "change", this.render);
		},
		render: function() {
			var html = this.template({
				id: this.model.id, 
				recipe: this.model.toJSON(), 
				user: this.model.get('user').toJSON()
			});
			this.$el.html(html);

			var recipeLabels = this.model.get('labels');
			for (var j = 0; j < recipeLabels.length; j++) {
				this.$el.find('.labels').append('<span class="label label-success">' + recipeLabels[j].get('name') + '</span>');
			};
			return this;
		},
		onRead: function(e) {
			app.viewRecipe(this.model);
		},
		onAuthor: function() {
			// body...
			app.router.navigate("/u/"+app.genUrlName(this.model.get('user').get('name'))+"-"+this.model.get('user').id, {trigger: true});
		}
	});

	app.RecipeListView = Backbone.View.extend({
		el: '#recipeResultsList',
		initialize: function() {
			this.listenTo(this.collection, 'change', this.render);
			this.on('change', this.render);
		},
		render: function() {
			var $list = this.$el.empty();
			var counter = 0;
			this.collection.each(function(model) {
				// var item = new app.RecipeListItemView({model: model});
				// $list.append(item.render().$el);
				this.renderOne(model)
				counter++;
				if(counter % 2 == 0) {
					$list.append('<div class="clearfix visible-md-block"></div>');
				}
				if(counter % 3 == 0) {
					$list.append('<div class="clearfix visible-lg-block"></div>');
				}
		    }, this);

			return this;
		},
		renderOne: function(model) {
			var item = new app.RecipeListItemView({model: model});
			this.$el.append( item.render().el );
			return this;
		}
	});

	app.NavigationLabelView = Backbone.View.extend({
		tagName : 'a',
		className : 'navigation__link',
		events : {
			'click'    : 'select',
		},
		initialize: function() {
			this.template = _.template(underi18n.template(app.templates.navigationLabel, app.TDict));
			this.listenTo(this.model, "change", this.render);
		},
		render: function() {
			var html = this.template({id: this.model.id, recipe: this.model.toJSON()});
			this.$el.html(html);
			return this;
		},
		select: function(e) {
			console.log(this.model);
			app.recipesFiltermanager.toggleLabel(this.model);
			app.switchLayout('list');
			app.recipesFiltermanager.search();
		}
	});

	app.NavigationLabelGroupItemView = Backbone.View.extend({
		tagName: 'div',
		className : 'app-navigation mdl-navigation mdl-color--light-green-800',
		events : {
			'click .groupName'    : 'toggleShow',
		},
		initialize: function() {
			this.template = _.template(underi18n.template(app.templates.navigationLabelGroup, app.TDict));
		    this.listenTo(this.collection, 'change', this.render);
		    // this.render();
		},
		toggleShow: function() {
			// this.$el.find('a').toggle();
			this.$el.find('.labels').toggleClass('hidden');
			var icon = this.$el.find('i')[0];
			if ($(this.$el.find('.labels')[0]).hasClass('hidden')) {
				$(icon).text('chevron_right');	
			}
			else {
				$(icon).text('expand_more');
			}
		},
		render: function() {
			this.$el.empty();
			var html = this.template(this.model.toJSON());
			this.$el.append(html);

			var labels = app.labelCollection;
			for (var i = labels.models.length - 1; i >= 0; i--) {
				if (labels.models[i].get('labelgroup').id == this.model.id) {
					var navigationLabelView = new app.NavigationLabelView({model:labels.models[i]});
				  	this.$el.find('.labels').append(navigationLabelView.render().$el);
				}
			};
			return this;
		}
	});

	app.NavigationLabelGroupView = Backbone.View.extend({
		el: '#LabelGroupsViewPlaceholder',
		initialize: function() {
		    this.listenTo(this.collection, 'change', this.render);
		    this.render();
		},
		render: function() {
			this.$el.empty();
			this.collection.each(function(model) {
				var item = new app.NavigationLabelGroupItemView({model: model});
				this.$el.append(item.render().$el);
		    }, this);

			return this;
		}
	})

	app.RecipesFiltermanagerView = Backbone.View.extend({

	});

// Translation DICT ========================================================================================================
	app.TDict = {
		'en' : {
			'All'				: 'All',
			'Favorites'         : 'Favorites',
			'My'				: 'My',
			'Shared'			: 'Shared',
			'new'               : 'new',
			'search'            : 'search',
			'About'             : 'About',
			'Contact'           : 'Contact',
			'Legal_information' : 'Legal information',
			'Save_to_My_Book'   : 'Save to My Book',
			'Read'              : 'Read',
			'Edit'              : 'Edit',
			'Save'              : 'Save',
			'Name'              : 'Name',
 			'Description'       : 'Description',
			'Ingredients'       : 'Ingredients',
			'Directions'        : 'Directions',
			'Labels'            : 'Labels',
			'Discard'           : 'Discard',
			'Save changes'      : 'Save changes',
			'Logout'            : 'Logout',
			'Login'             : 'Login',
			'Sign_In'           : 'Sign In'
		},
		'hu' : {
			'All'				: 'Összes',
			'Favorites'         : 'Kedvencek',
			'My'				: 'Saját',
			'Shared'			: 'Megosztott',
			'new'               : 'új',
			'search'            : 'keres',
			'About'             : 'Rólunk',
			'Contact'           : 'Kapcsolat',
			'Legal_information' : 'Szerződési információk',
			'Save_to_My_Book'   : 'Mentsd el nekem!',
			'Edit'              : 'Szerkeszt',
			'Save'              : 'Mentés',
			'Read'              : 'Olvas',
			'Name'              : 'Név',
			'Description'       : 'Leírás',
			'Ingredients'       : 'Hozzávalók',
			'Directions'        : 'Elkészítés',
			'Labels'            : 'Cimkék',
			'Discard'           : 'Elvet',
			'Save changes'      : 'Mentés',
			'Logout'            : 'Kilépés',
			'Login'             : 'Belépés',
			'Sign_In'           : 'Regisztráció'
		} 

	};
