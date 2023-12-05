// http://rodger.global-linguist.com/webgl/ch08/PointLightedSphere.js
// modifies to follow the notations in http://mathworld.wolfram.com/SphericalCoordinates.html
import {Mesh} from "./proj2.js";
import {toRadian} from "./lib/gl-matrix/common.js";
"use strict";

const BYTE_SIZE_OF_FLOAT32 = 4;

export function createEarth(gl, SPHERE_DIV, loc_aTexCoord=3, loc_aDegree=4) 
{ // Create a sphere
    let vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    let i, j;
    let theta, phi;
    let u, v;
    let p1, p2;
    
	let degrees = [];
    let texcoords = [];
    let indices = [];
    
    // Generate coordinates
    for (j = 0; j <= SPHERE_DIV; j++)
    {
        v = 1.0 - j/SPHERE_DIV;
        phi = (1.0-v) * Math.PI;
        for (i = 0; i <= SPHERE_DIV; i++)
        {
            u = i/SPHERE_DIV;
            theta = u * 2 * Math.PI;

            texcoords.push(u);
            texcoords.push(v);

			degrees.push(theta);
			degrees.push(phi);
        }
    }

    // Generate indices
    for (j = 0; j < SPHERE_DIV; j++)
    {
        for (i = 0; i < SPHERE_DIV; i++)
        {
            p1 = j * (SPHERE_DIV+1) + i;
            p2 = p1 + (SPHERE_DIV+1);
            
            indices.push(p1);
            indices.push(p2);
            indices.push(p1 + 1);
            
            indices.push(p1 + 1);
            indices.push(p2);
            indices.push(p2 + 1);
        }
    }

	let buf_degree = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf_degree);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(degrees), gl.STATIC_DRAW);
    
    gl.vertexAttribPointer(loc_aDegree, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc_aDegree);

    let buf_texcoord = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf_texcoord);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);
 
    gl.vertexAttribPointer(loc_aTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc_aTexCoord);

    let buf_index = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf_index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

	return new Mesh(gl, vao, indices.length, gl.TRIANGLES);
}

export function createAxisLongitude(gl, SPHERE_DIV, radius = 10, loc_aPosition=0, loc_aColor=1)
{
	let vertex = [
		//axis x
		0.0, 0.0, 0.0, 1.0, 0.0, 0.0,
		radius, 0.0, 0.0, 1.0, 0.0, 0.0,
		-radius, 0.0, 0.0, 1.0, 0.0, 0.0,
		//axis y
		0.0, 0.0, 0.0, 0.0, 1.0, 0.0,
		0.0, radius, 0.0, 0.0, 1.0, 0.0,
		0.0, -radius, 0.0, 0.0, 1.0, 0.0,
		//axis z
		0.0, 0.0, 0.0, 0.0, 0.0, 1.0,
		0.0, 0.0, radius, 0.0, 0.0, 1.0,
		0.0, 0.0, -radius, 0.0, 0.0, 1.0,
	];
	let indices = [
		0, 1,
		0, 2,
		3, 4,
		3, 5,
		6, 7,
		6, 8
	];

	let i;
	let theta, sin_theta, cos_theta;
	let phi, sin_phi, cos_phi;
	let u;
	let index = 9;

	sin_phi = Math.sin(toRadian(90));
	cos_phi = Math.cos(toRadian(90));
	for (i = 0; i <= SPHERE_DIV; i++)
	{
		u = i / SPHERE_DIV;
		theta = u * 2 * Math.PI;
		sin_theta = Math.sin(theta);
		cos_theta = Math.cos(theta);
		vertex.push(radius * sin_theta * sin_phi);
		vertex.push(radius * cos_phi);
		vertex.push(radius * cos_theta * sin_phi);
		vertex.push(1);
		vertex.push(1);
		vertex.push(0);
	}
	for (i = 0; i < SPHERE_DIV; i++)
	{
		indices.push(index);
		indices.push(index + 1);
		index++;
	}

	const vao = gl.createVertexArray();
	gl.bindVertexArray(vao);

	let buf_vertex = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buf_vertex);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertex), gl.STATIC_DRAW);
	gl.vertexAttribPointer(loc_aPosition, 3, gl.FLOAT, false, 6 * BYTE_SIZE_OF_FLOAT32, 0);
	gl.enableVertexAttribArray(loc_aPosition);
	gl.vertexAttribPointer(loc_aColor, 3, gl.FLOAT, false, 6 * BYTE_SIZE_OF_FLOAT32, 3 * BYTE_SIZE_OF_FLOAT32);
	gl.enableVertexAttribArray(loc_aColor);

	let buf_index = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf_index);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

	gl.bindVertexArray(null);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	
	return new Mesh(gl, vao, indices.length, gl.LINES);
}

export function createSatellite(gl, radius = 10, loc_aPosition=0, loc_aColor=1)
{
	const vertex = [
		0.0, 0.0, 0.0, 1.0 ,0.08, 0.6,
		0.0, 0.0, radius, 1.0, 0.08, 0.6
	]

	const indices = [
		0, 1
	]
	const vao = gl.createVertexArray();
	gl.bindVertexArray(vao);
	let buf_vertex = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buf_vertex);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertex), gl.STATIC_DRAW);
	gl.vertexAttribPointer(loc_aPosition, 3, gl.FLOAT, false, 6 * BYTE_SIZE_OF_FLOAT32, 0);
	gl.enableVertexAttribArray(loc_aPosition);
	gl.vertexAttribPointer(loc_aColor, 3, gl.FLOAT, false, 6 * BYTE_SIZE_OF_FLOAT32, 3 * BYTE_SIZE_OF_FLOAT32);
	gl.enableVertexAttribArray(loc_aColor);
	let buf_index = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf_index);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

	gl.bindVertexArray(null);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

	return new Mesh(gl, vao, indices.length, gl.LINES);
}

export function createLatitude(gl, SPHERE_DIV, radius = 10, loc_aPosition=0, loc_aColor=1)
{
	let i;
	let theta, sin_theta, cos_theta;
	let sin_phi, cos_phi;
	let u;
	let index = 0;

	var vertex = [];
	var indices = [];

	sin_phi = Math.sin(toRadian(90));
	cos_phi = Math.cos(toRadian(90));
	for (i = 0; i <= SPHERE_DIV; i++)
	{
		u = i / SPHERE_DIV;
		theta = u * 2 * Math.PI;
		sin_theta = Math.sin(theta);
		cos_theta = Math.cos(theta);
		vertex.push(radius * cos_phi);
		vertex.push(radius * sin_theta * sin_phi);
		vertex.push(radius * cos_theta * sin_phi);
		vertex.push(1);
		vertex.push(1);
		vertex.push(1);
	}
	for (i = 0; i < SPHERE_DIV; i++)
	{
		indices.push(index);
		indices.push(index + 1);
		index++;
	}
	const vao = gl.createVertexArray();
	gl.bindVertexArray(vao);

	let buf_vertex = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buf_vertex);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertex), gl.STATIC_DRAW);
	gl.vertexAttribPointer(loc_aPosition, 3, gl.FLOAT, false, 6 * BYTE_SIZE_OF_FLOAT32, 0);
	gl.enableVertexAttribArray(loc_aPosition);
	gl.vertexAttribPointer(loc_aColor, 3, gl.FLOAT, false, 6 * BYTE_SIZE_OF_FLOAT32, 3 * BYTE_SIZE_OF_FLOAT32);
	gl.enableVertexAttribArray(loc_aColor);

	let buf_index = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf_index);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

	gl.bindVertexArray(null);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	
	return new Mesh(gl, vao, indices.length, gl.LINES);
}

