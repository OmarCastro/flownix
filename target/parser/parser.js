var parser = {};

var astBuilder = require('./ast-builder/ast-builder');

var GraphModule = require("../common/graph");
var Graph = GraphModule.Graph;
exports.Graph = Graph;
var GraphComponent = GraphModule.GraphComponent;
exports.GraphComponent = GraphComponent;
var Component = GraphModule.Component;
exports.Component = Component;
var Connection = GraphModule.Connection;
exports.Connection = Connection;
var FileComponent = GraphModule.FileComponent;
exports.FileComponent = FileComponent;
var CommandComponent = GraphModule.CommandComponent;
exports.CommandComponent = CommandComponent;

var parserCommand = {
    awk: require('./commands/awk'),
    cat: require('./commands/cat'),
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

            result = null;
            if (result_aux instanceof Array) {
                result = result_aux[1];
            } else {
                result = result_aux;
            }
            components = components.concat(result.components);
            connections = connections.concat(result.connections);
            CommandComponent = result.firstMainComponent;
            if (LastCommandComponent) {
                comp = LastCommandComponent instanceof Array ? LastCommandComponent[1] : LastCommandComponent;
                var connection = new GraphModule.Connection(comp, 'output', CommandComponent, 'input');
                connections.push(connection);
            }
            if (result_aux instanceof Array) {
                LastCommandComponent = [result_aux[0], CommandComponent];
            } else {
                LastCommandComponent = CommandComponent;
            }
            if (index < 1) {
                firstMainComponent = CommandComponent.id;
            }
        }
    }

    graph.connections = connections;
    graph.components = components;
    graph.firstMainComponent = firstMainComponent;
    graph.counter = tracker.id;
    return graph;
}

/**
* parses the command
*/
function parseCommand(command) {
    return parseAST(generateAST(command));
}

/**
* Creates an index of the components
*/
function indexComponents(visualData) {
    var result = {};
    for (var i = 0, _ref = visualData.components, length = _ref.length; i < length; ++i) {
        var value = _ref[i];
        result[value.id] = value;
    }
    return result;
}
;

function parseVisualData(VisualData) {
    var indexedComponentList, initialComponent;
    if (VisualData.components.length < 1) {
        return '';
    }
    indexedComponentList = indexComponents(VisualData);
    initialComponent = indexedComponentList[VisualData.firstMainComponent];
    if (!initialComponent) {
        return '';
    }
    return parseVisualDatafromComponent(initialComponent, VisualData, indexedComponentList, {});
}

function parseComponent(component, visualData, componentIndex, mapOfParsedComponents) {
    switch (component.type) {
        case 'command':
            return parserCommand[component.exec].parseComponent(component, visualData, componentIndex, mapOfParsedComponents, parseVisualDatafromComponent);
        case 'subgraph':
            return compileMacro(component.macro);
        default:
            return '';
    }
}

/**
Parse visual data from Component
*/
function parseVisualDatafromComponent(currentComponent, visualData, componentIndex, mapOfParsedComponents) {
    var isFirst, i$, ref$, len$, connection, parsedCommand, parsedCommandIndex, endNodeId, j$, ref1$, len1$, component, endNode, comm, to$, i, command;
    var commands = [];
    do {
        isFirst = true;

        for (i$ = 0, len$ = (ref$ = visualData.connections).length; i$ < len$; ++i$) {
            connection = ref$[i$];
            if (connection.endNode === currentComponent.id && connection.startPort === 'output' && connection.endPort === 'input' && mapOfParsedComponents[connection.startNode] !== true) {
                isFirst = false;
                currentComponent = componentIndex[connection.startNode];
                break;
            }
        }
    } while(isFirst = false);

    parsedCommand = parseComponent(currentComponent, visualData, componentIndex, mapOfParsedComponents);
    parsedCommandIndex = commands.length;
    commands.push(parsedCommand);

    var outputs = [];
    var stdErrors = [];
    var exitCodes = [];

    visualData.connections.filter(function (connection) {
        return connection.startNode === currentComponent.id && mapOfParsedComponents[connection.endNode] !== true;
    }).forEach(function (connection) {
        endNodeId = connection.endNode;
        endNode = componentIndex[endNodeId];
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
            if (component.type === "file")
                result.push(component.filename);
            else {
                result.push(parseVisualDatafromComponent(component, visualData, componentIndex, mapOfParsedComponents));
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
            if (components[index].type) {
                comm.push(compiledComponent);
            } else {
                comm.push(">((" + compiledComponent + ") &> /dev/null )");
            }
        });
        return comm;
    };

    var teeResult = function (components, compiledComponents) {
        return teeResultArray(components, compiledComponents).join(" ");
    };

    if (nextcommands.length > 1) {
        comm = teeResultArray(outputs, nextcommands);
        comm.pop();
        commands.push(comm.join(" "));
        commands.push(nextcommands[nextcommands.length - 1]);
    } else if (nextcommands.length === 1) {
        if (outputs[0].type === 'file') {
            commands[parsedCommandIndex] += " > " + outputs[0].filename;
        } else {
            commands.push(nextcommands[0]);
        }
    }

    if (nextErrcommands.length > 1) {
        comm = teeResult(outputs, nextcommands);
        commands[parsedCommandIndex] += " 2> >((" + comm + ") &> /dev/null )";
    } else if (nextErrcommands.length === 1) {
        if (stdErrors[0].type === 'file') {
            commands[parsedCommandIndex] += " 2> " + stdErrors[0].filename;
        } else {
            commands[parsedCommandIndex] += " 2> >((" + nextErrcommands[0] + ") &> /dev/null )";
        }
    }

    if (nextExitcommands.length > 1) {
        comm = teeResult(outputs, nextcommands);
        commands[parsedCommandIndex] = "(" + commands[parsedCommandIndex] + "; (echo $? | " + comm + " &> /dev/null)";
    } else if (nextExitcommands.length === 1) {
        if (exitCodes[0].type === 'file') {
            commands[parsedCommandIndex] = "(" + commands[parsedCommandIndex] + "; (echo $? > " + exitCodes[0].filename + ")";
        } else {
            commands[parsedCommandIndex] = "(" + commands[parsedCommandIndex] + "; (echo $? | " + nextExitcommands[0] + ") &> /dev/null)";
        }
    }

    return commands.join(" | ");
}

function createMacro(name, description, command, fromMacro) {
    if (fromMacro) {
        var result = JSON.parse(JSON.stringify(fromMacro));
        result.name = name;
        result.description = description;
        return result;
    }
    var macroData = new exports.GraphComponent(name, description);
    if (command) {
        macroData.setGraphData(parseCommand(command));
    }
    return macroData;
}
exports.createMacro = createMacro;
;

function compileMacro(macro) {
    var indexedComponentList, initialComponent;
    console.log("compling Macro");
    if (macro.entryComponent === null) {
        throw "no component defined as Macro Entry";
    }
    indexedComponentList = indexComponents(macro);
    initialComponent = indexedComponentList[macro.entryComponent];
    return parseVisualDatafromComponent(initialComponent, macro.VisualData, indexedComponentList, {});
}

parser.generateAST = exports.generateAST = generateAST;
parser.parseAST = exports.parseAST = parseAST;
parser.astBuilder = exports.astBuilder = astBuilder;
parser.parseCommand = exports.parseCommand = parseCommand;
parser.parseComponent = exports.parseComponent = parseComponent;
parser.implementedCommands = exports.implementedCommands = implementedCommands;
parser.parseVisualData = exports.parseVisualData = parseVisualData;
//# sourceMappingURL=parser.js.map