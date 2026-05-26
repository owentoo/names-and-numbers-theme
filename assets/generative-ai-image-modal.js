$(function() {
	const getImgSize = 10; // its in inches to get ai images.
	const batchSize = 3;
	const maxImages = 21;
	const brandingName = `ninjatransfers.com`;

	const host = 'https://www.rushordertees.com/design';

	$( document )
	.on('click', '#generative-ai-dialog > header > button', (event) => {
		$('#generative-ai-dialog')[0].close();
	})
	.on('submit', '#generative-ai-dialog form', async (event) => {
		let existingImages = [];
		let remainingSearches = Number.MAX_SAFE_INTEGER;
		const prompt = $(this).find('input[name="prompt"]').val();

		const aiImages = $('#generative-ai-images');
		const aiSearches = $('#generative-ai-remaining-searches');
		const aiLoader = $('#generative-ai-dialog-loader');
		const aiTips = $('#generative-ai-tips');
		const aiGenerating = $('#generative-ai-generating');

		const form = $('#generative-ai-dialog > form');

		event.preventDefault();

		aiLoader.addClass('show');
		aiImages.empty();
		aiSearches.empty();
		aiTips.empty();
		form.attr('disabled', 'disabled');

		try {
			let statsPromise = fetch(`${host}/generative-stats.php?type=clipart`).then(response => response.json());

			let existingPromise = fetch(`${host}/studio/getGenerativeAiUploads.php?prompt=` + encodeURIComponent(prompt), {
				credentials: "include"
			}).then(response => response.json());

			let allResults = await Promise.allSettled([statsPromise, existingPromise]);
			let stats = allResults[0].status === 'fulfilled' ? allResults[0].value : {};

			existingImages = allResults[1].status === 'fulfilled' ? allResults[1].value : [];
			remainingSearches = stats.remainingRequest ?  Math.ceil(stats.remainingRequest / batchSize) : remainingSearches;

			getAIData();
		} catch (e) {
			console.error('generative-ai-dialog - error', e);
		}

		if (remainingSearches > 0 && remainingSearches <= 5) {
			aiSearches.text(`You have ${remainingSearches} more AI searches remaining.`);
		} else if (remainingSearches <= 0) {
			aiSearches.text(`You have no more AI searches remaining. Please try again later.`);
		}

		aiImages.append(existingImages.map(createImageFigure));

		if (remainingSearches > 0 && existingImages.length < maxImages) {
			try {
				let newImageCount = Math.min(maxImages - existingImages.length, batchSize);

				aiGenerating.text(`(Generating ${newImageCount} New Images)`);

				let newImages = await fetch(host + '/studio/postBatchGenerativeAiUpload.php', {method: 'POST', body: JSON.stringify({prompt, batchSize, brandingName})}).then(response => response.json());

				aiGenerating.empty();
				aiImages.append(newImages.map(createImageFigure));
			} catch (e) {
				console.error('generative-ai-dialog - error', e);
			}
		}

		aiLoader.removeClass('show');
		form.removeAttr('disabled');
	})
	.on('click', '#generative-ai-images figure', async (event) => {
		const aiLoader = $('#generative-ai-dialog-loader');
		const form = $('#generative-ai-dialog > form');

		aiLoader.addClass('show');
		form.attr('disabled', 'disabled');

		try {
			const figure = event.target.closest('figure');

			const response = await fetch(figure.dataset.url);
			const type = response.headers.get("Content-Type");
			const arrayBuffer = await response.arrayBuffer();

			let blob = new Blob([arrayBuffer], {type: type});
			let file = new File([blob], figure.dataset.fileName, {type: type});
			if($("upload-controls master-upload").hasClass("hidden")){
				await singleFileAddToCart();
				// alert("im in singleFileAddToCart")
			}

			const isNewBySize = $( `upload-controls` ).length;
			if ( isNewBySize > 0 ) {
				file.isAIImage = true;
				manageFiles( [file] );
			} else {
				if($(".step__2").hasClass("hidden")){
					uploadFile(file);
				}else{
					uploadFile(file, "second_image");
				}
			}

			isAIImage = true;

			$('#generative-ai-dialog')[0].close();
			// $('.generative-ai-area').hide();
		} catch (e) {
			console.error('generative-ai-dialog - error', e);
		}

		aiLoader.removeClass('show');
		form.removeAttr('disabled');
	})
	.on('click', '.generative-ai-area', function (event) {
		if ($('#generative-ai-dialog').length === 0) {
			return;
		}

		$('#generative-ai-dialog')[0].showModal();
	})
	.on(`click`, `#generative-ai-dialog .searchCross`, function( e ) {
		try {
			e.stopImmediatePropagation();
			$( this ).prev( '[type="search"]' ).val( '' );
		} catch ( err ) {
			console.log( `ERROR #generative-ai-dialog .searchCross`, err.message );
		}
	})
	.on(`change`, `#recentSearches`, function( e ) {
		try {
			e.stopImmediatePropagation();
			console.log ( 'this is click',);
		} catch ( err ) {
			console.log( `ERROR #recentSearches`, err.message );
		}
	})
	;


	function createImageFigure(image) {
		const img = document.createElement('img');
		const figure = document.createElement('figure');
		const caption = document.createElement('figcaption');

		img.src = image.thumbnailUrl;
		caption.textContent = 'Use this image';

		figure.dataset.fileName = image.fileName;
		const updateURL = image.url.replace( `/unsafe/`, `/unsafe/${ getImgSize * 300 }x0/` );
		figure.dataset.url = updateURL;
		// figure.dataset.url = image.url;

		figure.appendChild(img);
		figure.appendChild(caption);

		return figure;
	}
	getAIData();
	async function getAIData() {
		let recentPromise = await fetch(`${host}/studio/getRecentGenerativeAiUploadPrompts.php`, {
			credentials: "include"
		}).then(response => response.json());
		if ( typeof recentPromise !== 'undefined' && recentPromise.length > 0 ) {
			console.log ( 'recentPromise', recentPromise );
			$( `#AISearchMenu .AISearch__item, #AISearchMenu .AISearch__title` ).remove();
			$( `#generative-ai-dialog form #AISearchMenu` ).append( `<div class="AISearch__title">Recent Searches</div>` );
			recentPromise.forEach(o => {
				$( `#generative-ai-dialog form #AISearchMenu` ).append( `<div class="AISearch__item" val="${ o.prompt }">${ o.prompt }</div>` );
			});
		}
	}
});


