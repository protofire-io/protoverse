class Player {
  constructor(socketId, playerId, playerName, chipsAmount, options = {}) {
    this.socketId = socketId;
    this.id = playerId;
    this.name = playerName;
    this.bankroll = chipsAmount;
    this.isBot = !!options.isBot;
  }
}

module.exports = Player;
