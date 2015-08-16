$(function() {
	$('#btnEditRecipeDiscard').on('click', function(event) {
		var editorExtensionId = "iehpofechmihgfphjmggfieaoandaena"; //development
		var editorExtensionId = "jehllbcgafncimgnhmnimpolkbjpglkd"; //production

		chrome.runtime.sendMessage(editorExtensionId, {type: "close"}, function(response) {
			console.log(response);
		});
	})

	$('#btnEditRecipeSave').on('click', function(event){
		var editorExtensionId = "iehpofechmihgfphjmggfieaoandaena"; //development
		var editorExtensionId = "jehllbcgafncimgnhmnimpolkbjpglkd"; //production
		chrome.runtime.sendMessage({ 
			type: 'saveRecipe', 
			name: $('#editRecipeName').val(),
			imageUrl: $('#JFYimage').attr('src'),
			prepTime: parseInt($('#editRecipePrepTime').val()),
			cookime: parseInt($('#editRecipeCookTime').val()),
			makeTime: parseInt($('#editRecipeMakeTime').val()),
			ingredients: $('#editRecipeIngredients').val().replace(/(?:\r\n|\r|\n)/g, '<br />'),
			directions: $('#editRecipeDirections').val().replace(/(?:\r\n|\r|\n)/g, '<br />'),
			source: document.referrer
		}, function(response) {
			console.lo(response);
		});

		chrome.runtime.sendMessage(editorExtensionId, {type: "close"}, function(response) {
			console.log(response);
		});
	})
})

window.addEventListener('message', function(e) {
	if(e.data && e.data.length) {
		$('#JFYimage').attr('src', e.data);
		$('.JFYafter').text('');
	}
}, false);
