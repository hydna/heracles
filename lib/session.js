//
//        Copyright 2011 Hydna AB. All rights reserved.
//
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions
//  are met:
//
//    1. Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//
//    2. Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//
//  THIS SOFTWARE IS PROVIDED BY HYDNA AB ``AS IS'' AND ANY EXPRESS OR IMPLIED
//  WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
//  MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
//  EVENT SHALL HYDNA AB OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
//  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF
//  USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
//  ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
//  TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE
//  USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//  The views and conclusions contained in the software and documentation are
//  those of the authors and should not be interpreted as representing
//  official policies, either expressed or implied, of Hydna AB.
//

var createHash          = require("crypto").createHash;
var parse               = require("url").parse;
var enroll              = require("timers").enroll;
var unenroll            = require("timers").unenroll;
var active              = require("timers").active;

var parse               = require("ua-parser").parse;

var geoip               = require("./geoip");

// Exported functions
exports.init            = init;
exports.destroy         = destroy;
exports.getSession      = getSession;


// Exported classes
exports.Session         = Session;


// Internal constants
var VISIT_TIMEOUT       = 20 * 60000; // 20 min

var SESSIONID_LENGTH    = 20;
var HMACHASH_LENGTH     = 40;

var TENYEARS            = 1000 * 60 * 60 * 24 * 365 * 10;


// Internal variables
var debug               = false;
var verbose             = false;
var serverid            = null;
var sessionCache        = {};


function init(config, C) {

  debug = config.debug;
  verbose = debug || config.verbose;

  serverid = config.id || 1;

  return C();
}


function destroy(C) {
  return C();
}


function getSession(domain, req, query, C) {
  var headers = req.headers;
  var cookie = headers.cookie;
  var session;
  var parts;
  var part;
  var index;
  var sinfo;

  if (query._sid && "_vt" in query) {
    if ((session = sessionCache[query._sid]) == void(0)) {
      session = new Session(query._sid,
                            query._vt,
                            domain,
                            query,
                            headers);
      sessionCache[session.sid] = session;
    } else {
      session.lastvisit = query._vt;
    }
  } else if (!cookie || cookie.indexOf(domain.uuid) == -1) {
    session = new Session(generateSid(),
                         0,
                         domain,
                         query,
                         headers);
    sessionCache[session.sid] = session;
  } else {
    parts = cookie.split(/\s*;\s*/g);
    index = parts.length;

    while (index--) {
      part = parts[index].split("=");

      if (part[0] == domain.uuid) {
        sinfo = extractcookie(domain, part[1]);

        if (!sinfo) {
          break;
        }

        if ((session = sessionCache[sinfo.id]) == void(0)) {
          session = new Session(sinfo.id,
                                sinfo.lastvisit,
                                domain,
                                query,
                                headers);
          sessionCache[session.sid] = session;
        } else {
          session.lastvisit = parseInt(sinfo.lastvisit);
        }
        break;
      }
    }
  }

  return session;
}


function generateSid() {
  return padhex(this.id, 4) + padhex(Date.now(), 16);
}


function extractcookie(domain, cookie) {
  var signature = cookie.slice(0, HMACHASH_LENGTH);
  var encdata = cookie.slice(HMACHASH_LENGTH);
  var secret = domain.secretkey;
  var decipher;
  var data;

  if (signature == hmachash(secret, encdata + domain.uuid)) {
    decipher = createDecipher("aes192", secret);
    data = decipher.update(encdata, "hex", "utf8") + decipher.final("utf8");
    return { id: data.slice(0, SESSIONID_LENGTH)
           , lastvisit: parseInt(data.slice(SESSIONID_LENGTH))
           };
  }

  return null;
}


function hmachash(secret, data) {
  var hmac = createHmac('sha1', secret);
  hmac.update(data);
  return hmac.digest('hex');
};


function padhex(value, size) {
  var result = value.toString(16);

  while (result.length < size) {
    result = "0" + result;
  }

  return result;
}


/**
 *  ## Session(id)
 *
 *  Represents a Session class.
 *
 *  Fields:
 *  - key : 12345 // tracker id
 *  - sid : D95B9F1F-4F36-433A-A72E-23931947DE70 // session id
 *  - sidi : 1 // session index count
 *  - d  : skaggivara.com // domain
 *  - t : Page Title // page title
 *  - u : /demo/tracker/ // suburl
 *  - uf : skaggivara.com/demo/tracker/ // full url
 *  - r : google.com // referrel domain
 *  - rf : google.com/search?q=robert+maldon&start=0&amp;ie=utf-8&oe=utf-8&client=firefox-a&rls=org.mozilla:en-US:official // full referral
 *  - o : Mac // platform
 *  - n : Safari // browser
 *  - nv : 5 // browser major version
 *  - se : google // search engine (from referral)
 *  - sk : robert maldon // search words
 *  - vx : 2560 // system screen width
 *  - vy : 1440 // system screen height
 *  - rx : 1331 // browser viewport width
 *  - ry : 892 // browser viewport height
 *  - pf : 1 // flash plugin installed 1 installed, 0 not installed
 *  - pfv : 10,1,102 // flash plugin version number
 *  - pq : 1 // quicktime installed
 *  - l : en-us // language
 *  - tz : -1 // timezone
 *  - uq : 1 // unique visitor?
 *  - rn : 2326356 // random number, no cache
 *  - re : 3 // return visit
 *  - vt : 0 // visit time
 */
