(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],3:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require("/home/omar/thesis/flownix/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))
},{"/home/omar/thesis/flownix/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":2}],4:[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Graph = (function () {
    function Graph(components, connections, firstMainComponent, counter) {
        if (typeof components === "undefined") { components = []; }
        if (typeof connections === "undefined") { connections = []; }
        if (typeof firstMainComponent === "undefined") { firstMainComponent = null; }
        if (typeof counter === "undefined") { counter = 0; }
        this.components = components;
        this.connections = connections;
        this.firstMainComponent = firstMainComponent;
        this.counter = counter;
    }
    /**
    transforms to JSON, JSON.stringify() will
    call this function if it exists
    */
    Graph.prototype.toJSON = function () {
        return {
            components: this.components,
            connections: this.connections
        };
    };

    /**
    in graph
    */
    Graph.prototype.containsComponent = function (component) {
        for (var i = 0, _ref = this.components, length = _ref.length; i < length; ++i) {
            if (_ref[i] == component) {
                return true;
            }
        }
        return false;
    };

    /**
    removes the component of the graph and returns the connections related to it
    */
    Graph.prototype.removeComponent = function (component) {
        if (this.containsComponent(component)) {
            if (component == this.firstMainComponent) {
                this.firstMainComponent = null;
            }
            var returnlist = [];
            var filteredlist = [];
            for (var i = 0, _ref = this.connections, length = _ref.length; i < length; ++i) {
                var connection = _ref[i];
                if (connection.startComponent == component || connection.endComponent == component) {
                    returnlist.push(connection);
                } else {
                    filteredlist.push(connection);
                }
            }

            this.components.splice(this.components.indexOf(component), 1);
            this.connections = filteredlist;
            return returnlist;
        }
        return null;
    };

    Graph.prototype.connect = function (startComponent, outputPort, endComponent, inputPort) {
        var connection = new Connection(startComponent, outputPort, endComponent, inputPort);
        this.connections.push(connection);
    };

    /*
    expands with other graph
    */
    Graph.prototype.expand = function (other) {
        this.concatComponents(other.components);
        this.concatConnections(other.connections);
        //if(this.counter){
        //  other.components.forEach(component => {
        //    component.id = this.counter++;
        //  });
        //}
    };

    Graph.prototype.concatComponents = function (components) {
        this.components = this.components.concat(components);
    };
    Graph.prototype.concatConnections = function (connections) {
        this.connections = this.connections.concat(connections);
    };
    return Graph;
})();
exports.Graph = Graph;

var IndexedGraph = (function () {
    function IndexedGraph(graph) {
        this.components = {};
        this.inputConnections = {};
        this.outputConnections = {};
        var components = this.components;
        var outputConnections = this.outputConnections;
        var inputConnections = this.inputConnections;

        graph.components.forEach(function (component) {
            components[component.id] = component;
        });
        graph.connections.forEach(function (connection) {
            outputConnections[connection.startNode] = connection;
            inputConnections[connection.endNode] = connection;
        });
    }
    return IndexedGraph;
})();
exports.IndexedGraph = IndexedGraph;

var Macro = (function (_super) {
    __extends(Macro, _super);
    function Macro(name, description) {
        _super.call(this);
        this.name = name;
        this.description = description;
    }
    Macro.fromGraph = function (name, description, graphData) {
        var newmacro = new Macro(name, description);
        newmacro.components = graphData.components;
        newmacro.connections = graphData.connections;
        return newmacro;
    };
    return Macro;
})(Graph);
exports.Macro = Macro;

//============= COMPONENTS ===========
var Component = (function () {
    function Component() {
        this.position = { x: 0, y: 0 };
        this.id = 0;
    }
    Component.type = "abrstract component";
    return Component;
})();
exports.Component = Component;

/**
A command component
*/
var CommandComponent = (function (_super) {
    __extends(CommandComponent, _super);
    function CommandComponent() {
        _super.apply(this, arguments);
        this.type = CommandComponent.type;
        this.exec = null;
    }
    CommandComponent.type = "command";
    return CommandComponent;
})(Component);
exports.CommandComponent = CommandComponent;

/**
A file component
*/
var FileComponent = (function (_super) {
    __extends(FileComponent, _super);
    function FileComponent(filename) {
        _super.call(this);
        this.type = FileComponent.type;
        this.filename = filename;
    }
    FileComponent.type = "file";
    return FileComponent;
})(Component);
exports.FileComponent = FileComponent;

/**
A macro Component
*/
var GraphComponent = (function (_super) {
    __extends(GraphComponent, _super);
    function GraphComponent(name, description) {
        _super.call(this);
        this.name = name;
        this.description = description;
        this.type = GraphComponent.type;
        this.entryComponent = null;
        this.exitComponent = null;
        this.counter = 0;
        this.components = [];
        this.connections = [];
    }
    GraphComponent.prototype.setGraphData = function (graphData) {
        this.components = graphData.components;
        this.connections = graphData.connections;
        this.entryComponent = graphData.firstMainComponent;
    };
    GraphComponent.type = "graph";
    return GraphComponent;
})(Component);
exports.GraphComponent = GraphComponent;

/**
A macro Component
*/
var MacroComponent = (function (_super) {
    __extends(MacroComponent, _super);
    function MacroComponent(macro) {
        _super.call(this);
        this.macro = macro;
        this.type = MacroComponent.type;
    }
    MacroComponent.type = "macro";
    return MacroComponent;
})(Component);
exports.MacroComponent = MacroComponent;

//========   ==========
var Connection = (function () {
    function Connection(startComponent, startPort, endComponent, endPort) {
        this.startComponent = startComponent;
        this.startPort = startPort;
        this.endComponent = endComponent;
        this.endPort = endPort;
    }
    Object.defineProperty(Connection.prototype, "startNode", {
        get: function () {
            return this.startComponent.id;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Connection.prototype, "endNode", {
        get: function () {
            return this.endComponent.id;
        },
        enumerable: true,
        configurable: true
    });

    Connection.prototype.toJSON = function () {
        return {
            startNode: this.startNode,
            startPort: this.startPort,
            endNode: this.endComponent.id,
            endPort: this.endPort
        };
    };
    return Connection;
})();
exports.Connection = Connection;

//========   ==========
var Boundary = (function () {
    function Boundary(left, rigth, top, bottom, components) {
        this.left = left;
        this.rigth = rigth;
        this.top = top;
        this.bottom = bottom;
        this.components = components;
    }
    Boundary.createFromXY = function (x, y, component) {
        var bottom;
        if (component.type === "file") {
            bottom = y + 100;
        } else {
            bottom = y + 350;
        }
        return new this(x, x, y, bottom, [component]);
    };

    Boundary.createFromPoint = function (point, component) {
        return this.createFromXY(point.x, point.y, component);
    };

    Boundary.createFromComponent = function (component) {
        return this.createFromPoint(component.position, component);
    };

    Boundary.createFromComponents = function (components) {
        if (components.length === 0) {
            return null;
        }
        var boundary = this.createFromComponent(components[0]);
        for (var i = 1, len = components.length; i < len; ++i) {
            boundary.extend(this.createFromComponent(components[i]));
        }
        return boundary;
    };

    Boundary.prototype.extend = function (boundary2) {
        this.left = Math.min(boundary2.left, this.left);
        this.rigth = Math.max(boundary2.rigth, this.rigth);
        this.top = Math.min(boundary2.top, this.top);
        this.bottom = Math.max(boundary2.bottom, this.bottom);
        this.components = this.components.concat(boundary2.components);
    };

    Boundary.translate = function (boundary, x, y) {
        boundary.left += x;
        boundary.rigth += x;
        boundary.top += y;
        boundary.bottom += y;
        boundary.components.forEach(function (component) {
            var position = component.position;
            position.x += x;
            position.y += y;
        });
    };

    Boundary.prototype.translateXY = function (x, y) {
        if (typeof y === "undefined") { y = 0; }
        Boundary.translate(this, x, y);
    };

    /**
    arranges the layout
    */
    Boundary.arrangeLayout = function (boundaries) {
        var maxX = 0;
        var prevBound = null;
        var components = [];
        boundaries.forEach(function (boundary) {
            maxX = Math.max(boundary.rigth, maxX);
            components = components.concat(boundary.components);
        });

        boundaries.forEach(function (boundary) {
            var translateX = maxX - boundary.rigth;
            var translateY = prevBound ? prevBound.bottom - boundary.top : 0;
            boundary.translateXY(translateX, translateY);
            prevBound = boundary;
        });

        var x = 0, y = 0, bottom = 350;

        if (boundaries.length) {
            x = maxX + 450;
            y = Math.max((prevBound.bottom - 350) / 2, 0);
            bottom = Math.max(prevBound.bottom, 350);
        }
        return [new Boundary(0, x, 0, bottom, components), { x: x, y: y }];
    };
    return Boundary;
})();
exports.Boundary = Boundary;
//# sourceMappingURL=graph.js.map

},{}],5:[function(require,module,exports){
(function (process){
/* parser generated by jison 0.4.13 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var parser = (function(){
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"unixcode":3,"commandline":4,"EOF":5,"|":6,"command":7,"auxcommand":8,"argsWithCommSub":9,"exec":10,"aux_commandline":11,"aux_command":12,"aux_auxcommand":13,"args":14,"s`":15,"`":16,"psubstitution":17,">":18,"outfile":19,"2>":20,"&>":21,"<":22,"infile":23,"2>&1":24,"str":25,"file":26,"proc_sub_out":27,"proc_sub_in":28,">(":29,")":30,"<(":31,"USTR":32,"STR":33,"STR2":34,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",6:"|",15:"s`",16:"`",18:">",20:"2>",21:"&>",22:"<",24:"2>&1",29:">(",30:")",31:"<(",32:"USTR",33:"STR",34:"STR2"},
productions_: [0,[3,2],[4,3],[4,1],[7,1],[8,2],[8,1],[11,3],[11,1],[12,1],[13,2],[13,1],[9,1],[9,3],[14,1],[14,2],[14,2],[14,2],[14,2],[14,1],[14,1],[26,1],[26,1],[19,1],[19,1],[23,1],[23,1],[17,1],[17,1],[27,3],[28,3],[10,1],[25,1],[25,1],[25,1]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1: return $$[$0-1]; 
break;
case 2:$$[$0-2].push(_$[$0]);this.$ = $$[$0-2];
break;
case 3:this.$ = [$$[$0]];
break;
case 4:this._$.exec = $$[$0].exec;this._$.args = $$[$0].args; this.$ = this._$
break;
case 5:$$[$0-1].args.push($$[$0]);this.$ = $$[$0-1];
break;
case 6:this.$ = {exec: $$[$0], args:[]};
break;
case 7:$$[$0-2].push($$[$0]);this.$ = $$[$0-2];
break;
case 8:this.$ = [$$[$0]];
break;
case 9:this._$.exec = $$[$0].exec;this._$.args = $$[$0].args; this.$ = this._$
break;
case 10:$$[$0-1].args.push($$[$0]);this.$ = $$[$0-1];
break;
case 11:this.$ = {exec: $$[$0], args:[]};
break;
case 13:this.$ = ["commandSubstitution",$$[$0-1]];
break;
case 15:this.$ = ["outTo"+$$[$0][0],$$[$0][1]];
break;
case 16:this.$ = ["errTo"+$$[$0][0],$$[$0][1]];
break;
case 17:this.$ = ["out&errTo"+$$[$0][0],$$[$0][1]];
break;
case 18:this.$ = ["inFrom"+$$[$0][0],$$[$0][1]];
break;
case 19:this.$ = ["errToOut"];
break;
case 23:this.$ = ["Process",$$[$0][1]];
break;
case 24:this.$ = ["File",$$[$0]];
break;
case 25:this.$ = ["Process",$$[$0][1]];
break;
case 26:this.$ = ["File",$$[$0]];
break;
case 29:this.$ = ["outToProcess",$$[$0-1]];
break;
case 30:this.$ = ["inFromProcess",$$[$0-1]];
break;
case 32:this.$ = yytext.replace(/\\/g,"")
break;
case 33:this.$ = yytext.slice(1,-1).replace(/\\\"/g,'"')
break;
case 34:this.$ = yytext.slice(1,-1).replace(/\\\'/g,"'")
break;
}
},
table: [{3:1,4:2,7:3,8:4,10:5,25:6,32:[1,7],33:[1,8],34:[1,9]},{1:[3]},{5:[1,10],6:[1,11]},{5:[2,3],6:[2,3],9:12,14:13,15:[1,14],17:15,18:[1,16],20:[1,17],21:[1,18],22:[1,19],24:[1,20],25:21,27:22,28:23,29:[1,24],30:[2,3],31:[1,25],32:[1,7],33:[1,8],34:[1,9]},{5:[2,4],6:[2,4],15:[2,4],18:[2,4],20:[2,4],21:[2,4],22:[2,4],24:[2,4],29:[2,4],30:[2,4],31:[2,4],32:[2,4],33:[2,4],34:[2,4]},{5:[2,6],6:[2,6],15:[2,6],18:[2,6],20:[2,6],21:[2,6],22:[2,6],24:[2,6],29:[2,6],30:[2,6],31:[2,6],32:[2,6],33:[2,6],34:[2,6]},{5:[2,31],6:[2,31],15:[2,31],16:[2,31],18:[2,31],20:[2,31],21:[2,31],22:[2,31],24:[2,31],29:[2,31],30:[2,31],31:[2,31],32:[2,31],33:[2,31],34:[2,31]},{5:[2,32],6:[2,32],15:[2,32],16:[2,32],18:[2,32],20:[2,32],21:[2,32],22:[2,32],24:[2,32],29:[2,32],30:[2,32],31:[2,32],32:[2,32],33:[2,32],34:[2,32]},{5:[2,33],6:[2,33],15:[2,33],16:[2,33],18:[2,33],20:[2,33],21:[2,33],22:[2,33],24:[2,33],29:[2,33],30:[2,33],31:[2,33],32:[2,33],33:[2,33],34:[2,33]},{5:[2,34],6:[2,34],15:[2,34],16:[2,34],18:[2,34],20:[2,34],21:[2,34],22:[2,34],24:[2,34],29:[2,34],30:[2,34],31:[2,34],32:[2,34],33:[2,34],34:[2,34]},{1:[2,1]},{7:26,8:4,10:5,25:6,32:[1,7],33:[1,8],34:[1,9]},{5:[2,5],6:[2,5],15:[2,5],18:[2,5],20:[2,5],21:[2,5],22:[2,5],24:[2,5],29:[2,5],30:[2,5],31:[2,5],32:[2,5],33:[2,5],34:[2,5]},{5:[2,12],6:[2,12],15:[2,12],18:[2,12],20:[2,12],21:[2,12],22:[2,12],24:[2,12],29:[2,12],30:[2,12],31:[2,12],32:[2,12],33:[2,12],34:[2,12]},{10:30,11:27,12:28,13:29,25:6,32:[1,7],33:[1,8],34:[1,9]},{5:[2,14],6:[2,14],15:[2,14],16:[2,14],18:[2,14],20:[2,14],21:[2,14],22:[2,14],24:[2,14],29:[2,14],30:[2,14],31:[2,14],32:[2,14],33:[2,14],34:[2,14]},{19:31,25:33,27:32,29:[1,24],32:[1,7],33:[1,8],34:[1,9]},{19:34,25:33,27:32,29:[1,24],32:[1,7],33:[1,8],34:[1,9]},{19:35,25:33,27:32,29:[1,24],32:[1,7],33:[1,8],34:[1,9]},{23:36,25:38,28:37,31:[1,25],32:[1,7],33:[1,8],34:[1,9]},{5:[2,19],6:[2,19],15:[2,19],16:[2,19],18:[2,19],20:[2,19],21:[2,19],22:[2,19],24:[2,19],29:[2,19],30:[2,19],31:[2,19],32:[2,19],33:[2,19],34:[2,19]},{5:[2,20],6:[2,20],15:[2,20],16:[2,20],18:[2,20],20:[2,20],21:[2,20],22:[2,20],24:[2,20],29:[2,20],30:[2,20],31:[2,20],32:[2,20],33:[2,20],34:[2,20]},{5:[2,27],6:[2,27],15:[2,27],16:[2,27],18:[2,27],20:[2,27],21:[2,27],22:[2,27],24:[2,27],29:[2,27],30:[2,27],31:[2,27],32:[2,27],33:[2,27],34:[2,27]},{5:[2,28],6:[2,28],15:[2,28],16:[2,28],18:[2,28],20:[2,28],21:[2,28],22:[2,28],24:[2,28],29:[2,28],30:[2,28],31:[2,28],32:[2,28],33:[2,28],34:[2,28]},{4:39,7:3,8:4,10:5,25:6,32:[1,7],33:[1,8],34:[1,9]},{4:40,7:3,8:4,10:5,25:6,32:[1,7],33:[1,8],34:[1,9]},{5:[2,2],6:[2,2],9:12,14:13,15:[1,14],17:15,18:[1,16],20:[1,17],21:[1,18],22:[1,19],24:[1,20],25:21,27:22,28:23,29:[1,24],30:[2,2],31:[1,25],32:[1,7],33:[1,8],34:[1,9]},{6:[1,42],16:[1,41]},{6:[2,8],14:43,16:[2,8],17:15,18:[1,16],20:[1,17],21:[1,18],22:[1,19],24:[1,20],25:21,27:22,28:23,29:[1,24],31:[1,25],32:[1,7],33:[1,8],34:[1,9]},{6:[2,9],16:[2,9],18:[2,9],20:[2,9],21:[2,9],22:[2,9],24:[2,9],29:[2,9],31:[2,9],32:[2,9],33:[2,9],34:[2,9]},{6:[2,11],16:[2,11],18:[2,11],20:[2,11],21:[2,11],22:[2,11],24:[2,11],29:[2,11],31:[2,11],32:[2,11],33:[2,11],34:[2,11]},{5:[2,15],6:[2,15],15:[2,15],16:[2,15],18:[2,15],20:[2,15],21:[2,15],22:[2,15],24:[2,15],29:[2,15],30:[2,15],31:[2,15],32:[2,15],33:[2,15],34:[2,15]},{5:[2,23],6:[2,23],15:[2,23],16:[2,23],18:[2,23],20:[2,23],21:[2,23],22:[2,23],24:[2,23],29:[2,23],30:[2,23],31:[2,23],32:[2,23],33:[2,23],34:[2,23]},{5:[2,24],6:[2,24],15:[2,24],16:[2,24],18:[2,24],20:[2,24],21:[2,24],22:[2,24],24:[2,24],29:[2,24],30:[2,24],31:[2,24],32:[2,24],33:[2,24],34:[2,24]},{5:[2,16],6:[2,16],15:[2,16],16:[2,16],18:[2,16],20:[2,16],21:[2,16],22:[2,16],24:[2,16],29:[2,16],30:[2,16],31:[2,16],32:[2,16],33:[2,16],34:[2,16]},{5:[2,17],6:[2,17],15:[2,17],16:[2,17],18:[2,17],20:[2,17],21:[2,17],22:[2,17],24:[2,17],29:[2,17],30:[2,17],31:[2,17],32:[2,17],33:[2,17],34:[2,17]},{5:[2,18],6:[2,18],15:[2,18],16:[2,18],18:[2,18],20:[2,18],21:[2,18],22:[2,18],24:[2,18],29:[2,18],30:[2,18],31:[2,18],32:[2,18],33:[2,18],34:[2,18]},{5:[2,25],6:[2,25],15:[2,25],16:[2,25],18:[2,25],20:[2,25],21:[2,25],22:[2,25],24:[2,25],29:[2,25],30:[2,25],31:[2,25],32:[2,25],33:[2,25],34:[2,25]},{5:[2,26],6:[2,26],15:[2,26],16:[2,26],18:[2,26],20:[2,26],21:[2,26],22:[2,26],24:[2,26],29:[2,26],30:[2,26],31:[2,26],32:[2,26],33:[2,26],34:[2,26]},{6:[1,11],30:[1,44]},{6:[1,11],30:[1,45]},{5:[2,13],6:[2,13],15:[2,13],18:[2,13],20:[2,13],21:[2,13],22:[2,13],24:[2,13],29:[2,13],30:[2,13],31:[2,13],32:[2,13],33:[2,13],34:[2,13]},{10:30,12:46,13:29,25:6,32:[1,7],33:[1,8],34:[1,9]},{6:[2,10],16:[2,10],18:[2,10],20:[2,10],21:[2,10],22:[2,10],24:[2,10],29:[2,10],31:[2,10],32:[2,10],33:[2,10],34:[2,10]},{5:[2,29],6:[2,29],15:[2,29],16:[2,29],18:[2,29],20:[2,29],21:[2,29],22:[2,29],24:[2,29],29:[2,29],30:[2,29],31:[2,29],32:[2,29],33:[2,29],34:[2,29]},{5:[2,30],6:[2,30],15:[2,30],16:[2,30],18:[2,30],20:[2,30],21:[2,30],22:[2,30],24:[2,30],29:[2,30],30:[2,30],31:[2,30],32:[2,30],33:[2,30],34:[2,30]},{6:[2,7],14:43,16:[2,7],17:15,18:[1,16],20:[1,17],21:[1,18],22:[1,19],24:[1,20],25:21,27:22,28:23,29:[1,24],31:[1,25],32:[1,7],33:[1,8],34:[1,9]}],
defaultActions: {10:[2,1]},
parseError: function parseError(str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        throw new Error(str);
    }
},
parse: function parse(input) {
    var self = this, stack = [0], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    this.lexer.setInput(input);
    this.lexer.yy = this.yy;
    this.yy.lexer = this.lexer;
    this.yy.parser = this;
    if (typeof this.lexer.yylloc == 'undefined') {
        this.lexer.yylloc = {};
    }
    var yyloc = this.lexer.yylloc;
    lstack.push(yyloc);
    var ranges = this.lexer.options && this.lexer.options.ranges;
    if (typeof this.yy.parseError === 'function') {
        this.parseError = this.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    function lex() {
        var token;
        token = self.lexer.lex() || EOF;
        if (typeof token !== 'number') {
            token = self.symbols_[token] || token;
        }
        return token;
    }
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (this.lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + this.lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: this.lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: this.lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(this.lexer.yytext);
            lstack.push(this.lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = this.lexer.yyleng;
                yytext = this.lexer.yytext;
                yylineno = this.lexer.yylineno;
                yyloc = this.lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                this.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};
/* generated by jison-lex 0.2.1 */
var lexer = (function(){
var lexer = {

EOF:1,

parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },

// resets the lexer, sets new input
setInput:function (input) {
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 0
        };
        if (this.options.ranges) {
            this.yylloc.range = [0,0];
        }
        this.offset = 0;
        return this;
    },

// consumes and returns one char from the input
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) {
            this.yylloc.range[1]++;
        }

        this._input = this._input.slice(1);
        return ch;
    },

// unshifts one char (or a string) into the input
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len - 1);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);

        if (lines.length - 1) {
            this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;

        this.yylloc = {
            first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ?
                (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                 + oldLines[oldLines.length - lines.length].length - lines[0].length :
              this.yylloc.first_column - len
        };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
    },

// When called from action, caches matched text and appends it on next action
more:function () {
        this._more = true;
        return this;
    },

// When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
reject:function () {
        if (this.options.backtrack_lexer) {
            this._backtrack = true;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });

        }
        return this;
    },

// retain first n characters of the match
less:function (n) {
        this.unput(this.match.slice(n));
    },

// displays already matched input, i.e. for error messages
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },

