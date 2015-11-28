(function() {
    'use strict';

    var parser = new GLSLParser();

    var rgxStart = /#pragma profile start ([0-9])*/;
    var rgxEnd   = /#pragma profile end ([0-9])*/;

    var rgxVec   = /vec[1-4]/;

    window.Editor = {};

    Editor.init = function() {
    };

    var modifyStatement = function(stmt) {
    };

    /*
     * @param nodelist 
     * @return the list of 
     */
    var processNodeList = function(nodelist) {
        var variations = [];
        var regex = rgxStart;
        var inPragma = false;
        for (var i = 0; i < nodelist.length; i++) {
            var node = nodelist[i];
            var name = node.nodeName;
            if (name === "PreprocessorDirective" && node.content.match(regex)) {
                inPragma = !inPragma;
                if (inPragma) {
                } else {
                }
            } else if (name === "FunctionDefinition") {
                // Recurse into function definitions.
                var funcNodeStmts = node.body.statementList;
                processNodeList(funcNodeStmts);
            } else if (inPragma === true && name === "DeclarationStatement") {
                var type = node.declaration.typeSpecifier.dataType[0].toLowerCase();

                var decl = node.declaration.declarators[0];
                var initializer = decl.initializer;
                var varName = decl.name;

                if (initializer.nodeName == "FunctionCall") {
                    var func = initializer.name;
                    if (type.match(rgxVec)) {
                        var newDecl = sprintf("%s %s = %s(0);", type, varName, type);
                        var newNode = parser.parse(newDecl).declarations[0];
                        node.declaration = newNode;
                    }
                } else if (initializer.nodeName == "Constructor") {
                }
            }
        }
    };

    Editor.editShader = function(fs) {
        var ast = parser.parse(fs);
        var astDecls = ast.declarations;
        //console.log(astDecls);
        processNodeList(astDecls);
        return parser.printAST(ast);
    };

    Editor.naiveModifyFragmentShader = function(fs, modifier) {
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
