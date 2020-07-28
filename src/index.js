const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const Filter = require("bad-words");
const { generateMessage, generateLocationMessage } = require("./utils/messages");
const { addUser, removeUser, getUser, getUsersInRoom } = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT;
const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

io.on("connection", (socket) => {
    console.log("User connected.");

    socket.on("join-room", (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options });

        if (error) {
            return callback(error);
        }

        socket.join(user.room);

        socket.emit("sendMessage", generateMessage("Admin", `Welcome to the room "${user.room}"`));
        socket.broadcast.to(user.room).emit("sendMessage", generateMessage(`${user.username} has joined the room!`));
        io.to(user.room).emit("room-data", {
            room: user.room,
            users: getUsersInRoom(user.room),
        });

        callback();
    });

    socket.on("sendMessage", (message, callback) => {
        const filter = new Filter();
        if (filter.isProfane(message)) {
            return callback("Profanity is not allowed");
        }
        const user = getUser(socket.id);
        if (user) {
            io.to(user.room).emit("sendMessage", generateMessage(user.username, message));
            callback();
        }
    });

    socket.on("sendLocation", (coords, callback) => {
        const user = getUser(socket.id);
        if (user) {
            io.to(user.room).emit("sendLocation", generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`));
            callback("Location shared!");
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected!");
        const user = removeUser(socket.id);
        if (user) {
            io.to(user.room).emit("sendMessage", generateMessage(`${user.username} has left the room.`));
            io.to(user.room).emit("room-data", {
                room: user.room,
                users: getUsersInRoom(user.room),
            });
        }
    });
});

server.listen(port, () => {
    console.log(`server is listening on port: ${port}`);
});
