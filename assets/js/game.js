// Define constants for game settings
const LASER_SPEED = 800;
const PLAYER_SCALE = 1;
const PLAYER_ACCEL = 10;
const KEY_CONFIG = {
    ACCELERATE: 'W',
    DECELERATE: 'S',
    STRAFE_LEFT: 'A',
    STRAFE_RIGHT: 'D'
};

function preload() {
    this.load.image('background', 'assets/images/background1.png');
    this.load.image('background-stars', 'assets/images/background2.png');
    this.load.image('asteroid1', 'assets/images/asteroid1.png');
    this.load.image('asteroid2', 'assets/images/asteroid2.png');
    this.load.image('playerShip1', 'assets/images/playerShip1.png');
    this.load.image('playerShip2', 'assets/images/playerShip2.png');
    this.load.image('laser1', 'assets/images/laser1.png');
}

function create() {
    this.bg = this.add.tileSprite(0, 0, game.scale.width, game.scale.height, 'background').setOrigin(0);
    this.bgStars = this.add.tileSprite(0, 0, game.scale.width, game.scale.height, 'background-stars').setOrigin(0);

    // Initialize player sprite
    this.player = this.physics.add.sprite(game.scale.width / 2, game.scale.height / 2, 'playerShip1');
    this.player.setScale(PLAYER_SCALE);

    // Setting up universal controls with WASD keys
    controls = {
        ACCELERATE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.ACCELERATE]),
        DECELERATE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.DECELERATE]),
        STRAFE_LEFT: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.STRAFE_LEFT]),
        STRAFE_RIGHT: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.STRAFE_RIGHT])
    };

    // Creating an animation for the propelling fire effect
    this.anims.create({
        key: 'fly',
        frames: [
            { key: 'playerShip1' },
            { key: 'playerShip2' }
        ],
        frameRate: 8, 
        repeat: -1
    });

    // Playing the created animation
    this.player.anims.play('fly');

    // Create a group for lasers
    lasers = this.physics.add.group({
        classType: Phaser.Physics.Arcade.Image, // Setting class type to Arcade Image for performance benefits
        maxSize: 200, // Set a maximum size for the group to limit the number of active laser objects
    });

    // Setup input for shooting lasers using left mouse click
    this.input.on('pointerdown', shootLaser, this);

    // Create a group for asteroids
    asteroids = this.physics.add.group({
        classType: Phaser.Physics.Arcade.Image,
        maxSize: 24,  // Adjust the size as necessary
    });

    // Schedule asteroid spawns using a timed event
    this.time.addEvent({
        delay: 500,  // Adjust the spawn delay as necessary
        callback: spawnAsteroids,
        callbackScope: this,
        loop: true
    });

    // Setup collision detection between lasers and asteroids
    this.physics.add.collider(lasers, asteroids, onLaserHitAsteroid, null, this);
}

function update() {
    // Getting the angle between the player and the pointer
    var pointer = this.input.activePointer;
    var angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.x, pointer.y);

    // Smoothly rotate the player's ship towards the pointer over time
    this.player.rotation = Phaser.Math.Angle.RotateTo(this.player.rotation, angle, 0.04);

    // Calculate velocity based on the player's rotation
    if (controls.ACCELERATE.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x + Math.cos(this.player.rotation) * PLAYER_ACCEL * 0.1);
        this.player.setVelocityY(this.player.body.velocity.y + Math.sin(this.player.rotation) * PLAYER_ACCEL * 0.1);
    } else {
        this.player.setVelocityX(this.player.body.velocity.x * 0.96);
        this.player.setVelocityY(this.player.body.velocity.y * 0.96);
    }

    if (controls.DECELERATE.isDown) {
        // Slow down the player gradually
        this.player.setVelocityX(this.player.body.velocity.x * 0.94);
        this.player.setVelocityY(this.player.body.velocity.y * 0.94);
    }

    // Implementing strafing: moving left and right relative to the direction the player ship is facing
    if (controls.STRAFE_LEFT.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x + Math.sin(this.player.rotation) * PLAYER_ACCEL * 0.1);
        this.player.setVelocityY(this.player.body.velocity.y - Math.cos(this.player.rotation) * PLAYER_ACCEL * 0.1);
    }
    else if (controls.STRAFE_RIGHT.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x - Math.sin(this.player.rotation) * PLAYER_ACCEL * 0.1);
        this.player.setVelocityY(this.player.body.velocity.y + Math.cos(this.player.rotation) * PLAYER_ACCEL * 0.1);
    }

    // Introduce a velocity cap to prevent indefinite acceleration
    let speed = Math.sqrt(this.player.body.velocity.x ** 2 + this.player.body.velocity.y ** 2);
    let maxSpeed = 100; // Adjust max speed as necessary
    if (speed > maxSpeed) {
        this.player.body.velocity.normalize().scale(maxSpeed);
    }

    // Update lasers (e.g., remove lasers that move off-screen)
    lasers.getChildren().forEach(laser => {
        if (laser.x < 0 || laser.x > game.scale.width || laser.y < 0 || laser.y > game.scale.height) {
            laser.setActive(false);
            laser.setVisible(false);
        }
    });

    // Update asteroids (e.g., remove asteroids that move off-screen)
    asteroids.getChildren().forEach(asteroid => {
        if (asteroid.x < 0 || asteroid.y > game.scale.height) {
            asteroid.setActive(false);
            asteroid.setVisible(false);
        }
    });

     // Iterate over all asteroids to check their hit counts and destroy them if necessary
     asteroids.getChildren().forEach(asteroid => {
        if (asteroid.hitCount >= asteroid.maxHitCount) {
            asteroid.setActive(false);
            asteroid.setVisible(false);
        }
    });
}

