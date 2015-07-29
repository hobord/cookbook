// var Typeahead = Backbone.Typeahead;

var s, app = {
    settings: {
    	applicationId: "uJLDpdzRo0AS07SHiXDRUR6dX2egvU9rKcbHkIMP",
    	applicationKey: "LkeF59Hh5HXrketX8qw6SFWwFALnVu8vqJKwkp5n",
    	facebookAppId: "890469204379378", // Production
    	// facebookAppId: "905249916234640", //Test
    	AWSAccessKeyId: "AKIAJ5EPMLPXAQVXTNPQ",
    	amazonBucket: "cookbookimg",
    	analytics: 'UA-5658990-11'
    },
    templates: {
    	'application'          : '#application-tmpl',
		'viewRecipe'           : '#viewRecipe-tmpl',
		'editRecipe'           : '#editRecipe-tmpl',
		'recipeListItem'       : '#recipeListItem-tmpl',
		'navigationLabel'      : '#navigationLabel-tmpl',
		'navigationLabelGroup' : '#navigationLabelGroup-tmpl',
		'followedUserList'	   : '#followedUserList-tmpl',
		'followedUserItem'	   : '#followedUserItem-tmpl'
    },
    labelCollection: null,
    loginedUser: null, //User.labelCollection = null
    viewUser: null,
	recipeView: null,
	editRecipeView: null,
	recipeListView: null,
    init: function() {
        s = this.settings, this.initalizers();
    },
    initalizers: function() {
    	this.setAppLocale();
    	this.loadTemplates();
		this.applicationView  = new this.ApplicationView();

		this.loginedUser = null;
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
		this.favoritedRecipes = new Parse.Collection([], {model:app.Recipe});
		this.listedRecipes = new Parse.Collection( [], { model : this.Recipe } );
		this.recipesFiltermanager = new this.RecipesFiltermanager();
		this.recipesFiltermanagerView = new this.RecipesFiltermanagerView({model: this.recipesFiltermanager});

		//start
		if (Parse.User.current()) {
    		app.loginedUser = Parse.User.current();
    		var userID = app.loginedUser.id;

    		var query = new Parse.Query(Parse.User);
			query.get(app.loginedUser.id).then(function (user) {
			    app.loginedUser = user;
			    if(app.loginedUser.get('inited')) {
			    	app.setAppLocale(app.loginedUser.get('locale'));
			    	app.applicationView.render();
			    	app.router = new app.AppRouter();
					Backbone.history.start();
			    	app.loadLabels(app.loginedUser);
			    	app.loadFavoritedRecipes();
			    	app.loadFollowedUsers();
			    }
			    else {
			    	app.initNewUser();
			    }
			}, function (error) {
			    console.log(error);
			});
    	}
    	else {
    		// Anonymous user;
    		var userID = 'auto'
	    	app.applicationView.render();
	    	app.router = new app.AppRouter();
			Backbone.history.start();
    	}
    	ga('create', s.analytics, userID);
	    ga('send', 'pageview');
    },
    setAppLocale: function(localeCode) {
    	if(!localeCode) {
    		if ($.cookie('localeCode')) {
				this.localeCode = $.cookie('localeCode');
				$.cookie('localeCode', this.localeCode, { expires: 365 });
    		} else {
				this.localeCode = (navigator.languages? navigator.languages[0] : (navigator.language || navigator.userLanguage)).substr(0,2);
    		}
    	}
    	else {
    		this.localeCode = localeCode.substr(0,2);	
    		$.cookie('localeCode', this.localeCode, { expires: 365 });
    	}
    	if (this.localeDicts[this.localeCode]) {
			this.localeDict = underi18n.MessageFactory(this.localeDicts[this.localeCode]);
    	} else {
			this.localeDict = underi18n.MessageFactory('en');
    	}
    },
    chanegLocale: function(localeCode) {
    	this.setAppLocale(localeCode);
    	if(app.loginedUser) {
    		app.loginedUser.set('locale',localeCode);
    		app.loginedUser.save().then(function(){
    			location.reload();
    		});
    	}
      	if (ga) { ga('send', {
			'hitType'       : 'event',        // Required.
			'eventCategory' : 'user',         // Required.
			'eventAction'   : 'chanegLocale', // Required.
			'eventLabel'   : localeCode
		});}
    },
    loadTemplates: function() {
    	_.each(this.templates, function(item, key){
    		this.templates[key] = $(item).html();
    		$(item).remove();
    	}, this);
    },
    spinnerStart: function() {
    	$('.appSpinner').addClass('is-active');
    },
    spinnerStop: function() {
    	$('.appSpinner').removeClass('is-active');
    },
    initNewUser: function() {
    	Parse.Cloud.run('initUser');
    	location.reload();
    },
    loadLabels: function(filterUser) {
    	var labelGroupQuery = new Parse.Query(app.LabelGroup);
		labelGroupQuery.equalTo("user", filterUser);
		labelGroupQuery.ascending('weight');
		labelGroupQuery.find({
			success: function(labelgroups) {
				app.labelGroupCollection = new Parse.Collection(labelgroups, {model: app.LabelGroup});
				
				if (app.loginedUser && labelgroups.length && ( labelgroups[0].get('user').id == app.loginedUser.id  )) {
					app.loginedUser.labelGroups = new Parse.Collection(labelgroups, {model: app.LabelGroup});
				}

				var labelQuery = new Parse.Query(app.Label);
	    		labelQuery.equalTo("user", filterUser);
	    		labelQuery.descending('name');
	    		labelQuery.find({
	    			success: function(labels) {
						$(app.NavigationLabelGroupView.prototype.el).empty(); //#LabelGroupsViewPlaceholder'
	    				app.labelCollection = new Parse.Collection(labels, {model: app.Label});
	    				var navigationLabelGroupView = new app.NavigationLabelGroupView({collection: app.labelGroupCollection});
	    				app.recipesFiltermanager.set('labels',[]);

	    				if (app.loginedUser && labels.length && ( labels[0].get('user').id == app.loginedUser.id  )) {
							app.loginedUser.labelCollection = new Parse.Collection(labels, {model: app.Label});
						}
	    			}
	    		});
			}
		});
    },
    loadFavoritedRecipes: function() {
    	var relation = app.loginedUser.relation("favorites");
		var qRecipe = relation.query();
		qRecipe.find().then(function (list) {
		    app.favoritedRecipes = new Parse.Collection(list, {model:app.Recipe});
		}, function (error) {
		    console.log(error);
		});
    },
    loadFollowedUsers: function() {
    	var relation = app.loginedUser.relation("followedUsers");
		var query = relation.query();
    	query.ascending('name');
		query.find().then(function (list) {
		    app.followedUsers = new Parse.Collection(list, {model:Parse.User});
		    app.followedUsersView = new app.NavigationFollowedUsersView({collection:app.followedUsers});
		    app.followedUsersView.render();
		}, function (error) {
		    console.log(error);
		});
    },
    followUser: function(user) {
		var relation = app.loginedUser.relation('followedUsers');
		var followed = app.followedUsers.get(user.id);
		if (followed) {
			relation.remove(user);
			if (ga) { ga('send', {
				'hitType'       : 'event',        // Required.
				'eventCategory' : 'user',         // Required.
				'eventAction'   : 'unfollow', // Required.
			});}
		}
		else {
			relation.add(user);
	      	if (ga) { ga('send', {
				'hitType'       : 'event',        // Required.
				'eventCategory' : 'user',         // Required.
				'eventAction'   : 'follow', // Required.
			});}
		}
		this.loginedUser.save().then( 
			function() {
				$('#FollowedPeoplePlaceholder').removeClass('hide');
				app.loadFollowedUsers();
			},
			function(error) {
		        console.log("Error: " + error.code + " " + error.message);
		    });
		return followed;
    },
    toggleRecipeFavorite: function(recipe) {
		var favorited = (app.favoritedRecipes.get(recipe.id))?true:false;
		var favoritesRelation = app.loginedUser.relation('favorites');
		if (favorited) {
			favoritesRelation.remove(recipe);
			if (ga) { ga('send', {
				'hitType'       : 'event',        // Required.
				'eventCategory' : 'recipe',         // Required.
				'eventAction'   : 'unfavorite', // Required.
			});}
		}
		else {
			favoritesRelation.add(recipe);
			if (ga) { ga('send', {
				'hitType'       : 'event',        // Required.
				'eventCategory' : 'recipe',         // Required.
				'eventAction'   : 'favorite', // Required.
			});}
		}
		app.loginedUser.save().then( 
			function() {
				app.loadFavoritedRecipes();
			},
			function(error) {
		        console.log("Error: " + error.code + " " + error.message);
		    });
		return favorited;
    },
    createLabel: function(name, group) {
    	var label = null;
    	if (app.loginedUses) {
	    	label = new app.Label({
	    		name: name, 
	    		labelgroup: group, 
	    		user: app.loginedUser
	    	});
	    	label.save();
	    	this.loadLabels();
	    	if (ga) { ga('send', {
				'hitType'       : 'event',        // Required.
				'eventCategory' : 'label',         // Required.
				'eventAction'   : 'create', // Required.
			});}
       	}
    	return label;
    },
    setFacebookUser: function() {
    	app.spinnerStart();
    	FB.getLoginStatus(function(response) {
		  	if (response && !response.error && response.status === 'connected') {
		    	console.log('Logged in.');
		    	FB.api('/me', {fields: 'id,name,email,last_name,first_name,gender,picture,link,timezone,updated_time,verified,locale'}, function(response) {
		    		if (response && !response.error) {
					  	// console.log('Your name is ' + response.name);
					  	// console.log(response);
					  	app.facebookUser = response;
					  	if(app.facebookUser) {
							var fid = app.facebookUser.id
							var query = new Parse.Query(app.FacebookUser);
							query.equalTo("fid", fid);
							query.find({
								success: function(results) {
									var fid = app.facebookUser.id
									app.loginedUser = Parse.User.current();
							        if (results.length) {
								        // facebook user existing so check update
								        var fuser = results[0];
								        if (fuser.updated_time!=app.facebookUser.updated_time) {
								        	var id = fuser.id;
								        	var fuser = new app.FacebookUser(app.facebookUser);
											fuser.id  = id;
											fuser.set("picture", app.facebookUser.picture.data.url);
											fuser.set("fid",fid);
											fuser.set("user", app.loginedUser);
											fuser.save().then(function(fuser){
												app.loginedUser.set('avatar', fuser.get('picture'));
												app.loginedUser.set('name',   fuser.get('name'));
												app.loginedUser.set('email',   fuser.get('email'));
												// app.loginedUser.set("locale", fuser.get('locale'));
												app.loginedUser.save().then(function(){
													location.reload();
												});	
											});
								        }
							        }
							        else {
										// facebook user not existing so create
										var fuser = new app.FacebookUser(app.facebookUser);
										fuser.id = null;
										fuser.set("fid",fid);
										fuser.set("picture", app.facebookUser.picture.data.url);
										fuser.set("user", app.loginedUser);
										fuser.set("locale", app.facebookUser.locale);
										fuser.save().then(function(fuser){
											app.loginedUser.set('avatar', fuser.get('picture'));
											app.loginedUser.set('name',   fuser.get('name'));
											app.loginedUser.set("locale", fuser.get('locale'));
											app.loginedUser.set('email',   fuser.get('email'));
											app.loginedUser.set("profileLink", fuser.get('link'));
											app.loginedUser.save().then(function(){
												location.reload();
											});	
										});
							        }
							        app.facebookUser.id=fid;
							        app.spinnerStop();
								},
								error: function(error) {
									console.log("Error: " + error.code + " " + error.message);
								}
							});
							// $('.app-avatar').attr('src',app.facebookUser.picture.data.url);
							// $('.app-user-name').html(app.facebookUser.name);
							// // app.startUser();
				    	}
					}
				});
		  	}
		  	else {
		  		console.log(response);
		    	app.spinnerStop();
		  	}
		});
    },
    shareToFacebook: function(recipe) {
    	var text = recipe.get('description');
		var div = document.createElement("div");
		div.innerHTML = text;
		text = div.textContent || div.innerText || "";
		var coverImageUrl = (recipe.get('coverImageUrl'))?recipe.get('coverImageUrl'):'https://s3.amazonaws.com/cookbookimg/icon_256.png'; 
		FB.ui({
		  method: 'share',
		  display : "popup",
		  href: "http://www.justfoodyou.com/#recipe/_"+app.genUrlName(recipe.get('name'))+"-"+recipe.id,
		  name: recipe.get('name'),
		  title: recipe.get('name'),
		  picture: coverImageUrl,
		  description: text
		});
		if (ga) {
			ga('send', {
			  'hitType': 'social',
			  'socialNetwork': 'facebook',
			  'socialAction': 'share',
			  'socialTarget': 'http://www.justfoodyou.com',
			  'page': "/#recipe/_"+app.genUrlName(recipe.get('name'))+"-"+recipe.id
			});
		}

    },
    switchLayout: function(layout) {
    	this.currentLayout = layout;
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
		    	window.document.title='Just Food You'; 
		    	var filteredUser = app.recipesFiltermanager.get('user');
		    	if (filteredUser) {
			    	$('.mdl-layout-title').html(filteredUser.get('name') + app.localeDict('s_recipes'));
			    	window.document.title='Just Food You - '+filteredUser.get('name') + app.localeDict('s_recipes');

					if (app.followedUsers && app.followedUsers.get(filteredUser.id)) {
						$('header .add-favorite i').text('favorite');
					}
					else {
						$('header .add-favorite i').text('favorite_border');
					}

			    	if (ga) {
					    ga('set', {
						  page: '/#u/_'+app.genUrlName(filteredUser.get('name'))+'-'+filteredUser.id,
						  title: filteredUser.get('name')+"'s recipes"
						});
					    ga('send', 'pageview');
				    }
		    	}
		    	else {
		    		$('.mdl-layout-title').html('');
		    		$('header .add-favorite i').text('');	
		    	}
		    	break;
	    	case 'list':
	    		app.router.navigate( "/", { trigger: false } );
	    		window.document.title='Just Food You';
		    	$('#recipeResultsList').show();
		    	$('#btnCreateRecipe').show();

		    	var filteredUser = app.recipesFiltermanager.get('user');
		    	if (filteredUser) {
			    	$('.mdl-layout-title').html(filteredUser.get('name') + app.localeDict('s_recipes'));
			    	window.document.title='Just Food You - '+filteredUser.get('name') + app.localeDict('s_recipes');

					if (app.followedUsers && app.followedUsers.get(filteredUser.id)) {
						$('header .add-favorite i').text('favorite');
					}
					else {
						$('header .add-favorite i').text('favorite_border');
					}

			    	if (ga) {
					    ga('set', {
						  page: '/#u/_'+app.genUrlName(filteredUser.get('name'))+'-'+filteredUser.id,
						  title: filteredUser.get('name')+"'s recipes"
						});
					    ga('send', 'pageview');
				    }
		    	}
		    	else {
		    		$('.mdl-layout-title').html('');	
		    		$('header .add-favorite i').text(''); 
		    	}
		    	break;
		    case 'view':
			    $('#viewRecipe').show();
			    $('#btnCreateRecipe').show();
			    $('main').scrollTop(0);
			    $('.mdl-layout-title').html(app.recipeView.model.get('name'));

				if (app.favoritedRecipes && app.favoritedRecipes.get(app.recipeView.model.id)) {
					$('header .add-favorite i').text('favorite');
				}
				else {
					$('header .add-favorite i').text('favorite_border');
				}

			    if (ga) {
				    ga('set', {
					  page: '/#recipe/_'+app.genUrlName(app.recipeView.model.get('name'))+'-'+app.recipeView.model.id,
					  title: app.recipeView.model.get('name')
					});
					ga('send', 'pageview');
			    }
		    	break;	
	    	case 'edit':
		    	$("main").scrollTop();
		    	$('#editRecipe').show();
		    	$('.mdl-layout-title').html(app.editRecipeView.model.get('name'));
		    	if (ga && app.editRecipeView.model.id) {
				    ga('set', {
					  page: '/#editRecipe/_'+app.genUrlName(app.editRecipeView.model.get('name'))+'-'+app.editRecipeView.model.id,
					  title: app.editRecipeView.model.get('name')
					});
					ga('send', 'pageview');
			    }
	    		break;
    	}
    },
    createLabelgroup: function(newGroupName) {
		var newGroup = new app.LabelGroup();
    	newGroup.set('name', newGroupName);
    	newGroup.set('weight', 10);
        newGroup.set('user', app.loginedUser);

		var currentACL = newGroup.getACL();
		if (typeof currentACL === 'undefined') {
			currentACL = new Parse.ACL();
		}
		currentACL.setPublicReadAccess(true);
		currentACL.setPublicWriteAccess(false);
		currentACL.setWriteAccess(app.loginedUser.id, true);
		newGroup.setACL(currentACL);
		newGroup.save({
        	success: function(newGroup) {
        		var openedGroups = $.cookie('expandedLabelGroups'); 
        		if (openedGroups) {
	        		var openedGroups = openedGroups.split(',');
					if(_.indexOf(openedGroups, newGroup.id)==-1) {
						openedGroups.push(newGroup.id);
						$.cookie('expandedLabelGroups', openedGroups);
					}
			        app.loadLabels(app.loginedUser);
			        $(event.target).val('');
        		}
        	}
        });
        if (ga) { ga('send', {
			'hitType'       : 'event',        // Required.
			'eventCategory' : 'label',         // Required.
			'eventAction'   : 'createLabelgroup', // Required.
		});}
    },
    createNewLabel: function(newLabelName, group) {
		var newLabel = new app.Label();
        newLabel.set('name', newLabelName);
        newLabel.set('labelgroup', group);
        newLabel.set('user', app.loginedUser);

		var currentACL = newLabel.getACL();
		if (typeof currentACL === 'undefined') {
			currentACL = new Parse.ACL();
		}
		currentACL.setPublicReadAccess(true);
		currentACL.setPublicWriteAccess(false);
		currentACL.setWriteAccess(app.loginedUser.id, true);
		newLabel.setACL(currentACL)

        newLabel.save({
        	success: function() {
		        app.loadLabels(app.loginedUser);
        	}
        });
        if (ga) { ga('send', {
			'hitType'       : 'event',        // Required.
			'eventCategory' : 'label',         // Required.
			'eventAction'   : 'createLabel', // Required.
		});}
    },
    createNewRecipe: function() {
    	var currentUser = Parse.User.current();
    	newRecipe = new app.Recipe({
			name          : '',
			coverImageUrl : '',
			description   : '',
			ingredients   : '',
			directions    : '',
			user          : currentUser,
			labels        : new Array(),
			private       : false
    	});

    	app.editRecipe(newRecipe);
    	if (ga) { ga('send', {
			'hitType'       : 'event',        // Required.
			'eventCategory' : 'recipe',         // Required.
			'eventAction'   : 'create', // Required.
		});}
    },
    cloneRecipe: function(orig) {
    	var currentUser = Parse.User.current();
    	var originalWriter = (orig.get('originalWriter'))?orig.get('originalWriter'):orig.get('user');
    	newRecipe = new app.Recipe({
			originalWriter: originalWriter,
			name          : orig.get('name'),
			coverImageUrl : orig.get('coverImageUrl'),
			description   : orig.get('description'),
			ingredients   : orig.get('ingredients'),
			directions    : orig.get('directions'),
			user          : currentUser,
			labels        : new Array(),
			private       : false
    	});
    	if (ga) { ga('send', {
			'hitType'       : 'event',        // Required.
			'eventCategory' : 'recipe',         // Required.
			'eventAction'   : 'clone', // Required.
		});}
    	return newRecipe;
    },
    editRecipe: function(recipe) { 
    	this.editRecipeView = new app.EditRecipeView({model: recipe});
    	app.switchLayout('edit');
    	if (ga) { ga('send', {
			'hitType'       : 'event',        // Required.
			'eventCategory' : 'recipe',         // Required.
			'eventAction'   : 'edit', // Required.
		});}
    },
    viewRecipe: function(recipe) {
    	app.router.navigate( "/recipe/_"+app.genUrlName(recipe.get('name'))+"-"+recipe.id, { trigger: false } );
    	window.document.title='Just Food You - '+recipe.get('name');
    	this.recipeView = new app.RecipeView({model: recipe});
    	app.switchLayout('view');
    },
    genSearchMask: function(text) {
    	text = text.toLowerCase();
    	// var re = /[^A-Za-z\u0590-\u05FF\u0600-\u06FF\u4E00–\u9FCC\u3400–\u4DB5\uFA0E\uFA0F\uFA11\uFA13\uFA14\uFA1F\uFA21\uFA23\uFA24\uFA27-\uFA29]|[\ud840-\ud868][\udc00-\udfff]|\ud869[\udc00-\uded6\udf00-\udfff]|[\ud86a-\ud86c][\udc00-\udfff]|\ud86d[\udc00-\udf34\udf40-\udfff]|\ud86e[\udc00-\udc1d\u0900-\u097F\ ]/g;
    	var re = /[^A-Za-z\u0590-\u05FF\ ]/g;
		return _.uniq(removeDiacritics(text).replace(re, '').replace(/(.)\1{1,}/g, '$1').replace(/\b[a-z]{1,2}\b/g, '').replace(/(.)\1{1,}/g, '$1').split(' '));
	},
	genUrlName: function(text) {
		return removeDiacritics(text+' $2!₪%$#דשגד').replace(/[^A-Za-z\ ]/g,'').replace(/\ /g,'_');
	},
	renderRecipeList: function(recipeList) {
		this.recipeListView = new app.RecipeListView({collection: recipeList});
		this.recipeListView.render();
	},
	print: function(recipe) {
		window.open('/print/#recipe/_'+app.genUrlName(recipe.get('name'))+'-'+recipe.id);
	},
	sendToKindle: function() {
        window.readabilityToken = '';
        var s = document.createElement('script');
        s.setAttribute('type', 'text/javascript');
        s.setAttribute('charset', 'UTF-8');
        s.setAttribute('src', '//www.readability.com/bookmarklet/send-to-kindle.js');
        document.documentElement.appendChild(s);
        if (ga) { ga('send', {
			'hitType'       : 'event',        // Required.
			'eventCategory' : 'recipe',         // Required.
			'eventAction'   : 'kindle', // Required.
		});}
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
				
				this.set('text','');
				$('#search').val('');
				$('.app-header .mdl-textfield--expandable').removeClass('is-focused');

				if(attrs.user) {
					$('.filter-user-avatar').attr('src',attrs.user.get('avatar'));
					$('.filter-user-name').html(attrs.user.get('name'));
				}
				else {
					// $('.filter-user-avatar').attr('src','images/user.png');
					$('.filter-user-avatar').attr('src','/icon_512.png');
					$('.filter-user-name').html(app.localeDict('AllinJustFoodYou'));
				}

				if(attrs.user==null) {
					this.set('labels', []);

					var user = new Parse.User();
					if (app.localeCode=='hu') {
						user.id = 'KiswlE2QF5';
					}
					else {
	 					user.id ='BoInDweJu3';
					}
					app.loadLabels(user);
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
			this.setAllinJustFoodYouAcces(false);
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
				if(!this.get('user')) {
					this.set('text',(this.get('text')+' '+label.get('name')).trim());
					$('#search').val(this.get('text'));
					$('.app-header .mdl-textfield--expandable').addClass('is-focused');
				}
			}
			else {
				labels.splice(index, 1);
				if(!this.get('user')) {
					var str = this.get('text');
					str = str.replace(new RegExp(label.get('name'), 'gi'), '').trim();
					this.set('text',str);
					$('#search').val(str);
					$('.app-header .mdl-textfield--expandable').removeClass('is-focused');
				}
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
	    	this.qRecipe = new Parse.Query(app.Recipe);
	    	var gaKeywords = "";
			var navigationParams = []; //TODO
			
			$('.app-navigation').find('.cmdListAllRecipes i').removeClass('mdl-color-text--light-green-400');
	    	$('.app-navigation').find('.cmdListAllRecipes i').addClass('mdl-color-text--light-green-900');
			$('.app-navigation').find('.cmdListMyRecipes i').removeClass('mdl-color-text--light-green-400');
	    	$('.app-navigation').find('.cmdListMyRecipes i').addClass('mdl-color-text--light-green-900');
	    	$('.app-navigation').find('.cmdListFavoritedRecipes i').removeClass('mdl-color-text--light-green-400');
	    	$('.app-navigation').find('.cmdListFavoritedRecipes i').addClass('mdl-color-text--light-green-900');

	    	$('.createLabelgroup').addClass('hidden');

			if (this.get('favorites')) {
				$('.app-navigation').find('.cmdListFavoritedRecipes i').addClass('mdl-color-text--light-green-400');
		    	$('.app-navigation').find('.cmdListFavoritedRecipes i').removeClass('mdl-color-text--light-green-900');
				var relation = app.loginedUser.relation("favorites");
				this.qRecipe = relation.query();
				if (ga) { ga('send', 'pageview', '/favorites') }
			}
			else {
				// keywords
				if ( this.get('text') != '' ) {
					var keywords = this.get('text').split(' ');
			    	if ( Array.isArray(keywords) && keywords.length ) {
			   			// keywords = _.uniq(app.genSearchMask(keywords.join(' ')));
						// this.qRecipe.containsAll('searchMask', keywords);
						gaKeywords += keywords.join('+');
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
						this.qRecipe.matches("searchMaskStr", re, 'i');
		    			navigationParams.push('k='+keywords.join(','));
			    	}
				}

				if( this.get('user') != null ) {
					gaKeywords += '+user'+this.get('user').id;
					// labels
			    	var labels = this.get('labels');
			    	$('.app-navigation').find('.label').removeClass('mdl-color-text--light-green-400');
			    	$('.app-navigation').find('.label').addClass('mdl-color-text--light-green-900');
					if ( Array.isArray(labels) && labels.length ) {
						var ids = [];
						for (var i = 0; i < labels.length; i++) {
							var labelId = (labels[i].id)?labels[i].id:labels[i];
							ids.push( labelId );
							gaKeywords += "+label:"+label[i].get('name');
							$('.label-'+labelId).addClass('mdl-color-text--light-green-400');
							$('.label-'+labelId).removeClass('mdl-color-text--light-green-900');
						};
						this.qRecipe.containsAll("labelsId", ids);  // AND
						// this.qRecipe.containedIn("labelsId", ids); //OR

						navigationParams.push('l='+ids.join(','));
					}

					// user
					this.qRecipe.equalTo('user', this.get('user'));
					if (app.loginedUser && app.loginedUser.id == this.get('user').id) {
						$('.app-navigation').find('.cmdListMyRecipes i').addClass('mdl-color-text--light-green-400');
				    	$('.app-navigation').find('.cmdListMyRecipes i').removeClass('mdl-color-text--light-green-900');
				    	$('.createLabelgroup').removeClass('hidden');
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
			}
			if (ga) { ga('send', 'pageview', '/search?q='+gaKeywords); }

			// order by
			if ( this.get('orderBy') ) {
				this.qRecipe.descending(this.get('orderBy')); 
			}

			var navigationUrl = navigationParams.join('&');
			if (navigationParams.length) {
				// app.router.navigate('/s/'+navigationUrl, {trigger: false});
			}

			// include
			this.qRecipe.include('labels');
			this.qRecipe.include('user');
			this.qRecipe.include('originalWriter');
			this.qRecipe.include('originalWriter');

			this.qRecipe.count().then(function(count){
				app.recipesFiltermanager.set('foundCount',count);
			});
			// limit
	    	var limit = (this.get('limit'))?this.get('limit'):21;
			this.qRecipe.limit(limit);
			var skip = (this.get('skip'))?this.get('skip'):0;
			this.qRecipe.skip(skip);
 
			// do it
			app.spinnerStart();
			this.qRecipe.find().then(function (list) {
				$('main').scrollTop(0);
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
			rQuery.include('originalWriter');
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
				if (param[0] == 't') {
					app.recipesFiltermanager.set( { text: param[1] }, { validate: true } );
					$('#search').val(param[1]);
					$('.app-header .mdl-textfield--expandable').addClass('is-focused');
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
			app.recipesFiltermanager.set({user: null}, {validate: true});
			app.recipesFiltermanager.search();
		}
	});

// Views ===================================================================================================================
	app.ApplicationView = Backbone.View.extend({
		el: 'body',
		events: {
			'keyup #newLabelgroup'           : 'createLabelgroup',
			'keyup #search'                  : 'search',
			'click #btnCreateRecipe'         : 'createRecipe',
			'click .cmdListMyRecipes'        : 'listMyRecipes',
			'click .cmdListAllRecipes'       : 'listAllRecipes',
			'click .cmdListFavoritedRecipes' : 'listFavoritedRecipes',
			'click .cmdListFollowedPeople'   : 'onFollowedPeople',
			'click .btnSignIn' 				 : 'facebookLogin',
			'click .app-user-name'			 : 'listMyRecipes',
			'click .btnLogout'				 : 'logout',
			'click .changeLang'				 : 'onChangelang',
			'click .onContact'				 : 'onContact',
			'click .onPrivacy'				 : 'onPrivacy',
			'click .onAbout'				 : 'onAbout',
			'click header .add-favorite'	 : 'onAddFavorite',
			'click .app-drawer-header'		 : 'onGoProfile'
		},
		initialize: function() {
			this.template = _.template(underi18n.template(app.templates.application, app.localeDict));
		},
		render: function() {
			this.$el.empty();
			var user = null
			if (app.loginedUser) {
				user = app.loginedUser.toJSON();
			}
			var html = $(this.template({user:user}));
			this.$el.html(html);
			componentHandler.upgradeAllRegistered();

			$('#btnLng').text(app.localeCode);
			return this;
		},
		onChangelang: function(event) {
			app.chanegLocale($(event.target).attr('data'))
		},
		facebookLogin: function(e){
            Parse.FacebookUtils.logIn("public_profile,email,user_birthday,user_hometown,user_location,publish_actions,user_likes", {
				success: function(user) {
				    if (!user.existed()) {
				      // alert("User signed up and logged in through Facebook!");
				      	if (ga) { ga('send', {
							'hitType'       : 'event',        // Required.
							'eventCategory' : 'user',         // Required.
							'eventAction'   : 'register',     // Required.
							'event}Label'    : 'registration by facebook'
						});}
				    } 
				    else {
				        // alert("User logged in through Facebook!");
				      	if (ga) { ga('send', {
							'hitType'       : 'event',        // Required.
							'eventCategory' : 'user',         // Required.
							'eventAction'   : 'login',        // Required.
							'event}Label'    : 'login by facebook'
						});}
				    }
				    app.setFacebookUser();
				},
				error: function(user, error) {
					// alert("User cancelled the Facebook login or did not fully authorize.");
				}
            });
		},
		logout: function(e) {
			Parse.User.logOut();
			location.reload();
		},
		onGoProfile: function(event) {
			if(app.recipesFiltermanager.get('user')) {
				if (app.recipesFiltermanager.get('user').get('profileLink')) {
					window.open(app.recipesFiltermanager.get('user').get('profileLink'));
				}
			}
		},
		onAddFavorite: function(event) {
			if (app.loginedUser) {
				if(app.currentLayout=='view') {
					var followed = app.toggleRecipeFavorite(app.recipeView.model);
					if (followed) {
						$('header .add-favorite i').text('favorite_border');
					}
					else {
						$('header .add-favorite i').text('favorite');
					}
				}
				else {
					if(app.recipesFiltermanager.get('user')) {
						var followed = app.followUser(app.recipesFiltermanager.get('user'));
						if (followed) {
							$('header .add-favorite i').text('favorite_border');
						}
						else {
							$('header .add-favorite i').text('favorite');
						}
					}
				}
			}
			else {
				app.applicationView.facebookLogin(event);
			}
		},
		onContact: function(event) {
			window.open("http://www.justfoodyou.com/contact.html");
		},
		onPrivacy: function(event) {
			window.open("http://www.justfoodyou.com/privacy.html");
		},
		onAbout: function(event) {
			window.open("http://www.justfoodyou.com/about.html");
		},
		createLabelgroup: function(event) {
			if(event.keyCode == 13) {
		        // app create new group
		        var newGroupName = $(event.target).val();
		        var newGroup = new app.LabelGroup();
		        app.createLabelgroup(newGroupName);
		        $(event.target).val('');
		    }
		},
		createRecipe: function(event) {
			if (app.loginedUser) {
				app.createNewRecipe();
			}
			else {
				app.applicationView.facebookLogin(event);
			}
		},
		search: function(event) {
		    if(event.keyCode == 13) {
				app.recipesFiltermanager.set( { text: $(event.target).val() }, { validate:true } );
				app.recipesFiltermanager.set('favorites', false);
				app.switchLayout('list');
				app.recipesFiltermanager.search();
		    }
		},
		listMyRecipes: function(e) {
			if (app.loginedUser) {
				app.recipesFiltermanager.set( { user: app.loginedUser }, { validate:true } );
				app.recipesFiltermanager.set('favorites', false);
				app.router.navigate("/u/"+app.genUrlName(app.loginedUser.get('name'))+"-"+app.loginedUser.id, {trigger: false});
				app.switchLayout('user');
				app.recipesFiltermanager.search();
			}
			else {
				app.applicationView.facebookLogin(e);
			}
			return false;
		},
		onFollowedPeople: function(e) {
			if (app.loginedUser) {
				$('#FollowedPeoplePlaceholder').toggleClass('hide');
			}
			else {
				app.applicationView.facebookLogin(e);
			}
			return false;
		},
		listAllRecipes: function() {
			app.recipesFiltermanager.set( { user: null }, { validate:true } );
			app.recipesFiltermanager.set('labels', null);
			app.recipesFiltermanager.set('favorites', false);
			app.router.navigate("/", {trigger: false});
			app.switchLayout('list');
			app.recipesFiltermanager.search();
		
			return false;
		},
		listFavoritedRecipes: function(e) {
			if (app.loginedUser) {
				app.recipesFiltermanager.set( { user: null }, { validate:true } );
				app.recipesFiltermanager.set('favorites', true);
				app.router.navigate("/", {trigger: false});
				app.switchLayout('list');
				app.recipesFiltermanager.search();
			}
			else {
				app.applicationView.facebookLogin(e);
			}
		
			return false;
		}

	});

	app.RecipesFiltermanagerView = Backbone.View.extend({
		initialize: function() {
			// this.template = _.template(underi18n.template(app.templates.viewRecipe, app.localeDict));
			this.listenTo(this.model, 'change', this.render);
		    // this.render();
		},
		render: function() {
			return this;
		}
	});

	app.RecipeView = Backbone.View.extend({
		el       : '#viewRecipePlaceholder',
		events : {
			'click .btnEdit'        : 'onEdit',
			'click .btnClone'       : 'onClone',
			'click .author'         : 'onAuthor',
			'click .originalWriter' : 'onOriginalWriter',
			'click .close'          : 'onDiscard',
			'click .btnClose'       : 'onDiscard',
			'click .add-favorite'   : 'onToggleFavorite',
			'click .print'   		: 'onPrint',
			'click .kindle'   		: 'onKindle',
			'click .share'          : 'onShare'
		},

		initialize: function() {
			this.template = _.template(underi18n.template(app.templates.viewRecipe, app.localeDict));
			this.listenTo(this.model, 'change', this.render);
		    this.render();
		},
		remove: function() {
			this.$el.empty().off(); /* off to unbind the events */
			this.stopListening();
			return this;
		},
		render: function() {
			var owriter = (this.model.get('originalWriter'))?this.model.get('originalWriter').toJSON():null;
			var html = this.template({
				id: this.model.id, 
				recipe: this.model.toJSON(), 
				user: this.model.get('user').toJSON(),
				owriter: owriter,
				favorited : (app.favoritedRecipes.get(this.model.id))?true:false
			});

			var recipeLabels = this.model.get('labels');

			this.$el.html(html);

			var labels = new Array();
			for (var j = 0; j < recipeLabels.length; j++) {
				if (recipeLabels[j]) {
					this.$el.find('.labels').append('<span class="label label-success">' + recipeLabels[j].get('name') + '</span>');
				}
			};

			FB.XFBML.parse(this.el);
			(adsbygoogle = window.adsbygoogle || []).push({});
			return this;
		},
		onPrint: function() {
			app.print(this.model);
		},
		onKindle: function() {
			app.sendToKindle();
		},
		onAuthor: function() {
			// body...
			app.router.navigate("/u/"+app.genUrlName(this.model.get('user').get('name'))+"-"+this.model.get('user').id, {trigger: true});
		},
		onOriginalWriter: function() {
			// body...
			app.router.navigate("/u/"+app.genUrlName(this.model.get('originalWriter').get('name'))+"-"+this.model.get('originalWriter').id, {trigger: true});
		},
		onEdit: function() {
			app.editRecipe(this.model);
		},
		onToggleFavorite: function(event) {
			if(app.loginedUser) {
				if (app.toggleRecipeFavorite(this.model)) {
					this.$el.find('.add-favorite i').text('favorite_border');
				}
				else {
					this.$el.find('.add-favorite i').text('favorite');
				}
			}
			else {
				app.applicationView.facebookLogin(event);
			}
		},
		onClone: function(event) {
			if(app.loginedUser) {
				app.editRecipe(app.cloneRecipe(this.model));
			}
			else {
				app.applicationView.facebookLogin(event);
			}
		},
		onDiscard:function() {
			this.remove();
			app.switchLayout('list');
			if(app.listedRecipes.length == 0) {
				app.recipesFiltermanager.search();
			}
			app.recipeView = null;
			delete this;
		},
		onShare: function(event) {
			app.shareToFacebook(this.model);
			return true;
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
			'click #btnEditRecipeDiscard' : 'onDiscard',
			'click #btnEditRecipeDelete'  : 'onDelete'
		},

		initialize: function() {
			this.template = _.template(underi18n.template(app.templates.editRecipe, app.localeDict));
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
		        	static: true
			    },
			    imageDragging: false,
			    paste: {
			        forcePlainText: false,
			        cleanPastedHTML: true,
			        cleanReplacements: [],
			        cleanAttrs: ['class', 'style', 'id', 'on', 'onclick', 'src', 'href'],
			        cleanTags: ['meta', 'script', 'img']
			    }
			});

			return this;
		},
		renderLabelsGroups: function() {
			var currentUser = Parse.User.current();
			if (app.loginedUser.labelGroups == null) {
				return;
			}
			var groups = app.loginedUser.labelGroups.models;
			this.labelSelectors = new Array();
			this.$el.find('.labelGroups').empty();
			
			for (var i = 0; i<groups.length; i++) {					
				var glabels = new Array();
				if (app.loginedUser.labelCollection) {
					for (var j = 0; j<app.loginedUser.labelCollection.models.length; j++) {
						if (app.loginedUser.labelCollection.models[j].get('labelgroup').id == groups[i].id) {
							glabels.push(app.loginedUser.labelCollection.models[j]);
						}
					};
				}

				glabels = new Parse.Collection(glabels, {
					model: app.Label
				});

				var labelselector = new Backbone.LabelSelector({
					collection   : glabels,
					defaultLabel : {labelgroup: groups[i], user:currentUser}
				});
				var selectedLabels = this.model.get('labels');
				var sLabels = new Array();
				if (app.loginedUser.labelCollection) {
					for (var j = 0; j < selectedLabels.length; j++) {
						if (selectedLabels[j]) {
							var l = app.loginedUser.labelCollection.get(selectedLabels[j].id);
							if (l && l.get('labelgroup').id == groups[i].id) {
								sLabels.push(l);
							}
						}
					};
				}
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

			var selectedLabels = [];
			for (var i = this.labelSelectors.length - 1; i >= 0; i--) {
				selectedLabels = _.union(selectedLabels, this.labelSelectors[i].selectedLabels);
			};
			var searchmaskLabels = '';
			for (var i = 0; i < selectedLabels.length; i++) {
				searchmaskLabels += ' '+selectedLabels[i].get('name')
			};

			var text = $('#editRecipe .ingredients').text()+' '+$('#editRecipe .description').text()+' '+$('#editRecipe .directions').text();
			var div = document.createElement("div");
			div.innerHTML = text;
			text = div.textContent || div.innerText || "";

			var searchMask = this.model.get('name')+searchmaskLabels+' '+text;
			this.model.set('searchMask', app.genSearchMask(searchMask));
			this.model.set('searchMaskStr', this.model.get('searchMask').join("").substr(0,900) );

			this.model.set('description', $('#editRecipe .description').html());
			this.model.set('ingredients', $('#editRecipe .ingredients').html());
			this.model.set('directions', $('#editRecipe .directions').html());
			

			var recipeLanguage = franc(text);
			this.model.set('locale', recipeLanguage);
			this.model.set('labels', selectedLabels);
			// this.model.set('user', app.loginedUser);
			this.model.set('private', $('#switch-private')[0].checked);
			

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
							// console.log(result)
							$('[name=Policy]').val(result.policy);
							$('[name=Signature]').val(result.signature);

							var file = document.getElementById('image_upload').files[0];
						    var fd = new FormData();

						    fd.append('key', result.key);
						    fd.append('acl', 'public-read');   
						    fd.append('Content-Type', file.type);
						    fd.append('Cache-Control', 'max-age='+3600*24*7);     
						    fd.append('AWSAccessKeyId', s.AWSAccessKeyId);
						    fd.append('policy', result.policy)
						    fd.append('signature', result.signature);

						    fd.append("file",file);

						    var xhr = new XMLHttpRequest();

						    // xhr.upload.addEventListener("progress", uploadProgress, false);
						    xhr.addEventListener("load", function() {
						    	// console.log('img uploaded');
						    	var imageTags = $('.recipe-'+app.editRecipeView.model.id+' .image');
						    	if (imageTags && imageTags.length && imageTags[0].src) {
							    	$(imageTags).attr('src', imageTags[0].src +'?' +new Date().getTime());
						    	}

						    	app.editRecipeView.model.get('user').fetch();
						    	app.loadLabels(app.loginedUser);
							    app.spinnerStop();
								app.viewRecipe(app.editRecipeView.model);
								app.editRecipeView.remove();
								if (app.recipeListView) {
									app.recipeListView.trigger('change');
								}
								if (ga) { ga('send', {
									'hitType'       : 'event',        // Required.
									'eventCategory' : 'recipe',         // Required.
									'eventAction'   : 'uploadImage', // Required.
								});}
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
				if (ga) { ga('send', {
					'hitType'       : 'event',        // Required.
					'eventCategory' : 'recipe',         // Required.
					'eventAction'   : 'save', // Required.
				});}
			})

			// this.remove();
		},
		onDiscard:function() {
			$('.mdl-layout__header-row .recipeName').text('');
			if(this.model.id) {
				app.viewRecipe(this.model);			
			}
			else {
				app.switchLayout('list');
			}
			this.remove();
			app.editRecipeView = null;
			delete this;
		},
		onDelete: function(e) {
			this.model.destroy({
				success: function(result) {
					app.recipesFiltermanager.search();
					app.switchLayout('list');
					$('main').scrollTop(0);
					console.log('deleted:'+result);
				}
			});
			if (ga) { ga('send', {
				'hitType'       : 'event',        // Required.
				'eventCategory' : 'recipe',         // Required.
				'eventAction'   : 'delete', // Required.
			});}
		}
	})

	app.RecipeListItemView = Backbone.View.extend({
		tagName   : 'div',
		className : 'recipe-card col-sm-12 col-md-6 col-lg-4',
		events : {
			'click .btnRead'      : 'onRead',
			'click .btnClone'     : 'onClone',
			'click .author'       : 'onAuthor',
			'click .recipeName'   : 'onRead',
			'click .image'        : 'onRead',
			'click .add-favorite' : 'onToggleFavorite',
			'click .print' : 'onPrint',
			'click .share'  	  : 'onShare'
		},
		initialize: function() {
			this.template = _.template(underi18n.template(app.templates.recipeListItem, app.localeDict));
			this.listenTo(this.model, "change", this.render);
		},
		render: function() {
			var html = this.template({
				id        : this.model.id, 
				recipe    : this.model.toJSON(), 
				user      : this.model.get('user').toJSON(),
				favorited : (app.favoritedRecipes.get(this.model.id))?true:false
			});
			this.$el.html(html);

			var recipeLabels = this.model.get('labels');
			for (var j = 0; j < recipeLabels.length; j++) {
				if (recipeLabels[j]) {
					this.$el.find('.labels').append('<span class="label label-success">' + recipeLabels[j].get('name') + '</span>');
				}
			};
			return this;
		},
		onPrint: function() {
			app.print(this.model);
		},
		onRead: function(e) {
			app.viewRecipe(this.model);
		},
		onClone: function(event) {
			if(app.loginedUser) {
				app.editRecipe(app.cloneRecipe(this.model));
			}
			else {
				app.applicationView.facebookLogin(event);
			}
		},
		onAuthor: function() {
			app.router.navigate("/u/"+app.genUrlName(this.model.get('user').get('name'))+"-"+this.model.get('user').id, {trigger: true});
		},
		onToggleFavorite: function(event) {
			if(app.loginedUser) {
				if (app.toggleRecipeFavorite(this.model)) {
					this.$el.find('.add-favorite i').text('favorite_border');
				}
				else {
					this.$el.find('.add-favorite i').text('favorite');
				}
			}
			else {
				app.applicationView.facebookLogin(event);
			}
		},
		onShare: function(event) {
			app.shareToFacebook(this.model);
			return true;
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
				if(counter==5) {
					$list.append(this.renderAd());
					(adsbygoogle = window.adsbygoogle || []).push({});
				}
				else {
					this.renderOne(model)
				}
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
		renderAd: function() {
			return '<div class="col-sm-12 col-md-6 col-lg-4"><div className="recipe-card-content mdl-shadow--2dp"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-8159881314741914" data-ad-slot="5757549534" data-ad-format="auto"></ins></div></div>';
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
			'click span'          : 'onSelect',
			'click .delete-label' : 'onDelete'
		},
		initialize: function() {
			this.template = _.template(underi18n.template(app.templates.navigationLabel, app.localeDict));
			this.listenTo(this.model, "change", this.render);
		},
		render: function() {
			var owner = (app.loginedUser && app.loginedUser.id == this.model.get('user').id)?true:false;
			var html = this.template({id: this.model.id, label: this.model.toJSON(), owner: owner});
			this.$el.html(html);
			return this;
		},
		onSelect: function(e) {
			app.recipesFiltermanager.toggleLabel(this.model);
			app.switchLayout('list');
			app.recipesFiltermanager.search();
		},
		onDelete: function(e) {
			this.model.destroy({
				success: function() {
					app.loadLabels(app.loginedUser);
				}
			});
			if (ga) { ga('send', {
				'hitType'       : 'event',        // Required.
				'eventCategory' : 'label',         // Required.
				'eventAction'   : 'delete', // Required.
			});}
		}
	});

	app.NavigationFollowedUserItemView = Backbone.View.extend({
		tagName : 'a',
		className : 'navigation__link',
		events : {
			'click'    : 'doFilter'
		},
		initialize: function() {
			this.template = _.template(underi18n.template(app.templates.followedUserItem, app.localeDict));
		    this.listenTo(this.collection, 'change', this.render);
		    // this.render();
		},
		render: function() {
			this.$el.empty();
			var html = this.template({id: this.model.id, user: this.model.toJSON()});
			this.$el.html(html);
			return this;
		},
		doFilter: function(event) {
			app.recipesFiltermanager.set({user: this.model}, { validate: true } );
			app.recipesFiltermanager.search();
			app.switchLayout('user');
		}
	});

	app.NavigationFollowedUsersView = Backbone.View.extend({
		el: '#FollowedPeoplePlaceholder',
		initialize: function() {
			this.template = _.template(underi18n.template(app.templates.followedUserList, app.localeDict));
		    this.listenTo(this.collection, 'change', this.render);
		    // this.render();
		},
		render: function() {
			this.$el.empty();
			var html = this.template({});
			this.$el.append(html);
			this.collection.each(function(model) {
				var item = new app.NavigationFollowedUserItemView({model: model});
				this.$el.find('.labels').append(item.render().$el);
		    }, this);

			return this;
		}
	});

	app.NavigationLabelGroupItemView = Backbone.View.extend({
		tagName: 'div',
		className : 'app-navigation mdl-navigation mdl-color--light-green-800',
		events : {
			'click .groupName'    : 'toggleShow',
			'click .delete-group' : 'onDelete',
			'keyup .newLabel'     : 'onCreateLabel'
		},
		initialize: function() {
			this.template = _.template(underi18n.template(app.templates.navigationLabelGroup, app.localeDict));
		    this.listenTo(this.collection, 'change', this.render);
		    // this.render();
		},
		toggleShow: function() {
			// this.$el.find('a').toggle();
			this.$el.find('.labels').toggleClass('hidden');
			this.$el.find('.newLabel').toggleClass('hidden');
			var icon = this.$el.find('i')[0];
			if ($(this.$el.find('.labels')[0]).hasClass('hidden')) {
				$(icon).text('chevron_right');
				if ($.cookie('expandedLabelGroups')) {
					var openedGroups = _.without($.cookie('expandedLabelGroups').split(','), this.model.id);
				}
				else {
					openedGroups = [this.model.id];
				}
				$.cookie('expandedLabelGroups', openedGroups);
			}
			else {
				$(icon).text('expand_more');
				if ($.cookie('expandedLabelGroups')) {
					var openedGroups = $.cookie('expandedLabelGroups').split(',');
					if(_.indexOf(openedGroups, this.model.id)==-1) {
						openedGroups.push(this.model.id);
					} 
				}
				else {
					var openedGroups = [this.model.id]
				}
				$.cookie('expandedLabelGroups', openedGroups);
			}
		},
		render: function() {
			this.$el.empty();
			var owner = (app.loginedUser && app.loginedUser.id == this.model.get('user').id)?true:false;
			var html = this.template({id: this.model.id, labelgroup: this.model.toJSON(), owner: owner});
			this.$el.append(html);

			var labels = app.labelCollection;
			for (var i = labels.models.length - 1; i >= 0; i--) {
				if (labels.models[i].get('labelgroup').id == this.model.id) {
					var navigationLabelView = new app.NavigationLabelView({model:labels.models[i]});
				  	this.$el.find('.labels').append(navigationLabelView.render().$el);
				}
			};
			if ($.cookie('expandedLabelGroups')) {
				var openedGroups = $.cookie('expandedLabelGroups').split(',');
				if(_.indexOf(openedGroups, this.model.id)>-1) {
					var icon = this.$el.find('i')[0];
					$(icon).text('expand_more');
					this.$el.find('.labels').removeClass('hidden');
					this.$el.find('.newLabel').removeClass('hidden');
				}
			}
			return this;
		},
		onDelete: function() {
			this.model.destroy({
				success: function() {
					app.loadLabels(app.loginedUser);
				}
			});
			if (ga) { ga('send', {
				'hitType'       : 'event',        // Required.
				'eventCategory' : 'label',         // Required.
				'eventAction'   : 'deleteGroup', // Required.
			});}
		},
		onCreateLabel: function(event) {
			if(event.keyCode == 13) {
		        // app create new group
		        var newLabelName = $(event.target).val();
		        app.createNewLabel(newLabelName, this.model);
		        $(event.target).val('');
		    }
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



// Translation DICT ========================================================================================================
	app.localeDicts = {
		'en' : {
			'All'                     : 'All',
			'Favorites'               : 'Favorites',
			'My'                      : 'My',
			'Shared'                  : 'Shared',
			'new'                     : 'new',
			'search'                  : 'search',
			'About'                   : 'About',
			'Contact'                 : 'Contact',
			'Legal_information'       : 'Legal information',
			'Save_to_My_Book'         : 'Save to My Book',
			'Read'                    : 'Read',
			'Close'                   : 'Close',
			'Edit'                    : 'Edit',
			'Delete'                  : 'Delete',
			'Save'                    : 'Save',
			'Name'                    : 'Name',
			'Description'             : 'Description',
			'Ingredients'             : 'Ingredients',
			'Directions'              : 'Directions',
			'Labels'                  : 'Labels',
			'Discard'                 : 'Discard',
			'Save changes'            : 'Save changes',
			'Logout'                  : 'Logout',
			'Login'                   : 'Login',
			'Sign_In'                 : 'Sign In',
			's_recipes'               : "'s recipes",
			'placeholder_recipe_name' : 'Recipe name',
			'placeholder_recipe_desc' : 'Type description...',
			'placeholder_recipe_ingr' : 'Type ingredients...',
			'placeholder_recipe_dir'  : 'Type directions',
			'editRecipePrepTime'      : 'Preparation time (minute): ',
			'editRecipeCookTime'      : ', cook time: ',
			'editRecipeMakeTime'      : ', sum make time: ',
			'makeTime'				  : 'Make time (minute):',
			'AllinJustFoodYou'				  : 'All in Just Food You',
			'FavoritedPeople'		  : 'Friends',
			'originalWriter'		  : 'Original writer',
			'CreateLabelGroup'		  : 'Create label group',
			'CreateLabel'		  : 'Create label'
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
			'Delete'            : 'Törlés',
			'Save'              : 'Mentés',
			'Read'              : 'Olvas',
			'Close'             : 'Bezár',
			'Name'              : 'Név',
			'Description'       : 'Leírás',
			'Ingredients'       : 'Hozzávalók',
			'Directions'        : 'Elkészítés',
			'Labels'            : 'Cimkék',
			'Discard'           : 'Elvet',
			'Save changes'      : 'Mentés',
			'Logout'            : 'Kilépés',
			'Login'             : 'Belépés',
			'Sign_In'           : 'Regisztráció',
			's_recipes'			: " receptjei",
			'placeholder_recipe_name' : 'Recept neve',
			'placeholder_recipe_desc' : 'Rövid imsertető',
			'placeholder_recipe_ingr' : 'Hozzávalók',
			'placeholder_recipe_dir' : 'Elkészítése',
			'editRecipePrepTime'      : 'Elkészítéselőkészítés ideje (perc):',
			'editRecipeCookTime'      : ', elkészítés ideje:',
			'editRecipeMakeTime'      : ', összesen:',
			'makeTime'				  : 'Elkészítése (perc):',
			'AllinJustFoodYou'				  : 'All in Just Food You',
			'FavoritedPeople'		  : 'Barátok',
			'originalWriter'		  : 'Eredetileg lejegyezte',
			'CreateLabelGroup'		  : 'Cimkecsoport létrehozása',
			'CreateLabel'    		  : 'Cimke létrehozása',
		} 

	};

// utils
	function removeDiacritics (str) {

		var defaultDiacriticsRemovalMap = [
			{'base':'A', 'letters':/[\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F]/g},
			{'base':'AA','letters':/[\uA732]/g},
			{'base':'AE','letters':/[\u00C6\u01FC\u01E2]/g},
			{'base':'AO','letters':/[\uA734]/g},
			{'base':'AU','letters':/[\uA736]/g},
			{'base':'AV','letters':/[\uA738\uA73A]/g},
			{'base':'AY','letters':/[\uA73C]/g},
			{'base':'B', 'letters':/[\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181]/g},
			{'base':'C', 'letters':/[\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E]/g},
			{'base':'D', 'letters':/[\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779]/g},
			{'base':'DZ','letters':/[\u01F1\u01C4]/g},
			{'base':'Dz','letters':/[\u01F2\u01C5]/g},
			{'base':'E', 'letters':/[\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E]/g},
			{'base':'F', 'letters':/[\u0046\u24BB\uFF26\u1E1E\u0191\uA77B]/g},
			{'base':'G', 'letters':/[\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E]/g},
			{'base':'H', 'letters':/[\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D]/g},
			{'base':'I', 'letters':/[\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197]/g},
			{'base':'J', 'letters':/[\u004A\u24BF\uFF2A\u0134\u0248]/g},
			{'base':'K', 'letters':/[\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2]/g},
			{'base':'L', 'letters':/[\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780]/g},
			{'base':'LJ','letters':/[\u01C7]/g},
			{'base':'Lj','letters':/[\u01C8]/g},
			{'base':'M', 'letters':/[\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C]/g},
			{'base':'N', 'letters':/[\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4]/g},
			{'base':'NJ','letters':/[\u01CA]/g},
			{'base':'Nj','letters':/[\u01CB]/g},
			{'base':'O', 'letters':/[\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C]/g},
			{'base':'OI','letters':/[\u01A2]/g},
			{'base':'OO','letters':/[\uA74E]/g},
			{'base':'OU','letters':/[\u0222]/g},
			{'base':'P', 'letters':/[\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754]/g},
			{'base':'Q', 'letters':/[\u0051\u24C6\uFF31\uA756\uA758\u024A]/g},
			{'base':'R', 'letters':/[\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782]/g},
			{'base':'S', 'letters':/[\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784]/g},
			{'base':'T', 'letters':/[\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786]/g},
			{'base':'TZ','letters':/[\uA728]/g},
			{'base':'U', 'letters':/[\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244]/g},
			{'base':'V', 'letters':/[\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245]/g},
			{'base':'VY','letters':/[\uA760]/g},
			{'base':'W', 'letters':/[\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72]/g},
			{'base':'X', 'letters':/[\u0058\u24CD\uFF38\u1E8A\u1E8C]/g},
			{'base':'Y', 'letters':/[\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE]/g},
			{'base':'Z', 'letters':/[\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762]/g},
			{'base':'a', 'letters':/[\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250]/g},
			{'base':'aa','letters':/[\uA733]/g},
			{'base':'ae','letters':/[\u00E6\u01FD\u01E3]/g},
			{'base':'ao','letters':/[\uA735]/g},
			{'base':'au','letters':/[\uA737]/g},
			{'base':'av','letters':/[\uA739\uA73B]/g},
			{'base':'ay','letters':/[\uA73D]/g},
			{'base':'b', 'letters':/[\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253]/g},
			{'base':'c', 'letters':/[\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184]/g},
			{'base':'d', 'letters':/[\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A]/g},
			{'base':'dz','letters':/[\u01F3\u01C6]/g},
			{'base':'e', 'letters':/[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/g},
			{'base':'f', 'letters':/[\u0066\u24D5\uFF46\u1E1F\u0192\uA77C]/g},
			{'base':'g', 'letters':/[\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F]/g},
			{'base':'h', 'letters':/[\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265]/g},
			{'base':'hv','letters':/[\u0195]/g},
			{'base':'i', 'letters':/[\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131]/g},
			{'base':'j', 'letters':/[\u006A\u24D9\uFF4A\u0135\u01F0\u0249]/g},
			{'base':'k', 'letters':/[\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3]/g},
			{'base':'l', 'letters':/[\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747]/g},
			{'base':'lj','letters':/[\u01C9]/g},
			{'base':'m', 'letters':/[\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F]/g},
			{'base':'n', 'letters':/[\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5]/g},
			{'base':'nj','letters':/[\u01CC]/g},
			{'base':'o', 'letters':/[\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275]/g},
			{'base':'oi','letters':/[\u01A3]/g},
			{'base':'ou','letters':/[\u0223]/g},
			{'base':'oo','letters':/[\uA74F]/g},
			{'base':'p','letters':/[\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755]/g},
			{'base':'q','letters':/[\u0071\u24E0\uFF51\u024B\uA757\uA759]/g},
			{'base':'r','letters':/[\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783]/g},
			{'base':'s','letters':/[\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B]/g},
			{'base':'t','letters':/[\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787]/g},
			{'base':'tz','letters':/[\uA729]/g},
			{'base':'u','letters':/[\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289]/g},
			{'base':'v','letters':/[\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C]/g},
			{'base':'vy','letters':/[\uA761]/g},
			{'base':'w','letters':/[\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73]/g},
			{'base':'x','letters':/[\u0078\u24E7\uFF58\u1E8B\u1E8D]/g},
			{'base':'y','letters':/[\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF]/g},
			{'base':'z','letters':/[\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763]/g}
		];

		for(var i=0; i<defaultDiacriticsRemovalMap.length; i++) {
			str = str.replace(defaultDiacriticsRemovalMap[i].letters, defaultDiacriticsRemovalMap[i].base);
		}

	  return str;
	}

