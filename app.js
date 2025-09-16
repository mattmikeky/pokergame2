// Multiplayer WebRTC Poker using PeerJS

// HTML elements
const usernameInput = document.getElementById("username");
const createRoomBtn = document.getElementById("createRoom");
const joinRoomBtn = document.getElementById("joinRoom");
const roomIdInput = document.getElementById("roomIdInput");
const roomInfo = document.getElementById("roomInfo");

const lobby = document.getElementById("lobby");
const gameDiv = document.getElementById("game");
const roomIdDisplay = document.getElementById("roomIdDisplay");
const handDiv = document.getElementById("hand");
const messagesDiv = document.getElementById("messages");

const startGameBtn = document.getElementById("startGame");
const betBtn = document.getElementById("betButton");
const foldBtn = document.getElementById("foldButton");

let username = "";
let roomId = "";
let hand = [];
let deck = [];
let peer;
let connections = {}; // key: peerId, value: data connection
let isHost = false;

// Logging helper
function log(msg) {
    const p = document.createElement("p");
    p.textContent = msg;
    messagesDiv.appendChild(p);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Generate a random Room ID
function generateRoomId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Create a deck
function createDeck() {
    const suits = ["♠","♥","♦","♣"];
    const ranks = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
    let d = [];
    for (let s of suits) {
        for (let r of ranks) {
            d.push(r+s);
        }
    }
    return d.sort(()=>Math.random()-0.5);
}

// Deal hand
function dealHand() {
    return deck.splice(0, 5);
}

// Display your hand
function showHand() {
    handDiv.innerHTML = "";
    for (let c of hand) {
        const span = document.createElement("span");
        span.textContent = c + " ";
        handDiv.appendChild(span);
    }
}

// Broadcast message to all peers
function broadcast(data) {
    for (let id in connections) {
        connections[id].send(data);
    }
}

// Handle incoming messages
function handleMessage(data) {
    if (data.type === "deal") {
        hand = data.hand;
        showHand();
        log("You received your hand.");
    } else if (data.type === "action") {
        log(`${data.username} ${data.action}`);
    } else if (data.type === "host-start") {
        log("Game started! Dealing cards...");
    }
}

// Connect to a new peer
function connectToPeer(id) {
    const conn = peer.connect(id);
    conn.on("open", () => {
        connections[id] = conn;
        log(`Connected to ${id}`);
    });
    conn.on("data", handleMessage);
}

// Initialize PeerJS
function initPeer(id) {
    peer = new Peer(id, {
        host: "peerjs.com",
        port: 443,
        secure: true
    });

    peer.on("open", id => {
        log(`Your peer ID: ${id}`);
    });

    peer.on("connection", conn => {
        connections[conn.peer] = conn;
        conn.on("data", handleMessage);
        log(`Peer connected: ${conn.peer}`);
    });
}

// Start game (host only)
startGameBtn.onclick = () => {
    if (!isHost) return;
    log("Game starting...");
    deck = createDeck();
    for (let id in connections) {
        const peerHand = dealHand();
        connections[id].send({type:"deal", hand: peerHand});
    }
    hand = dealHand();
    showHand();
    broadcast({type:"host-start"});
    log("Your hand is above.");
};

// Bet/fold actions
betBtn.onclick = () => {
    log(`${username} bets`);
    broadcast({type:"action", username, action:"bets"});
};
foldBtn.onclick = () => {
    log(`${username} folds`);
    broadcast({type:"action", username, action:"folds"});
};

// Create room (host)
createRoomBtn.onclick = () => {
    username = usernameInput.value || "Player";
    roomId = generateRoomId();
    isHost = true;
    initPeer(roomId);
    lobby.style.display = "none";
    gameDiv.style.display = "block";
    roomIdDisplay.textContent = roomId;
    log(`Room created. Share this Room ID with friends: ${roomId}`);
};

// Join room (peer)
joinRoomBtn.onclick = () => {
    username = usernameInput.value || "Player";
    roomId = roomIdInput.value.toUpperCase();
    isHost = false;
    initPeer(Math.random().toString(36).substr(2,6)); // random peer ID
    lobby.style.display = "none";
    gameDiv.style.display = "block";
    roomIdDisplay.textContent = roomId;

    // Connect to host
    setTimeout(()=>{ // wait a second for peer to initialize
        connectToPeer(roomId);
    }, 1000);
    log(`Joined room: ${roomId}`);
};
