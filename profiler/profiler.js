(function() {
    window.Profiler = {};

    var mousePos;

    var getMousePos = function(canvas, evt) {
        var rect = canvas.getBoundingClientRect();
        return {
          x: evt.clientX - rect.left,
          y: evt.clientY - rect.top
        };
    }

    var hijack = function(that, name, wrap) {
        var f0 = that[name];
        that[name] = function() {
            var f = function() {
                f0.apply(that, arguments);
            };
            var args = Array.prototype.slice.call(arguments);
            args.unshift(f);
            return wrap.apply(null, args);
        };
    };

    Profiler.init = function() {
        mousePos = {"x": 0, "y":0};

        canvas = document.getElementById('canvas');

        // Mouse movement listener: update mousePos and write to screen
        canvas.addEventListener('mousemove', function(evt) {
            mousePos = getMousePos(canvas, evt);

            $("#mouse_pos").text('Mouse position: ' + Math.round(mousePos.x) +
                                 ',' + Math.round(mousePos.y));
        }, false);
    };
})();
