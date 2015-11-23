#version 100
precision highp float;
precision highp int;

uniform sampler2D u_color;
uniform vec2 u_mouse;
varying vec2 v_uv;

void main() {

	vec4 color = texture2D(u_color, v_uv);

	if(u_mouse == v_uv) {
    	gl_FragColor = vec4(1, 0, 0, 1);
    	return;
    }

    gl_FragColor = color;
}