
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.message=='popup') {
    	app.popUpEditor();
    }
    if (message.message=='close') {
    	app.closeEditor();
    }
});


app = {
	initialize: function() {
		$.each(document.getElementsByTagName('img'), function(i) {
			this.addEventListener('dragstart',function(e){
	           dragSrcEl = this;
	           event.dataTransfer.setData('Text', this.src);
	           var dropbox = document.getElementById("JFYdropbox");
	           dropbox.style.border = 'solid green 4px';
	           dropbox.style.background = 'white url('+chrome.extension.getURL('NoImage.jpg')+') no-repeat center 50px';
	           var iframe = document.getElementById("JFYdropboxIframe");
	           iframe.style.display='none';
		    });

			this.addEventListener('drop',function(e) {
				var dropbox = document.getElementById("JFYdropbox");
		    	dropbox.style.border = 'none';
				dropbox.style.background = 'transparent';
				var iframe = document.getElementById("JFYdropboxIframe");
				iframe.style.display='block';
			});
		});
	},
	popUpEditor: function() {
		$('#JFYdropbox').remove();
		var iframe = document.createElement('iframe');
		
		iframe.style.backgroundColor = "transparent";
		iframe.allowTransparency="true";
		$(iframe).css({
			width:'100%',
			height:'100%',
			border:'0px solid black',
		});
		iframe.src = chrome.extension.getURL('clipper_frame.html');
		app.CrossDomainDragAndDrop(iframe);
	},
	closeEditor: function() {
		$('#JFYdropbox').remove();
	},
	CrossDomainDragAndDrop: function(iframe) {
	  var coverDiv = document.createElement('div');
	  coverDiv.setAttribute("id", "JFYdropbox");
	  iframe.setAttribute("id", "JFYdropboxIframe");
	  $(coverDiv).css({
			position:'fixed',
			background:'white',
			backgroundImage: chrome.extension.getURL('NoImage.jpg'),
			right:'5px',
			top:'0px',
			width:'400px',
			height:'600px',
			border:'0px solid black',
			zIndex:'999999999',
			padding:'0px'
		});
		document.body.appendChild(coverDiv);
		//add coverDit to iframe wrapper
		coverDiv.appendChild(iframe);

		//handle drag events
		coverDiv.addEventListener('dragenter', function(e) {
			coverDiv.style.border = 'solid green 4px';
			e.preventDefault();
		});
		coverDiv.addEventListener('dragover', function(e) {
			e.preventDefault();
			iframe.style.display='none';
		});
		coverDiv.addEventListener('dragleave', function() {
			coverDiv.style.border = 'none';
			coverDiv.style.background = 'transparent';
			iframe.style.display='block';
		});
		coverDiv.addEventListener('drop', function(e) {
			var transfer = e.dataTransfer;
			if(transfer) {
				transfer.items[0].getAsString(sendToIframe);
				// for(var i=0; i<transfer.items.length; i++) {
				// 	transfer.items[i].getAsString(sendToIframe);
				// }
			}
			coverDiv.style.background = 'green';
			setTimeout(function() {
				coverDiv.style.background = 'transparent';
			}, 150);

			coverDiv.style.border = 'none';
			coverDiv.style.background = 'transparent';
			iframe.style.display='block';
			e.preventDefault();
		});
	  
		function sendToIframe(content) {
			iframe.contentWindow.postMessage(content, iframe.getAttribute('src'));
		}
	}
}

app.initialize();