#version 300 es
precision mediump float;
uniform sampler2D tex;
in vec2 vTexCoords;
out vec4 fColor;
void main() 
{
    fColor = texture(tex, vTexCoords);
//    fColor = vec4(1.0 - texture(tex, vTexCoords).rgb, 1.0);
}


