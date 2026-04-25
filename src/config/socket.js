const socketIO = require('socket.io');

const initSocket = (server) => {
  const io = socketIO(server);
  io.on('connection', (socket) => {
    socket.on('joinAuction', (auctionId) => {
      socket.join(auctionId);
    });
  });
  return io;
};

module.exports = initSocket;