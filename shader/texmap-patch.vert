#version 300 es
#define M_PI 3.1415926535897932384626433832795
layout(location = ${loc_aTexCoords}) in vec2 aTexCoords;
uniform mat4 MVP;
uniform vec4 points[16];
uniform int connectivity[256];

out vec2 vTexCoords;
out vec3 vTangentU;
out vec3 vTangentV;

out vec3 vSurfaceToView;

float b3_diff(float t, int i)
{
    float oneSix = 1.0 / 6.0;
    if (i == 0)
        return 0.5 * pow(1.0 - t, 2.0);
    else if (i == 1)
        return oneSix * (9.0 * pow(t, 2.0) - 12.0 * t);
    else if (i == 2)
        return oneSix * (-9.0 * pow(t, 2.0) + 6.0 * t + 3.0);
    return 0.5 * pow(t, 2.0);
}

float b3(float t, int i) {
    float oneSix = 1.0 / 6.0;
    if (i == 0)
        return oneSix * pow(1.0 - t, 3.0);
    else if (i == 1)
        return oneSix * (3.0 * pow(t, 3.0) - 6.0 * pow(t, 2.0) + 4.0);
    else if (i == 2)
        return oneSix * (-3.0 * pow(t, 3.0) + 3.0 * pow(t, 2.0) + 3.0 * t + 1.0);
    return oneSix * pow(t, 3.0);
}

void main()
{
    vec4 position = vec4(0.0);
    vec3 tangentU = vec3(0.0);
    vec3 tangentV = vec3(0.0);
    for (int i = 0; i < 4; i++)
    {
        for (int j = 0; j < 4; j++)
        {
            int index = connectivity[16 * gl_InstanceID + 4 * i + j];
            float uB_diff = b3_diff(aTexCoords.x, i);
            float vB_diff = b3_diff(aTexCoords.y, j);
            float uB = b3(aTexCoords.x, i);
            float vB = b3(aTexCoords.y, j);
            position += uB * vB * points[index];
            tangentU += uB_diff * vB * points[index].xyz;
            tangentV += uB * vB_diff * points[index].xyz;
        }
    }
    position = vec4(position.xyz, 1.0);
    gl_Position = MVP * position;
    vTexCoords = aTexCoords;
    
    vTangentU = mat3(MVP) * tangentU;
    vTangentV = mat3(MVP) * tangentV;
    vSurfaceToView = gl_Position.xyz;
}
