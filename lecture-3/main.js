//Import libraries
import * as dat from './libs/dat.gui.module.js'
import './libs/gl-matrix-min.js'
const mat4 = window.glMatrix.mat4
const vec3 = window.glMatrix.vec3

//Import utility functions
import * as glutils from './glutils.js'
import { imgload } from './imgload.js';


const vsSource = await (await fetch('vs.fx')).text();
const fsSource = await (await fetch('fs.fx')).text();;

//Image load
const image = await imgload('HEAD_BRAIN_20101020_001_004_T2__Ax_T2_Flair_Ax.img')

//setup control object
var minValue = 0;// Math.min(...image.pixelData)
var maxValue = 1000; //Math.max(...image.pixelData)
const settings = {
    black: minValue,
    white: maxValue,
    distance: 2000
};
//create control interface
const gui = new dat.GUI();
gui.add(settings, 'black', minValue, maxValue);
gui.add(settings, 'white', minValue, maxValue);
gui.add(settings, 'distance', 100, 1000, 1);

const sliceZ = {
    xort: [1, 0, 0],
    yort: [0, 1, 0],
    disp: 0 //displacement from center of the image in mm!!!
}
const sliceX = {
    xort: [0, 1, 0],
    yort: [0, 0, 1],
    disp: 0 //displacement from center of the image in mm!!!
}
const sliceY = {
    xort: [1, 0, 0],
    yort: [0, 0, 1],
    disp: 0 //displacement from center of the image in mm!!!
}

gui.add(sliceX, 'disp', -100, 100, 1);
gui.add(sliceY, 'disp', -100, 100, 1);
gui.add(sliceZ, 'disp', -100, 100, 1);

const { gl, pr, vao, bwLocation, transformLocation, texLocation, lutLocation, wvpLocation } = init()
render()

function init() {
    //get canvas ui element and set its internal resolution to align with its actual screen resolution
    const c = document.getElementById("canvas");
    c.width = c.clientWidth;
    c.height = c.clientHeight;

    //get WebGL2 darwing context and exit if not found
    const gl = c.getContext("webgl2")
    if (gl == null) {
        alert("Context not found");
        throw "Context not found";
    }
    var ext = gl.getExtension('OES_texture_float_linear');

    //-compile source code into shaders
    var vs = glutils.createShader(gl, gl.VERTEX_SHADER, vsSource);
    var fs = glutils.createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    //-assemble shaders into program (pipeline)                                                                                
    var pr = glutils.createProgram(gl, vs, fs);

    var positionAttributeLocation = gl.getAttribLocation(pr, "a_position");
    var texLocation = gl.getUniformLocation(pr, "u_texture");
    var lutLocation = gl.getUniformLocation(pr, "u_lut");
    var bwLocation = gl.getUniformLocation(pr, "bw");
    var transformLocation = gl.getUniformLocation(pr, "transform");
    var wvpLocation = gl.getUniformLocation(pr, "worldViewProjection");

    //Init texture
    //-init texture object and fill with data
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, texture);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.R32F, image.columns, image.rows, image.slices, 0, gl.RED, gl.FLOAT, image.pixelData);

    //-setup texture interpolation and wrapping modes
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

    var lut = gl.createTexture();
    var lutimage = new Image();
    lutimage.src = 'lut/lut.png'
    lutimage.onload = function () {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, lut);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, lutimage);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    const geometry = [
        0, 0,
        1, 0,
        1, 1,
        0, 1
    ]

    const triangles = [
        0, 1, 2,
        0, 3, 2
    ]

    //-create vertex array to store geometry data
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    //-init position buffer and fill with data
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry), gl.STATIC_DRAW);
    //-assign buffer to position attribute
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    //-init index buffer and fill with data
    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangles), gl.STATIC_DRAW);

    //-setup additional pipeline parameters (enable depth filtering)
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    //enable scsissor to prevent clearing of other viewports
    gl.enable(gl.SCISSOR_TEST);

    return { gl, pr, vao, bwLocation, transformLocation, texLocation, lutLocation, wvpLocation }
}

