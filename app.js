// app.js — Browser-only poker with full hand-ranking + enforced betting (call/fold) and Check option

// UI elements
const usernameInput = document.getElementById("username");
const createRoomBtn = document.getElementById("createRoom");
const aiCountSelect = document.getElementById("aiCount");

const lobby = document.getElementById("lobby");
const game = document.getElementById("game");
const roomIdDisplay = document.getElementById("roomIdDisplay");
const potDiv = document.getElementById("potDiv");
const currentBetDiv = document.getElementById("currentBetDiv");
const startGameBtn = document.getElementById("startGame");
const betBtn = document.getElementById("betButton");
const callBtn = document.getElementById("callButton");
const checkBtn = document.getElementById("checkButton");
const foldBtn = document.getElementById("foldButton");
const endRoundBtn = document.getElementById("endRound");

const yourHandDiv = document.getElementById("yourHand");
const playersDiv = document.getElementById("playersDiv");
const messagesDiv = document.getElementById("messages");

let roomId = "";
let me = ""; // player name for this tab
let players = {}; // name -> {money,hand,folded,revealed,isAI,active,contribution}
let pot = 0;
let roundActive = false;
let currentBet = 0; // amount each active player must have contributed to be 'even'
const ANTE = 10;
const EXTRA_BET = 10;
const STARTING_MONEY = 100;

