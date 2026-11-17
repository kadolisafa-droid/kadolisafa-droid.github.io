(() => {
  'use strict';
  const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  const STORAGE_KEY = 'safa-tictactoe-v3';
  const cells = Array.from(document.querySelectorAll('.cell'));
  const statusBox = document.getElementById('status');
  const statusText = document.getElementById('statusText');
  const turnMark = document.getElementById('turnMark');
  const scoreXEl = document.getElementById('scoreX');
  const scoreOEl = document.getElementById('scoreO');
  const scoreDrawEl = document.getElementById('scoreDraw');
  const scoreCardX = document.getElementById('scoreCardX');
  const scoreCardO = document.getElementById('scoreCardO');
  const soundToggle = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const soundText = document.getElementById('soundText');
  const roundHint = document.getElementById('roundHint');

  let board = Array(9).fill('');
  let currentPlayer = 'X';
  let roundStarter = 'X';
  let nextStarter = 'X';
  let gameOver = false;
  let scores = { X: 0, O: 0, draw: 0 };
  let soundEnabled = true;
  let audioContext = null;

  function loadSavedData() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && saved.scores && Number.isInteger(saved.scores.X) && Number.isInteger(saved.scores.O) && Number.isInteger(saved.scores.draw)) {
        scores = { X: Math.max(0, saved.scores.X), O: Math.max(0, saved.scores.O), draw: Math.max(0, saved.scores.draw) };
      }
      if (saved && (saved.nextStarter === 'X' || saved.nextStarter === 'O')) {
        nextStarter = saved.nextStarter;
        roundStarter = nextStarter;
        currentPlayer = nextStarter;
      }
      if (saved && typeof saved.soundEnabled === 'boolean') soundEnabled = saved.soundEnabled;
    } catch (_) { /* Storage is optional; the game remains playable. */ }
  }
  function saveData() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ scores, nextStarter, soundEnabled })); }
    catch (_) { /* Gameplay does not depend on browser storage. */ }
  }
  function getAudioContext() {
    if (!soundEnabled) return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    return audioContext;
  }
  function tone(frequency, start, duration, type = 'sine', volume = 0.045) {
    const ctx = getAudioContext();
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + start);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
    oscillator.connect(gain); gain.connect(ctx.destination);
    oscillator.start(ctx.currentTime + start); oscillator.stop(ctx.currentTime + start + duration + 0.02);
  }
  function playMoveSound(player) {
    if (player === 'X') { tone(540, 0, .11, 'sine', .035); tone(760, .045, .09, 'sine', .018); }
    else { tone(390, 0, .13, 'triangle', .035); tone(520, .045, .09, 'triangle', .018); }
  }
  function playWinSound() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * .105, .24, 'sine', .045)); }
  function playDrawSound() { tone(440, 0, .16, 'triangle', .035); tone(349.23, .16, .22, 'triangle', .03); }
  function playRestartSound() { tone(660, 0, .07, 'sine', .025); tone(880, .07, .08, 'sine', .025); }
  function updateSoundButton() {
    soundToggle.setAttribute('aria-pressed', String(soundEnabled));
    soundToggle.setAttribute('aria-label', soundEnabled ? 'Mute sound effects' : 'Turn on sound effects');
    soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
    soundText.textContent = soundEnabled ? 'Sound on' : 'Sound off';
  }
  function renderScores() {
    scoreXEl.textContent = scores.X; scoreOEl.textContent = scores.O; scoreDrawEl.textContent = scores.draw;
  }
  function renderStatus(message, result = false) {
    statusText.textContent = message;
    statusBox.classList.toggle('result', result);
    turnMark.style.display = result ? 'none' : 'inline-grid';
    turnMark.textContent = currentPlayer;
    turnMark.className = 'turn-mark ' + (currentPlayer === 'X' ? 'x' : 'o');
    scoreCardX.classList.toggle('active', !gameOver && currentPlayer === 'X');
    scoreCardO.classList.toggle('active', !gameOver && currentPlayer === 'O');
  }
  function renderBoard() {
    const names = ['Top left', 'Top middle', 'Top right', 'Middle left', 'Center', 'Middle right', 'Bottom left', 'Bottom middle', 'Bottom right'];
    cells.forEach((cell, index) => {
      const value = board[index];
      cell.textContent = value === 'X' ? '×' : value === 'O' ? '○' : '';
      cell.classList.toggle('mark-x', value === 'X');
      cell.classList.toggle('mark-o', value === 'O');
      cell.classList.remove('winning');
      cell.disabled = Boolean(value) || gameOver;
      cell.setAttribute('aria-label', names[index] + ', ' + (value ? 'Player ' + value : 'empty'));
    });
  }
  function findWinningLine() {
    for (const line of WIN_LINES) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return line;
    }
    return null;
  }
  function finishRound(winner, winningLine = null) {
    gameOver = true;
    cells.forEach(cell => { cell.disabled = true; });
    if (winner) {
      scores[winner] += 1;
      nextStarter = winner;
      winningLine.forEach(index => cells[index].classList.add('winning'));
      renderStatus('Player ' + winner + ' wins! 🎉', true);
      roundHint.textContent = 'Player ' + winner + ' won and will start the next round.';
      playWinSound();
    } else {
      scores.draw += 1;
      nextStarter = roundStarter === 'X' ? 'O' : 'X';
      renderStatus("It's a draw! 🤝", true);
      roundHint.textContent = 'It was a draw. Player ' + nextStarter + ' will start the next round.';
      playDrawSound();
    }
    renderScores(); saveData();
  }
  function handleCellClick(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index > 8 || gameOver || board[index]) return;
    board[index] = currentPlayer;
    const played = currentPlayer;
    renderBoard(); playMoveSound(played);
    const winningLine = findWinningLine();
    if (winningLine) { finishRound(played, winningLine); return; }
    if (board.every(Boolean)) { finishRound(null); return; }
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    renderStatus("Player " + currentPlayer + "'s turn");
  }
  function startNextRound() {
    const starter = gameOver ? nextStarter : roundStarter;
    board = Array(9).fill(''); roundStarter = starter; nextStarter = starter;
    currentPlayer = starter; gameOver = false;
    renderBoard(); renderStatus("Player " + currentPlayer + "'s turn");
    roundHint.textContent = 'Player ' + roundStarter + ' starts this round.';
    saveData(); playRestartSound();
  }
  function resetScores() {
    scores = { X: 0, O: 0, draw: 0 }; nextStarter = 'X'; roundStarter = 'X';
    currentPlayer = 'X'; board = Array(9).fill(''); gameOver = false;
    renderScores(); renderBoard(); renderStatus("Player X's turn");
    roundHint.textContent = 'Scores reset. Player X starts the new game.';
    saveData(); playRestartSound();
  }
  cells.forEach(cell => cell.addEventListener('click', handleCellClick));
  document.getElementById('nextRound').addEventListener('click', startNextRound);
  document.getElementById('resetScore').addEventListener('click', resetScores);
  soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled; updateSoundButton(); saveData();
    if (soundEnabled) playRestartSound();
  });
  loadSavedData(); renderScores(); renderBoard();
  renderStatus("Player " + currentPlayer + "'s turn");
  roundHint.textContent = 'Player ' + roundStarter + ' starts this round.';
  updateSoundButton();
})();
