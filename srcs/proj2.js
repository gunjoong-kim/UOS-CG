import * as mat4 from "./lib/gl-matrix/mat4.js";
import {toRadian} from "./lib/gl-matrix/common.js";
import {createEarth, createAxisLongitude, createLatitude, createSatellite} from "./create_mesh.js"
const loc_aPosition = 0;
const loc_aColor = 1;
const loc_aNormal = 2;
const loc_aTexCoord = 3;

export class Context 
{
	constructor(gl, program, mesh)
	{
		this.gl = gl;
		this.program = program;
		this.mesh = mesh;
	}
	draw()
	{
		this.gl.useProgram(this.program.program);
    	this.gl.bindVertexArray(this.mesh.vao);
    	this.gl.drawElements(this.mesh.drawMode, this.mesh.indiceCnt, this.gl.UNSIGNED_SHORT, 0);
    	this.gl.bindVertexArray(null);
		this.gl.useProgram(null);
	}
}

export class Program
{
	constructor(gl, program)
	{
		this.gl = gl;
		this.program = program;
	}
	setUniform(name, value, type)
	{
		this.gl.useProgram(this.program);
		const location = this.gl.getUniformLocation(this.program, name);
		if (type === "mat4")
			this.gl.uniformMatrix4fv(location, false, value);
		else if (type === "vec3")
			this.gl.uniform3fv(location, value);
		else
			console.log("No matching types...");
	}
}

