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

var parse               = require("url").parse

var broadcast           = require("./hydna").broadcast;
var store               = require("./database").store;


// Exported functions
exports.init            = init;
exports.destroy         = destroy;
exports.lookup          = lookup;


// Exported variables
exports.available       = false;


// Internal variables
var debug               = false;
var verbose             = false;
var domains             = {};
var database            = null;



function init(config, C) {
  debug = config.debug;
  verbose = debug || config.verbose;

  if (config.geodb) {
    verbose && console.log("Loading GeoIP database from '%s'", config.geodb);
    try {
      database = new City(config.geodb);
    } catch (err) {
      return C(err);
    }
    exports.available = true;
  }

  return C();
}


function destroy(C) {
  domains = {};
  return C();
}


function lookup(address, C) {
  if (!exports.available) {
    return process.nextTick(function() {
      return C(null, {
        latitude: 0,
        longitude: 0
      });
    });
  }

  debug && console.log("GeoIP lookup for '%s'", address);

  database.lookup(address, C);
};