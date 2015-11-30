(function() {
    'use strict';

    window.Timer = {};

    var glTimer = null;
    var currentQuery = null;
    var isRunning = false;

    var totalCount = 0;
    var totalElapsed = 0;

    var enabled = true;
    var sendEvent = true;

    Timer.init = function() {
        glTimer = gl.getExtension('EXT_disjoint_timer_query');
        if (glTimer === null) {
            dispatchDummyEvent();
        }
    };

    Timer.enable = function() {
        enabled = true;
    };

    Timer.disable = function() {
        enabled = false;
    };

    /*
     * Starts a timer query (if one isn't running AND one isn't waiting for data
     * to be returned).
     */
    Timer.start = function() {
        // If timing currently disabled or glTimer does not exist, exit early.
        if (enabled === false || glTimer === null) {
            return;
        }
        if (currentQuery === null) {
            currentQuery = glTimer.createQueryEXT();
            glTimer.beginQueryEXT(glTimer.TIME_ELAPSED_EXT, currentQuery);
            isRunning = true;
        }
    };

    Timer.reset = function() {
        currentQuery = null;
        isRunning = false;
        totalCount = 0;
        totalElapsed = 0;
    };

    var pollQueryData = function(query) {
        var available = glTimer.getQueryObjectEXT(query, glTimer.QUERY_RESULT_AVAILABLE_EXT);
        var disjoint = gl.getParameter(glTimer.GPU_DISJOINT_EXT);

        if (available && !disjoint) {
            return glTimer.getQueryObjectEXT(currentQuery, glTimer.QUERY_RESULT_EXT);
        } else {
            return null;
        }
    };

    var dispatchDummyEvent = function() {
        var count = 0;
        function dummy() {
            count += 25;
            var eventObj = new CustomEvent("avg_ms", {
                                    detail: {
                                        avg_ms: Math.random(),
                                        count: count,
                                        time: new Date(),
                                    },
                                });
            document.dispatchEvent(eventObj);
            setTimeout(dummy, 1000);
        }
        dummy();
    };

    var dispatchEvent = function(avg_ms, count) {
        if (sendEvent === false) {
            return;
        }

        var eventObj = new CustomEvent("timer_data", {
                                detail: {
                                    avg_ms: avg_ms,
                                    count: count,
                                    time: new Date(),
                                },
                            });
        document.dispatchEvent(eventObj);
    };

    /*
     * Ends a timer query (if running) and polls for timing information (if
     * query exists to be polled).
     */
    Timer.end = function() {
        // If timing currently disabled or glTimer does not exist, exit early.
        if (enabled === false || glTimer === null) {
            return;
        }

        if (isRunning === true) {
            glTimer.endQueryEXT(glTimer.TIME_ELAPSED_EXT);
        }

        if (currentQuery !== null) {
            var timeElapsed = pollQueryData(currentQuery);
            if (timeElapsed !== null) {
                totalCount += 1;
                totalElapsed += timeElapsed;
                currentQuery = null;
                if (totalCount % 25 === 0) {
                    var avg_ms = totalElapsed/totalCount * 0.000001;
                    dispatchEvent(avg_ms, totalCount);
                }
            }
        }
    };
})();
