#version 300 es
precision highp float;

in vec2 vTexCoords;
in vec3 vTangentU;
in vec3 vTangentV;
in vec3 vSurfaceToView;

out vec4 fColor;

uniform sampler2D tex;
uniform vec3 lightDirection;
uniform vec3 sunAmbient;
uniform vec3 sunDiffuse;
uniform vec3 sunSpecular;
uniform vec3 materialAmbient;
uniform vec3 materialDiffuse;
uniform vec3 materialSpecular;
uniform float materialShininess;

void main()
{
    // Sample the texture
    vec4 texColor = texture(tex, vTexCoords);

    // Normal mapping using tangent space vectors
    vec3 normal = normalize(cross(vTangentU, vTangentV));

    // Calculate light direction in tangent space
    vec3 lightDir = normalize(lightDirection);

    // Lambertian reflection (diffuse)
    float diffuseStrength = clamp(dot(normal, lightDir), 0.0, 1.0);
    vec3 diffuse = normal * diffuseStrength;

    // Blinn-Phong reflection (specular)
    vec3 viewDir = normalize(vSurfaceToView);
    vec3 halfDir = normalize(lightDir + viewDir);
    float specAngle = clamp(dot(normal, halfDir), 0.0, 1.0);
    float specularStrength = pow(specAngle, materialShininess);
    vec3 specular = sunSpecular * materialSpecular * specularStrength;

    // Ambient reflection
    vec3 ambient =  materialAmbient;
    vec3 finalColor = (ambient + diffuse + specular);

    fColor = vec4(finalColor, 1);
}