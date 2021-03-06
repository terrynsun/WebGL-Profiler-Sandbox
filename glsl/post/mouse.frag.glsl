#version 100
precision highp float;
precision highp int;

uniform sampler2D u_color;

varying vec2 v_uv;
uniform vec2 u_mouse;
uniform float u_height;

const vec4 SKY_COLOR = vec4(0.01, 0.14, 0.42, 1.0);

void main() {
    vec4 color = texture2D(u_color, v_uv);

    if(length(u_mouse - vec2(gl_FragCoord.x, u_height - gl_FragCoord.y)) > 50.0) {
    	gl_FragColor = vec4(0, 0, 0, 1);
    	return;
    }

    if (color.a == 0.0) {
        gl_FragColor = SKY_COLOR;
        return;
    }

    gl_FragColor = color;
}
