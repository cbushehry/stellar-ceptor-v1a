let playerScore = 0;
const KEY_CONFIG = {
    ACCELERATE: 'W',
    DECELERATE: 'S',
    STRAFE_LEFT: 'A',
    STRAFE_RIGHT: 'D',
    SHIELD: 'SPACE',
    BOOST: 'SHIFT'
};

// function preload() {} is on another file but still linked through index.html

function create() {
    background1 = this.add.tileSprite(0, 0, window.innerWidth, window.innerHeight, 'background1').setOrigin(0, 0).setDepth(-3);
    background2 = this.add.tileSprite(0, 0, window.innerWidth, window.innerHeight, 'background2').setOrigin(0, 0).setDepth(-3);

    // Earth
    let earthX = window.innerWidth * 0.57; 
    let earthY = window.innerHeight * 0.60;
    this.earth = this.add.image(earthX, earthY, 'earth');
    this.earth.setScale(0.4321);
    this.earth.setDepth(-3);

    // Earth zoom out and move left
    this.tweens.add({
        targets: this.earth,
        scale: 0.1, // Zoom out
        x: -10, // Move off-screen to the left
        ease: 'Linear',
        duration: 300000, // 5 minutes
    });

    // Moon (initially off-screen)
    let moonX = window.innerWidth + 100; // Start off-screen to the right
    let moonY = window.innerHeight * 0.34;
    this.moon = this.add.image(moonX, moonY, 'moon');
    this.moon.setScale(0.12345);
    this.moon.setDepth(-3);
    this.moon.setVisible(false); // Initially invisible

    // Delayed action (5min) to start moving the Moon in
    this.time.delayedCall(300000, () => {
        this.moon.setVisible(true);
        this.tweens.add({
            targets: this.moon,
            x: window.innerWidth * 0.1, // Move to the center of the screen
            ease: 'Linear',
            duration: 60000, // 1 minute
        });
    });

    createAnimations.call(this);

    controls = {
        ACCELERATE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.ACCELERATE]),
        DECELERATE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.DECELERATE]),
        STRAFE_LEFT: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.STRAFE_LEFT]),
        STRAFE_RIGHT: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.STRAFE_RIGHT]),
        SHIELD: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.SHIELD]),
        BOOST: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.BOOST])
    };

    //Initalize playerShip asset
    this.player = this.physics.add.sprite(this.scale.width / 2, this.scale.height / 2, 'playerShip1');
    this.maxSpeed = 100;
    this.boostedSpeed = this.maxSpeed * 2;
    this.isBoostActive = false;
    this.boostEndTime = 0;
    this.deceleratingFromBoost = false;
    this.player.play('flight');
    this.input.on('pointerdown', shootLaser, this);
    this.isShooting = false;
    this.lastShotTime = 0;
    this.playerShield = this.add.sprite(this.player.x, this.player.y, 'shield');
    this.playerShield.setVisible(false);
    this.playerShield.setScale(1.34);
    this.player.health = 3;
    this.player.shields = 1;

    this.hearts = this.add.group({
        key: 'heart',
        repeat: this.player.health - 1,
        setXY: { x: 60, y: 20, stepX: 20 }
    });

    // playerShip gains health          this.player.gainHealth(1);
    this.player.gainHealth = function(amount) {
        this.health += amount;
        updateHearts.call(this.scene);  // Update heart display
    };

    // playerShip takes damage          this.player.takeDamage(1);
    this.player.takeDamage = function(amount) {
        this.health -= amount;
        if (this.health < 0) {
            this.health = 0;
        }
    
        updateHearts.call(this.scene);
    
        if (this.health == 0) {
            showGameOver(this.scene);
        }
    };

    this.boostIcons = this.add.group({
        key: 'boost',
        repeat: 2,
        setXY: { x: 60, y: this.hearts.getChildren()[0].y + 20, stepX: 20 }
    });

    this.shieldIcons = this.add.group();
    
    this.shieldIcon = this.add.image(
        this.boostIcons.getChildren()[0].x - 30,
        this.boostIcons.getChildren()[0].y - 9, 
        'shieldIcon'
    );

    this.input.on('pointerdown', function () {
        this.isShooting = true;
    }, this);

    this.input.on('pointerup', function () {
        this.isShooting = false;
    }, this);

    lasers = this.physics.add.group({
        classType: Phaser.GameObjects.Sprite,
        maxSize: 10000,
        runChildUpdate: true
    });

    asteroids = this.physics.add.group({
        classType: Phaser.Physics.Arcade.Image,
        maxSize: 512, 
    });

    this.asteroidTimer = this.time.addEvent({
        delay: 16440,
        callback: spawnAsteroids,
        callbackScope: this,
        loop: true
    });

    this.asteroidClusterTimer = this.time.addEvent({
        delay: 32880,
        callback: spawnAsteroidClusters,
        callbackScope: this,
        loop: true
    });

    this.asteroidPowerUpTimer = this.time.addEvent({
        delay: 64340,
        callback: spawnAsteroidPowerUp,
        callbackScope: this,
        loop: true
    });

     this.timerText = this.add.text(this.sys.game.config.width / 2, 10, '0:00', {
        fontSize: '24px',
        fill: '#FFF',
        align: 'center'
    });

    this.timer = 0;
    this.updateTimerEvent = this.time.addEvent({
        delay: 1000,
        callback: updateTimer,
        callbackScope: this,
        loop: true
    });

    this.scoreText = this.add.text(this.scale.width - 16, 16, '0', {
        fontSize: '24px',
        fill: '#FFFF00',
        align: 'right'
    }).setOrigin(1, 0);

    this.alienShips = this.physics.add.group({
        immovable: true  // Ensure all alien ships are immovable
    });

    this.physics.add.collider(this.player, asteroids, playerAsteroidCollision, null, this);
    this.physics.add.collider(lasers, asteroids, laserObjectCollision, null, this);
    this.physics.add.collider(lasers, this.alienShips, laserObjectCollision, null, this);

    spawnAlienShip1.call(this, this.player);
}

