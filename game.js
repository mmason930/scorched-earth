var game = {
	setup: function() {

		this.setupCanvas();
        this.updateLastPulseTime();
        this.setupGL();

        this.FALLING_SPEED = 10;
        this.TERRAIN_TEXTURE_WIDTH = 960*2;
        this.TERRAIN_TEXTURE_HEIGHT = 540*2;
        this.INDICES_PER_TERRAIN_BLOCK = 3;
        this.FPS = 60;
		this.pulses = 0;
        this.tanks = [];
        this.missiles = [];
        this.tankTurnIndex = null;
        this.gravity = 5.00;
        this.turnPipeline = [];
        this.terrain = new Terrain(this.FALLING_SPEED, this.TERRAIN_TEXTURE_WIDTH, this.TERRAIN_TEXTURE_HEIGHT);
		this.terrainTexture = null;
		this.verbose = false;

        this.tanks.push(
        	new Tank(
				//this.terrainToGLCoordinates([400, 0]),
        		[200, 1100],
        		"Kison",
        		[1, 0, 0, 1]
        	),

        	new Tank(
        		[600, 1100],
        		"Norum",
        		[0, 0, 1, 1]
        	)
      	);

      	this.switchTurn();

      	document.onkeypress = this.onKeyPress.bind(this);
      	document.onkeydown = this.onKeyDown.bind(this);
        setInterval(this.pulse.bind(this), 1000 / this.FPS);
        setInterval(this.showStatus.bind(this), 500);
	},

	handleClick: function(e) {
		var offsetX = e.offsetX;
		var offsetY = this.CANVAS_HEIGHT - e.offsetY;

		var terrainCoordinates = terrain.getCoordinatesByCanvasPoint([offsetX, offsetY], this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

		console.log("Offset: " + offsetX + "," + offsetY + ", - TERRAIN: " + terrainCoordinates);

		var radius = 100;
		var radiusSquared = radius*radius;

		var leftX = terrainCoordinates[0] - radius;
		var bottomY = terrainCoordinates[1] - radius;
		var rightX = terrainCoordinates[0] + radius;
		var topY = terrainCoordinates[1] + radius;
		
		var segments = [];
		
		for(var x = leftX;x <= rightX;++x) {
			
			var currentSegment = null;
			for(var y = bottomY;y <= topY;++y) {
				
				//Is this block within the circle?

				if(Math.pow(terrainCoordinates[0] - x, 2) + (Math.pow(terrainCoordinates[1] - y, 2)) <= radiusSquared) {
					
					if(Math.random() * 100 >= 20) {
						if(currentSegment == null)
							currentSegment = [x,y,y];
						else
							currentSegment[2] = y;
					}
					else {
						if(currentSegment != null) {
							segments.push(currentSegment);
							currentSegment = null;
						}
					}
				}
			}
			
			if(currentSegment != null)
				segments.push(currentSegment);
		}
		
		terrain.destruct(segments);
	},

	setupGL: function() {

		this.gl = this.canvas.getContext("webgl") || this.canvas.getContext('experimental-webgl');
		
		var terrainFragShader = renderUtil.loadShader(this.gl, "frag-color-shader");
		var terrainVertShader = renderUtil.loadShader(this.gl, "vertex-shader");
		this.terrainShaderProgram = renderUtil.createShaderProgram(this.gl, [terrainFragShader, terrainVertShader]);
		
		var mainFragShader = renderUtil.loadShader(this.gl, "main-frag");
		var mainVertShader = renderUtil.loadShader(this.gl, "main-vert");
		this.mainShaderProgram = renderUtil.createShaderProgram(this.gl, [mainFragShader, mainVertShader]);
		
		// Set the view port
		this.gl.viewport(0, 0, canvas.width, canvas.height);

		// Enable the depth test
		this.gl.enable(this.gl.DEPTH_TEST);

		this.coordinatesAttribute = renderUtil.createShaderAttribute(this.gl, this.terrainShaderProgram, "coordinates");
		this.textCoordAttribute = renderUtil.createShaderAttribute(this.gl, this.terrainShaderProgram, "aTextureCoord");
		this.mainCoordinatesAttribute = renderUtil.createShaderAttribute(this.gl, this.mainShaderProgram, "coordinates");
		this.mainColorAttribute = renderUtil.createShaderAttribute(this.gl, this.mainShaderProgram, "polyColor");
	},

	getCurrentTurnTank: function() {
		return this.tanks[this.tankTurnIndex];
	},

	getLastPulseTime: function() {
		return this.lastPulseTime;
	},

	updateLastPulseTime: function() {
		var previousLastPulseTime = this.lastPulseTime;
		var currentTime = new Date().getTime();

		this.lastPulseTime = currentTime;

		return previousLastPulseTime == null ? null : currentTime - previousLastPulseTime;
	},

	onKeyPress: function(e) {
		switch(e.keyCode) {
			case 122:
				this.getCurrentTurnTank().rotateFiringAngle(true);
				break;
			case 120:
				this.getCurrentTurnTank().rotateFiringAngle(false);
				break;
			case 100:
				this.getCurrentTurnTank().position[0] += 1;
				break;
			case 97:
				this.getCurrentTurnTank().position[0] -= 1;
				break;
			case 119:
				this.getCurrentTurnTank().position[1] += 1;
				break;
			case 115:
				this.getCurrentTurnTank().position[1] -= 1;
				break;
		}
	},

	update: function(delta) {

		for(var missileIndex = 0;missileIndex < this.missiles.length;++missileIndex) {
			var missile = this.missiles[missileIndex];
			missile.move(delta);
			missile.gravityPull(delta, this.gravity);

			if(missile.getBottomY() <= 0.00) {
				//Explode...
				this.missiles.splice(missileIndex, 1);
				--missileIndex;
				continue;
			}
		}
	},

	onKeyDown: function(e) {
		if(e.keyCode == 32)
			this.fireMissile(this.getCurrentTurnTank());
			//this.switchTurn();
	},

	switchTurn: function() {
		this.tankTurnIndex = this.tankTurnIndex == null ? 0 : (this.tankTurnIndex + 1) % this.tanks.length;

		document.getElementById("tankTurn").textContent = "Current Turn: " + this.tanks[this.tankTurnIndex].name;
	},

	showStatus: function() {
		var statusElement = document.getElementById("status");
		var statusHtml = ""
		this.tanks.forEach(function(tank) {
			statusHtml += tank.name + ": Health: " + tank.health + ", Angle: " + tank.firingAngle + "<br/>";
		});

		statusElement.innerHTML = statusHtml;
	},

	performItemDrop: function() {
		var game = this;
		this.tanks.forEach(function(tank) {

			//Find highest terrain point between left & right side.

			var bottomLeft = tank.getBottomLeftPosition();
			var bottomRight = tank.getBottomRightPosition();
			var terrainTopY = -1;

/**
 * Improvements:
 * 1) Check terrain from top to bottom, rather than bottom to top.
 * 2) We should have some code here that destroys terrain under the
 * tank until a certain # of points are in contact.
 */

 			var overlappingSegments = [];
			var minSegmentsToStop = 10;
			var numberOfOverlaps = 0;

			for(var x = bottomLeft[0];x <= bottomRight[0];++x) {
				var blockArray = game.terrain.blocks[x];

				for(var blockIndex = 0;blockIndex < blockArray.length;++blockIndex) {
					var block = blockArray[blockIndex];

					//Is the block above us? If so, skip it.
					if(block[0] > bottomRight[1])//TODO: Use top right?
						continue;

					//Block is below us.

					if(terrainTopY < block[1])
						terrainTopY = block[1];

					overlappingSegments.push([x, blockIndex]);
				}
			}

			//We now know the lowest we can drop(terrainTopY + 1)
			var lowestTankPoint = terrainTopY + 1;
			var tankDropPoint = bottomLeft[1] - game.FALLING_SPEED;
			
			if(tankDropPoint < lowestTankPoint)
				tankDropPoint = lowestTankPoint;

			var unitsToDrop = bottomLeft[1] - tankDropPoint;

			tank.position[1] -= unitsToDrop;
		})
	},

	pulse: function() {

		this.pulseNumber = this.pulseNumber == null ? 1 : ++this.pulseNumber;

		this.lastPulseDelta = this.updateLastPulseTime() / 1000;

		this.performItemDrop();
		
		var terrainCollapseBefore = new Date().getTime();
		this.terrain.collapseTerrain();
		var terrainCollapseDuration = new Date().getTime() - terrainCollapseBefore;

		this.update(this.lastPulseDelta);

		var drawBefore = new Date().getTime();
		this.draw();
		var drawDuration = new Date().getTime() - drawBefore;

		if(this.verbose && this.pulseNumber % 10 == 0)
			console.log("Collapsing Terrain Duration: " + terrainCollapseDuration + ", Draw Duration: " + drawDuration);
	},

	draw: function() {
		
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		this.gl.clearColor(0, 0, 0, 1);
		
		this.drawMain();
		this.drawTerrain();
	},
	
	drawTank: function(tank) {
		
		var halfWidth = this.terrainToGLWidth(tank.halfWidth);
		var halfHeight = this.terrainToGLHeight(tank.halfHeight);

		//console.log("Half Width: " + halfWidth);
		//console.log("Half Height: " + halfHeight)

		var tankGlPosition = game.terrainToGLCoordinates(tank.position);
		
		renderUtil.renderSimpleQuad(this.gl, tankGlPosition, halfWidth, halfHeight, tank.color, this.mainCoordinatesAttribute, this.mainColorAttribute);
	},
	
	drawMain: function() {
		var gl = this.gl;
		
		this.gl.useProgram(this.mainShaderProgram);
		
		this.tanks.forEach(function(tank) {
			game.drawTank(tank);
		});
		//renderUtil.renderSimpleQuad(gl, [0.0, 0.5], 0.1, 0.1, [1.0, 0.0, 0.0, 1.0], this.mainCoordinatesAttribute, this.mainColorAttribute);
	},
	
	drawTerrain: function() {
		var gl = this.gl;
		
		this.gl.useProgram(this.terrainShaderProgram);
		
		//Draw a quad covering the entire screen.
		var vertices = [
			-1, -1, -1, 1, 1, 1,
			1, 1, 1, -1, -1, -1
		];

		//Bind the texture to the entire quad.
		var textureCoordinates = [
			0.0, 1.0,
			0.0, 0.0,
			1.0, 0.0,

			1.0, 0.0,
			1.0, 1.0,
			0.0, 1.0
		];

		renderUtil.createAndBindBuffer(gl, gl.ARRAY_BUFFER, textureCoordinates, gl.STATIC_DRAW, this.textCoordAttribute  , 2, gl.FLOAT);

		//Terrain texture.
		if(terrain.textureModified) {
			var texture = texture == null ? this.gl.createTexture() : texture;

			this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
			this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.TERRAIN_TEXTURE_WIDTH, this.TERRAIN_TEXTURE_HEIGHT, 0, gl.RGB, this.gl.UNSIGNED_BYTE, this.terrain.getTerrainArray());

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			this.gl.bindTexture(this.gl.TEXTURE_2D, null);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.uniform1i(gl.getUniformLocation(this.terrainShaderProgram, "uSampler"), 0);
			
			terrain.textureModified = false;
		}
		
		renderUtil.createAndBindBuffer(gl, gl.ARRAY_BUFFER, vertices          , gl.STATIC_DRAW, this.coordinatesAttribute, 2, gl.FLOAT);
		gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
	},

	setupCanvas: function() {
		this.CANVAS_HEIGHT = Math.round(window.innerHeight / 5 * 4);
        this.CANVAS_WIDTH = Math.round(this.CANVAS_HEIGHT / 10 * 16);

        this.canvas = renderUtil.setupCanvas("canvas", this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

        this.canvas.addEventListener("click", this.handleClick.bind(this));
	},
	
	glToTerrainCoordinates: function(glCoordinates) {
		return [
			(glCoordinates[0] + 1) * (this.TERRAIN_TEXTURE_WIDTH/2),
			(glCoordinates[1] + 1) * (this.TERRAIN_TEXTURE_HEIGHT/2)
		];
	},
	terrainToGLCoordinates: function(terrainCoordinates) {
		return [
			terrainCoordinates[0] / (this.TERRAIN_TEXTURE_WIDTH/2) - 1,
			terrainCoordinates[1] / (this.TERRAIN_TEXTURE_HEIGHT/2) - 1
		];
	},
	terrainToGLWidth: function(width) {
		return width / (this.TERRAIN_TEXTURE_WIDTH/2);
	},
	terrainToGLHeight: function(height) {
		return height / (this.TERRAIN_TEXTURE_HEIGHT/2);
	}
};