// displays upcoming input, i.e. for error messages
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
    },

// displays the character position where the lexing error occurred, i.e. for error messages
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
    },

// test the lexed token: return FALSE when not a match, otherwise return token
test_match:function (match, indexed_rule) {
        var token,
            lines,
            backup;

        if (this.options.backtrack_lexer) {
            // save context
            backup = {
                yylineno: this.yylineno,
                yylloc: {
                    first_line: this.yylloc.first_line,
                    last_line: this.last_line,
                    first_column: this.yylloc.first_column,
                    last_column: this.yylloc.last_column
                },
                yytext: this.yytext,
                match: this.match,
                matches: this.matches,
                matched: this.matched,
                yyleng: this.yyleng,
                offset: this.offset,
                _more: this._more,
                _input: this._input,
                yy: this.yy,
                conditionStack: this.conditionStack.slice(0),
                done: this.done
            };
            if (this.options.ranges) {
                backup.yylloc.range = this.yylloc.range.slice(0);
            }
        }

        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno += lines.length;
        }
        this.yylloc = {
            first_line: this.yylloc.last_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.last_column,
            last_column: lines ?
                         lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                         this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
            this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
            this.done = false;
        }
        if (token) {
            return token;
        } else if (this._backtrack) {
            // recover context
            for (var k in backup) {
                this[k] = backup[k];
            }
            return false; // rule action called reject() implying the next rule should be tested instead.
        }
        return false;
    },

// return next match in input
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) {
            this.done = true;
        }

        var token,
            match,
            tempMatch,
            index;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (this.options.backtrack_lexer) {
                    token = this.test_match(tempMatch, rules[i]);
                    if (token !== false) {
                        return token;
                    } else if (this._backtrack) {
                        match = false;
                        continue; // rule action called reject() implying a rule MISmatch.
                    } else {
                        // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                        return false;
                    }
                } else if (!this.options.flex) {
                    break;
                }
            }
        }
        if (match) {
            token = this.test_match(match, rules[index]);
            if (token !== false) {
                return token;
            }
            // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
            return false;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });
        }
    },

// return next match that has a token
lex:function lex() {
        var r = this.next();
        if (r) {
            return r;
        } else {
            return this.lex();
        }
    },

// activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },

// pop the previously active lexer condition state off the condition stack
popState:function popState() {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
            return this.conditionStack.pop();
        } else {
            return this.conditionStack[0];
        }
    },

// produce the lexer rule set which is active for the currently active lexer condition state
_currentRules:function _currentRules() {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
            return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
            return this.conditions["INITIAL"].rules;
        }
    },

// return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
topState:function topState(n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
            return this.conditionStack[n];
        } else {
            return "INITIAL";
        }
    },

// alias for begin(condition)
pushState:function pushState(condition) {
        this.begin(condition);
    },

// return the number of states currently on the stack
stateStackSize:function stateStackSize() {
        return this.conditionStack.length;
    },
