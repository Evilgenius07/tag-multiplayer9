// Game config
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: { 
        default: 'arcade',
        arcade: { 
            debug: false,
            gravity: { y: 0 }
        }
    },
    canvas: { willReadFrequently: true },
    scene: { preload, create, update }
};

let game = new Phaser.Game(config);
let player, players = {}, bots = {}, peer, conns = {}, currentTaggerId = null;
let scores = {}, gameTimer = 180, powerUps, walls, mobileControls = false;

// Power-up types
const POWERUP_TYPES = {
    SPEED: { texture: 'powerup', effect: 'speed' },
    FREEZE: { texture: 'freeze', effect: 'freeze' },
    INVISIBLE: { texture: 'invisible', effect: 'invisible' },
    TELEPORT: { texture: 'teleport', effect: 'teleport' }
};

function preload() {
    // Load assets
    this.load.image('player', './assets/player.png');
    this.load.image('tagger', './assets/tagger.png');
    this.load.image('powerup', './assets/powerup.png');
    this.load.image('freeze', './assets/freeze.png');
    this.load.image('invisible', './assets/invisible.png');
    this.load.image('teleport', './assets/teleport.png');
    this.load.image('wall', './assets/wall.png');
}

function create() {
    // Mobile detection
    mobileControls = this.sys.game.device.os.android || this.sys.game.device.os.iOS;
    document.getElementById('mobile-controls').style.display = mobileControls ? 'flex' : 'none';

    // Initialize PeerJS
    peer = new Peer();
    peer.on('open', (id) => {
        document.getElementById('status').textContent = `Your ID: ${id}`;
        document.getElementById('joinBtn').onclick = () => joinRoom(document.getElementById('roomId').value);
        document.getElementById('addBotBtn').onclick = addBot;
    });

    peer.on('connection', (conn) => {
        conn.on('data', (data) => handleData(data));
        conns[conn.peer] = conn;
    });

    // Game world
    this.physics.world.setBounds(0, 0, 800, 600);
    walls = this.physics.add.staticGroup();
    spawnWalls();

    // Local player
    player = this.physics.add.sprite(400, 300, 'player');
    player.setCollideWorldBounds(true);

    // First player is tagger
    if (Object.keys(players).length === 0) {
        currentTaggerId = peer.id;
        player.setTexture('tagger');
    }

    // Power-ups
    powerUps = this.physics.add.group();
    this.time.addEvent({ delay: 10000, callback: spawnPowerUp, loop: true });

    // Mobile controls
    if (mobileControls) setupMobileControls();

    // Scoreboard
    this.add.text(10, 10, 'Scores: ', { font: '16px Arial', fill: '#fff' });

    // Game timer
    const timerText = this.add.text(700, 10, `Time: ${gameTimer}`, { font: '16px Arial', fill: '#fff' });
    this.time.addEvent({ delay: 1000, callback: () => {
        gameTimer--;
        timerText.setText(`Time: ${gameTimer}`);
        if (gameTimer <= 0) endGame();
    }, loop: true });
}

function update() {
    // Player movement
    const speed = player.getData('speed') || 200;
    if (!mobileControls) {
        player.setVelocity(0);
        if (this.input.keyboard.addKey('LEFT').isDown) player.setVelocityX(-speed);
        if (this.input.keyboard.addKey('RIGHT').isDown) player.setVelocityX(speed);
        if (this.input.keyboard.addKey('UP').isDown) player.setVelocityY(-speed);
        if (this.input.keyboard.addKey('DOWN').isDown) player.setVelocityY(speed);
    }

    // Broadcast position
    broadcastData({ type: 'position', x: player.x, y: player.y, peerId: peer.id });
}

// --- Power-Ups ---
function spawnPowerUp() {
    const types = Object.values(POWERUP_TYPES);
    const type = types[Phaser.Math.Between(0, types.length-1)];
    
    const powerUp = powerUps.create(
        Phaser.Math.Between(50, 750),
        Phaser.Math.Between(50, 550),
        type.texture
    );
    powerUp.setData('type', type.effect);
    powerUp.setCollideWorldBounds(true);
}

function activatePowerUp(player, powerUp) {
    const effect = powerUp.getData('type');
    const scene = game.scene.scenes[0];
    
    switch(effect) {
        case 'speed':
            player.setVelocity(400);
            scene.time.delayedCall(3000, () => player.setVelocity(200));
            break;
            
        case 'freeze':
            Object.values(players).forEach(p => {
                if(p !== player) p.setVelocity(0);
            });
            break;
            
        case 'invisible':
            player.setAlpha(0.3);
            scene.time.delayedCall(5000, () => player.setAlpha(1));
            break;
            
        case 'teleport':
            player.setPosition(
                Phaser.Math.Between(100, 700),
                Phaser.Math.Between(100, 500)
            );
            break;
    }
    powerUp.destroy();
}

// --- Rest of the code (networking, AI, etc.) ---
// [Include all other necessary functions from previous examples]
