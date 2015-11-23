var cfg;

(function() {
    'use strict';

    var Cfg = function() {
        this.debugView = -1;
        this.debugScissor = false;
        this.scissorSize = 100;

        this.optimization = 1;
        this.movingLights = true;
        this.toon = false;
        this.watercolor = false;

        this.ambient = 0.1;
        this.lightRadius = 4.0;
        this.numLights = 50;

        this.tileSize = 100;
        this.tileDebugView = -1;

        this.test = 0;
    };

    var init = function() {
        cfg = new Cfg();

        var gui = new dat.GUI();
        var debug = gui.addFolder('Debug Views');
        debug.add(cfg, 'debugView', {
            'None':               -1,
            '[0] Depth':           0,
            '[1] Position':        1,
            '[2] Geometry normal': 2,
            '[3] Color map':       3,
            '[4] Normal map':      4,
            '[5] Surface normal':  5
        });
        debug.open();

        var opt = gui.addFolder('Optimizations');
        opt.add(cfg, 'optimization', {
            'None':   -1,
            'Scissor': 0,
            'Tile':    1,
        });
        opt.add(cfg, 'debugScissor');
        opt.add(cfg, 'scissorSize').min(1).max(500).step(1);
        opt.open();

        var effects = gui.addFolder('Effects');
        effects.add(cfg, 'movingLights');
        effects.add(cfg, 'toon');
        effects.add(cfg, 'watercolor');
        effects.open();

        var updateLights = function() {
            var TILE_SIZE = cfg.tileSize;
            var TILES_WIDTH  = Math.ceil((width+1)  / TILE_SIZE);
            var TILES_HEIGHT = Math.ceil((height+1) / TILE_SIZE);
            var NUM_TILES = TILES_WIDTH * TILES_HEIGHT;
            R.setupLights(cfg.numLights, cfg.lightRadius, NUM_TILES);
        };

        var consts = gui.addFolder('Constants');
        consts.add(cfg, 'ambient', 0.1, 1.0);
        consts.add(cfg, 'lightRadius', 0.5, 10.0).onFinishChange(updateLights);
        consts.add(cfg, 'numLights').min(5).max(500).step(5).onFinishChange(updateLights);
        //consts.add(cfg, 'numLights').min(50).max(100).step(10).onFinishChange(updateLights);

        consts.open();

        var tileOpts = gui.addFolder('Tile Options');
        tileOpts.add(cfg, 'tileSize').min(10).max(150).step(25);
        tileOpts.add(cfg, 'tileDebugView', {
            'None': -1,
            '# Lights': 0
        });
        tileOpts.open();

        var reloadBlinnPhong = function() {
            R.loadModifiedDeferredProgram('blinnphong-pointlight', function(p) {
                p.u_cameraPos = gl.getUniformLocation(p.prog, 'u_cameraPos');
                p.u_lightPos = gl.getUniformLocation(p.prog, 'u_lightPos');
                p.u_lightCol = gl.getUniformLocation(p.prog, 'u_lightCol');
                p.u_lightRad = gl.getUniformLocation(p.prog, 'u_lightRad');
                p.u_toon     = gl.getUniformLocation(p.prog, 'u_toon');
                R.prog_BlinnPhong_PointLight = p;
            }, cfg.test);
        };

        var reloadTile = function() {
            R.loadModifiedDeferredProgram('tile', function(p) {
                // Save the object into this variable for access later
                p.u_cameraPos    = gl.getUniformLocation(p.prog, 'u_cameraPos');
                p.u_toon         = gl.getUniformLocation(p.prog, 'u_toon');
                p.u_watercolor   = gl.getUniformLocation(p.prog, 'u_watercolor');
                p.u_debugView    = gl.getUniformLocation(p.prog, 'u_debug');

                p.u_lightsPR     = gl.getUniformLocation(p.prog, 'u_lightsPR');
                p.u_lightsC      = gl.getUniformLocation(p.prog, 'u_lightsC');

                p.u_lightIndices = gl.getUniformLocation(p.prog, 'u_lightIndices');
                p.u_tileOffsets  = gl.getUniformLocation(p.prog, 'u_tileOffsets');

                p.u_tileIdx      = gl.getUniformLocation(p.prog, 'u_tileIdx');
                p.u_lightStep    = gl.getUniformLocation(p.prog, 'u_lightStep');
                p.u_zero         = gl.getUniformLocation(p.prog, 'u_zero');
                R.progTiled = p;
                Timer.reset();
            }, cfg.test);
        };

        var perfOpts = gui.addFolder('Perf');
        perfOpts.add(cfg, 'test', {
            '0': 0,
            '1': 1,
            '2': 2,
        }).onFinishChange(reloadTile);
        perfOpts.open();

        updateLights();
    };

    window.handle_load.push(init);
})();
