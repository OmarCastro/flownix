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

exports.parserCommand = {
    awk: require('./commands/awk'),
    cat: require('./commands/cat'),
    curl: require('./commands/curl'),
    date: require('./commands/date'),
    diff: require('./commands/diff'),
    bunzip2: require('./commands/bunzip2'),
    bzcat: require('./commands/bzcat'),
    bzip2: require('./commands/bzip2'),
    grep: require('./commands/grep'),
    ls: require('./commands/ls'),
    //compress: require('./commands/compress'),
    sort: require('./commands/sort'),
    gzip: require('./commands/gzip'),
    gunzip: require('./commands/gunzip'),
    zcat: require('./commands/zcat'),
    head: require('./commands/head'),
    tail: require('./commands/tail'),
    tr: require('./commands/tr'),
    tee: require('./commands/tee')
};

exports.implementedCommands = [];

exports.VisualSelectorOptions = {};
for (var key in exports.parserCommand) {
    exports.implementedCommands.push(key);
    exports.VisualSelectorOptions[key] = exports.parserCommand[key].VisualSelectorOptions;
}

function isImplemented(command) {
    return exports.parserCommand[command] != null;
}
exports.isImplemented = isImplemented;
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
        var nodeParser = exports.parserCommand[exec];
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

function aux_parseVisualDataExperimental(VisualData, fifoPrepend) {
    fifoPrepend = fifoPrepend || "/tmp/fifo-";

    var fifos = [];
    var commands = [];
    var retOutputs = [];
    var IndexedGraph = {
        inConnectedComponent: {},
        outConnectedComponent: {}
    };
    VisualData.components.forEach(function (component) {
        IndexedGraph.inConnectedComponent[component.id] = {
            list: [],
            byPortList: {}
        };
        IndexedGraph.outConnectedComponent[component.id] = {
            list: [],
            byPortList: {}
        };
    });

    VisualData.connections.forEach(function (connection) {
        var sNode = IndexedGraph.outConnectedComponent[connection.startNode];
        sNode.list.push(connection);
        var sPortList = sNode.byPortList[connection.startPort];
        if (sPortList instanceof Array) {
            sPortList.push(connection);
        } else {
            sNode.byPortList[connection.startPort] = [connection];
        }

        var eNode = IndexedGraph.inConnectedComponent[connection.endNode];
        eNode.list.push(connection);
        var ePortList = eNode.byPortList[connection.endPort];
        if (ePortList instanceof Array) {
            ePortList.push(connection);
        } else {
            eNode.byPortList[connection.endPort] = [connection];
        }
    });

    VisualData.components.forEach(function (component) {
        var portList = IndexedGraph.inConnectedComponent[component.id];
        var byPortList = portList.byPortList;
        var keys = Object.keys(byPortList);
        keys.forEach(function (port) {
            var connections = byPortList[port];

            if (connections.length > 1) {
                for (var i = connections.length - 1; i >= 0; i--) {
                    var fifo = port + "-" + i;
                    connections[i].endPort = fifo;
                    fifos.push(fifoPrepend + component.id + "-" + fifo);
                }
            } else
                fifos.push(fifoPrepend + component.id + "-" + port);
        });
    });

    VisualData.components.forEach(function (component) {
        var afterCommand = "";
        var outConnection = IndexedGraph.outConnectedComponent[component.id];
        var outConnections = outConnection.list;
        var inConnection = IndexedGraph.inConnectedComponent[component.id];
        var inByPort = inConnection.byPortList;
        var len = outConnections.length;

        switch (component.type) {
            case exports.CommandComponent.type:
                var outputs = outConnection.byPortList["output"];
                var errors = outConnection.byPortList["error"];
                var retcodes = outConnection.byPortList["retcode"];

                if (component["files"]) {
                    var files = component["files"];
                    component["files"] = files.map(function (file, idx) {
                        var connections = inByPort["file" + idx];
                        if (!connections)
                            return "-";
                        else if (connections.length > 1) {
                            var fifo = fifoPrepend + component.id + "-file" + idx;
                            commands.push("find " + fifo + "-* | xargs grep -h --line-buffered ^ > " + fifo);
                            return fifo;
                        } else
                            return fifoPrepend + component.id + "-file" + idx;
                    });
                }
                var parsedExec = exports.parserCommand[component["exec"]].parseComponent(component, {}, {}, {});

                if (errors && errors.length) {
                    if (errors.length > 1) {
                        var newfifo = fifoPrepend + component.id + "-stderr";
                        fifos.push(newfifo);

                        var len = errors.length - 1;

                        var newcommand = "tee < " + newfifo;
                        for (var i = 0; i < len; ++i) {
                            var value = errors[i];
                            newcommand += " " + fifoPrepend + value.endNode + "-" + value.endPort;
                        }
                        newcommand += " > " + fifoPrepend + errors[len].endNode + "-" + errors[len].endPort;
                        parsedExec += " 2> " + newfifo;
                        commands.push(newcommand);
                    } else {
                        parsedExec += " 2> " + fifoPrepend + errors[0].endNode + "-" + errors[0].endPort;
                    }
                }

                if (outputs && outputs.length) {
                    if (outputs.length > 1) {
                        var len = outputs.length - 1;
                        parsedExec += " | tee";
                        for (var i = 0; i < len; ++i) {
                            var value = outputs[i];
                            parsedExec += " " + fifoPrepend + value.endNode + "-" + value.endPort;
                        }
                        parsedExec += " > " + fifoPrepend + outputs[len].endNode + "-" + outputs[len].endPort;
                    } else {
                        parsedExec += " > " + fifoPrepend + outputs[0].endNode + "-" + outputs[0].endPort;
                    }
                }

                if (retcodes && retcodes.length) {
                    var newcommand = "; echo $?";
                    var len = retcodes.length - 1;

                    if (len > 0) {
                        newcommand += " | tee";
                        for (var i = 0; i < len; ++i) {
                            var value = retcodes[i];
                            newcommand += " " + fifoPrepend + value.endNode + "-" + value.endPort;
                        }
                    }
                    newcommand += " > " + fifoPrepend + retcodes[len].endNode + "-" + retcodes[len].endPort;
                    parsedExec = "(" + parsedExec + newcommand + ")";
                }

                if (inByPort["input"]) {
                    var fifo = fifoPrepend + component.id + "-input";
                    var len = inByPort["input"].length;
                    if (len > 1) {
                        parsedExec = "find " + fifo + "-* | xargs -P" + len + " grep -h --line-buffered ^ | " + parsedExec;
                    } else if (parsedExec.indexOf(" ") < 0) {
                        parsedExec += " < " + fifo;
                    } else {
                        parsedExec = parsedExec.replace(" ", " < " + fifo + " ");
                    }
                }

                return commands.push(parsedExec);

            case exports.MacroComponent.type:
                var result = exports.aux_parseVisualDataExperimental(component["macro"], fifoPrepend + component.id + "-");
                fifos = fifos.concat(result.fifos);
                commands = commands.concat(result.commands);
                if (result.outputs) {
                    result.outputs.forEach(function (output) {
                        var command = "tee < " + output.fifo;
                        var connections = outConnection.byPortList[output.port];
                        if (connections && connections.length) {
                            var len = connections.length - 1;
                            for (var i = 0; i < len; ++i) {
                                var value = connections[i];
                                command += " " + fifoPrepend + value.endNode + "-" + value.endPort;
                            }
                            command += " > " + fifoPrepend + connections[len].endNode + "-" + connections[len].endPort;
                        }
                        commands.push(command);
                    });
                }

                return;

            case exports.FileComponent.type:
                if (inByPort["input"]) {
                    var fifo = fifoPrepend + component.id + "-input";
                    var len = inByPort["input"].length;
                    if (len > 1) {
                        commands.push("find " + fifo + "-* | xargs -P" + len + " grep -h --line-buffered ^ >  " + component["filename"]);
                    } else
                        commands.push("cat " + fifo + " > " + component["filename"]);
                } else if (inByPort["append"]) {
                    var fifo = fifoPrepend + component.id + "-append";
                    var len = inByPort["append"].length;
                    if (len > 1) {
                        commands.push("find " + fifo + "-* | xargs -P" + len + " grep -h --line-buffered ^ >>  " + component["filename"]);
                    } else
                        commands.push("cat " + fifo + " >> " + component["filename"]);
                } else if (outConnections && outConnections.length > 0) {
                    parsedExec = "pv -f " + component["filename"];
                    var len = outConnections.length - 1;
                    if (len > 0) {
                        parsedExec += " | tee";
                        for (var i = 0; i < len; ++i) {
                            var value = outConnections[i];
                            parsedExec += " " + fifoPrepend + value.endNode + "-" + value.endPort;
                        }
                    }
                    parsedExec += " > " + fifoPrepend + outConnections[len].endNode + "-" + outConnections[len].endPort;
                    commands.push(parsedExec);
                }
                return;
            case "input":
                component["ports"].forEach(function (port, index) {
                    var portName = "macroIn" + index;
                    var connections = outConnection.byPortList[portName];
                    var command = "tee < " + fifoPrepend + portName;
                    if (connections && connections.length) {
                        var len = connections.length - 1;
                        if (len > 0) {
                            for (var i = 0; i < len; ++i) {
                                var value = connections[i];
                                command += " " + fifoPrepend + value.endNode + "-" + value.endPort;
                            }
                        } else {
                            command += " > " + fifoPrepend + connections[len].endNode + "-" + connections[len].endPort;
                        }
                    } else {
                        command += " > /dev/null";
                    }
                    commands.push(command);
                });
                return;
            case "output":
                component["ports"].forEach(function (port, index) {
                    var portName = "macroOut" + index;
                    var newFifo = fifoPrepend + portName;
                    var fifo = fifoPrepend + component.id + "-" + portName;
                    fifos.push(newFifo);
                    retOutputs.push({ fifo: newFifo, port: portName });
                    var connections = inConnection.byPortList[portName];
                    if (connections && connections.length) {
                        var len = connections.length;
                        if (len > 1) {
                            commands.push("find " + fifo + "-* | xargs -P" + len + " grep -h --line-buffered ^ > " + newFifo);
                        } else {
                            commands.push("cat " + fifo + " > " + newFifo);
                        }
                    } else {
                        commands.push("echo '' > " + newFifo);
                    }
                });
                return;
                console.log("..component...", JSON.stringify(component));
        }
    });

    return {
        fifos: fifos,
        commands: commands,
        outputs: retOutputs
    };
}
exports.aux_parseVisualDataExperimental = aux_parseVisualDataExperimental;

