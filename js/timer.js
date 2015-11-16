(function() {
    'use strict';

    window.Timer = {};
    Timer.ext = null;
    Timer.query = null;
    Timer.count = 0;
    Timer.total = 0;
    Timer.query_status = false;

    Timer.init = function() {
        Timer.ext = gl.getExtension('EXT_disjoint_timer_query');
    };

    Timer.start = function() {
        var ext = Timer.ext;
        if (Timer.query === null) {
            Timer.query = ext.createQueryEXT();
            ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, Timer.query);
            Timer.query_status = true;
        }
    };

    Timer.reset = function() {
        Timer.query = null;
        Timer.query_status = false;
        Timer.count = 0;
        Timer.total = 0;
    };

    Timer.end = function() {
        var ext = Timer.ext;
        if (Timer.query_status === true) {
            ext.endQueryEXT(ext.TIME_ELAPSED_EXT);
        }

        if (Timer.query !== null) {
            var available = ext.getQueryObjectEXT(Timer.query,
                                                  ext.QUERY_RESULT_AVAILABLE_EXT);
            var disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);

            if (available && !disjoint) {
                var timeElapsed = ext.getQueryObjectEXT(Timer.query,
                                                        ext.QUERY_RESULT_EXT);
                Timer.count += 1;
                Timer.total += timeElapsed;
                if (Timer.count % 50 === 0) {
                    var avg_ms = Timer.total/Timer.count * 0.000001;
                    console.log(Timer.count + " iterations: " + avg_ms + "ms");
                }
                Timer.query = null;
            }
        }
    };
})();
