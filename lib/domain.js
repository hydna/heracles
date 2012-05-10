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

// 
// Domain configuration format:
// 
//  {
//     domains: {
//       "ericsson.com": {
//         "uuid": "asdsaasdsasad",
//         "hydna": "localhost:7010/32?dasdasas",
//         "database": "localhost:7012",
//         "secret": "dsasdsadsa"
//       }
//     }
//  }
// 
// 


var parse               = require("url").parse
var readFileSync        = require("fs").readFileSync;

var broadcast           = require("./hydna").broadcast;
var store               = require("./database").store;
var getAddress          = require("./database").getAddress;

var log                 = require("./log");


// Exported functions
exports.createDomains   = createDomains;


// Exported classes
exports.DomainStore     = DomainStore;
exports.Domain          = Domain;


function createDomains () {
  return new DomainStore();
}


function DomainStore () {
  this.domains = {};
}


DomainStore.prototype.source = function (path) {
  var domains = this.domains;
  var content;
  var graph;
  var domain;

  log.write("Sourcing domains from '%s'", path);

  content = readFileSync(path, "utf8");
  graph = JSON.parse(content);

  for (var k in domains) {
    if (k in graph.domains == false) {
      domains[k].destroyed = true;
      delete domains[k];
    }
  }

  for (var k in graph.domains) {

    if (k in domains) {
      domain = domains[k];
    } else {
      domain = new Domain(k);
      domains[k] = domain;
    }

    domain.source(graph.domains[k]);
  }
};


DomainStore.prototype.getDomain = function (referer, uuid) {
  var domains = this.domains;
  var domain;
  var address;

  if (!referer || !uuid) {
    return null;
  }

  log.debug("Searching for domain '%s'", uuid);

  if ((domain = domains[uuid]) == void(0)) {
    return null;
  }

  if (domain.matchReferer(referer) == false) {
    return null;
  }

  return domain;
};



function Domain (uuid) {
  this.uuid = uuid;
  this.name = null;
  this.database = null;
  this.hydna = null;
  this.secret = null;
  this.destroyed = false;
}


Domain.prototype.source = function(graph) {
  this.name = graph.name;

  this.match = buildPattersRegExp(graph.patterns || ["*"]);

  this.hydna = graph.hydna;
  this.secret = graph.secret;

  this.database = getAddress(graph.database);

  !this.database && log.write("Datbase disabled for %s", this.uuid);
};


Domain.prototype.dispatch = function(event, ctx) {

  if (this.destroyed) {
    return;
  }

  ctx.op = event;
  ctx.name = this.name;
  ctx.uuid = this.uuid;

  broadcast(this.hydna, ctx);
  store(this.database, ctx);
};


Domain.prototype.matchReferer = function (referer) {
  return this.match && this.match.test(referer) || false;
};


function buildPattersRegExp (patterns) {
  var result = [];
  result = patterns.map(function (pattern) {
    return "^" + pattern.replace(/\//g, "\\/")
                        .replace(/\./g, "\\.")
                        .replace(/\*/g, ".*");
  });
  return new RegExp(result.join("|"));
}