export class Mesh
{
	constructor(gl, vao, indiceCnt, drawMode)
	{
		this.gl = gl;
		this.vao = vao;
		this.indiceCnt = indiceCnt;
		this.drawMode = drawMode;
		this.program = null;
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
layout(location=${loc_aNormal}) in vec3 aNormal;
layout(location=${loc_aTexCoord}) in vec2 aTexCoord;
uniform mat4 model;
uniform mat4 MVP;
uniform vec3 lightPosition;
uniform vec3 viewPosition;
out vec3 vNormal;
out vec2 vTexCoord;
out vec3 vSurfaceToLight;
out vec3 vSurfaceToView;
void main() 
{
    gl_Position = MVP * aPosition;
    vNormal = mat3(transpose(inverse(model))) * aNormal;
	vTexCoord = aTexCoord;
	vec3 surface = (model * aPosition).xyz;
	vSurfaceToLight = lightPosition - surface;
	vSurfaceToView = viewPosition - surface;
}`;
const earth_frag =
`#version 300 es
precision mediump float;
in vec3 vNormal;
in vec2 vTexCoord;
in vec3 vSurfaceToLight;
in vec3 vSurfaceToView;
uniform sampler2D earthBump;
uniform sampler2D earthMap;
uniform sampler2D earthSpec;

out vec4 fColor;
void main() 
{
	// because v_normal is a varying it's interpolated
	// so it will not be a uint vector. Normalizing it
	// will make it a unit vector again
	vec3 normal = normalize(vNormal);

	vec3 surfaceToLightDirection = normalize(vSurfaceToLight);
	vec3 surfaceToViewDirection = normalize(vSurfaceToView);
	vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);

	// compute the light by taking the dot product
	// of the normal to the light's reverse direction
	float light = dot(normal, surfaceToLightDirection);
	float specular = 0.0;
	if (light > 0.0) {
    	specular = pow(dot(normal, halfVector), 64.0);
  	}
	if (vTexCoord.x < 0.5)
		fColor = vec4(1, 0, 0, 1);
	else
  		fColor = texture(earthMap, vTexCoord);
  	// Lets multiply just the color portion (not the alpha)
  	// by the light
  	fColor.rgb *= light;
  	// Just add in the specular
  	fColor.rgb += specular;
	//fColor = vec4(0.5,1,0,1);
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

	// create Contexts
	const helper = new Context(gl);
	const earth = new Context(gl);
	const satellite = new Context(gl);
	const latitudeHelper = new Context(gl);
	helper.mesh = createAxisLongitude(gl, 20, 10);
	helper.program = createProgram(gl, helper_vert, helper_frag);
	earth.mesh = createEarth(gl, 50, 5);
	earth.program = createProgram(gl, earth_vert, earth_frag);
	satellite.mesh = createSatellite(gl, 10);
	satellite.program = createProgram(gl, helper_vert, helper_frag);
	latitudeHelper.mesh = createLatitude(gl, 20, 10);
	latitudeHelper.program = createProgram(gl, helper_vert, helper_frag);

	const textures = [
		{texture:null, unit:3, image:new Image(), loaded:false},
		{texture:null, unit:5, image:new Image(), loaded:false},
		{texture:null, unit:7, image:new Image(), loaded:false}
	];

	function load_image(tex, src)
    {
        return new Promise(function(resolve, reject) {
            tex.image.onload = () => resolve(tex);
            tex.image.onerror = () => reject(new Error(`Error while loading image "${src}"`));
            tex.image.src = src;
        });
    }

    async function start() {
        try {
            let texes = await Promise.all([
                load_image(textures[0], '../img/earthbump1k.jpg'),
                load_image(textures[1], '../img/earthmap1k.jpg'),
				load_image(textures[2], '../img/earthspec1k.jpg')]);
            init_texture(gl, texes[0]);
            init_texture(gl, texes[1]);
			init_texture(gl, texes[2]);
        } catch(e) {
            console.log(`${e}`);
        }
    }

	start();

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

	helper.program.setUniform("MVP", helperMVP, "mat4");
	earth.program.setUniform("MVP", earthMVP, "mat4");
	earth.program.setUniform("model", earthModel, "mat4");
	earth.program.setUniform("lightPosition", cameraPosition, "vec3");
	earth.program.setUniform("viewPosition", cameraPosition, "vec3");
	satellite.program.setUniform("MVP", satelliteMVP, "mat4");
	latitudeHelper.program.setUniform("MVP", latitudeMVP, "mat4");

	const loc_sampler_bump = gl.getUniformLocation(earth.program.program, "earthBump");
	const loc_sampler_map = gl.getUniformLocation(earth.program.program, "earthMap");
	const loc_sampler_spec = gl.getUniformLocation(earth.program.program, "earthSpec");

	gl.useProgram(earth.program.program);
	gl.activeTexture(gl.TEXTURE0 + textures[0].unit);
    gl.bindTexture(gl.TEXTURE_2D, textures[0].texture);
    gl.uniform1i(loc_sampler_bump, textures[0].unit);
	gl.activeTexture(gl.TEXTURE0 + textures[1].unit);
    gl.bindTexture(gl.TEXTURE_2D, textures[1].texture);
    gl.uniform1i(loc_sampler_map, textures[1].unit);
	gl.activeTexture(gl.TEXTURE0 + textures[2].unit);
    gl.bindTexture(gl.TEXTURE_2D, textures[2].texture);
    gl.uniform1i(loc_sampler_spec, textures[2].unit);

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
		satellite.program.setUniform("MVP", satelliteMVP, "mat4");

		const latitudeModel = mat4.create();
		mat4.rotateY(latitudeModel, latitudeModel, toRadian(longitude));
		const latitudeMVP = mat4.create();
		mat4.multiply(latitudeMVP, VP, latitudeModel);
		latitudeHelper.program.setUniform("MVP", latitudeMVP, "mat4");
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
		satellite.program.setUniform("MVP", satelliteMVP, "mat4");
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
		earth.program.setUniform("MVP", earthMVP, "mat4");
		earth.program.setUniform("model", earthModel, "mat4");
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

	helper.draw();
	latitudeHelper.draw();
	earth.draw();
	satellite.draw();
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
    return new Program(gl, h_prog);
}

function init_texture(gl, tex)
{
    tex.texture = gl.createTexture(); 
    gl.bindTexture(gl.TEXTURE_2D, tex.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);// Flip the image's y-axis
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex.image);
    return true;
}

main();