function createAnimations() {
    this.anims.create({
        key: 'flight',
        frames: [
            { key: 'playerShip1' },
            { key: 'playerShip2' }
        ],
        frameRate: 4,
        repeat: -1
    });

    this.anims.create({
        key: 'boostedFlight',
        frames: [
            { key: 'playerShip1' },
            { key: 'playerShip2' }
        ],
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'alienShip1',
        frames: [
            { key: 'alienShip11' },
            { key: 'alienShip12' }
        ],
        frameRate:5, 
        repeat: -1 
    });

    this.anims.create({
        key: 'explode',
        frames: [
            { key: 'explosion1' },
            { key: 'explosion2' },
            { key: 'explosion3' },
            { key: 'explosion4' },
            { key: 'explosion5' },
            { key: 'explosion6' },
            { key: 'explosion7' }
        ],
        frameRate: 20,
        repeat: 0,
        hideOnComplete: true
    });
}

function update() {
    let PLAYER_ACCEL = 10;
    var pointer = this.input.activePointer;
    var angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.x, pointer.y);
    this.player.rotation = Phaser.Math.Angle.RotateTo(this.player.rotation, angle, 0.02);

    spawnAlienShip1.call(this, this.player);

    if (controls.ACCELERATE.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x + Math.cos(this.player.rotation) * PLAYER_ACCEL * 0.1);
        this.player.setVelocityY(this.player.body.velocity.y + Math.sin(this.player.rotation) * PLAYER_ACCEL * 0.1);
    } else if (controls.DECELERATE.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x * 0.97);
        this.player.setVelocityY(this.player.body.velocity.y * 0.97);
    } else {
        this.player.setVelocityX(this.player.body.velocity.x * 0.994);
        this.player.setVelocityY(this.player.body.velocity.y * 0.994);
    }

    if (controls.STRAFE_LEFT.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x + Math.sin(this.player.rotation) * PLAYER_ACCEL * 0.123456789);
        this.player.setVelocityY(this.player.body.velocity.y - Math.cos(this.player.rotation) * PLAYER_ACCEL * 0.123456789);
    } else if (controls.STRAFE_RIGHT.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x - Math.sin(this.player.rotation) * PLAYER_ACCEL * 0.123456789);
        this.player.setVelocityY(this.player.body.velocity.y + Math.cos(this.player.rotation) * PLAYER_ACCEL * 0.123456789);
    }

    let speed = Math.sqrt(this.player.body.velocity.x ** 2 + this.player.body.velocity.y ** 2);
    if (speed > this.maxSpeed) {
        this.player.body.velocity.normalize().scale(this.maxSpeed);
    }

    if (Phaser.Input.Keyboard.JustDown(controls.BOOST) && !this.isBoostActive) {
        let hasBoost = this.boostIcons.getChildren().some(icon => icon.active);
        if (!hasBoost) {
            return;
        }

        this.isBoostActive = true;
        this.maxSpeed = this.boostedSpeed;
        this.player.play('boostedFlight');
        this.boostEndTime = this.time.now + 10000;

        let boostIcons = this.boostIcons.getChildren();
        for (let i = boostIcons.length - 1; i >= 0; i--) {
            if (boostIcons[i].active) {
                boostIcons[i].setActive(false).setVisible(false);
                break;
            }
        }
    }

    if (this.isBoostActive && this.time.now > this.boostEndTime) {
        this.isBoostActive = false;
        this.deceleratingFromBoost = true;
        this.player.play('flight');
    }

    if (this.deceleratingFromBoost) {
        let decelerationFactor = 0.997;
        this.maxSpeed *= decelerationFactor;
        if (this.maxSpeed <= 100) {
            this.maxSpeed = 100;
            this.deceleratingFromBoost = false;
        }
    }

    if (this.playerShield.visible) {
        this.playerShield.x = this.player.x;
        this.playerShield.y = this.player.y;
    }

    if (Phaser.Input.Keyboard.JustDown(controls.SHIELD) && !this.playerShield.visible) {
        activateShield.call(this);
    }

    if (this.isShooting) {
        shootLaser.call(this);
    }

    const margin = 150;
    asteroids.getChildren().forEach(asteroid => {
        if (!asteroid.active) return;
        if (asteroid.x < -margin || asteroid.x > this.scale.width + margin ||
            asteroid.y < -margin || asteroid.y > this.scale.height + margin) {
            asteroid.setActive(false).setVisible(false);
        }
    });
}

