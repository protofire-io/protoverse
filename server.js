const path = require("path");
const express = require("express");
const config = require("./config");
const configureMiddleware = require("./middleware");
const configureRoutes = require("./routes");
const socketio = require("socket.io");
const gameSocket = require("./socket/index");
const app = express();

configureMiddleware(app);

// Routes
configureRoutes(app);

// ---- AUTO PORT LOGIC ----
let port = Number(config.PORT) || 3030;
let server;
const startServer = () => {
  server = app
    .listen(port, () => {
      console.log(`Backend listening on http://127.0.0.1:${port}`);
      // Socket.io
      const io = socketio(server);
      io.on("connect", (socket) => gameSocket.init(socket, io));
    })
    .on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`Port ${port} in use, trying ${port + 1}...`);
        port++;
        startServer();
      } else {
        console.error("Server error:", err);
        process.exit(1);
      }
    });
};

startServer();

process.on("unhandledRejection", (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  server?.close(() => process.exit(1));
});
