// var Typeahead = Backbone.Typeahead;
Backbone.View.prototype.close = function() {
	this.remove();
	this.unbind();
	if (this.onClose) {
		this.onClose();
	}
}
Parse.User.prototype.getUrl =  function() {
	if(this.get('name')) {
		return app.settings.applicationUrl+this.getRelativeUrl();
	}
}
Parse.User.prototype.getRelativeUrl = function() {
	if(this.get('name')) {
		return "#/u/"+app.utils.genUrlName(this.get('name'))+"-"+this.id
	}
}
var s, app = {
    settings: {
		applicationId    : "uJLDpdzRo0AS07SHiXDRUR6dX2egvU9rKcbHkIMP",
		applicationKey   : "LkeF59Hh5HXrketX8qw6SFWwFALnVu8vqJKwkp5n",
		facebookAppId    : "890469204379378", // Production
		// facebookAppId : "905249916234640", //Test
		AWSAccessKeyId   : "AKIAJ5EPMLPXAQVXTNPQ",
		amazonBucket     : "cookbookimg",
		analytics        : 'UA-5658990-11',
		applicationUrl   : 'http://www.justfoodyou.com/'
    },
    templates: {
		// 'application'          : '#application-tmpl',
		// 'viewRecipe'           : '#viewRecipe-tmpl',
		// 'editRecipe'           : '#editRecipe-tmpl',
		// 'recipeListItem'       : '#recipeListItem-tmpl',
		// 'navigationLabel'      : '#navigationLabel-tmpl',
		// 'navigationLabelGroup' : '#navigationLabelGroup-tmpl',
		// 'followedUserList'	   : '#followedUserList-tmpl',
		// 'followedUserItem'	   : '#followedUserItem-tmpl',
		// 'googleAdsCard'		   : '#googleAdsCard-tmpl'
    },
    labelCollection: null,
    loginedUser: null, //User.labelCollection = null
    viewUser: null,
	recipeView: null,
	editRecipeView: null,
	recipeListView: null,
    init: function() {
        s = this.settings;
        this.loadRemoteTemplates();
    },
    initalizers: function() {
    	window.location.hash = window.location.hash.replace(/#!/, '#');
    	this.setAppLocale();
    	// this.loadTemplates();
		this.applicationView  = new this.ApplicationView();
		this.loginedUser = null;
    	this.facebookUser = null;

		// Parse.initialize(s.applicationId, s.applicationKey);
		// window.fbAsyncInit = function() {
		//     Parse.FacebookUtils.init({ // this line replaces FB.init({
		//       appId      : s.facebookAppId, // Facebook App ID
		//       status     : true,  // check Facebook Login status
		//       cookie     : true,  // enable cookies to allow Parse to access the session
		//       xfbml      : true,  // initialize Facebook social plugins on the page
		//       // version    : 'v2.3' // point to the latest Facebook Graph API version
		//     });
		// }

		// Models
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
		app.recipesFiltermanager.setUserFilter(null);
		// app.recipesFiltermanager.set({user: null}, {validate: true});

		//start
		if (Parse.User.current()) {
    		app.loginedUser = Parse.User.current();
    		var userID = app.loginedUser.id;

    		app.google.analytics.setUserSegment(app.loginedUser);
    		app.google.chrome.extLogin();

    		var query = new Parse.Query(Parse.User);
			    if(app.loginedUser.get('inited')) {
			    	app.setAppLocale(app.loginedUser.get('locale'));
			    	app.applicationView.render();
			    	app.labelManager.loadLabels(app.loginedUser, false);
			    	app.userManager.loadFavoritedRecipes();
			    	app.userManager.loadFollowedUsers();
			    	app.router = new app.AppRouter();
					Backbone.history.start();
			    }
			    else {
			    	app.userManager.initNewUser();
			    }
    	}
    	else {
    		// Anonymous user;
    		var userID = 'auto'
    		app.google.analytics.setUserSegment(null);
	    	app.applicationView.render();
	    	app.router = new app.AppRouter();
			Backbone.history.start();
    	}
    	app.google.analytics.start(userID);
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
			this.localeDict = underi18n.MessageFactory(this.localeDicts['en']);
    	}
    },
    chanegLocale: function(localeCode) {
    	app.google.analytics.sendEvent('user', 'chanegLocale', localeCode);
    	this.setAppLocale(localeCode);
    	if(app.loginedUser) {
    		app.loginedUser.set('locale',localeCode);
    		app.loginedUser.save().then(function(){
    			location.reload();
    		});
    	}
    	else {
    		location.reload();
    	}
    },
    loadRemoteTemplates: function(callback) {
		$.ajax({
	        type: "GET",
	        url: "templates.html",
	        success: function(data) {
				_.each($.parseHTML(data), function(item){
					if(item.id){
						app.templates[item.id] = $(item).html()
					}
				})
				app.initalizers();
			}
		})
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
    switchLayout: function(layout) {
    	this.currentLayout = layout;

    	if (layout!='list') {
	    	app.tempScrollTop = $("main").scrollTop();
    	}

    	var zones = ['recipeResultsList', 'viewRecipe', 'editRecipe' ]
    	zones.forEach(function(element, index, array){ 
    		$('#'+element).hide();
    	})

    	var buttons = ['btnCreateRecipe', 'btnEditRecipe'];
    	buttons.forEach(function(element, index, array){ 
    		$('#'+element).hide();
    	})
    	if (this.editRecipeView && layout!='edit') {
    		this.editRecipeView.close();
    	}
    	if (this.recipeView && layout!='view') {
    		this.recipeView.close();
    	}

    	switch(layout) {
	    	case 'list':
		    	$('#recipeResultsList').show();
		    	$('#btnCreateRecipe').show();
		    	if (app.tempScrollTop) {
			    	$("main").scrollTop(app.tempScrollTop);
		    	}
		    	// app.tempScrollTop = 0;
	    		window.document.title='Just Food You';
		    	var filteredUser = app.recipesFiltermanager.get('user');
		    	if (filteredUser) {
		    		app.router.navigate(filteredUser.getRelativeUrl(), {trigger: false});
			    	$('.mdl-layout-title').html(filteredUser.get('name') + app.localeDict('s_recipes'));
			    	window.document.title='Just Food You - '+filteredUser.get('name') + app.localeDict('s_recipes');

					if (app.followedUsers && app.followedUsers.get(filteredUser.id)) {
						$('header .add-favorite i').text('favorite');
					}
					else {
						$('header .add-favorite i').text('favorite_border');
					}

					// app.labelManager.renderLabels();
					app.google.analytics.pageview(filteredUser.getRelativeUrl(), filteredUser.get('name')+"'s recipes");
		    	}
		    	else {
		    		app.router.navigate( "/", { trigger: false } );
		    		$('.mdl-layout-title').html('');	
		    		$('header .add-favorite i').text(''); 
		    		// app.labelManager.renderLabels();
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
				// app.labelManager.renderLabels();
				app.google.analytics.pageview(app.recipeView.model.getRelativeUrl(), app.recipeView.model.get('name'));
		    	break;	
	    	case 'edit':
		    	$("main").scrollTop();
		    	$('#editRecipe').show();
		    	$('.mdl-layout-title').html(app.editRecipeView.model.get('name'));
		    	if (app.editRecipeView.model.id) {
			    	app.google.analytics.pageview(app.editRecipeView.model.getRelativeEditUrl(), app.editRecipeView.model.get('name'));
		    	}
	    		break;
    	}
    },
} // app

// Models ==================================================================================================================

	app.Recipe = Parse.Object.extend("Recipe", {
		defaults:{
			name          : '',
			coverImageUrl : '',
			description   : '',
			ingredients   : '',
			directions    : '',
			source        : '',
			labels        : new Array(),
			private       : false
	    },
		makeSearchMasks: function() {
			var selectedLabels = this.get('labels');
			var searchmaskLabels = '';

			for (var i = 0; i < selectedLabels.length; i++) {
				searchmaskLabels += ' '+selectedLabels[i].get('name');
			};

			var textContens = '';
        	textContens += app.utils.htmlToText(this.get('description'));	
        	textContens += app.utils.htmlToText(this.get('ingredients'));	
        	textContens += app.utils.htmlToText(this.get('directions'));	

	    	var recipeLanguage = franc(textContens);

			var searchMask = this.get('name')+searchmaskLabels+' '+textContens;
			searchMask = app.utils.genSearchMask(searchMask);
			var searchMaskStr = (searchMask.length)?searchMask.join("").substr(0,900):'';

	    	this.set({ 
				locale        : recipeLanguage,
				searchMask    : searchMask,
				searchMaskStr : searchMaskStr
	    	})
		},
		uploadImage: function(imageFile, callback) {
			var imageExts = {
				"image/png":"png",
				"image/jpg":"jpg",
				"image/jpeg":"jpg"
			}
			var imgUrl = 'https://s3.amazonaws.com/'+s.amazonBucket+'/users/'+app.loginedUser.id+'/recipes/'+this.id+'/cover.'+imageExts[imageFile.type];
			this.set('coverImageUrl',  imgUrl+'?' +new Date().getTime() );
			this.save();
			var filePath = 'users/'+app.loginedUser.id+'/recipes/'+this.id+'/cover';
			app.utils.uploadFileToAmazon(imageFile, filePath, callback);
		},
		uploadWebImage: function(url, callback) {
			var coverUrl = 'https://s3.amazonaws.com/'+s.amazonBucket+'/users/'+app.loginedUser.id+'/recipes/'+this.id+'/cover.'+url.substr(-3);
			this.set('coverImageUrl',  coverUrl+'?' +new Date().getTime() );
			this.save();
			var filePath = 'users/'+app.loginedUser.id+'/recipes/'+this.id+'/cover';
			app.utils.uploadWebImageToAmazon(url, filePath, callback);
		},
		setPrivateAcl: function() {
			var private = this.get('private');
			var currentACL = this.getACL();
			if (typeof currentACL === 'undefined') {
				currentACL = new Parse.ACL();
			}

			currentACL.setPublicReadAccess(true);
			currentACL.setPublicWriteAccess(false);

			currentACL.setWriteAccess(app.loginedUser.id, true);
			if(private) {
				currentACL.setPublicReadAccess(false);
				currentACL.setReadAccess(app.loginedUser.id, true);
			}

			this.setACL(currentACL);
		},
		getUrl: function() {
			return app.settings.applicationUrl+this.getRelativeUrl();
		},
		getRelativeUrl: function() {
			return '#!recipe/_'+app.utils.genUrlName(this.get('name'))+'-'+this.id;
		},
		getEditUrl: function() {
			return app.settings.applicationUrl+this.getRelativeEditUrl();
		},
		getRelativeEditUrl: function() {
			return '#editRecipe/_'+app.utils.genUrlName(this.get('name'))+'-'+this.id;
		}
	}); // app.Recipe

//  Managers ===============================================================================================================
	app.userManager = {
		initNewUser: function() {
			app.loginedUser.set('inited', true);
			app.loginedUser.save().then(function() {
		    	Parse.Cloud.run('initUser')
		    	location.reload();
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
				app.google.analytics.sendEvent('user', 'user', 'unfollow');
			}
			else {
				relation.add(user);
				app.google.analytics.sendEvent('user', 'user', 'follow');
			}
			app.loginedUser.save().then( 
				function() {
					$('#FollowedPeoplePlaceholder').removeClass('hide');
					app.userManager.loadFollowedUsers();
				},
				function(error) {
			        console.log("Error: " + error.code + " " + error.message);
			    });
			return followed;
	    }
	} // app.userManager

	app.recipeManager = {
		toggleRecipeFavorite: function(recipe) {
			var favorited = (app.favoritedRecipes.get(recipe.id))?true:false;
			var favoritesRelation = app.loginedUser.relation('favorites');
			if (favorited) {
				favoritesRelation.remove(recipe);
				app.google.analytics.sendEvent('user', 'recipe', 'unfavorite');
			}
			else {
				favoritesRelation.add(recipe);
				app.google.analytics.sendEvent('user', 'recipe', 'favorite');
			}
			app.loginedUser.save().then( 
				function() {
					app.userManager.loadFavoritedRecipes();
				},
				function(error) {
			        console.log("Error: " + error.code + " " + error.message);
			    });
			return favorited;
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

	    	this.editRecipe(newRecipe);
			app.google.analytics.sendEvent('recipe', 'create', 'create');
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
				source    	  : orig.get('source'),
				user          : currentUser,
				labels        : new Array(),
				private       : false
	    	});
	    	app.google.analytics.sendEvent('recipe', 'clone', 'clone');
	    	return newRecipe;
	    },
	    editRecipe: function(recipe) { 
	    	app.editRecipeView = new app.EditRecipeView({model: recipe});
	    	app.switchLayout('edit');
	    	app.google.analytics.sendEvent('recipe', 'edit', 'edit');
	    },
	    viewRecipe: function(recipe) {
	    	if (app.recipeView) {
	    		app.recipeView.close();
	    	}
	    	app.router.navigate(recipe.getRelativeUrl(), { trigger: false } );
	    	window.document.title='Just Food You - '+recipe.get('name');
	    	app.recipeView = new app.RecipeView({model: recipe});
	    	app.switchLayout('view');
	    	app.google.analytics.sendEvent('recipe', 'read', 'read');
	    },
		renderRecipeList: function(recipeList) {
			app.recipeListView = new app.RecipeListView({collection: recipeList});
			app.recipeListView.render();
		},
		print: function(recipe) {
			window.open('/?_escaped_fragment_=recipe/_'+app.utils.genUrlName(recipe.get('name'))+'-'+recipe.id);
			app.google.analytics.sendEvent('recipe', 'print', 'print');
		},
		sendToKindle: function(recipe) {
			window.open('/?_escaped_fragment_=recipe/_'+app.utils.genUrlName(recipe.get('name'))+'-'+recipe.id+'#sendToKindle');
	        // window.readabilityToken = '';
	        // var s = document.createElement('script');
	        // s.setAttribute('type', 'text/javascript');
	        // s.setAttribute('charset', 'UTF-8');
	        // s.setAttribute('src', '//www.readability.com/bookmarklet/send-to-kindle.js');
	        // document.documentElement.appendChild(s);
	        app.google.analytics.sendEvent('recipe', 'sendToKindle', 'sendToKindle');
		}
	} // app.recipeManager

	app.labelManager = {
		loadLabels: function(filterUser, renderLabels) {
	    	var labelGroupQuery = new Parse.Query(app.LabelGroup);
			labelGroupQuery.equalTo("user", filterUser);
			labelGroupQuery.ascending('weight');
			labelGroupQuery.find({
				success: function(labelgroups) {
					
					if (app.loginedUser && labelgroups.length && ( labelgroups[0].get('user').id == app.loginedUser.id  )) {
						app.loginedUser.labelGroups = new Parse.Collection(labelgroups, {model: app.LabelGroup});
					}
					else {
						app.labelGroupCollection = new Parse.Collection(labelgroups, {model: app.LabelGroup});
					}

					var labelQuery = new Parse.Query(app.Label);
		    		labelQuery.equalTo("user", filterUser);
		    		labelQuery.descending('name');
		    		labelQuery.limit(300)
		    		labelQuery.find({
		    			success: function(labels) {
		    				app.recipesFiltermanager.set('labels',[]);
		    				if (app.loginedUser && labels.length && ( labels[0].get('user').id == app.loginedUser.id  )) {
								app.loginedUser.labelCollection = new Parse.Collection(labels, {model: app.Label});
							}
							else {
			    				app.labelCollection = new Parse.Collection(labels, {model: app.Label});
							}
							if (renderLabels) {
								app.labelManager.renderLabels();
							}
		    			}
		    		});
				}
			});
	    },
	    renderLabels: function() {
			$(app.NavigationLabelGroupView.prototype.el).empty(); //#LabelGroupsViewPlaceholder'
			if (app.loginedUser && app.recipesFiltermanager.get('user') && 
				app.recipesFiltermanager.get('user').id == app.loginedUser.id) {
				if (app.loginedUser.labelGroups) {
					app.navigationLabelGroupView = new app.NavigationLabelGroupView({collection: app.loginedUser.labelGroups});
				}
			}
			else {
				if (app.labelGroupCollection) {
					app.navigationLabelGroupView = new app.NavigationLabelGroupView({collection: app.labelGroupCollection});	
				}
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
				        app.labelManager.loadLabels(app.loginedUser, true);
				        $(event.target).val('');
	        		}
	        	}
	        });
	        app.google.analytics.sendEvent('labelgroup', 'create', 'create');
	    },
	    createLabel: function(newLabelName, group) {
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
			        app.labelManager.loadLabels(app.loginedUser, true);
	        	}
	        });
	        app.google.analytics.sendEvent('label', 'create', 'create');
	    },
	    deleteLabel: function(label) {
	    	app.google.analytics.sendEvent('label', 'delete', label.get('name'));
			label.destroy({
				success: function() {
					app.labelManager.loadLabels(app.loginedUser, true);
				}
			});
	    }
	} // app.labelManager

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
			limit          : 100,
			start          : 0
	    },
	    validate: function(attrs) {
	    	if ( _.has(attrs,"text") ) {
	    		if (attrs.text) {
		    		$('#search').val(attrs.text);
		    		$('.app-header .mdl-textfield--expandable').addClass('is-focused');
	    		}
	    		else {
	    			$('#search').val('');
		    		$('.app-header .mdl-textfield--expandable').removeClass('is-focused');	
	    		}
	    	}
	  	},
	  	setUserFilter: function(user) {
	  		this.set('user', user);
	  		// this.set('labels', []);
	  		if(user) {
				$('.filter-user-avatar').attr('src',user.get('avatar'));
				$('.filter-user-name').html(user.get('name'));
				app.labelManager.loadLabels(user, true);
				
				this.set('favorites', false);
				this.set('text','');
				$('#search').val('');
				$('.app-header .mdl-textfield--expandable').removeClass('is-focused');
			}
			else {
				$('.filter-user-avatar').attr('src','/icon_512.png');
				$('.filter-user-name').html(app.localeDict('AllinJustFoodYou'));

				var user = new Parse.User(); 
				if (app.localeUsers[app.localeCode]) {
					user.id = app.localeUsers[app.localeCode];
				}
				else {
					user.id = app.localeUsers['en'];	
				}
				app.labelManager.loadLabels(user, true);
			}
	  	},
		addLabel: function(label) {
			var labels = this.get('labels');
			var index = _.indexOf(labels, label);
			if (index == -1) {
				labels.push(label);
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
			this.set( { labels: labels } );
		},
		toggleLabel: function(label) {
			var labels = this.get('labels');
			var index = _.indexOf(labels, label);
			if (index == -1) {
				labels.push(label);
				this.set('allPublicAcces', false);
				if(!this.get('user')) {
					var str = (this.get('text')+' '+label.get('name')).trim();
					this.set({ text: str }, {validate:true});
				}
			}
			else {
				labels.splice(index, 1);
				if(!this.get('user')) {
					var str = this.get('text');
					str = str.replace(new RegExp(label.get('name'), 'gi'), '').trim();
					this.set({text:str}, {validate:true});
				}
			}
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
	    	$('.createLabelgroup').removeClass('mdl-navigation__link');

			if (this.get('favorites')) {
				$('.app-navigation').find('.cmdListFavoritedRecipes i').addClass('mdl-color-text--light-green-400');
		    	$('.app-navigation').find('.cmdListFavoritedRecipes i').removeClass('mdl-color-text--light-green-900');
				var relation = app.loginedUser.relation("favorites");
				this.qRecipe = relation.query();
				app.google.analytics.pageview('/favorites', 'Favorites');
				app.google.analytics.sendEvent('recipe', 'list', 'favorites');
			}
			else {
				// keywords
				if ( this.get('text') != '' ) {
					var keywords = this.get('text').split(' ');
			    	if ( Array.isArray(keywords) && keywords.length ) {
			   			// keywords = _.uniq(app.utils.genSearchMask(keywords.join(' ')));
						// this.qRecipe.containsAll('searchMask', keywords);
						gaKeywords += keywords.join('+');
			    		var re = ""
			    		for (var i = 0; i < keywords.length; i++) {
			    			keywords[i] = app.utils.genSearchMask(keywords[i]);
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

				// labels
		    	var labels = this.get('labels');
		    	$('.app-navigation').find('.label').removeClass('mdl-color-text--light-green-400');
		    	$('.app-navigation').find('.label').addClass('mdl-color-text--light-green-900');
				var labelsId = [];
				if ( Array.isArray(labels) && labels.length ) {
					for (var i = 0; i < labels.length; i++) {
						var labelId = (labels[i].id)?labels[i].id:labels[i];
						labelsId.push( labelId );
						gaKeywords += "+label:"+labels[i].get('name');  // TODO
						$('.label-'+labelId).addClass('mdl-color-text--light-green-400');
						$('.label-'+labelId).removeClass('mdl-color-text--light-green-900');
					};
					navigationParams.push('l='+labelsId.join(','));
				}

				if( this.get('user') != null ) {
					gaKeywords += '+user'+this.get('user').id;

					//labels
					if (labelsId.length>0) {
						this.qRecipe.containsAll("labelsId", labelsId);  // AND
					}
					// this.qRecipe.containedIn("labelsId", ids); //OR

					// user
					this.qRecipe.equalTo('user', this.get('user'));
					if (app.loginedUser && app.loginedUser.id == this.get('user').id) {
						$('.app-navigation').find('.cmdListMyRecipes i').addClass('mdl-color-text--light-green-400');
				    	$('.app-navigation').find('.cmdListMyRecipes i').removeClass('mdl-color-text--light-green-900');
				    	$('.createLabelgroup').removeClass('hidden');
				    	$('.createLabelgroup').addClass('mdl-navigation__link');
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

			    	// Just original	
			    	this.qRecipe.equalTo('originalWriter', null);			
				}

				app.google.analytics.pageview('/search?q='+gaKeywords, 'Search');
				app.google.analytics.sendEvent('recipe', 'list', 'list');
			}

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
	    	var limit = (this.get('limit'))?this.get('limit'):100;
			this.qRecipe.limit(limit);
			var skip = (this.get('skip'))?this.get('skip'):0;
			this.qRecipe.skip(skip);
 
			// do it
			app.spinnerStart();
			this.qRecipe.find().then(function (list) {
				// $('main').scrollTop(0);
			    // use list
			    app.listedRecipes = new Parse.Collection(list, {model:app.Recipe});
			    app.recipeManager.renderRecipeList(app.listedRecipes);
			    app.spinnerStop();
			    // if(list.length) {
			    // 	if(list.length == 1) {
			    // 		app.recipeManager.viewRecipe(list[0]);
			    // 		app.switchLayout('view');
			    // 	}
			    // 	else {
					  //   // app.switchLayout('list');
			    // 	}
			    // }
			}, function (error) {
			    console.log(error);
			});
	    },
	}); // app.RecipesFiltermanager

// Router ==================================================================================================================

	app.AppRouter = Backbone.Router.extend({
		routes: {
		    "help":                 "help",    // #help
		    "recipe/:name-:rid":	"recipe",  // show recipe
		    "!recipe=:name-:rid":	"recipe",  // show recipe
		    "u/:name-:uid" : 		"user",	   // list user recipes
		    "!u/:name-:uid" : 		"user",	   // list user recipes
		    's/:search' : 			"search", 
		    '*path':  'defaultRoute'
	  	},
	  	initialize: function() {

	  	},
		user: function(name, uid) {
			var uQuery = new Parse.Query(Parse.User);
			uQuery.equalTo('objectId',uid);
			uQuery.find().then(function (list) {
				app.recipesFiltermanager.setUserFilter(list[0]);
				app.switchLayout('list');
				app.recipesFiltermanager.search();
			})
		},
		recipe: function(name, rid) {
			app.recipesFiltermanager.setUserFilter(null);
			var rQuery = new Parse.Query(app.Recipe);
			rQuery.equalTo('objectId',rid);
			// include
			rQuery.include('labels');
			rQuery.include('user');
			rQuery.include('originalWriter');
			rQuery.find().then(function (list) {
				app.recipeManager.viewRecipe(list[0]);
				app.switchLayout('view');
			})
		},
		search: function(search) {
			app.recipesFiltermanager.setUserFilter(null);
			// u=dasda&l=sdsada,dsadas,dsada&f&a   =>  u=user l=labels f=favorites a=all
			var params = search.split('&');
			for (var i = 0; i < params.length; i++) {
				var param = params[i].split('=');
				if (param[0] == 'u') {
					app.recipesFiltermanager.setUserFilter(param[1]);
				}
				if (param[0] == 'l') {
					var labelIds = param[1].split(','); 
					app.recipesFiltermanager.set( { labels: labelIds }, { validate: true } );
				}
				if (param[0] == 'a') {
					app.recipesFiltermanager.setUserFilter(null);
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
					app.recipesFiltermanager.setUserFilter(list[0]);
					app.switchLayout('list');
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
			app.recipesFiltermanager.setUserFilter(null);
			// app.recipesFiltermanager.set({user: null}, {validate: true});
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
			'click .chromeExt'				 : 'onChromeExt',
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
			var html = $(this.template({user:user, currentLocale:app.localeCode }));
			this.$el.html(html);

			$('#btnLng').text(app.localeCode);
			try {
				componentHandler.upgradeAllRegistered(); // material design lite update components/fix sizes
			} catch(e) {}
			return this;
		},
		onChangelang: function(event) {
			app.chanegLocale($(event.target).attr('data'))
		},
		facebookLogin: function(e){
            app.facebook.login();
		},
		logout: function(e) {
			app.google.analytics.sendEvent('user', 'logout', 'logout');
			Parse.User.logOut();
			location.reload();
		},
		onGoProfile: function(event) {
			if(app.recipesFiltermanager.get('user')) {
				app.router.navigate(app.recipesFiltermanager.get('user').getRelativeUrl(), {trigger: true});
				// if (app.recipesFiltermanager.get('user').get('profileLink')) {
				// 	app.google.analytics.sendEvent('user', 'facebookProfile', 'show facebook profile');
				// 	window.open(app.recipesFiltermanager.get('user').get('profileLink'));
				// }
			}
		},
		onAddFavorite: function(event) {
			if (app.loginedUser) {
				if(app.currentLayout=='view') {
					var followed = app.recipeManager.toggleRecipeFavorite(app.recipeView.model);
					if (followed) {
						$('header .add-favorite i').text('favorite_border');
					}
					else {
						$('header .add-favorite i').text('favorite');
					}
				}
				else {
					if(app.recipesFiltermanager.get('user')) {
						var followed = app.userManager.followUser(app.recipesFiltermanager.get('user'));
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
			window.open(app.settings.applicationUrl+"contact.html");
			return false;
		},
		onPrivacy: function(event) {
			window.open(app.settings.applicationUrl+"privacy.html");
			return false;
		},
		onAbout: function(event) {
			window.open(app.settings.applicationUrl+"about.html");
			return false;
		},
		onChromeExt: function(event) {
			window.open("https://chrome.google.com/webstore/detail/just-food-you-clipper/jehllbcgafncimgnhmnimpolkbjpglkd");
			return false;
		},
		createLabelgroup: function(event) {
			if(event.keyCode == 13) {
		        // app create new group
		        var newGroupName = $(event.target).val();
		        app.labelManager.createLabelgroup(newGroupName);
		        $(event.target).val('');
		    }
		},
		createRecipe: function(event) {
			if (app.loginedUser) {
				app.recipeManager.createNewRecipe();
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
				$('main').scrollTop(0);
		    }
		},
		listMyRecipes: function(e) {
			if (app.loginedUser) {
				app.recipesFiltermanager.setUserFilter(app.loginedUser);
				app.recipesFiltermanager.set('favorites', false);
				app.switchLayout('list');
				app.recipesFiltermanager.search();
				$('main').scrollTop(0);
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
			app.recipesFiltermanager.setUserFilter(null);
			app.recipesFiltermanager.set( { 
				favorites: false,
				text: ''
			}, { validate:true } );
			app.router.navigate("/", {trigger: false});
			app.switchLayout('list');
			app.recipesFiltermanager.search();
			$('main').scrollTop(0);
			return false;
		},
		listFavoritedRecipes: function(e) {
			if (app.loginedUser) {
				app.recipesFiltermanager.setUserFilter(null);
				app.recipesFiltermanager.set('favorites', true);
				app.router.navigate("/", {trigger: false});
				app.switchLayout('list');
				app.recipesFiltermanager.search();
				$('main').scrollTop(0);
			}
			else {
				app.applicationView.facebookLogin(e);
			}
		
			return false;
		}

	}); // app.ApplicationView

	app.RecipesFiltermanagerView = Backbone.View.extend({
		initialize: function() {
			this.listenTo(this.model, 'change', this.render);
		},
		render: function() {
			return this;
		}
	}); //app.RecipesFiltermanagerView

	app.RecipeView = Backbone.View.extend({
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
			'click .share'          : 'onShare',
			'click .label'			: 'onLabel'
		},

		initialize: function() {
			this.template = _.template(underi18n.template(app.templates.viewRecipe, app.localeDict));
			this.listenTo(this.model, 'change', this.render);
		    this.render();
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
			$('#viewRecipePlaceholder').append(this.$el);
			var labels = new Array();
			for (var j = 0; j < recipeLabels.length; j++) {
				if (recipeLabels[j]) {
					this.$el.find('.labels').append('<span class="label label-success">' + recipeLabels[j].get('name') + '</span>');
				}
			};

			// 
			try {FB.XFBML.parse(this.el);} catch (e) {}
			(adsbygoogle = window.adsbygoogle || []).push({});
			return this;
		},
		onPrint: function() {
			app.recipeManager.print(this.model);
		},
		onKindle: function() {
			app.recipeManager.sendToKindle(this.model);
		},
		onAuthor: function() {
			app.router.navigate(this.model.get('user').getRelativeUrl(), {trigger: true});
		},
		onOriginalWriter: function() {
			app.router.navigate(this.model.get('originalWriter').getRelativeUrl(), {trigger: true});
		},
		onEdit: function() {
			app.recipeManager.editRecipe(this.model);
		},
		onToggleFavorite: function(event) {
			if(app.loginedUser) {
				if (app.recipeManager.toggleRecipeFavorite(this.model)) {
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
				app.recipeManager.editRecipe(app.recipeManager.cloneRecipe(this.model));
				this.close();
			}
			else {
				app.applicationView.facebookLogin(event);
			}
		},
		onDiscard:function() {
			app.switchLayout('list');
			if(app.listedRecipes.length == 0) {
				app.recipesFiltermanager.search();
			}
			this.close();
			app.recipeView = null;
			delete this;
		},
		onShare: function(event) {
			app.facebook.shareRecipe(this.model);
			return true;
		},
		onLabel: function(event) {
			var labelText = $(event.target).text();
			app.recipesFiltermanager.set( {text: labelText}, {validate: true} );
			app.recipesFiltermanager.search();
			app.switchLayout('list');
		}
		
	}); // app.RecipeView

	app.EditRecipeView = Backbone.View.extend({
		events   : {
			'change .name'                : 'onChangeName',
			'change .description'         : 'onChangeDescription',
			'change .ingredients'         : 'onChangeIngredients',
			'change .directions'          : 'onChangeDirections',
			'change #editRecipeSource'    : 'onChangeSource',
			'click #btnEditRecipeSave'    : 'onSave',
			'click .close'                : 'onDiscard',
			'click #btnEditRecipeDiscard' : 'onDiscard',
			'click #btnEditRecipeDelete'  : 'onDelete',
		},
		initialize: function() {
			this.template = _.template(underi18n.template(app.templates.editRecipe, app.localeDict));
		    this.render();
		    this.uploadImageUrl = '';
		    this.renderLabelsGroups();
		},
		render: function() {
			$('.mdl-layout__header-row .recipeName').text(': '+this.model.get('name'));
			var html = this.template({id: this.model.id, recipe: this.model.toJSON()});
			// this.$el.html(html);
			this.$el.html(html);
			$('#editRecipePlaceholder').append(this.$el);

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

		    var dropbox = document.getElementById('dropbox');
		    dropbox.addEventListener('dragenter', noopHandler, false);
		    dropbox.addEventListener('dragexit', noopHandler, false);
		    dropbox.addEventListener('dragover', noopHandler, false);
		    dropbox.addEventListener('drop', drop, false);
		    
		    function noopHandler(evt) {
		        evt.stopPropagation();
		        evt.preventDefault();
		    }
		    function drop(evt) {
		        evt.stopPropagation();
		        evt.preventDefault(); 
		        var imageUrl = evt.dataTransfer.getData('URL');
		        if (imageUrl == '') {
					var file = evt.dataTransfer.files[0];
					$('#image_upload')[0].files = evt.dataTransfer.files
					var reader = new FileReader();
			        reader.onloadend = function() {
			            $('#editRecipe .image').attr('src', reader.result);
			        }
			        reader.readAsDataURL(file);
		        }
		        else {
			        $('#editRecipe .image').attr('src', imageUrl);
			        app.editRecipeView.uploadImageUrl = imageUrl;
		        }
		    }

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
			try {
				componentHandler.upgradeAllRegistered(); // material design lite update components/fix sizes
			} catch(e) {}
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
		onChangeSource: function(evt) {
			this.model.set('source', evt.currentTarget.value);
		},
		onSave: function(evt) {
			app.spinnerStart();

			if (!this.model.id) {
				isNewRecipe = true;
			}
			else {
				isNewRecipe = false;
			}
			postToFacebook = $('#switch-postfacebok')[0].checked;

			var selectedLabels = [];
			for (var i = this.labelSelectors.length - 1; i >= 0; i--) {
				selectedLabels = _.union(selectedLabels, this.labelSelectors[i].selectedLabels);
			};
			this.model.set({ 
				labels      : selectedLabels,
				description : $('#editRecipe .description').html(),
				ingredients : $('#editRecipe .ingredients').html(),
				directions  : $('#editRecipe .directions').html(),
				private     : $('#switch-private')[0].checked
			}, { validate: true }  );
			this.model.makeSearchMasks();
			this.model.setPrivateAcl();
 
			app.google.analytics.sendEvent('recipe', 'save', 'save');
			Parse.Object.saveAll(this.model).then(function(model) {
				var labels = model.get('labels'); 
				var ids = [];
				if (_.isArray(labels) && labels.length)  {
					var labelsRelation = model.relation('labelRelation');
					labelsRelation.add(labels);
					for (var i = 0; i < labels.length; i++) {
						ids.push(labels[i].id);
					};
				}
				model.set('labelsId', ids);

				function saveSuccess() {
					app.editRecipeView.model.get('user').fetch();
			    	app.labelManager.loadLabels(app.loginedUser, true);
				    app.spinnerStop();
					app.recipeManager.viewRecipe(app.editRecipeView.model);
					if (app.recipeListView) {
						app.recipeListView.trigger('change');
					}
					if (isNewRecipe) {
						// app.facebook.postRecipe(app.editRecipeView.model)
					}
					isNewRecipe = false;
					
					if (postToFacebook) {
						app.facebook.postRecipe(app.editRecipeView.model)
					}
					postToFacebook = false;

					app.editRecipeView.close();
				}

				//image
				function uploadCallback() {
					// console.log('img uploaded');
			    	var imageTags = $('.recipe-'+app.editRecipeView.model.id+' .image');
			    	if (imageTags && imageTags.length && imageTags[0].src) {
				    	$(imageTags).attr('src', imageTags[0].src +'?' +new Date().getTime());
			    	}
					app.google.analytics.sendEvent('recipe', 'uploadImage', 'uploadImage');
					saveSuccess();
				}

				var imageFile = document.getElementById('image_upload');
				if (imageFile && imageFile.files.length) {
					imageFile = imageFile.files[0];
					model.uploadImage(imageFile, uploadCallback)
				}
				// else if(app.editRecipeView.uploadImageUrl!='') {
				// 	model.uploadWebImage(app.editRecipeView.uploadImageUrl, uploadCallback );
				// app.utils.uploadWebImageToAmazon('http://img.444.hu/kerites_magyar_szerb_hatar.jpg','users/valami',function(result){console.log(result);console.log('yeah')})
				// } //end image upload
				else {
					model.save().then(saveSuccess);
				}
			})
		},
		onDiscard:function() {
			$('.mdl-layout__header-row .recipeName').text('');
			app.google.analytics.sendEvent('recipe', 'close', 'close');
			if(this.model.id) {
				app.recipeManager.viewRecipe(this.model);			
			}
			else {
				app.switchLayout('list');
			}
			this.close();
			app.editRecipeView.close();
			app.editRecipeView = null;
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
			app.google.analytics.sendEvent('recipe', 'delete', 'delete');
			app.editRecipeView.close();
		}
	}) // app.EditRecipeView

	app.RecipeListItemView = Backbone.View.extend({
		tagName   : 'div',
		// className : 'recipe-card col-sm-12 col-md-6 col-lg-4',
		className: function() {
		    var lg = ' col-lg-'+((app.listedRecipes.length>2)?4:(app.listedRecipes.length==2)?6:12);
			var md = ' col-md-'+((app.listedRecipes.length>2)?6:(app.listedRecipes.length==2)?6:12);
			var sm = ' col-sm-'+((app.listedRecipes.length>2)?12:(app.listedRecipes.length==2)?12:12);
			// this.className = 'recipe-card '+lg+md+sm;
			return 'recipe-card '+lg+md+sm;
		},
		events : {
			'click .btnRead'      : 'onRead',
			'click .btnClone'     : 'onClone',
			'click .author'       : 'onAuthor',
			'click .recipeName'   : 'onRead',
			'click .image'        : 'onRead',
			'click .add-favorite' : 'onToggleFavorite',
			'click .print'        : 'onPrint',
			'click .share'        : 'onShare',
			'click .label'        : 'onLabel'
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
			app.recipeManager.print(this.model);
		},
		onRead: function(e) {
			if (e.metaKey || e.ctrlKey || e.shiftKey) {
				window.open('/#recipe/_'+app.utils.genUrlName(this.model.get('name'))+'-'+this.model.id);
			}
			app.recipeManager.viewRecipe(this.model);
		},
		onClone: function(event) {
			if(app.loginedUser) {
				app.recipeManager.editRecipe(app.recipeManager.cloneRecipe(this.model));
			}
			else {
				app.applicationView.facebookLogin(event);
			}
		},
		onAuthor: function() {
			app.router.navigate(this.model.get('user').getRelativeUrl(), {trigger: true});
		},
		onToggleFavorite: function(event) {
			if(app.loginedUser) {
				if (app.recipeManager.toggleRecipeFavorite(this.model)) {
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
			app.facebook.shareRecipe(this.model);
			return true;
		},
		onLabel: function(event) {
			var labelText = $(event.target).text();
			app.google.analytics.sendEvent('recipe', 'labelclick', 'labelclick');
			app.recipesFiltermanager.set( {text: labelText}, {validate: true} );
			app.recipesFiltermanager.search();
			app.switchLayout('list');
			this.close();
		}
	}); // app.RecipeListItemView

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
				// if(counter==2) {
				// 	$list.append(this.renderAd());
				// }
				// else {
				// }
				this.renderOne(model);
				counter++;
				if(counter % 2 == 0) {
					$list.append('<div class="clearfix visible-md-block"></div>');
				}
				if(counter % 3 == 0) {
					$list.append('<div class="clearfix visible-lg-block"></div>');
				}
		    }, this);
			// (adsbygoogle = window.adsbygoogle || []).push({});
			// try {FB.XFBML.parse(this.el);} catch (e) {}
			return this;
		},
		renderAd: function() {
			var template = _.template(app.templates.googleAdsCard);
			return template();
		},
		renderOne: function(model) {
			var item = new app.RecipeListItemView({model: model});
			this.$el.append( item.render().el );
			return this;
		}
	}); // app.RecipeListView

	app.NavigationLabelView = Backbone.View.extend({
		tagName : 'a',
		className : 'navigation__link',
		events : {
			'click span'          : 'onSelect',
			'click i'             : 'onSelect',
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
			app.google.analytics.sendEvent('label', 'toggle', this.model.get('name'));
		},
		onDelete: function(e) {
			app.google.analytics.sendEvent('label', 'delete', this.model.get('name'));
			this.model.destroy({
				success: function() {
					app.labelManager.loadLabels(app.loginedUser, true);
				}
			});
			this.close();
		}
	}); // app.NavigationLabelView

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
			app.recipesFiltermanager.setUserFilter(this.model)
			app.recipesFiltermanager.search();
			app.switchLayout('list');
		}
	}); // app.NavigationFollowedUserItemView

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
	}); // app.NavigationFollowedUsersView

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

			if(owner) {
				var labels = app.loginedUser.labelCollection;
			}
			else {
				var labels = app.labelCollection;
			}
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
			app.google.analytics.sendEvent('labelgroup', 'delete', this.model.get('name'));
			this.model.destroy({
				success: function() {
					app.labelManager.loadLabels(app.loginedUser, true);
				}
			});
			this.close();
		},
		onCreateLabel: function(event) {
			if(event.keyCode == 13) {
		        // app create new group
		        var newLabelName = $(event.target).val();
		        app.labelManager.createLabel(newLabelName, this.model);
		        $(event.target).val('');
		    }
		}
	}); // app.NavigationLabelGroupItemView

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
	}) // app.NavigationLabelGroupView



