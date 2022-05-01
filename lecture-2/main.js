//Import libraries
import * as dat from './libs/dat.gui.module.js'
import './libs/gl-matrix-min.js'
const mat3 = window.glMatrix.mat3

//Import utility functions
import * as glutils from './glutils.js'
import { imgload } from './imgload.js';


/**
 * В общем и целом, мы читаем 2 картинки, одна из которых dicom. С последней нужно работать чуть сложнее.
 * Рисуем какую-то комбинацию из 2х картинок
 * Рисуем картинку через 2 треугольника.
 */


const vsSource = await (await fetch('vs.fx')).text();
const fsSource = await (await fetch('fs.fx')).text();;

//Image load
const image = await imgload('img_016.dcm')

//setup control object
var minValue = Math.min(...image.pixelData)
var maxValue = Math.max(...image.pixelData)
const settings = {black: minValue, white: maxValue, zoom: 1, image: 'Image1'};
//create control interface
const gui = new dat.GUI();
gui.add(settings, 'image', { Image1: 'Image1', Image2: 'Image2', Image3: 'Image3' })
.listen()
.onChange(() => {
    alert(settings.image);
});


const {gl, pr, vao, bwLocation, transformLocation, texLocation, lutLocation} = init()
render()


function init() {
    //get canvas ui element and set its internal resolution to align with its actual screen resolution
    const c = document.getElementById("canvas");
    c.width = c.clientWidth;
    c.height = c.clientHeight;

    //get WebGL2 darwing context and exit if not found
    const gl = c.getContext("webgl2")
    if(gl == null) {
        alert("Context not found");
        throw "Context not found";
    }
    var ext = gl.getExtension('OES_texture_float_linear');

    // каждая программа состоит из 2х шейдеров, ничего интересного тут
    var vs = glutils.createShader(gl, gl.VERTEX_SHADER, vsSource);
    var fs = glutils.createShader(gl, gl.FRAGMENT_SHADER, fsSource);                                                                            
    var pr = glutils.createProgram(gl, vs, fs);
    
    // Attributes are used to specify how to pull data out of your buffers and provide them to your vertex shader.
    var positionAttributeLocation = gl.getAttribLocation(pr, "a_position"); // vertex shader
    // uniform - глобальаня переменная
    var texLocation = gl.getUniformLocation(pr, "u_texture"); // fragment shader
    var lutLocation = gl.getUniformLocation(pr, "u_lut"); // fragment shader
    var bwLocation = gl.getUniformLocation(pr, "bw"); // fragment shader
    var transformLocation = gl.getUniformLocation(pr, "transform"); // vertex shader


    // создаем текстуру из картинки DCOM
    // creates WebGLTexture object
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture); // либо к 2д, либо к кубу
    // texImage2D(target, level, internalformat, width, height, border, format, type, source)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, image.columns, image.rows, 0, gl.RED, gl.FLOAT, image.pixelData);

    //-setup texture interpolation and wrapping modes
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // создали еще 1 текстуру из картинки
    // только каким-то другим способом, мб эквивателным
    var lut = gl.createTexture();
    var lutimage = new Image();
    lutimage.src = 'lut/lut.png'
    lutimage.onload = function() {
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, lut);
        // texImage2D(target, level, internalformat, format, type, pixels)
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

    // возможно мы тут просто определились с вершинами, передав в vertext shader geometry и triangles

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

    return {gl, pr, vao, bwLocation, transformLocation, texLocation, lutLocation}
}

function render() {
    //setup drawing area
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    //set clear color
    gl.clearColor(0, 0, 0, 1);
    //set clear mode (clear color & depth)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //use graphic pipeline defined by shader program *pr*
    gl.useProgram(pr);
    //set geometry to draw
    gl.bindVertexArray(vao);

    gl.uniform2fv(bwLocation, [settings.black, settings.white]);
    var t = mat3.create()

    var aspect = gl.canvas.width / gl.canvas.height;
    var imgSize = [image.columns * image.pixelSpacingX, image.rows * image.pixelSpacingY]
    var maxSize = Math.max(...imgSize);

    mat3.scale(t, t, [1 / maxSize, -aspect / maxSize]);
    mat3.scale(t, t, imgSize);
    mat3.scale(t, t, [settings.zoom, settings.zoom]);
    mat3.translate(t, t, [-.5, -.5])
    gl.uniformMatrix3fv(transformLocation, false, t);
	gl.uniform1i(texLocation, 0);
	gl.uniform1i(lutLocation, 1);


    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render)
}

