function Terrain(fallingSpeed, width, height) {

	this.WIDTH = width;
	this.HEIGHT = height;
	this.ENTRIES_PER_BLOCK = 3;
	this.ENTRIES_PER_ROW = this.ENTRIES_PER_BLOCK * this.WIDTH;
	this.FALLING_RATE = fallingSpeed;

	this.blocks = [];
	this.textureModified = true;
	
	for(var x = 0;x < this.WIDTH;++x)
		this.blocks.push([]);

	this.terrainArray = new Uint8Array(this.WIDTH * this.HEIGHT * this.ENTRIES_PER_BLOCK);

	for(var tempMaxX = 1;tempMaxX < this.WIDTH;tempMaxX *= 2);

	var terrainSegments = this.generateTerrain([[0, height / 2], [tempMaxX, height / 2]], 16, 200);
	terrainSegments = this.smoothenTerrain(terrainSegments, 1);

	for(var terrainSegmentIndex = 0;terrainSegmentIndex < terrainSegments.length;++terrainSegmentIndex) {
		var segment = terrainSegments[terrainSegmentIndex];
		var x = segment[0];

		if(x >= this.WIDTH)
			break;

		for(var y = 0;y <= segment[1];++y) {
			this.setBlock([x, y], true);
		}
		
		this.addBlock(x, 0, Math.floor(segment[1]));
	}

	window.terrain = this;
}

Terrain.prototype.addBlock = function(x, yBottom, yTop) {
	this.blocks[x].push([yBottom, yTop]);
}

/***
  * Randomly generates terrain height map.
 ***/
Terrain.prototype.generateTerrain = function(terrainSegments, minSegmentWidth, maxYVariance) {

	var xStep = (terrainSegments[1][0] - terrainSegments[0][0]) / 2;

	if(xStep < minSegmentWidth)
		return terrainSegments;

	var nextSegments = [];
	for(var segmentIndex = 0;segmentIndex < terrainSegments.length - 1;++segmentIndex) {
		nextSegments.push(terrainSegments[segmentIndex]);

		var newSegmentX = terrainSegments[segmentIndex][0] + xStep;
		var midPointY = (terrainSegments[segmentIndex + 1][1] + terrainSegments[segmentIndex][1]) / 2;
		var newSegmentY = (Math.random() * maxYVariance) + midPointY;

		nextSegments.push([newSegmentX, newSegmentY]);
	}

	nextSegments.push(terrainSegments[terrainSegments.length - 1]);

	return this.generateTerrain(nextSegments, minSegmentWidth, maxYVariance / 100 * 80);
};

/***
  * Interpolates additional points between segments.
***/
Terrain.prototype.smoothenTerrain = function(terrainSegments, minSegmentWidth) {

	var newSegments = [];
	var piecesPerSegment = (terrainSegments[1][0] - terrainSegments[0][0]) / minSegmentWidth;

	for(var segmentIndex = 0;segmentIndex < terrainSegments.length - 1;++segmentIndex) {

		newSegments.push(terrainSegments[segmentIndex]);
		var ySlopePerStep = (terrainSegments[segmentIndex + 1][1] - terrainSegments[segmentIndex][1]) / piecesPerSegment;

		for(var subSegmentCounter = 1;subSegmentCounter < piecesPerSegment;++subSegmentCounter) {

			var newSegmentX = terrainSegments[segmentIndex][0] + (minSegmentWidth * subSegmentCounter);
			var newSegmentY = terrainSegments[segmentIndex][1] + (ySlopePerStep * subSegmentCounter);

			newSegments.push([newSegmentX, newSegmentY]);
		}
	}

	newSegments.push(terrainSegments[terrainSegments.length - 1]);

	return newSegments;
};

Terrain.prototype.getTerrainArray = function() {
	return this.terrainArray;
};

Terrain.prototype.getTerrainArrayIndex = function(coordinates) {
	return (this.HEIGHT - 1 - coordinates[1]) * this.WIDTH * this.ENTRIES_PER_BLOCK + coordinates[0] * this.ENTRIES_PER_BLOCK;
};

Terrain.prototype.setBlock = function(coordinates, on) {
	this.textureModified = true;
	this.terrainArray[ this.getTerrainArrayIndex(coordinates) ] = on ? 1 : 0;
};

Terrain.prototype.isBlockSetActualIndex = function(index) {
	return this.terrainArray[ index ] == 1;
}

Terrain.prototype.isBlockSet = function(coordinates) {
	return this.terrainArray[ this.getTerrainArrayIndex(coordinates) ] == 1;
};

Terrain.prototype.getCoordinatesByCanvasPoint = function(canvasCoordinates, canvasWidth, canvasHeight) {
	return [
		Math.round((this.WIDTH / canvasWidth) * canvasCoordinates[0]),
		Math.round((this.HEIGHT / canvasHeight) * canvasCoordinates[1])
	];
};

Terrain.prototype.collapseTerrain = function() {
	for(var x = 0;x < this.WIDTH;++x)
		this.performTerrainDrop(x);
};