// Translation DICT ========================================================================================================
	app.localeUsers = {
		'en': 'BoInDweJu3',
		'hu': 'KiswlE2QF5',
		'de': 'gZuDzMPaSh'
	};
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
			'Source' 				  : 'Source',
			'placeholder_recipe_source': 'Source',
			'editRecipePrepTime'      : 'Preparation time (minute): ',
			'editRecipeCookTime'      : ', cook time: ',
			'editRecipeMakeTime'      : ', sum make time: ',
			'makeTime'				  : 'Make time (minute):',
			'AllinJustFoodYou'				  : 'All in Just Food You',
			'FavoritedPeople'		  : 'Friends',
			'originalWriter'		  : 'Original writer',
			'CreateLabelGroup'		  : 'Create label group',
			'CreateLabel'		      : 'Create label',
			'FacebookPostMessage'	  : 'I created new recipe on Just Food You. Check!'
		},
		'hu' : {
			'All'                     : 'Összes',
			'Favorites'               : 'Kedvencek',
			'My'                      : 'Saját',
			'Shared'                  : 'Megosztott',
			'new'                     : 'új',
			'search'                  : 'keres',
			'About'                   : 'Rólunk',
			'Contact'                 : 'Kapcsolat',
			'Legal_information'       : 'Szerződési információk',
			'Save_to_My_Book'         : 'Mentsd el nekem!',
			'Edit'                    : 'Szerkeszt',
			'Delete'                  : 'Törlés',
			'Save'                    : 'Mentés',
			'Read'                    : 'Olvas',
			'Close'                   : 'Bezár',
			'Name'                    : 'Név',
			'Description'             : 'Leírás',
			'Ingredients'             : 'Hozzávalók',
			'Directions'              : 'Elkészítés',
			'Labels'                  : 'Cimkék',
			'Discard'                 : 'Elvet',
			'Save changes'            : 'Mentés',
			'Logout'                  : 'Kilépés',
			'Login'                   : 'Belépés',
			'Sign_In'                 : 'Regisztráció',
			's_recipes'               : " receptjei",
			'placeholder_recipe_name' : 'Recept neve',
			'placeholder_recipe_desc' : 'Rövid ismertető',
			'placeholder_recipe_ingr' : 'Hozzávalók',
			'placeholder_recipe_dir'  : 'Elkészítése',
			'Source' 				  : 'Forrás',
			'placeholder_recipe_source': 'Forrás',
			'editRecipePrepTime'      : 'Előkészítés ideje (perc):',
			'editRecipeCookTime'      : ', elkészítés ideje:',
			'editRecipeMakeTime'      : ', összesen:',
			'makeTime'                : 'Elkészítése (perc):',
			'AllinJustFoodYou'        : 'All in Just Food You',
			'FavoritedPeople'         : 'Barátok',
			'originalWriter'          : 'Eredetileg lejegyezte',
			'CreateLabelGroup'        : 'Cimkecsoport létrehozása',
			'CreateLabel'             : 'Cimke létrehozása',
			'FacebookPostMessage'	  : 'Felvittem egy receptet a Just Food You szakácskönyvembe.'
		},
		'de' : {
			'All'                     :'Alle',
			'Favorites'               :'Lieblinge',
			'My'                      :'Eigene ',
			'Shared'                  :'Freigegeben',
			'new'                     :'Neu',
			'search'                  :'Suchen',
			'About'                   :'Über uns',
			'Contact'                 :'Kontakt',
			'Legal_information'       :'Nutzungsbedingungen',
			'Save_to_My_Book'         :'Speichere es für mich',
			'Read'                    :'Redigieren',
			'Close'                   :'Löschen',
			'Edit'                    :'Speichern',
			'Delete'                  :'Lesen',
			'Save'                    :'Schliessen',
			'Name'                    :'Name',
			'Description'             :'Beschreibung',
			'Ingredients'             :'Zutaten',
			'Directions'              :'Zubereitung',
			'Labels'                  :'Tags',
			'Discard'                 :'Verwerfen',
			'Save changes'            :'Speichern',
			'Logout'                  :'Logout',
			'Login'                   :'Login',
			'Sign_In'                 :'Registirerung',
			's_recipes'               :'Rezept von',
			'placeholder_recipe_name' :'Name des Rezepts',
			'placeholder_recipe_desc' :'Kurze Beschreibung',
			'placeholder_recipe_ingr' :'Zutaten',
			'placeholder_recipe_dir'  :'Zubereitung',
			'Source'				  : 'Quelle',
			'placeholder_recipe_source': 'Quelle',
			'editRecipePrepTime'      :'Vorbereitungszeit',
			'editRecipeCookTime'      :'Kochzeit',
			'editRecipeMakeTime'      :'Insgesamt',
			'makeTime'                :'Arbeitszeit',
			'AllinJustFoodYou'        :'Alles in Just Food You',
			'FavoritedPeople'         :'Freunde',
			'originalWriter'          :'Stammt von',
			'CreateLabelGroup'        :'Erstellung einer Taggruppe',
			'CreateLabel'             :'Erstellung eines Tags',
			'FacebookPostMessage'	  :'I created new recipe on Just Food You. Check!'
		}
	};
