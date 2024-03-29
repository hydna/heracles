/*
 * Atlas.io Tracking Script v 1.0
 * Based on quirksmode (quirksmode.com) browser detection, owa
 * (openwebanalytics.com) tracking scripts and swfobject flash and
 * quicktime detection based on (swfobject)
 */

(function() {
  var userAgent = navigator.userAgent;
  var unloaded = false;
  var sessionid;
  var lastvisited;
  var trackerurl;
  var info = {};
  var startcommands;

  var SERVER = "tracker.atlas.io";
  var TENYEARS = 1000 * 60 * 60 * 24 * 365 * 10;
  var SESSION_ID = "__aioid";
  var VISIT_ID = "__aiov";
  var UUIDKEYS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
                 "abcdefghijklmnopqrstuvwxyz".split("");


  if (typeof atlasio != "undefined") {
    startcommands = atlasio;
  }

  var exports = window.atlasio = {};

  info.e = 1; // Extended? yes
  info.t = document.title || "Untitled";
  info.vw = window.screen.width;
  info.vh = window.screen.height;
  info.tz = (new Date()).getTimezoneOffset() / 60;

  // Find referrer
  try {
  	if (typeof parent !== "undefined" && parent.document.referrer != void(0)) {
  	   info.r = parent.document.referrer + "";
  	}
  } catch (e) {}

	if (info.r == "") {
  	try { info.r = document.referrer + ""; } catch (e) {}
	}

	if (info.r == "blockedReferrer") {
		info.r = "";
	}

  exports.init = function(id) {
    var protocol = document.location.protocol == "https:" && "https" || "http";

    if (!id || /^[a-f0-9]{8,8}\-[a-f0-9]{4,4}\-[a-f0-9]{4,4}\-[a-f0-9]{4,4}\-[a-f0-9]{12,12}$/.test(id) == false) {
      return;
    }

    if (sessionid = getcookie(SESSION_ID)) {
      lastvisited = parseInt(getcookie(VISIT_ID) || 0);
    } else {
      sessionid = uuid();
      lastvisited = 0;
    }

    trackerurl = protocol + "://" + SERVER + "/s/?_id=" + id;

    //feature to track time spent accurately
		if (typeof window.onbeforeunload == "function") {
			_onbeforeunload = window.onbeforeunload;
		}

		if (typeof window.onunload == "function") {
			_onunload = window.onunload;
		}

		window.onunload = window.onbeforeunload = onunload;
  };

  exports.push = function (args) {
    var name;
    if (!args.length || !args.shift) return;
    name = args.shift();
    try {
      exports[name].apply(exports, args);
    } catch (err) {}
  };

  exports.trackPageview = function() {
    track(info, true);
  };

  exports.trackEvent = function(data) {
    track({_a: data});
  };

  // uuid generation based on
	// Math.uuid.js (v1.4)
	// http://www.broofa.com
	function uuid(len, radix) {
    var chars = UUIDKEYS, uuid = [];
    radix = radix || chars.length;

    if (len) {
      // Compact form
      for (var i = 0; i < len; i++) uuid[i] = chars[0 | Math.random()*radix];
    } else {
      // rfc4122, version 4 form
      var r;

      // rfc4122 requires these characters
      uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
      uuid[14] = '4';

      // Fill in random data.  At i==19 set the high bits of clock sequence as
      // per rfc4122, sec. 4.1.5
      for (var i = 0; i < 36; i++) {
        if (!uuid[i]) {
          r = 0 | Math.random()*16;
          uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
        }
      }
    }

    return uuid.join('');
	}

	function getcookie(name) {
		var nameeq = name + "=";
		var ca = document.cookie.split(';');

		for(var i=0;i < ca.length;i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1,c.length);
			if (c.indexOf(nameeq) == 0) return c.substring(nameeq.length,c.length);
		}
		return '';
	}

	function setcookie(name, value, expires) {
	  var cookieval = name + "=" + value;
      var now = (Date.now?Date.now():(new Date()).valueOf());

      if (expires) {
        var date = new Date(now + expires);
        cookieval += "; expires=" + date.toGMTString();
      }

		document.cookie = cookieval + "; path=/";
	}



	function track(graph, useimg) {
	  var params = [];
	  var param;
	  var url;

	  if (!(url = trackerurl)) {
	    return;
	  }

    for (var param in graph) {
      params.push(param + "=" + escape(graph[param]));
    }

    if (params.length) {
      url += "&" + params.join("&");
    }

    url += "&_sid=" + sessionid + "&_vt=" + lastvisited;

	  if (useimg || userAgent.indexOf("MSIE") != -1) {
	    var img = new Image();
	    img.src = url;
	  } else if (userAgent.indexOf("WebKit") != -1 &&
	             "XMLHttpRequest" in window) {
			var request;
			request = new XMLHttpRequest();
			request.open("GET", url, true);
			request.send(null);
	  } else {
			var script = document.createElement('script');
			script.setAttribute('src', url);
            script.async = true;
			document.getElementsByTagName('head')[0].appendChild(script);
	  }

	  setcookie(SESSION_ID, sessionid, TENYEARS);
	  setcookie(VISIT_ID, (lastvisited = (new Date()).getTime()), TENYEARS);
	}

	function onunload() {
	  if (!unloaded) {
	    unloaded = true;
	    track({_d: 1});
	  }
	  if (typeof _onbeforeunload !== "undefined") {
	    try {
  	    _onbeforeunload();
	    } catch (e) {}
	    _onbeforeunload = null;
	  }
	  if (typeof _onunload !== "undefined") {
	    try {
  	    _onunload();
	    } catch (e) {}
	    _onunload = null;
	  }
	}


  if (startcommands && startcommands.length) {
    (function () {
      var cmd;
      var name;
      for (var i = 0; i < startcommands.length; i++) {
        cmd = startcommands[i];
        name = cmd.shift();
        try {
          exports[name].apply(exports, cmd);
        } catch (err) {
        }
      }
    })();
  }
})();
