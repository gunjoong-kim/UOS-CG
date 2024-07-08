import * as mat4 from "./lib/gl-matrix/mat4.js";
import * as vec3 from "./lib/gl-matrix/vec3.js";
import {toRadian} from "./lib/gl-matrix/common.js";
import {createEarth, createAxisLongitude, createLatitude, createSatellite} from "./create_mesh.js"

const loc_aPosition = 0;
const loc_aColor = 1;
const loc_aNormal = 2;
const loc_aTexCoord = 3;
const loc_aDegree = 4;

const axisName = "AXIS";
const earthName = "NAME";
const satelliteName = "SATELLITE";
const latitudeName = "LATITUDE";

const cameraPositionW = [30, 10, 30];
const lightPositionW = [15, 35, 15];

export class Context 
{
	constructor(gl, program)
	{
		this.gl = gl;
		this.program = program;
		this.meshs = [];
	}
	draw()
	{
		this.gl.useProgram(this.program.program);
		this.program.setUniform("VP", this.program.VP, "mat4");
		for (const mesh of this.meshs)
		{
    		this.gl.bindVertexArray(mesh.vao);
			this.program.setUniform("M", mesh.M, "mat4");
			if (this.program.setTextures != null)
			{
				this.program.setTextures(this.gl);
			}
    		this.gl.drawElements(mesh.drawMode, mesh.indiceCnt, this.gl.UNSIGNED_SHORT, 0);
    		this.gl.bindVertexArray(null);
		}
		this.gl.useProgram(null);
	}
}

export class Program
{
	constructor(gl, program)
	{
		this.gl = gl;
		this.program = program;
		this.VP = null;
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
		else if (type === "int")
			this.gl.uniform1i(location, value);
		else
			console.log("No matching types...");
	}
}

