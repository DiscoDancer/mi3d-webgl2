attribute vec2 a_coords;
attribute vec2 a_texCoords;
varying vec2 v_texCoords;

void main() {
    gl_Position = vec4(a_coords, 0.0, 1.0);
    v_texCoords = a_texCoords;
}