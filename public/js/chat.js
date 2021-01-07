const socket = io();

// Elements
const $messageForm = document.querySelector("#message-form");
const $messageFormInput = document.querySelector("input");
const $messageFormButton = document.querySelector("button");
const $sendLocationButton = document.querySelector("#send-location");
const $messages = document.querySelector("#messages");

// Templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationTemplate = document.querySelector("#location-template").innerHTML;
const sideBarTemplate = document.querySelector("#sidebar-template").innerHTML;

// Options
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
    const containerHeight = $messages.scrollHeight;

    // How far have I scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight;

    if (containerHeight - newMessageHeight <= scrollOffset)
    {
        $messages.scrollTop = $messages.scrollHeight;
    }
}

socket.on("message", (message) => {
    console.log(message);
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format("k:mm")
    });

    $messages.insertAdjacentHTML("beforeend", html);
    autoScroll();
})

socket.on("locationMessage", (message) => {
    console.log(message);
    const html = Mustache.render(locationTemplate, {
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format("k:mm")
    });

    $messages.insertAdjacentHTML("beforeend", html);
    autoScroll();
})

socket.on("roomData", ({ room, users }) => {
    const html = Mustache.render(sideBarTemplate, {
        room,
        users
    });

    document.querySelector("#sidebar").innerHTML = html;
})

$messageForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // Disable the form
    $messageFormButton.setAttribute("disabled", "disabled");
    
    const message = e.target.elements.message.value;

    // Event acknowledgement is like functions that get called after an event(?)
    socket.emit("sendMessage", message, (error) => {
        // Enable the form
        $messageFormButton.removeAttribute("disabled");
        $messageFormInput.value = "";
        $messageFormInput.focus();

        if (error) {
            return console.log(error);
        }

        console.log("Message delivered!");
    });
})

$sendLocationButton.addEventListener("click", () => {
    if (!navigator.geolocation)
    {
        return alert("Geolocation is not supported by your browser.");
    }

    $sendLocationButton.setAttribute("disabled", "disabled");

    navigator.geolocation.getCurrentPosition((position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const location = {
            latitude,
            longitude
        }

        socket.emit("sendLocation", location, () => {
            $sendLocationButton.removeAttribute("disabled");
            console.log("Location shared!");
        });

    })
})

socket.emit("join", { username, room }, (error) => {
    if (error)
    {
        alert(error);
        location.href = "/";
    }
})