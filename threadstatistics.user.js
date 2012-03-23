// ==UserScript==
// @name        4chan thread statistics
// @version     1.0
// @namespace   anon.4chan.org
// @description Adds thread statistics.
// @include     http://boards.4chan.org/*/res/*
// @include     https://boards.4chan.org/*/res/*
// @run-at      document-start
// ==/UserScript==

(function() {
	"use strict";
	
	function isDST()
	{
		// From 4chan X
		var D = new Date();
		var date = D.getUTCDate();
		var day = D.getUTCDay();
		var hours = D.getUTCHours();
		var month = D.getUTCMonth();
		
		if (month < 2 || 10 < month)
			return false;
		if ((2 < month && month < 10))
			return true;
		
		var sunday = date - day;
		
		if (month === 2)
		{
			if (sunday < 8)
				return false;
			if (sunday < 15 && day === 0)
			{
				if (hours < 7)
					return false;
				return true;
			}
			return true;
		}
		
		if (sunday < 1)
			return true;
		
		if (sunday < 8 && day === 0)
		{
			if (hours < 6)
				return true;
			return false;
		}
		return false;
	}
	
	var chanOffset = 5 - new Date().getTimezoneOffset() / 60 - (isDST() ? 1 : 0);
	var statistics = document.createElement("div");
	var posts = [];
	var postsSparse = [];
	var creationDate = 0;
	var opId = 0;
	var board = document.location.href.match(/^https?:\/\/boards.4chan.org(\/[^\/]+\/)/)[1];
	var appended = false;
	var prevDate = 0;
	
	statistics.style.textAlign = "center";
	statistics.style.fontSize = "7pt";
	
	statistics.appendChild(document.createElement("br"));
	
	function makeLabel(title)
	{
		var b = document.createElement("b");
		var text = document.createTextNode("");
		b.appendChild(document.createTextNode(title + ": "));
		statistics.appendChild(b);
		statistics.appendChild(text);
		statistics.appendChild(document.createElement("br"));
		
		return text;
	}
	
	var threadAge = makeLabel("Thread age");
	var boardPosts = makeLabel("Posts in " + board);
	var threadPosts = makeLabel("Posts in thread");
	var boardPPM = makeLabel(board + " posts per minute");
	var threadPPM = makeLabel("Thread posts per minute");
	
	function updatePosts(target)
	{
		if (!creationDate)
			creationDate = parseInt(document.querySelector("img[md5]");
		
		if (target.querySelectorAll)
			Array.prototype.forEach.call(target.querySelectorAll("td.reply, div.op"), function(elem) {
				var id = parseInt(elem.getAttribute("id"));
				var postDate;
				var datetime;
				var img;
				
				if (img = elem.querySelector("img[md5]"))
					postDate = img.getAttribute("src").match(/\d{13}/)[0]);
				else if (datetime = elem.querySelectorAll("span.datetime"))
				{
					var m = datetime.textContent.match(/(\d+)\/(\d+)\/(\d+)\(\w+\)(\d+):(\d+)/);
					postDate = new Date(m[3]*0 + 2000, m[1], m[2], m[5], m[6]).getTime();
					postDate += 3600 * chanOffset;
				}
				else
					postDate = prevDate + 1;
				
				prevDate = postDate;
				
				if (!postsSparse[id])
					posts.push(postsSparse[id] = {
						date: postDate,
						id: id,
					});
			});
		
		if (posts.length)
			opId = posts[0];
		
		threadPosts.data = String(posts.length).replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
			" (" + (posts.length / (posts[posts.length - 1] - opId) * 100).toFixed(2) + "%)";
		boardPosts.data = String(posts[posts.length - 1] - opId).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		
		if (!appended && document.getElementById("footer"))
		{
			document.getElementById("footer").appendChild(statistics);
			appended = true;
		}
	}
	
	function updateThreadAge()
	{
		var now = Date.now() - creationDate;
		threadPPM.data = (posts.length / (now / 60000)).toFixed(2);
		boardPPM.data = ((posts[posts.length - 1] - opId) / (now / 60000)).toFixed(2);
		
		var days = Math.floor(now / 86400000);
		var dayss = days == 1 ? "" : "s";
		now -= days * 86400000;
		var hours = Math.floor(now / 3600000);
		var hourss = hours == 1 ? "" : "s";
		now -= hours * 3600000;
		var minutes = Math.floor(now / 60000);
		var minutess = minutes == 1 ? "" : "s";
		now -= minutes * 60000;
		var seconds = Math.floor(now / 1000);
		var secondss = seconds == 1 ? "" : "s";
		var str;
		
		if (days)
			str = days + " day" + dayss + ", " + hours + " hour" + hourss + ", " + minutes + " minute" + minutess + " and " + seconds + " second" + secondss;
		else if (hours)
			str = hours + " hour" + hourss + ", " + minutes + " minute" + minutess + " and " + seconds + " second" + secondss;
		else if (minutes)
			str = minutes + " minute" + minutess + " and " + seconds + " second" + secondss;
		else
			str = seconds + " second" + secondss;
		
		threadAge.data = str;
	}
	
	setInterval(updateThreadAge, 1000);
	
	document.addEventListener("DOMContentLoaded", updatePosts.bind(this, document));
	document.addEventListener("DOMNodeInserted", function(e) {
		updatePosts(e.target);
	});
	
	updatePosts(document);
	updateThreadAge();
})();
