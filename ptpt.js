const
	// Hue between 0 and 300 is reflected on scoreSimple, but hue up to 340 is allowed
	// If the upper limit needs to be changed in the future, 340 can be increased, but the ratio value fixed at 300 must not be changed.
	ratioAt300  = 80, 
	ratioAt0 = 240,
	min_boxSize = 12;

var
	timeStart,
	inputEl,
	keyCount, charKeyCount=[], prev_charKeyCount, prev_keyDown, modifierKey,
	boxSize = min_boxSize,
	hlid_selected,
	table, row, inputCell,
	refEntry,
	lastEntryRow,
	counter;

function init() {
	table = document.getElementsByTagName('table')[0];
	counter = {
		'Correct': document.getElementById('counter-correct'),
		'Total': document.getElementById('counter-total')
	}
}

function addInput() {
	row = table.insertRow(-1);
	var cell;
	for (var i=1; i<=4; i++) {
		cell = row.insertCell(-1);
		if (i==3) inputCell = cell;
	}
	inputCell.style.width = width();
	inputCell.innerHTML = '<input id="input" type="text">';

	inputEl = document.getElementById('input');
	inputEl.focus();

	keyCount = 0;
	charKeyCount = [0];
	prev_keyDown = null;
}

function startInput() {
	timeStart = Date.now();
}

function keyDown(event) {
	var key = event.which;
	inputEl.focus();

	if (
		// if started typing in empty field
		inputEl.value.length == 0 ||
		// if pressed CTRL+A for overwriting
		typeof inputEl.selectionStart == "number" && inputEl.selectionStart == 0 && inputEl.selectionEnd == inputEl.value.length
	) startInput();
	
	if (key==13) finishInput();
	else if (
		// shift
		key==16 ||
		// alt gr (ctrl->alt)
		key==17 || key==18 ||
		// erase
		key==27 || key==8 ||
		// character
		key>=65 && key<=90 || key>=48 && key<=57 || key>=186 && key<=226 || key==32 || key>=96 && key<=111
	) {
		// modifier key (doesn't affect input value)
		var length = inputEl.value.length;
		if (key>=16 && key<=18) {
			if (key!=17 && key!=modifierKey) {
				modifierKey = key;
				keyCount ++;
				charKeyCount[length] ++;
				// revoke keydown before alt+tab
				zeroIfEmpty();
			}
		// typing (affects input value)
		}else{
			switch (key) {
				default:
					charKeyCount[length] += key==32 ? .5 : 1;
					charKeyCount[length+1] = 0;
					if (length >= boxSize) {
						boxSize = length+1;
						inputCell.style.width = width();
					}
				break;
				case 27:
					inputEl.value='';
					charKeyCount = [0];
					prev_charKeyCount = 0;
					if (boxSize > min_boxSize) {
						boxSize = min_boxSize;
						inputCell.style.width = width();
					}
				break;
				case 8:
					charKeyCount[length] = 0;
					charKeyCount[length-1] = 0;
					if (length == boxSize && boxSize > min_boxSize) {
						boxSize = length-1;
						inputCell.style.width = width();
					}
				break;
			}
		}
		if (key!=17) prev_keyDown = key; // 17 is the first part of AltGr
	}
}

function keyUp(event) {
	var key = event.which;
	// shift, alt
	if ((key==16 || key==18) && key == prev_keyDown)
		charKeyCount[inputEl.value.length] --;

	modifierKey = null;

	// avoid keyups after switching back to browster tab
	zeroIfEmpty();
}

function zeroIfEmpty() {
	if (inputEl && !inputEl.value) {
		charKeyCount = [0];
	}

}

