var renderUtil = {

   vertices: [],
   colors: [],

   setupCanvas: function(elementId, width, height) {

         var canvas = document.getElementById(elementId);

         canvas.style.height = height;
         canvas.style.width = width;
         canvas.setAttribute("height", height);
         canvas.setAttribute("width", width);

         return canvas;
   },

   loadShader: function(gl, elementId) {
      var element = document.getElementById(elementId);

      if(element == null)
         return null;

      var shaderCode = element.textContent;

      var shader = gl.createShader(this.getShaderType(gl, element.getAttribute("type")));
      gl.shaderSource(shader, shaderCode);
      gl.compileShader(shader);

      return shader;
   },

   getShaderType: function(gl, typeAttribute) {
      if(typeAttribute === "x-shader/x-fragment")
         return gl.FRAGMENT_SHADER;
      if(typeAttribute === "x-shader/x-vertex")
         return gl.VERTEX_SHADER;
      return null;
   },

   createShaderProgram: function(gl, shaders) {
      var shaderProgram = gl.createProgram();

      shaders.forEach(function(shader) {
         gl.attachShader(shaderProgram, shader);
      });

      gl.linkProgram(shaderProgram);
      gl.useProgram(shaderProgram);

      return shaderProgram;
   },

   createShaderAttribute: function(gl, shaderProgram, attributeName) {
      var attribute = gl.getAttribLocation(shaderProgram, attributeName);
      gl.enableVertexAttribArray(attribute);
      return attribute;
   },

   renderSimpleQuad: function(gl, centerCoordinate, radiusX, radiusY, color, vertexAttribute, colorAttribute) {
      var vertices = [
         centerCoordinate[0] - radiusX, centerCoordinate[1] - radiusY,
         centerCoordinate[0] - radiusX, centerCoordinate[1] + radiusY,
         centerCoordinate[0] + radiusX, centerCoordinate[1] - radiusY
      ];

      this.renderTriangle(gl, vertices, color, vertexAttribute, colorAttribute);

      vertices = [
         centerCoordinate[0] + radiusX , centerCoordinate[1] + radiusY,
         centerCoordinate[0] + radiusX, centerCoordinate[1] - radiusY,
         centerCoordinate[0] - radiusX, centerCoordinate[1] + radiusY
      ];

      this.renderTriangle(gl, vertices, color, vertexAttribute, colorAttribute);
   },
   
   renderTriangle: function(gl, vertices, color, vertexAttribute, colorAttribute) {
		
		var actualColor = [];
		for(var i = 0;i < 3;++i) {
			color.forEach(function(colorEntry) {
				actualColor.push(colorEntry);
			});
		}
		
		renderUtil.createAndBindBuffer(gl, gl.ARRAY_BUFFER, vertices   , gl.STATIC_DRAW, vertexAttribute, 2, gl.FLOAT);
		renderUtil.createAndBindBuffer(gl, gl.ARRAY_BUFFER, actualColor, gl.STATIC_DRAW, colorAttribute , 4, gl.FLOAT);
		gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
   },

   createAndBindBuffer: function(gl, target, bufferData, usage, attribute, elementsPerVector, dataType) {
      var buffer = gl.createBuffer();

      gl.bindBuffer(target, buffer);
      gl.bufferData(target, new Float32Array(bufferData), usage);
      gl.vertexAttribPointer(attribute, elementsPerVector, dataType, false, 0, 0);

      return buffer;
   },

   renderMultipleTriangles: function(vertices, color) {

   },

   drawFrame: function(gl, coordinatesAttribute, colorAttribute) {
      
      var colorBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.STATIC_DRAW);
      gl.vertexAttribPointer(colorAttribute, 4, gl.FLOAT, false, 0, 0);

      var vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
      gl.vertexAttribPointer(coordinatesAttribute, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length / 2);

      this.vertices.length = 0;
      this.colors.length = 0;
   }
/**
   testRender: function(gl, coordinatesAttribute, colorAttribute) {
      
      var vertices = [];
      var colors = [];

      for(var index = 0;index < 10000;++index) {
         var centerX = Math.random() * 2 - 1;
         var centerY = Math.random() * 2 - 1;

         vertices.push(centerX - 0.005, centerY - 0.005);
         vertices.push(centerX - 0.005, centerY + 0.005);
         vertices.push(centerX + 0.005, centerY - 0.005);

         var r = Math.random();
         var g = Math.random();
         var b = Math.random();

         colors.push(
            r, g, b, 1,
            r, g, b, 1,
            r, g, b, 1
         );
      }

      var colorBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
      gl.vertexAttribPointer(colorAttribute, 4, gl.FLOAT, false, 0, 0);

      var vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
      gl.vertexAttribPointer(coordinatesAttribute, 2, gl.FLOAT, false, 0, 0);

      // Draw the triangle
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
   }
   **/
};