function Session(id, lastvisit, domain, query, headers) {
  var hash;

  this._headers = headers;
  this._query = query;

  hash = createHash("sha1");
  hash.update(domain.uuid + id);

  this.sid = hash.digest("hex");
  this.id = id;
  this.domain = domain;
  this.weight = 1;
  this.lastvisit = parseInt(lastvisit);

  this.serversession = id.indexOf("-") == -1;

  // Header specific fields
  this.browserType = null;
  this.browserVersion = null;
  this.language = null;
  this.platform = null;

  // Field that we get from query string
  this.timezone = null;
  this.screenWidth = null;
  this.screenHeight = null;

  // Geo-location specific fields
  this.lng = 0;
  this.lat = 0;
  this.city = "unknown";
  this.country = "unknown";

  this.destroyed = false;

  enroll(this, VISIT_TIMEOUT);
};


Session.prototype.ontimeout = function() {
  this.destroy();
};


Session.prototype.init = function(address, referer, C) {
  var self = this;

  debug && console.log("Session.init %s %s", this.id, referer);

  this.genereateExtendedInfo(address, function() {
    self.domain.dispatch("new", {
      referrer: referer,
      lastvisit: self.lastvisit,
      lng: self.lng,
      lat: self.lat,
      city: self.city,
      country: self.country,
      tz: self.timezone,
      sw: self.screenWidth,
      sh: self.screenHeight,
      sid: self.sid
    });
  });

  active(this);
};


Session.prototype.destroy = function() {

  if (this.destroyed) {
    return;
  }

  debug && console.log("Destroying session %s", this.sid);

  this.destroyed = true;

  unenroll(this);

  delete sessionCache[this.sid];
};


Session.prototype.heartbeat = function(address, referer, C) {
  var self = this;

  debug && console.log("Session.heartbeat %s %s", this.id, referer);

  this.genereateExtendedInfo(address, function() {
    self.domain.dispatch("hb", {
      referrer: referer,
      lastvisit: self.lastvisit,
      lng: self.lng,
      lat: self.lat,
      city: self.city,
      country: self.country,
      tz: self.timezone,
      sw: self.screenWidth,
      sh: self.screenHeight,
      sid: self.sid
    });
  });

  active(this);
};


Session.prototype.navigateTo = function(url, referer, title) {

  debug && console.log("Session.navigateTo %s %s %s", this.id, url, referer);

  this.domain.dispatch("pv", {
    url: url,
    t: title,
    r: referer,
    sid: this.sid
  });
};


Session.prototype.navigateFrom = function() {

  debug && console.log("Session.navigateFrom %s", this.id);

  this.domain.dispatch("de", {
    sid: this.sid
  });
};


Session.prototype.dispatch = function(url, data) {

  debug && console.log("Session.dispatch %s %s %s", this.id, url, data);

  this.domain.dispatch("ue", {
    url: url,
    sid: this.sid,
    data: data
  });
};


Session.prototype.genereateExtendedInfo = function(address, C) {
  var self = this;
  var headers = this._headers;
  var query = this._query;
  var agent;
  var key;
  var keys;
  var index;
  var m;

  if (!headers) {
    return;
  }

  this._headers = null;
  this._query = null;

  this.timezone = parseInt(query["tz"]) || null;

  this.screenWidth = parseInt(query["vw"] || 0);
  this.screenHeight = parseInt(query["vh"] || 0);

  this.screenWidth = isNaN(this.screenWidth) ? 0 : this.screenWidth;
  this.screenHeight = isNaN(this.screenHeight) ? 0 : this.screenHeight;

  this.language = headers["accept-language"] || null;

  if (headers["user-agent"]) {
    agent = parse(headers["user-agent"]);
    this.browserType = agent.family;
    this.browserVersion = agent.toVersionString();
    this.platform = agent.os;
  }

  if (geoip.available == false) {
    return process.nextTick(C);
  }

  geoip.lookup(address, function(err, res) {
    if (!err && res) {
      self.lat = res.latitude;
      self.lng = res.longitude;
      self.city = res.city || "unknown";
      self.country = res.country || "unknown";
    }
    return C();
  });

};


Session.prototype.updateTimestamp = function() {
  this.lastvisit = Date.now();
  active(this);
};


Session.prototype.getCookieString = function() {
  var domain = this.domain;
  var domainid = this.domain.uuid;
  var secret = this.domain.secret;
  var chipher = createCipher("aes192", secret);
  var result = [domainid, "="];
  var data = this.id + this.lastvisit;
  var encdata = chipher.update(data, "utf8", "hex") + chipher.final("hex");

  result.push(hmachash(secret, encdata + domainid));
  result.push(encdata);
  result.push("; expires=" + (new Date(Date.now() + TENYEARS)).toUTCString());
  result.push("; path=/");

  return result.join("");
};