function shootLaser() {
    // Get an inactive laser from the group or create a new one if none are available
    let laser = lasers.get(this.player.x, this.player.y, 'laser1');
    
    if (laser) {
        laser.setActive(true);
        laser.setVisible(true);

        // Set velocity of the laser to make it move in the direction the player is facing
        this.physics.velocityFromRotation(this.player.rotation, LASER_SPEED, laser.body.velocity);
    }
}

function spawnAsteroids() {
    // Determine a starting Y coordinate within a smaller range to make the group more clustered
    let startY = Phaser.Math.Between(game.scale.height * 0.1, game.scale.height * 0.3);
    
    for (let i = 0; i < Phaser.Math.Between(4, 8); i++) {
        // Randomly choose between the 'asteroid1' and 'asteroid2' sprites
        let asteroidSprite = Phaser.Math.RND.pick(['asteroid1', 'asteroid2']);
        
        // Get an inactive asteroid from the group or create a new one if none are available
        let asteroid = asteroids.get(game.scale.width, startY, asteroidSprite);
        
        if (asteroid) {
            asteroid.setActive(true);
            asteroid.setVisible(true);
            asteroid.setScale(Phaser.Math.Between(0.5, 1));  // Vary the scale/size of asteroids
    
            // Set a velocity for the asteroid to make it move diagonally from top right to bottom left
            let velocityX = Phaser.Math.Between(-125, -100);  // Narrow the velocity range for more clustering
            let velocityY = Phaser.Math.Between(75, 100);     // Narrow the velocity range for more clustering
            asteroid.body.setVelocity(velocityX, velocityY);
    
            // Store the original velocities using setData
            asteroid.setData('velocity', {x: velocityX, y: velocityY});
    
            // Set the maximum hit count based on the asteroid type
            asteroid.maxHitCount = asteroid.texture.key === 'asteroid1' ? 1 : 2;
            asteroid.hitCount = 0;
        }

        // Increment the startY to spread out the asteroids vertically, but keep them relatively close to each other
        startY += Phaser.Math.Between(20, 30);  // Narrow the increment range for more clustering
    }
}

function onLaserHitAsteroid(laser, asteroid) {
    // Deactivate and hide the laser
    laser.setActive(false);
    laser.setVisible(false);

    // Increase the hit count of the asteroid
    asteroid.hitCount = (asteroid.hitCount || 0) + 1;

    // Check if the asteroid hit count is less than the maximum hit count
    if (asteroid.hitCount < asteroid.maxHitCount) {
        // Reset the velocity to the original velocity to maintain its course
        let originalVelocity = asteroid.getData('velocity');
        asteroid.body.setVelocity(originalVelocity.x, originalVelocity.y);
        return;
    }

    // If the asteroid hit count is equal to or greater than the maximum hit count, destroy it
    asteroid.setActive(false);
    asteroid.setVisible(false);
}

let config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    scene: {
        preload: preload, 
        create: create,
        update: update,
        resize: resize,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },  // Consider revising this value for a space game
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.innerWidth,
        height: window.innerHeight
    },
    callbacks: {
        postBoot: function (game) {
            // Listen for window resize events
            window.addEventListener('resize', function () {
                game.scale.resize(window.innerWidth, window.innerHeight);
                game.scene.scenes[0].resize({ width: window.innerWidth, height: window.innerHeight });
            });
        }
    },
};

function resize(gameSize) {
    let width = gameSize.width;
    let height = gameSize.height;

    if (width === undefined) {
        width = this.game.renderer.width;
    }
    if (height === undefined) {
        height = this.game.renderer.height;
    }
    
    this.cameras.resize(width, height);

    this.bg.setSize(width, height);
    this.bgStars.setSize(width, height);
}

// Create the game instance
const game = new Phaser.Game(config);