function updateHearts() {
    this.hearts.clear(true, true);

    for (let i = 0; i < this.player.health; i++) {
        this.hearts.create(60 + i * 20, 20, 'heart');
    }
}

function updateShields() {
    this.shieldIcons.clear(true, true);
    let startX = this.shieldIcon.x;
    let startY = this.shieldIcon.y;

    if (this.player.shields > 0) {
        this.shieldIcon.setVisible(true);
    } else {
        this.shieldIcon.setVisible(false);
    }

    for (let i = 1; i < this.player.shields; i++) {
        this.shieldIcons.create(startX, startY + i * 35, 'shieldIcon');
    }
}

function activateShield() {
    if (this.player.shields <= 0) {
        return;
    }

    this.playerShield.setVisible(true);
    this.player.isShieldActive = true;
    this.player.shields--;
    updateShields.call(this);

    this.time.delayedCall(6000, () => {
        this.playerShield.setVisible(false);
        this.player.isShieldActive = false;

        // Optional: Automatically regenerate a shield after a delay
        // this.time.delayedCall(10000, () => {
        //     this.player.shields++;
        //     updateShields.call(this);
        // }, [], this);
    }, [], this);
}

function shootLaser() {
    let LASER_SPEED = 1000;
    let currentTime = this.time.now;
    if (currentTime - this.lastShotTime < 200) {
        return;
    }

    this.lastShotTime = currentTime;
    let laser = lasers.get(this.player.x, this.player.y, 'laser2');
    if (laser) {
        laser.setActive(true);
        laser.setVisible(true);
        laser.rotation = this.player.rotation;
        laser.setDepth(-1);
        laser.setScale(1);
        this.physics.velocityFromRotation(this.player.rotation, LASER_SPEED, laser.body.velocity);

        this.time.delayedCall(10000, () => {
            laser.setActive(false).setVisible(false);
        }, [], this);
    }
}

function spawnAlienShip1(player) {
    if (!this.alienShip1) {
        this.alienShip1 = this.physics.add.sprite(-100, Phaser.Math.Between(100, window.innerHeight - 100), 'alienShip10');
        this.alienShip1.setActive(true).setVisible(true);
        this.alienShip1.play('alienShip1');
        this.alienShip1.hitCount = 5;
        this.alienShip1.setScale(1.5);
        this.alienShip1.setDepth(1);
        this.alienShip1.setImmovable(true);
        this.alienShip1.isAlienShip = true;
        this.alienShips.add(this.alienShip1);
        this.alienShip1.startTracking = false;
    }

    if (this.alienShip1.x < window.innerWidth * 0.2) {
        this.alienShip1.x += 0.5;
    } else if (!this.alienShip1.startTracking) {
        this.time.delayedCall(1000, () => {
            this.alienShip1.startTracking = true;
        });
    } else {
        var angle = Phaser.Math.Angle.Between(this.alienShip1.x, this.alienShip1.y, player.x, player.y);
        this.alienShip1.rotation = Phaser.Math.Angle.RotateTo(this.alienShip1.rotation, angle, 0.01);
        this.physics.velocityFromRotation(this.alienShip1.rotation, 60, this.alienShip1.body.velocity);
    }
}

