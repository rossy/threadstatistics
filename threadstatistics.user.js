// ==UserScript==
// @name        4chan thread statistics
// @version     2.1
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
		if (2 < month && month < 10)
			return true;
		
		var sunday = date - day;
		
		if (month == 2)
		{
			if (sunday < 8)
				return false;
			if (sunday < 15 && day == 0)
			{
				if (hours < 7)
					return false;
				return true;
			}
			return true;
		}
		
		if (sunday < 1)
			return true;
		
		if (sunday < 8 && day == 0)
		{
			if (hours < 6)
				return true;
			return false;
		}
		return false;
	}
	
	function formatNum(num)
	{
		return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}
	
	function formatTime(time)
	{
		var days = Math.floor(time / 86400000);
		var dayss = days == 1 ? "" : "s";
		time -= days * 86400000;
		var hours = Math.floor(time / 3600000);
		var hourss = hours == 1 ? "" : "s";
		time -= hours * 3600000;
		var minutes = Math.floor(time / 60000);
		var minutess = minutes == 1 ? "" : "s";
		time -= minutes * 60000;
		var seconds = Math.floor(time / 1000);
		var secondss = seconds == 1 ? "" : "s";
		
		if (days)
			return days + " day" + dayss + ", " + hours + " hour" + hourss + ", " + minutes + " minute" + minutess + " and " + seconds + " second" + secondss;
		else if (hours)
			return hours + " hour" + hourss + ", " + minutes + " minute" + minutess + " and " + seconds + " second" + secondss;
		else if (minutes)
			return minutes + " minute" + minutess + " and " + seconds + " second" + secondss;
		else
			return seconds + " second" + secondss;
	}
	
	var posts = [];
	var postsSparse = [];
	
	var statistics = document.createElement("div");
	
	var chanOffset = 5 - new Date().getTimezoneOffset() / 60 - (isDST() ? 1 : 0);
	
	var op;
	var last10;
	var last;
	var board = document.location.href.match(/^https?:\/\/boards.4chan.org(\/[^\/]+\/)/)[1];
	var appended = false;
	var prevDate = 0;
	
	statistics.style.textAlign = "center";
	statistics.style.fontSize = "7pt";
	
	function makeLabel(title)
	{
		var b = document.createElement("b");
		var text = document.createTextNode("");
		b.appendChild(document.createTextNode(" " + title + ": "));
		statistics.appendChild(b);
		statistics.appendChild(text);
		
		return text;
	}
	
	var threadAge = makeLabel("Thread age");
	statistics.appendChild(document.createElement("br"));
	var boardPosts = makeLabel("Posts in " + board);
	var boardPosts10 = makeLabel("last 10 mins");
	statistics.appendChild(document.createElement("br"));
	var threadPosts = makeLabel("Posts in thread");
	var threadPosts10 = makeLabel("last 10 mins");
	statistics.appendChild(document.createElement("br"));
	var boardPPM = makeLabel(board + " posts per min");
	var boardPPM10 = makeLabel("last 10 mins");
	statistics.appendChild(document.createElement("br"));
	var threadPPM = makeLabel("Thread posts per min");
	var threadPPM10 = makeLabel("last 10 mins");
	statistics.appendChild(document.createElement("br"));
	
	var csv = document.createElement("a");
	var csvData = "data:text/plain,ID,Date";
	csv.setAttribute("href", csvData);
	csv.setAttribute("target", "_blank");
	csv.appendChild(document.createTextNode("csv"));
	statistics.appendChild(csv);
	
	function updatePosts(target)
	{
		if (!target.querySelectorAll)
			return;
		
		var newPosts = false;
		
		Array.prototype.forEach.call(target.querySelectorAll("td.reply, div.op"), function(elem) {
			newPosts = true;
			
			var id = elem.getAttribute("id");
			var postDate;
			var time;
			var img;
			
			if (!id || isNaN(id = parseInt(id)) || postsSparse[id])
				return;
			
			if (img = elem.querySelector("img[md5]"))
				postDate = img.parentNode.getAttribute("href").match(/\d{13}/)[0]*1;
			else if ((time = elem.querySelector("time")) && time.hasAttribute("datetime"))
				postDate = new Date(time.getAttribute("datetime")).getTime();
			else if (time = elem.querySelector("span.posttime"))
			{
				var m = time.textContent.match(/(\d+)\/(\d+)\/(\d+)\(\w+\)(\d+):(\d+)/);
				postDate = new Date(m[3]*1 + 2000, m[1]*1 - 1, m[2], m[4], m[5], 0).getTime();
				postDate += 3600000 * chanOffset;
			}
			else
				postDate = prevDate + 1;
			
			if (postDate <= prevDate)
				postDate = prevDate + 1;
			
			prevDate = postDate;
			
			posts.push(postsSparse[id] = {
				date: postDate,
				seq: posts.length,
				id: id,
			});
			
			csvData += "%0d%0a" + id + "," + postDate;
			csv.setAttribute("href", csvData);
		});
		
		if (newPosts)
		{
			op = posts[0];
			last = posts[posts.length - 1];
			
			var now = last.date - op.date;
			
			threadPosts.data = formatNum(posts.length) + " (" + (posts.length / (last.id - op.id) * 100).toFixed(2) + "%)";
			boardPosts.data = formatNum(last.id - op.id);
			boardPPM.data = ((last.id - op.id) / (now / 60000)).toFixed(2);
			
			updateLast10();
			
			if (!appended && document.getElementById("footer"))
			{
				appended = true;
				
				document.getElementById("footer").parentNode.appendChild(document.createElement("br"));
				document.getElementById("footer").parentNode.appendChild(statistics);
				
				updateThreadAge();
				setInterval(updateThreadAge, 1000);
			}
		}
	}
	
	function updateThreadAge()
	{
		var now = Date.now() - op.date;
		threadAge.data = formatTime(now);
		
		threadPPM.data = (posts.length / (now / 60000)).toFixed(2);
		
		if (last10)
			threadPPM10.data = ((posts.length - last10.seq) / Math.min(now / 60000, 10)).toFixed(2);
	}
	
	function updateLast10()
	{
		var now = Date.now();
		last10 = null;
		
		for (var i = 0; i < posts.length; i ++)
			if (now - posts[i].date <= 600000)
			{
				last10 = posts[i];
				break;
			}
		
		if (last10)
		{
			now -= last10.date;
			
			threadPosts10.data = formatNum(posts.length - last10.seq) + " (" + ((posts.length - last10.seq) / (last.id - last10.id) * 100).toFixed(2) + "%)";
			boardPosts10.data = formatNum(last.id - last10.id);
			boardPPM10.data = ((last.id - last10.id) / (now / 60000)).toFixed(2);
		}
		else
		{
			threadPosts10.data = "0 (0%)";
			boardPosts10.data = "?";
			threadPPM10.data = "0";
			boardPPM10.data = "?";
		}
	}
	
	document.addEventListener("DOMContentLoaded", updatePosts.bind(this, document));
	document.addEventListener("DOMNodeInserted", function(e) {
		updatePosts(e.target);
	});
	
	updatePosts(document);
})();