// App Utils ==================================================================================================================
	app.utils = {
		htmlToText: function(html) {
			var div = document.createElement("div");
			div.innerHTML = html;
			return div.textContent || div.innerText || "";
		},
		genUrlName: function(text) {
			return this.removeDiacritics(text+' $2!₪%$#דשגד').replace(/[^A-Za-z\ ]/g,'').replace(/\ /g,'_');
		},
		genSearchMask: function(text) {
	    	text = text.toLowerCase();
	    	// var re = /[^A-Za-z\u0590-\u05FF\u0600-\u06FF\u4E00–\u9FCC\u3400–\u4DB5\uFA0E\uFA0F\uFA11\uFA13\uFA14\uFA1F\uFA21\uFA23\uFA24\uFA27-\uFA29]|[\ud840-\ud868][\udc00-\udfff]|\ud869[\udc00-\uded6\udf00-\udfff]|[\ud86a-\ud86c][\udc00-\udfff]|\ud86d[\udc00-\udf34\udf40-\udfff]|\ud86e[\udc00-\udc1d\u0900-\u097F\ ]/g;
	    	var re = /[^A-Za-z\u0590-\u05FF\ ]/g;
			return _.uniq(this.removeDiacritics(text).replace(re, '').replace(/(.)\1{1,}/g, '$1').replace(/\b[a-z]{1,2}\b/g, '').replace(/(.)\1{1,}/g, '$1').split(' '));
		},
		removeDiacritics: function(str) {
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
		},
		getBase64Image: function(img) {
		    // Create an empty canvas element
		    var canvas = document.createElement("canvas");
		    canvas.width = img.width;
		    canvas.height = img.height;

		    // Copy the image contents to the canvas
		    var ctx = canvas.getContext("2d");
		    ctx.drawImage(img, 0, 0);

		    // Get the data-URL formatted image
		    // Firefox supports PNG and JPEG. You could check img.src to guess the
		    // original format, but be aware the using "image/jpg" will re-encode the image.
		    var dataURL = canvas.toDataURL("image/png");

		    return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
		},
		getBase64FromImageUrl: function(url, callback) {
		    var img = new Image();
			img.setAttribute('crossOrigin', 'anonymous'); // ERROR
		    img.onload = function () {
		    	callback(app.utils.getBase64Image(this));
		    };

		    img.src = url;
		},
		dataURItoBlob: function(dataURI) {
		    var binary = atob(dataURI.split(',')[1]);
		    var array = [];
		    for(var i = 0; i < binary.length; i++) {
		        array.push(binary.charCodeAt(i));
		    }
		    return new Blob([new Uint8Array(array)], {type: 'image/jpeg'});
		},
		uploadWebImageToAmazon: function(imgUrl, toPath, callback) {
			// var imageExts = {
			// 	"png": "image/png",
			// 	"jpg":"image/jpg",
			// }
			var getImg = new XMLHttpRequest();
			getImg.open("GET", imgUrl, true);
			getImg.responseType = "blob";

			getImg.onload = function(oEvent) {
				var file = getImg.response;
				var callback = callback;
				Parse.Cloud.run('awsInfo', {file: toPath, fileType: "image/jpg"}).then(function(result) {
				    var fd = new FormData();

				    fd.append('key', result.key);
				    fd.append('acl', 'public-read');   
				    fd.append('Content-Type', "image/jpg");
				    fd.append('Cache-Control', 'max-age='+3600*24*7);     
				    fd.append('AWSAccessKeyId', s.AWSAccessKeyId);
				    fd.append('policy', result.policy)
				    fd.append('signature', result.signature);
				    fd.append("file", file);

				    var xhr = new XMLHttpRequest();

				    // xhr.upload.addEventListener("progress", uploadProgress, false);
				    xhr.addEventListener("load", callback, false);
				    // xhr.addEventListener("error", uploadFailed, false);
				    // xhr.addEventListener("abort", uploadCanceled, false);

				    xhr.open('POST', 'https://'+s.amazonBucket+'.s3.amazonaws.com/', true); //MUST BE LAST LINE BEFORE YOU SEND 
				    xhr.send(fd);
				})
			}
			getImg.send();
			//app.utils.uploadWebImageToAmazon('http://baar.com/foo.jpg','users/newTest.jpg',function(result){console.log(result); console.log('uploaded')});
			// app.utils.getBase64FromImageUrl(imgUrl, function(imageFile) {
			// 	var array = [];
			// 	var binary = atob(imageFile);
			//     for(var i = 0; i < binary.length; i++) {
			//         array.push(binary.charCodeAt(i));
			//     }
			//     imageFile = new Blob([new Uint8Array(array)], {type: 'image/jpeg'});
			//     app.utils.uploadFileToAmazon(imageFile, toPath, callback);
			// })
		},
		uploadFileToAmazon: function(file, toPath, callback) {
			Parse.Cloud.run('awsInfo', {file: toPath, fileType: file.type}).then(function(result) {
			    var fd = new FormData();

			    fd.append('key', result.key);
			    fd.append('acl', 'public-read');   
			    fd.append('Content-Type', file.type);
			    fd.append('Cache-Control', 'max-age='+3600*24*7);     
			    fd.append('AWSAccessKeyId', s.AWSAccessKeyId);
			    fd.append('policy', result.policy)
			    fd.append('signature', result.signature);
			    fd.append("file", file);

			    var xhr = new XMLHttpRequest();

			    // xhr.upload.addEventListener("progress", uploadProgress, false);
			    xhr.addEventListener("load", callback, false);
			    // xhr.addEventListener("error", uploadFailed, false);
			    // xhr.addEventListener("abort", uploadCanceled, false);

			    xhr.open('POST', 'https://'+s.amazonBucket+'.s3.amazonaws.com/', true); //MUST BE LAST LINE BEFORE YOU SEND 
			    xhr.send(fd);
			})
		}
	}

