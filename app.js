// Local Multiplayer Poker with hands, money, and pot

const usernameInput = document.getElementById("username");
const createRoomBtn = document.getElementById("createRoom");
const joinRoomBtn = document.getElementById("joinRoom");
const roomIdInput = document.getElementById("roomIdInput");

const lobby = document.getElementById("lobby");
const gameDiv = document.getElementById("game");
const roomIdDisplay = document.getElementById("roomIdDisplay");
const handDiv = document.getElementById("hand");
const messagesDiv = document.getElementById("messages");

const startGameBtn = document.getElementById("startGame");
const betBtn = document.getElementById("betButton");
const foldBtn = document.getElementById("foldButton");

// Added: Player list and pot
const playersDiv = document.createElement("div");
playersDiv.id = "playersDiv";
gameDiv.insertBefore(playersDiv, messagesDiv);

const potDiv = document.createElement("div");
potDiv.id = "potDiv";
potDiv.textContent = "Pot: $0";
gameDiv.insertBefore(potDiv, messagesDiv);

let username = "";
let roomId = "";
let hand = [];
let deck = [];
let pot = 0;

// Track players and money
let players = {}; // {username: {hand:[], money:100, folded:false}}

// Logging helper
function log(msg) {
    const p = document.createElement("p");
    p.textContent = msg;
    messagesDiv.appendChild(p);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Generate Room ID
function generateRoomId() {
    return Math.random().toString(36).substr(2,6).toUpperCase();
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
    return deck.splice(0,5);
}

// Show your hand
function showHand() {
    handDiv.innerHTML = "";
    for (let c of hand) {
        const span = document.createElement("span");
        span.textContent = c + " ";
        handDiv.appendChild(span);
    }
}

// Update all players display
function updatePlayersDisplay() {
    playersDiv.innerHTML = "";
    for (let p in players) {
        const div = document.createElement("div");
        div.textContent = `${p} - $${players[p].money} ${players[p].folded ? "(Folded)" : ""}`;
        if (players[p].hand) {
            div.textContent += " | Hand: " + players[p].hand.join(" ");
        }
        playersDiv.appendChild(div);
    }
    potDiv.textContent = `Pot: $${pot}`;
}

// Broadcast a message to other tabs (simulated)
function broadcast(msg) {
    localStorage.setItem("pokerMessage", JSON.stringify(msg));
}

// Listen for messages from other tabs
window.addEventListener("storage", (event)=>{
    if(event.key==="pokerMessage"){
        const data = JSON.parse(event.newValue);
        handleMessage(data);
    }
});

function handleMessage(data){
    if(!data) return;
    switch(data.type){
        case "join":
            players[data.username]={hand:[], money:100, folded:false};
            log(`${data.username} joined the room`);
            updatePlayersDisplay();
            break;
        case "deal":
            if(players[data.username]){
                players[data.username].hand = data.hand;
            }
            if(data.username===username){
                hand = data.hand;
                showHand();
            }
            log(`${data.username} received their hand.`);
            updatePlayersDisplay();
            break;
        case "action":
            log(`${data.username} ${data.action} $${data.amount || ""}`);
            if(data.action==="bets") {
                players[data.username].money -= data.amount;
                pot += data.amount;
            } else if(data.action==="folds"){
                players[data.username].folded=true;
            }
            updatePlayersDisplay();
            break;
        case "host-start":
            log("Game started!");
            break;
    }
}

// Buttons
createRoomBtn.onclick = ()=>{
    username = usernameInput.value || "Player";
    roomId = generateRoomId();
    lobby.style.display="none";
    gameDiv.style.display="block";
    roomIdDisplay.textContent = roomId;
    players[username]={hand:[], money:100, folded:false};
    log(`Room created! Share Room ID: ${roomId}`);
    updatePlayersDisplay();
};

joinRoomBtn.onclick = ()=>{
    username = usernameInput.value || "Player";
    roomId = roomIdInput.value.toUpperCase();
    lobby.style.display="none";
    gameDiv.style.display="block";
    roomIdDisplay.textContent = roomId;
    broadcast({type:"join", username});
    players[username]={hand:[], money:100, folded:false};
    updatePlayersDisplay();
    log(`Joined room: ${roomId}`);
};

startGameBtn.onclick = ()=>{
    deck=createDeck();
    pot=0;
    log("Dealing hands...");
    for(let p in players){
        const playerHand=dealHand();
        players[p].hand=playerHand;
        broadcast({type:"deal", username:p, hand:playerHand});
    }
    hand = players[username].hand;
    showHand();
    broadcast({type:"host-start"});
    updatePlayersDisplay();
};

betBtn.onclick = ()=>{
    let amount = 10; // example fixed bet
    log(`${username} bets $${amount}`);
    broadcast({type:"action", username, action:"bets", amount});
    players[username].money -= amount;
    pot += amount;
    updatePlayersDisplay();
};

foldBtn.onclick = ()=>{
    log(`${username} folds`);
    broadcast({type:"action", username, action:"folds"});
    players[username].folded=true;
    updatePlayersDisplay();
};

