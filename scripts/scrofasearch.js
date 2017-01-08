(function() {

var obj, svg, tags, items;
window.addEventListener("load", initialize, false);
// Асинхронный вызов указанной функции, которой передаётся объект XMLHttpRequest
function xhr(url, func) {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);
	xhr.onreadystatechange = function() {if(xhr.readyState == 4 && xhr.status == 200) {func(xhr);}}
	xhr.send(null);
}
// Определение уровня вложенности элемента
function getLevel(element) {
	return element.parentNode.getAttribute("id") != "gC" ? getLevel(element.parentNode) + 1 : 0;
}
// Инициализация функций анимации скрытия / показ элемента
function animInit(element, type) {
	switch(type) {
		case "showhide" :
			element.Show = function() {this.classList.add("show");}
			element.Hide = function() {this.classList.add("hide");}
			element.addEventListener("animationend", function(evt) {
				if(evt.animationName == "hide" && !this.Shown) {this.style.display = "none";}
				this.classList.remove("show", "hide");
			}, false);
			break;
		case "strokeshowhide" :
			element.Show = function() {
				this.classList.remove("strokeshow", "strokehide");
				this.classList.add("strokeshow");
			}
			element.Hide = function() {
				this.classList.remove("strokeshow", "strokehide");
				this.classList.add("strokehide");
			}
			break;
	}
}
// Скрытие / показ элемента
function showhide(element, show) {
	var returning = false;
	if(show != true && show != false) {show = element.Shown ? false : true;}
	if(show && !element.Shown) {
		element.Shown = true; element.style.display = "inline";
		element.Show();
		returning = true;
	}
	if(!show && element.Shown) {
		element.Shown = false;
		element.Hide();
		returning = true;
	}
	return returning;
}
// Скрытие групп ниже определённого уровня
function hideUnnecessary(level) {
	for(var i = 0; i < svg.Opened.length; i++) {
		if(svg.Opened[i].Level >= level) {
			showhide(svg.Opened[i].ChildrenGroup, false);
			svg.Opened[i].Path.setAttribute("d", svg.Opened[i].Path.D1);
			svg.Opened[i].Open = false;
			svg.Opened.splice(i, 1);
			i--;
		}
	}
}
// Скрытие / показ подгруппы
function showhideChildrenGroup(element, show) {
	if(show != true && show != false) {show = element.Shown ? false : true;}
	if(element.Image) {
		if(!show) {
			hideUnnecessary(element.Image.Level);
			showhide(element, false);
			zoom(element.Image.Level - svg.LevelCur);
		} else if(element.Images.length > 0) {
			hideUnnecessary(element.Image.Open ? element.Image.Level + 1 : element.Image.Level);
			if(!element.Image.Open) {showhide(element, true);}
			zoom(element.Image.Level + 1 - svg.LevelCur);
			element.Image.Path.setAttribute("d", element.Image.Path.D2);
			element.Image.Open = true;
			svg.Opened.push(element.Image);
		}
	}
}
// Приближение / удаление
function zoom(count) {
	if(count == 0) {return false;}
	if(svg.LevelCur + count < 1) {count = 1 - svg.LevelCur;}
	var g0 = svg.getElementById("g0");
	var sNew = Math.pow(svg.Z, 2 - count - svg.LevelCur);
	g0.style.transform = g0.style.transform.replace(/scale\s*\([^()]*\)/ig, "scale(" + sNew + ")");
	// Изменение прозрачности нижних уровней
	for(var i = 0; i < svg.Images.length; i++) {
		svg.Images[i].style.opacity = Math.pow(svg.O, Math.abs(svg.LevelCur + count - svg.Images[i].Level));
	}
	svg.LevelCur += count;
}
// Определение локальных координат
function localXY(e) {
	var point = svg.documentElement.createSVGPoint();
	point.x = e.clientX; point.y = e.clientY;
	return point.matrixTransform(svg.documentElement.getScreenCTM().inverse());
}
// Обработка drag and drop
function dragStart(e) {
	function onDrag(e) {
		loc = localXY(e);
		x = x1 + (loc.x - sx) / s, y = y1 + (loc.y - sy) / s;
		self.style.transform = self.style.transform.replace(/translate\s*\([^()]*\)/ig, "translate(" + x + "px, " + y + "px)");
	}
	function onEnd() {
		self.Drag = false;
		self.classList.remove("dragging");
		switch(self.Type) {
			case "tag" :
				// Добавление или нет
				if(Math.pow(svg.S, 2) > Math.pow(50 - loc.x, 2) + Math.pow(50 - loc.y, 2)) {
					if(!self.AttrVirtual && !self.Selected) {
						// Анимация добавления (рамка)
						self.Path.Show();
						// Добавление
						select(self);
					}
				}
				// Показ подгруппы при приближении и скрытие при удалении
				if(Math.pow(50 - sx, 2) + Math.pow(50 - sy, 2) > Math.pow(50 - loc.x, 2) + Math.pow(50 - loc.y, 2)) {
					showhideChildrenGroup(self.ChildrenGroup, true);
				} else {
					showhideChildrenGroup(self.ChildrenGroup, false);
				}
				// Анимация возвращения на место
				self.style.transform = self.style.transform.replace(/translate\s*\([^()]*\)/ig, "translate(" + x1 + "px, " + y1 + "px)");
				break;
			case "selected" :
				if(Math.pow(svg.S, 2) < Math.pow(50 - loc.x, 2) + Math.pow(50 - loc.y, 2)) {
					unselect(self);
				} else {
					// Анимация возвращения на место
					self.style.transform = self.style.transform.replace(/translate\s*\([^()]*\)/ig, "translate(" + x1 + "px, " + y1 + "px)");
				}
				break;
		}
	}
	function dragDrag(e) {
		if(!self.Drag) {
			self.Drag = true;
			self.MouseupDraged = true;
			self.classList.add("dragging");
		}
		onDrag(e);
	}
	function dragEnd() {
		if(self.Drag) {onEnd();}
		svg.removeEventListener("mousemove", dragDrag, false);
		svg.removeEventListener("mouseup", dragEnd, false);
	}
	if(!this.Drag) {
		e.preventDefault();
		var self = this;
		var x1, y1, x, y, loc = localXY(e), sx = loc.x, sy = loc.y, s;
		[undefined, x, y] = /translate\s*\(\s*(.*?)\s*,\s*(.*?)\)/i.exec(self.style.transform);
		x1 = x = parseInt(x); y1 = y = parseInt(y);
		switch(self.Type) {
			case "tag" :
				s = Math.pow(svg.Z, 1 + self.Level - svg.LevelCur);
				break;
			case "selected" : default :
				s = 1;
				break;
		}
		this.MouseupDraged = false;
		svg.addEventListener("mousemove", dragDrag, false);
		svg.addEventListener("mouseup", dragEnd, false);
	}
}
// Позиционирование выбранных элементов
function arrangeSelected() {
	var x, y, x1, y1, sels = svg.getElementById("gS").getElementsByClassName("smSearchSelected");
	for(var i = 0; i < sels.length; i++) {
		[undefined, x, y] = /translate\s*\(\s*(.*?)\s*,\s*(.*?)\)/i.exec(sels[i].style.transform);
		x = parseInt(x); y1 = y = parseInt(y);
		x1 = 30 * (2 * i - sels.length + 1) / (2 * (sels.length + 1));
		// Анимация позиционирования
		sels[i].style.transform = sels[i].style.transform.replace(/translate\s*\([^()]*\)/ig, "translate(" + x1 + "px, " + y1 + "px)");
	}
}
// Добавление i в центр
function select(element) {
	var newSelected = svg.getElementById("smSearchSelectedDef").cloneNode(true);
	newSelected.setAttribute("id", "s" + element.AttrId);
	newSelected.setAttribute("class", "smSearchSelected");
	newSelected.style.transform = "translate(0, 0)";
	newSelected.setAttribute("title", element.AttrName);
	// Оформление // Удалить
	newSelected.getElementsByTagName("circle")[0].setAttribute("id", "s" + element.AttrId + "c1");
	newSelected.getElementsByTagName("circle")[0].setAttribute("style", "fill: " + window.getComputedStyle(svg.getElementById("i" + element.AttrId + "p1"), null).fill + ";");
	animInit(newSelected, "showhide");
	showhide(newSelected, true);
	svg.getElementById("gS").appendChild(newSelected);
	// Создание свойств для s
	newSelected.Type = "selected";
	newSelected.Drag = false;
	newSelected.AttrId = element.AttrId;
	newSelected.AttrName = element.AttrName;
	newSelected.AttrVirtual = element.AttrVirtual;
	newSelected.AttrReplaces = element.AttrReplaces;
	// Событие drag and drop
	newSelected.addEventListener("mousedown", dragStart, false);
	// Удаление из центра s, замещаемых новым
	for(var i = 0; i < element.AttrReplaces.length; i++) {
		if(svg.getElementById("s" + element.AttrReplaces[i])) {unselect(svg.getElementById("s" + element.AttrReplaces[i]));}
	}
	element.Selected = true;
	arrangeSelected();
}
// Удаление s из центра
function unselect(element) {
	svg.getElementById("gC").appendChild(element);
	showhide(element, false);
	// По завершению анимации удаление и сопутствующее
	element.addEventListener("animationend", function() {element.parentNode.removeChild(element);}, false);
	// Анимация для i
	svg.getElementById("i" + element.AttrId).Path.Hide();
	svg.getElementById("i" + element.AttrId).Selected = false;
	arrangeSelected();
}
// Показ выбранных тэгов // Удалить
function showSelected() {
	if(svg.getElementById("tS")) {svg.getElementById("tS").parentNode.removeChild(svg.getElementById("tS"));}
	svg.documentElement.appendChild(svg.getElementById("smSearchTextDef").cloneNode(true)).setAttribute("id", "tS");
	var sels = svg.getElementById("gS").getElementsByClassName("smSearchSelected");
	for(var i = 0; i < sels.length; i++) {
		svg.getElementById("tS").appendChild(svg.getElementById("smSearchTspanDef").cloneNode(true)).textContent = sels[i].AttrName;
	}
}
// Показ результатов
function showResults() {
	if(svg.getElementById("tR")) {svg.getElementById("tR").parentNode.removeChild(svg.getElementById("tR"));}
	svg.documentElement.appendChild(svg.getElementById("smSearchResTextDef").cloneNode(true)).setAttribute("id", "tR");
	var sels = svg.getElementById("gS").getElementsByClassName("smSearchSelected");
	for(var i = 0; i < items.length; i++) {
		items[i].Selected = true;
		for(var y = 0; y < sels.length; y++) {
			var re = new RegExp("\\b" + sels[y].AttrId + "\\b");
			if(!re.test(items[i].getAttribute("tags"))) {
				items[i].Selected = false;
			}
		}
		if(items[i].Selected) {
			svg.getElementById("tR").appendChild(svg.getElementById("smSearchResTspanDef").cloneNode(true)).textContent = items[i].getAttribute("name");
		}
	}
}
// Инициализация
function initialize() {
	obj = document.getElementById("smSearchObj");
	svg = obj.contentDocument;
	svg.TagsXml = obj.getAttribute("smSearchTagsXml");
	svg.ItemsXml = obj.getAttribute("smSearchItemsXml");
	svg.R = obj.getAttribute("smSearchR") ? eval(obj.getAttribute("smSearchR")) : 65; // Основной радиус
	svg.S = obj.getAttribute("smSearchS") ? eval(obj.getAttribute("smSearchS")) : 17; // Радиус зоны добавления
	svg.G1 = obj.getAttribute("smSearchG1") ? eval(obj.getAttribute("smSearchG1")) : 0.015; // 1-ое расстояние между соседними сегментами
	svg.G2 = obj.getAttribute("smSearchG2") ? eval(obj.getAttribute("smSearchG2")) : 0.06; // 2-ое расстояние между соседними сегментами
	svg.W1 = obj.getAttribute("smSearchW1") ? eval(obj.getAttribute("smSearchW1")) : 19; // Толщина сегментов
	svg.W2 = obj.getAttribute("smSearchW2") ? eval(obj.getAttribute("smSearchW2")) : 23; // Толщина открытых сегментов
	svg.Z = obj.getAttribute("smSearchZ") ? eval(obj.getAttribute("smSearchZ")) : 0.6; // Расстояние между кругами
	svg.O = obj.getAttribute("smSearchO") ? eval(obj.getAttribute("smSearchO")) : 0.6; // Шаг прозрачности кругов
	svg.G3 = 0.075; // Удалить - исправив!
	svg.LevelCur = 1;
	var gS = svg.getElementById("gS");
	// Показ выбранных тэгов и результатов // Удалить
	var observer = new MutationObserver(function(mutations) {
		mutations.forEach(function(mutation) {
			if(mutation.type == "childList") {
				showSelected(); showResults();
			}
		});
	});
	observer.observe(gS, {childList: true});
	// Получение из XML-файла tags и построение тэгов
	svg.BuildTags = function(xhr) {
		tags = xhr.responseXML.getElementsByTagName("tag");
		// Создание i и g для тэгов
		for(var i = 0; i < tags.length; i++) {
			var newImage = svg.getElementById("smSearchImageDef").cloneNode(true);
			var newGroup = svg.getElementById("smSearchGroupDef").cloneNode(true);
			newImage.setAttribute("id", "i" + tags[i].getAttribute("id"));
			newGroup.setAttribute("id", "g" + tags[i].getAttribute("id"));
			newImage.setAttribute("class", "smSearchImage");
			newImage.style.transform = "translate(0, 0)";
			newGroup.setAttribute("class", "smSearchGroup zoom");
			newGroup.style.transform = "translate(0, 0) scale(" + svg.Z + ")";
			newImage.Path = newImage.getElementsByTagName("path")[0];
			animInit(newImage.Path, "strokeshowhide");
			newImage.Path.setAttribute("id", "i" + tags[i].getAttribute("id") + "p1");
			newImage.getElementsByTagName("text")[0].getElementsByTagName("textPath")[0].setAttributeNS("http://www.w3.org/1999/xlink", "href", "#i" + tags[i].getAttribute("id") + "p1");
			newImage.getElementsByTagName("text")[0].getElementsByTagName("textPath")[0].getElementsByTagName("tspan")[0].textContent = tags[i].getAttribute("name");
			newGroup.Shown = false; newGroup.style.display = "none";
			animInit(newGroup, "showhide");
			if(tags[i].parentNode.tagName == "tags") {
				svg.getElementById("g0").appendChild(newImage);
				svg.getElementById("g0").appendChild(newGroup);
			} else {
				svg.getElementById("g" + tags[i].parentNode.getAttribute("id")).appendChild(newImage);
				svg.getElementById("g" + tags[i].parentNode.getAttribute("id")).appendChild(newGroup);
			}
			// Создание свойств для g
			newGroup.Image = newImage;
			// Создание свойств для i
			newImage.Type = "tag";
			newImage.ChildrenGroup = newGroup;
			newImage.Selected = false;
			newImage.Drag = false;
			newImage.AttrId = tags[i].getAttribute("id");
			newImage.AttrName = (tags[i].getAttribute("name") == null ? "" : tags[i].getAttribute("name"));
			newImage.AttrVirtual = (tags[i].getAttribute("virtual") == null || tags[i].getAttribute("virtual") == "" ? false : Boolean(tags[i].getAttribute("virtual")));
			newImage.AttrReplaces = (tags[i].getAttribute("replaces") == null || tags[i].getAttribute("replaces") == "" ? [] : tags[i].getAttribute("replaces").split(" "));
			// Запоминание цвета path
			newImage.Path.Color = window.getComputedStyle(newImage.Path, null).stroke;
		}
		// Настройка вида i и g для тэга
		svg.Groups = svg.getElementsByClassName("smSearchGroup");
		svg.Images = svg.getElementsByClassName("smSearchImage");
		svg.Opened = new Array();
		for(var i = 0; i < svg.Groups.length; i++) {
			svg.Groups[i].Level = getLevel(svg.Groups[i]);
			// Сбор непосредственных i-детей
			svg.Groups[i].Images = new Array();
			for(var y = 0; y < svg.Groups[i].childNodes.length; y++) {if(svg.Groups[i].childNodes[y].nodeType == 1) {
				if(svg.Groups[i].childNodes[y].classList.contains("smSearchImage")) {svg.Groups[i].Images.push(svg.Groups[i].childNodes[y]);}
			}}
			// Настройка вида i в конкретном g
			for(var y = 0; y < svg.Groups[i].Images.length; y++) {
				var pCs = new Array();
				pCs.push(Math.cos(2 * y * Math.PI / svg.Groups[i].Images.length + svg.G1 * Math.PI) * svg.R);
				pCs.push(0 - Math.sin(2 * y * Math.PI / svg.Groups[i].Images.length + svg.G1 * Math.PI) * svg.R);
				pCs.push(Math.cos(2 * (y + 1) * Math.PI / svg.Groups[i].Images.length - svg.G1 * Math.PI) * svg.R);
				pCs.push(0 - Math.sin(2 * (y + 1) * Math.PI / svg.Groups[i].Images.length - svg.G1 * Math.PI) * svg.R);
				pCs.push(Math.cos(2 * (y + 1) * Math.PI / svg.Groups[i].Images.length - svg.G2 * Math.PI) * (svg.R - svg.W1));
				pCs.push(0 - Math.sin(2 * (y + 1) * Math.PI / svg.Groups[i].Images.length - svg.G2 * Math.PI) * (svg.R - svg.W1));
				pCs.push(Math.cos(2 * y * Math.PI / svg.Groups[i].Images.length + svg.G2 * Math.PI) * (svg.R - svg.W1));
				pCs.push(0 - Math.sin(2 * y * Math.PI / svg.Groups[i].Images.length + svg.G2 * Math.PI) * (svg.R - svg.W1));
				pCs.push(Math.cos(2 * (y + 1) * Math.PI / svg.Groups[i].Images.length - svg.G3 * Math.PI) * (svg.R - svg.W2));
				pCs.push(0 - Math.sin(2 * (y + 1) * Math.PI / svg.Groups[i].Images.length - svg.G3 * Math.PI) * (svg.R - svg.W2));
				pCs.push(Math.cos(2 * y * Math.PI / svg.Groups[i].Images.length + svg.G3 * Math.PI) * (svg.R - svg.W2));
				pCs.push(0 - Math.sin(2 * y * Math.PI / svg.Groups[i].Images.length + svg.G3 * Math.PI) * (svg.R - svg.W2));
				svg.Groups[i].Images[y].Path.D1 = "M " + pCs[0] + " " + pCs[1] + " A " + svg.R + " " + svg.R + " 0 0 0 " + pCs[2] + " " + pCs[3] + " L " + pCs[4] + " " + pCs[5] + " A " + (svg.R - svg.W1) + " " + (svg.R - svg.W1) + " 0 0 1 " + pCs[6] + " " + pCs[7] + "Z";
				svg.Groups[i].Images[y].Path.D2 = "M " + pCs[0] + " " + pCs[1] + " A " + svg.R + " " + svg.R + " 0 0 0 " + pCs[2] + " " + pCs[3] + " L " + pCs[8] + " " + pCs[9] + " A " + (svg.R - svg.W2) + " " + (svg.R - svg.W2) + " 0 0 1 " + pCs[10] + " " + pCs[11] + "Z";
				svg.Groups[i].Images[y].Path.setAttribute("d", svg.Groups[i].Images[y].Path.D1);
			}
		}
		// Дальнейшая настройка i
		for(var i = 0; i < svg.Images.length; i++) {
			svg.Images[i].Level = getLevel(svg.Images[i]);
			// Событие открывания / закрывания детей i
			svg.Images[i].addEventListener("click", function(evt) {
				if(!this.MouseupDraged) {showhideChildrenGroup(this.ChildrenGroup, true);}
			}, false);
			// Событие drag and drop
			svg.Images[i].addEventListener("mousedown", dragStart, false);
		}
		// Событие приближения / удаления g0
		svg.addEventListener("wheel", function(evt) {
			evt.wheelDelta = evt.wheelDelta ? evt.wheelDelta : -40 * evt.deltaY;
			evt.preventDefault ? evt.preventDefault() : (evt.returnValue = false);
			zoom(evt.wheelDelta / 360);
		}, false);
	}
	// Получение из XML-файла items и их настройка
	svg.BuildItems = function(xhr) {
		items = xhr.responseXML.getElementsByTagName("item");
	}
	// Асинхронный вызов svg.getTags
	xhr(svg.TagsXml, svg.BuildTags);
	xhr(svg.ItemsXml, svg.BuildItems);
}

})();
