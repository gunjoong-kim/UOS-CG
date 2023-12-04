import * as mat4 from "./lib/gl-matrix/mat4.js";
import {toRadian} from "./lib/gl-matrix/common.js";
import {createEarth, createAxisLongitude, createLatitude, createSatellite} from "./create_mesh.js"
const loc_aPosition = 0;
const loc_aColor = 1;
const loc_aNormal = 2;
const loc_aTexCoord = 3;

export class Mesh
{
	constructor(gl, vao, indiceCnt, drawMode)
	{
		this.gl = gl;
		this.vao = vao;
		this.indiceCnt = indiceCnt;
		this.drawMode = drawMode;
		this.program = null;
		this.uniforms = {MVP:{location:null, value: null}};
	}

	setProgram(program)
	{
		this.program = program;
	}

	setDrawMode(drawMode)
	{
		this.drawMode = drawMode;
	}

	setUniform(name, value)
	{
		this.uniforms.MVP.location = this.gl.getUniformLocation(this.program, name);
		this.uniforms.MVP.value = value;
	}
}

const helper_vert = 
`#version 300 es
layout(location=${loc_aPosition}) in vec4 aPosition;
layout(location=${loc_aColor}) in vec4 aColor;
uniform mat4 MVP;
out vec4 vColor;
void main() 
{
    gl_Position = MVP * aPosition;
    vColor = aColor;
}`;
const helper_frag =
`#version 300 es
precision mediump float;
in vec4 vColor;
out vec4 fColor;
void main() 
{
    fColor = vColor;
//    fColor = vec4(1,0,0,1);
}`;

const earth_vert = 
`#version 300 es
layout(location=${loc_aPosition}) in vec4 aPosition;
layout(location=${loc_aNormal}) in vec4 aNormal;
layout(location=${loc_aTexCoord}) in vec2 aTexCoord;
uniform mat4 MVP;
out vec4 vNormal;
out vec2 vTexCoord;
void main() 
{
    gl_Position = MVP * aPosition;
    vNormal = aNormal;
	vTexCoord = aTexCoord;
}`;
const earth_frag =
`#version 300 es
precision mediump float;
in vec4 vNormal;
in vec2 vTexCoord;
out vec4 fColor;
void main() 
{
    fColor = vec4(0.5,1,0,1);
}`;


function main() {

 
    // Getting the WebGL context
    const canvas = document.getElementById('webgl');
    const gl = canvas.getContext("webgl2");

	const longitudeSlider = document.getElementById('longitude');
	const latitudeSlider = document.getElementById('latitude');
	const longitudeValue = document.getElementById('longitude-val');
	const latitudeValue = document.getElementById('latitude-val');
	const rotationSlider = document.getElementById('angle');
	const rotationValue = document.getElementById('angle-val');
    const earth_prog = createProgram(gl, earth_vert, earth_frag);
	const helper_prog = createProgram(gl, helper_vert, helper_frag);

	// create object
	const helper = createAxisLongitude(gl, 20, 10);
	helper.program = helper_prog;
	const earth = createEarth(gl, 50, 5);
	earth.program = earth_prog;
	const satellite = createSatellite(gl, 10);
	satellite.program = helper_prog;
	const latitudeHelper = createLatitude(gl, 20, 10);
	latitudeHelper.program = helper_prog;

	// View and Projection matrix
    const VP = mat4.create();
    mat4.perspective(VP, toRadian(30), canvas.width / canvas.height, 1, 100);
	var cameraPosition = [30, 10, 30];
	var up = [0, 1, 0];
	var fPosition = [0, 0, 0];
	var viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, cameraPosition, fPosition, up);
	mat4.multiply(VP, VP, viewMatrix);

    // Model transformation (might be different for each object to render)
	const longitude = parseFloat(longitudeSlider.value);
	const latitude = -parseFloat(latitudeSlider.value);
	const angle = parseFloat(rotationSlider.value);
    const earthModel = mat4.create();
	const helperModel = mat4.create();
	const satelliteModel = mat4.create();
	const latitudeModel = mat4.create();
	mat4.rotateY(earthModel, earthModel, toRadian(angle));
	mat4.rotateY(satelliteModel, satelliteModel, toRadian(longitude));
	mat4.rotateX(satelliteModel, satelliteModel, toRadian(latitude));
	mat4.rotateY(latitudeModel, latitudeModel, toRadian(longitude));

    // build the MVP matrix
    const earthMVP = mat4.create();
    mat4.multiply(earthMVP, VP, earthModel);
	const helperMVP = mat4.create();
	mat4.multiply(helperMVP, VP, helperModel);
	const satelliteMVP = mat4.create();
	mat4.multiply(satelliteMVP, VP, satelliteModel);
	const latitudeMVP = mat4.create();
	mat4.multiply(latitudeMVP, VP, latitudeModel);

	helper.setUniform("MVP", helperMVP);
	earth.setUniform("MVP", earthMVP);
	satellite.setUniform("MVP", satelliteMVP);
	latitudeHelper.setUniform("MVP", latitudeMVP);

    render_scene({
		gl,
		canvas,
		helper,
		latitudeHelper,
		earth,
		satellite
	});

	rotationSlider.addEventListener("input", () => {
		updateAngleAndRender();
	})

	longitudeSlider.addEventListener("input", () => {
		updateLongtitudeAndRender();
	});
	longitudeSlider.addEventListener("keydown", (event) => {
		if (event.key === "ArrowRight" && parseFloat(slider.value) < parseFloat(slider.max)) {
			slider.stepUp();
		} else if (event.key === "ArrowLeft" && parseFloat(slider.value) > parseFloat(slider.min)) {
			slider.stepDown();
		}
		updateLongtitudeAndRender();
	});

	latitudeSlider.addEventListener("input", () => {
		updateLatitudeAndRender();
	});
	latitudeSlider.addEventListener("keydown", (event) => {
		if (event.key === "ArrowRight" && parseFloat(slider.value) < parseFloat(slider.max)) {
			slider.stepUp();
		} else if (event.key === "ArrowLeft" && parseFloat(slider.value) > parseFloat(slider.min)) {
			slider.stepDown();
		}
		updateLatitudeAndRender();
	});

	const updateLongtitudeAndRender = () => {
		longitudeValue.textContent = longitudeSlider.value;
		latitudeValue.textContent = latitudeSlider.value;
		const longitude = parseFloat(longitudeSlider.value);
		const latitude = -parseFloat(latitudeSlider.value);

		const satelliteModel = mat4.create();
		mat4.rotateY(satelliteModel, satelliteModel, toRadian(longitude));
		mat4.rotateX(satelliteModel, satelliteModel, toRadian(latitude));
		const satelliteMVP = mat4.create();
		mat4.multiply(satelliteMVP, VP, satelliteModel);
		satellite.uniforms.MVP.value = satelliteMVP;

		const latitudeModel = mat4.create();
		mat4.rotateY(latitudeModel, latitudeModel, toRadian(longitude));
		const latitudeMVP = mat4.create();
		mat4.multiply(latitudeMVP, VP, latitudeModel);
		latitudeHelper.uniforms.MVP.value = latitudeMVP;
		render_scene({
			gl,
			canvas,
			helper,
			latitudeHelper,
			earth,
			satellite
		});
	};

	const updateLatitudeAndRender = () => {
		longitudeValue.textContent = longitudeSlider.value;
		latitudeValue.textContent = latitudeSlider.value;
		const longitude = parseFloat(longitudeSlider.value);
		const latitude = -parseFloat(latitudeSlider.value);

		const satelliteModel = mat4.create();
		mat4.rotateY(satelliteModel, satelliteModel, toRadian(longitude));
		mat4.rotateX(satelliteModel, satelliteModel, toRadian(latitude));
		const satelliteMVP = mat4.create();
		mat4.multiply(satelliteMVP, VP, satelliteModel);
		satellite.uniforms.MVP.value = satelliteMVP;
		render_scene({
			gl,
			canvas,
			helper,
			latitudeHelper,
			earth,
			satellite
		});
	};

	const updateAngleAndRender = () => {
		rotationValue.textContent = rotationSlider.value;
		const angle = parseFloat(rotationSlider.value);
		
		const earthModel = mat4.create();
		mat4.rotateY(earthModel, earthModel, toRadian(angle));
		const earthMVP = mat4.create();
		mat4.multiply(earthMVP, VP, earthModel);
		earth.uniforms.MVP.value = earthMVP;
		render_scene({
			gl,
			canvas,
			helper,
			latitudeHelper,
			earth,
			satellite
		});
	}
}

