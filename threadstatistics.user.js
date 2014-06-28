// ==UserScript==
// @name        4chan thread statistics
// @version     3.0
// @namespace   anon.4chan.org
// @description Adds thread statistics.
// @include     http://boards.4chan.org/*/thread/*
// @include     https://boards.4chan.org/*/thread/*
// @run-at      document-start
// ==/UserScript==

(function() {
	"use strict";
	
	function formatNumber(num)
	{
		return String(num).replace(/\B(?=(?:\d{3})+(?!\d))/g, " ");
	}
	
	function formatTime(time)
	{
		var days = Math.floor(time / 86400000),
			daysS = days == 1 ? "" : "s";
		
		var hours = Math.floor((time -= days * 86400000) / 3600000),
			hoursS = hours == 1 ? "" : "s";
		
		var minutes = Math.floor((time -= hours * 3600000) / 60000),
			minutesS = minutes == 1 ? "" : "s";
		
		var seconds = Math.floor((time -= minutes * 60000) / 1000),
			secondsS = seconds == 1 ? "" : "s";
		
		if (days)
			return days + " day" + daysS + ", " + hours + " hour" + hoursS + ", " + minutes + " minute" + minutesS + " and " + seconds + " second" + secondsS;
		else if (hours)
			return hours + " hour" + hoursS + ", " + minutes + " minute" + minutesS + " and " + seconds + " second" + secondsS;
		else if (minutes)
			return minutes + " minute" + minutesS + " and " + seconds + " second" + secondsS;
		else
			return seconds + " second" + secondsS;
	}
	
	var posts = [],
		postsSparse = [],
		op, last, last10,
		appended = false,
		board = document.location.href.match(/^https?:\/\/boards.4chan.org(\/[^\/]+\/)/)[1];
	
	var statistics = document.createElement("div");
	statistics.className = "threadstatisticstext";
	statistics.setAttribute("style", "text-align:  center; font-size: xx-small; padding-bottom: 4px;");
	
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
	
	var boardPosts = makeLabel("Posts in " + board),
		boardPosts10 = makeLabel("last 10 mins");
	statistics.appendChild(document.createElement("br"));
	
	var threadPosts = makeLabel("Posts in thread"),
		threadPosts10 = makeLabel("last 10 mins");
	statistics.appendChild(document.createElement("br"));
	
	var boardPPM = makeLabel(board + " posts per min"),
		boardPPM10 = makeLabel("last 10 mins");
	statistics.appendChild(document.createElement("br"));
	
	var threadPPM = makeLabel("Thread posts per min"),
		threadPPM10 = makeLabel("last 10 mins");
	statistics.appendChild(document.createElement("br"));
	
	var csv = document.createElement("a"),
		csvData = "data:text/plain,ID,Date";
	csv.setAttribute("href", csvData);
	csv.setAttribute("target", "_blank");
	csv.appendChild(document.createTextNode("csv"));
	statistics.appendChild(csv);
	
	function updatePosts(target)
	{
		var newPosts = false;
		
		if (!target.querySelectorAll)
			return;
		
		for (var i = 0, query = target.querySelectorAll("div.thread > div.postContainer > div.post > div.postInfo[id^=pi] > span.dateTime[data-utc]"),
			length = query.length, elem; i < length && (elem = query[i]); i ++)
		{
			var id = Number(elem.parentNode.getAttribute("id").substr(2)),
				time = Number(elem.getAttribute("data-utc")) * 1000;
			
			if (id && time && !postsSparse[id])
			{
				newPosts = true;
				
				posts.push(postsSparse[id] = {
					id: id,
					time: time,
					seq: posts.length,
				});
				
				csvData += "%0d%0a" + id + "," + time;
			}
		}
		
		if (newPosts)
		{
			csv.setAttribute("href", csvData);
			
			op = posts[0];
			last = posts[posts.length - 1];
			
			if (last == op)
			{
				threadPosts.data = "1 (?%)";
				boardPosts.data = "?";
				threadPPM.data = "?";
				boardPPM.data = "?";
			}
			else
			{
				var dTime = last.time - op.time;
				var dId = last.id - op.id;
				
				threadPosts.data = formatNumber(posts.length) + " (" + (posts.length / dId * 100).toFixed(2) + "%)";
				boardPosts.data = formatNumber(dId);
				boardPPM.data = (dId / (dTime / 60000)).toFixed(2);
			}
			
			updateLast10();
			
			if (!appended && document.querySelector("div#bottom"))
			{
				appended = true;
				
				var bottom = document.querySelector("div#bottom");
				bottom.parentNode.insertBefore(statistics, bottom);
				
				updateThreadAge();
				setInterval(updateThreadAge, 1000);
				setInterval(updateLast10, 10000);
			}
		}
	}
	
	function updateThreadAge()
	{
		var dTime = Math.max(Date.now() - op.time, 0);
		
		threadAge.data = formatTime(dTime);
		
		if (last != op)
			threadPPM.data = (posts.length / (dTime / 60000)).toFixed(2);
		
		if (last10)
			threadPPM10.data = ((posts.length - last10.seq) / Math.min(dTime / 60000, 10)).toFixed(2);
	}
	
	function updateLast10()
	{
		var now = Math.max(Date.now(), last ? last.time : 0);
		last10 = null;
		
		for (var i = 0, max = posts.length; i < max; i ++)
			if (now - posts[i].time <= 600000)
			{
				last10 = posts[i];
				break;
			}
		
		if (!last10)
		{
			threadPosts10.data = "0 (0%)";
			boardPosts10.data = "?";
			threadPPM10.data = "0";
			boardPPM10.data = "?";
		}
		else if (last10 == last == op)
		{
			threadPosts10.data = "1 (?%)";
			boardPosts10.data = "?";
			threadPPM10.data = "?";
			boardPPM10.data = "?";
			
			last10 = null;
		}
		else if (last10 == last)
		{
			threadPosts10.data = "1 (?%)";
			boardPosts10.data = "?";
			threadPPM10.data = "0.10";
			boardPPM10.data = "?";
			
			last10 = null;
		}
		else
		{
			var dTime = last.time - last10.time;
			var dId = last.id - last10.id;
			var dSeq = posts.length - last10.seq;
			
			threadPosts10.data = formatNumber(dSeq) + " (" + (dSeq / dId * 100).toFixed(2) + "%)";
			boardPosts10.data = formatNumber(dId);
			boardPPM10.data = (dId / (dTime / 60000)).toFixed(2);
		}
	}
	
	document.addEventListener("DOMContentLoaded", updatePosts.bind(this, document));
	document.addEventListener("DOMNodeInserted", function(e) {
		updatePosts(e.target);
	});
	
	updatePosts(document);
})();
