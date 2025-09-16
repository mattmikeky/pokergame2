// Poker Game Logic
const usernameInput = document.getElementById("username");
const createRoomBtn = document.getElementById("createRoom");
const aiCountSelect = document.getElementById("aiCount");

const lobby = document.getElementById("lobby");
const gameDiv = document.getElementById("game");
const roomIdDisplay = document.getElementById("roomIdDisplay");
const handDiv = document.getElementById("hand");
const messagesDiv = document.getElementById("messages");
const playersDiv = document.getElementById("playersDiv");
const potDiv = document.getElementById("potDiv");

const startBtn = document.getElementById("startGame");
const betBtn = document.getElementById("betButton");
const foldBtn = document.getElementById("foldButton");
const endBtn = document.getElementById("endRound");

let username="";
let roomId="";
let hand=[];
let pot=0;
let roundOver=false;
let players={}; // {playerName:{money,hand,folded,revealed,isAI}}

function log(msg){
    const p=document.createElement("p");
    p.textContent=msg;
    messagesDiv.appendChild(p);
    messagesDiv.scrollTop=messagesDiv.scrollHeight;
}

// Room creation
createRoomBtn.onclick=()=>{
    username=usernameInput.value||"Player";
    let aiCount=parseInt(aiCountSelect.value);
    roomId=Math.random().toString(36).substr(2,6).toUpperCase();
    lobby.style.display="none";
    gameDiv.style.display="block";
    roomIdDisplay.textContent=roomId;
    players[username]={money:100,hand:[],folded:false,revealed:false,isAI:false};
    log(`Room created! Share Room ID: ${roomId}`);

    // Add AI players
    for(let i=1;i<=aiCount;i++){
        let aiName="AI_"+i;
        players[aiName]={money:100,hand:[],folded:false,revealed:false,isAI:true};
        log(`${aiName} joined the room`);
    }
    updatePlayersDisplay();
};

// Deck and hand functions
function createDeck(){
    const suits=["♠","♥","♦","♣"];
    const ranks=["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
    let d=[];
    for(let s of suits) for(let r of ranks) d.push(r+s);
    return d.sort(()=>Math.random()-0.5);
}
function dealHand(deck){ return deck.splice(0,5); }
function showHand(){
    handDiv.innerHTML="";
    for(let c of hand){
        const span=document.createElement("span");
        span.textContent=c+" ";
        handDiv.appendChild(span);
    }
}
function updatePlayersDisplay(){
    playersDiv.innerHTML="";
    for(let name in players){
        let p=players[name];
        let handText=(p.revealed || !p.isAI)? " | Hand: "+p.hand.join(" "): "";
        let foldedText=p.folded?"(Folded)":"";
        playersDiv.innerHTML+=`<div>${name} - $${p.money} ${foldedText} ${handText}</div>`;
    }
    potDiv.textContent=`Pot: $${pot}`;
}

// Start Round
startBtn.onclick=()=>{
    let deck=createDeck();
    pot=0;
    roundOver=false;
    // Deal hands
    for(let name in players){
        let h=dealHand(deck);
        players[name].hand=h;
        players[name].revealed=false;
        if(name===username) hand=h;
    }
    log("Hands dealt!");
    showHand();
    updatePlayersDisplay();
    aiTakeActions();
};

// Bet
betBtn.onclick=()=>{
    let amount=10;
    if(players[username].money<amount){
        log("Cannot bet more than you have!");
        return;
    }
    players[username].money-=amount;
    pot+=amount;
    log(`${username} bets $${amount}`);
    updatePlayersDisplay();
    aiTakeActions();
};

// Fold
foldBtn.onclick=()=>{
    players[username].folded=true;
    log(`${username} folds`);
    updatePlayersDisplay();
    aiTakeActions();
};

// End Round
endBtn.onclick=()=>{
    roundOver=true;
    for(let name in players) players[name].revealed=true;
    log("Round ended! Hands revealed.");
    updatePlayersDisplay();
};

// AI Logic
function aiTakeActions(){
    for(let name in players){
        let ai=players[name];
        if(!ai.isAI || ai.folded || roundOver) continue;
        // Evaluate hand strength (very simple heuristic: count high cards)
        let highCards=ai.hand.filter(c=>["A","K","Q","J","10"].some(v=>c.startsWith(v))).length;
        let action="";
        if(highCards>=3 && ai.money>=10){
            // Bet
            ai.money-=10;
            pot+=10;
            action="bets $10";
        } else if(highCards<=1){
            // Fold
            ai.folded=true;
            action="folds";
        } else{
            // Call (do nothing, just log)
            action="checks";
        }
        log(`${name} ${action}`);
    }
    updatePlayersDisplay();
}
