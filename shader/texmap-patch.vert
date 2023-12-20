#version 300 es
#define M_PI 3.1415926535897932384626433832795
layout(location=${loc_aTexCoords}) in vec2 aTexCoords;
uniform mat4 MVP;
uniform vec4 points[16];
out vec2 vTexCoords;
void main() 
{
    float angle = (aTexCoords.s - 0.5)*M_PI;    // -pi/2 ~ +pi/2
    vec3 p = 3.0*vec3(cos(angle), sin(angle), aTexCoords.t - 0.5);
    gl_Position = MVP * vec4(p,1.0);
    vTexCoords = aTexCoords;
}

