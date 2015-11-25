(function() {
    window.Profiler = {};

    Profiler.mousePos = { 'x': 0, 'y': 0 };

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

    var intersect = function(orig, orig_len, other, other_len) {
        if (other < orig) {
            var tmpA = other;
            var tmpLen = other_len;
            other = orig;
            other_len = orig_len;
            orig = tmpA;
            orig_len = tmpLen;
        }

        if (other >= orig && other <= orig + orig_len) {
            // Intersection of the two boxes
            var sc = other;
            var sc_len = Math.min(orig + orig_len - other, other_len);
            return [sc, sc_len];
        } else {
            // No intersection
            return [other, 0];
        }
    };

    Profiler.init = function() {
        hijack(gl, 'drawArrays', function(f, mode, first, count) {
            var scissorEnabled = gl.getParameter(gl.SCISSOR_TEST);
            var prevSB = gl.getParameter(gl.SCISSOR_BOX);
            var mousePos = Profiler.mousePos;
            var scSize = 200;
            var mouseSB = [Math.round(mousePos.x - scSize/2),
                      Math.round(height - mousePos.y - scSize/2),
                      scSize, scSize];
            var sb = mouseSB;

            if (scissorEnabled) {
                var sbX = intersect(prevSB[0], prevSB[2], mouseSB[0], mouseSB[2]);
                var sbY = intersect(prevSB[1], prevSB[3], mouseSB[1], mouseSB[3]);
                sb = [sbX[0], sbY[0], sbX[1], sbY[1]];
            } else {
                gl.enable(gl.SCISSOR_TEST);
            }

            gl.scissor(sb[0], sb[1], sb[2], sb[3]);
            var ret = f(mode, first, count);

            if (scissorEnabled) {
                // reset previous scissor box
            } else {
                gl.disable(gl.SCISSOR_TEST);
            }
            gl.scissor(prevSB[0], prevSB[1], prevSB[2], prevSB[3]);
            return ret;
        });

        canvas = document.getElementById('canvas');

        // Mouse movement listener: update mousePos and write to screen
        canvas.addEventListener('mousemove', function(evt) {
            Profiler.mousePos = getMousePos(canvas, evt);

            $("#mouse_pos").text('Mouse position: ' +
                                Math.round(Profiler.mousePos.x) + ',' +
                                Math.round(Profiler.mousePos.y));
        }, false);
    };
})();
