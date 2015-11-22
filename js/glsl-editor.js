(function() {
    'use strict';

    window.Editor = {};
    var glslTokenString;
    var glslParser;

    Editor.init = function() {
        glslTokenString = require('glsl-tokenizer/string');
        glslParser = require('glsl-parser/direct');
    };

    Editor.test = function(shader) {
        //console.log(shader);
        var tokens = glslTokenString(shader);
        var ast = glslParser(tokens);
        // TODO: how to catch errors?
        console.log(ast);
        for (var i = 0; i < ast.length; i++) {
            var node = ast[i];
            console.log(node.token, node.type, node.children.length);
        }
        debugger;
    };

    Editor.naiveModifyFragmentShader = function(fs, modifier) {
        Editor.test(fs);
        var fsLines = fs.split('\n');
        var remove = false;
        var regexStart = /\/\/\/ START (\d)/;
        var regexEnd = /\/\/\/ END (\d)/;
        for (var i = 0; i < fsLines.length; i++) {
            var line = fsLines[i];

            var resultStart = line.match(regexStart);
            if (resultStart !== null && resultStart.length == 2) {
                if (modifier != resultStart[1]) {
                    remove = true;
                }
            }

            if (remove === true) {
                fsLines[i] = "";
                var resultStop = line.match(regexEnd);
                if (resultStop && resultStop.length == 2) {
                    if (modifier != resultStop[1]) {
                        remove = false;
                    }
                }
            }
        }
        return fsLines.join('\n');
};
})();
