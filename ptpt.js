const cell_debug = 0,
	minLength = 12;

var timeStart,
	inputEl,
	length = minLength,
	hlid_selected,
	table, row, inputCell,
	counter;

function init() {
	const hue = Math.round(Math.random()*360),
	lig = 
		hue>230 && hue<320 ? 60 :
		(hue>220 && hue<335 ? 55 :
		50);

	var color = 'hsl('+hue+' 60% '+lig+'%)';

	var css = `
		.bar.checked div {
			background: `+color+`;
		}
		#counter-correct {
			color: `+color+`;
		}
	`;
	var styleSheet = document.createElement("style");
	styleSheet.innerText = css;
	document.head.appendChild(styleSheet);

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
	inputEl.addEventListener("keydown", keydown);
	inputEl.focus();
}

function startInput() {
	timeStart = Date.now();
}

function finishInput()
{
	var inputVal = document.getElementById('input').value;
	if (!inputVal) return;

	var time = (Date.now()-timeStart)/1000;

	var barWidth = Math.round(time*100);
	var sum = 0;
	var prevInput = '';
	var cl;
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
		length = minLength;
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
	cell.innerHTML = time;

	cell = row.insertCell(-1);
	cell.className = 'bar bar-' + sum + hlStatus;
	cell.innerHTML = '<div style="width: '+barWidth+'px"></div>';

	if (cell_debug)
		stressCells(row);

	addInput();
}

function width() {
	return (length*9+10)+'px';
}

function count(which, operation, amount) {
	var n;
	switch (operation) {
		case '+': n = Number(counter[which].innerHTML) + amount; break;
		case '-': n = Number(counter[which].innerHTML) - amount; break;
		case '=': n = amount; break;
	}
	counter[which].innerHTML = n;
	
	// small aesthetic tweak
	if (which=='total') {
		var newAmount = Number(counter[which].innerHTML);
		document.getElementById('of').className = newAmount >= 10 && newAmount <= 19 ? 'ten' : '';
	}
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

function keydown(event) {
	var key = event.which;

	if (
		// if started typing in empty field
		inputEl.value.length == 0 ||
		// if pressed CTRL+A for overwriting
		typeof inputEl.selectionStart == "number" && inputEl.selectionStart == 0 && inputEl.selectionEnd == inputEl.value.length
	) startInput();
	
	if (key==13) finishInput();
	else if (key==27 || key==8 || key>=65 && key<=90 || key>=48 && key<=57 || key>=186 && key<=226 || key==32 || key>=96 && key<=111) {
		var l = inputEl.value.length;
		switch (key) {
			default:
				if (l >= length) {
					length = l+1;
					inputCell.style.width = width();
				}
			break;
			case 27:
				inputEl.value='';
				if (length > minLength) {
					length = minLength;
					inputCell.style.width = width();
				}
			break;
			case 8:
				if (l == length && length > minLength) {
					length = l-1;
					inputCell.style.width = width();
				}
			break;
		}
	}
}
