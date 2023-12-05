import * as mat4 from "./lib/gl-matrix/mat4.js";
import * as vec3 from "./lib/gl-matrix/vec3.js";
import {toRadian} from "./lib/gl-matrix/common.js";
import {createEarth, createAxisLongitude, createLatitude, createSatellite} from "./create_mesh.js"

const loc_aPosition = 0;
const loc_aColor = 1;
const loc_aNormal = 2;
const loc_aTexCoord = 3;
const loc_aDegree = 4;

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
		if (this.program.set_textures != null)
		{
			this.program.set_textures(this.gl);
		}
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
		else if (type === "float")
			this.gl.uniform1f(location, value);
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
uniform mat4 M;
uniform mat4 VP;
out vec4 vColor;
void main() 
{
	mat4 MVP = VP * M;
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
layout(location=${loc_aDegree}) in vec2 aDegree;
layout(location=${loc_aTexCoord}) in vec2 aTexCoord;
uniform mat4 M;
uniform mat4 VP;
uniform vec3 lightPosition;
uniform vec3 viewPosition;
uniform sampler2D earthBump;
uniform float scale;
out vec3 vNormal;
out vec2 vTexCoord;
out vec3 vSurfaceToLight;
out vec3 vSurfaceToView;

void main() 
{
	vec2 invertedTexCoord = vec2(aTexCoord.x, 1.0 - aTexCoord.y);
	float height = texture(earthBump, invertedTexCoord).r;
    float radius = 5.0 + scale * height;
    float theta = aDegree.x;
    float phi = aDegree.y;

    vec4 position;
    position.x = radius * sin(theta) * sin(phi);
    position.y = radius * cos(phi);
    position.z = radius * cos(theta) * sin(phi);
    position.w = 1.0;

	mat4 MVP = VP * M;
    gl_Position = MVP * position;
    vNormal = mat3(transpose(inverse(M))) * position.xyz;
    vTexCoord = aTexCoord;
    vec3 surface = (M * position).xyz;
    vSurfaceToLight = lightPosition - surface;
    vSurfaceToView = viewPosition - surface;
}
`;

const earth_frag =
`#version 300 es
precision mediump float;
in vec3 vNormal;
in vec2 vTexCoord;
in vec3 vSurfaceToLight;
in vec3 vSurfaceToView;
uniform sampler2D earthMap;
uniform sampler2D earthSpec;
out vec4 fColor;
void main() 
{
	vec3 normal = normalize(vNormal);

	vec3 surfaceToLightDirection = normalize(vSurfaceToLight);
	vec3 surfaceToViewDirection = normalize(vSurfaceToView);
	vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);

	float light = dot(normal, surfaceToLightDirection);
	float specular = 0.0;
	if (light > 0.0) {
		vec4 specMapColor = texture(earthSpec, vTexCoord);
    	specular = pow(dot(normal, halfVector), 64.0) * specMapColor.r;
  	}
  	fColor = texture(earthMap, vTexCoord);
  	fColor.rgb *= light;
  	fColor.rgb += specular;
}`;
const satellitePosition = [0, 0, 10];
let sCameraPosition = [0, 0, 0];
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
	const heightSlider = document.getElementById('height');
	const heightValue = document.getElementById('height-val');

	// create Contexts
	const helper = new Context(gl);
	const earth = new Context(gl);
	const satellite = new Context(gl);
	const latitudeHelper = new Context(gl);
	helper.mesh = createAxisLongitude(gl, 50, 10);
	helper.program = createProgram(gl, helper_vert, helper_frag);
	earth.mesh = createEarth(gl, 200);
	earth.program = createProgram(gl, earth_vert, earth_frag);
	satellite.mesh = createSatellite(gl, 10);
	satellite.program = createProgram(gl, helper_vert, helper_frag);
	latitudeHelper.mesh = createLatitude(gl, 50, 10);
	latitudeHelper.program = createProgram(gl, helper_vert, helper_frag);

	// View and Projection matrix
    const VP = mat4.create();
    mat4.perspective(VP, toRadian(30), (canvas.width / 2) / canvas.height, 1, 100);
	const cameraPosition = [30, 10, 30];
	const lightPosition = [15, 35, 15];
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
	vec3.transformMat4(sCameraPosition, satellitePosition, satelliteModel);

	helper.program.setUniform("VP", VP, "mat4");
	helper.program.setUniform("M", helperModel, "mat4");
	earth.program.setUniform("VP", VP, "mat4");
	earth.program.setUniform("M", earthModel, "mat4");
	earth.program.setUniform("lightPosition", lightPosition, "vec3");
	earth.program.setUniform("viewPosition", cameraPosition, "vec3");
	earth.program.setUniform("scale", 1.0, "float");
	satellite.program.setUniform("VP", VP, "mat4");
	satellite.program.setUniform("M", satelliteModel, "mat4");
	latitudeHelper.program.setUniform("VP", VP, "mat4");
	latitudeHelper.program.setUniform("M", satelliteModel, "mat4");

	// texturing
	const bumpTexture = {texture:null, unit:0, image:new Image(), loaded:false};
	const mapTexture = {texture:null, unit:1, image:new Image(), loaded:false};
	const specTexture = {texture:null, unit:2, image:new Image(), loaded:false};

	const loc_sampler_bump = gl.getUniformLocation(earth.program.program, "earthBump");
	const loc_sampler_map = gl.getUniformLocation(earth.program.program, "earthMap");
	const loc_sampler_spec = gl.getUniformLocation(earth.program.program, "earthSpec");

	earth.program.set_textures = function(gl) 
    {
        gl.activeTexture(gl.TEXTURE0 + bumpTexture.unit);
        gl.bindTexture(gl.TEXTURE_2D, bumpTexture.texture);
        gl.uniform1i(loc_sampler_bump, bumpTexture.unit);

        gl.activeTexture(gl.TEXTURE0 + mapTexture.unit);
        gl.bindTexture(gl.TEXTURE_2D, mapTexture.texture);
        gl.uniform1i(loc_sampler_map, mapTexture.unit);

		gl.activeTexture(gl.TEXTURE0 + specTexture.unit);
        gl.bindTexture(gl.TEXTURE_2D, specTexture.texture);
        gl.uniform1i(loc_sampler_spec, specTexture.unit);
    };


	function load_image(tex, src)
    {
        return new Promise(function(resolve, reject) {
            tex.image.onload = () => resolve(tex);
            tex.image.onerror = () => reject(new Error(`Error while loading image "${src}"`));
            tex.image.src = src;
        });
    }

    Promise.all([
        load_image(bumpTexture, '../img/earthbump1k.jpg'),
        load_image(mapTexture, '../img/earthmap1k.jpg'),
		load_image(specTexture, '../img/earthspec1k.jpg')
    ]).then(
        function(texes) {
            init_texture(gl, texes[0]);
            init_texture(gl, texes[1]);
			init_texture(gl, texes[2]);
			render_scene({
				gl,
				canvas,
				helper,
				latitudeHelper,
				earth,
				satellite
			})
        }
    ).catch(
        err => console.log(err.message)
    );

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

	heightSlider.addEventListener("input", () => {
		updateHeightAndRender();
	});

	const updateHeightAndRender = () => {
		heightValue.textContent = heightSlider.value;
		const height = parseFloat(heightSlider.value);
		earth.program.setUniform("scale", height / 10, "float");
		render_scene({
			gl,
			canvas,
			helper,
			latitudeHelper,
			earth,
			satellite
		});
	}

	const updateLongtitudeAndRender = () => {
		longitudeValue.textContent = longitudeSlider.value;
		latitudeValue.textContent = latitudeSlider.value;
		const longitude = parseFloat(longitudeSlider.value);
		const latitude = -parseFloat(latitudeSlider.value);

		const satelliteModel = mat4.create();
		mat4.rotateY(satelliteModel, satelliteModel, toRadian(longitude));
		mat4.rotateX(satelliteModel, satelliteModel, toRadian(latitude));
		satellite.program.setUniform("M", satelliteModel, "mat4");
		vec3.transformMat4(sCameraPosition, satellitePosition, satelliteModel);

		const latitudeModel = mat4.create();
		mat4.rotateY(latitudeModel, latitudeModel, toRadian(longitude));
		latitudeHelper.program.setUniform("M", latitudeModel, "mat4");
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
		satellite.program.setUniform("M", satelliteModel, "mat4");
		vec3.transformMat4(sCameraPosition, satellitePosition, satelliteModel);
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
		//mat4.rotateX(earthModel, earthModel, toRadian(-90));
		mat4.rotateY(earthModel, earthModel, toRadian(angle));
		earth.program.setUniform("M", earthModel, "mat4");
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

function render_scene(params) {
    const {gl, canvas, helper, latitudeHelper, earth, satellite} = params;

    gl.clearColor(0.1, 0.1, 0.1, 1);

    gl.viewport(0, 0, canvas.width / 2, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

	const VP1 = mat4.create();
    mat4.perspective(VP1, toRadian(30), (canvas.width / 2) / canvas.height, 1, 100);
	const cameraPosition = [30, 10, 30];
	const lightPosition = [15, 35, 15];
	var up = [0, 1, 0];
	var fPosition = [0, 0, 0];
	var viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, cameraPosition, fPosition, up);
	mat4.multiply(VP1, VP1, viewMatrix);
	earth.program.setUniform("VP", VP1, "mat4");
	helper.program.setUniform("VP", VP1, "mat4");
	satellite.program.setUniform("VP", VP1, "mat4");
	latitudeHelper.program.setUniform("VP", VP1, "mat4");

    gl.enable(gl.DEPTH_TEST);
    helper.draw();
    latitudeHelper.draw();
    earth.draw();
    satellite.draw();

    gl.viewport(canvas.width / 2, 0, canvas.width / 2, canvas.height);
	const VP = mat4.create();
	console.log(satellitePosition);
    mat4.perspective(VP, toRadian(40), (canvas.width / 2) / canvas.height, 1, 100);
	var up = [0, 1, 0];
	var fPosition = [0, 0, 0];
	var viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, sCameraPosition, fPosition, up);
	mat4.multiply(VP, VP, viewMatrix);

	earth.program.setUniform("VP", VP, "mat4");
	helper.program.setUniform("VP", VP, "mat4");
	satellite.program.setUniform("VP", VP, "mat4");
	latitudeHelper.program.setUniform("VP", VP, "mat4");

    gl.enable(gl.DEPTH_TEST);
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
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex.image);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);// Flip the image's y-axis
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
	return true;
}

main();
