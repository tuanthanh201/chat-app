const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const Filter = require("bad-words");
const { generateMessage, generateLocation } = require("./utils/messages");
const { addUser, removeUser, getUser, getUsersInRoom } = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

// server (emit) -> client (receive) - countUpdated
// client (emit) -> server (receive) - increment
// socket.emit is gonna emit the event to one particular connection
// io.emit is gonna emit the event to all the connections available
// socket.broadcast.emit is gonna emit an event to all connections except one

io.on("connection", (socket) => {
    console.log("New Websocket connection");

    socket.on("join", ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })

        if (error)
        {
            return callback(error);
        }

        socket.join(user.room)
        
        // Rooms
        // socket.emit -> X
        // io.emit -> io.to.emit
        // socket.broadcast.emi -> socket.broadcast.to.emit

        socket.emit("message", generateMessage("Admin", "Welcome!"));
        socket.broadcast.to(user.room).emit("message", generateMessage("Admin", `${user.username} has joined!`));
        io.to(user.room).emit("roomData", {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback();
    })

    socket.on("sendMessage", (message, callback) => {
        const filter = new Filter();

        if (filter.isProfane(message))
        {
            socket.emit("message", generateMessage("Admin", "Message was not sent. Profanity is bad..."));
            return callback("Profanity is not allowed");
        }

        const user = getUser(socket.id);

        io.to(user.room).emit("message", generateMessage(user.username, message));
        callback();
    })

    socket.on("sendLocation", ({longitude, latitude}, callback) => {
        const user = getUser(socket.id);

        io.to(user.room).emit("locationMessage", generateLocation(user.username, `https://google.com/maps?q=${latitude},${longitude}`));
        callback();
    })

    socket.on("disconnect", () => {
        const user = removeUser(socket.id);

        if (user)
        {
            io.to(user.room).emit("message", generateMessage("Admin", `${user.username} has left!`));
            io.to(user.room).emit("roomData", {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log("Server is up on port " + port);
})