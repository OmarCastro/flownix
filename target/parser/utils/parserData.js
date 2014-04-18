var ParserData = (function () {
    function ParserData(config) {
        if (typeof config === "undefined") { config = {}; }
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

    ParserData.prototype.setShortOptions = function (options) {
        this.shortOptions = options;
    };

    ParserData.prototype.setLongOptions = function (options) {
        this.longOptions = options;
    };

    Object.defineProperty(ParserData.prototype, "componentFlags", {
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
                        console.log(key);
                        var valueObj = {
                            name: option.name,
                            type: option.type
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
