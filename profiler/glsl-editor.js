(function() {
    'use strict';

    window.Editor = {};

    Editor.init = function() {
    };

    Editor.test = function(fs) {
        var parser = new GLSLParser();
        var ast = parser.parse(fs);
        console.log(ast);
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