/*
$( document ).mouseup(function( e ) {
	try {
		const container = $( `#generative-ai-dialog` );
		if (!container.is( e.target) && container.has( e.target ).length === 0 ) {
			container.find( `header > button` ).click();
		}
	} catch ( err ) {
		console.log( `ERROR `, err.message );
	}
});
*/
$(document).on('mouseup', function(e) {
	try {
		const container = $('#generative-ai-dialog');
		if (container.is(':visible') && !$(e.target).closest('#generative-ai-dialog').length) {
			container.find('header > button').trigger('click');
		}
	} catch (err) {
		console.log('ERROR', err.message);
	}
});

$(document).ready(function () {
	const inputAI = $("#AISearchInput");
	let activeIndex = -1;

	// Show the menu when input is focused
	inputAI.on("focus", function () {
		$("#AISearchMenu").addClass( `active` );
	});

	// Hide the menu when input loses focus
	inputAI.on("blur", function () {
		setTimeout(() => $("#AISearchMenu").removeClass( `active` ), 300); // Delay for click event to register
	});

	// Arrow key navigation and enter selection
	inputAI.on("keydown", function (event) {
		if (event.key === "ArrowDown") {
			$("#AISearchMenu").addClass( `active` );
			activeIndex = (activeIndex + 1) % $(".AISearch__item").length; // Cycle down
			updateActiveItem();
			event.preventDefault();
		} else if (event.key === "ArrowUp") {
			$("#AISearchMenu").addClass( `active` );
			activeIndex = (activeIndex - 1 + $(".AISearch__item").length) % $(".AISearch__item").length; // Cycle up
			updateActiveItem();
			event.preventDefault();
		} else if (event.key === "Enter") {
			if (activeIndex >= 0) {
				inputAI.val($($(".AISearch__item")[activeIndex]).text());
				setTimeout(() => $("#AISearchMenu").removeClass( `active` ), 300);
				event.preventDefault();
			}
		}
	});

	// Update active item visually
	function updateActiveItem() {
		$(".AISearch__item").removeClass("active");
		if (activeIndex >= 0) {
			const currentItem = $($(".AISearch__item")[activeIndex]);
			currentItem.addClass("active");

			// Ensure the active item is visible
			$("#AISearchMenu").scrollTop(
				currentItem.position().top + $("#AISearchMenu").scrollTop() - $("#AISearchMenu").height() / 2 + currentItem.height() / 2
			);
		}
	}

	// Reset active index when input is clicked
	inputAI.on("click", function () {
		activeIndex = -1;
		updateActiveItem();
	});
})

.on(`click`, `.AISearch__item`, function( e ) {
	try {
		e.stopImmediatePropagation();
			console.log ( '$(this).attr( `val` )', $(this).attr( `val` ) );
			$("#AISearchInput").val($(this).attr( `val` ));
			setTimeout(() => $("#AISearchMenu").removeClass( `active` ), 300);
	} catch ( err ) {
		console.log( `ERROR .AISearch__item`, err.message );
	}
})

;
