(function() {
    'use strict';

    window.Editor = {};
    var glslTokenString;
    var glslTokenStream;
    Editor.init = function() {
        glslTokenString = require('glsl-tokenizer/string');
        glslTokenStream = require('glsl-tokenizer/stream');
    };
})();