// Facebook ==================================================================================================================
	app.facebook = {
		login: function() {
			Parse.FacebookUtils.logIn("public_profile,email,user_birthday,user_hometown,user_location,publish_actions,user_likes", {
				success: function(user) {
				    if (!user.existed()) {
				      	app.google.analytics.sendEvent('user', 'register', 'registration by facebook');
				    } 
				    else {
				      	app.google.analytics.sendEvent('user', 'login', 'login by facebook');
				    }
				    app.facebook.setFacebookUser();
				},
				error: function(user, error) {
					// alert("User cancelled the Facebook login or did not fully authorize.");
				}
	        });
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
		shareRecipe: function(recipe) {
			try {
				var coverImageUrl = (recipe.get('coverImageUrl'))?recipe.get('coverImageUrl'):'https://s3.amazonaws.com/cookbookimg/icon_256.png'; 
				FB.ui({
					method  : 'share',
					display : 'popup',
					href    : recipe.getUrl(),
					name    : recipe.get('name'),
					title   : recipe.get('name'),
					picture : coverImageUrl,
					description: app.utils.htmlToText(recipe.get('description'))
				});
				app.google.analytics.sendSocial('facebook','share',app.settings.applicationUrl, recipe.getUrl());
				app.google.analytics.sendEvent('facebook', 'share', 'share');
			} catch (e) {}
	    },
		postRecipe: function(recipe) {
			try { 
				FB.api('/me/feed', 'post', {
					message     : app.localeDict('FacebookPostMessage'),
					link        : recipe.getUrl(),
					picture     : recipe.get('coverImageUrl'),
					name        : recipe.get('name'),
					description : app.utils.htmlToText(recipe.get('description'))
				},function(response) {
		        	
		        });
				app.google.analytics.sendSocial('facebook','share', app.settings.applicationUrl, recipe.getUrl()); //TODO
				app.google.analytics.sendEvent('facebook', 'post', 'post');
			} catch (e) {}
		}
	} // app.facebook
// Google ==================================================================================================================
	app.google = {}
	app.google.analytics = {
		start: function(userID) {
			try {
				ga('create', s.analytics, userID);
			    ga('send', 'pageview');
			} catch (e) {}
		},
		setUserSegment: function(user) {
			try {
				if(user==null) {
					ga('set', 'dimension1', 'Anonymous');
				} else if(user.id == 'DPjbxTdjZW') {
					ga('set', 'dimension1', 'Developer');
	    		}
	    		else {
	    			ga('set', 'dimension1', 'Registred');
	    		}
			} catch (e) {}
		},
		sendEvent: function(eventCategory, eventAction, eventLabel) {
			try {
				ga('send', {
					'hitType'       : 'event',      
					'eventCategory' : eventCategory,
					'eventAction'   : eventAction, 
					'eventLabel'    : eventLabel
				});
			} catch (e) {}
		},
		sendSocial: function(network, action, target, page) {
			try {
				ga('send', {
					'hitType': 'social',
					'socialNetwork': network,
					'socialAction': action,
					'socialTarget': target,
					'page': page
				});
			} catch (e) {}
		},
		pageview: function(page, title) {
			try {
				ga('set', {
					page: page,
					title: title
				});
				ga('send', 'pageview');
		    } catch (e) {}
		}
	} // app.google.analytics
	app.google.chrome = {
		extLogin: function() {
			try {
				var userKey = Parse._getParsePath(Parse.User._CURRENT_USER_KEY)
				var user = Parse.User.current();
				var json = user.toJSON();
				json._id = user.id;
				json._sessionToken = user._sessionToken;
				var userVal = JSON.stringify(json)
				var installKey = Parse._getParsePath('installationId')
				var installVal = Parse._installationId

				// chrome.runtime.sendMessage( 'iehpofechmihgfphjmggfieaoandaena', { 
				chrome.runtime.sendMessage( 'jehllbcgafncimgnhmnimpolkbjpglkd', { 
					type: 'login', 
					userKey: userKey, 
					userVal: userVal,
					installKey: installKey,
					installVal: installVal
				}, function(response) {
				  console.log(response);
				});
			} catch (e) {}
		}
	} //app.google.chrome