// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);


app.use(express.static('public'));

let coins = [
    { x: 200, y: 800 },
    { x: 800, y: 700 },
    { x: 1400, y: 600 },
    { x: 400, y: 500 },
    { x: 1200, y: 450 },
    { x: 600, y: 350 },
    { x: 1000, y: 250 },
    { x: 300, y: 150 },
    { x: 1100, y: 100 },
    { x: 750, y: 50 }
  ];
  
  
  let platforms = [
    
  ];
  
const players = {};

io.on('connection', socket => {
  console.log('New player connected:', socket.id);


  players[socket.id] = { x: 100, y: 200, score: 0 };


  socket.emit('currentPlayers', players);
  socket.emit('currentCoins', coins);
  socket.emit('currentPlatforms', platforms);


  socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });


  socket.on('playerMovement', movementData => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      socket.broadcast.emit('playerMoved', { id: socket.id, x: movementData.x, y: movementData.y });
    }
  });


  socket.on('coinCollected', coinIndex => {
    if (coins[coinIndex]) {
      coins.splice(coinIndex, 1);
      players[socket.id].score++;
      io.emit('coinCollected', { coinIndex, playerId: socket.id, newScore: players[socket.id].score });
      console.log(`Player ${socket.id} collected a coin. New score: ${players[socket.id].score}`);


      if (coins.length === 0) {
        let winnerId = null;
        let maxScore = -1;
        for (let id in players) {
          if (players[id].score > maxScore) {
            maxScore = players[id].score;
            winnerId = id;
          }
        }
        io.emit('gameOver', { winnerId, players });
        console.log(`Game over! Winner: ${winnerId}`);


        setTimeout(() => {
          coins = [
            { x: 150, y: 150 },
            { x: 350, y: 200 },
            { x: 600, y: 100 }
          ];
          for (let id in players) {
            players[id].score = 0;
          }
          io.emit('resetCoins', coins);
          io.emit('resetScores', players);
          console.log('Coins and scores have been reset.');
        }, 5000);
      }
    }
  });


  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