function parseVisualDataExperimental(VisualData, fifoPrepend) {
    var escapeSingleQuote = function (commandString) {
        return commandString.split("'").join("'\"'\"'");
    };
    var result = exports.aux_parseVisualDataExperimental(VisualData, fifoPrepend);
    var mkfifos = ["mkfifo"].concat(result.fifos).join(" ");
    var result_commands = result.commands.map(function (command) {
        return "echo '" + escapeSingleQuote(command) + "' >> /tmp/sHiveExec.sh";
    });
    var real_commands = [mkfifos].concat(result_commands, ["timeout 10 parallel < /tmp/sHiveExec.sh -uj " + result_commands.length + " --halt 2"]).join("\n");
    var pretty_printed_commands = [mkfifos].concat(result.commands.map(function (c) {
        return c + " &";
    })).join("\n");
    return {
        commands: real_commands,
        pretty: pretty_printed_commands
    };
}
exports.parseVisualDataExperimental = parseVisualDataExperimental;

function parseVisualData(VisualData) {
    if (VisualData.components.filter(function (component) {
        return component.type == exports.CommandComponent.type;
    }).length < 1) {
        return '';
    }
    var indexedComponentList = new exports.IndexedGraph(VisualData);
    var initialComponent = VisualData.firstMainComponent;
    if (!(initialComponent instanceof exports.CommandComponent)) {
        var ref = VisualData.components;
        for (var i = 0, len = ref.length; i < len; ++i) {
            if (ref[i].type == exports.CommandComponent.type) {
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
            return exports.parserCommand[component.exec].parseComponent(component, visualData, componentIndex, mapOfParsedComponents);
        case exports.MacroComponent.type:
            return exports.parseGraph(component.macro);
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
    } else if (exports.isImplemented(firstWord)) {
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
                newComponent = new exports.parserCommand[component.exec].componentClass;
                break;
            case exports.FileComponent.type:
                newComponent = new exports.FileComponent(component.filename);
                break;
            case exports.MacroComponent.type:
                var subgraph = exports.graphFromJsonObject(component.macro);
                console.log(subgraph.components);
                console.log(subgraph.connections);
                newComponent = new exports.MacroComponent(subgraph);
            case "input":
            case "output":
                newComponent = component;
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
parser.implementedCommands = exports.implementedCommands;
parser.parseVisualData = exports.parseVisualData;
exports.parseGraph = exports.parseVisualData;