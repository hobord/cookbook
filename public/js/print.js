var s, app = {
    settings: {
    	applicationId: "uJLDpdzRo0AS07SHiXDRUR6dX2egvU9rKcbHkIMP",
    	applicationKey: "LkeF59Hh5HXrketX8qw6SFWwFALnVu8vqJKwkp5n",
    },
    templates: {
		'viewRecipe'           : '#viewRecipe-tmpl',
    },
    init: function() {
        s = this.settings, this.initalizers();
    },
    initalizers: function() {
    	this.loadTemplates();
    	this.setLocale();
    	Parse.initialize(s.applicationId, s.applicationKey);

    	// Models
		this.Recipe          = Parse.Object.extend("Recipe");
		this.Ingredient      = Parse.Object.extend("Ingredient");
		this.IngredientGroup = Parse.Object.extend("IngredientGroup");
		this.LabelGroup      = Parse.Object.extend("LabelGroup");
		this.Label           = Parse.Object.extend("Label");

		app.router = new app.AppRouter();
		Backbone.history.start();
    },
    loadTemplates: function() {
    	_.each(this.templates, function(item, key){
    		this.templates[key] = $(item).html();
    		$(item).remove();
    	}, this);
    },
    setLocale: function() {
		if(!this.localeCode) {
			if ($.cookie('localeCode')) {
				this.localeCode = $.cookie('localeCode');
				$.cookie('localeCode', this.localeCode, { expires: 365 });
			} else {
				this.localeCode = (navigator.languages? navigator.languages[0] : (navigator.language || navigator.userLanguage)).substr(0,2);
			}
		}
		
		if (this.localeDicts[this.localeCode]) {
			this.localeDict = underi18n.MessageFactory(this.localeDicts[this.localeCode]);
		} else {
			this.localeDict = underi18n.MessageFactory('en');
		}
    }
}


app.RecipeView = Backbone.View.extend({
	el       : '#viewRecipePlaceholder',
	initialize: function() {
		this.template = _.template(underi18n.template(app.templates.viewRecipe, app.localeDict));
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
			owriter: owriter
		});
		window.document.title='Just Food You - '+this.model.get('name');

		var recipeLabels = this.model.get('labels');

		this.$el.html(html);

		(adsbygoogle = window.adsbygoogle || []).push({});
		$(document).waitForImages(function() {
			window.print();
		});
		return this;
	}
});

app.AppRouter = Backbone.Router.extend({
	routes: {
	    "recipe/:name-:rid":	"recipe",  // show recipe
  	},
  	initialize: function() {

  	},
	recipe: function(name, rid) {
		var rQuery = new Parse.Query(app.Recipe);
		rQuery.equalTo('objectId',rid);
		rQuery.include('labels');
		rQuery.include('user');
		rQuery.include('originalWriter');
		rQuery.find().then(function (list) {
			app.recipeView = new app.RecipeView({model : list[0]});
		})
	}
});

app.localeDicts = {
	'en' : {
		'makeTime'				  : 'Make time (minute):',
		'originalWriter'		  : 'Original writer',
	},
	'hu' : {
		'makeTime'				  : 'Elkészítése (perc):',
		'originalWriter'		  : 'Eredetileg lejegyezte',
	} 
};