// --- Utility logging ---
function log(msg){
  const p = document.createElement("div");
  p.textContent = msg;
  messagesDiv.appendChild(p);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// --- Deck & helper functions ---
function newDeck(){
  const suits = ["♠","♥","♦","♣"];
  const ranks = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
  const deck = [];
  for (const r of ranks) for (const s of suits) deck.push(r + s);
  for (let i = deck.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i+1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// parse card rank to numeric
const RANK_VALUE = {"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":11,"Q":12,"K":13,"A":14};

// Evaluate a 5-card hand: returns {score, type, name, tiebreaker}
function evaluate5(hand){
  const ranks = hand.map(c => c.slice(0, -1)).map(s => RANK_VALUE[s]).sort((a,b)=>a-b);
  const suits = hand.map(c => c.slice(-1));
  const isFlush = suits.every(s => s === suits[0]);
  let unique = Array.from(new Set(ranks)).sort((a,b)=>a-b);
  const isStraight = (unique.length === 5 && (unique[4] - unique[0] === 4))
    || (JSON.stringify(unique) === JSON.stringify([2,3,4,5,14]));
  const counts = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
  const countsArr = Object.keys(counts).map(k => ({r:+k,c:counts[k]}))
    .sort((a,b)=>b.c - a.c || b.r - a.r);

  let type = 0, name = "High Card", tiebreaker = [];

  if (isStraight && isFlush){
    type = 8; name = "Straight Flush"; tiebreaker = [ Math.max(...ranks) === 14 && JSON.stringify(unique) === JSON.stringify([2,3,4,5,14]) ? 5 : Math.max(...ranks) ];
  } else if (countsArr[0].c === 4){
    type = 7; name = "Four of a Kind"; tiebreaker = [countsArr[0].r, countsArr[1].r];
  } else if (countsArr[0].c === 3 && countsArr[1] && countsArr[1].c === 2){
    type = 6; name = "Full House"; tiebreaker = [countsArr[0].r, countsArr[1].r];
  } else if (isFlush){
    type = 5; name = "Flush"; tiebreaker = ranks.slice().sort((a,b)=>b-a);
  } else if (isStraight){
    type = 4; name = "Straight"; tiebreaker = [ Math.max(...ranks) === 14 && JSON.stringify(unique) === JSON.stringify([2,3,4,5,14]) ? 5 : Math.max(...ranks) ];
  } else if (countsArr[0].c === 3){
    type = 3; name = "Three of a Kind"; tiebreaker = [countsArr[0].r].concat(ranks.filter(r=>r!==countsArr[0].r).sort((a,b)=>b-a));
  } else if (countsArr[0].c === 2 && countsArr[1] && countsArr[1].c === 2){
    type = 2; name = "Two Pair"; {
      const pairVals = [countsArr[0].r, countsArr[1].r].sort((a,b)=>b-a);
      const kicker = countsArr.find(x=>x.c===1).r;
      tiebreaker = [pairVals[0], pairVals[1], kicker];
    }
  } else if (countsArr[0].c === 2){
    type = 1; name = "One Pair"; tiebreaker = [countsArr[0].r].concat(ranks.filter(r=>r!==countsArr[0].r).sort((a,b)=>b-a));
  } else {
    type = 0; name = "High Card"; tiebreaker = ranks.slice().sort((a,b)=>b-a);
  }

  let score = type * 1e12;
  for (let i=0;i<tiebreaker.length;i++){
    score += tiebreaker[i] * Math.pow(100, (5 - i));
  }
  return {score,type,name,tiebreaker};
}

// update UI
function renderPlayers(){
  playersDiv.innerHTML = "";
  for (const name in players){
    const p = players[name];
    const revealedText = p.revealed ? " | " + p.hand.join(" ") : "";
    const foldedText = p.folded ? " (Folded)" : "";
    const localMarker = p.isLocal ? " (You)" : p.isAI ? " (AI)" : "";
    const evalText = (p.revealed && p._eval) ? `<div style="font-size:13px;margin-top:6px;color:#cfe8ff">(${p._eval.name})</div>` : "";
    const contribution = p.contribution || 0;
    const html = `<div style="padding:8px;background:rgba(255,255,255,0.02);border-radius:6px;margin:6px;min-width:160px;text-align:left">
      <div style="font-weight:700">${name}${localMarker}</div>
      <div>Money: $${p.money} | Contrib: $${contribution}</div>
      <div>${foldedText}${p.revealed ? revealedText : ""}</div>
      ${evalText}
    </div>`;
    const node = document.createElement("div");
    node.innerHTML = html;
    playersDiv.appendChild(node.firstElementChild);
  }
  potDiv.textContent = pot;
  currentBetDiv.textContent = currentBet;
}

// create room (local)
createRoomBtn.addEventListener("click", () => {
  const name = (usernameInput.value || "Player").trim();
  if (!name) { alert("Enter a name"); return; }
  me = name;
  roomId = Math.random().toString(36).slice(2,6).toUpperCase();
  roomIdDisplay.textContent = roomId;
  lobby.style.display = "none";
  game.style.display = "block";
  players = {};
  players[me] = {money: STARTING_MONEY, hand: [], folded:false, revealed:false, isAI:false, isLocal:true, active:true, contribution:0};
  const aiCount = parseInt(aiCountSelect.value || "0");
  for (let i=1;i<=aiCount;i++){
    const aiName = `AI_${i}`;
    players[aiName] = {money: STARTING_MONEY, hand:[], folded:false, revealed:false, isAI:true, isLocal:false, active:true, contribution:0};
  }
  pot = 0;
  currentBet = 0;
  roundActive = false;
  messagesDiv.innerHTML = "";
  log(`Room ${roomId} created. Players: ${Object.keys(players).join(", ")}`);
  renderPlayers();
});

// start round: charge antes & deal
startGameBtn.addEventListener("click", () => {
  if (roundActive) { log("Round already active."); return; }
  if (!me || !players[me]) { alert("No player found"); return; }

  pot = 0;
  currentBet = 0;
  for (const name in players){
    const p = players[name];
    if (!p.active || p.money <= 0) { p.active = false; p.contribution = 0; continue; }
    const contrib = Math.min(ANTE, p.money);
    p.money -= contrib;
    pot += contrib;
    p.contribution = contrib;
    p.folded = false;
    p.revealed = false;
    p.hand = [];
    p._eval = null; // only set at reveal
  }

  let deck = newDeck();
  for (const name in players){
    if (!players[name].active) continue;
    players[name].hand = deck.splice(0,5);
  }

  roundActive = true;
  log(`Round started (antes ${ANTE} collected). Pot: $${pot}`);
  showLocalHand();
  // AI pre-bet decisions (do not reveal eval names)
  aiActionsAfterDeal();
  renderPlayers();
});

// show local hand
function showLocalHand(){
  if (!me || !players[me]) { yourHandDiv.innerHTML = "(no player)"; return; }
  const p = players[me];
  yourHandDiv.innerHTML = p.hand.map(c => `<span style="display:inline-block;padding:6px 8px;background:rgba(255,255,255,0.06);margin:4px;border-radius:6px">${c}</span>`).join("");
}

// Human Bet (raise by EXTRA_BET)
betBtn.addEventListener("click", () => {
  if (!roundActive) { log("Start a round first."); return; }
  const p = players[me];
  if (!p || p.money <= 0) { log("You have no money to bet."); return; }

  // Player raises by EXTRA_BET
  const raiseAmount = EXTRA_BET;
  // Increase currentBet by raise - but currentBet is amount to match; we treat raise as setting currentBet = (max existing contribution + raise)
  // Determine target contribution after raise:
  const targetContribution = Math.max(...Object.values(players).map(x => x.contribution || 0)) + raiseAmount;
  const amountToPut = Math.max(0, targetContribution - (p.contribution || 0));
  const actuallyPaid = Math.min(amountToPut, p.money);
  p.money -= actuallyPaid;
  p.contribution = (p.contribution || 0) + actuallyPaid;
  pot += actuallyPaid;
  currentBet = Math.max(currentBet, p.contribution);
  log(`${me} raises to $${currentBet} (paid $${actuallyPaid})`);

  // Now force AIs (and other players if multi-tab humans) to either call (match currentBet) or fold.
  aiForceCallOrFoldAfterRaise();
  renderPlayers();
});

// Human Call
callBtn.addEventListener("click", () => {
  if (!roundActive) { log("Start a round first."); return; }
  const p = players[me];
  const toCall = (currentBet - (p.contribution || 0));
  if (toCall <= 0) { log("Nothing to call (you are even)."); return; }
  const pay = Math.min(toCall, p.money);
  p.money -= pay;
  p.contribution = (p.contribution || 0) + pay;
  pot += pay;
  log(`${me} calls $${pay}`);
  // After call, allow AIs to possibly respond (but when call occurs, no forced raise)
  aiActionsAfterHumanCall();
  renderPlayers();
});

// Human Check
checkBtn.addEventListener("click", () => {
  if (!roundActive) { log("Start a round first."); return; }
  const p = players[me];
  if ((currentBet - (p.contribution || 0)) > 0) {
    log("Cannot check when there's a bet — you must call or fold.");
    return;
  }
  log(`${me} checks`);
  // AIs may choose to bet or check
  aiActionsAfterCheck();
  renderPlayers();
});

// Human fold
foldBtn.addEventListener("click", () => {
  if (!roundActive) { log("Start a round first."); return; }
  players[me].folded = true;
  log(`${me} folds`);
  renderPlayers();
});

// End round: reveal and distribute pot
endRoundBtn.addEventListener("click", () => {
  if (!roundActive) { log("No active round."); return; }

  // Reveal and evaluate
  const activeNames = Object.keys(players).filter(n => !players[n].folded && players[n].hand && players[n].hand.length === 5 && players[n].active !== false);
  if (activeNames.length === 0){
    log("No active players — returning pot equally.");
    const everyone = Object.keys(players);
    const share = Math.floor(pot / everyone.length);
    for (const n of everyone) players[n].money += share;
    pot = 0;
    roundActive = false;
    for (const n in players) players[n].revealed = true;
    renderPlayers();
    return;
  }

  // evaluate and store results (now allowed to reveal)
  let bestScore = -1;
  let winners = [];
  for (const n of activeNames){
    const evalRes = evaluate5(players[n].hand);
    players[n]._eval = evalRes;
    players[n].revealed = true;
    if (evalRes.score > bestScore){
      bestScore = evalRes.score;
      winners = [n];
    } else if (evalRes.score === bestScore){
      winners.push(n);
    }
  }

  const share = Math.floor(pot / winners.length);
  for (const w of winners){
    players[w].money += share;
    log(`${w} wins $${share} (${players[w]._eval.name})`);
  }
  const remainder = pot - share * winners.length;
  if (remainder > 0){
    players[winners[0]].money += remainder;
    log(`${winners[0]} receives extra $${remainder} (remainder)`);
  }
  pot = 0;
  roundActive = false;

  // reset contributions for next round
  for (const n in players) players[n].contribution = 0;

  renderPlayers();
  log("Round finished. You may start another round.");
});

// --- AI behavior functions (no reveal of hand name until round end) ---

// After a raise by human, AIs must either call (if strong enough & can pay) or fold.
function aiForceCallOrFoldAfterRaise(){
  for (const name in players){
    const p = players[name];
    if (!p.isAI || p.folded || p.money <= 0 || !roundActive) continue;
    // compute amount they need to call
    const need = currentBet - (p.contribution || 0);
    // evaluate hand to decide
    const evalRes = evaluate5(p.hand);
    const strength = evalRes.type * 10 + (evalRes.tiebreaker && evalRes.tiebreaker[0] ? evalRes.tiebreaker[0]/14*10 : 0);
    // decision: stronger hands more likely to call
    if (strength >= 30 && p.money > 0 && need > 0) {
      const pay = Math.min(need, p.money);
      p.money -= pay;
      p.contribution = (p.contribution || 0) + pay;
      pot += pay;
      log(`${name} (AI) calls $${pay}`);
    } else {
      p.folded = true;
      log(`${name} (AI) folds`);
    }
  }
  // after AI responses, ensure contributions consistent, maybe some players are still behind; update currentBet to max contribution
  currentBet = Math.max(...Object.values(players).map(x => x.contribution || 0));
  renderPlayers();
}

// After human calls, AIs can optionally react (call/raise/fold); to keep it simple, they may call a small amount or check
function aiActionsAfterHumanCall(){
  for (const name in players){
    const p = players[name];
    if (!p.isAI || p.folded || p.money <= 0 || !roundActive) continue;
    // compute amount they would need to call
    const need = currentBet - (p.contribution || 0);
    const evalRes = evaluate5(p.hand);
    const strength = evalRes.type * 10 + (evalRes.tiebreaker && evalRes.tiebreaker[0] ? evalRes.tiebreaker[0]/14*10 : 0);
    if (need > 0) {
      if (strength >= 30 && p.money > 0) {
        const pay = Math.min(need, p.money);
        p.money -= pay;
        p.contribution = (p.contribution || 0) + pay;
        pot += pay;
        log(`${name} (AI) calls $${pay}`);
      } else {
        p.folded = true;
        log(`${name} (AI) folds`);
      }
    } else {
      // no outstanding bet — small chance to bet
      if (strength >= 45 && p.money >= EXTRA_BET && Math.random() < 0.3) {
        // raise
        const target = Math.max(...Object.values(players).map(x => x.contribution || 0)) + EXTRA_BET;
        const pay = Math.min(target - (p.contribution || 0), p.money);
        p.money -= pay;
        p.contribution = (p.contribution || 0) + pay;
        pot += pay;
        currentBet = Math.max(currentBet, p.contribution);
        log(`${name} (AI) raises to $${currentBet}`);
      } else {
        log(`${name} (AI) checks`);
      }
    }
  }
  renderPlayers();
}

// After a human check (no outstanding bet), AIs may bet or check
function aiActionsAfterCheck(){
  for (const name in players){
    const p = players[name];
    if (!p.isAI || p.folded || p.money <= 0 || !roundActive) continue;
    const evalRes = evaluate5(p.hand);
    const strength = evalRes.type * 10 + (evalRes.tiebreaker && evalRes.tiebreaker[0] ? evalRes.tiebreaker[0]/14*10 : 0);
    if (strength >= 45 && p.money >= EXTRA_BET && Math.random() < 0.5){
      // AI bets (raise)
      const target = Math.max(...Object.values(players).map(x => x.contribution || 0)) + EXTRA_BET;
      const pay = Math.min(target - (p.contribution || 0), p.money);
      p.money -= pay;
      p.contribution = (p.contribution || 0) + pay;
      pot += pay;
      currentBet = Math.max(currentBet, p.contribution);
      log(`${name} (AI) bets $${pay}`);
    } else {
      log(`${name} (AI) checks`);
    }
  }
  renderPlayers();
}

// initial render
renderPlayers();
log("Ready — create a room and choose AI opponents (0–5).");