function render_scene(params)
{
    const {gl, canvas, helper, latitudeHelper, earth, satellite} = params;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(helper.program);
    gl.uniformMatrix4fv(helper.uniforms.MVP.location, false, helper.uniforms.MVP.value);
    gl.bindVertexArray(helper.vao);
    gl.drawElements(helper.drawMode, helper.indiceCnt, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);

	gl.useProgram(earth.program);
    gl.uniformMatrix4fv(earth.uniforms.MVP.location, false, earth.uniforms.MVP.value);
    gl.bindVertexArray(earth.vao);
    gl.drawElements(earth.drawMode, earth.indiceCnt, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);

	gl.useProgram(satellite.program);
    gl.uniformMatrix4fv(satellite.uniforms.MVP.location, false, satellite.uniforms.MVP.value);
    gl.bindVertexArray(satellite.vao);
    gl.drawElements(satellite.drawMode, satellite.indiceCnt, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);

	gl.useProgram(latitudeHelper.program);
    gl.uniformMatrix4fv(latitudeHelper.uniforms.MVP.location, false, latitudeHelper.uniforms.MVP.value);
    gl.bindVertexArray(latitudeHelper.vao);
    gl.drawElements(latitudeHelper.drawMode, latitudeHelper.indiceCnt, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
}

function createProgram(gl, src_vert, src_frag)
{
    function compileShader(gl, type, src)
    {
        let shader = gl.createShader(type);
        if(!shader)
        {
            console.log('Compile Error: Failed to create a shader.');
            return null;
        }
        
        gl.shaderSource(shader, src);
        
        gl.compileShader(shader);
        
        let status = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if(!status)
        {
            let err = gl.getShaderInfoLog(shader);
            console.log(`Compilation Error: ${err}`);
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }


    let h_vert = compileShader(gl, gl.VERTEX_SHADER, src_vert);
    var h_frag = compileShader(gl, gl.FRAGMENT_SHADER, src_frag);
    if(!h_vert || !h_frag) return null;
    
    let h_prog = gl.createProgram();
    if(!h_prog)   return null;
    
    gl.attachShader(h_prog, h_vert);
    gl.attachShader(h_prog, h_frag);
    gl.linkProgram(h_prog);
    
    let status = gl.getProgramParameter(h_prog, gl.LINK_STATUS);
    if(!status)
    {
        let err = gl.getProgramInfoLog(h_prog);
        console.log(`Link Error: ${err}`);
        gl.deleteProgram(h_prog);
        gl.deleteShader(h_vert);
        gl.deleteShader(h_frag);
        return null;
    }
    return h_prog;
}

main();