function spawnAsteroids() {
    let asteroidSprite = Phaser.Math.RND.pick(['asteroid11', 'asteroid12', 'asteroid13', 'asteroid14', 'asteroid15']);

    let perimeterWidth = this.sys.game.config.width + 100;
    let perimeterHeight = this.sys.game.config.height + 100;

    let side = Phaser.Math.Between(0, 3);
    let x, y;
    switch (side) {
        case 0: // Top
            x = Phaser.Math.Between(0, perimeterWidth);
            y = -50;
            break;
        case 1: // Bottom
            x = Phaser.Math.Between(0, perimeterWidth);
            y = this.sys.game.config.height + 50;
            break;
        case 2: // Left
            x = -50;
            y = Phaser.Math.Between(0, perimeterHeight);
            break;
        case 3: // Right
            x = this.sys.game.config.width + 50;
            y = Phaser.Math.Between(0, perimeterHeight);
            break;
    }

    let asteroid = asteroids.get(x, y, asteroidSprite);
    if (asteroid) {
        asteroid.setActive(true).setVisible(true).setScale(0.34);
        asteroid.isAsteroid = true;

        let asteroidSpeed = 50; 
        let angle = Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y);
        let velocityX = Math.cos(angle) * asteroidSpeed;
        let velocityY = Math.sin(angle) * asteroidSpeed;

        asteroid.body.setVelocity(velocityX, velocityY);
        asteroid.setData('velocity', {x: velocityX, y: velocityY});
        asteroid.setData('initialPosition', {x: x, y: y});
        asteroid.body.setImmovable(true);
        asteroid.hitCount = 3;

        asteroid.body.setAngularVelocity(Phaser.Math.Between(-34, 34)); // Adjust range as needed
    }
}

function spawnAsteroidClusters() {
    const numberOfAsteroids = Phaser.Math.Between(8, 12);
    const asteroidSprites = ['asteroid21', 'asteroid22', 'asteroid23', 'asteroid24', 'asteroid25', 'asteroid26'];
    const clusterSpeed = 40;
    const clusterRadius = 100;
    const minSpacing = 30; // Minimum space between asteroids

    // Start position on the right, vertically centered
    const startX = this.sys.game.config.width + clusterRadius; 
    const startY = this.sys.game.config.height / 2;

    let placedAsteroids = []; // Keep track of placed asteroid positions

    for (let i = 0; i < numberOfAsteroids; i++) {
        let asteroid, x, y;
        let positionFound = false;

        while (!positionFound) {
            x = startX + Phaser.Math.FloatBetween(-clusterRadius, clusterRadius);
            y = startY + Phaser.Math.FloatBetween(-clusterRadius, clusterRadius);

            // Check if the position is within the cluster radius and not overlapping
            positionFound = Phaser.Math.Distance.Between(startX, startY, x, y) <= clusterRadius &&
                            !placedAsteroids.some(pos => Phaser.Math.Distance.Between(pos.x, pos.y, x, y) < minSpacing);

            if (positionFound) {
                let asteroidSprite = Phaser.Math.RND.pick(asteroidSprites);
                asteroid = asteroids.get(x, y, asteroidSprite);
            }
        }

        if (asteroid) {
            asteroid.setActive(true).setVisible(true).setScale(0.34);
            asteroid.isAsteroid = true;
            asteroid.body.setVelocity(-clusterSpeed, 0);
            asteroid.body.setImmovable(true);
            asteroid.isClusterAsteroid = true;
            asteroid.rotation = Phaser.Math.FloatBetween(0, Math.PI * 2);
            asteroid.hitCount = 1;

            // Add the position of the placed asteroid
            placedAsteroids.push({ x: x, y: y });
        }
    }
}