export class Mesh
{
	constructor(gl, name, vao, indiceCnt, drawMode)
	{
		this.name = name;
		this.gl = gl;
		this.vao = vao;
		this.indiceCnt = indiceCnt;
		this.drawMode = drawMode;
		this.M = null;
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
uniform vec3 spotLightPosition;
out vec3 vNormal;
out vec2 vTexCoord;
out vec3 vSurfaceToLight;
out vec3 vSurfaceToView;
out vec3 vSurfaceToSpot;
out vec3 vSpotDirection;

const float PI = 3.141592653589793;

void main() 
{
    vec2 invertedTexCoord = vec2(aTexCoord.x, 1.0 - aTexCoord.y);
    float height = texture(earthBump, invertedTexCoord).r;
    float radius = 5.0 + scale * height;
    float theta = aDegree.x;
    float phi = aDegree.y;
	float sinTheta = sin(theta);
	float sinPhi = sin(phi);
	float cosTheta = cos(theta);
	float cosPhi = cos(phi);

	float epsilon = 0.0001;
	vec2 coord1 = vec2(invertedTexCoord.x + epsilon, invertedTexCoord.y);
	vec2 coord2 = vec2(invertedTexCoord.x - epsilon, invertedTexCoord.y);
	vec2 coord3 = vec2(invertedTexCoord.x, invertedTexCoord.y + epsilon);
	vec2 coord4 = vec2(invertedTexCoord.x, invertedTexCoord.y - epsilon);

	float drds = (scale * (texture(earthBump, coord1).r - texture(earthBump, coord2).r)) / (2.0 * epsilon);
	float drdt = (scale * (texture(earthBump, coord3).r - texture(earthBump, coord4).r)) / (2.0 * epsilon);

	vec3 dpds = vec3(
		2.0 * PI * (5.0 * cosTheta * sinPhi) + drds * (sinTheta * sinPhi), // y
		drds * cosPhi, // z
		2.0 * PI * (-5.0 * sinTheta * sinPhi) + drds * (cosTheta * sinPhi) // x
	);
	
	vec3 dpdt = vec3(
		-PI * (5.0 * sinTheta * cosPhi) + drdt * (sinTheta * sinPhi), // y
		PI * (5.0 * sinPhi) + drdt * cosPhi, // z
		-PI * (5.0 * cosTheta * cosPhi) + drdt * (cosTheta * sinPhi) // x
	);

	vec3 normal = normalize(cross(dpds, dpdt));


    vec4 position;
    position.x = radius * sinTheta * sinPhi;
    position.y = radius * cosPhi;
    position.z = radius * cosTheta * sinPhi;
    position.w = 1.0;

	//vec3 normal = position.xyz;

    mat4 MVP = VP * M;
    gl_Position = MVP * position;
    vNormal = mat3(transpose(inverse(M))) * normal;
    vTexCoord = aTexCoord;
    vec3 surface = (M * position).xyz;
    vSurfaceToLight = lightPosition - surface;
    vSurfaceToView = viewPosition - surface;
    vSurfaceToSpot = spotLightPosition - surface;
    vSpotDirection = normalize(spotLightPosition - surface);
}
`;

const earth_frag =
`#version 300 es
precision mediump float;
in vec3 vNormal;
in vec2 vTexCoord;
in vec3 vSurfaceToLight;
in vec3 vSurfaceToView;
in vec3 vSurfaceToSpot;
in vec3 vSpotDirection;
uniform float outerAngle;
uniform sampler2D earthMap;
uniform sampler2D earthSpec;
uniform int turnSpot;
uniform int turnLight;
out vec4 fColor;

void main() 
{
	float outer = cos(radians(outerAngle));
	float inner = cos(radians(0.0));
    vec3 normal = normalize(vNormal);
    vec3 surfaceToLightDirection = normalize(vSurfaceToLight);
    vec3 surfaceToViewDirection = normalize(vSurfaceToView);
    vec3 surfaceToSpotDirection = normalize(vSurfaceToSpot);
    vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);
    vec3 halfVectorSpot = normalize(surfaceToSpotDirection + surfaceToViewDirection);

    vec4 specMapColor = texture(earthSpec, vTexCoord);

    float dotFromDirection = dot(normal, vSpotDirection);
    float inLight = smoothstep(outer, inner, dotFromDirection);
    inLight *= dot(normal, surfaceToSpotDirection);
	inLight = clamp(inLight, 0.0, 1.0);
    float inSpec = pow(dot(normal, halfVectorSpot), 64.0) * specMapColor.r;

    float light = dot(normal, surfaceToLightDirection);
	light = clamp(light, 0.0, 1.0);
    float specular = 0.0;
    specular = pow(dot(normal, halfVector), 64.0) * specMapColor.r;

	if (turnSpot == 0)
	{
		inLight = 0.0;
		inSpec = 0.0;
	}
	if (turnLight == 0)
	{
		light = 0.0;
		specular = 0.0;
	}
    float totalLight = light + inLight;
    fColor = texture(earthMap, vTexCoord);
    fColor.rgb *= totalLight;
    fColor.rgb += specular + inSpec;
}
`;

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
	const spotSlider = document.getElementById('cutoff-angle');
	const spotSliderValue = document.getElementById('cutoff-angle-val');
	const lightCheck = document.getElementById('light-point');
	const spotCheck = document.getElementById('light-spot');
	const messageBox = document.getElementById('message');

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

	// create Contexts
	const helper = new Context(gl);
	const earth = new Context(gl);

	helper.program = createProgram(gl, helper_vert, helper_frag);
	earth.program = createProgram(gl, earth_vert, earth_frag);

	const meshAxis = createAxisLongitude(gl, axisName, 50, 10);
	meshAxis.M = helperModel;
	const meshEarth = createEarth(gl, earthName, 250);
	meshEarth.M = earthModel;
	const meshSatellite = createSatellite(gl, satelliteName, 10);
	meshSatellite.M = satelliteModel;
	const meshLatitude = createLatitude(gl, latitudeName, 50, 10);
	meshLatitude.M = latitudeModel;

	helper.meshs.push(meshAxis);
	helper.meshs.push(meshLatitude);
	helper.meshs.push(meshSatellite);
	earth.meshs.push(meshEarth);

	// texturing
	const bumpTexture = {texture:null, unit:0, image:new Image(), loaded:false};
	const mapTexture = {texture:null, unit:1, image:new Image(), loaded:false};
	const specTexture = {texture:null, unit:2, image:new Image(), loaded:false};

	const loc_sampler_bump = gl.getUniformLocation(earth.program.program, "earthBump");
	const loc_sampler_map = gl.getUniformLocation(earth.program.program, "earthMap");
	const loc_sampler_spec = gl.getUniformLocation(earth.program.program, "earthSpec");

	const scale = parseFloat(heightSlider.value) / 20;
	const spotAngle = parseFloat(spotSlider.value);
	earth.program.setUniform("turnLight", 1, "int");
	earth.program.setUniform("turnSpot", 1, "int");
	earth.program.setUniform("outerAngle", spotAngle, "float");
	earth.program.setUniform("lightPosition", lightPositionW, "vec3");
	earth.program.setUniform("viewPosition", cameraPositionW, "vec3");
	earth.program.setUniform("scale", scale, "float");

	earth.program.setTextures = function(gl)
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
				earth,
			})
        }
    ).catch(
        err => console.log(err.message)
    );

	lightCheck.addEventListener("input", () => {
		const value = lightCheck.value;
		if (value == "off")
		{
			earth.program.setUniform("turnLight", 1, "int");
			lightCheck.value = "on";
		}
		else
		{
			earth.program.setUniform("turnLight", 0, "int");
			lightCheck.value = "off";
		}
		render_scene({
			gl,
			canvas,
			helper,
			earth,
		});
	})

	spotCheck.addEventListener("input", () => {
		const value = spotCheck.value;
		if (value == "off")
		{
			earth.program.setUniform("turnSpot", 1, "int");
			spotCheck.value = "on";
		}
		else
		{
			earth.program.setUniform("turnSpot", 0, "int");
			spotCheck.value = "off";
		}
		render_scene({
			gl,
			canvas,
			helper,
			earth,
		});
	})

	rotationSlider.addEventListener("input", () => {
		updateAngleAndRender();
	})

	spotSlider.addEventListener("input", () => {
		updateSpotAndRender();
	})

	longitudeSlider.addEventListener("input", () => {
		updateLongtitudeAndRender();
	});
	window.addEventListener("keydown", (event) => {
		if (event.key === "ArrowRight" && parseFloat(longitudeSlider.value) < parseFloat(longitudeSlider.max)) {
			longitudeSlider.stepUp();
			messageBox.textContent = "Right arrow is pressed.";
			updateLongtitudeAndRender();
		} else if (event.key === "ArrowLeft" && parseFloat(longitudeSlider.value) > parseFloat(longitudeSlider.min)) {
			longitudeSlider.stepDown();
			messageBox.textContent = "Left arrow is pressed.";
			updateLongtitudeAndRender();
		}
	});
	
	latitudeSlider.addEventListener("input", () => {
		updateLatitudeAndRender();
	});
	
	window.addEventListener("keydown", (event) => {
		if (event.key === "ArrowUp" && parseFloat(latitudeSlider.value) < parseFloat(latitudeSlider.max)) {
			latitudeSlider.stepUp();
			messageBox.textContent = "Up arrow is pressed.";
			updateLatitudeAndRender();
		} else if (event.key === "ArrowDown" && parseFloat(latitudeSlider.value) > parseFloat(latitudeSlider.min)) {
			latitudeSlider.stepDown();
			messageBox.textContent = "Down arrow is pressed.";
			updateLatitudeAndRender();
		}
	});
	heightSlider.addEventListener("input", () => {
		updateHeightAndRender();
	});

	const updateHeightAndRender = () => {
		heightValue.textContent = heightSlider.value;
		const height = parseFloat(heightSlider.value);
		earth.program.setUniform("scale", height / 20, "float");
		render_scene({
			gl,
			canvas,
			helper,
			earth,
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
		const index = helper.meshs.findIndex(mesh => mesh.name === satelliteName);
		helper.meshs[index].M = satelliteModel;

		const latitudeModel = mat4.create();
		mat4.rotateY(latitudeModel, latitudeModel, toRadian(longitude));
		const index1 = helper.meshs.findIndex(mesh => mesh.name === latitudeName);
		helper.meshs[index1].M = latitudeModel;
		render_scene({
			gl,
			canvas,
			helper,
			earth,
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
		const index = helper.meshs.findIndex(mesh => mesh.name === satelliteName);
		helper.meshs[index].M = satelliteModel;
		render_scene({
			gl,
			canvas,
			helper,
			earth,
		});
	};

	const updateAngleAndRender = () => {
		rotationValue.textContent = rotationSlider.value;
		const angle = parseFloat(rotationSlider.value);
		const earthModel = mat4.create();
		mat4.rotateY(earthModel, earthModel, toRadian(angle));
		earth.meshs[0].M = earthModel;
		render_scene({
			gl,
			canvas,
			helper,
			earth,
		});
	}

	const updateSpotAndRender = () => {
		spotSliderValue.textContent = spotSlider.value;
		const angle = parseFloat(spotSlider.value);
		earth.program.setUniform("outerAngle", angle, "float");
		render_scene({
			gl,
			canvas,
			helper,
			earth,
		});
	}
}

function render_scene(params) {
    const {gl, canvas, helper, earth} = params;

	const index = helper.meshs.findIndex(mesh => mesh.name === satelliteName);
	var satelliteLocation = [0, 0, 10];
	vec3.transformMat4(satelliteLocation, satelliteLocation, helper.meshs[index].M);
	earth.program.setUniform("spotLightPosition", satelliteLocation, "vec3");

    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.viewport(0, 0, canvas.width / 2, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
	const leftVP = mat4.create();
	mat4.perspective(leftVP, toRadian(30), (canvas.width / 2) / canvas.height, 1, 100);
	var up = [0, 1, 0];
	var fPosition = [0, 0, 0];
	var viewMatrix = mat4.create();
	mat4.lookAt(viewMatrix, cameraPositionW, fPosition, up);
	mat4.multiply(leftVP, leftVP, viewMatrix);
	earth.program.VP = leftVP;
	helper.program.VP = leftVP;

    gl.enable(gl.DEPTH_TEST);
    helper.draw();
    earth.draw();
    gl.viewport(canvas.width / 2, 0, canvas.width / 2, canvas.height);
	const rightVP = mat4.create();
    mat4.perspective(rightVP, toRadian(30), (canvas.width / 2) / canvas.height, 1, 100);
	const viewMatrix2 = mat4.create();
	mat4.copy(viewMatrix2, helper.meshs[index].M);
	mat4.translate(viewMatrix2, viewMatrix2, [0, 0, 10]);
	mat4.invert(viewMatrix2, viewMatrix2);
	mat4.multiply(rightVP, rightVP, viewMatrix2);

	earth.program.VP = rightVP;
	helper.program.VP = rightVP;

    gl.enable(gl.DEPTH_TEST);
    helper.draw();
    earth.draw();
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
