// Connect to the Socket.IO server
const socket = io();

let otherPlayers = {};
let winner = null;

// Helper function: Checks collision between two rectangular objects
function checkCollision(obj1, obj2) {
  return (
    obj1.x + obj1.width > obj2.x &&
    obj1.y + obj1.height > obj2.y &&
    obj1.x < obj2.x + obj2.width &&
    obj1.y < obj2.y + obj2.height 
  );
}

class GameObject {
  constructor(x, y, width, height, color) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
  }
  
  draw(context) {
    context.fillStyle = this.color;
    context.fillRect(this.x, this.y, this.width, this.height);
  }
  
  
}

class Player extends GameObject {
  constructor(x, y) {
    super(x, y, 50, 100, '#00879E'); 
    this.velocityY = 0;
    this.velocityX = 0;
    this.gravity = 0.5;
    this.speed = 5;
    this.jumpStrength = -10;
    this.isGrounded = false;
  }
  
  update(platforms) {
    this.velocityY += this.gravity;
    this.y += this.velocityY;
    this.x += this.velocityX;
    
    this.isGrounded = false;
    for (let platform of platforms) {
      if (
        this.x < platform.x + platform.width &&
        this.x + this.width > platform.x &&
        this.y + this.height > platform.y &&
        this.y + this.height - this.velocityY <= platform.y
      ) {
        this.y = platform.y - this.height;
        this.velocityY = 0;
        this.isGrounded = true;
      }
    }
  }
  
  jump() {
    if (this.isGrounded) {
      this.velocityY = this.jumpStrength;
      this.isGrounded = false;
    }
  }
}

class Platform extends GameObject {
  constructor(x, y, width, height) {
    super(x, y, width, height, '#504B38');
  }
}

class Coin extends GameObject {
  constructor(x, y) {
    super(x, y, 20, 20, '#FFCF50');
    this.collected = false;
  }
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Create your player instance.
    this.player = new Player(100, 200);
    
    this.coins = [
      new Coin(100, 800),
      new Coin(300, 700),
      new Coin(600, 650),
      new Coin(900, 600),
      new Coin(1200, 550),
      new Coin(1400, 400),
      new Coin(800, 300),
      new Coin(200, 200),
      new Coin(1000, 100),
      new Coin(1500, 50)
    ];
    
    this.platforms = [
      new Platform(0, 850, 400, 20),
      new Platform(500, 800, 400, 20),
      new Platform(1000, 750, 400, 20),
      new Platform(200, 650, 400, 20),
      new Platform(700, 600, 400, 20),
      new Platform(1200, 550, 400, 20),
      new Platform(0, 450, 400, 20),
      new Platform(500, 400, 400, 20),
      new Platform(1000, 350, 400, 20),
      new Platform(300, 250, 400, 20),
      new Platform(800, 200, 400, 20),
      new Platform(1100, 150, 400, 20)
    ];
    
    
    this.score = 0;
    
    // Keyboard input.
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        this.player.jump();
      } else if (e.code === 'ArrowRight') {
        this.player.velocityX = this.player.speed;
      } else if (e.code === 'ArrowLeft') {
        this.player.velocityX = -this.player.speed;
      }
    });
    
    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        this.player.velocityX = 0;
      }
    });
    
    // Socket event listeners.
    socket.on('playerMoved', (data) => {
      if (otherPlayers[data.id]) {
        otherPlayers[data.id].x = data.x;
        otherPlayers[data.id].y = data.y;
      }
    });
    
    socket.on('newPlayer', (data) => {
      otherPlayers[data.id] = new Player(data.player.x, data.player.y);
      otherPlayers[data.id].color = '#D84040';
    });
    
    socket.on('playerDisconnected', (id) => {
      delete otherPlayers[id];
    });
    
    socket.on('currentPlayers', (playersData) => {
      for (let id in playersData) {
        if (id !== socket.id) {
          otherPlayers[id] = new Player(playersData[id].x, playersData[id].y);
          otherPlayers[id].color = '#D84040';
        }
      }
    });
    
    socket.on('currentCoins', (coinsData) => {
      this.coins = coinsData.map(c => new Coin(c.x, c.y));
    });
    
    socket.on('coinCollected', (data) => {
      this.coins.splice(data.coinIndex, 1);
    });
    
    socket.on('gameOver', (data) => {
      winner = data.winnerId;
    });
    
    // Listen for coin reset from the server.
    socket.on('resetCoins', (newCoins) => {
      this.coins = newCoins.map(c => new Coin(c.x, c.y));
      winner = null;
      this.score = 0; 
    });
    
    // Optionally, listen for score reset for other players.
    socket.on('resetScores', (playersData) => {
      // Update scores if you track them.
      // (For simplicity, this demo doesn't display other players' scores.)
    });
  }
  
  update() {
    this.player.update(this.platforms);
    socket.emit('playerMovement', { x: this.player.x, y: this.player.y });
    
    // Check coin collection locally.
    this.coins = this.coins.filter((coin, index) => {
      if (checkCollision(this.player, coin)) {
        this.score++;
        console.log("Coin collected! Score: " + this.score);
        socket.emit('coinCollected', index);
        return false;
      }
      return true;
    });
  }
  
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.player.draw(this.ctx);

    
    this.coins.forEach(coin => {
      coin.draw(this.ctx);

    });
    
    this.platforms.forEach(platform => {
      platform.draw(this.ctx);

    });
    
    for (let id in otherPlayers) {
      otherPlayers[id].draw(this.ctx);

    }
    
    this.ctx.fillStyle = "black";
this.ctx.font = "20px Roboto, sans-serif";
this.ctx.fillText("Score: " + this.score, 10, 30);

if (winner) {
  this.ctx.fillStyle = "yellow";
  this.ctx.font = "40px Roboto, sans-serif";
  const text = (winner === socket.id) ? "You win!" : `Player ${winner} wins!`;
  this.ctx.fillText(text, this.canvas.width / 2 - 100, this.canvas.height / 2);
}
  }
  
  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}

console.log("Game script is running!");
const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);
game.loop();
