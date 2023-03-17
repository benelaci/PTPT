const
	cell_debug = 0,
	keyPress_debug = 0,
	keyCount_debug = 0,
	hue_debug = 0,

	// Hue between 0 and 300 is reflected on score1, but hue up to 340 is allowed, and score1000 = 1000 is at hue 340 as well.
	// If the upper limit needs to be changed in the future, 340 can be increased, but the ratio value fixed at 300 must not be changed.
	// Increasing the 340 upper limit will change scoring (score1000).
	ratioAt300  = 80, 
	ratioAt0 = 160,
	min_boxSize = 12;

var
	timeStart,
	inputEl,
	keyCount, charKeyCount=[], prev_charKeyCount, prev_keyDown, modifierKey,
	boxSize = min_boxSize,
	hlid_selected,
	table, row, inputCell,
	counter;

function init() {
	table = document.getElementsByTagName('table')[0];
	counter = {
		'correct': document.getElementById('counter-correct'),
		'total': document.getElementById('counter-total')
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

	// DEBUG KEYDOWN
	if (keyPress_debug) console.log("%cD: "+key, 'color: #4af');
}

function keyUp(event) {
	var key = event.which;
	if ((key==16 || key==18) && key == prev_keyDown)
		charKeyCount[inputEl.value.length] --;

	modifierKey = null;

	// avoid keyups after switching back to browster tab
	if (!inputEl.value) charKeyCount = [0];

	// DEBUG KEYUP
	if (keyPress_debug) console.log("%cU: "+key, 'color: #d7f');
	// DEBUG KEY COUNT
	if (keyCount_debug) console.log('%c' + charKeyCount +' = '+ charKeyCount.reduce((partialSum, a) => partialSum + a, 0), 'color: #cb8');
}

function finishInput()
{
	var inputVal = document.getElementById('input').value;
	if (inputVal.length < 8) {
		input.className = 'error';
		setTimeout(function() {
			input.className = '';
		}, 9);
		return;
	}

	const time = Date.now() - timeStart;
	
	var keyCount = charKeyCount.reduce((partialSum, a) => partialSum + a, 0);

	keyCount ++; // enter
	
	const ratio = time / keyCount;
	const score1 = 1 - (ratio - ratioAt300) / (ratioAt0 - ratioAt300); // 0..1
	// hue on an arithemtic sequence (sluggish)
	const Ahue = 300 * score1;
	// hue on a geometric sequence (coarse)
	const Ghue = Math.pow(300, score1);
	// balanced curve geometrically averaged by 2:1 (a:g)
	var hue = Math.pow( Math.pow(Ahue, 2) * Math.pow(Ghue, 1), 1/3 );

	// trimming hue on overflow
	if (hue<1) hue=0; else
	if (hue>340) hue=340;

	// rounding
	const score1000 = Math.round(hue*1000/340);
	hue = Math.round(hue);
	
	// fixing colors
	const lightness = convert('hue_lightness',hue);
	const saturation = convert('hue_saturation',hue);

	var barWidth = Math.round(time/10);

	var sum=0; // id for highlight
	var prevInput = '';
	var cl; // css class of each character
	for (var i=0; i<inputVal.length; i++)
	{
		var a = inputVal.charCodeAt(i);

		sum += a*(i+1);
		
		if (a>=97 && a<=122)
			cl = '';
		else if (a>=65 && a<=90)
			cl = 'upper';
		else if (a>=48 && a<=57)
			cl = 'number';
		else if (a>=128)
			cl = 'extra';
		else
			cl = 'symbol';

		prevInput += '<span class="'+cl+'">'+inputVal[i]+'</span>';
	}

	if (!hlid_selected)
		hlid_selected = sum;
	if (sum == hlid_selected) {
		var hlStatus = ' checked';
		var increase = true;
	}else{
		var hlStatus = '';
		var increase = false;
	}
	if (increase) count('correct','+',1);

	count('total','+',1);

	row.remove();
	row = table.insertRow(-1);
	
	var cell = row.insertCell(-1);
	var icon = document.createElement('span');
	icon.className = 'remove';
	icon.addEventListener('click', function() {
		count('total','-',1);
		if (this.parentNode.nextSibling.children[0].className.substr(-7) == 'checked')
			count('correct','-',1);
		this.parentNode.parentNode.remove();
		boxSize = min_boxSize;
		inputCell.style.width = width();
		inputEl.focus();
	});
	cell.appendChild(icon);

	cell = row.insertCell(-1);
	icon = document.createElement('span');
	icon.className = 'hl hl-' + sum + hlStatus;
	icon.addEventListener('click', function() {
		hl(sum);
		inputEl.focus();
	});
	cell.appendChild(icon);
	
	cell = row.insertCell(-1);
	cell.className = 'prev-input';
	cell.innerHTML = prevInput;

	cell = row.insertCell(-1);
	cell.className = 'sec';
	cell.innerHTML = time/1000;

	cell = row.insertCell(-1);
	cell.className = 'bar bar-' + sum + hlStatus;
	var hueStr = hue_debug ? '<b>'+hue+'</b> | ' : '';
	cell.innerHTML = '<div style="width: '+ barWidth +'px; background: hsl('+ hue +' '+ saturation +'% '+ lightness +'%)"><span>'+ hueStr + score1000 +'</span></div>';

	if (cell_debug)
		stressCells(row);

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
	var first = true;
	for (const which of ['hl','bar']) {
		var coll = document.getElementsByClassName(which);
		[].forEach.call(coll, function(el) {
			el.classList.remove('checked');
		});
		coll = document.getElementsByClassName(which+'-'+hlid);
		[].forEach.call(coll, function(el) {
			el.className += ' checked';
		});
		if (first) {
			count('correct','=',coll.length);
			first = false;
		}
	}
	
	hlid_selected = hlid;
}

function stressCells(row) {
	var cells = row.getElementsByTagName('td');
	[].forEach.call(cells, function(el) {
		var color = [];
		for (var i=0; i<3; i++)
			color.push(Math.round(Math.random()*128));
			el.style.background = 'rgb('+color.join(' ')+')';
	});
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
	
	console.log(y);
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
console.log(keys)
