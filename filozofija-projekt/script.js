let TOTAL_ROUNDS = 5;
let round = 1;
let correctCount = 0;
let quizData = null;
let availableQuotes = [];
let currentQuote = null;

const menu            = document.getElementById('menu');
const diffMenu        = document.getElementById('difficulty-menu');
const creditsScreen   = document.getElementById('credits-screen');
const gameContainer   = document.querySelector('.game-container');
const btnStart        = document.getElementById('btn-start');
const diffButtons     = document.querySelectorAll('.btn-difficulty');
const btnDiffBack     = document.getElementById('btn-diff-back');
const btnCredits      = document.getElementById('btn-credits');
const btnBackCredits  = document.getElementById('btn-back');
const btnBackMenu     = document.getElementById('btn-back-menu');
const btnLeft         = document.getElementById('btn-left');
const btnRight        = document.getElementById('btn-right');
const btnRestart      = document.getElementById('btn-restart');
const roundSpan       = document.getElementById('round');
const totalRoundsSpan = document.getElementById('total-rounds');
const quoteText       = document.getElementById('quote-text');

btnStart.addEventListener('click', () => {
  menu.style.display     = 'none';
  diffMenu.style.display = 'flex';
});

btnDiffBack.addEventListener('click', () => {
  diffMenu.style.display = 'none';
  menu.style.display     = 'flex';
});

diffButtons.forEach(btn => {
  btn.addEventListener('click', async () => {
    TOTAL_ROUNDS = parseInt(btn.dataset.rounds, 10);
    totalRoundsSpan.textContent = TOTAL_ROUNDS;
    diffMenu.style.display = 'none';
    await startGame();
  });
});

btnCredits.addEventListener('click', () => {
  menu.style.display          = 'none';
  creditsScreen.style.display = 'flex';
});

btnBackCredits.addEventListener('click', () => {
  creditsScreen.style.display = 'none';
  menu.style.display          = 'flex';
});

btnBackMenu.addEventListener('click', () => {
  gameContainer.style.display = 'none';
  creditsScreen.style.display = 'none';
  diffMenu.style.display      = 'none';
  menu.style.display          = 'flex';
  localStorage.removeItem('quizData');
  round = 1;
  correctCount = 0;
  updateHeader();
});

btnLeft.addEventListener('click',  () => handleAnswer('left'));
btnRight.addEventListener('click', () => handleAnswer('right'));
btnRestart.addEventListener('click', startNewGame);

async function loadData() {
  const cached = localStorage.getItem('quizData');
  if (cached) return JSON.parse(cached);
  const res  = await fetch('data.json');
  const data = await res.json();
  localStorage.setItem('quizData', JSON.stringify(data));
  return data;
}

function updateHeader() {
  roundSpan.textContent       = round;
  totalRoundsSpan.textContent = TOTAL_ROUNDS;
}

function nextQuote() {
  if (availableQuotes.length === 0) return endGame();
  const idx = Math.floor(Math.random() * availableQuotes.length);
  currentQuote = availableQuotes.splice(idx, 1)[0];

  const correctPhil = quizData.philosophers.find(p => p.id === currentQuote.philosopherId);
  const wrongs      = quizData.philosophers.filter(p => p.id !== currentQuote.philosopherId);
  const wrongPhil   = wrongs[Math.floor(Math.random() * wrongs.length)];

  if (Math.random() < 0.5) {
    setAvatar('left', correctPhil);
    setAvatar('right', wrongPhil);
  } else {
    setAvatar('left', wrongPhil);
    setAvatar('right', correctPhil);
  }

  quoteText.textContent = currentQuote.text;
}

function setAvatar(side, phil) {
  const imgEl  = document.getElementById(`${side}-img`);
  const nameEl = document.getElementById(`${side}-name`);
  imgEl.src     = phil.imageUrl || `img/${phil.name.toLowerCase().replace(/ /g, '_')}.png`;
  imgEl.alt     = phil.name;
  nameEl.textContent = phil.name;
}

function handleAnswer(side) {
  const chosen = document.getElementById(`${side}-img`).alt;
  const correct = quizData.philosophers
    .find(p => p.id === currentQuote.philosopherId)
    .name;

  if (chosen === correct) correctCount++;

  if (round < TOTAL_ROUNDS) {
    round++;
    updateHeader();
    nextQuote();
  } else {
    endGame();
  }
}

function endGame() {
  quoteText.textContent = `Kraj igre! Točno ste odgovorili na ${correctCount}/${TOTAL_ROUNDS} citata.`;
  btnLeft.style.display    = 'none';
  btnRight.style.display   = 'none';
  btnRestart.style.display = 'inline-block';
  localStorage.removeItem('quizData');
}

function startNewGame() {
  round = 1;
  correctCount = 0;
  updateHeader();
  availableQuotes = [...quizData.quotes];
  btnRestart.style.display = 'none';
  btnLeft.style.display    = btnRight.style.display = 'inline-block';
  nextQuote();
}

async function startGame() {
  gameContainer.style.display = 'flex';
  round = 1;
  correctCount = 0;
  updateHeader();
  quizData = await loadData();
  availableQuotes = [...quizData.quotes];
  nextQuote();
}
