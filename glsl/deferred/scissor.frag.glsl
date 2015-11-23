#version 100
precision highp float;
precision highp int;

uniform vec3 u_lightCol;

void main() {
    gl_FragColor = vec4(0.5 * u_lightCol, 1);
}
