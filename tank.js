function Tank(position, name, color) {
	this.position = position;
	this.name = name;
	this.health = 100;
	this.firingAngle = 0;
	this.firingPower = 35;
	this.color = color;

	this.width = 40;
	this.height = 16;
	this.halfWidth = this.width/2;
	this.halfHeight = this.height/2;
	this.PI = 3.14159265358979323;
}

Tank.prototype.getBottomLeftPosition = function() {
	return [
		this.position[0] - (this.width / 2),
		this.position[1] - (this.height / 2)
	];
}

Tank.prototype.getBottomRightPosition = function() {
	return [
		this.position[0] + (this.width / 2),
		this.position[1] - (this.height / 2)
	];
}

Tank.prototype.rotateFiringAngle = function(left) {
	var maxAngle = this.PI;
	var step = maxAngle / 180;

	this.firingAngle += step * (left ? 1 : -1);
	
	if(this.firingAngle > maxAngle)
		this.firingAngle = 0;
	else if(this.firingAngle < 0)
		this.firingAngle = maxAngle;
};

Tank.prototype.getCannonLength = function() {
	return this.width / 4 * 3;
}

Tank.prototype.getCannonFiringCoordinates = function() {
	return [
		this.position[0] + (this.getCannonLength() * Math.cos(this.firingAngle)),
		this.position[1] + (this.getCannonLength() * Math.sin(this.firingAngle))
	];
};