function finishInput()
{
	var inputVal = document.getElementById('input').value;
	/*if (inputVal.length < 8) {
		input.className = 'invalid';
		setTimeout(function() {
			input.className = '';
		}, 9);
		return;
	}*/

	const time = Date.now() - timeStart;
	
	// iteratively sum up the elements of the array.
	var keyCount = charKeyCount.reduce((runningSum, current) => runningSum + current, 0); // 0 = runningSum initial value
	keyCount ++; // enter
	
	var ratio = time / keyCount;
	if (ratio > ratioAt0) ratio = ratioAt0;
	const scoreSimple = 1 - (ratio - ratioAt300) / (ratioAt0 - ratioAt300); // 0..1
	// hue on an arithemtic sequence (sluggish)
	const Ahue = 300 * scoreSimple;
	// hue on a geometric sequence (coarse)
	const Ghue = Math.pow(300, scoreSimple);
	// balanced curve geometrically averaged by 1:4 (A:G)
	var hue = Math.pow( Math.pow(Ahue, 1) * Math.pow(Ghue, 4), 1/5 );

	// trimming hue on overflow
	if (hue<1) hue=0; else
	if (hue>340) hue=340;

	// actual score 
	const scoreActual = Math.round(hue*5/3); // 100 score per hue hotspot

	// hue rounding
	hue = Math.round(hue);
	
	// fixing colors
	const lightness = convert('hue_lightness',hue);
	const saturation = convert('hue_saturation',hue);

	var barWidth = Math.round(time/17);

	var sum=0; // id for highlight
	var entry='';
	var cl; // css class of each character
	var r=0; // index inside reference entry for proofing
	const ignoreEntry = refEntry && inputVal.length <= refEntry.length-4; // if only a part of the password is being practiced, don't proof and don't count
	for (var i=0; i<inputVal.length; i++)
	{
		var a = inputVal.charCodeAt(i);

		const sumComponent = Math.pow(a, 1+i);
		sum += sumComponent;
		if (i==inputVal.length-1) {
			sum = Math.floor(sum % 100000);
		}
		
		if (a>=97 && a<=122)
			cl=[];
		else if (a>=65 && a<=90)
			cl=['upper'];
		else if (a>=48 && a<=57)
			cl=['number'];
		else if (a>=128)
			cl=['extra'];
		else
			cl=['symbol'];

		// PROOFING
		if (
			refEntry &&
			inputVal.charAt(i) != refEntry.charAt(r) &&
			!ignoreEntry
			) {
			cl.push('error');

			// two adjacent characters swapped
			var swap = null;
			// first character of the swapped pair
			if (
				inputVal.charAt(i) == refEntry.charAt(r+1) &&
				inputVal.charAt(i+1) == refEntry.charAt(r) &&
				(refEntry.charAt(r) != refEntry.charAt(r+2) ||     //
				 inputVal.charAt(i+2) == refEntry.charAt(r+2)) &&  // making sure it's not skipping, like "here"->"hre"
				(inputVal.charAt(i) != inputVal.charAt(i+2) ||     //
				 inputVal.charAt(i+2) == refEntry.charAt(r+2))     // making sure it's not false insert, like "turnip"->"turinip"
			)
				swap = 1;
			// second character of the swapped pair
			else if (
				inputVal.charAt(i) == refEntry.charAt(r-1) &&
				inputVal.charAt(i-1) == refEntry.charAt(r) &&
				(refEntry.charAt(r-1) != refEntry.charAt(r+1) ||   //
				 inputVal.charAt(i+1) == refEntry.charAt(r+1))     // making sure it's not skipping, like "here"->"hre"
				// (and there is no case when there is false insert at the second character, because it breaks the possible swapping)
			)
				swap = 2;

			if (swap) {
				cl.push('swap part-'+swap);
			}
			else {
				// a character skipped
				if (
					inputVal.charAt(i) == refEntry.charAt(r+1) &&
					inputVal.charAt(i+1) == refEntry.charAt(r+2) // making sure it's not insert, like "turnip"->"turinip"
				)
					r++;
				// a character falsely inserted
				else if (
					inputVal.charAt(i+1) &&
					inputVal.charAt(i+1) == refEntry.charAt(r)
				)
					r--;
			}
		}
		if (i!=r)
			cl.push('slip');

		// adding formatted character to entry
		var classStr = cl.length>0 ? ' class="'+cl.join(' ')+'"' : '';
		entry += '<span'+classStr+'>'+inputVal[i]+'</span>';

		// if last character is missing, add an extra spaceholder to the entry
		if (refEntry && i == inputVal.length-1 && inputVal.length == refEntry.length + i-r - 1)
			entry += '<span class="error">&nbsp;</span>';

		r++;
	}

	if (!ignoreEntry) {
		if (!hlid_selected)
			hlid_selected = sum;
		if (sum == hlid_selected) {
			var hlStatus = ' correct';
			var increase = true;
			if (refEntry != inputVal)
				refEntry = inputVal;
		}else{
			var hlStatus = '';
			var increase = false;
		}
		if (increase) count('Correct','+',1);

		count('Total','+',1);
	}

	row.remove();

	row = table.insertRow(-1);
	row.className = 'entry-row hlid-' + sum + hlStatus;
	
	var cell = row.insertCell(-1);
	var icon = document.createElement('span');
	icon.className = 'remove';
	icon.addEventListener('click', function()
	{
		count('Total','-',1);
		if (this.parentNode.parentNode.className.substr(-7) == 'correct')
			count('Correct','-',1);
		this.parentNode.parentNode.remove();
		boxSize = min_boxSize;
		inputCell.style.width = width();
		inputEl.focus();

		if (document.getElementsByClassName('correct').length == 0)
			removeProofing();
	});
	cell.appendChild(icon);

	cell = row.insertCell(-1);
	icon = document.createElement('span');
	icon.className = 'hl';
	icon.addEventListener('click', function() {
		hl(sum);
		inputEl.focus();
	});
	cell.appendChild(icon);
	
	cell = row.insertCell(-1);
	cell.className = 'entry';
	cell.innerHTML = entry;

	cell = row.insertCell(-1);
	cell.className = 'sec';
	cell.innerHTML = time/1000;

	cell = row.insertCell(-1);
	cell.className = 'bar';
	cell.innerHTML = '<div style="width: '+ barWidth +'px; background: hsl('+ hue +' '+ saturation +'% '+ lightness +'%)">'+ scoreActual +'</div>';

	addInput();
}


