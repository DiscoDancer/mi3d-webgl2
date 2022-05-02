var canvas;  // The canvas where WebGL draws.
var gl;  // The WebGL graphics context.

const vsSource = await(await fetch('vs.fx')).text();
const fsSource = await(await fetch('fs.fx')).text();

var u_texture1_location;   // locations of uniformas
var u_texture2_location;
var u_tex2Mode_location;
var u_wavy_location;

var a_coords_location;      // locations and buffers for attributes
var square_coords_buffer;
var ring_coords_buffer;
var a_texCoords_location;
var square_texCoords_buffer;
var ring_texCoords_buffer;

var texturesLoaded = false;  // set to true after all textures have been loaded.

var textureObjects;

var textureURL = [  // URLs of the available textures.
    "textures/house.jpg",
    "textures/Earth-1024x512.jpg",
    "textures/NightEarth-512x256.jpg",
    "textures/marble.jpg",
    "textures/metal003.gif",
    "textures/mandelbrot.jpeg",
    "textures/brick.gif",
    "textures/gradient.png",
    "textures/cloth.gif",
    "textures/cloud.gif",
    "textures/jigsaw.gif",
];

init();

/**
 *  Draws the content of the canvas, in this case, a textured POINTS primitive
 */
function draw() {

    gl.clearColor(1, 1, 1, 1);  // specify the color to be used for clearing
    gl.clear(gl.COLOR_BUFFER_BIT);  // clear the canvas (to black)

    if (!texturesLoaded) {
        return;
    }

    /* Set values of uniform variables, based on values from user interface elements */

    var mode = Number(document.getElementById("modeChoice").value);
    gl.uniform1i(u_tex2Mode_location, mode);

    var wavy = document.getElementById("wavyCheckbox").checked;
    gl.uniform1i(u_wavy_location, wavy ? 1 : 0);

    /* bind texture objects, based on selected textures in user interface */

    var tex1Num = Number(document.getElementById("textureChoice1").value);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textureObjects[tex1Num]);

    var tex2Num = Number(document.getElementById("textureChoice2").value);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textureObjects[tex2Num]);

    /* Draw the selected object. */

    if (document.getElementById("objectChoice").value == "Ring") {
        gl.bindBuffer(gl.ARRAY_BUFFER, ring_coords_buffer);
        gl.vertexAttribPointer(a_coords_location, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, ring_texCoords_buffer);
        gl.vertexAttribPointer(a_texCoords_location, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 130);
    }
    else {
        gl.bindBuffer(gl.ARRAY_BUFFER, square_coords_buffer);
        gl.vertexAttribPointer(a_coords_location, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, square_texCoords_buffer);
        gl.vertexAttribPointer(a_texCoords_location, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }
}

function loadTextures() {
    var loaded = 0;  // number of textures that have been loaded
    textureObjects = new Array(textureURL.length);
    for (var i = 0; i < textureURL.length; i++) {
        load(i, textureURL[i]);
    }
    function load(textureNum, url) {
        var img = new Image();
        img.onload = function () {
            loaded++;
            textureObjects[textureNum] = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, textureObjects[textureNum]);
            try {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            }
            catch (e) {
                // Chrome, at least, gets a security error if it tries to use a local file.
                document.getElementById("headline").innerHTML =
                    "Sorry, can't access textures.  Note that some<br>browsers can't use textures from a local disk.";
                return;
            }
            gl.generateMipmap(gl.TEXTURE_2D);
            if (loaded == textureURL.length) {
                texturesLoaded = true;
                document.getElementById("headline").innerHTML = "WebGL Multi-texture Demo";
                draw();
            }
        };
        img.onerror = function () {
            document.getElementById("headline").innerHTML = "Sorry, could not load textures.";
        };
        img.src = url;
    }
}


function initGL() {
    var prog = createProgram(gl, vsSource, fsSource);
    gl.useProgram(prog);
    a_coords_location = gl.getAttribLocation(prog, "a_coords");
    a_texCoords_location = gl.getAttribLocation(prog, "a_texCoords");
    u_tex2Mode_location = gl.getUniformLocation(prog, "u_tex2Mode");
    u_wavy_location = gl.getUniformLocation(prog, "u_wavy");
    u_texture1_location = gl.getUniformLocation(prog, "u_texture1");
    u_texture2_location = gl.getUniformLocation(prog, "u_texture2");
    gl.uniform1i(u_texture1_location, 0);
    gl.uniform1i(u_texture2_location, 1);
    square_coords_buffer = gl.createBuffer();
    square_texCoords_buffer = gl.createBuffer();
    var square_coords = new Float32Array([-0.9, -0.9, 0.9, -0.9, 0.9, 0.9, -0.9, 0.9]);
    var square_texCoords = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
    gl.bindBuffer(gl.ARRAY_BUFFER, square_coords_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, square_coords, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, square_texCoords_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, square_texCoords, gl.STATIC_DRAW);
    ring_coords_buffer = gl.createBuffer();
    ring_texCoords_buffer = gl.createBuffer();
    var ringCoords = new Float32Array(260);
    var ringTexCoords = new Float32Array(260);
    for (var i = 0; i <= 64; i++) {
        var angle = i / 64 * 2 * Math.PI;
        ringCoords[4 * i] = 0.3 * Math.cos(angle);
        ringCoords[4 * i + 1] = 0.3 * Math.sin(angle);
        ringCoords[4 * i + 2] = 0.9 * Math.cos(angle);
        ringCoords[4 * i + 3] = 0.9 * Math.sin(angle);
        ringTexCoords[4 * i] = 0;
        ringTexCoords[4 * i + 1] = i / 16;
        ringTexCoords[4 * i + 2] = 1;
        ringTexCoords[4 * i + 3] = i / 16;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, ring_coords_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, ringCoords, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, ring_texCoords_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, ringTexCoords, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(a_coords_location);
    gl.enableVertexAttribArray(a_texCoords_location);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    loadTextures();
}

function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
    var vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vertexShaderSource);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw "Error in vertex shader:  " + gl.getShaderInfoLog(vsh);
    }
    var fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fragmentShaderSource);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw "Error in fragment shader:  " + gl.getShaderInfoLog(fsh);
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw "Link error in program:  " + gl.getProgramInfoLog(prog);
    }
    return prog;
}

function init() {
    canvas = document.getElementById("webglcanvas");
    var options = {  // no need for alpha channel or depth buffer in this program
        alpha: false,
        depth: false
    };
    gl = canvas.getContext("webgl", options) ||
        canvas.getContext("experimental-webgl", options);
    if (!gl) {
        throw "Browser does not support WebGL";
    }

    document.getElementById("textureChoice1").value = "6";
    document.getElementById("textureChoice2").value = "1";
    document.getElementById("modeChoice").value = "0";
    document.getElementById("objectChoice").value = "Square";
    document.getElementById("wavyCheckbox").checked = false;
  
    document.getElementById("textureChoice1").onchange =
      document.getElementById("modeChoice").onchange =
      document.getElementById("textureChoice2").onchange =
      document.getElementById("objectChoice").onchange =
      document.getElementById("wavyCheckbox").onchange =
      draw;

    initGL();
    draw();
}