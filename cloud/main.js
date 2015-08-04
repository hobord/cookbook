var conf = require('cloud/config.js');
  // set keys in cloud/config.js
  // exports.accessKeyId = '';
  // exports.secret_key = '';
  // exports.bucket = '';

var Crypto = require('crypto');
var Buffer = require('buffer').Buffer;

var imageExts = {
  "image/png":"png",
  "image/jpg":"jpg",
  "image/jpeg":"jpg"
}

// var express = require('express'); 
// var app = express();
// app.set('views', 'cloud/views');
// app.set('view engine', 'ejs');
// app.post('/facebook_page', function(req, res) {

//   res.render('index.ejs', {});

// });
// app.get('/facebook_page', function(req, res) {

//   res.render('index.ejs', {});

// });
// app.listen();

Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});


Parse.Cloud.afterDelete("User", function(request) {
  var query = new Parse.Query("LabelGroup");
  query.equalTo("user", request.object);
  query.find().then(function(labels) {
    Parse.Object.destroyAll(labels);
  }).then(function(success) {
      var query = new Parse.Query("Label");
      query.equalTo("user", request.object);
      query.find().then(function(labels) {
        Parse.Object.destroyAll(labels);
      })

  });

  var query = new Parse.Query("Recipe");
  query.equalTo("user", request.object);
  query.find().then(function(labels) {
    Parse.Object.destroyAll(labels);
  });

  var query = new Parse.Query("FacebookUser");
  query.equalTo("user", request.object);
  query.find().then(function(labels) {
    Parse.Object.destroyAll(labels);
  });

});

Parse.Cloud.afterDelete("LabelGroup", function(request) {
  var query = new Parse.Query("Label");
  query.equalTo("labelgroup", request.object);

  query.find().then(function(labels) {
    return Parse.Object.destroyAll(labels);
  }).then(function(success) {
    // The related label were deleted
  }, function(error) {
    console.error("Error deleting related label " + error.code + ": " + error.message);
  });
});

// Parse.Cloud.afterDelete("Label", function(request) { // TODO

Parse.Cloud.define("awsInfo", function(request, response) {
	// var setting = s3_uploader[request.params.uploadType];
  if(request.user) {
    if (imageExts[request.params.fileType]) {
    	var setting = {"key":"users/image/","acl":"public-read","fileType":imageExts[request.params.fileType]};

    	var keyValue = request.params.file+'.'+imageExts[request.params.fileType];
    	var result = {"key":keyValue,
    	            "acl":setting.acl,
    	            "policy":s3_upload_policy(setting.acl), 
    	            "signature":s3_upload_signature(setting.acl)};
    	response.success(result);
    }
  }
});

function s3_upload_policy(acl) {
    var d = new Date();
    d.setSeconds(0);
    d.setMilliseconds(0);   
    d.setMinutes(d.getMinutes()+10);
    var policy = {"expiration":d.toISOString(),
                  "conditions":[
                    {"bucket":conf.bucket},
                    {"acl":acl},
                    ["starts-with","$key", "users/"],
                    ["starts-with", "$Content-Type", ""],
                    ["starts-with", "$Cache-Control", ""],
                    // {"success_action_status": "201"}
                  ]};
    var buf = new Buffer(JSON.stringify(policy),'utf8');
    var result = buf.toString('base64');

    return result;
}

function s3_upload_signature(acl) {
    return  Crypto.createHmac('sha1',conf.secret_key).update(s3_upload_policy(acl)).digest('base64');
}

Parse.Cloud.define("initUser", function(request, response) {
  initUser(request.user);
});
Parse.Cloud.afterSave("User", function(request) {
  var user = request.object;
  if(!user.get('inited')) {
    initUser(request);
  }
})

function initUser(user) {
  var locale = user.get('locale');
  user.set('inited', true);
  user.save();
  if(locale) {
    locale = locale.substr(0,2);
    for (var i = 0; i < deafultLabels[locale].length; i++) {
    // for (var i = deafultLabels[locale].length - 1; i >= 0; i--) {
      if (deafultLabels[locale]) {
        createLabelgroup(deafultLabels[locale][i], user);
      }
      else {
        createLabelgroup(deafultLabels['en'][i], user);
      };
    }
  }
}

