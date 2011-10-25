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




exports.createParser = function(switches, banner) {
  var optionParser;
  var rules;

  rules = buildRules(switches);

  optionParser = new OptionParser(rules);
  optionParser.banner = banner || null;

  return optionParser;
};



// Buildes rules from a switches collection. The switches collection
// is defined when constructing a new OptionParser object. 
function buildRules(switches) {
  return switches.map(function(s) {
    if (s.length > 3) throw new Error("bad switch");
    return (s.length == 3 && buildRule(s[0], s[1], s[2])) ||
           (s.length == 2 && buildRule(null, s[0], s[1])) ||
           (s.length == 1 && buildRule(null, s[0], "no description")) ||
           null;
  });
}



function buildRule(short, long, desc) {
  var optional;
  var list;
  var arg;
  var expr;

  arg = /(?:=\[(.+)\])|(?:=(.+))/.exec(long);

  if (arg) {
    optional = arg[1] ? true : false;
    arg = arg && arg[1] || arg[2];
    list = arg[arg.length - 1] == "*" ? true : false;
    list && (arg = arg.substr(arg.length - 2));
  }

  long = /(--\w[\w\-]+)/.exec(long)[1];

  expr = long;
  arg && (expr += "=");
  arg && optional && (expr += "[" + arg + (list ? "*" : "") + "]");
  arg && !optional && (expr += arg + (list ? "*" : ""));

  return {
    name: long.substr(2),
    short: short,
    long: long,
    arg: arg,
    list: list,
    optional: optional,
    desc: desc,
    expr: expr
  }
}



function spaces(arg1, arg2) {
  var l, builder = [];
  if(arg1.constructor === Number) {
    l = arg1;
  } else {
    if(arg1.length == arg2) return arg1;
    l = arg2 - arg1.length;
    builder.push(arg1);
  }
  while(l-- > 0) builder.push(' ');
  return builder.join('');
}



function OptionParser(rules) {
  this._rules = rules;
  this.args = [];
  this.extras = {};
  this.banner = null;
}



OptionParser.prototype.parse = function(argv) {
  var index = argv.length;
  var rules = this._rules;
  var opts = {};
  var didmatch;
  var rule;
  var arg;
  var match;
  var opt;

  while (index--) {
    arg = argv[index];
    match = /^(\-([\-\w\.]+))(?:=(.+))|^(\-([\.\-\w]+))/.exec(arg);

    if (match == null) {
      this.args.unshift(arg);
      continue;
    }

    opt = match[1] || match[4];
    didmatch = false;

    for (var i = 0, l = rules.length; i < l; i++) {
      rule = rules[i];
      if (rule.long == opt || rule.short == opt) {
        if (rule.arg) {
          if (!rule.optional && !match[3]) {
            throw new Error("expected argument for " + opt);
          }
          if (rule.list) {
            opts[rule.name] = opts[rule.name] || [];
            opts[rule.name].push(match[3]);
          } else {
            opts[rule.name] = match[3] || true;
          }
        } else {
          if (match[3]) {
            throw new Error("expected no argument for " + opt);
          }
          opts[rule.name] = true;
        }
        didmatch = true;
        break;
      }
    }

    if (!didmatch) {
      if (/^-x-/.test(match[5] || match[2])) {
        if (match[1]) {
          this.extras[match[2].substr(3)] = match[3];
        } else if (match[4]) {
          this.extras[match[5].substr(3)] = true;
        }
      } else {
        throw new Error("bad option " + (match[4] || match[1]));
      }
    }
  }

  return opts;
};



OptionParser.prototype.help = function() {
  var builder = [this.banner, '', "Available options:"];
  var rules = this._rules;
  var shorts = false;
  var longest = 0;
  var rule;

  for (var i = 0; i < rules.length; i++) {
    rule = rules[i];
    if (rule.short) shorts = true;
    if (rule.expr.length > longest) longest = rule.expr.length;
  }

  for(var i = 0; i < rules.length; i++) {
    var text = "";
    rule = rules[i];

    if (shorts) {
      if(rule.short) text = spaces(2) + rule.short + ', ';
      else text = spaces(6);
    }

    text += spaces(rule.expr, longest) + spaces(3);
    text += rule.desc;

    builder.push(text);
  }

  return builder.join('\n');
};
