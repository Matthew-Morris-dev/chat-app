const socket = io();

// ELEMENTS
const $messageForm = document.getElementById("textMessageForm");
const $sendMessageInput = document.getElementById("textMessageInput");
const $messageFormButton = document.getElementById("textMessageButton");
const $shareLocationButton = document.getElementById("share-location-btn");
const $messages = document.getElementById("messages");

// TEMPLATES
const messageTemplate = document.getElementById("message-template").innerHTML;
const locationMessageTemplate = document.getElementById("location-message-template").innerHTML;
const sidebarTemplate = document.getElementById("sidebar-template").innerHTML;

// OPTIONS
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

const autoScroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild;

    // Height of the new message
    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

    // Visible height
    const visibleHeight = $messages.offsetHeight;

    // Height of messages container
    const contentHeight = $messages.scrollHeight;

    // Current scroll position
    const currentScrollPos = $messages.scrollTop + visibleHeight;

    if (contentHeight - newMessageHeight <= currentScrollPos) {
        $messages.scrollTop = $messages.scrollHeight;
    }
};

socket.on("sendMessage", (message) => {
    console.log(message);
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment().format("HH:mm"),
    });
    $messages.insertAdjacentHTML("beforeend", html);
    autoScroll();
});

socket.on("sendLocation", (message) => {
    const html = Mustache.render(locationMessageTemplate, {
        username: message.username,
        url: message.url,
        createdAt: moment().format("HH:mm"),
    });
    $messages.insertAdjacentHTML("beforeend", html);
    autoScroll();
});

socket.on("room-data", ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users,
    });
    document.getElementById("sidebar").innerHTML = html;
});

$messageForm.addEventListener("submit", (event) => {
    event.preventDefault();

    $messageFormButton.setAttribute("disabled", "disabled");

    let message = $sendMessageInput.value;

    socket.emit("sendMessage", message, (error) => {
        $messageFormButton.removeAttribute("disabled");
        $sendMessageInput.value = "";
        $sendMessageInput.focus();
        if (error) {
            return alert(error);
        }

        console.log("Message delivered!");
    });
});

$shareLocationButton.addEventListener("click", (event) => {
    $shareLocationButton.setAttribute("disabled", "disabled");
    event.preventDefault();
    if (!navigator.geolocation) {
        return alert("Geolocation is not supported by your browser");
    }

    navigator.geolocation.getCurrentPosition((position) => {
        socket.emit(
            "sendLocation",
            {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            },
            (message) => {
                $shareLocationButton.removeAttribute("disabled");
                console.log(message);
            }
        );
    });
});

socket.emit("join-room", { room, username }, (error) => {
    if (error) {
        alert(error);
    }
});