options: {},
performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {

var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0:return 21
break;
case 1:return 24
break;
case 2:return 20
break;
case 3:return 29
break;
case 4:return 31
break;
case 5:return 22
break;
case 6:return 18
break;
case 7:return '('
break;
case 8:return 30
break;
case 9:return 15
break;
case 10:return 16
break;
case 11:return 33
break;
case 12:return 34
break;
case 13:return 32
break;
case 14:return 6
break;
case 15:return 5
break;
case 16:/*ignore*/
break;
case 17:return 'INVALID'
break;
}
},
rules: [/^(?:&>)/,/^(?:2>&1\b)/,/^(?:2>)/,/^(?:>\()/,/^(?:<\()/,/^(?:<)/,/^(?:>)/,/^(?:\()/,/^(?:\))/,/^(?:\s`)/,/^(?:`)/,/^(?:"(\\.|[^\"])*")/,/^(?:'(\\.|[^\'])*')/,/^(?:([^\|\ \n\(\)\>\<\`$]|(\\[\ \(\)<>]))+)/,/^(?:\|)/,/^(?:$)/,/^(?:\s+)/,/^(?:.)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17],"inclusive":true}}
};
return lexer;
})();
parser.lexer = lexer;
function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();


if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = parser;
exports.Parser = parser.Parser;
exports.parse = function () { return parser.parse.apply(parser, arguments); };
exports.main = function commonjsMain(args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(process.argv.slice(1));
}
}
}).call(this,require("/home/omar/thesis/flownix/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))
},{"/home/omar/thesis/flownix/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":2,"fs":1,"path":3}],6:[function(require,module,exports){
var optionsParser = require("../utils/optionsParser");
var Iterator = optionsParser.Iterator;

var parser = require("../parser");

var GraphModule = require("../../common/graph");
var Boundary = GraphModule.Boundary;
var Graph = GraphModule.Graph;

var Connection = GraphModule.Connection;

var FileComponent = GraphModule.FileComponent;


function typeOf(arg) {
    if (typeof arg === 'string' && arg.length > 0) {
        if (arg[0] === '-' && arg.length > 1) {
            if (arg[1] === '-') {
                return 'longOption';
            } else
                return 'shortOptions';
        } else {
            return 'string';
        }
    } else if (arg instanceof Array) {
        return arg[0];
    } else
        return 'string';
}
exports.typeOf = typeOf;

/*getComponentById = function(visualData, id){
var i$, ref$, len$, x;
for (i$ = 0, len$ = (ref$ = visualData.components).length; i$ < len$; ++i$) {
x = ref$[i$];
if (x.id === id) {
return x;
}
}
return null;
};*/
/**
Adds a file component to the
*/
function addFileComponent(componentData, connections, filename, id) {
    var newComponent = new FileComponent(filename);
    newComponent.id = id;

    var inputPort = "file" + (componentData.files.length);
    connections.push(new Connection(newComponent, 'output', componentData, inputPort));

    componentData.files.push(filename);
    return newComponent;
}
exports.addFileComponent = addFileComponent;
;

/*var commonNodeParsing = {
string: function(options){
return addFileComponent(options, options.iterator.current);
},
shortOptions: function(options){
return addFileComponent(options, options.iterator.current);
},
longOption: function(options){
return addFileComponent(options, options.iterator.current);
}
};*/
function commonParseCommand(optionsParserData, defaultComponentData, argNodeParsing) {
    return function (argsNode, parser, tracker, previousCommand) {
        var stdoutRedirection, stderrRedirection, argNode, newComponent, inputPort, subresult, ref$, y;
        var componentData = defaultComponentData();

        var boundaries = [];
        if (previousCommand) {
            boundaries.push(previousCommand[0]);
        }
        var result = new Graph();
        result.components = [componentData];

        result.firstMainComponent = componentData;
        var iter = new Iterator(argsNode);
        while (iter.hasNext()) {
            var argNode = iter.next();
            switch (exports.typeOf(argNode)) {
                case 'shortOptions':
                    optionsParser.parseShortOptions(optionsParserData, componentData, iter);
                    break;
                case 'longOption':
                    optionsParser.parseLongOptions(optionsParserData, componentData, iter);
                    break;
                case 'string':
                    var addfile = true;
                    if (argNodeParsing && argNodeParsing.string) {
                        addfile = argNodeParsing.string(componentData, argNode) == "continue";
                    }
                    if (addfile) {
                        newComponent = exports.addFileComponent(componentData, result.connections, argNode, tracker.id++);
                        result.components.push(newComponent);
                        boundaries.push(Boundary.createFromComponent(newComponent));
                    }
                    break;

                case 'inFromProcess':
                    subresult = parser.parseAST(argNode[1], tracker);
                    boundaries.push(Boundary.createFromComponents(subresult.components));
                    result.expand(subresult);
                    inputPort = "file" + componentData.files.length;

                    var subComponents = subresult.components;
                    for (var i = subComponents.length - 1; i >= 0; i--) {
                        if (subComponents[i].id == tracker.id - 1) {
                            result.connections.push(new Connection(subComponents[i], 'output', componentData, inputPort));
                            break;
                        }
                    }

                    componentData.files.push(["pipe", tracker.id - 1]);

                    break;
                case 'outToFile':
                    newComponent = new FileComponent(argNode[1]);
                    newComponent.id = tracker.id;
                    result.connections.push(new Connection(componentData, 'output', newComponent, 'input'));

                    tracker.id++;
                    result.components.push(newComponent);
                    stdoutRedirection = newComponent;
                    break;
                case 'errToFile':
                    newComponent = new FileComponent(argNode[1]);
                    newComponent.id = tracker.id;
                    result.connections.push(new Connection(componentData, 'error', newComponent, 'input'));
                    tracker.id++;
                    result.components.push(newComponent);
                    stderrRedirection = newComponent;
            }
        }
        var bbox = Boundary.arrangeLayout(boundaries);
        componentData.position = bbox[1];
        componentData.id = tracker.id;
        if (stdoutRedirection) {
            var position = stdoutRedirection.position;
            position.x = bbox[1].x + 400;
            position.y = bbox[1].y;
        }
        if (stderrRedirection) {
            y = stdoutRedirection ? 100 : 0;
            stderrRedirection.position = {
                x: bbox[1].x + 400,
                y: bbox[1].y + y
            };
        }

        //result.connections = result.connections.concat(connections.toConnectionList());
        tracker.id++;
        return [bbox[0], result];
    };
}
exports.commonParseCommand = commonParseCommand;
;

function parseFlagsAndSelectors(component, options) {
    var key, selectors, value, flag, flags, that, val;
    var flagOptions = options.flagOptions;
    var selectorOptions = options.selectorOptions;
    var sFlags = [];
    var lFlags = [];
    var resultSFlags;
    var resultLFlags;

    for (key in flags = component.flags) {
        value = flags[key];
        if (value) {
            flag = flagOptions[key];

            /* istanbul ignore if */ if (!flag) {
                throw [key, "doesn't exist in ", flagOptions].join('');
            } else
                sFlags.push(flag);
        }
    }

    if (component.selectors) {
        for (key in selectors = component.selectors) {
            value = selectors[key];
            var optionValue = selectorOptions[key][value.name];
            if (optionValue != null) {
                /* istanbul ignore if */ if (!optionValue) {
                    throw [key, ".", value, "doesn't exist in ", selectorOptions].join('');
                } else if (optionValue[0] !== '-') {
                    sFlags.push(optionValue);
                } else {
                    lFlags.push(optionValue);
                }
            }
        }
    }

    var containsSFlags = sFlags.length > 0;
    var containsLFlags = lFlags.length > 0;

    if (containsSFlags && containsLFlags) {
        return "-" + sFlags.join('') + " " + lFlags.join(' ');
    } else if (containsSFlags) {
        return "-" + sFlags.join('');
    } else if (containsLFlags) {
        return lFlags.join(' ');
    } else
        return "";
}
;

function commonParseComponent(flagOptions, selectorOptions, parameterOptions, beforeJoin) {
    var options;
    options = {
        flagOptions: flagOptions,
        selectorOptions: selectorOptions,
        parameterOptions: parameterOptions
    };

    return function (component, visualData, componentIndex, mapOfParsedComponents) {
        var exec = [component.exec];
        mapOfParsedComponents[component.id] = true;
        var flags = parseFlagsAndSelectors(component, options);
        var parameters = [];
        var Componentparameters = component.parameters;

        for (var key in Componentparameters) {
            var value = Componentparameters[key];
            if (value) {
                var result = "-" + parameterOptions[key] + value;
                if (value.indexOf(" ") >= 0) {
                    result = '"' + result + '"';
                }
                parameters.push(result);
            }
        }

        var files = !component.files ? [] : component.files.map(function (file) {
            if (file instanceof Array) {
                var subCommand = parser.parseVisualDatafromComponent(componentIndex.components[file[1]], visualData, componentIndex, mapOfParsedComponents);
                return "<(" + subCommand + ")";
            } else if (file.indexOf(" ") >= 0) {
                return '"' + file + '"';
            } else
                return file;
        });

        if (parameters.length > 0) {
            parameters = parameters.join(' ');
        }
        if (beforeJoin) {
            return beforeJoin(component, exec, flags, files, parameters);
        } else {
            return exec.concat(flags, parameters, files).join(' ');
        }
    };
}
exports.commonParseComponent = commonParseComponent;
;

exports.select = optionsParser.select;
exports.sameAs = optionsParser.sameAs;
exports.switchOn = optionsParser.switchOn;
exports.select = optionsParser.select;
//# sourceMappingURL=_init.js.map

},{"../../common/graph":4,"../parser":24,"../utils/optionsParser":26}],7:[function(require,module,exports){
/*
-f arqprog              --file=arqprog
-F fs                   --field-separator=fs
-v var=val              --assign=var=val
*/
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var $ = require("../utils/optionsParser");
var parserModule = require("../utils/parserData");
var common = require("./_init");
var GraphModule = require("../../common/graph");

var config = {
    parameters: {
        separator: {
            name: 'field separator',
            option: 'F',
            type: "string",
            description: "filter entries by anything other than the content",
            defaultValue: ""
        }
    }
};
var awkData = new parserModule.ParserData(config);

var optionsParser = {
    shortOptions: {
        F: $.setParameter(config.parameters.separator.name)
    },
    longOptions: {
        "field-separator": $.sameAs('F')
    }
};

$.generate(optionsParser);

var AwkComponent = (function (_super) {
    __extends(AwkComponent, _super);
    function AwkComponent() {
        _super.apply(this, arguments);
        this.exec = "awk";
        this.script = "";
        this.files = [];
    }
    return AwkComponent;
})(GraphModule.CommandComponent);
exports.AwkComponent = AwkComponent;

function defaultComponentData() {
    var component = new AwkComponent();
    component.parameters = awkData.componentParameters;
    return component;
}
;

exports.parseCommand = common.commonParseCommand(optionsParser, defaultComponentData, {
    string: function (component, str) {
        component.script = str;
    }
});

exports.parseComponent = common.commonParseComponent(awkData.flagOptions, awkData.selectorOptions, awkData.parameterOptions, function (component, exec, flags, files, parameters) {
    var script = component.script.replace('"', '\\"');
    if (script) {
        script = (/[\n\ ]/.test(script)) ? '"' + script + '"' : script;
    }
    return exec.concat(parameters, script).join(' ');
});

exports.VisualSelectorOptions = awkData.visualSelectorOptions;
exports.componentClass = AwkComponent;
//# sourceMappingURL=awk.js.map

},{"../../common/graph":4,"../utils/optionsParser":26,"../utils/parserData":27,"./_init":6}],8:[function(require,module,exports){
/*
-d --decompress     force decompression
-z --compress       force compression
-k --keep           keep (don't delete) input files
-f --force          overwrite existing output files
-t --test           test compressed file integrity
-c --stdout         output to standard out
-q --quiet          suppress noncritical error messages
-v --verbose        be verbose (a 2nd -v gives more)
-s --small          use less memory (at most 2500k)
-1 .. -9            set block size to 100k .. 900k
--fast              alias for -1
--best              alias for -9
*/
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var $ = require("../utils/optionsParser");
var parserModule = require("../utils/parserData");
var common = require("./_init");
var GraphModule = require("../../common/graph");

var selectors = {
    action: {
        name: 'action',
        description: 'action of the algorithm',
        options: {
            compress: {
                name: 'compress',
                option: 'z',
                description: 'compress the received data'
            },
            decompress: {
                name: 'decompress',
                option: null,
                description: 'decompress the received data'
            }
        }
    }
};

var actionOptions = selectors.action.options;

var flags = {
    keep: {
        name: "keep files",
        option: 'k',
        description: "keep (don't delete) input files",
        active: false
    },
    force: {
        name: "force",
        option: 'f',
        description: "overwrite existing output files",
        active: false
    },
    test: {
        name: "test",
        option: 't',
        description: "test compressed file integrity",
        active: false
    },
    stdout: {
        name: "stdout",
        option: 'c',
        description: "output to standard out",
        active: false
    },
    quiet: {
        name: "quiet",
        option: 'q',
        description: "suppress noncritical error messages",
        active: false
    },
    verbose: {
        name: "verbose",
        option: 'v',
        description: "overwrite existing output files",
        active: false
    },
    small: {
        name: "small",
        option: 's',
        description: "use less memory (at most 2500k)",
        active: false
    }
};

var config = {
    selectors: selectors,
    flags: flags
};

var bzipData = new parserModule.ParserData(config);

var shortOptions = {
    d: $.select(selectors.action.name, actionOptions.decompress.name),
    z: $.select(selectors.action.name, actionOptions.compress.name),
    k: $.switchOn(flags.keep.name),
    f: $.switchOn(flags.force.name),
    t: $.switchOn(flags.test.name),
    c: $.switchOn(flags.stdout.name),
    q: $.switchOn(flags.quiet.name),
    v: $.switchOn(flags.verbose.name),
    s: $.switchOn(flags.small.name),
    1: $.ignore,
    2: $.ignore,
    3: $.ignore,
    4: $.ignore,
    5: $.ignore,
    6: $.ignore,
    7: $.ignore,
    8: $.ignore,
    9: $.ignore
};

var longOptions = {
    'decompress': $.sameAs('d'),
    'compress': $.sameAs('z'),
    'keep': $.sameAs('k'),
    'force': $.sameAs('f'),
    'test': $.sameAs('t'),
    'stdout': $.sameAs('c'),
    'quiet': $.sameAs('q'),
    'verbose': $.sameAs('v'),
    'small': $.sameAs('s'),
    'fast': $.sameAs('1'),
    'best': $.sameAs('9')
};

var optionsParser = {
    shortOptions: shortOptions,
    longOptions: longOptions
};

$.generate(optionsParser);

var BunzipComponent = (function (_super) {
    __extends(BunzipComponent, _super);
    function BunzipComponent() {
        _super.apply(this, arguments);
        this.exec = "bunzip2";
        this.files = [];
    }
    return BunzipComponent;
})(GraphModule.CommandComponent);
exports.BunzipComponent = BunzipComponent;

function defaultComponentData() {
    var component = new BunzipComponent();
    component.selectors = bzipData.componentSelectors;
    component.flags = bzipData.componentFlags;
    return component;
}
;
exports.parseCommand = common.commonParseCommand(optionsParser, defaultComponentData);
exports.parseComponent = common.commonParseComponent(bzipData.flagOptions, bzipData.selectorOptions);
exports.VisualSelectorOptions = bzipData.visualSelectorOptions;
exports.componentClass = BunzipComponent;
//# sourceMappingURL=bunzip2.js.map

},{"../../common/graph":4,"../utils/optionsParser":26,"../utils/parserData":27,"./_init":6}],9:[function(require,module,exports){
/*
-d --decompress     force decompression
-z --compress       force compression
-k --keep           keep (don't delete) input files
-f --force          overwrite existing output files
-t --test           test compressed file integrity
-c --stdout         output to standard out
-q --quiet          suppress noncritical error messages
-v --verbose        be verbose (a 2nd -v gives more)
-s --small          use less memory (at most 2500k)
-1 .. -9            set block size to 100k .. 900k
--fast              alias for -1
--best              alias for -9
*/
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var $ = require("../utils/optionsParser");
var parserModule = require("../utils/parserData");
var common = require("./_init");
var GraphModule = require("../../common/graph");

var selectors = {
    action: {
        name: 'action',
        description: 'action of the algorithm',
        options: {
            compress: {
                name: 'compress',
                option: null,
                description: 'compress the received data'
            },
            decompress: {
                name: 'decompress',
                option: 'd',
                description: 'decompress the received data'
            }
        }
    }
};

var actionOptions = selectors.action.options;

var flags = {
    keep: {
        name: "keep files",
        option: 'k',
        description: "keep (don't delete) input files",
        active: false
    },
    force: {
        name: "force",
        option: 'f',
        description: "overwrite existing output files",
        active: false
    },
    test: {
        name: "test",
        option: 't',
        description: "test compressed file integrity",
        active: false
    },
    stdout: {
        name: "stdout",
        option: 'c',
        description: "output to standard out",
        active: true
    },
    quiet: {
        name: "quiet",
        option: 'q',
        description: "suppress noncritical error messages",
        active: false
    },
    verbose: {
        name: "verbose",
        option: 'v',
        description: "overwrite existing output files",
        active: false
    },
    small: {
        name: "small",
        option: 's',
        description: "use less memory (at most 2500k)",
        active: false
    }
};

var config = {
    selectors: selectors,
    flags: flags
};

var bzipData = new parserModule.ParserData(config);

var shortOptions = {
    d: $.select(selectors.action.name, actionOptions.decompress.name),
    z: $.select(selectors.action.name, actionOptions.compress.name),
    k: $.switchOn(flags.keep.name),
    f: $.switchOn(flags.force.name),
    t: $.switchOn(flags.test.name),
    c: $.switchOn(flags.stdout.name),
    q: $.switchOn(flags.quiet.name),
    v: $.switchOn(flags.verbose.name),
    s: $.switchOn(flags.small.name),
    1: $.ignore,
    2: $.ignore,
    3: $.ignore,
    4: $.ignore,
    5: $.ignore,
    6: $.ignore,
    7: $.ignore,
    8: $.ignore,
    9: $.ignore
};

var longOptions = {
    'decompress': $.sameAs('d'),
    'compress': $.sameAs('z'),
    'keep': $.sameAs('k'),
    'force': $.sameAs('f'),
    'test': $.sameAs('t'),
    'stdout': $.sameAs('c'),
    'quiet': $.sameAs('q'),
    'verbose': $.sameAs('v'),
    'small': $.sameAs('s'),
    'fast': $.sameAs('1'),
    'best': $.sameAs('9')
};

var optionsParser = {
    shortOptions: shortOptions,
    longOptions: longOptions
};

$.generate(optionsParser);

var BzcatComponent = (function (_super) {
    __extends(BzcatComponent, _super);
    function BzcatComponent() {
        _super.apply(this, arguments);
        this.exec = "bzcat";
        this.files = [];
    }
    return BzcatComponent;
})(GraphModule.CommandComponent);
exports.BzcatComponent = BzcatComponent;

function defaultComponentData() {
    var component = new BzcatComponent();
    component.selectors = bzipData.componentSelectors;
    component.flags = bzipData.componentFlags;
    return component;
}
;

exports.parseCommand = common.commonParseCommand(optionsParser, defaultComponentData);
exports.parseComponent = common.commonParseComponent(bzipData.flagOptions, bzipData.selectorOptions);
exports.VisualSelectorOptions = bzipData.visualSelectorOptions;
exports.componentClass = BzcatComponent;
//# sourceMappingURL=bzcat.js.map

},{"../../common/graph":4,"../utils/optionsParser":26,"../utils/parserData":27,"./_init":6}],10:[function(require,module,exports){
/*
-d --decompress     force decompression
-z --compress       force compression
-k --keep           keep (don't delete) input files
-f --force          overwrite existing output files
-t --test           test compressed file integrity
-c --stdout         output to standard out
-q --quiet          suppress noncritical error messages
-v --verbose        be verbose (a 2nd -v gives more)
-s --small          use less memory (at most 2500k)
-1 .. -9            set block size to 100k .. 900k
--fast              alias for -1
--best              alias for -9
*/
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var $ = require("../utils/optionsParser");
var parserModule = require("../utils/parserData");
var common = require("./_init");
var GraphModule = require("../../common/graph");

var selectors = {
    action: {
        name: 'action',
        description: 'action of the algorithm',
        options: {
            compress: {
                name: 'compress',
                option: null,
                description: 'compress the received data'
            },
            decompress: {
                name: 'decompress',
                option: 'd',
                longOption: "decompress",
                description: 'decompress the received data'
            }
        }
    },
    ratio: {
        name: 'ratio',
        description: 'compress ratio of the algorithm',
        options: {
            1: {
                name: '1 - fast',
                option: '1',
                longOption: 'fast',
                description: 'compress the received data'
            },
            2: {
                name: '2',
                option: '2',
                description: 'decompress the received data'
            },
            3: {
                name: '3',
                option: '3',
                description: 'decompress the received data'
            },
            4: {
                name: '4',
                option: '4',
                description: 'decompress the received data'
            },
            5: {
                name: '5',
                option: '5',
                description: 'decompress the received data'
            },
            6: {
                name: '6',
                option: '6',
                description: 'decompress the received data',
                default: true
            },
            7: {
                name: '7',
                option: '7',
                description: 'decompress the received data'
            },
            8: {
                name: '8',
                option: '8',
                description: 'decompress the received data'
            },
            9: {
                name: '9 - best',
                option: '9',
                longOption: 'best',
                description: 'decompress the received data'
            }
        }
    }
};

var actionOptions = selectors.action.options;

var flags = {
    keep: {
        name: "keep files",
        option: 'k',
        longOption: 'keep',
        description: "keep (don't delete) input files",
        active: false
    },
    force: {
        name: "force",
        option: 'f',
        longOption: 'force',
        description: "overwrite existing output files",
        active: false
    },
    test: {
        name: "test",
        option: 't',
        longOption: 'test',
        description: "test compressed file integrity",
        active: false
    },
    stdout: {
        name: "stdout",
        option: 'c',
        longOption: 'stdout',
        description: "output to standard out",
        active: false
    },
    quiet: {
        name: "quiet",
        option: 'q',
        longOption: 'quiet',
        description: "suppress noncritical error messages",
        active: false
    },
    verbose: {
        name: "verbose",
        option: 'v',
        longOption: 'verbose',
        description: "overwrite existing output files",
        active: false
    },
    small: {
        name: "small",
        longOption: 'small',
        option: 's',
        description: "use less memory (at most 2500k)",
        active: false
    }
};

var config = {
    selectors: selectors,
    flags: flags
};

var bzipData = new parserModule.ParserData(config);

var optionsParser = $.optionParserFromConfig(config);

/*
var shortOptions = {
1: $.ignore,
2: $.ignore,
3: $.ignore,
4: $.ignore,
5: $.ignore,
6: $.ignore,
7: $.ignore,
8: $.ignore,
9: $.ignore,
}
var longOptions = {
'decompress': $.sameAs('d'),
'compress': $.sameAs('z'),
'keep': $.sameAs('k'),
'force': $.sameAs('f'),
'test': $.sameAs('t'),
'stdout': $.sameAs('c'),
'quiet': $.sameAs('q'),
'verbose': $.sameAs('v'),
'small': $.sameAs('s'),
'fast': $.sameAs('1'),
'best': $.sameAs('9')
}*/
var BZipComponent = (function (_super) {
    __extends(BZipComponent, _super);
    function BZipComponent() {
        _super.apply(this, arguments);
        this.exec = "bzip2";
        this.files = [];
    }
    return BZipComponent;
})(GraphModule.CommandComponent);
exports.BZipComponent = BZipComponent;

function defaultComponentData() {
    var component = new BZipComponent();
    component.selectors = bzipData.componentSelectors;
    component.flags = bzipData.componentFlags;
    return component;
}
;

exports.parseCommand = common.commonParseCommand(optionsParser, defaultComponentData);
exports.parseComponent = common.commonParseComponent(bzipData.flagOptions, bzipData.selectorOptions);
exports.VisualSelectorOptions = bzipData.visualSelectorOptions;
exports.componentClass = BZipComponent;
//# sourceMappingURL=bzip2.js.map

},{"../../common/graph":4,"../utils/optionsParser":26,"../utils/parserData":27,"./_init":6}],11:[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var $ = require("../utils/optionsParser");
var GraphModule = require("../../common/graph");
var parserModule = require("../utils/parserData");
var common = require("./_init");

var selectors = {
    lineNumber: {
        name: 'line number',
        description: 'action to print if line numbers on the output',
        options: {
            noprint: {
                name: 'do not print',
                option: null,
                description: 'do not print line numbers',
                default: true
            },
            allLines: {
                name: 'print all lines',
                option: 'n',
                longOption: 'number',
                description: 'print line numbers on all lines'
            },
            nonEmpty: {
                name: 'print non-empty lines',
                option: 'b',
                longOption: 'number-nonblank',
                description: 'print line numbers on non empty lines'
            }
        }
    }
};

var flags = {
    tabs: {
        name: "show tabs",
        option: 'T',
        longOption: 'show-tabs',
        description: "print TAB characters like ^I",
        active: false
    },
    ends: {
        name: "show ends",
        option: 'E',
        longOption: 'show-ends',
        description: "print $ after each line",
        active: false
    },
    nonPrint: {
        name: "show non-printing",
        option: 'v',
        longOption: 'show-nonprinting',
        description: "use ^ and M- notation, except for LFD and TAB",
        active: false
    },
    sblanks: {
        name: "squeeze blank",
        option: 's',
        longOption: 'squeeze-blank',
        description: "suppress repeated empty output lines",
        active: false
    }
};

var config = {
    selectors: selectors,
    flags: flags
};

var bzipData = new parserModule.ParserData(config);

var optionsParser = $.optionParserFromConfig(config);

var shortOptions = optionsParser.shortOptions;
shortOptions['A'] = $.switchOn(flags.nonPrint, flags.tabs, flags.ends);
shortOptions['n'] = $.selectIfUnselected(selectors.lineNumber, selectors.lineNumber.options.allLines, selectors.lineNumber.options.nonEmpty);

var longOptions = optionsParser.shortOptions;
longOptions['show-all'] = shortOptions['A'];
longOptions['number'] = shortOptions['n'];

var CatComponent = (function (_super) {
    __extends(CatComponent, _super);
    function CatComponent() {
        _super.apply(this, arguments);
        this.exec = "cat";
        this.files = [];
    }
    return CatComponent;
})(GraphModule.CommandComponent);
exports.CatComponent = CatComponent;

function defaultComponentData() {
    var graph = new CatComponent();
    graph.selectors = bzipData.componentSelectors;
    graph.flags = bzipData.componentFlags;
    return graph;
}
;

exports.parseCommand = common.commonParseCommand(optionsParser, defaultComponentData);
exports.parseComponent = common.commonParseComponent(bzipData.flagOptions, bzipData.selectorOptions);
exports.VisualSelectorOptions = bzipData.visualSelectorOptions;
exports.componentClass = CatComponent;
//# sourceMappingURL=cat.js.map

},{"../../common/graph":4,"../utils/optionsParser":26,"../utils/parserData":27,"./_init":6}],12:[function(require,module,exports){
/*
-d   If given, decompression is done instead.
-c   Write output on stdout, don't remove original.
-b   Parameter limits the max number of bits/code.
-f   Forces output file to be generated, even if one already.
exists, and even if no space is saved by compressing.
If -f is not used, the user will be prompted if stdin is.
a tty, otherwise, the output file will not be overwritten.
-v   Write compression statistics.
-V   Output vesion and compile options.
-r   Recursive. If a filename is a directory, descend
*/
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var $ = require("../utils/optionsParser");
var GraphModule = require("../../common/graph");
var parserModule = require("../utils/parserData");
var common = require("./_init");

var flags = {
    // keep: {
    //   name: "keep files",
    //   option: 'k',
    //   description: "keep (don't delete) input files",
    //   active: false
    // },
    force: {
        name: "force",
        option: 'f',
        description: "overwrite existing output files",
        active: false
    },
    decompress: {
        name: "decompress",
        option: 'd',
        description: "decompress instead of compress",
        active: false
    },
    stdout: {
        name: "stdout",
        option: 'c',
        description: "output to standard out",
        active: false
    },
    // quiet: {
    //   name: "quiet",
    //   option: 'q',
    //   longOption: 'quiet',
    //   description: "suppress noncritical error messages",
    //   active: false
    // },
    statistics: {
        name: "statistics",
        option: 'v',
        description: "overwrite existing output files",
        active: false
    },
    recursive: {
        name: "recursive",
        option: 'r',
        description: "Recursive. If a filename is a directory, descend",
        active: false
    }
};

var config = {
    flags: flags
};

var gzipData = new parserModule.ParserData(config);
var optionsParser = $.optionParserFromConfig(config);

var CompressComponent = (function (_super) {
    __extends(CompressComponent, _super);
    function CompressComponent() {
        _super.apply(this, arguments);
        this.exec = "compress";
        this.files = [];
    }
    return CompressComponent;
})(GraphModule.CommandComponent);
exports.CompressComponent = CompressComponent;

function defaultComponentData() {
    var component = new CompressComponent();
    component.selectors = gzipData.componentSelectors;
    component.flags = gzipData.componentFlags;
    return component;
}
;

exports.parseCommand = common.commonParseCommand(optionsParser, defaultComponentData);
exports.parseComponent = common.commonParseComponent(gzipData.flagOptions, gzipData.selectorOptions);
exports.VisualSelectorOptions = gzipData.visualSelectorOptions;
exports.componentClass = CompressComponent;
//# sourceMappingURL=compress.js.map

},{"../../common/graph":4,"../utils/optionsParser":26,"../utils/parserData":27,"./_init":6}],13:[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var $ = require("../utils/optionsParser");
var parserModule = require("../utils/parserData");
var common = require("./_init");
var GraphModule = require("../../common/graph");

var config = {
    parameters: {
        date: {
            name: 'date',
            option: 'd',
            type: "string",
            description: "filter entries by anything other than the content",
            defaultValue: ""
        }
    },
    flags: {
        utc: {
            name: "UTC",
            option: 'u',
            longOption: ['utc', 'universal'],
            description: "overwrite existing output files",
            active: false
        }
    }
};
var dateData = new parserModule.ParserData(config);

var optionsParser = $.optionParserFromConfig(config);
optionsParser.shortOptions['d'] = $.setParameter(config.parameters.date.name);
optionsParser.longOptions['date'] = optionsParser.shortOptions['d'];

var DateComponent = (function (_super) {
    __extends(DateComponent, _super);
    function DateComponent() {
        _super.apply(this, arguments);
        this.exec = "date";
    }
    return DateComponent;
})(GraphModule.CommandComponent);
exports.DateComponent = DateComponent;

function defaultComponentData() {
    var component = new DateComponent();
    component.flags = dateData.componentFlags;
    component.parameters = dateData.componentParameters;
    return component;
}
;

exports.parseCommand = common.commonParseCommand(optionsParser, defaultComponentData, {
    string: function (component, str) {
        component.parameters.date = str;
    }
});
exports.parseComponent = common.commonParseComponent(dateData.flagOptions, dateData.selectorOptions, dateData.parameterOptions);
exports.VisualSelectorOptions = dateData.visualSelectorOptions;
exports.componentClass = DateComponent;
/*DESCRIPTION
Display the current time in the given FORMAT, or set the system date.
-d, --date=STRING
display time described by STRING, not 'now'
-f, --file=DATEFILE
like --date once for each line of DATEFILE
-I[TIMESPEC], --iso-8601[=TIMESPEC]
output date/time in ISO 8601 format.  TIMESPEC='date' for date only (the default), 'hours', 'minutes', 'seconds', or 'ns' for date and time to the indicated precision.
-r, --reference=FILE
display the last modification time of FILE
-R, --rfc-2822
output date and time in RFC 2822 format.  Example: Mon, 07 Aug 2006 12:34:56 -0600
--rfc-3339=TIMESPEC
output date and time in RFC 3339 format.  TIMESPEC='date', 'seconds', or 'ns' for date and time to the indicated precision.  Date and time components are separated by a sin‐
gle space: 2006-08-07 12:34:56-06:00
-s, --set=STRING
set time described by STRING
-u, --utc, --universal
print or set Coordinated Universal Time
--help display this help and exit
--version
output version information and exit
*/
//# sourceMappingURL=date.js.map

},{"../../common/graph":4,"../utils/optionsParser":26,"../utils/parserData":27,"./_init":6}],14:[function(require,module,exports){
/*
NAME
diff - compare files line by line
SYNOPSIS
diff [OPTION]... FILES
DESCRIPTION
Compare FILES line by line.
Mandatory arguments to long options are mandatory for short options too.
--normal
output a normal diff (the default)
-q, --brief
report only when files differ
-s, --report-identical-files
report when two files are the same
-c, -C NUM, --context[=NUM]
output NUM (default 3) lines of copied context
-u, -U NUM, --unified[=NUM]
output NUM (default 3) lines of unified context
-e, --ed
output an ed script
-n, --rcs
output an RCS format diff
-y, --side-by-side
output in two columns
-W, --width=NUM
output at most NUM (default 130) print columns
--left-column
output only the left column of common lines
--suppress-common-lines
do not output common lines
-p, --show-c-function
show which C function each change is in
-F, --show-function-line=RE
show the most recent line matching RE
--label LABEL
use LABEL instead of file name (can be repeated)
-t, --expand-tabs
expand tabs to spaces in output
-T, --initial-tab
make tabs line up by prepending a tab
--tabsize=NUM
tab stops every NUM (default 8) print columns
--suppress-blank-empty
suppress space or tab before empty output lines
-l, --paginate
pass output through `pr' to paginate it
-r, --recursive
recursively compare any subdirectories found
-N, --new-file
treat absent files as empty
--unidirectional-new-file
treat absent first files as empty
--ignore-file-name-case
ignore case when comparing file names
--no-ignore-file-name-case
consider case when comparing file names
-x, --exclude=PAT
exclude files that match PAT
-X, --exclude-from=FILE
exclude files that match any pattern in FILE
-S, --starting-file=FILE
start with FILE when comparing directories
--from-file=FILE1
compare FILE1 to all operands; FILE1 can be a directory
--to-file=FILE2
compare all operands to FILE2; FILE2 can be a directory
-i, --ignore-case
ignore case differences in file contents
-E, --ignore-tab-expansion
ignore changes due to tab expansion
-b, --ignore-space-change
ignore changes in the amount of white space
-w, --ignore-all-space
ignore all white space
-B, --ignore-blank-lines
ignore changes whose lines are all blank
-I, --ignore-matching-lines=RE
ignore changes whose lines all match RE
-a, --text
treat all files as text
--strip-trailing-cr
strip trailing carriage return on input
-D, --ifdef=NAME
output merged file with `#ifdef NAME' diffs
--GTYPE-group-format=GFMT
format GTYPE input groups with GFMT
--line-format=LFMT
format all input lines with LFMT
--LTYPE-line-format=LFMT
format LTYPE input lines with LFMT
These format options provide fine-grained control over the output
of diff, generalizing -D/--ifdef.
LTYPE is `old', `new', or `unchanged'.
GTYPE is LTYPE or `changed'.
GFMT (only) may contain:
%<     lines from FILE1
%>     lines from FILE2
%=     lines common to FILE1 and FILE2
%[-][WIDTH][.[PREC]]{doxX}LETTER
printf-style spec for LETTER
LETTERs are as follows for new group, lower case for old group:
F      first line number
L      last line number
N      number of lines = L-F+1
E      F-1
M      L+1
%(A=B?T:E)
if A equals B then T else E
LFMT (only) may contain:
%L     contents of line
%l     contents of line, excluding any trailing newline
%[-][WIDTH][.[PREC]]{doxX}n
printf-style spec for input line number
Both GFMT and LFMT may contain:
%%     %
%c'C'  the single character C
%c'\OOO'
the character with octal code OOO
C      the character C (other characters represent themselves)
-d, --minimal
try hard to find a smaller set of changes
--horizon-lines=NUM
keep NUM lines of the common prefix and suffix
--speed-large-files
assume large files and many scattered small changes
--help display this help and exit
-v, --version
output version information and exit
FILES  are  `FILE1  FILE2'  or  `DIR1  DIR2'  or `DIR FILE...' or `FILE... DIR'.  If
--from-file or --to-file is given, there are no restrictions on FILE(s).  If a  FILE
is  `-', read standard input.  Exit status is 0 if inputs are the same, 1 if differ‐
ent, 2 if trouble.
*/
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var $ = require("../utils/optionsParser");
var parserModule = require("../utils/parserData");
var common = require("./_init");
var GraphModule = require("../../common/graph");

var selectors = {
    format: {
        name: "format",
        description: "select attribute to sort",
        options: {
            normal: {
                name: 'normal',
                option: null,
                longOption: 'normal',
                description: 'do not print line numbers',
                default: true
            },
            RCS: {
                name: 'RCS',
                option: 'n',
                longOption: 'rcs',
                description: 'print line numbers on all lines'
            },
            edScript: {
                name: 'ed script',
                option: 'e',
                longOption: 'ed',
                description: 'print line numbers on non empty lines'
            }
        }
    }
};

var flags = {
    ignoreCase: {
        name: "ignore case",
        option: 'i',
        longOption: 'ignore-case',
        description: "print TAB characters like ^I",
        active: false
    },
    ignoreBlankLines: {
        name: "ignore blank lines",
        option: 'B',
        longOption: 'ignore-blank-lines',
        description: "use ^ and M- notation, except for LFD and TAB",
        active: false
    },
    ignoreSpaceChange: {
        name: "ignore space change",
        option: 'b',
        longOption: 'ignore-blank-sapce',
        description: "suppress repeated empty output lines",
        active: false
    }
};

var config = {
    selectors: selectors,
    flags: flags
};

var bzipData = new parserModule.ParserData(config);

var optionsParser = $.optionParserFromConfig(config);

var shortOptions = optionsParser.shortOptions;
shortOptions['q'] = $.ignore;

var longOptions = optionsParser.shortOptions;
longOptions['brief'] = shortOptions['q'];

var DiffComponent = (function (_super) {
    __extends(DiffComponent, _super);
    function DiffComponent() {
        _super.apply(this, arguments);
        this.exec = "diff";
        this.files = [];
    }
    return DiffComponent;
})(GraphModule.CommandComponent);
exports.DiffComponent = DiffComponent;

function defaultComponentData() {
    var graph = new DiffComponent();
    graph.selectors = bzipData.componentSelectors;
    graph.flags = bzipData.componentFlags;
    return graph;
}
;

exports.parseCommand = common.commonParseCommand(optionsParser, defaultComponentData);
exports.parseComponent = common.commonParseComponent(bzipData.flagOptions, bzipData.selectorOptions);
exports.VisualSelectorOptions = bzipData.visualSelectorOptions;
exports.componentClass = DiffComponent;
//# sourceMappingURL=diff.js.map

},{"../../common/graph":4,"../utils/optionsParser":26,"../utils/parserData":27,"./_init":6}],15:[function(require,module,exports){
/*
grep:
Matcher Selection:
arguments:
- ["E","--extended-regexp","Interpret PATTERN as an extended regular expression"]
- ["F","--fixed-strings","Interpret PATTERN as a list of fixed strings, separated by newlines, any of which is to be matched."]
- ["G","--basic-regexp","Interpret PATTERN as a basic regular expression (BRE, see below).  This is the default."]
- ["P","--perl-regexp","display $ at end of each line"]
Matching Control:
arguments:
- ["e PATTERN","--regexp=PATTERN","Use PATTERN as the pattern.  This can be used to specify multiple search patterns, or to protect a pattern beginning with a hyphen (-)."]
- ["f FILE","--file=FILE","Obtain patterns from FILE, one per line.  The empty file contains zero patterns, and therefore matches nothing."]
- ["i","--ignore-case","Ignore case distinctions in both the PATTERN and the input files."]
- ["v","--invert-match","Invert the sense of matching, to select non-matching lines."]
- ["w","--word-regexp"," Select only those lines containing matches that form whole words.  The test is that the matching substring must either be at the beginning of the line, or preceded by a non-
word constituent character.  Similarly, it must be either at the end of the line or followed by a non-word constituent character.  Word-constituent characters  are  letters,
digits, and the underscore."]
- ["x","--line-regexp","Select only those matches that exactly match the whole line."]
*/
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var $ = require("../utils/optionsParser");
var GraphModule = require("../../common/graph");
var parserModule = require("../utils/parserData");
var common = require("./_init");

var selectors = {
    patternType: {
        name: "pattern type",
        description: "define the pattern to filter",
        options: {
            extRegex: {
                name: "extended regexp",
                option: "E",
                type: 'option',
                description: 'use pattern as an extended regular expression'
            },
            fixedStrings: {
                name: "fixed strings",
                option: "F",
                type: 'option',
                description: 'use pattern as a set of expressions separated by lines'
            },
            basicRegex: {
                name: "basic regexp",
                option: null,
                type: 'option',
                description: 'use pattern as a basic regular expression',
                default: true
            }
        }
    },
    match: {
        name: "match",
        description: "",
        options: {
            default: {
                name: "default",
                option: null,
                type: 'option',
                description: 'do not force the pattern to filter complete words or lines',
                default: true
            },
            word: {
                name: "whole word",
                option: "F",
                type: 'option',
                description: 'force the pattern to filter complete words'
            },
            line: {
                name: "whole line",
                option: null,
                type: 'option',
                description: 'force the pattern to filter complete lines'
            }
        }
    }
};

var flags = {
    ignoreCase: {
        name: "ignore case",
        option: 'T',
        description: "print TAB characters like ^I",
        active: false
    },
    invertMatch: {
        name: "invert match",
        option: 'E',
        description: "print $ after each line",
        active: false
    }
};

var optionsParser = {
    shortOptions: {
        E: $.select(selectors.patternType, selectors.patternType.options.extRegex),
        F: $.select(selectors.patternType, selectors.patternType.options.fixedStrings),
        G: $.select(selectors.patternType, selectors.patternType.options.basicRegex),
        i: $.switchOn(flags.ignoreCase),
        //P  :  $.select(selectors.patternType, patternTypeSelector.perlRegex),
        v: $.switchOn(flags.invertMatch),
        x: $.select(selectors.match, selectors.match.options.line),
        w: $.selectIfUnselected(selectors.match.name, selectors.match.options.word.name, selectors.match.options.line.name),
        y: $.switchOn(flags.ignoreCase)
    },
    longOptions: {
        "extended-regexp": $.sameAs("E"),
        "fixed-strings": $.sameAs("F"),
        "basic-regexp": $.sameAs("G"),
        "perl-regexp": $.sameAs("P"),
        "ignore-case": $.sameAs("i"),
        "invert-match": $.sameAs("v"),
        "word-regexp": $.sameAs("w"),
        "line-regexp": $.sameAs("x")
    }
};
$.generate(optionsParser);

var config = {
    selectors: selectors,
    flags: flags
};

var grepCommandData = new parserModule.ParserData(config);

var GrepComponent = (function (_super) {
    __extends(GrepComponent, _super);
    function GrepComponent() {
        _super.apply(this, arguments);
        this.exec = "grep";
        this.files = [];
        this.pattern = null;
    }
    return GrepComponent;
})(GraphModule.CommandComponent);
exports.GrepComponent = GrepComponent;

function defaultComponentData() {
    var graph = new GrepComponent();
    graph.selectors = grepCommandData.componentSelectors;
    graph.flags = grepCommandData.componentFlags;
    return graph;
}
;

exports.parseCommand = common.commonParseCommand(optionsParser, defaultComponentData, {
    string: function (component, str) {
        if (component.pattern === null) {
            component.pattern = str || "";
        } else {
            return "continue";
        }
    }
});

exports.parseComponent = common.commonParseComponent(grepCommandData.flagOptions, grepCommandData.selectorOptions, null, function (component, exec, flags, files) {
    var pattern = component.pattern || "";
    pattern = (pattern.indexOf(" ") >= 0) ? '"' + pattern + '"' : pattern;

    //console.error(pattern + " - " + files.length );
    //console.error(!!pattern + " - " + !!files.length );
    if (pattern && files.length) {
        return exec.concat(flags, pattern, files).join(' ');
    } else if (pattern) {
        return exec.concat(flags, pattern, files).join(' ');
    } else if (files.length) {
        return exec.concat(flags, '""', files).join(' ');
    } else
        return exec.concat(flags).join(' ');
});

exports.VisualSelectorOptions = grepCommandData.visualSelectorOptions;
exports.componentClass = GrepComponent;
//# sourceMappingURL=grep.js.map

},{"../../common/graph":4,"../utils/optionsParser":26,"../utils/parserData":27,"./_init":6}],16:[function(require,module,exports){
/*
-d --decompress     force decompression
-z --compress       force compression
-k --keep           keep (don't delete) input files
-f --force          overwrite existing output files
-t --test           test compressed file integrity
-c --stdout         output to standard out
-q --quiet          suppress noncritical error messages
-v --verbose        be verbose (a 2nd -v gives more)
-s --small          use less memory (at most 2500k)
-1 .. -9            set block size to 100k .. 900k
--fast              alias for -1
--best              alias for -9
*/
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var $ = require("../utils/optionsParser");
var parserModule = require("../utils/parserData");
var common = require("./_init");
var GraphModule = require("../../common/graph");

var flags = {
    keep: {
        name: "keep files",
        option: 'k',
        longOption: 'keep',
        description: "keep (don't delete) input files",
        active: false
    },
    force: {
        name: "force",
        option: 'f',
        longOption: 'force',
        description: "overwrite existing output files",
        active: false
    },
    quiet: {
        name: "quiet",
        option: 'q',
        longOption: 'quiet',
        description: "suppress noncritical error messages",
        active: false
    },
    verbose: {
        name: "verbose",
        option: 'v',
        longOption: 'verbose',
        description: "overwrite existing output files",
        active: false
    },
    recursive: {
        name: "recursive",
        longOption: 'recursive',
        option: 'v',
        description: "overwrite existing output files",
        active: false
    }
};

var config = {
    flags: flags
};

var optionsParser = $.optionParserFromConfig(config);
var gunzipData = new parserModule.ParserData(config);

$.generate(optionsParser);

var GunzipComponent = (function (_super) {
    __extends(GunzipComponent, _super);
    function GunzipComponent() {
        _super.apply(this, arguments);
        this.exec = "gunzip";
        this.files = [];
    }
    return GunzipComponent;
})(GraphModule.CommandComponent);
exports.GunzipComponent = GunzipComponent;

function defaultComponentData() {
    var component = new GunzipComponent();
    component.selectors = gunzipData.componentSelectors;
    component.flags = gunzipData.componentFlags;
    return component;
}
;
exports.parseCommand = common.commonParseCommand(optionsParser, defaultComponentData);
exports.parseComponent = common.commonParseComponent(gunzipData.flagOptions, gunzipData.selectorOptions);
exports.VisualSelectorOptions = gunzipData.visualSelectorOptions;
exports.componentClass = GunzipComponent;
//# sourceMappingURL=gunzip.js.map

},{"../../common/graph":4,"../utils/optionsParser":26,"../utils/parserData":27,"./_init":6}],17:[function(require,module,exports){
/*
-d --decompress     force decompression
-z --compress       force compression
-k --keep           keep (don't delete) input files
-f --force          overwrite existing output files
-t --test           test compressed file integrity
-c --stdout         output to standard out
-q --quiet          suppress noncritical error messages
-v --verbose        be verbose (a 2nd -v gives more)
-s --small          use less memory (at most 2500k)
-1 .. -9            set block size to 100k .. 900k
--fast              alias for -1
--best              alias for -9
*/
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var $ = require("../utils/optionsParser");
var GraphModule = require("../../common/graph");
var parserModule = require("../utils/parserData");
var common = require("./_init");

var selectors = {
    ratio: {
        name: 'ratio',
        description: 'compress ratio of the algorithm',
        options: {
            1: {
                name: '1 - fast',
                option: '1',
                longOption: 'fast',
                description: 'compress the received data'
            },
            2: {
                name: '2',
                option: '2',
                description: 'decompress the received data'
            },
            3: {
                name: '3',
                option: '3',
                description: 'decompress the received data'
            },
            4: {
                name: '4',
                option: '4',
                description: 'decompress the received data'
            },
            5: {
                name: '5',
                option: '5',
                description: 'decompress the received data'
            },
            6: {
                name: '6',
                option: '6',
                description: 'decompress the received data',
                default: true
            },
            7: {
                name: '7',
                option: '7',
                description: 'decompress the received data'
            },
            8: {
                name: '8',
                option: '8',
                description: 'decompress the received data'
            },
            9: {
                name: '9 - best',
                option: '9',
                longOption: 'best',
                description: 'decompress the received data'
            }
        }
    }
};

var flags = {
    keep: {
        name: "keep files",
        option: 'k',
        longOption: 'keep',
        description: "keep (don't delete) input files",
        active: false
    },
    force: {
        name: "force",
        option: 'f',
        longOption: 'force',
        description: "overwrite existing output files",
        active: false
    },
    test: {
        name: "test",
        option: 't',
        longOption: 'test',
        description: "test compressed file integrity",
        active: false
    },
    stdout: {
        name: "stdout",
        option: 'c',
        longOption: 'stdout',
        description: "output to standard out",
        active: false
    },
    quiet: {
        name: "quiet",
        option: 'q',
        longOption: 'quiet',
        description: "suppress noncritical error messages",
        active: false
    },
    verbose: {
        name: "verbose",
        option: 'v',
        longOption: 'verbose',
        description: "overwrite existing output files",
        active: false
    },
    recursive: {
        name: "recursive",
        longOption: 'recursive',
        option: 'v',
        description: "overwrite existing output files",
        active: false
    },
    small: {
        name: "small",
        longOption: 'small',
        option: 's',
        description: "use less memory (at most 2500k)",
        active: false
    }
};

var config = {
    selectors: selectors,
    flags: flags
};

var gzipData = new parserModule.ParserData(config);
var optionsParser = $.optionParserFromConfig(config);

var GZipComponent = (function (_super) {
    __extends(GZipComponent, _super);
    function GZipComponent() {
        _super.apply(this, arguments);
        this.exec = "gzip";
        this.files = [];
    }
    return GZipComponent;
})(GraphModule.CommandComponent);
exports.GZipComponent = GZipComponent;

function defaultComponentData() {
    var component = new GZipComponent();
    component.selectors = gzipData.componentSelectors;
    component.flags = gzipData.componentFlags;
    return component;
}
;

exports.parseCommand = common.commonParseCommand(optionsParser, defaultComponentData);
exports.parseComponent = common.commonParseComponent(gzipData.flagOptions, gzipData.selectorOptions);
exports.VisualSelectorOptions = gzipData.visualSelectorOptions;
exports.componentClass = GZipComponent;
//# sourceMappingURL=gzip.js.map

},{"../../common/graph":4,"../utils/optionsParser":26,"../utils/parserData":27,"./_init":6}],18:[function(require,module,exports){
/*
-c, --bytes=[-]K         print the first K bytes of each file;
with the leading '-', print all but the last
K bytes of each file
-n, --lines=[-]K         print the first K lines instead of the first 10;
with the leading '-', print all but the last
K lines of each file
-q, --quiet, --silent    nuncar mostrar cabeçalhos com nomes de ficheiros
-v, --verbose            mostrar sempre cabeçalhos com nomes de ficheiros
*/
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var $ = require("../utils/optionsParser");
var parserModule = require("../utils/parserData");
var common = require("./_init");
var GraphModule = require("../../common/graph");

var selectors = {
    showHeaders: {
        name: 'show headers',
        description: 'show headers with file name',
        options: {
            default: {
                name: 'default',
                type: 'option',
                option: null,
                description: 'default: show headers only if tailing multiple files',
                default: true
            },
            always: {
                name: 'always',
                option: "v",
                longOption: "verbose",
                type: 'option',
                description: 'always show headers'
            },
            never: {
                name: 'never',
                type: 'option',
                option: "q",
                longOption: ['quiet', 'silent'],
                description: 'no not show headers'
            }
        }
    },
    NumOf: {
        name: 'first',
        description: 'define if first number of lines or bytes',
        options: {
            lines: {
                name: 'lines',
                type: 'numeric parameter',
                option: "n",
                default: true,
                defaultValue: 10
            },
            bytes: {
                name: 'bytes',
                type: 'numeric parameter',
                option: "b",
                defaultValue: 10
            }
        }
    }
};

var config = {
    selectors: selectors
};

var headData = new parserModule.ParserData(config);

var optionsParser = $.optionParserFromConfig(config);

var lsCommandData = new parserModule.ParserData(config);

var HeadComponent = (function (_super) {
    __extends(HeadComponent, _super);
    function HeadComponent() {
        _super.apply(this, arguments);
        this.exec = "head";
        this.files = [];
    }
    return HeadComponent;
})(GraphModule.CommandComponent);
exports.HeadComponent = HeadComponent;

function defaultComponentData() {
    var component = new HeadComponent();
    component.selectors = headData.componentSelectors;
    component.flags = headData.componentFlags;
    return component;
}
;

exports.parseCommand = common.commonParseCommand(optionsParser, defaultComponentData);
exports.parseComponent = common.commonParseComponent(headData.flagOptions, headData.selectorOptions);
exports.VisualSelectorOptions = headData.visualSelectorOptions;
exports.componentClass = HeadComponent;
//# sourceMappingURL=head.js.map

},{"../../common/graph":4,"../utils/optionsParser":26,"../utils/parserData":27,"./_init":6}],19:[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var $ = require("../utils/optionsParser");
var parserModule = require("../utils/parserData");
var common = require("./_init");
var GraphModule = require("../../common/graph");

var selectors = {
    sort: {
        name: "sort",
        description: "select attribute to sort",
        options: {
            name: {
                name: 'name',
                option: null,
                type: 'option',
                description: 'sort entries by name',
                default: true
            },
            noSort: {
                name: "do not sort",
                option: "U",
                type: 'option',
                description: 'do not sort'
            },
            extension: {
                name: "extension",
                option: "X",
                type: 'option',
                description: 'always show headers'
            },
            size: {
                name: "size",
                option: "S",
                type: 'option',
                description: 'always show headers'
            },
            time: {
                name: "time",
                option: "v",
                type: 'option',
                description: 'always show headers'
            },
            version: {
                name: "version",
                option: "v",
                type: 'option',
                description: 'always show headers'
            }
        }
    },
    format: {
        name: "format",
        description: "select attribute to sort",
        options: {
            default: {
                name: 'default',
                option: null,
                type: 'option',
                description: 'always show headers',
                default: true
            },
            commas: {
                name: "commas",
                option: "m",
                type: 'option',
                description: 'always show headers'
            },
            long: {
                name: "long",
                option: "l",
                type: 'option',
                description: 'always show headers'
            }
        }
    },
    show: {
        name: "show",
        description: "select attribute to sort",
        options: {
            default: {
                name: 'default',
                option: null,
                type: 'option',
                description: 'always show headers',
                default: true
            },
            all: {
                name: "all",
                option: "a",
                type: 'option',
                description: 'always show headers'
            },
            almostAll: {
                name: "almost all",
                option: "A",
                type: 'option',
                description: 'always show headers'
            }
        }
    },
    indicatorStyle: {
        name: "indicator style",
        description: "select attribute to sort",
        options: {
            none: {
                name: 'none',
                option: null,
                type: 'option',
                description: 'always show headers',
                default: true
            },
            slash: {
                name: "slash",
                option: "p",
                type: 'option',
                description: 'always show headers'
            },
            classify: {
                name: "classify",
                option: "F",
                type: 'option',
                description: 'always show headers'
            },
            fileType: {
                name: "file type",
                option: "--file-type",
                type: 'option',
                description: 'always show headers'
            }
        }
    },
    timeStyle: {
        name: "time style",
        description: "select attribute to sort",
        options: {
            full_ISO: {
                name: 'full-iso',
                option: '--time-style=full-iso',
                type: 'option',
                description: 'always show headers'
            },
            long_ISO: {
                name: "long-iso",
                option: "--time-style=long-iso",
                type: 'option',
                description: 'always show headers'
            },
            ISO: {
                name: "iso",
                option: "--time-style=long-iso",
                type: 'option',
                description: 'always show headers'
            },
            locale: {
                name: "locale",
                option: null,
                type: 'option',
                description: 'always show headers',
                default: true
            },
            format: {
                name: "format",
                option: null,
                type: 'parameter',
                defaultValue: '',
                description: 'always show headers'
            }
        }
    },
    quotingStyle: {
        name: "quoting style",
        description: "select attribute to sort",
        options: {
            literal: {
                name: 'literal',
                option: null,
                type: 'option',
                description: 'always show headers',
                default: true
            },
            locale: {
                name: "locale",
                option: "--quoting-style=locale",
                type: 'option',
                description: 'always show headers'
            },
            shell: {
                name: "shell",
                option: "--quoting-style=shell",
                type: 'option',
                description: 'always show headers'
            },
            shellAlways: {
                name: "shell-always",
                option: "--quoting-style=shell-always",
                type: 'option',
                description: 'always show headers'
            },
            c: {
                name: "c",
                option: "--quoting-style=c",
                type: 'option',
                description: 'always show headers'
            },
            escape: {
                name: "escape",
                option: "--quoting-style=escape",
                type: 'option',
                description: 'always show headers'
            }
        }
    }
};

var flags = {
    reverse: {
        name: "reverse",
        option: 'T',
        description: "print TAB characters like ^I",
        active: false
    },
    context: {
        name: "context",
        option: 'E',
        description: "print $ after each line",
        active: false
    },
    inode: {
        name: "inode",
        option: 'v',
        description: "use ^ and M- notation, except for LFD and TAB",
        active: false
    },
    humanReadable: {
        name: "human readable",
        option: 's',
        description: "suppress repeated empty output lines",
        active: false
    },
    ignoreBackups: {
        name: "ignore backups",
        option: 's',
        description: "suppress repeated empty output lines",
        active: false
    },
    noPrintOwner: {
        name: "do not list owner",
        option: 's',
        description: "suppress repeated empty output lines",
        active: false
    },
    noPrintGroup: {
        name: "do not list group",
        option: 's',
        description: "suppress repeated empty output lines",
        active: false
    },
    numericID: {
        name: "numeric ID",
        option: 's',
        description: "suppress repeated empty output lines",
        active: false
    }
};

var parameters = {
    ignore: {
        name: 'ignore',
        option: 'I',
        type: "string",
        description: "filter entries by anything other than the content",
        defaultValue: ""
    }
};

var config = {
    selectors: selectors,
    flags: flags,
    parameters: parameters
};

var optionsParser = $.optionParserFromConfig(config);
var shortOptions = optionsParser.shortOptions;

function extend(option, additional) {
    for (var i in additional) {
        option[i] = additional[i];
    }
}

extend(optionsParser.shortOptions, {
    c: $.ignore,
    C: $.ignore,
    d: $.ignore,
    D: $.ignore,
    f: $.ignore,
    H: $.ignore,
    i: $.ignore,
    I: $.setParameter(parameters.ignore.name),
    k: $.ignore,
    L: $.ignore,
    N: $.ignore,
    o: $.ignore,
    q: $.ignore,
    Q: $.ignore,
    R: $.ignore,
    s: $.ignore,
    T: $.ignore,
    u: $.ignore,
    w: $.ignore,
    x: $.ignore,
    1: $.ignore
});

extend(optionsParser.longOptions, {
    "all": $.sameAs('a'),
    "almost-all": $.sameAs('A'),
    "escape": $.sameAs('b'),
    "directory": $.sameAs('d'),
    "classify": $.sameAs('F'),
    "no-group": $.sameAs('G'),
    "human-readable": $.sameAs('h'),
    "inode": $.sameAs('i'),
    "kibibytes": $.sameAs('k'),
    "dereference": $.sameAs('l'),
    "numeric-uid-gid": $.sameAs('n'),
    "literal": $.sameAs('N'),
    "indicator-style=slash": $.sameAs('p'),
    "hide-control-chars": $.sameAs('q'),
    "quote-name": $.sameAs('Q'),
    "reverse": $.sameAs('r'),
    "recursive": $.sameAs('R'),
    "size": $.sameAs('S'),
    "context": $.sameAs('Z')
});

$.generate(optionsParser);

var lsCommandData = new parserModule.ParserData(config);

var LsComponent = (function (_super) {
    __extends(LsComponent, _super);
    function LsComponent() {
        _super.apply(this, arguments);
        this.exec = "ls";
        this.files = [];
    }
    return LsComponent;
})(GraphModule.CommandComponent);
exports.LsComponent = LsComponent;

function defaultComponentData() {
    var component = new LsComponent();
    component.selectors = lsCommandData.componentSelectors;
    component.flags = lsCommandData.componentFlags;
    component.parameters = lsCommandData.componentParameters;
    return component;
}
;

exports.parseCommand = common.commonParseCommand(optionsParser, defaultComponentData);
exports.parseComponent = common.commonParseComponent(lsCommandData.flagOptions, lsCommandData.selectorOptions, lsCommandData.parameterOptions);
exports.VisualSelectorOptions = lsCommandData.visualSelectorOptions;
exports.componentClass = LsComponent;
//# sourceMappingURL=ls.js.map

},{"../../common/graph":4,"../utils/optionsParser":26,"../utils/parserData":27,"./_init":6}],20:[function(require,module,exports){
/*
-c, --bytes=[-]K         print the first K bytes of each file;
with the leading '-', print all but the last
K bytes of each file
-n, --lines=[-]K         print the first K lines instead of the first 10;
with the leading '-', print all but the last
K lines of each file
-q, --quiet, --silent    nuncar mostrar cabeçalhos com nomes de ficheiros
-v, --verbose            mostrar sempre cabeçalhos com nomes de ficheiros
*/
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var $ = require("../utils/optionsParser");
var parserModule = require("../utils/parserData");
var common = require("./_init");
var GraphModule = require("../../common/graph");

var selectors = {
    showHeaders: {
        name: 'show headers',
        description: 'show headers with file name',
        options: {
            default: {
                name: 'default',
                type: 'option',
                option: null,
                description: 'default: show headers only if tailing multiple files',
                default: true
            },
            always: {
                name: 'always',
                option: "v",
                longOption: "verbose",
                type: 'option',
                description: 'always show headers'
            },
            never: {
                name: 'never',
                type: 'option',
                option: "q",
                longOption: ['quiet', 'silent'],
                description: 'no not show headers'
            }
        }
    },
    NumOf: {
        name: 'last',
        description: 'define if last number of lines or bytes',
        options: {
            lines: {
                name: 'lines',
                type: 'numeric parameter',
                option: "n",
                default: true,
                defaultValue: 10
            },
            bytes: {
                name: 'bytes',
                type: 'numeric parameter',
                option: "b",
                defaultValue: 10
            }
        }
    }
};

var config = {
    selectors: selectors
};

var tailData = new parserModule.ParserData(config);

var optionsParser = $.optionParserFromConfig(config);

var TailComponent = (function (_super) {
    __extends(TailComponent, _super);
    function TailComponent() {
        _super.apply(this, arguments);
        this.exec = "tail";
        this.files = [];
    }
    return TailComponent;
})(GraphModule.CommandComponent);
exports.TailComponent = TailComponent;

function defaultComponentData() {
    var component = new TailComponent();
    component.selectors = tailData.componentSelectors;
    component.flags = tailData.componentFlags;
    return component;
}
;

exports.parseCommand = common.commonParseCommand(optionsParser, defaultComponentData);
exports.parseComponent = common.commonParseComponent(tailData.flagOptions, tailData.selectorOptions);
exports.VisualSelectorOptions = tailData.visualSelectorOptions;
exports.componentClass = TailComponent;
//# sourceMappingURL=tail.js.map

},{"../../common/graph":4,"../utils/optionsParser":26,"../utils/parserData":27,"./_init":6}],21:[function(require,module,exports){
var $ = require("./_init");
var GraphModule = require("../../common/graph");
var Graph = GraphModule.Graph;
var Boundary = GraphModule.Boundary;
var Connection = GraphModule.Connection;

/**
Arranges the nodes using a hierarchical layout
*/
function arrangeLayout(previousCommand, boundaries) {
    var maxX = 0;
    var minY = previousCommand.position.y - (boundaries.length - 1) * 250;
    if (minY < 0) {
        previousCommand.position.y -= minY;
        minY = 0;
    }
    var prevBound = null;
    var translateX = previousCommand.position.x + 500;
    boundaries.forEach(function (boundary) {
        var translateY = prevBound ? prevBound.bottom - boundary.top : minY;
        boundary.translateXY(translateX, translateY);
        prevBound = boundary;
    });
}
function connector(parser, previousCommand, result, boundaries, tracker) {
    return function (commandList) {
        var subresult = parser.parseAST(commandList, tracker);
        boundaries.push(Boundary.createFromComponents(subresult.components));
        result.components = result.components.concat(subresult.components);
        result.connections = result.connections.concat(subresult.connections);
        result.connections.push(new Connection(previousCommand, "output", subresult.firstMainComponent, 'input'));
    };
}

function parseCommand(argsNode, parser, tracker, previousCommand, nextcommands, firstMainComponent, components, connections) {
    var boundaries, i$, len$, argNode;
    boundaries = [];

    var result = new Graph();
    result.firstMainComponent = firstMainComponent;
    result.components = components;
    result.connections = connections;

    var connectTo = connector(parser, previousCommand[1], result, boundaries, tracker);
    for (i$ = 0, len$ = argsNode.length; i$ < len$; ++i$) {
        argNode = argsNode[i$];
        if ($.typeOf(argNode) == 'outToProcess') {
            connectTo(argNode[1]);
        }
    }
    if (nextcommands.length) {
        connectTo(nextcommands);
    }
    arrangeLayout(previousCommand[1], boundaries);
    result.counter = tracker.id;
    return result;
}
exports.parseCommand = parseCommand;
;
//# sourceMappingURL=tee.js.map

},{"../../common/graph":4,"./_init":6}],22:[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var $ = require("../utils/optionsParser");
var GraphModule = require("../../common/graph");
var parserModule = require("../utils/parserData");
var common = require("./_init");

var flags = {
    complement: {
        name: "complement",
        option: 'c',
        longOption: 'show-tabs',
        description: "use SET1 complemet",
        active: false
    },
    delete: {
        name: "delete",
        option: 'd',
        longOption: 'delete',
        description: "delete characters in SET1, do not translate",
        active: false
    },
    squeeze: {
        name: "squeeze repeats",
        option: 's',
        longOption: 'squeeze-repeats',
        description: "replace each input sequence of a repeated character that is  listed  in  SET1 with a single occurrence of that character",
        active: false
    },
    truncate: {
        name: "truncate set1",
        option: 't',
        longOption: 'truncate-set1',
        description: "suppress repeated empty output lines",
        active: false
    }
};

var config = {
    flags: flags
};

var bzipData = new parserModule.ParserData(config);

var optionsParser = $.optionParserFromConfig(config);

var shortOptions = optionsParser.shortOptions;
shortOptions['C'] = $.switchOn(flags.complement);

var TrComponent = (function (_super) {
    __extends(TrComponent, _super);
    function TrComponent() {
        _super.apply(this, arguments);
        this.exec = "tr";
        this.set1 = "";
        this.set2 = "";
    }
    return TrComponent;
})(GraphModule.CommandComponent);
exports.TrComponent = TrComponent;

function defaultComponentData() {
    var component = new TrComponent();
    component.selectors = bzipData.componentSelectors;
    component.flags = bzipData.componentFlags;
    return component;
}
;

exports.parseCommand = common.commonParseCommand(optionsParser, defaultComponentData, {
    string: function (component, str) {
        if (component.set1 == "") {
            component.set1 = str;
        } else {
            component.set2 = str;
        }
        ;
    }
});
exports.parseComponent = common.commonParseComponent(bzipData.flagOptions, bzipData.selectorOptions, bzipData.parameterOptions, function (component, exec, flags, files) {
    return exec.concat(flags, component.set1, component.set2).join(' ');
});
exports.VisualSelectorOptions = bzipData.visualSelectorOptions;
exports.componentClass = TrComponent;
//# sourceMappingURL=tr.js.map

},{"../../common/graph":4,"../utils/optionsParser":26,"../utils/parserData":27,"./_init":6}],23:[function(require,module,exports){
/*
-d --decompress     force decompression
-z --compress       force compression
-k --keep           keep (don't delete) input files
-f --force          overwrite existing output files
-t --test           test compressed file integrity
-c --stdout         output to standard out
-q --quiet          suppress noncritical error messages
-v --verbose        be verbose (a 2nd -v gives more)
-s --small          use less memory (at most 2500k)
-1 .. -9            set block size to 100k .. 900k
--fast              alias for -1
--best              alias for -9
*/
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var $ = require("../utils/optionsParser");
var parserModule = require("../utils/parserData");
var common = require("./_init");
var GraphModule = require("../../common/graph");

var flags = {
    keep: {
        name: "keep files",
        option: 'k',
        longOption: 'keep',
        description: "keep (don't delete) input files",
        active: false
    },
    force: {
        name: "force",
        option: 'f',
        longOption: 'force',
        description: "overwrite existing output files",
        active: false
    },
    quiet: {
        name: "quiet",
        option: 'q',
        longOption: 'quiet',
        description: "suppress noncritical error messages",
        active: false
    },
    verbose: {
        name: "verbose",
        option: 'v',
        longOption: 'verbose',
        description: "overwrite existing output files",
        active: false
    },
    recursive: {
        name: "recursive",
        longOption: 'recursive',
        option: 'v',
        description: "overwrite existing output files",
        active: false
    }
};

var config = {
    flags: flags
};

var optionsParser = $.optionParserFromConfig(config);
var zcatData = new parserModule.ParserData(config);

var ZcatComponent = (function (_super) {
    __extends(ZcatComponent, _super);
    function ZcatComponent() {
        _super.apply(this, arguments);
        this.exec = "zcat";
        this.files = [];
    }
    return ZcatComponent;
})(GraphModule.CommandComponent);
exports.ZcatComponent = ZcatComponent;

function defaultComponentData() {
    var component = new ZcatComponent();
    component.selectors = zcatData.componentSelectors;
    component.flags = zcatData.componentFlags;
    return component;
}
;

exports.parseCommand = common.commonParseCommand(optionsParser, defaultComponentData);
exports.parseComponent = common.commonParseComponent(zcatData.flagOptions, zcatData.selectorOptions);
exports.VisualSelectorOptions = zcatData.visualSelectorOptions;
exports.componentClass = ZcatComponent;
//# sourceMappingURL=zcat.js.map

},{"../../common/graph":4,"../utils/optionsParser":26,"../utils/parserData":27,"./_init":6}],24:[function(require,module,exports){
var parser = {};

var astBuilder = require('./ast-builder/ast-builder');

var GraphModule = require("../common/graph");
var Graph = GraphModule.Graph;
exports.Graph = Graph;
var Macro = GraphModule.Macro;
exports.Macro = Macro;
var GraphComponent = GraphModule.GraphComponent;
exports.GraphComponent = GraphComponent;
var MacroComponent = GraphModule.MacroComponent;
exports.MacroComponent = MacroComponent;
var Component = GraphModule.Component;
exports.Component = Component;
var Connection = GraphModule.Connection;
exports.Connection = Connection;
var FileComponent = GraphModule.FileComponent;
exports.FileComponent = FileComponent;
var CommandComponent = GraphModule.CommandComponent;
exports.CommandComponent = CommandComponent;
var IndexedGraph = GraphModule.IndexedGraph;
exports.IndexedGraph = IndexedGraph;

var parserCommand = {
    awk: require('./commands/awk'),
    cat: require('./commands/cat'),
    date: require('./commands/date'),
    ls: require('./commands/ls'),
    grep: require('./commands/grep'),
    bunzip2: require('./commands/bunzip2'),
    diff: require('./commands/diff'),
    bzcat: require('./commands/bzcat'),
    bzip2: require('./commands/bzip2'),
    compress: require('./commands/compress'),
    gzip: require('./commands/gzip'),
    gunzip: require('./commands/gunzip'),
    zcat: require('./commands/zcat'),
    head: require('./commands/head'),
    tail: require('./commands/tail'),
    tr: require('./commands/tr'),
    tee: require('./commands/tee')
};

var implementedCommands = [];

exports.VisualSelectorOptions = {};
for (var key in parserCommand) {
    implementedCommands.push(key);
    exports.VisualSelectorOptions[key] = parserCommand[key].VisualSelectorOptions;
}

function isImplemented(command) {
    return parserCommand[command] != null;
}
;

/**
* Parses the syntax of the command and
* transforms into an Abstract Syntax Tree
* @param command command
* @return the resulting AST
*/
function generateAST(command) {
    return astBuilder.parse(command);
}
exports.generateAST = generateAST;

/**
* Parses the Abstract Syntax Tree
* and transforms it to a graph representation format
* that can be used in the visual application
*
* @param ast - the Abstract Syntax Tree
* @param tracker - and tracker the tracks the id of a component
* @return the visual representation of the object
*/
function parseAST(ast, tracker) {
    if (typeof tracker === "undefined") { tracker = { id: 0 }; }
    var LastCommandComponent, CommandComponent, exec, args, result_aux, result, comp, firstMainComponent;

    var graph = new exports.Graph();
    var components = graph.components;
    var connections = graph.connections;
    var firstMainComponent = null;
    LastCommandComponent = null;
    CommandComponent = null;
    for (var index = 0, _ref = ast, length = _ref.length; index < length; ++index) {
        var commandNode = _ref[index];
        exec = commandNode.exec, args = commandNode.args;
        var nodeParser = parserCommand[exec];
        if (nodeParser.parseCommand) {
            if (exec === 'tee') {
                return nodeParser.parseCommand(args, parser, tracker, LastCommandComponent, ast.slice(index + 1), firstMainComponent, components, connections);
            }
            result_aux = nodeParser.parseCommand(args, parser, tracker, LastCommandComponent);

            result = (result_aux instanceof Array) ? result_aux[1] : result_aux;

            components = components.concat(result.components);
            connections = connections.concat(result.connections);
            CommandComponent = result.firstMainComponent;
            if (LastCommandComponent) {
                comp = LastCommandComponent instanceof Array ? LastCommandComponent[1] : LastCommandComponent;
                var connection = new GraphModule.Connection(comp, 'output', CommandComponent, 'input');
                connections.push(connection);
            }
            LastCommandComponent = (result_aux instanceof Array) ? [result_aux[0], CommandComponent] : CommandComponent;
            if (index < 1) {
                firstMainComponent = CommandComponent;
            }
        }
    }

    graph.connections = connections;
    graph.components = components;
    graph.firstMainComponent = firstMainComponent;
    graph.counter = tracker.id;
    return graph;
}
exports.parseAST = parseAST;

/**
* parses the command
*/
function parseCommand(command) {
    return exports.parseAST(exports.generateAST(command));
}
exports.parseCommand = parseCommand;

function parseVisualData(VisualData) {
    var indexedComponentList, initialComponent;
    if (VisualData.components.length < 1) {
        return '';
    }
    indexedComponentList = new exports.IndexedGraph(VisualData);
    initialComponent = VisualData.firstMainComponent;
    if (!(initialComponent instanceof exports.CommandComponent)) {
        var ref = VisualData.components;
        for (var i = 0, len = ref.length; i < len; ++i) {
            if (ref[i] instanceof exports.CommandComponent) {
                initialComponent = ref[i];
                break;
            }
        }
    }
    return exports.parseVisualDatafromComponent(initialComponent, VisualData, indexedComponentList, {});
}
exports.parseVisualData = parseVisualData;

function parseComponent(component, visualData, componentIndex, mapOfParsedComponents) {
    switch (component.type) {
        case exports.CommandComponent.type:
            return parserCommand[component.exec].parseComponent(component, visualData, componentIndex, mapOfParsedComponents);
        case exports.MacroComponent.type:
            return exports.parseVisualData(component.macro);
    }
}
exports.parseComponent = parseComponent;

/**
find the first component to be parsed
*/
function findFirstComponent(currentComponent, visualData, componentIndex, mapOfParsedComponents) {
    do {
        var isFirst = visualData.connections.every(function (connection) {
            if (connection.endComponent == currentComponent && connection.startPort === 'output' && connection.endPort === 'input' && mapOfParsedComponents[connection.startNode] !== true) {
                currentComponent = componentIndex.components[connection.startNode];
                return false;
            }
            return true;
        });
    } while(isFirst == false);
    return currentComponent;
}
exports.findFirstComponent = findFirstComponent;

/**
Parse visual data from Component
*/
function parseVisualDatafromComponent(currentComponent, visualData, componentIndex, mapOfParsedComponents) {
    var commands = [];
    currentComponent = exports.findFirstComponent(currentComponent, visualData, componentIndex, mapOfParsedComponents);
    var parsedCommand = exports.parseComponent(currentComponent, visualData, componentIndex, mapOfParsedComponents);
    var parsedCommandIndex = commands.length;
    commands.push(parsedCommand);

    var outputs = [];
    var stdErrors = [];
    var exitCodes = [];

    visualData.connections.filter(function (connection) {
        return connection.startNode === currentComponent.id && mapOfParsedComponents[connection.endNode] !== true;
    }).forEach(function (connection) {
        var endNodeId = connection.endNode;
        var endNode = componentIndex.components[endNodeId];
        switch (connection.startPort) {
            case 'output':
                outputs.push(endNode);
                break;
            case 'error':
                stdErrors.push(endNode);
                break;
            case 'retcode':
                exitCodes.push(endNode);
                break;
        }
    });

    var parselist = function (list) {
        var result = [];
        for (var index = 0, length = list.length; index < length; ++index) {
            var component = list[index];
            if (component.type === exports.FileComponent.type)
                result.push(component.filename);
            else {
                result.push(exports.parseVisualDatafromComponent(component, visualData, componentIndex, mapOfParsedComponents));
            }
        }
        return result;
    };

    var nextcommands = parselist(outputs);
    var nextErrcommands = parselist(stdErrors);
    var nextExitcommands = parselist(exitCodes);

    var teeResultArray = function (components, compiledComponents) {
        var comm = ["tee"];
        compiledComponents.forEach(function (compiledComponent, index) {
            if (components[index].type === exports.FileComponent.type) {
                comm.push(compiledComponent);
            } else {
                comm.push(">((" + compiledComponent + ") &> /dev/null )");
            }
        });
        return comm;
    };

    function teeResult(components, compiledComponents) {
        return teeResultArray(components, compiledComponents).join(" ");
    }

    if (nextcommands.length > 1) {
        var comm = teeResultArray(outputs, nextcommands);
        comm.pop();
        commands.push(comm.join(" "));
        commands.push(nextcommands[nextcommands.length - 1]);
    } else if (nextcommands.length === 1) {
        if (outputs[0].type === exports.FileComponent.type) {
            commands[parsedCommandIndex] += " > " + outputs[0].filename;
        } else {
            commands.push(nextcommands[0]);
        }
    }

    if (nextErrcommands.length > 1) {
        comm = teeResult(stdErrors, nextErrcommands);
        commands[parsedCommandIndex] += " 2> >((" + comm + ") &> /dev/null )";
    } else if (nextErrcommands.length === 1) {
        if (stdErrors[0].type === exports.FileComponent.type) {
            commands[parsedCommandIndex] += " 2> " + stdErrors[0].filename;
        } else {
            commands[parsedCommandIndex] += " 2> >((" + nextErrcommands[0] + ") &> /dev/null )";
        }
    }

    if (nextExitcommands.length > 1) {
        comm = teeResult(exitCodes, nextExitcommands);
        commands[parsedCommandIndex] = "(" + commands[parsedCommandIndex] + "; (echo $? | " + comm + " &> /dev/null)";
    } else if (nextExitcommands.length === 1) {
        if (exitCodes[0].type === exports.FileComponent.type) {
            commands[parsedCommandIndex] = "(" + commands[parsedCommandIndex] + "; (echo $? > " + exitCodes[0].filename + "))";
        } else {
            commands[parsedCommandIndex] = "(" + commands[parsedCommandIndex] + "; (echo $? | " + nextExitcommands[0] + ") &> /dev/null)";
        }
    }

    return commands.join(" | ");
}
exports.parseVisualDatafromComponent = parseVisualDatafromComponent;

function createMacro(name, description, command, fromMacro) {
    if (fromMacro) {
        return exports.Macro.fromGraph(name, description, exports.cloneGraph(fromMacro));
    } else if (command) {
        return exports.Macro.fromGraph(name, description, exports.parseCommand(command));
    } else
        return new exports.Macro(name, description);
}
exports.createMacro = createMacro;
;

/**
Creates a component based on the first word of the content
if the first word contains dots, create a file
if the first word is a command creates a command component instead
*/
function createComponentDinamicText(text) {
    if (text === "") {
        return null;
    }
    var words = text.replace("\n", " ").split(" ");
    var firstWord = words[0];
    if (firstWord.indexOf(".") > -1) {
        return new exports.FileComponent(text);
    } else if (isImplemented(firstWord)) {
        return exports.parseCommand(text).components[0];
    } else
        return null;
}
exports.createComponentDinamicText = createComponentDinamicText;

function graphFromJson(json) {
    return exports.graphFromJsonObject(JSON.parse(json));
}
exports.graphFromJson = graphFromJson;

function graphFromJsonObject(jsonObj) {
    var newGraph = new exports.Graph();
    var componentMap = {};
    for (var i in jsonObj) {
        newGraph[i] = jsonObj[i];
    }
    var components = [];
    jsonObj.components.forEach(function cloneComponent(component) {
        var newComponent;
        switch (component.type) {
            case exports.CommandComponent.type:
                newComponent = new parserCommand[component.exec].componentClass;
                break;
            case exports.FileComponent.type:
                newComponent = new exports.FileComponent(component.filename);
                break;
        }

        /* istanbul ignore next */
        if (!newComponent) {
            return;
        }

        for (var i in component) {
            newComponent[i] = component[i];
        }
        componentMap[newComponent.id] = newComponent;
        components.push(newComponent);
    });
    newGraph.components = components;
    newGraph.connections = [];
    jsonObj.connections.forEach(function connectCreatedComponents(connection) {
        newGraph.connect(componentMap[connection.startNode], connection.startPort, componentMap[connection.endNode], connection.endPort);
    });
    newGraph.firstMainComponent = componentMap[newGraph.firstMainComponent];
    return newGraph;
}
exports.graphFromJsonObject = graphFromJsonObject;

function cloneGraph(graph) {
    var json = JSON.stringify(graph);
    return exports.graphFromJson(json);
}
exports.cloneGraph = cloneGraph;

parser.generateAST = exports.generateAST;
parser.parseAST = exports.parseAST;
parser.astBuilder = astBuilder;
parser.parseCommand = exports.parseCommand;
parser.parseComponent = exports.parseComponent;
parser.implementedCommands = implementedCommands;
parser.parseVisualData = exports.parseVisualData;
exports.parseGraph = exports.parseVisualData;
//# sourceMappingURL=parser.js.map

},{"../common/graph":4,"./ast-builder/ast-builder":5,"./commands/awk":7,"./commands/bunzip2":8,"./commands/bzcat":9,"./commands/bzip2":10,"./commands/cat":11,"./commands/compress":12,"./commands/date":13,"./commands/diff":14,"./commands/grep":15,"./commands/gunzip":16,"./commands/gzip":17,"./commands/head":18,"./commands/ls":19,"./commands/tail":20,"./commands/tee":21,"./commands/tr":22,"./commands/zcat":23}],25:[function(require,module,exports){
(function (val) {
    val.shellParser = require("./parser");
})(window);
//# sourceMappingURL=shellParser.js.map

},{"./parser":24}],26:[function(require,module,exports){
var Iterator = (function () {
    function Iterator(ArgList) {
        this.index = 0;
        this.argList = ArgList;
        this.length = ArgList.length;
        this.current = ArgList[0];
    }
    Iterator.prototype.hasNext = function () {
        return this.index !== this.length;
    };
    Iterator.prototype.next = function () {
        return this.current = this.argList[this.index++];
    };
    Iterator.prototype.rest = function () {
        return this.argList.slice(this.index);
    };
    return Iterator;
})();
exports.Iterator = Iterator;

function parseShortOptions(options, componentData, argsNodeIterator) {
    var option, shortOptions = options.shortOptions, iter = new Iterator(argsNodeIterator.current.slice(1));
    while (option = iter.next()) {
        var arg = shortOptions[option];
        if (arg && arg(componentData, argsNodeIterator, iter)) {
            break;
        }
    }
}
exports.parseShortOptions = parseShortOptions;

exports.parseLongOptions = function (options, componentData, argsNodeIterator) {
    var longOptions, optionStr, indexOfSep, iter, optionKey, arg;
    longOptions = options.longOptions;
    optionStr = argsNodeIterator.current.slice(2);
    indexOfSep = optionStr.indexOf('=');
    if (indexOfSep > -1) {
        iter = new Iterator(optionStr);
        iter.index = indexOfSep + 1;
        optionKey = optionStr.slice(0, indexOfSep);
        arg = longOptions[optionKey] || longOptions[optionStr];
        if (arg) {
            return arg(componentData, argsNodeIterator, iter);
        }
    } else {
        arg = longOptions[optionStr];
        if (arg) {
            return arg(componentData);
        }
    }
};

/**
activates flags (flags)
*/
exports.switchOn = function () {
    var flags = [];
    for (var _i = 0; _i < (arguments.length - 0); _i++) {
        flags[_i] = arguments[_i + 0];
    }
    flags = flags.map(function (flag) {
        return (flag.name) ? flag.name : flag;
    });
    return function (Component, state, substate) {
        flags.forEach(function (flag) {
            Component.flags[flag] = true;
        });
        return false;
    };
};

/**
set parameter (param)
*/
exports.setParameter = function (param) {
    var paramFn = function (Component, state, substate) {
        var hasNext = substate.hasNext();
        var parameter = hasNext ? substate.rest() : state.next();
        Component.parameters[param] = parameter;
        return true;
    };
    paramFn;
    paramFn.ptype = 'param';
    paramFn.param = param;
    return paramFn;
};


function select(key, value, type) {
    if (typeof type === "undefined") { type = "option"; }
    if (key.name) {
        key = key.name;
    }
    if (value.name) {
        value = value.name;
    }
    if (type == "option") {
        return function (Component) {
            Component.selectors[key] = {
                type: type,
                name: value
            };
        };
    } else if (type == "numeric parameter") {
        return function (Component, state, substate) {
            var parameter = substate.hasNext() ? substate.rest() : state.next();
            Component.selectors[key] = {
                type: type,
                name: value,
                value: +parameter
            };
        };
    }
}
exports.select = select;
;

exports.selectIfUnselected = function (key, value) {
    var selections = [];
    for (var _i = 0; _i < (arguments.length - 2); _i++) {
        selections[_i] = arguments[_i + 2];
    }
    if (key.name) {
        key = key.name;
    }
    if (value.name) {
        value = value.name;
    }
    selections = selections.map(function (val) {
        return val.name || val;
    });
    return function (Component) {
        var selectorValue = Component.selectors[key].name;
        if (selections.every(function (value) {
            return selectorValue !== value;
        })) {
            Component.selectors[key] = {
                type: "option",
                name: value
            };
        }
    };
};

/**
function to ignore errors when using this option
*/
function ignore() {
}
exports.ignore = ignore;
;

exports.sameAs = function (option) {
    return ['same', option];
};

function generate(parser) {
    var key, val;
    var longOptions = parser.longOptions, shortOptions = parser.shortOptions;
    for (key in longOptions) {
        val = longOptions[key];
        if (val[0] === 'same') {
            longOptions[key] = shortOptions[val[1]];
        }
    }
}
exports.generate = generate;

function optionParserFromConfig(config) {
    var longOptions = {};
    var shortOptions = {};
    var opt;

    for (var key in config.flags || {}) {
        var flag = config.flags[key];
        opt = exports.switchOn(flag);
        shortOptions[flag.option] = opt;
        if (flag.longOption) {
            if (flag.longOption instanceof Array) {
                flag.longOption.forEach(function (option) {
                    return longOptions[option] = opt;
                });
            } else {
                longOptions[flag.longOption] = opt;
            }
        }
    }
    for (var key in config.selectors || {}) {
        var selector = config.selectors[key];
        var options = selector.options;
        for (var optionkey in options) {
            var option = options[optionkey];
            opt = exports.select(selector, option, option.type);
            if (option.option) {
                if (option.option[0] === "-") {
                    longOptions[option.option.slice(2)] = opt;
                } else {
                    shortOptions[option.option] = opt;
                }
            }
            if (option.longOption) {
                if (option.longOption instanceof Array) {
                    option.longOption.forEach(function (option) {
                        return longOptions[option] = opt;
                    });
                } else {
                    longOptions[option.longOption] = opt;
                }
            }
        }
    }

    return {
        longOptions: longOptions,
        shortOptions: shortOptions
    };
}
exports.optionParserFromConfig = optionParserFromConfig;
//# sourceMappingURL=optionsParser.js.map

},{}],27:[function(require,module,exports){
/**
CompilerData gives information to be used
to compile the AST to a data repersentation
of a command
There are 6 types of options
simple string:
a simple argument, each command treats them differently
selection:
there exists a list of arguments that the command will choose
one of them to use, if no selection argument is added the command uses the default one
parameters:
an argument that includes a parameter
numeric paramters:
an argument that includes a parameter that is limited to numbers
selection with parameters:
a selection argument which one or more of them is a parameter
flags:
a flag in the command
*/
var ParserData = (function () {
    function ParserData(config) {
        this.selectors = {};
        this.selectorOptions = {};
        this.visualSelectorOptions = {};
        this.parameterOptions = {};
        this.shortOptions = {};
        this.longOptions = {};
        this.flagOptions = {};
        this.setFlags(config.flags);
        this.setParameters(config.parameters);
        this.setSelector(config.selectors);
    }
    ParserData.prototype.setFlags = function (flags) {
        if (typeof flags === "undefined") { flags = {}; }
        this.flags = flags;
        var flagOptions = (this.flagOptions = {});
        for (var key in flags) {
            var value = flags[key];
            flagOptions[value.name] = value.option;
        }
    };

    ParserData.prototype.setParameters = function (parameters) {
        if (typeof parameters === "undefined") { parameters = {}; }
        this.parameters = parameters;
        var parameterOptions = this.parameterOptions;
        for (var key in parameters) {
            var value = parameters[key];
            parameterOptions[value.name] = value.option;
        }
    };

    /**
    Generates data to be used in selection tasks
    */
    ParserData.prototype.setSelector = function (selectorData) {
        if (typeof selectorData === "undefined") { selectorData = {}; }
        this.selectorData = selectorData;
        var selectors = this.selectors;
        var selectorOptions = this.selectorOptions;
        var visualSelectorOptions = this.visualSelectorOptions;
        var regexToReplace = / /g;

        for (var key in selectorData) {
            var subkeys = selectorData[key];
            var keySelector = selectors[subkeys.name] = {};
            var keySelectorOption = selectorOptions[subkeys.name] = {};
            var VisualSelectorOption = visualSelectorOptions[subkeys.name] = [];

            for (var subkey in subkeys.options) {
                var value = subkeys.options[subkey];
                keySelector[value.name] = value;
                keySelectorOption[value.name] = value.option;
                VisualSelectorOption.push(value.name);
            }
        }

        visualSelectorOptions.$selector = selectors;

        /* istanbul ignore next */
        visualSelectorOptions.$changeToValue = function (currSelector, key, value) {
            var toChange = selectors[key][value];
            currSelector.name = toChange.name;
            currSelector.type = toChange.type;
            if (currSelector.value && toChange.type === "option") {
                delete currSelector.value;
            } else if (!currSelector.value && toChange.type !== "option" && toChange.defaultValue) {
                currSelector.value = toChange.defaultValue;
            }
        };
        return this;
    };

    Object.defineProperty(ParserData.prototype, "componentFlags", {
        /**
        Sets the options for the normal options
        of a command, normally a one character option
        */
        //public setShortOptions(options){
        //  this.shortOptions = options
        //}
        /**
        Sets the options for the long variants of the options
        of a command, normally a an argument prefixed with 2
        hypens
        */
        //public setLongOptions(options){
        //  this.longOptions = options
        //}
        get: function () {
            var componentFlags = {};
            var flags = this.flags;
            for (var key in flags) {
                var value = flags[key];
                componentFlags[value.name] = value.active;
            }
            return componentFlags;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(ParserData.prototype, "componentSelectors", {
        get: function () {
            var componentSelectors = {};
            var selectorData = this.selectorData;
            for (var key in selectorData) {
                var value = selectorData[key];
                for (var optionName in value.options) {
                    var option = value.options[optionName];
                    if (option.default) {
                        var valueObj = {
                            name: option.name,
                            type: option.type || "option"
                        };
                        if (option.defaultValue) {
                            valueObj['value'] = option.defaultValue;
                        }
                        componentSelectors[value.name] = valueObj;
                        break;
                    }
                }
            }
            return componentSelectors;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(ParserData.prototype, "componentParameters", {
        get: function () {
            var componentParameters = {};
            var parameters = this.parameters;
            for (var key in parameters) {
                var value = parameters[key];
                componentParameters[value.name] = value.defaultValue || "";
            }
            return componentParameters;
        },
        enumerable: true,
        configurable: true
    });
    return ParserData;
})();
exports.ParserData = ParserData;

(function (SelectorOptionType) {
    SelectorOptionType[SelectorOptionType["OPTION"] = 0] = "OPTION";
    SelectorOptionType[SelectorOptionType["PARAMETER"] = 1] = "PARAMETER";
    SelectorOptionType[SelectorOptionType["NUMERIC_PARAMETER"] = 2] = "NUMERIC_PARAMETER";
})(exports.SelectorOptionType || (exports.SelectorOptionType = {}));
var SelectorOptionType = exports.SelectorOptionType;
//# sourceMappingURL=parserData.js.map

},{}]},{},[25])