Terrain.prototype.performTerrainDrop = function(x) {
	
	var blocks = this.blocks[x];
	for(var blockIndex = 0;blockIndex < blocks.length;++blockIndex) {
		var block = blocks[blockIndex];
		
		if(block[0] == 0)
			continue;
		
		var belowGapBottomY = blockIndex == 0 ? 0 : blocks[blockIndex - 1][1] + 1;
		var fallingTerrainBottomY = block[0];
		var fallingTerrainTopY = block[1];
		var belowGapTopY = fallingTerrainBottomY - 1;

		//Move the segment down. It can fall no lower than y=belowGapBottomY.
		var gapHeight = fallingTerrainBottomY - belowGapBottomY;
		var stepsToFall = Math.min(this.FALLING_RATE, gapHeight);
		
		var newTerrainBottomY = fallingTerrainBottomY - stepsToFall;
		var newTerrainTopY = fallingTerrainTopY - stepsToFall;

		this.toggleVerticalSegment(x, newTerrainBottomY, Math.min(newTerrainTopY, belowGapTopY));
		this.toggleVerticalSegment(x, Math.max(fallingTerrainTopY - stepsToFall + 1, fallingTerrainBottomY), fallingTerrainTopY);
		
		if(blockIndex != 0 && newTerrainBottomY == (blocks[blockIndex - 1][1] + 1)) {
			//Block landed on something below.
			blocks.splice(blockIndex, 1);
			--blockIndex;//We're now on the previous block, which we will expand upward.
			
			blocks[blockIndex][1] = newTerrainTopY;
			
			if(blocks[blockIndex][0] == 0 && newTerrainTopY != 0) {//If we're grounded.
				
				if(!this.isBlockSet([x + 1, newTerrainTopY]) && !this.isBlockSet([x + 1, newTerrainTopY - 1])) {
					blocks[blockIndex][1]--;
					this.setBlock([x, newTerrainTopY], false);
					
					this.createBlock(x + 1, newTerrainTopY, newTerrainTopY);
				}
				else if(!this.isBlockSet([x - 1, newTerrainTopY]) && !this.isBlockSet([x - 1, newTerrainTopY - 1])) {
					blocks[blockIndex][1]--;
					this.setBlock([x, newTerrainTopY], false);
					
					this.createBlock(x - 1, newTerrainTopY, newTerrainTopY);
				}
			}
		}
		else {
			//We're simply moving the block down.
			block[0] = newTerrainBottomY;
			block[1] = newTerrainTopY;
		}
	}
}

Terrain.prototype.createBlock = function(x, yBottom, yTop) {
	if(x<0 || x>=this.WIDTH)
		return;
	var blocks = this.blocks[x];
	for(var index = 0;index < blocks.length;++index) {
		if(blocks[index][0] > yBottom)
			break;
	}
	
	blocks.splice(index, 0, [yBottom, yTop]);
	for(var y = yBottom;y <= yTop;++y)
		this.setBlock([x, y], true);
};

Terrain.prototype.toggleVerticalSegment = function(x, bottomY, topY) {
	for(var coordinates = [x, bottomY];coordinates[1] <= topY;++coordinates[1])
		this.setBlock(coordinates, !this.isBlockSet(coordinates));
};

Terrain.prototype.destruct = function(segments) {
	for(var index = 0;index < segments.length;++index) {
		var segment = segments[index];
		var x = segment[0];
		var yBottom = segment[1];
		var yTop = segment[2];
		
		if(x < 0 || x >= this.WIDTH)
			continue;
		
		yTop = Math.min(yTop, this.HEIGHT - 1);
		yBottom = Math.max(yBottom, 0);
		
	//	console.log("Destructing: x=" + x + ", Y=" + yBottom + " TO " + yTop);
		
		for(var blockIndex = 0;blockIndex < this.blocks[x].length;++blockIndex) {
			var block = this.blocks[x][blockIndex];
			
			//console.log("Block. Bottom: " + block[0] + ", Top: " + block[1]);
			
			//The entire block is destroyed
			if(yTop >= block[1] && yBottom <= block[0]) {
				this.blocks[x].splice(blockIndex, 1);
				--blockIndex;
				
				//console.log("Entire block destroyed.");
				
				this.toggleVerticalSegment(x, block[0], block[1]);
				
				//TODO: Update the texture array.
				continue;
			}
			else if(yTop < block[1] && yBottom > block[0]) {
				//Block is split into two.
				
				this.toggleVerticalSegment(x, yBottom, yTop);
				
		//		console.log("Split into two.");
				
				//Insert the lower portion as a new block.
				this.blocks[x].splice(blockIndex, 0, [block[0], yBottom - 1]);
				++blockIndex;
				
				//Shrink the bottom of existing block.
				block[0] = yTop + 1;
				
				break;//We know we are done, too.
			}
			else if(yTop < block[0]) {
		//		console.log("Occurred below.");
				break;//Destruction occurred below this block. We are done.
			}
			else if(yBottom > block[1]) {
		//		console.log("Occurred above.");
				continue;//Destruction occurred above this block. We need to keep looking.
			}
			else if(yBottom <= block[1] && yTop >= block[1]) {
				//Cuts off the top portion of the block.
				
				this.toggleVerticalSegment(x, yBottom, block[1]);
		//		console.log("Cut off top portion.");
				block[1] = yBottom - 1;
				continue;//Might be more destruction above us.
			}
			else if(yTop >= block[0] && yBottom <= block[0]) {
				//Cuts off the bottom portion of the block.
		//		console.log("Cut off bottom portion.");
				this.toggleVerticalSegment(x, block[0], yTop);
				
				block[0] = yTop + 1;
				break;
			}
		}
	}
};

Terrain.prototype.markTextureLoaded = function() {
	this.textureModified = false;
};
