// P2P Poker with WebRTC (works on same Wi-Fi)

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
const endRoundBtn = document.getElementById("endRound");

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
let pot = 0;
let roundOver = false;
let players = {}; // {peerId:{username,money,hand,folded,revealed}}
let peers = {};   // WebRTC data channels

// Logging
function log(msg){
    const p = document.createElement("p");
    p.textContent = msg;
    messagesDiv.appendChild(p);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Generate Room ID
function generateRoomId(){
    return Math.random().toString(36).substr(2,6).toUpperCase();
}

// Deck and hand functions
function createDeck(){
    const suits = ["♠","♥","♦","♣"];
    const ranks = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
    let d = [];
    for(let s of suits) for(let r of ranks) d.push(r+s);
    return d.sort(()=>Math.random()-0.5);
}

function dealHand(deck){ return deck.splice(0,5); }

function showHand(){
    handDiv.innerHTML="";
    for(let c of hand){
        const span = document.createElement("span");
        span.textContent=c+" ";
        handDiv.appendChild(span);
    }
}

function updatePlayersDisplay(){
    playersDiv.innerHTML="";
    for(let id in players){
        let p = players[id];
        let handText = p.revealed ? " | Hand: "+p.hand.join(" ") : "";
        let foldedText = p.folded ? "(Folded)" : "";
        playersDiv.innerHTML += `<div>${p.username} - $${p.money} ${foldedText} ${handText}</div>`;
    }
    potDiv.textContent=`Pot: $${pot}`;
}

// WebRTC send
function broadcast(msg){
    for(let id in peers){
        if(peers[id].readyState==="open"){
            peers[id].send(JSON.stringify(msg));
        }
    }
    handleMessage(msg); // Also handle locally
}

// Handle incoming messages
function handleMessage(msg){
    switch(msg.type){
        case "join":
            if(!players[msg.peerId]){
                players[msg.peerId]={username:msg.username,money:100,hand:[],folded:false,revealed:false};
                log(`${msg.username} joined the room`);
                updatePlayersDisplay();
            }
            break;
        case "deal":
            if(msg.peerId===username) hand=msg.hand;
            if(players[msg.peerId]){
                players[msg.peerId].hand=msg.hand;
                players[msg.peerId].revealed=false;
            }
            updatePlayersDisplay();
            if(msg.peerId===username) showHand();
            break;
        case "action":
            if(players[msg.peerId]){
                if(msg.action==="bets"){
                    if(players[msg.peerId].money>=msg.amount){
                        players[msg.peerId].money-=msg.amount;
                        pot+=msg.amount;
                    }
                } else if(msg.action==="folds"){
                    players[msg.peerId].folded=true;
                }
            }
            log(`${msg.username} ${msg.action} $${msg.amount||""}`);
            updatePlayersDisplay();
            break;
        case "round-end":
            roundOver=true;
            for(let id in players) players[id].revealed=true;
            log("Round over! Hands revealed.");
            updatePlayersDisplay();
            break;
    }
}

// Room creation/joining
createRoomBtn.onclick = ()=>{
    username=usernameInput.value||"Player";
    roomId=generateRoomId();
    lobby.style.display="none";
    gameDiv.style.display="block";
    roomIdDisplay.textContent=roomId;
    players[username]={username,money:100,hand:[],folded:false,revealed:false};
    log(`Room created! Share Room ID: ${roomId}`);
};

joinRoomBtn.onclick = ()=>{
    username=usernameInput.value||"Player";
    roomId=roomIdInput.value.toUpperCase();
    lobby.style.display="none";
    gameDiv.style.display="block";
    roomIdDisplay.textContent=roomId;
    players[username]={username,money:100,hand:[],folded:false,revealed:false};
    broadcast({type:"join", peerId:username, username});
};

// Start Game
startGameBtn.onclick = ()=>{
    let deck=createDeck();
    pot=0;
    roundOver=false;
    for(let id in players){
        let h=dealHand(deck);
        players[id].hand=h;
        players[id].revealed=false;
        broadcast({type:"deal", peerId:id, hand:h});
    }
    updatePlayersDisplay();
    showHand();
};

// Bet
betBtn.onclick = ()=>{
    let amount=10;
    if(players[username].money<amount){
        log("Cannot bet more than you have!");
        return;
    }
    players[username].money-=amount;
    pot+=amount;
    broadcast({type:"action", peerId:username, username, action:"bets", amount});
    updatePlayersDisplay();
};

// Fold
foldBtn.onclick = ()=>{
    players[username].folded=true;
    broadcast({type:"action", peerId:username, username, action:"folds"});
    updatePlayersDisplay();
};

// End Round
endRoundBtn.onclick = ()=>{
    roundOver=true;
    for(let id in players) players[id].revealed=true;
    broadcast({type:"round-end"});
    updatePlayersDisplay();
};