function spawnAsteroidPowerUp() {
    let perimeterWidth = this.sys.game.config.width + 100;
    let perimeterHeight = this.sys.game.config.height + 100;

    let side = Phaser.Math.Between(0, 3);
    let x, y, velocityX, velocityY;

    switch (side) {
        case 0: // Top
            x = Phaser.Math.Between(0, perimeterWidth);
            y = -50;
            velocityX = 0;
            velocityY = 100;
            break;
        case 1: // Bottom
            x = Phaser.Math.Between(0, perimeterWidth);
            y = this.sys.game.config.height + 50;
            velocityX = 0;
            velocityY = -100;
            break;
        case 2: // Left
            x = -50;
            y = Phaser.Math.Between(0, perimeterHeight);
            velocityX = 100;
            velocityY = 0;
            break;
        case 3: // Right
            x = this.sys.game.config.width + 50;
            y = Phaser.Math.Between(0, perimeterHeight);
            velocityX = -100;
            velocityY = 0;
            break;
    }

    let asteroidPowerUp = asteroids.get(x, y, 'asteroid33');
    if (asteroidPowerUp) {
        asteroidPowerUp.setActive(true).setVisible(true).setScale(0.34);
        asteroidPowerUp.isAsteroid = true;
        asteroidPowerUp.body.setVelocity(velocityX, velocityY);
        asteroidPowerUp.rotation = Phaser.Math.FloatBetween(0, Math.PI * 2);
        asteroidPowerUp.body.setImmovable(true);
        asteroidPowerUp.hitCount = 7;
    }
}

function dropPowerUp(x, y) {
    let powerUpType = Phaser.Math.RND.pick(['powerUp1', 'powerUp2']);
    let powerUp = this.physics.add.sprite(x, y, powerUpType).setActive(true).setVisible(true);

    this.physics.add.overlap(this.player, powerUp, function(player, powerUp) {
        if (powerUp.texture.key === 'powerUp1') {
            player.gainHealth(1);
            updateHearts.call(this);
        } else if (powerUp.texture.key === 'powerUp2') {
            if (powerUp.texture.key === 'powerUp2') {
                this.player.shields++;
                updateShields.call(this);
            }
        }
        powerUp.destroy();
    }, null, this);
}

function playerAsteroidCollision(player, asteroid) {
    if (player.isShieldActive) {
        explode.call(this, asteroid);
        return;
    }

    if (player.isInvincible) return;

    player.takeDamage(1);
    player.isInvincible = true;

    let blinkCount = 0;
    this.time.addEvent({
        delay: 500,
        callback: () => {
            player.setVisible(!player.visible);
            blinkCount++;

            if (blinkCount >= 6) {
                player.setVisible(true);
                player.isInvincible = false;
            }
        },
        repeat: 5
    });

    explode.call(this, asteroid);
}

function laserObjectCollision(laser, object) {
    laser.setActive(false).setVisible(false);

    if (object.isAlienShip) {
        object.hitCount -= 1;
        if (object.hitCount <= 0) {
            explode.call(this, object);
            playerScore += 10;
            this.scoreText.setText(playerScore);
            this.alienShip1 = null;
        }
    } else if (object.isAsteroid) {
        object.hitCount -= 1;
        if (object.hitCount <= 0) {
            let isPowerUp = object.texture.key === 'asteroid33';
            explode.call(this, object, isPowerUp);
            playerScore += (object.isClusterAsteroid ? 1 : 3);
            this.scoreText.setText(playerScore);
        }
    }
}

function explode(object, isPowerUp = false) {
    let explosionScale = 1.67;
    let x = object.x;
    let y = object.y;
    let explosion = this.add.sprite(x, y, 'explosion1').play('explode');
    explosion.setScale(explosionScale);
    explosion.on('animationcomplete', () => {
        explosion.destroy();
        if (isPowerUp) {
            dropPowerUp.call(this, x, y);
        }
    });
    object.destroy();
}

function updateTimer() {
    this.timer += 1;
    const minutes = Math.floor(this.timer / 60);
    const seconds = this.timer % 60;
    this.timerText.setText(minutes + ':' + (seconds < 10 ? '0' + seconds : seconds));
}

function showGameOver(scene) {
    scene.add.rectangle(
        scene.scale.width / 2, scene.scale.height / 2,
        scene.scale.width, scene.scale.height,
        0x000000, 0.7
    ).setDepth(10);

    scene.add.text(scene.scale.width / 2, scene.scale.height / 2 - 40, 'GAME OVER', {
        fontSize: '64px',
        fill: '#ffffff'
    }).setOrigin(0.5).setDepth(10);

    scene.add.text(scene.scale.width / 2, scene.scale.height / 2 + 40, 'Click to Restart', {
        fontSize: '28px',
        fill: '#aaaaaa'
    }).setOrigin(0.5).setDepth(10);

    scene.input.once('pointerdown', () => {
        scene.scene.restart();
    });
}

let gameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, 
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});

const game = new Phaser.Game(gameConfig);