function width() {
	return (boxSize*9+10)+'px';
}

function count(which, operation, amount) {
	var n;
	switch (operation) {
		case '+': n = Number(counter[which].innerHTML) + amount; break;
		case '-': n = Number(counter[which].innerHTML) - amount; break;
		case '=': n = amount; break;
	}
	counter[which].innerHTML = n;
	
	// minor aesthetic tweak
	if (which=='total') {
		var newAmount = Number(counter[which].innerHTML);
		document.getElementById('counter-slash').className = newAmount >= 10 && newAmount <= 19 ? 'teen' : '';
	}
}

function hl(hlid) {
	if (hlid == hlid_selected) return;

	var coll = document.querySelectorAll('tr.entry-row');
	[].forEach.call(coll, function(el) {
		el.classList.remove('correct');
	});
	coll = document.querySelectorAll('tr.hlid-'+hlid);
	[].forEach.call(coll, function(el) {
		el.className += ' correct';
	});
	count('Correct','=',coll.length);
	
	hlid_selected = hlid;
	
	removeProofing();
}

function removeProofing() {
	var coll1 = document.querySelectorAll('tr.entry-row');
	[].forEach.call(coll1, function(el) {
		var coll2 = el
			.getElementsByClassName('entry')[0]
			.querySelectorAll('.error,.slip');
		var list = [];
		[].forEach.call(coll2, function(el) {
			// "error" className must be removed, but doing that here would affect the "error" className collection, so another list is needed
			list.push(el);
		});
		for (const el of list) {
			el.classList.remove('error');
			el.classList.remove('slip');
		}
	});

	refEntry = null;
}

function convert(conversions_key, x)
{
	var
		a = conversions[conversions_key],
		k = keys[conversions_key],
		y,
		x1, x2, y1, y2;

	var i = k.length-1;

	do {
		if (k[i] > x) {
			i--;
		}
		else if (k[i] < x) {
			x1 = k[i]; y1 = a[k[i]]; i++;
			x2 = k[i]; y2 = a[k[i]]; i++;
			y = Math.round( ( (y2-y1) * (x-x1)/(x2-x1) + y1 ) * 100 ) / 100;
		}
		else {
			y = a[k[i]];
		}
	} while (!y && i>=0);
	
	return y;
}

const conversions = {
	hue_lightness: {
		  0: 50,
		180: 50,
		240: 62,
		300: 58,
		360: 60,
	},
	hue_saturation: {
		  0: 60,
		300: 60,
		360: 80,
	},
};
	
var keys = {};

Object.entries(conversions).forEach(entry => {
	const [key, array] = entry;
	var stringKeys = Object.keys(array); // get keys of array 
	keys[key] = stringKeys.map(Number); // convert to integer
});
