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
Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});



Parse.Cloud.define("awsInfo", function(request, response) {
	// var setting = s3_uploader[request.params.uploadType];
  if (imageExts[request.params.fileType]) {
  	var setting = {"key":"users/image/","acl":"public-read","fileType":imageExts[request.params.fileType]};

  	var keyValue = request.params.file+'.'+imageExts[request.params.fileType];
  	var result = {"key":keyValue,
  	            "acl":setting.acl,
  	            "policy":s3_upload_policy(setting.acl), 
  	            "signature":s3_upload_signature(setting.acl)};
  	response.success(result);
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
                    // {"success_action_status": "201"}
                  ]};
    var buf = new Buffer(JSON.stringify(policy),'utf8');
    var result = buf.toString('base64');

    return result;
}

function s3_upload_signature(acl) {
    return  Crypto.createHmac('sha1',conf.secret_key).update(s3_upload_policy(acl)).digest('base64');
}