function render() {
    var vwp = mat4.create()
    mat4.scale(vwp, vwp, [2, 2, 1])
    mat4.translate(vwp, vwp, [-.5, -.5, 0])
    let aspect = initViewport({ x: 0, y: 0, width: gl.canvas.width / 2, height: gl.canvas.height / 3 })
    renderWithParameters(aspect, vwp, sliceZ)
    aspect = initViewport({ x: 0, y: gl.canvas.height / 3, width: gl.canvas.width / 2, height: gl.canvas.height / 3 })
    renderWithParameters(aspect, vwp, sliceX)
    aspect = initViewport({ x: 0, y: 2 * gl.canvas.height / 3, width: gl.canvas.width / 2, height: gl.canvas.height / 3 })
    renderWithParameters(aspect, vwp, sliceY)

    let aspect3d = initViewport({ x: gl.canvas.width / 2, y: 0, width: gl.canvas.width / 2, height: gl.canvas.height })
    renderWithParameters(aspect, worldViewProjection(aspect, sliceZ), sliceZ)

    renderWithParameters(aspect, worldViewProjection(aspect, sliceX), sliceX)

    renderWithParameters(aspect, worldViewProjection(aspect, sliceY), sliceY)

    requestAnimationFrame(render)
}

function initViewport(region) {
    //setup drawing area
    gl.viewport(region.x, region.y, region.width, region.height);
    //
    gl.scissor(region.x, region.y, region.width, region.height);
    //set clear color
    gl.clearColor(.1, .1, .1, 1);
    //set clear mode (clear color & depth)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    return region.width / region.height;
}

function renderWithParameters(aspect, wvp, slice) {
    //use graphic pipeline defined by shader program *pr*
    gl.useProgram(pr);
    //set geometry to draw
    gl.bindVertexArray(vao);

    gl.uniform2fv(bwLocation, [settings.black, settings.white]);

    var imgSize = [
        image.columns * image.pixelSpacingX,
        image.rows * image.pixelSpacingY,
        image.slices * image.pixelSpacingZ]

    const world = worldSlice(aspect, slice)
    const scaling = mat4.invert(mat4.create(), mat4.fromScaling(mat4.create(), imgSize))
    const trans = mat4.fromTranslation(mat4.create(), [.5, .5, .5])

    mat4.mul(world, scaling, world)
    mat4.mul(world, trans, world)

    gl.uniformMatrix4fv(transformLocation, false, world);
    gl.uniform1i(texLocation, 0);
    gl.uniform1i(lutLocation, 1);

    gl.uniformMatrix4fv(wvpLocation, false, wvp);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

function sliceTransform(slice) {
    var zort = vec3.cross(vec3.create(), slice.xort, slice.yort);
    var rot = mat4.create();
    mat4.set(rot, ...slice.xort, 0, ...slice.yort, 0, ...zort, 0, 0, 0, 0, 1);
    //mat4.invert(rot, rot)
    var tr = mat4.fromTranslation(mat4.create(), [0, 0, slice.disp]);
    var world = mat4.create();
    mat4.mul(world, rot, tr);
    //mat4.mul(world, tr, rot);
    return world
}

function worldSlice(aspect, slice) {
    let world = mat4.create()

    var imgSize = [
        image.columns * image.pixelSpacingX,
        image.rows * image.pixelSpacingY,
        image.slices * image.pixelSpacingZ]

    var maxSize = Math.max(...imgSize);
    mat4.mul(world, sliceTransform(slice), world);
    mat4.scale(world, world, [maxSize * aspect, maxSize, 1]);
    mat4.translate(world, world, [-.5, -.5, -.5])
    return world
}

function worldViewProjection(aspect, slice) {
    let proj = mat4.perspective(mat4.create(), 0.5, gl.canvas.width / gl.canvas.height * .5, 0.1, 10000)
    let view = mat4.lookAt(mat4.create(), [settings.distance, settings.distance, settings.distance], [0, 0, 0], [0, 0, 1]);
    let vwp = mat4.create()
    mat4.mul(vwp, vwp, proj);
    mat4.mul(vwp, vwp, view);
    mat4.mul(vwp, vwp, worldSlice(aspect, slice));
    return vwp
}








