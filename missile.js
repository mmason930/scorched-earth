function Missile(position, velocity) {
	this.position = position;
	this.velocity = velocity;
}

Missile.prototype.move = function(delta) {
	this.position[0] += this.velocity[0] * delta;
	this.position[1] += this.velocity[1] * delta;
};

Missile.prototype.gravityPull = function(delta, gravity) {
	this.velocity[1] -= gravity * delta;
};

Missile.prototype.getBottomY = function() {
	return this.position[1];
}