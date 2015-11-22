(function() {
    'use strict';

    window.R = {};
    R.pass_copy = {};
    R.pass_debug = {};
    R.pass_deferred = {};
    R.pass_tiled = {};
    R.pass_post1 = {};
    R.lights = [];
    R.lightTexturePosRad = new Float32Array();
    R.lightTextureCol    = new Float32Array();
    R.quadPositions = new Float32Array([
            -1.0, -1.0, 0.0,
             1.0, -1.0, 0.0,
            -1.0,  1.0, 0.0,
             1.0,  1.0, 0.0
        ]);
    R.lightIndices = new Float32Array(100);

    R.NUM_GBUFFERS = 4;

    /**
     * Set up the deferred pipeline framebuffer objects and textures.
     */
    R.deferredSetup = function() {
        R.setupLights(R.NUM_LIGHTS, R.LIGHT_RADIUS, 48);
        loadAllShaderPrograms();
        R.pass_copy.setup();
        R.pass_deferred.setup();
        R.pass_tiled.setup();

        Timer.init();
    };

    R.light_min = [-14, 0, -4];
    R.light_max = [14, 18, 4];
    R.light_dt = -0.03;

    // defaults
    R.LIGHT_RADIUS = 4.0;
    R.NUM_LIGHTS = 20;
    R.MAX_LIGHTS = 200;

    R.setupLights = function(numLights, lightRadius, numTiles) {
        Math.seedrandom(0);

        var posfn = function() {
            var r = [0, 0, 0];
            for (var i = 0; i < 3; i++) {
                var mn = R.light_min[i];
                var mx = R.light_max[i];
                r[i] = Math.random() * (mx - mn) + mn;
            }
            return r;
        };

        for (var i = 0; i < R.lights.length; i++) {
            R.lights[i].rad = lightRadius + (Math.random() - 0.5);
        }
        // Add more lights if adding lights
        for (i = R.lights.length; i < numLights; i++) {
            R.lights.push({
                pos: posfn(),
                col: [
                    1 + Math.random(),
                    1 + Math.random(),
                    1 + Math.random()],
                rad: lightRadius + (Math.random() - 0.5)
            });
        }
        // And slice to size, if you're removing lights
        R.lights.length = numLights;
        //R.lights = R.lights.slice(0, numLights);

        R.lightTexturePosRad = new Float32Array(4 * numLights);
        R.lightTextureCol    = new Float32Array(3 * numLights);

        R.lightIndices = new Float32Array(R.MAX_LIGHTS, numTiles);

        // Store colors
        for (i = 0; i < numLights; i++) {
            var light = R.lights[i];
            var idxC  = 3*i;
            R.lightTextureCol[idxC+0] = light.col[0];
            R.lightTextureCol[idxC+1] = light.col[1];
            R.lightTextureCol[idxC+2] = light.col[2];
        }
        R.writeLightTextures();
    };

    // Write new position values values into R.lightTexturePosRad.
    R.writeLightTextures = function() {
        for (var i = 0; i < R.lights.length; i++) {
            var light = R.lights[i];
            var idxPR = 4*i;
            R.lightTexturePosRad[idxPR+0] = light.pos[0];
            R.lightTexturePosRad[idxPR+1] = light.pos[1];
            R.lightTexturePosRad[idxPR+2] = light.pos[2];
            R.lightTexturePosRad[idxPR+3] = light.rad;
        }
    };

    /**
     * Create/configure framebuffer between "copy" and "deferred" stages
     */
    R.pass_copy.setup = function() {
        // * Create the FBO
        R.pass_copy.fbo = gl.createFramebuffer();
        // * Create, bind, and store a depth target texture for the FBO
        R.pass_copy.depthTex = createAndBindDepthTargetTexture(R.pass_copy.fbo);

        // * Create, bind, and store "color" target textures for the FBO
        R.pass_copy.gbufs = [];
        var attachments = [];
        for (var i = 0; i < R.NUM_GBUFFERS; i++) {
            var attachment = gl_draw_buffers['COLOR_ATTACHMENT' + i + '_WEBGL'];
            var tex = createAndBindColorTargetTexture(R.pass_copy.fbo, attachment);
            R.pass_copy.gbufs.push(tex);
            attachments.push(attachment);
        }

        // * Check for framebuffer errors
        abortIfFramebufferIncomplete(R.pass_copy.fbo);
        // * Tell the WEBGL_draw_buffers extension which FBO attachments are
        //   being used. (This extension allows for multiple render targets.)
        gl_draw_buffers.drawBuffersWEBGL(attachments);
    };

    /**
     * Create/configure framebuffer between "deferred" and "post1" stages
     */
    R.pass_deferred.setup = function() {
        // * Create the FBO
        R.pass_deferred.fbo = gl.createFramebuffer();
        // * Create, bind, and store a single color target texture for the FBO
        R.pass_deferred.colorTex = createAndBindColorTargetTexture(
            R.pass_deferred.fbo, gl_draw_buffers.COLOR_ATTACHMENT0_WEBGL);

        // * Check for framebuffer errors
        abortIfFramebufferIncomplete(R.pass_deferred.fbo);
        // * Tell the WEBGL_draw_buffers extension which FBO attachments are
        //   being used. (This extension allows for multiple render targets.)
        gl_draw_buffers.drawBuffersWEBGL([gl_draw_buffers.COLOR_ATTACHMENT0_WEBGL]);
    };

    /**
     * Create/configure framebuffer between "deferred" and "post1" stages
     */
    R.pass_tiled.setup = function() {
        // Don't create another FBO -- this will actually write into
        // pass_deferred, so the post-processing step can share that FBO.

        // contains light (pos, radius) data
        R.pass_tiled.lightDataPosRad = createAndBindLightDataTexture();
        // contains light (color) data
        R.pass_tiled.lightDataCol    = createAndBindLightDataTexture();
        // contains lights per tile
        R.pass_tiled.lightTileTex = createAndBindLightDataTexture();
        // contains indices into lightTileTex
        R.pass_tiled.tileOffsetTex = createAndBindLightDataTexture();
    };

    /**
     * Loads all of the shader programs used in the pipeline.
     */
    var loadAllShaderPrograms = function() {
        loadShaderProgram(gl, 'glsl/copy.vert.glsl', 'glsl/copy.frag.glsl',
            function(prog) {
                // Create an object to hold info about this shader program
                var p = { prog: prog };

                // Retrieve the uniform and attribute locations
                p.u_cameraMat = gl.getUniformLocation(prog, 'u_cameraMat');
                p.u_colmap    = gl.getUniformLocation(prog, 'u_colmap');
                p.u_normap    = gl.getUniformLocation(prog, 'u_normap');
                p.a_position  = gl.getAttribLocation(prog, 'a_position');
                p.a_normal    = gl.getAttribLocation(prog, 'a_normal');
                p.a_uv        = gl.getAttribLocation(prog, 'a_uv');

                // Save the object into this variable for access later
                R.progCopy = p;
            });

        loadShaderProgram(gl, 'glsl/quad.vert.glsl', 'glsl/red.frag.glsl',
            function(prog) {
                // Create an object to hold info about this shader program
                R.progRed = { prog: prog };
            });

        loadShaderProgram(gl, 'glsl/quad.vert.glsl', 'glsl/clear.frag.glsl',
            function(prog) {
                // Create an object to hold info about this shader program
                R.progClear = { prog: prog };
            });

        loadDeferredProgram('ambient', function(p) {
            // Save the object into this variable for access later
            p.u_ambientTerm = gl.getUniformLocation(p.prog, 'u_ambientTerm');
            R.prog_Ambient = p;
        });

        loadDeferredProgram('blinnphong-pointlight', function(p) {
            // Save the object into this variable for access later
            p.u_cameraPos = gl.getUniformLocation(p.prog, 'u_cameraPos');
            p.u_lightPos = gl.getUniformLocation(p.prog, 'u_lightPos');
            p.u_lightCol = gl.getUniformLocation(p.prog, 'u_lightCol');
            p.u_lightRad = gl.getUniformLocation(p.prog, 'u_lightRad');
            p.u_toon     = gl.getUniformLocation(p.prog, 'u_toon');
            R.prog_BlinnPhong_PointLight = p;
        });

        loadDeferredProgram('tile', function(p) {
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
            R.progTiled = p;
        });

        loadDeferredProgram('scissor', function(p) {
            // Save the object into this variable for access later
            p.u_lightCol = gl.getUniformLocation(p.prog, 'u_lightCol');
            R.progScissor = p;
        });

        loadDeferredProgram('debug', function(p) {
            p.u_debug = gl.getUniformLocation(p.prog, 'u_debug');
            // Save the object into this variable for access later
            R.prog_Debug = p;
        });

        loadPostProgram('one', function(p) {
            p.u_color    = gl.getUniformLocation(p.prog, 'u_color');
            // Save the object into this variable for access later
            R.progPost1 = p;
        });

        // TODO: If you add more passes, load and set up their shader programs.
    };

    var loadDeferredProgram = function(name, callback) {
        loadShaderProgram(gl, 'glsl/quad.vert.glsl',
                          'glsl/deferred/' + name + '.frag.glsl',
            function(prog) {
                // Create an object to hold info about this shader program
                var p = { prog: prog };

                // Retrieve the uniform and attribute locations
                p.u_gbufs = [];
                for (var i = 0; i < R.NUM_GBUFFERS; i++) {
                    p.u_gbufs[i] = gl.getUniformLocation(prog, 'u_gbufs[' + i + ']');
                }
                p.u_depth    = gl.getUniformLocation(prog, 'u_depth');
                p.a_position = gl.getAttribLocation(prog, 'a_position');

                callback(p);
            });
    };

    R.loadModifiedDeferredProgram = function(name, callback, modifVal) {
        loadShaderProgram(gl, 'glsl/quad.vert.glsl',
                          'glsl/deferred/' + name + '.frag.glsl',
            function(prog) {
                // Create an object to hold info about this shader program
                var p = { prog: prog };

                // Retrieve the uniform and attribute locations
                p.u_gbufs = [];
                for (var i = 0; i < R.NUM_GBUFFERS; i++) {
                    p.u_gbufs[i] = gl.getUniformLocation(prog, 'u_gbufs[' + i + ']');
                }
                p.u_depth    = gl.getUniformLocation(prog, 'u_depth');
                p.a_position = gl.getAttribLocation(prog, 'a_position');

                callback(p);
            }, modifVal);
    };

    var loadPostProgram = function(name, callback) {
        loadShaderProgram(gl, 'glsl/quad.vert.glsl',
                          'glsl/post/' + name + '.frag.glsl',
            function(prog) {
                // Create an object to hold info about this shader program
                var p = { prog: prog };

                // Retrieve the uniform and attribute locations
                p.a_position = gl.getAttribLocation(prog, 'a_position');

                callback(p);
            });
    };

    var createAndBindDepthTargetTexture = function(fbo) {
        var depthTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, depthTex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, width, height, 0,
            gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
        gl.bindTexture(gl.TEXTURE_2D, null);

        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTex, 0);

        return depthTex;
    };

    var createAndBindColorTargetTexture = function(fbo, attachment) {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, null);
        gl.bindTexture(gl.TEXTURE_2D, null);

        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, tex, 0);

        return tex;
    };

    var createAndBindLightDataTexture = function() {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return tex;
    };
})();