function createLabelgroup(group, user) {
  var LabelGroup  = Parse.Object.extend("LabelGroup");
  var newGroup = new LabelGroup();
  newGroup.set('name', group.name);
  newGroup.set('weight', group.weight);
  newGroup.set('user', user);

  var currentACL = newGroup.getACL();
  if (typeof currentACL === 'undefined') {
    currentACL = new Parse.ACL();
  }
  currentACL.setPublicReadAccess(true);
  currentACL.setPublicWriteAccess(false);
  currentACL.setWriteAccess(user.id, true);
  newGroup.setACL(currentACL);
  newGroup.save().then(
    function(newGroup) {
      for (var i = 0; i < group.labels.length; i++) {
        createLabel(group.labels[i], newGroup, user);
      };
    }, 
    function (error) {
      console.log(error);
  });
}

function createLabel(newLabelName, group, user) {
  var Label = Parse.Object.extend("Label");
  var newLabel = new Label();

  newLabel.set('name', newLabelName);
  newLabel.set('labelgroup', group);
  newLabel.set('user', user);

  var currentACL = newLabel.getACL();
  if (typeof currentACL === 'undefined') {
    currentACL = new Parse.ACL();
  }
  currentACL.setPublicReadAccess(true);
  currentACL.setPublicWriteAccess(false);
  currentACL.setWriteAccess(user.id, true);
  newLabel.setACL(currentACL)

  newLabel.save();
}

deafultLabels = {
  en: [
      { 
        name: 'Course',
        weight: 0,
        labels: ['Main dish','Appetizers & snacks ','Desserts','Side dishes','Soup','Salad','Fish','Meat','Vegetables']
      },
      { 
        name: 'Main ingedients',
        weight: 1,
        labels: ['veal','lamb','chicken','zucchini','pork','duck','couscous','lentils','goose','beef','liver','eggplant','peppers']
      },
      { 
        name: 'Holiday/Party',
        weight: 2,
        labels: ['dinner', 'breakfast', 'Wedding', 'Hanukkah', 'Easter', 'Christmas parties', 'Birthday']
      },
      { 
        name: 'Cuisine',
        weight: 3,
        labels: ['Greek', 'Indian', 'Israeli', 'Chinese', 'Moroccan', 'Italian', 'Thai', 'Turkish']
      },
      { 
        name: 'Healthy/Special',
        weight: 4,
        labels: ['Vegan','Kosher','Diabetic','Gluten free']
      },
      { 
        name: 'Labels',
        weight: 5,
        labels: []
      }
  ],
  hu: [
      { 
        name: 'Kategóriák',
        weight: 0,
        labels: ['desszert','előételek','főzelékek','főételek','gyümölcsök','halak','húsok','kekszek','köretek','levesek','muffinok','mártások','péksütemények, kenyerek','reggelik','saláták','szárnyasok','tagine','tészták','vegán','zöldségek']
      },
      { 
        name: 'Hozzávalók',
        weight: 1,
        labels: ['borjú','bárány','csirke','cukkini','disznó','kacsa','kuszkusz','lencse','liba','marha','máj','padlizsán','paprika']
      },
      { 
        name: 'Események',
        weight: 2,
        labels: ['vacsora','reggeli','ebéd','esküvő','hanuka','húsvét','karácsony','partyk','születésnap']
      },
      { 
        name: 'Nemzetek konyhái',
        weight: 3,
        labels: ['görög','indiai','izraeli','kínai','marokkói','olasz','thai','török']
      },
      { 
        name: 'Étrend',
        weight: 4,
        labels: ['Vegán','Kosher','Diabetic','Glutén free']
      },
      { 
        name: 'Cimkék',
        weight: 5,
        labels: []
      }
  ],
  de: [
      { 
        name: 'Kategorien',
        weight: 0,
        labels: ['Dessert','Vorspeisen','Hauptgerichte','Obst','Fisch','Fleisch','Kekse','Beilage','Suppen','Muffins','Saucen','Gebäck, Brot','Frühstück','Salate','Geflügel','Tagine','Nudeln','Vegan','Gemüse']
      },
      { 
        name: 'Zutaten',
        weight: 1,
        labels: ['Kalb','Lamm','Huhn','Zucchini','Schwein','Ente','Couscous','Linse','Gans','Rind','Leber','Aubergine','Paprika']
      },
      { 
        name: 'Events',
        weight: 2,
        labels: ['Abendessen','Frühstück','Mittagessen','Hochzeit','Chanukka','Ostern','Weihnachten','Party','Geburtstag']
      },
      { 
        name: 'Nationale Küchen',
        weight: 3,
        labels: ['griechsich','indisch','isrealisch','chinesisch','marokkanisch','italienisch','thailändisch','türkisch']
      },
      { 
        name: 'Special',
        weight: 4,
        labels: ['Vegan','Koscher','Diabetisch','Glutenfrei']
      },
      { 
        name: 'Labels',
        weight: 5,
        labels: []
      }
  ],
}

