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
const modeMenu    = document.getElementById('mode-menu');
const btnModeQuiz = document.getElementById('btn-mode-quiz');
const btnModeKant = document.getElementById('btn-mode-kant');
const btnModeBack = document.getElementById('btn-mode-back');
const kantGame       = document.getElementById('kant-game');
const btnBackKant    = document.getElementById('btn-back-kant');
const kantQuoteEl    = document.getElementById('kant-quote');
const kantOptions    = Array.from(document.querySelectorAll('.kant-option'));
let kantQuotes       = [];
let currentKant      = null;
let correctWord      = '';

btnModeKant.addEventListener('click', async () => {
  modeMenu.style.display = 'none';
  diffMenu.style.display = creditsScreen.style.display = gameContainer.style.display = 'none';
  quizData = await loadData();
  kantQuotes = quizData.quotes.filter(q => q.philosopherId === '5');
  startKantGame();
});

btnBackKant.addEventListener('click', () => {
  kantGame.style.display = 'none';
  modeMenu.style.display = 'flex';
});

function startKantGame() {
  kantGame.style.display = 'flex';
  generateKantQuestion();
}

function generateKantQuestion() {
  const idx = Math.floor(Math.random() * kantQuotes.length);
  currentKant = kantQuotes[idx];
  const words = currentKant.text.match(/\b\w{5,}\b/g);
  correctWord = words[Math.floor(Math.random() * words.length)];
  const opts = new Set([ correctWord ]);
  while (opts.size < 3) {
    const w = words[Math.floor(Math.random() * words.length)];
    opts.add(w);
  }
  const shuffled = Array.from(opts).sort(() => Math.random() - 0.5);
  const blanked = currentKant.text.replace(new RegExp(`\\b${correctWord}\\b`), '_____');
  kantQuoteEl.textContent = blanked;
  kantOptions.forEach((btn, i) => {
    btn.textContent = shuffled[i];
    btn.onclick = () => handleKantAnswer(shuffled[i]);
  });
}

function handleKantAnswer(chosen) {
  if (chosen === correctWord) {
    alert('Točno!');
  } else {
    alert(`Netočno, točan odgovor je "${correctWord}".`);
  }
  generateKantQuestion();
}

btnStart.addEventListener('click', () => {
  menu.style.display     = 'none';
  modeMenu.style.display = 'flex';
});

btnModeQuiz.addEventListener('click', () => {
  modeMenu.style.display = 'none';
  diffMenu.style.display = 'flex';
});

btnModeBack.addEventListener('click', () => {
  modeMenu.style.display = 'none';
  menu.style.display     = 'flex';
});

btnStart.addEventListener('click', () => {
  menu.style.display     = 'none';
  modeMenu.style.display = 'flex';
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
