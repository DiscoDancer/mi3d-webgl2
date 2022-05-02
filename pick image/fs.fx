
  precision mediump float;

  varying vec2 v_texCoords;

  uniform sampler2D u_texture1;
  uniform sampler2D u_texture2;
  uniform int u_tex2Mode;
  uniform bool u_wavy;

  vec3 blend( vec3 color1, vec3 color2, int blendMode ) {
     if ( blendMode == 0 )
         return color1 * color2;
     if ( blendMode == 1 )
         return (color1 + color2) / 2.0;
     if ( blendMode == 2 )
         return clamp(color1 - color2, 0.0, 1.0);
     if ( blendMode == 3 )
         return color2;
     return color1;
  }
  
  void main() {
     vec2 texCoords = v_texCoords;
     if ( u_wavy )
         texCoords.y += 0.25 * sin(6.28*texCoords.x);
     vec3 texColor1 = texture2D( u_texture1, texCoords).rgb;
     vec3 texColor2 = texture2D( u_texture2, texCoords ).rgb;
     vec3 color =  blend(texColor1, texColor2, u_tex2Mode);
     gl_FragColor = vec4( color, 1.0 );
  }