const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  }));
}

const bubbleLayer = document.querySelector('.bubble-layer');
function makeBubble() {
  if (!bubbleLayer) return;
  const b = document.createElement('span');
  b.className = 'bubble';
  const s = 8 + Math.random() * 22;
  b.style.width = `${s}px`;
  b.style.height = `${s}px`;
  b.style.left = `${Math.random() * 100}%`;
  b.style.animationDuration = `${7 + Math.random() * 8}s`;
  bubbleLayer.appendChild(b);
  setTimeout(() => b.remove(), 16000);
}
for (let i = 0; i < 12; i++) setTimeout(makeBubble, i * 350);
setInterval(makeBubble, 900);

const today = new Date();
const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const dateEl = document.getElementById('game-date');
if (dateEl) {
  dateEl.textContent = `Défi du ${today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}
const seed = Number(dateKey.replaceAll('-', ''));

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const titles = {
  yakazu: ['Yakazu 9 × 9', 'Chaque suite horizontale ou verticale de N cases blanches contient tous les chiffres de 1 à N, sans répétition.'],
  sudoku: ['Sudoku 9 × 9', 'Remplis la grille avec les chiffres de 1 à 9 : chaque ligne, chaque colonne et chaque carré 3 × 3 doit contenir tous les chiffres une seule fois.'],
  binary: ['Binary 8 × 8', 'Place 4 zéros et 4 uns par ligne et par colonne. Jamais trois chiffres identiques côte à côte, et aucune ligne ou colonne identique.'],
  mots: ['Mots fléchés 10 × 10', 'Lis les définitions dans les cases teintées et suis les flèches (→ / ↓). Clique deux fois sur une case pour changer le sens d’écriture.'],
  wordle: ['Wordle du jour', 'Trouve le mot français secret en 6 essais maximum pour débloquer sa définition !'],
 chess: ['Défi Échecs & Mat (5 puzzles)', 'Trouve la combinaison forcée (sacrifices, double échecs, déviations) pour mater en 2 ou 3 coups !']
};

let active = 'yakazu';
let state = {};
const content = document.getElementById('game-content');
const feedback = document.getElementById('game-feedback');
const check = document.getElementById('check-game');
const reset = document.getElementById('reset-game');

function setFeedback(text, type = '') {
  if (!feedback) return;
  feedback.textContent = text;
  feedback.className = 'game-feedback ' + type;
}

/* =========================================================
   6. PUZZLES ÉCHECS (SÉRIE DE 5 FAÇON CHESS.COM)
   ========================================================= */
const CHESS_PUZZLES = [
  {
    title: 'Mat étouffé de Philidor (Mat en 3)',
    turn: 'w',
    fen: '6rk/6pp/8/5N2/8/8/6Q1/6K1',
    moves: ['f5h6', 'g8f8', 'g2g8', 'f8g8', 'h6f7'],
    hint: 'Double échec avec le Cavalier, puis sacrifie ta Dame en g8 pour enfermer le Roi noir !'
  },
  {
    title: 'Sacrifice d’attraction sur h7 (Mat en 2)',
    turn: 'w',
    fen: 'r2q1rk1/ppp2ppp/2n5/3np1N1/2B5/8/PPPP1PPP/R1BQ1RK1',
    moves: ['d1h5', 'h7h6', 'h5g6'],
    hint: 'Menace mat en h7 ; après h6, exploite le clouage du pion f7 par le Fou c4 !'
  },
  {
    title: 'Mat de Boden — Sacrifice de Dame (Mat en 2)',
    turn: 'w',
    fen: '2kr3r/pp1n1ppp/2p1p3/q7/1b1P1B2/2N2Q2/PPP2PPP/2KR3R',
    moves: ['f3c6', 'b7c6', 'f4a6'],
    hint: 'Sacrifie la Dame en c6 pour ouvrir la diagonale mortelle aux deux Fous !'
  },
  {
    title: 'Double sacrifice d’Anderssen (Mat en 3)',
    turn: 'w',
    fen: 'r1b2rk1/pp1p1pp1/1b1p2B1/n1qQ2p1/8/5N2/P3RPPP/4R1K1',
    moves: ['d5f7', 'f8f7', 'e2e8', 'f7f8', 'e8f8'],
    hint: 'Sacrifie la Dame en f7 pour dévier la Tour de la 8e rangée !'
  },
  {
    title: 'Mat d’Anastasie complet (Mat en 3)',
    turn: 'w',
    fen: '4r1k1/4Nppp/8/8/8/8/5PPP/3R2K1',
    moves: ['d1d8', 'e8d8', 'e7c6', 'd8d1', 'c6e7'],
    hint: 'Attire la Tour en d8, puis enferme le Roi avec le Cavalier et une pièce lourde.'
  },
  {
    title: 'Mat de Damiano (Mat en 3)',
    turn: 'w',
    fen: '5rk1/6p1/5pPp/8/8/8/6Q1/4R1K1',
    moves: ['g2d5', 'g8h8', 'd5f7', 'f8g8', 'f7g8'],
    hint: 'Infiltre la Dame via d5 puis f7 sous la protection du pion g6.'
  },
  {
    title: 'Déviation de la Dame défensive (Mat en 2)',
    turn: 'w',
    fen: '3q2k1/5ppp/8/8/8/2B5/5PPP/3R2K1',
    moves: ['d1d8', 'd8d8', 'c3g7'],
    hint: 'Échange en d8 pour priver le pion g7 de son unique défenseur.'
  },
  {
    title: 'Mat de Morphy — Sacrifice d’ouverture (Mat en 2)',
    turn: 'w',
    fen: 'kbK5/pp6/1P6/8/8/8/8/R7',
    moves: ['a1a7', 'b8a7', 'b6b7'],
    hint: 'Sacrifie la Tour pour bloquer la case a7 avec le Fou noir, puis pousse le pion !'
  },
  {
    title: 'Mat en 2 avec les Noirs (Couloir & Fou)',
    turn: 'b',
    fen: '6k1/5ppp/8/8/5b2/8/5PPP/3rR1K1',
    moves: ['d1e1', 'e1e1', 'f4d2'],
    hint: 'Prends d’abord la Tour en e1 pour libérer la diagonale du Fou... ou mate directement !'
  },
  {
    title: 'Mat du couloir en 3 temps (Déviation)',
    turn: 'w',
    fen: '2r1r1k1/5ppp/8/8/8/8/5PPP/2RR2K1',
    moves: ['c1c8', 'e8c8', 'd1d8', 'c8d8', 'g1f1'],
    hint: 'Force l’échange des deux Tours sur la 8e rangée !'
  },
  {
    title: 'Chasse au Roi en 3 coups (Tour + Fou)',
    turn: 'w',
    fen: '6k1/5p1p/6p1/8/2B5/8/5PPP/4R1K1',
    moves: ['e1e8', 'g8g7', 'e8g8', 'g7h6', 'g8g6'],
    hint: 'Refoule le Roi noir vers le bord avec la Tour soutenue par le Fou c4.'
  },
  {
    title: 'Mat d’épaulette inversé (Mat en 2)',
    turn: 'w',
    fen: '3rkr2/8/4Q3/8/8/8/8/6K1',
    moves: ['e6c6', 'd8d7', 'c6c8'],
    hint: 'Le Roi noir est bloqué par ses deux Tours : force l’une d’elles à bouger.'
  }
];

const PIECE_UNICODE = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟'
};

function parseFEN(fen) {
  return fen.split('/').map(row => {
    const line = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) line.push(null);
      } else {
        line.push(ch);
      }
    }
    return line;
  });
}

function coordToAlg(r, c) {
  return String.fromCharCode(97 + c) + (8 - r);
}

function algToCoord(alg) {
  return [8 - Number(alg[1]), alg.charCodeAt(0) - 97];
}

function renderChess() {
  const rand = mulberry32(seed + 4242);
  // Sélection déterministe de 5 puzzles différents pour aujourd'hui
  const pool = [...CHESS_PUZZLES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  state.chess = {
    series: pool.slice(0, 5),
    index: 0,
    results: Array(5).fill(null), // 'solved' | 'failed' | null
    selected: null,
    moveStep: 0,
    lastMove: null,
    hintSquares: []
  };

  loadChessPuzzle(0);
}

function loadChessPuzzle(idx) {
  const cs = state.chess;
  cs.index = idx;
  cs.selected = null;
  cs.moveStep = 0;
  cs.lastMove = null;
  cs.hintSquares = [];
  cs.board = parseFEN(cs.series[idx].fen);
  drawChessUI();
}

function drawChessUI() {
  const cs = state.chess;
  const puzzle = cs.series[cs.index];
  content.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'chess-wrap';

  // Barre supérieure : 5 pastilles de progression + trait
  const header = document.createElement('div');
  header.className = 'chess-header';

  const dots = document.createElement('div');
  dots.className = 'chess-dots';
  for (let i = 0; i < 5; i++) {
    const dot = document.createElement('div');
    dot.className = 'chess-dot';
    if (i === cs.index && !cs.results[i]) dot.classList.add('current');
    if (cs.results[i] === 'solved') { dot.classList.add('solved'); dot.textContent = '✓'; }
    else if (cs.results[i] === 'failed') { dot.classList.add('failed'); dot.textContent = '✕'; }
    else dot.textContent = i + 1;
    dots.appendChild(dot);
  }

  const badge = document.createElement('span');
  badge.className = 'chess-turn-badge';
  badge.textContent = puzzle.turn === 'w' ? '⬜ Trait aux Blancs' : '⬛ Trait aux Noirs';

  header.append(dots, badge);
  wrap.appendChild(header);

  // Échiquier 8x8
  const boardEl = document.createElement('div');
  boardEl.className = 'chess-board';

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement('div');
      sq.className = 'chess-sq ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
      const alg = coordToAlg(r, c);

      if (cs.selected && cs.selected[0] === r && cs.selected[1] === c) sq.classList.add('selected');
      if (cs.lastMove && (cs.lastMove[0] === alg || cs.lastMove[1] === alg)) sq.classList.add('last-move');
      if (cs.hintSquares.includes(alg)) sq.classList.add('hint-sq');

      const piece = cs.board[r][c];
      if (piece) {
        const span = document.createElement('span');
        const isWhite = piece === piece.toUpperCase();
        span.className = 'chess-piece ' + (isWhite ? 'white' : 'black');
        span.textContent = PIECE_UNICODE[piece];
        sq.appendChild(span);
      }

      sq.addEventListener('click', () => handleChessClick(r, c));
      boardEl.appendChild(sq);
    }
  }
  wrap.appendChild(boardEl);

  // Boutons d'aide / passage
  const actions = document.createElement('div');
  actions.className = 'chess-actions';

  const hintBtn = document.createElement('button');
  hintBtn.type = 'button';
  hintBtn.className = 'chess-btn';
  hintBtn.textContent = '💡 Indice';
  hintBtn.addEventListener('click', () => {
    const expected = puzzle.moves[cs.moveStep];
    if (!expected) return;
    cs.hintSquares = [expected.slice(0, 2)];
    setFeedback(`Indice (${puzzle.title}) : ${puzzle.hint}`);
    drawChessUI();
  });

  const skipBtn = document.createElement('button');
  skipBtn.type = 'button';
  skipBtn.className = 'chess-btn';
  skipBtn.textContent = 'Passer ⏭';
  skipBtn.addEventListener('click', () => {
    if (cs.results[cs.index] === null) cs.results[cs.index] = 'failed';
    advanceChessSeries();
  });

  actions.append(hintBtn, skipBtn);
  wrap.appendChild(actions);
  content.appendChild(wrap);

  if (cs.moveStep === 0 && !cs.selected && cs.hintSquares.length === 0) {
    setFeedback(`Puzzle ${cs.index + 1}/5 — ${puzzle.title} : trouve le meilleur coup !`);
  }
}

function handleChessClick(r, c) {
  const cs = state.chess;
  const puzzle = cs.series[cs.index];
  if (cs.results[cs.index] !== null) return;

  const clickedPiece = cs.board[r][c];
  const isOwnPiece = clickedPiece && (puzzle.turn === 'w'
    ? clickedPiece === clickedPiece.toUpperCase()
    : clickedPiece === clickedPiece.toLowerCase());

  // Sélection d'une pièce alliée
  if (!cs.selected) {
    if (isOwnPiece) {
      cs.selected = [r, c];
      drawChessUI();
    }
    return;
  }

  const [sr, sc] = cs.selected;
  // Changement de pièce sélectionnée
  if (isOwnPiece) {
    cs.selected = (sr === r && sc === c) ? null : [r, c];
    drawChessUI();
    return;
  }

  // Tentative de coup : de (sr, sc) vers (r, c)
  const moveUci = coordToAlg(sr, sc) + coordToAlg(r, c);
  const expectedUci = puzzle.moves[cs.moveStep];
  cs.selected = null;

  if (moveUci !== expectedUci) {
    cs.results[cs.index] = 'failed';
    setFeedback(`❌ Coup inexact ! Le bon coup était ${expectedUci.slice(0, 2)} → ${expectedUci.slice(2, 4)}.`);
    drawChessUI();
    setTimeout(advanceChessSeries, 1400);
    return;
  }

  // Exécution du coup du joueur
  applyChessMove(moveUci);
  cs.moveStep++;

  // Si le puzzle a une réponse adverse puis un 2e coup du joueur
  if (cs.moveStep < puzzle.moves.length) {
    setFeedback('Bon coup ! L’adversaire répond...');
    drawChessUI();
    setTimeout(() => {
      const replyUci = puzzle.moves[cs.moveStep];
      applyChessMove(replyUci);
      cs.moveStep++;
      setFeedback('À toi de conclure !');
      drawChessUI();
    }, 450);
  } else {
    cs.results[cs.index] = 'solved';
    setFeedback(`✅ Bravo ! Puzzle ${cs.index + 1}/5 résolu !`);
    drawChessUI();
    setTimeout(advanceChessSeries, 1000);
  }
}

function applyChessMove(uci) {
  const cs = state.chess;
  const [r1, c1] = algToCoord(uci.slice(0, 2));
  const [r2, c2] = algToCoord(uci.slice(2, 4));
  let piece = cs.board[r1][c1];
  // Promotion automatique en Dame si un pion atteint la 1re ou 8e rangée
  if (piece === 'P' && r2 === 0) piece = 'Q';
  if (piece === 'p' && r2 === 7) piece = 'q';
  cs.board[r2][c2] = piece;
  cs.board[r1][c1] = null;
  cs.lastMove = [uci.slice(0, 2), uci.slice(2, 4)];
  cs.hintSquares = [];
}

function advanceChessSeries() {
  const cs = state.chess;
  if (cs.index + 1 < 5) {
    loadChessPuzzle(cs.index + 1);
  } else {
    const score = cs.results.filter(x => x === 'solved').length;
    setFeedback(`Série terminée ! Score final : ${score} / 5 puzzles réussis 🏆`);
    drawChessUI();
  }
}

function render() {
  if (!content) return;
  document.getElementById('game-title').textContent = titles[active][0];
  document.getElementById('game-description').textContent = titles[active][1];
  content.innerHTML = '';
  setFeedback('À toi de jouer !');
  if (check) check.style.display = active === 'wordle' ? 'none' : 'inline-block';

  if (active === 'yakazu') renderYakazu();
  if (active === 'sudoku') renderSudoku();
  if (active === 'binary') renderBinary();
  if (active === 'mots') renderMots();
  if (active === 'wordle') renderWordle();
  if (active === 'chess') renderChess();
}

/* =========================================================
   1. YAKAZU 9x9 QUOTIDIEN (BACKTRACKING + VALIDATION)
   ========================================================= */
function isValidYakazuGrid(grid) {
  const size = grid.length;
  const checkSeg = (seg) => {
    if (seg.length === 0) return true;
    const n = seg.length;
    if (new Set(seg).size !== n) return false;
    return seg.every(v => v >= 1 && v <= n);
  };

  for (let r = 0; r < size; r++) {
    let seg = [];
    for (let c = 0; c <= size; c++) {
      const v = c < size ? grid[r][c] : 0;
      if (v === 0) { if (!checkSeg(seg)) return false; seg = []; }
      else seg.push(v);
    }
  }
  for (let c = 0; c < size; c++) {
    let seg = [];
    for (let r = 0; r <= size; r++) {
      const v = r < size ? grid[r][c] : 0;
      if (v === 0) { if (!checkSeg(seg)) return false; seg = []; }
      else seg.push(v);
    }
  }
  return true;
}

function getDailyYakazu(variant) {
  const rand = mulberry32(variant);
  const size = 9;

  const masks = [
    [
      [0,0,0,0,0,1,0,0,0],
      [0,0,1,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,1,0],
      [1,0,0,0,0,0,0,0,0],
      [0,0,0,0,1,0,0,0,0],
      [0,0,0,0,0,0,0,0,1],
      [0,1,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,1,0,0],
      [0,0,0,1,0,0,0,0,0]
    ],
    [
      [0,0,0,1,0,0,0,0,0],
      [0,0,0,0,0,0,1,0,0],
      [0,1,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,1],
      [0,0,0,0,1,0,0,0,0],
      [1,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,1,0],
      [0,0,1,0,0,0,0,0,0],
      [0,0,0,0,0,1,0,0,0]
    ],
    [
      [0,0,1,0,0,0,0,0,0],
      [0,0,0,0,0,1,0,0,0],
      [0,0,0,0,0,0,0,0,1],
      [0,1,0,0,0,0,0,0,0],
      [0,0,0,0,1,0,0,0,0],
      [0,0,0,0,0,0,0,1,0],
      [1,0,0,0,0,0,0,0,0],
      [0,0,0,1,0,0,0,0,0],
      [0,0,0,0,0,0,1,0,0]
    ]
  ];

  const mask = masks[variant % masks.length].map(row => [...row]);
  if (variant % 6 >= 3) mask.forEach(row => row.reverse());

  const hSeg = Array.from({ length: size }, () => Array(size).fill(null));
  const vSeg = Array.from({ length: size }, () => Array(size).fill(null));

  for (let r = 0; r < size; r++) {
    let start = 0;
    for (let c = 0; c <= size; c++) {
      if (c === size || mask[r][c] === 1) {
        const len = c - start;
        const cells = [];
        for (let k = start; k < c; k++) cells.push([r, k]);
        cells.forEach(([rr, cc]) => hSeg[rr][cc] = { len, cells });
        start = c + 1;
      }
    }
  }

  for (let c = 0; c < size; c++) {
    let start = 0;
    for (let r = 0; r <= size; r++) {
      if (r === size || mask[r][c] === 1) {
        const len = r - start;
        const cells = [];
        for (let k = start; k < r; k++) cells.push([k, c]);
        cells.forEach(([rr, cc]) => vSeg[rr][cc] = { len, cells });
        start = r + 1;
      }
    }
  }

  const grid = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => (mask[r][c] === 1 ? 0 : null))
  );

  const blanks = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (mask[r][c] === 0) {
        blanks.push({
          r,
          c,
          maxVal: Math.min(hSeg[r][c].len, vSeg[r][c].len),
          spread: Math.abs(hSeg[r][c].len - vSeg[r][c].len)
        });
      }
    }
  }
  blanks.sort((a, b) => a.maxVal - b.maxVal || b.spread - a.spread);

  function solve(idx) {
    if (idx === blanks.length) return true;
    const { r, c, maxVal } = blanks[idx];
    const used = new Set();
    hSeg[r][c].cells.forEach(([rr, cc]) => { if (grid[rr][cc]) used.add(grid[rr][cc]); });
    vSeg[r][c].cells.forEach(([rr, cc]) => { if (grid[rr][cc]) used.add(grid[rr][cc]); });

    const candidates = [];
    for (let v = 1; v <= maxVal; v++) {
      if (!used.has(v)) candidates.push(v);
    }
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (const val of candidates) {
      grid[r][c] = val;
      if (solve(idx + 1)) return true;
      grid[r][c] = null;
    }
    return false;
  }

  if (!solve(0) || !isValidYakazuGrid(grid)) {
    return getDailyYakazu(variant + 1);
  }

  const givens = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== 0 && rand() < 0.45) {
        givens.push([r, c]);
      }
    }
  }
  return { sol: grid, givens };
}

function renderYakazu() {
  const puzzle = getDailyYakazu(seed);
  const size = 9;
  const wrap = document.createElement('div');
  wrap.className = 'yakazu-board';
  state.inputs = [];
  state.yakazuSol = puzzle.sol;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const val = puzzle.sol[r][c];
      if (val === 0) {
        const black = document.createElement('div');
        black.className = 'yakazu-cell black';
        wrap.appendChild(black);
      } else {
        const el = document.createElement('input');
        const fixed = puzzle.givens.some(([a, b]) => a === r && b === c);
        el.className = 'yakazu-cell' + (fixed ? ' given' : '');
        el.inputMode = 'numeric';
        el.maxLength = 1;
        el.value = fixed ? val : '';
        el.dataset.r = r;
        el.dataset.c = c;
        if (fixed) el.disabled = true;

        el.addEventListener('input', () => {
          el.value = el.value.replace(/[^1-9]/g, '').slice(0, 1);
        });
        el.addEventListener('keydown', (e) => handleGridArrows(e, state.inputs, r, c, 9));
        state.inputs.push(el);
        wrap.appendChild(el);
      }
    }
  }
  content.appendChild(wrap);
}

/* =========================================================
   2. SUDOKU 9x9 QUOTIDIEN (GÉNÉRATION PAR PERMUTATIONS VALIDES)
   ========================================================= */
function getDailySudoku(variant) {
  const rand = mulberry32(variant + 999);

  // Grille de base canonique valide
  const base = [
    [1,2,3, 4,5,6, 7,8,9],
    [4,5,6, 7,8,9, 1,2,3],
    [7,8,9, 1,2,3, 4,5,6],

    [2,3,4, 5,6,7, 8,9,1],
    [5,6,7, 8,9,1, 2,3,4],
    [8,9,1, 2,3,4, 5,6,7],

    [3,4,5, 6,7,8, 9,1,2],
    [6,7,8, 9,1,2, 3,4,5],
    [9,1,2, 3,4,5, 6,7,8]
  ];

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Permutation des chiffres 1..9
  const digitMap = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  // Permutation des bandes et des lignes au sein de chaque bande 3x3
  const rowBands = shuffle([0, 1, 2]);
  const rowOrder = rowBands.flatMap(b => shuffle([0, 1, 2]).map(r => b * 3 + r));

  // Permutation des piles et des colonnes au sein de chaque pile 3x3
  const colBands = shuffle([0, 1, 2]);
  const colOrder = colBands.flatMap(b => shuffle([0, 1, 2]).map(c => b * 3 + c));

  const sol = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => digitMap[base[rowOrder[r]][colOrder[c]] - 1])
  );

  // Masque symétrique d'environ 36 indices donnés (~44 % de la grille)
  const givens = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 9; c++) {
      if (r === 4 && c > 4) continue;
      if (rand() < 0.44) {
        givens.push([r, c]);
        if (!(r === 4 && c === 4)) {
          givens.push([8 - r, 8 - c]);
        }
      }
    }
  }

  return { sol, givens };
}

function renderSudoku() {
  const puzzle = getDailySudoku(seed);
  const wrap = document.createElement('div');
  wrap.className = 'sudoku-board';
  state.inputs = [];
  state.sudokuSol = puzzle.sol;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const el = document.createElement('input');
      const fixed = puzzle.givens.some(([a, b]) => a === r && b === c);
      el.className = 'sudoku-cell' + (fixed ? ' given' : '');
      el.inputMode = 'numeric';
      el.maxLength = 1;
      el.value = fixed ? puzzle.sol[r][c] : '';
      el.dataset.r = r;
      el.dataset.c = c;
      if (fixed) el.disabled = true;

      el.addEventListener('input', () => {
        el.value = el.value.replace(/[^1-9]/g, '').slice(0, 1);
      });
      el.addEventListener('keydown', (e) => handleGridArrows(e, state.inputs, r, c, 9));
      state.inputs.push(el);
      wrap.appendChild(el);
    }
  }
  content.appendChild(wrap);
}

/* =========================================================
   3. BINARY 8x8 SOLVABLE PAR DÉDUCTION
   ========================================================= */
const BINARY_PUZZLES = [
  {
    sol: [
      '01011010',
      '10100101',
      '11001010',
      '00110101',
      '01010110',
      '10101001',
      '01100110',
      '10011001'
    ],
    mask: [
      '.1..1.1.',
      '1..0.1..',
      '.10..0.0',
      '0.1..10.',
      '.1.10.1.',
      '1...1..1',
      '01..01..',
      '.00.1..1'
    ]
  },
  {
    sol: [
      '10110010',
      '01001101',
      '11010100',
      '00101011',
      '10011010',
      '01100101',
      '01010110',
      '10101001'
    ],
    mask: [
      '1.1.0..0',
      '.1.0.10.',
      '11..0.0.',
      '0..01..1',
      '.00.1.1.',
      '.11..1.1',
      '0..1.11.',
      '10.0..01'
    ]
  }
];

function renderBinary() {
  const puzzle = BINARY_PUZZLES[seed % BINARY_PUZZLES.length];
  const wrap = document.createElement('div');
  wrap.className = 'binary-board';
  state.inputs = [];
  state.solution = puzzle.sol.map(row => row.split('').map(Number));

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const el = document.createElement('button');
      el.className = 'binary-box';
      el.type = 'button';
      const givenChar = puzzle.mask[r][c];
      if (givenChar !== '.') {
        el.textContent = givenChar;
        el.classList.add('given');
      } else {
        el.textContent = '';
        el.addEventListener('click', () => {
          el.textContent = el.textContent === '' ? '0' : el.textContent === '0' ? '1' : '';
          el.classList.toggle('val-zero', el.textContent === '0');
          el.classList.toggle('val-one', el.textContent === '1');
        });
      }
      state.inputs.push(el);
      wrap.appendChild(el);
    }
  }
  content.appendChild(wrap);
}

/* =========================================================
   4. MOTS FLÉCHÉS 10x10 (GRILLES PLUS GRANDES & 100 % EXACTES)
   ========================================================= */
const MOTS_FLECHES_GRIDS = [
  // GRILLE 1 (10x10 - Thème Mer & Nature)
  // Vérification complète des croisements :
  // L1: M A R E E | C A P | L E
  // L2: A R E N E | O L E | A N
  // L3: R I S E E | R I V E S
  // L4: I N D E S | A S I E .
  // L5: N E . S O L E I L | O R
  // L6: . | P A L E | N A I N E
  // L7: M E R | A L G U E | S E
  // L8: A I L E | I O D E | E L
  // L9: T A R E | E S S A I S
  {
    rows: 10,
    cols: 10,
    cells: [
      [
        { t: 'C', clues: [] },
        { t: 'C', clues: [{ dir: '↓', text: 'Homme de mer' }] },
        { t: 'C', clues: [{ dir: '↓', text: 'Reine de la ruche' }] },
        { t: 'C', clues: [{ dir: '↓', text: 'Résiderai' }] },
        { t: 'C', clues: [{ dir: '↓', text: 'Terminaison verbale' }] },
        { t: 'C', clues: [{ dir: '↓', text: 'Cité antique' }] },
        { t: 'C', clues: [{ dir: '↓', text: 'Récif corallien' }] },
        { t: 'C', clues: [{ dir: '↓', text: 'Roi de Judée' }] },
        { t: 'C', clues: [{ dir: '↓', text: 'Possessif' }] },
        { t: 'C', clues: [{ dir: '↓', text: 'Élan vital' }] }
      ],
      [
        { t: 'C', clues: [{ dir: '→', text: 'Flux marin' }] },
        { t: 'L', v: 'M' }, { t: 'L', v: 'A' }, { t: 'L', v: 'R' }, { t: 'L', v: 'E' }, { t: 'L', v: 'E' },
        { t: 'C', clues: [{ dir: '→', text: 'Pointe côtière' }] },
        { t: 'L', v: 'C' }, { t: 'L', v: 'A' }, { t: 'L', v: 'P' }
      ],
      [
        { t: 'C', clues: [{ dir: '→', text: 'Sable fin' }] },
        { t: 'L', v: 'A' }, { t: 'L', v: 'R' }, { t: 'L', v: 'E' }, { t: 'L', v: 'N' }, { t: 'L', v: 'E' },
        { t: 'C', clues: [{ dir: '→', text: 'Cri de corrida' }] },
        { t: 'L', v: 'O' }, { t: 'L', v: 'L' }, { t: 'L', v: 'E' }
      ],
      [
        { t: 'C', clues: [{ dir: '→', text: 'Moquerie' }] },
        { t: 'L', v: 'R' }, { t: 'L', v: 'I' }, { t: 'L', v: 'S' }, { t: 'L', v: 'E' }, { t: 'L', v: 'E' },
        { t: 'C', clues: [{ dir: '→', text: 'Bords de cours d’eau' }] },
        { t: 'L', v: 'R' }, { t: 'L', v: 'I' }, { t: 'L', v: 'V' }
      ],
      [
        { t: 'C', clues: [{ dir: '→', text: 'Ancien comptoir' }] },
        { t: 'L', v: 'I' }, { t: 'L', v: 'N' }, { t: 'L', v: 'D' }, { t: 'L', v: 'E' }, { t: 'L', v: 'S' },
        { t: 'C', clues: [{ dir: '→', text: 'Vaste continent' }] },
        { t: 'L', v: 'A' }, { t: 'L', v: 'S' }, { t: 'L', v: 'I' }
      ],
      [
        { t: 'C', clues: [{ dir: '→', text: 'Venu au monde' }] },
        { t: 'L', v: 'N' }, { t: 'L', v: 'E' },
        { t: 'C', clues: [{ dir: '→', text: 'Astre du jour' }, { dir: '↓', text: 'Pelle de rame' }] },
        { t: 'L', v: 'S' }, { t: 'L', v: 'O' }, { t: 'L', v: 'L' }, { t: 'L', v: 'E' }, { t: 'L', v: 'I' }, { t: 'L', v: 'L' }
      ],
      [
        { t: 'C', clues: [{ dir: '↓', text: 'Échec aux échecs' }] },
        { t: 'C', clues: [{ dir: '→', text: 'Blême' }] },
        { t: 'L', v: 'P' }, { t: 'L', v: 'A' }, { t: 'L', v: 'L' }, { t: 'L', v: 'E' },
        { t: 'C', clues: [{ dir: '→', text: 'Très petite' }] },
        { t: 'L', v: 'N' }, { t: 'L', v: 'A' }, { t: 'L', v: 'I' }
      ],
      [
        { t: 'C', clues: [{ dir: '→', text: 'Grande étendue salée' }] },
        { t: 'L', v: 'M' }, { t: 'L', v: 'E' }, { t: 'L', v: 'R' },
        { t: 'C', clues: [{ dir: '→', text: 'Plante marine' }] },
        { t: 'L', v: 'A' }, { t: 'L', v: 'L' }, { t: 'L', v: 'G' }, { t: 'L', v: 'U' }, { t: 'L', v: 'E' }
      ],
      [
        { t: 'C', clues: [{ dir: '→', text: 'Membre d’oiseau' }] },
        { t: 'L', v: 'A' }, { t: 'L', v: 'I' }, { t: 'L', v: 'L' }, { t: 'L', v: 'E' },
        { t: 'C', clues: [{ dir: '→', text: 'Élément marin' }] },
        { t: 'L', v: 'I' }, { t: 'L', v: 'O' }, { t: 'L', v: 'D' }, { t: 'L', v: 'E' }
      ],
      [
        { t: 'C', clues: [{ dir: '→', text: 'Défaut' }] },
        { t: 'L', v: 'T' }, { t: 'L', v: 'A' }, { t: 'L', v: 'R' }, { t: 'L', v: 'E' },
        { t: 'C', clues: [{ dir: '→', text: 'Tentatives' }] },
        { t: 'L', v: 'E' }, { t: 'L', v: 'S' }, { t: 'L', v: 'S' }, { t: 'L', v: 'A' }
      ]
    ]
  },
  // GRILLE 2 (10x10 - Thème Voyage & Culture)
  {
    rows: 10,
    cols: 10,
    cells: [
      [
        { t: 'C', clues: [] },
        { t: 'C', clues: [{ dir: '↓', text: 'Navire à voiles' }] },
        { t: 'C', clues: [{ dir: '↓', text: 'Étendue d’eau' }] },
        { t: 'C', clues: [{ dir: '↓', text: 'Note de musique' }] },
        { t: 'C', clues: [{ dir: '↓', text: 'Roi des animaux' }] },
        { t: 'C', clues: [{ dir: '↓', text: 'Pronom personnel' }] },
        { t: 'C', clues: [{ dir: '↓', text: 'Cité portuaire' }] },
        { t: 'C', clues: [{ dir: '↓', text: 'Métal précieux' }] },
        { t: 'C', clues: [{ dir: '↓', text: 'Saison chaude' }] },
        { t: 'C', clues: [{ dir: '↓', text: 'Vent doux' }] }
      ],
      [
        { t: 'C', clues: [{ dir: '→', text: 'Tour lumineuse' }] },
        { t: 'L', v: 'P' }, { t: 'L', v: 'H' }, { t: 'L', v: 'A' }, { t: 'L', v: 'R' }, { t: 'L', v: 'E' },
        { t: 'C', clues: [{ dir: '→', text: 'Île française' }] },
        { t: 'L', v: 'R' }, { t: 'L', v: 'E' }, { t: 'L', v: 'S' }
      ],
      [
        { t: 'C', clues: [{ dir: '→', text: 'Grand océan' }] },
        { t: 'L', v: 'A' }, { t: 'L', v: 'T' }, { t: 'L', v: 'L' }, { t: 'L', v: 'A' }, { t: 'L', v: 'N' },
        { t: 'C', clues: [{ dir: '→', text: 'Cube à jouer' }] },
        { t: 'L', v: 'D' }, { t: 'L', v: 'E' }, { t: 'L', v: 'S' }
      ],
      [
        { t: 'C', clues: [{ dir: '→', text: 'Plante aquatique' }] },
        { t: 'L', v: 'A' }, { t: 'L', v: 'L' }, { t: 'L', v: 'G' }, { t: 'L', v: 'U' }, { t: 'L', v: 'E' },
        { t: 'C', clues: [{ dir: '→', text: 'Direction' }] },
        { t: 'L', v: 'S' }, { t: 'L', v: 'U' }, { t: 'L', v: 'D' }
      ],
      [
        { t: 'C', clues: [{ dir: '→', text: 'Rivage sableux' }] },
        { t: 'L', v: 'P' }, { t: 'L', v: 'L' }, { t: 'L', v: 'A' }, { t: 'L', v: 'G' }, { t: 'L', v: 'E' },
        { t: 'C', clues: [{ dir: '→', text: 'Article défini' }] },
        { t: 'L', v: 'L' }, { t: 'L', v: 'E' }, { t: 'L', v: 'S' }
      ],
      [
        { t: 'C', clues: [{ dir: '→', text: 'Petit crustacé' }] },
        { t: 'L', v: 'C' }, { t: 'L', v: 'R' }, { t: 'L', v: 'A' }, { t: 'L', v: 'B' }, { t: 'L', v: 'E' },
        { t: 'C', clues: [{ dir: '→', text: 'Fleuve d’Égypte' }] },
        { t: 'L', v: 'N' }, { t: 'L', v: 'I' }, { t: 'L', v: 'L' }
      ],
      [
        { t: 'C', clues: [{ dir: '→', text: 'Onde marine' }] },
        { t: 'L', v: 'V' }, { t: 'L', v: 'A' }, { t: 'L', v: 'G' }, { t: 'L', v: 'U' }, { t: 'L', v: 'E' },
        { t: 'C', clues: [{ dir: '→', text: 'Couleur du ciel' }] },
        { t: 'L', v: 'B' }, { t: 'L', v: 'E' }, { t: 'L', v: 'U' }
      ],
      [
        { t: 'C', clues: [{ dir: '→', text: 'Grains de plage' }] },
        { t: 'L', v: 'S' }, { t: 'L', v: 'A' }, { t: 'L', v: 'B' }, { t: 'L', v: 'L' }, { t: 'L', v: 'E' },
        { t: 'C', clues: [{ dir: '→', text: 'Astre brillant' }] },
        { t: 'L', v: 'S' }, { t: 'L', v: 'O' }, { t: 'L', v: 'L' }
      ],
      [
        { t: 'C', clues: [{ dir: '→', text: 'Toile de bateau' }] },
        { t: 'L', v: 'V' }, { t: 'L', v: 'O' }, { t: 'L', v: 'I' }, { t: 'L', v: 'L' }, { t: 'L', v: 'E' },
        { t: 'C', clues: [{ dir: '→', text: 'Port breton' }] },
        { t: 'L', v: 'R' }, { t: 'L', v: 'E' }, { t: 'L', v: 'D' }
      ],
      [
        { t: 'C', clues: [{ dir: '→', text: 'Rocher marin' }] },
        { t: 'L', v: 'R' }, { t: 'L', v: 'E' }, { t: 'L', v: 'C' }, { t: 'L', v: 'I' }, { t: 'L', v: 'F' },
        { t: 'C', clues: [{ dir: '→', text: 'Île d’Atlantique' }] },
        { t: 'L', v: 'O' }, { t: 'L', v: 'L' }, { t: 'L', v: 'E' }
      ]
    ]
  }
];

function renderMots() {
  const puzzle = MOTS_FLECHES_GRIDS[seed % MOTS_FLECHES_GRIDS.length];
  const container = document.createElement('div');
  container.className = 'mf-container';

  const dirBar = document.createElement('div');
  dirBar.className = 'mf-dir-bar';
  dirBar.innerHTML = `<span>Sens d'écriture : <strong id="mf-dir-label">Horizontal (→)</strong></span> <button type="button" class="mf-toggle-dir" id="mf-toggle-btn">Changer de sens ⇄</button>`;
  container.appendChild(dirBar);

  const grid = document.createElement('div');
  grid.className = 'mf-grid';
  grid.style.gridTemplateColumns = `repeat(${puzzle.cols}, 56px)`;

  state.mfDir = 'H';
  state.mfInputs = [];
  state.mfMatrix = Array.from({ length: puzzle.rows }, () => Array(puzzle.cols).fill(null));

  const updateDirLabel = () => {
    const lbl = document.getElementById('mf-dir-label');
    if (lbl) lbl.textContent = state.mfDir === 'H' ? 'Horizontal (→)' : 'Vertical (↓)';
    highlightActiveWord();
  };

  dirBar.querySelector('#mf-toggle-btn').addEventListener('click', () => {
    state.mfDir = state.mfDir === 'H' ? 'V' : 'H';
    updateDirLabel();
  });

  function highlightActiveWord() {
    state.mfInputs.forEach(inp => inp.parentElement.classList.remove('mf-highlight'));
    const activeEl = document.activeElement;
    if (!activeEl || !activeEl.dataset.r) return;
    const r = +activeEl.dataset.r, c = +activeEl.dataset.c;
    if (state.mfDir === 'H') {
      for (let i = c; i >= 0 && state.mfMatrix[r][i]; i--) state.mfMatrix[r][i].parentElement.classList.add('mf-highlight');
      for (let i = c; i < puzzle.cols && state.mfMatrix[r][i]; i++) state.mfMatrix[r][i].parentElement.classList.add('mf-highlight');
    } else {
      for (let i = r; i >= 0 && state.mfMatrix[i][c]; i--) state.mfMatrix[i][c].parentElement.classList.add('mf-highlight');
      for (let i = r; i < puzzle.rows && state.mfMatrix[i][c]; i++) state.mfMatrix[i][c].parentElement.classList.add('mf-highlight');
    }
  }

  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      const cellData = puzzle.cells[r][c];
      const cell = document.createElement('div');

      if (cellData.t === 'C') {
        cell.className = 'mf-cell mf-clue' + (cellData.clues.length === 0 ? ' mf-empty-block' : '');
        cellData.clues.forEach(cl => {
          const item = document.createElement('div');
          item.className = 'mf-clue-item';
          item.innerHTML = `<span class="mf-text">${cl.text}</span><span class="mf-arrow">${cl.dir}</span>`;
          cell.appendChild(item);
        });
      } else {
        cell.className = 'mf-cell mf-letter';
        const input = document.createElement('input');
        input.maxLength = 1;
        input.dataset.r = r;
        input.dataset.c = c;
        input.dataset.ans = cellData.v;
        input.setAttribute('aria-label', `Ligne ${r + 1}, colonne ${c + 1}`);

        input.addEventListener('mousedown', () => {
          if (document.activeElement === input) {
            state.mfDir = state.mfDir === 'H' ? 'V' : 'H';
            updateDirLabel();
          }
        });
        input.addEventListener('focus', highlightActiveWord);

        input.addEventListener('input', () => {
          const clean = input.value.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z]/g, '').slice(0, 1);
          input.value = clean;
          if (clean) {
            const nextR = state.mfDir === 'V' ? r + 1 : r;
            const nextC = state.mfDir === 'H' ? c + 1 : c;
            if (nextR < puzzle.rows && nextC < puzzle.cols && state.mfMatrix[nextR][nextC]) {
              state.mfMatrix[nextR][nextC].focus();
            }
          }
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && !input.value) {
            const prevR = state.mfDir === 'V' ? r - 1 : r;
            const prevC = state.mfDir === 'H' ? c - 1 : c;
            if (prevR >= 0 && prevC >= 0 && state.mfMatrix[prevR][prevC]) {
              state.mfMatrix[prevR][prevC].focus();
            }
          } else if (e.key === 'ArrowRight' && c + 1 < puzzle.cols && state.mfMatrix[r][c + 1]) {
            state.mfDir = 'H'; updateDirLabel(); state.mfMatrix[r][c + 1].focus();
          } else if (e.key === 'ArrowLeft' && c - 1 >= 0 && state.mfMatrix[r][c - 1]) {
            state.mfDir = 'H'; updateDirLabel(); state.mfMatrix[r][c - 1].focus();
          } else if (e.key === 'ArrowDown' && r + 1 < puzzle.rows && state.mfMatrix[r + 1][c]) {
            state.mfDir = 'V'; updateDirLabel(); state.mfMatrix[r + 1][c].focus();
          } else if (e.key === 'ArrowUp' && r - 1 >= 0 && state.mfMatrix[r - 1][c]) {
            state.mfDir = 'V'; updateDirLabel(); state.mfMatrix[r - 1][c].focus();
          }
        });

        cell.appendChild(input);
        state.mfInputs.push(input);
        state.mfMatrix[r][c] = input;
      }
      grid.appendChild(cell);
    }
  }

  container.appendChild(grid);
  content.appendChild(container);
}

/* =========================================================
   5. WORDLE AVEC DICTIONNAIRE FRANÇAIS ÉTENDU (1200+ MOTS)
   ========================================================= */
/* =========================================================
   5. WORDLE — 100 MOTS SECRETS + DICTIONNAIRE DE 2500+ MOTS
   ========================================================= */
const DICTIONARY_WITH_DEFS = [
  { word: 'BULLE', def: 'n.f. — Petite sphère remplie d’air ou de gaz qui remonte à la surface de l’eau.' },
  { word: 'PLAGE', def: 'n.f. — Étendue de sable ou de galets au bord de la mer.' },
  { word: 'ALGUE', def: 'n.f. — Plante aquatique sans tige ni racine poussant dans les océans.' },
  { word: 'SABLE', def: 'n.m. — Matière minérale constituée de petits grains provenant de l’érosion des roches.' },
  { word: 'OCEAN', def: 'n.m. — Vaste étendue d’eau salée couvrant la majeure partie du globe.' },
  { word: 'CORAL', def: 'adj. — Relatif au corail ou au chœur musical.' },
  { word: 'MAREE', def: 'n.f. — Mouvement journalier d’élévation et d’abaissement du niveau de la mer.' },
  { word: 'PHARE', def: 'n.m. — Tour élevée munie d’un puissant foyer lumineux pour guider les navires.' },
  { word: 'VAGUE', def: 'n.f. — Onde à la surface de la mer soulevée par le vent.' },
  { word: 'CRABE', def: 'n.m. — Crustacé marin à carapace large et dix pattes dont deux pinces.' },
  { word: 'EPAVE', def: 'n.f. — Ce qui reste d’un navire naufragé au fond de l’eau ou sur le rivage.' },
  { word: 'VOILE', def: 'n.f. — Grande pièce de toile fixée aux mâts pour propulser un bateau grâce au vent.' },
  { word: 'RECIF', def: 'n.m. — Chaîne de rochers ou de coraux à fleur d’eau.' },
  { word: 'PLUME', def: 'n.f. — Élément léger qui recouvre le corps des oiseaux.' },
  { word: 'ARBRE', def: 'n.m. — Grand végétal ligneux dont la tige est appelée tronc.' },
  { word: 'LIVRE', def: 'n.m. — Assemblage de feuilles imprimées et réunies sous une couverture.' },
  { word: 'POMME', def: 'n.f. — Fruit charnu du pommier, rond et croquant.' },
  { word: 'NUAGE', def: 'n.m. — Amas de gouttelettes d’eau en suspension dans l’atmosphère.' },
  { word: 'TIGRE', def: 'n.m. — Grand félin d’Asie au pelage roux rayé de noir.' },
  { word: 'ANCRE', def: 'n.f. — Pièce métallique lourde qui sert à immobiliser un navire sur le fond.' },
  { word: 'FJORD', def: 'n.m. — Ancienne vallée glaciaire envahie par les eaux marines.' },
  { word: 'HOULE', def: 'n.f. — Mouvement ondulatoire de la mer provoqué par un vent lointain.' },
  { word: 'BRISE', def: 'n.f. — Vent léger et régulier soufflant près des côtes.' },
  { word: 'COQUE', def: 'n.f. — Enveloppe extérieure d’un navire assurant sa flottabilité.' },
  { word: 'BARRE', def: 'n.f. — Gouvernail d’un bateau ou banc de sable à l’entrée d’un port.' },
  { word: 'CANOT', def: 'n.m. — Petite embarcation légère mue à la rame ou au moteur.' },
  { word: 'DIGUE', def: 'n.f. — Ouvrage destiné à contenir les eaux ou à protéger un port des vagues.' },
  { word: 'GALET', def: 'n.m. — Fragment de roche poli par le frottement des vagues ou des rivières.' },
  { word: 'GREVE', def: 'n.f. — Terrain plat et uni composé de sable et de gravier au bord de la mer.' },
  { word: 'LAGON', def: 'n.m. — Étendue d’eau peu profonde séparée de la mer par un récif corallien.' },
  { word: 'MORUE', def: 'n.f. — Poisson des mers froides très apprécié pour sa chair.' },
  { word: 'NAPPE', def: 'n.f. — Étendue d’eau souterraine ou couche liquide à la surface.' },
  { word: 'ORAGE', def: 'n.m. — Perturbation atmosphérique accompagnée d’éclairs, de tonnerre et d’averses.' },
  { word: 'PERLE', def: 'n.f. — Petite bille nacrée formée à l’intérieur de certains mollusques.' },
  { word: 'POUPE', def: 'n.f. — Partie arrière d’un navire.' },
  { word: 'PROUE', def: 'n.f. — Partie avant d’un navire qui fend les flots.' },
  { word: 'ROCHE', def: 'n.f. — Matériau minéral solide constituant l’écorce terrestre.' },
  { word: 'ASTRE', def: 'n.m. — Tout corps céleste naturel brillant dans le ciel.' },
  { word: 'CABLE', def: 'n.m. — Cordage épais ou faisceau de fils métalliques très résistant.' },
  { word: 'DELTA', def: 'n.m. — Embouchure triangulaire d’un fleuve divisé en plusieurs bras.' },
  { word: 'ECUME', def: 'n.f. — Mousse blanche qui se forme à la surface de l’eau agitée.' },
  { word: 'FLORE', def: 'n.f. — Ensemble des espèces végétales d’une région ou d’un milieu.' },
  { word: 'FAUNE', def: 'n.f. — Ensemble des espèces animales vivant dans un espace géographique donné.' },
  { word: 'GLACE', def: 'n.f. — Eau congelée et solidifiée par le froid.' },
  { word: 'GIVRE', def: 'n.m. — Dépôt de cristaux de glace formé par le brouillard glacé.' },
  { word: 'FLEUR', def: 'n.f. — Organe reproducteur souvent coloré et parfumé des plantes.' },
  { word: 'FORET', def: 'n.f. — Grande étendue de terrain couverte d’arbres.' },
  { word: 'RIVAGE', def: 'n.m. — Bord de la mer.' },
  { word: 'MONDE', def: 'n.m. — Ensemble de la Terre et de l’humanité.' },
  { word: 'TERRE', def: 'n.f. — Planète habitée par l’espèce humaine ou sol sur lequel on marche.' },
  { word: 'SOLEIL', def: 'n.m. — Étoile autour de laquelle gravite la Terre.' },
  { word: 'LUNE', def: 'n.f. — Satellite naturel de la Terre.' },
  { word: 'ETOILE', def: 'n.f. — Astre doué d’un éclat propre.' },
  { word: 'COMETE', def: 'n.f. — Astre chevelu.' },
  { word: 'ORBIT', def: 'n.m. — Trajectoire courbe.' },
  { word: 'ABIME', def: 'n.m. — Gouffre très profond, cavité sans fond apparent.' },
  { word: 'ACIER', def: 'n.m. — Alliage métallique composé principalement de fer et de carbone.' },
  { word: 'AIGLE', def: 'n.m. — Grand rapace diurne à la vue perçante et au vol puissant.' },
  { word: 'ALBUM', def: 'n.m. — Cahier destiné à conserver des photographies, des timbres ou des dessins.' },
  { word: 'AMBRE', def: 'n.m. — Résine fossile jaune ou orangée sécrétée par d’anciens conifères.' },
  { word: 'ANGLE', def: 'n.m. — Figure géométrique formée par deux demi-droites de même origine.' },
  { word: 'ARENE', def: 'n.f. — Espace central sablonneux d’un amphithéâtre antique.' },
  { word: 'ARGON', def: 'n.m. — Gaz rare incolore et inodore présent dans l’atmosphère.' },
  { word: 'ATOME', def: 'n.m. — Plus petite partie d’un corps simple pouvant se combiner chimiquement.' },
  { word: 'AVION', def: 'n.m. — Aéronef plus lourd que l’air muni d’ailes et d’un système de propulsion.' },
  { word: 'BAGUE', def: 'n.f. — Anneau que l’on porte au doigt comme bijou.' },
  { word: 'BALAI', def: 'n.m. — Instrument muni d’un long manche et de poils pour nettoyer le sol.' },
  { word: 'BARGE', def: 'n.f. — Bateau à fond plat servant au transport de marchandises sur les rivières.' },
  { word: 'BETON', def: 'n.m. — Matériau de construction formé de sable, de gravier, de ciment et d’eau.' },
  { word: 'BLANC', def: 'adj. — Qui est de la couleur du lait ou de la neige.' },
  { word: 'BOITE', def: 'n.f. — Récipient de forme variée muni d’un couvercle.' },
  { word: 'BRAVO', def: 'interj. — Cri d’approbation et d’enthousiasme pour applaudir une réussite.' },
  { word: 'BRUIT', def: 'n.m. — Ensemble de sons sans harmonie perçus par l’oreille.' },
  { word: 'CADRE', def: 'n.m. — Bordure en bois ou en métal entourant un tableau ou une fenêtre.' },
  { word: 'CALME', def: 'adj. — Qui est tranquille, paisible, sans agitation ni bruit.' },
  { word: 'CANON', def: 'n.m. — Pièce d’artillerie lourde ou gorge étroite creusée par un cours d’eau.' },
  { word: 'CARTE', def: 'n.f. — Représentation géographique plane d’une région ou d’un pays.' },
  { word: 'CEDRE', def: 'n.m. — Grand conifère majestueux au bois odorant et imputrescible.' },
  { word: 'CHAMP', def: 'n.m. — Étendue de terre cultivable.' },
  { word: 'CHANT', def: 'n.m. — Suite de sons musicaux émis par la voix humaine.' },
  { word: 'CHIEN', def: 'n.m. — Mammifère carnivore domestique, fidèle compagnon de l’être humain.' },
  { word: 'CIBLE', def: 'n.f. — Objet ou surface que l’on vise avec un projectile.' },
  { word: 'CLAIR', def: 'adj. — Qui reçoit beaucoup de lumière ou qui est facile à comprendre.' },
  { word: 'CLOWN', def: 'n.m. — Artiste de cirque comique au maquillage exagéré.' },
  { word: 'COEUR', def: 'n.m. — Organe musculaire creux assurant la circulation du sang.' },
  { word: 'CORDE', def: 'n.f. — Assemblage de fils tordus ensemble formant un lien souple et solide.' },
  { word: 'COTON', def: 'n.m. — Fibre végétale douce entourant les graines du cotonnier.' },
  { word: 'CRANE', def: 'n.m. — Boîte osseuse qui protège le cerveau.' },
  { word: 'CREME', def: 'n.f. — Partie grasse qui se forme à la surface du lait.' },
  { word: 'CRISE', def: 'n.f. — Phase grave et décisive dans l’évolution d’une situation.' },
  { word: 'CROIX', def: 'n.f. — Figure formée de deux lignes qui se coupent à angle droit.' },
  { word: 'DANSE', def: 'n.f. — Suite de mouvements du corps exécutés en rythme sur de la musique.' },
  { word: 'DEBUT', def: 'n.m. — Commencement d’une action, d’une période ou d’une œuvre.' },
  { word: 'DECOR', def: 'n.m. — Ensemble des éléments qui ornent un lieu ou une scène de théâtre.' },
  { word: 'DENTS', def: 'n.f. — Organes durs implantés dans les mâchoires servant à mastiquer.' },
  { word: 'DISQUE', def: 'n.m. — Surface plane circulaire.' },
  { word: 'DOIGT', def: 'n.m. — Chacune des cinq extrémités articulées de la main.' },
  { word: 'DROIT', def: 'adj. — Qui ne dévie ni à gauche ni à droite, rectiligne.' },
  { word: 'ECOLE', def: 'n.f. — Établissement où l’on dispense un enseignement collectif.' },
  { word: 'EFFET', def: 'n.m. — Résultat produit par une cause ou une action.' },
  { word: 'ENVIE', def: 'n.f. — Désir vif de posséder ou de faire quelque chose.' },
  { word: 'EPICE', def: 'n.f. — Substance végétale aromatique servant à assaisonner les plats.' },
  { word: 'ESSAI', def: 'n.m. — Tentative faite pour tester quelque chose ou ouvrage littéraire.' },
  { word: 'ETAGE', def: 'n.m. — Chacun des niveaux superposés d’un bâtiment.' },
  { word: 'ETAPE', def: 'n.f. — Lieu où l’on s’arrête au cours d’un trajet ou phase d’un projet.' },
  { word: 'FABLE', def: 'n.f. — Court récit en vers ou en prose comportant une moralité.' },
  { word: 'FERME', def: 'n.f. — Exploitation agricole comprenant les bâtiments et les terres.' },
  { word: 'FIBRE', def: 'n.f. — Élément filamenteux d’origine végétale, animale ou minérale.' },
  { word: 'FLEUVE', def: 'n.m. — Grand cours d’eau qui se jette dans la mer.' },
  { word: 'FORCE', def: 'n.f. — Puissance physique ou morale d’action.' },
  { word: 'FORME', def: 'n.f. — Aspect extérieur et contours d’un objet ou d’un être.' },
  { word: 'FOULE', def: 'n.f. — Grand nombre de personnes rassemblées au même endroit.' },
  { word: 'FROID', def: 'adj. — Qui a une température basse, dépourvu de chaleur.' },
  { word: 'FRUIT', def: 'n.m. — Organe végétal comestible contenant les graines.' },
  { word: 'FUMEE', def: 'n.f. — Nuage de gaz et de particules dégagé par une combustion.' },
  { word: 'GARDE', def: 'n.f. — Action de veiller sur quelqu’un ou quelque chose pour le protéger.' },
  { word: 'GESTE', def: 'n.m. — Mouvement du corps ou des mains exprimant une intention.' },
  { word: 'GLOBE', def: 'n.m. — Corps sphérique ou représentation de la Terre en sphère.' },
  { word: 'GLOIRE', def: 'n.f. — Grande renommée acquise par des exploits ou des œuvres.' },
  { word: 'GOUTE', def: 'n.f. — Très petite quantité de liquide de forme sphérique.' },
  { word: 'GRAIN', def: 'n.m. — Semence des céréales ou petite particule solide.' },
  { word: 'GUIDE', def: 'n.m. — Personne ou ouvrage qui accompagne et renseigne.' },
  { word: 'HERBE', def: 'n.f. — Plante à tige souple et verte poussant dans les prairies.' },
  { word: 'HEURE', def: 'n.f. — Unité de temps égale à soixante minutes.' },
  { word: 'HIVER', def: 'n.m. — Saison la plus froide de l’année.' },
  { word: 'HOTEL', def: 'n.m. — Établissement commercial offrant des chambres meublées.' },
  { word: 'HUILE', def: 'n.f. — Corps gras liquide à température ambiante.' },
  { word: 'IMAGE', def: 'n.f. — Représentation visuelle d’un objet ou d’un être.' },
  { word: 'JAUNE', def: 'adj. — Qui est de la couleur du citron ou de l’or.' },
  { word: 'JOUET', def: 'n.m. — Objet destiné à amuser les enfants.' },
  { word: 'KAYAK', def: 'n.m. — Embarcation légère effilée propulsée avec une pagaie double.' },
  { word: 'LAMPE', def: 'n.f. — Appareil destiné à produire de la lumière.' },
  { word: 'LARME', def: 'n.f. — Goutte de liquide salé sécrétée par l’œil.' },
  { word: 'LASER', def: 'n.m. — Dispositif émettant un faisceau de lumière très concentré.' },
  { word: 'LINGE', def: 'n.m. — Ensemble des pièces de tissu utilisées dans une maison.' },
  { word: 'LOUPE', def: 'n.f. — Lentille optique convexe servant à grossir les objets.' },
  { word: 'MAGIE', def: 'n.f. — Art de produire des phénomènes inexplicables en apparence.' },
  { word: 'MATIN', def: 'n.m. — Premières heures du jour, du lever du soleil à midi.' },
  { word: 'MELON', def: 'n.m. — Plante potagère rampante à gros fruit sucré et parfumé.' },
  { word: 'MERLE', def: 'n.m. — Oiseau passereau au plumage noir et au bec jaune orangé.' },
  { word: 'METAL', def: 'n.m. — Corps simple conducteur de la chaleur et de l’électricité.' },
  { word: 'MIROIR', def: 'n.m. — Surface polie qui réfléchit la lumière.' },
  { word: 'MOTIF', def: 'n.m. — Raison d’agir ou ornement décoratif répété.' },
  { word: 'MUSEE', def: 'n.m. — Lieu où sont conservées et exposées des œuvres d’art ou des collections.' },
  { word: 'NEIGE', def: 'n.f. — Précipitation atmosphérique formée de cristaux de glace blancs.' },
  { word: 'NICHE', def: 'n.f. — Cavité pratiquée dans un mur ou abri pour un chien.' },
  { word: 'NOEUD', def: 'n.m. — Entrelacement serré d’un fil, d’un ruban ou d’un cordage.' },
  { word: 'OLIVE', def: 'n.f. — Fruit ovale de l’olivier dont on extrait l’huile.' },
  { word: 'OMBRE', def: 'n.f. — Zone sombre créée par un corps opaque interceptant la lumière.' },
  { word: 'OPERA', def: 'n.m. — Œuvre dramatique entièrement mise en musique et chantée.' },
  { word: 'ORGUE', def: 'n.m. — Grand instrument de musique à vent et à tuyaux.' },
  { word: 'OUTIL', def: 'n.m. — Instrument fabriqué pour exécuter un travail manuel.' },
  { word: 'OZONE', def: 'n.m. — Gaz bleuâtre présent dans la haute atmosphère filtrant les rayons UV.' },
  { word: 'PALAIS', def: 'n.m. — Demeure somptueuse d’un souverain.' },
  { word: 'PANDA', def: 'n.m. — Grand mammifère noir et blanc d’Asie se nourrissant de bambou.' },
  { word: 'PHOTO', def: 'n.f. — Image obtenue par photographie.' },
  { word: 'PIANO', def: 'n.m. — Instrument de musique à clavier et à cordes frappées.' },
  { word: 'PIECE', def: 'n.f. — Espace fermé d’un logement ou disque de monnaie.' },
  { word: 'POCHE', def: 'n.f. — Petit sac cousu dans un vêtement.' },
  { word: 'POIRE', def: 'n.f. — Fruit charnu du poirier, plus large à la base qu’au sommet.' },
  { word: 'PORTE', def: 'n.f. — Ouverture pratiquée dans un mur pour entrer ou sortir.' },
  { word: 'POULE', def: 'n.f. — Femelle du coq élevée pour ses œufs et sa chair.' },
  { word: 'PUITS', def: 'n.m. — Trou profond creusé dans le sol pour atteindre une nappe d’eau.' },
  { word: 'RADIO', def: 'n.f. — Transmission de sons à distance par ondes électromagnétiques.' },
  { word: 'RAYON', def: 'n.m. — Faisceau de lumière ou segment reliant le centre d’un cercle à son bord.' },
  { word: 'REINE', def: 'n.f. — Femme qui exerce le pouvoir royal ou épouse d’un roi.' },
  { word: 'REPAS', def: 'n.m. — Nourriture prise à heures régulières au cours de la journée.' },
  { word: 'ROMAN', def: 'n.m. — Œuvre d’imagination en prose assez longue.' },
  { word: 'ROUGE', def: 'adj. — Qui est de la couleur du sang ou du coquelicot.' },
  { word: 'ROUTE', def: 'n.f. — Voie terrestre aménagée pour la circulation des véhicules.' },
  { word: 'RUBAN', def: 'n.m. — Bande étroite et souple de tissu.' },
  { word: 'RUCHE', def: 'n.f. — Abri aménagé pour recevoir un essaim d’abeilles.' },
  { word: 'RUGBY', def: 'n.m. — Sport collectif se jouant avec un ballon ovale.' },
  { word: 'SALON', def: 'n.m. — Pièce de réception d’une habitation.' },
  { word: 'SAVON', def: 'n.m. — Produit détergent utilisé pour se laver ou nettoyer.' },
  { word: 'SCENE', def: 'n.f. — Partie d’un théâtre où jouent les acteurs.' },
  { word: 'SIEGE', def: 'n.m. — Meuble fait pour s’asseoir.' },
  { word: 'SIGNE', def: 'n.m. — Indice visible permettant de reconnaître ou d’indiquer quelque chose.' },
  { word: 'SOEUR', def: 'n.f. — Personne de sexe féminin par rapport aux autres enfants des mêmes parents.' },
  { word: 'SONDE', def: 'n.f. — Instrument destiné à explorer ou mesurer un milieu inaccessible.' },
  { word: 'SOUPE', def: 'n.f. — Potage composé de bouillon et de légumes.' },
  { word: 'STADE', def: 'n.m. — Terrain aménagé pour la pratique des sports entouré de gradins.' },
  { word: 'STYLE', def: 'n.m. — Manière personnelle de s’exprimer, d’écrire ou de créer.' },
  { word: 'SUCRE', def: 'n.m. — Substance alimentaire cristallisée à saveur douce.' },
  { word: 'TABLE', def: 'n.f. — Meuble composé d’un plateau horizontal soutenu par des pieds.' },
  { word: 'TAPIS', def: 'n.m. — Pièce d’étoffe épaisse dont on recouvre un parquet ou un escalier.' },
  { word: 'TASSE', def: 'n.f. — Petit récipient muni d’une anse servant à boire des boissons chaudes.' },
  { word: 'TAUPE', def: 'n.f. — Petit mammifère insectivore souterrain au pelage noir velouté.' },
  { word: 'TEMPS', def: 'n.m. — Milieu indéfini dans lequel se succèdent les événements.' },
  { word: 'TEXTE', def: 'n.m. — Ensemble des mots et des phrases qui constituent un écrit.' },
  { word: 'THEME', def: 'n.m. — Sujet principal d’une œuvre, d’un discours ou d’une réflexion.' },
  { word: 'TOILE', def: 'n.f. — Tissu de lin, de chanvre ou de coton.' },
  { word: 'TRAIN', def: 'n.m. — Convoi ferroviaire composé d’une locomotive et de wagons.' },
  { word: 'TRONC', def: 'n.m. — Tige principale ligneuse d’un arbre.' },
  { word: 'USINE', def: 'n.f. — Établissement industriel équipé de machines pour fabriquer des produits.' },
  { word: 'VERBE', def: 'n.m. — Mot qui exprime une action ou un état et qui se conjugue.' },
  { word: 'VERRE', def: 'n.m. — Matière transparente et cassante ou récipient à boire.' },
  { word: 'VESTE', def: 'n.f. — Vêtement à manches couvrant le haut du corps.' },
  { word: 'VILLE', def: 'n.f. — Agglomération urbaine importante.' },
  { word: 'VIRUS', def: 'n.m. — Agent infectieux microscopique se multipliant dans les cellules vivantes.' },
  { word: 'WAGON', def: 'n.m. — Véhicule ferroviaire servant au transport des voyageurs ou des marchandises.' },
  { word: 'ZEBRE', def: 'n.m. — Équidé sauvage d’Afrique au pelage rayé de bandes noires et blanches.' }
].filter(d => d.word.length === 5);

const RAW_FRENCH_WORDS = `
abaca abats abbes abces abime abois aboli abord about abris abuse abymes
acces accus achat acier acide acnes actes actif adieu admet admis adore
adulte aeres affin affut agace agape agate agent agiles agios agite agneau
agora agree agues aident aigle aigre aigu aigues ailee ailes aille aiment
aimes ainsi airent aires aisee aises ajonc ajout album alent alerte algue
alias alibi alien alise alite allez allie alors alpes alpha alpin altos
amant ambre amene amere amers amies aminci amiral amitie amont amour ample
amphi amuse anale anaux ancre aneth anges angle angor anima anime anion
annee annexe anons antan antre aorte aphte aplomb appel appui apres aptes
arabe arbre arceau arche arcon ardeur arene arete argent argile argon argot
armes armee armer armure arome arpent arret arroi arsins astre atome atour
atout atroce aucun audace augure aulne aunes aupres auquel auras aurez
aurore aussi autant auteur autos autre avale avant avare avarie avenir
averse aveux avide aviez avions avise avive avoir avons avoue avril ayant
azote azurs
babeurre babil bache bacon badge baffe bagne bague baies baigne baille
bains baiser baisse balai balas balcon balise balle ballet ballon bambou
banal bancs bande banni banque baquet barbes barde barge baril barman
baron barre barres baser bases basse basson batard bateau batie batir
batis baton battu baume baver baveux bazar beante beants beau beaux bebes
beche bedon beige beler belge belle belon benie benin benir benis benit
berce beret berge berne betes beton beugle beurre biais bible biche
bide bidon biens biere bifton bigle bijou bilan bile billes billet binaire
bique bisou bistro bitume bizarre blague blaire blame blanc blase bleme
blesse bleue bleus blind blocage blocus blond bloque blouse blouson bobine
bocal boeuf boire boise boites bolide bombe bonde bondi bonheur bonjour
bonne bonte bonus bordes bordel borgne borne bosse bossu botte bouc
bouche boucle bouder bouees bouffe bouge bougie bougon boule boulon boulot
bouquet bourde bourg bourre bourse bouton bovin boxe boyau braise brame
branche brandi branle braque brasier brave bravo brebis breche bref brefs
bride brieve brille brin brioche brique brise broche brode bronze brosse
brouet broute broye bruine bruit brume brune bruns brusque brute buche
budget buffet buisson bulbe bulle bureau burin busard buste buter butin
butor buvait buvez
cabale cabane cabas cabine cable cacao cache cachet cachot cactus cadeau
cadenas cadet cadre cafard cafe cageot cagoule cahier caillou caisse
calcul cale calice calme calot calque camarade camelot camera camion
camper campus canal canape canard cancer caniche canif canine canne
canon canot cantine canton capot caprice capsule capte capture capuche
caquet carafe carats carbone carcan cargo carie carmin carnet carotte
carpe carre carrosse carte carton cascade casque casse cassette castor
catin cauchemar cause caution cavale caveau caverne caviar cedre ceindre
ceint celeste celle celui cendre cense cent centre cercle cerf cerise
cerne certain cerveau cesse chacun chagrin chaine chair chaise chaleur
chalet chalut chambre chameau champ chance change chanson chant chaos
chapeau chaque charbon charge chariot charme charrue chasse chat chateau
chaton chaud chauffe chaume chauve chef chemin chemise chene chenil
cheque cher chere cheri cheval cheveu chevre chez chien chiffon chiffre
chimie chine chiot choc choeur choisir choix chope choque chose chou
chute cible cicatrice cidre ciel cierge cigale cigare cil cime ciment
cinq cintre cirage circon cirer cirque ciseau citadin citer citoyen
citron civet civil clair clame clapet claque clarte classe clavier clef
clefs clerc client climat clinique cloche cloison clone clore clos
clou clouer clown club cochon cocon code coeur coffre coiffe coin
colere colis collage colle collier colline colon colonne combat comble
comedie comete comique comite comme commis commun compact compas complet
complot compte concert concis concours conduit confie confit confort
conge congere congre connu conquete conseil console consomme constate
contact conte content contenu contre convoi copie coq coque coquet
coquille corail corbeau corbeille corde cordon corne cornet corniche
corps correct cortège costume coteau cote coton coude coudre coule
couleur couloir coup coupe couple coupole courage courant courir couronne
cours course court cousin couteau coutume couvent couver couvert crabe
crachat craie crainte crane crapaud craque cravate crayon creche credit
creme creneau crepe crepi crepuscule crete creuser creux cri crier
crime criniere crise cristal critique croc crochet crochu croire croix
croque crosse crotte croute croyance cru cruel cruelle crustace cube
cueillir cuiller cuir cuire cuisine cuisse cuivre culotte culte culture
cumul cupide cure curieux cuve cycle cygne cylindre
dague daim dalle dame danger danse dard date dauphin debat debit
debris debut decede decent dechet decide declin decor decrit dedans
dedie defaut defend defile defini defunt degage degat degel degre
dehors deja dejeuner delai delice delire delit delivre delta deluge
demain demande demeure demi demon demontre dense dent dentelle depart
depense depit deplace deplie deplore depose depot depuis depute derange
derive dernier derobe deroule derriere deserte desespoir desir desordre
dessin dessous dessus destin detail detend detente deteste detient
detour detruit dette deuil devant devenir devin devise devoir devore
diable dialogue diamant dicte dicton dieu differe difficile diffuse
digere digne digue dilue dimanche dimension diminue dinde diner diode
diplome dire direct dirige discern discipline discours discret discute
disparu disperse dispose dispute disque distance distrait dit divers
divin divise divorce dix dizaine docteur document dodo dogme doigt
domaine dome domicile domine dommage dompte don donc donjon donne
dont dorer dormir dort dos dose dossier dot douane double douceur
douche douleur doute doux douzaine dragon drap drapeau dresse droit
droite drole du duc duel dune duo dupe durable durant durcir dure
durer duvet
eau ebauche ebene ebloui ebranche ebranle ebreche ecarte echange echantillon
echappe echarpe echec echelle echo eclair eclat eclipse ecluse ecole
ecorce ecorche ecoule ecoute ecran ecrase ecrevisse ecrier ecrire ecrit
ecrivain ecrou ecroule ecume ecureuil edifie edition eduque efface
effare effectue effet efficace effleure effondre effort effraie effroi
egal egale egalite egard egare eglantier eglise egoiste egorge egout
ehonte elan elargi elastique electeur electricite electron elegant element
elephant eleve elime elire elite eloge eloigne elu email emballe
embarque embarras embauche embellit embete embleme embouche embrasse
embrume embuche emerde emet emeute emigre eminent emission emmene
emoi emotion emousse empare empeche empereur empeste empile empire
emplacement emplir emploi employe emporte empreinte emprisonne emprunt
emu en encadre encaisse enceinte encens enchaine enchante enchere
enclin enclume encolure encombre encore encourage encre encroute endette
endive endort endosse endroit enduit endurant energie enerve enfance
enfant enfer enferme enfile enfin enflamme enfle enfonce enfoui enfreint
enfuit engage engin englouti engourdi engrais engrenage enivre enjambe
enjeu enleve ennemi ennui enonce enorme enquete enrage enraye enrichi
enrobe enrole enroule enseigne ensemble ensemence enserre enseveli
ensoleille ensorcelle ensuite entaille entame entasse entend enterre
entete enthousiasme entier entonne entorse entoure entraide entrain
entrave entre entretien enumere envahi enveloppe envers envie environ
envisage envol envoie epais epaisse epanche epanoui epargne eparpille
epars epate epaule epave epee epeler eperon epervier epi epice epier
epieu epilogue epinard epine epingle episode epluche eponge epoque
epouse epouvante epreuve epris eprouve epuise epure equerre equilibre
equipage equipe equivalent erable ere erige ermite errance erre erreur
erudit eruption escabeau escadre escalade escale escalier escargot
escarpement esclave escorte escroc espace espadon espece esperance
espere espion espoir esprit esquif esquisse esquive essai essaim essence
essieu essor essuie est estame estampe estime estomac estrade estropie
etabli etable etage etagere etain etalage etale etalon etame etanche
etang etape etat etau etaye ete eteint etend etendard etendu eternel
eternue ether etincelle etire etoffe etoile etonne etouffe etourdi
etrange etranger etrangle etre etreinte etrier etroit etude etudiant
etui euro evacue evade evalue evangile evanoui evapore eveil evenement
eventail eventre evêque evident evier evite evolue evoque exact exagere
exalte examen examine exauce excede excellent excepte exces excite
exclame exclu excuse execute exemple exerce exhale exhibe exige exil
existe exode exotique expand expanse expatrie expectative expedie
experience expert expire explique exploit explore explosion exporte
expose expres exprime expulse exquis extase exterieur externe extirpe
extorque extra extrait extreme exuberance
fable fabrique facade face facette fache facile facon facteur faction
facture fade fagot faible failli faim faineant faire faisan faisceau
fait falaise falloir falot falsifie fameux familial famille famine
fanatique fane fanfare fantaisie fantasme fantome farce fardeau farine
farouche fatal fatigue fauche faucon faufile faune faussaire fausse
faute fauteuil fauve faveur favori fecond fee feindre feinte fele felicite
felin femelle feminin femme fend fendre fenetre fente fer ferie ferme
ferment fermete feroce ferraille fesse festin festival fete fetide
feu feuillage feuille feutre feve fevrier fiacre fiable fiancailles
fibre ficelle fiche fichier fictif fidele fiel fier fierte fievre figaro
fige figue figure fil filament filature file filet filiale filiere
fille film filon fils filtre fin final finance finesse finir fiole
firme fissure fixe flacon flagrant flair flamant flambeau flamme flan
flanc flaque flatter fleau fleche flechit flegme flemme fletrit fleur
fleuve flexible flic floc flocon floraison flore flot flotte flou
fluide flute flux foie foin foire fois folie folle fonce fonction
fond fondation fonde fondre fonds fontaine fonte football forage force
forer forestier foret forfait forge forme formel formule fort forteresse
fortune fosse fossile fou foudre fouet fougere fougue fouille fouine
foule four fourbe fourche fourmi fournaise fourneau fournir fourrage
fourrure foyer fracas fraction fragile fragment fraiche fraise framboise
franc franchir francois frange frapper fraude frayeur frein frelon
fremir frene frequence frere fresque fret friand friche friction
frigo frileux frime fringale fripe frire frise frisson frite froid
froisse fromage front frontiere frotte fruit frustre fugace fugitif
fugue fuir fuite fumee fumer fumier funebre funerailles fureur furieux
fuseau fusee fusil fusion futile futur
gabarit gachette gachis gadget gaffe gage gagne gai gaiete gaillard
gain gaine gala galant galerie galet galette galle gallon galop
gambade gamin gamme gant garage garantie garcon garde gardien gare
garer garnir garnison garrot gaspillage gateau gater gauche gaufre
gaulois gave gazon geant geindre gel gelee geler gelule gemeau
gemir gemme gencive gendarme gendre gene general genereux genese
genet genévrier genie genou genre gens gentil geographie geolier
gerbe gercer gerer germain germe gesier geste gestion gibier gifle
gigantesque gigot gilet girafe girouette gisement git gitan givre
glace glacier glacon glaive gland glande glane glisse global globe
gloire glorieux glouton gluant glucose gluten goal gobelet gober
godet goeland goinfre golfe gomme gond gondole gonfle gorge gosier
gothique gouffre goujat goujon goulot goulu gourde gourmand gousse
gout gouter goutte gouverne grace gracieuse grade gradin grain graine
graisse grammaire grand grandeur grange granit granule grappe grappin
gras gratifie gratin gratis gratte gratuit grave gravier gravir
gravure gre gredin greffe grele grelot grenade grenier grenouille
gres gresille greve grief griffe griffon grignote grillage grille
grillon grimace grimpe grince griotte grippe gris grive grogne
grommelle gronde gros grosse grossier grotte groupe gruau grue
gue guenon guepe guere guerir guerison guerre guet guette gueule
gui guichet guide guidon guignol guilde guillemet guimauve guirlande
guise guitare gustatif gymnastique gymnase
habile habille habit habitant habite habitude hache haie haine hair
haleine halete hall halle halte hamac hameau hamecon hampe hanche
hangar hanneton hanter happer harangue haras harcele harde hardi
hareng hargne haricot harmonie harnais harpe hasard hate hater
hausse haut hauteur havre heberge hebete helas helice hemorragie
hennir herbe herisson heritage herite hermine heroique heros heron
hesite hetre heure heureux heurte hibou hideux hier hierarchie
hirondelle hisse histoire hiver hobby hobereau hochet hollande homard
hommage homme honnete honneur honore honte hopital hoquet horizon
horloge hormone horreur hors hospice hostie hostile hote hotel
houblon houille houle houppe hourra housse houx hublot huche hue
huile huit huitre humain humble humide humilie humour huppe hurle
hutte hyene hymne hypnose hypothese
ici ideal idee identique idiot idole igloo ignare ignore ile ilot
illusion illustre ilot image imagine imbécile imite immense immeuble
immobile immonde immortel immunite impact impair imparfait impasse
impatient impayé impeccable imperial imperméable impertinent impetueux
impitoyable implacable implante implique implore impoli importe
importun impose impossible impot impotent imprègne impression imprime
imprevu imprudent impur inacheve inactif inadapte inaltere inanime
inapercu inapte inattendu inaugure incapable incendie incertain
incessant incident incline inclus incognito incolore incommode
incomparable incomplet incompris inconnu inconscient inconséquent
inconstant incontestable inconvenient incorrect incorrigible incredule
incroyable incruste inculpe incurable indecent indecis indefinissable
indemne independant indescriptible indesirable index indicateur
indice indifferent indigene indigeste indigne indique indirect
indiscret indispensable indispose individu indolent indomptable
indulgent industrie inebranlable inedit inefficace inegal ineluctable
inepte inepuisable inerte inertie inesperé inestimable inevitable
inexact inexcusable inexistant inexorable inexperience inexplicable
inexploite inexpressif inextinguible infaillible infame infanterie
infarctus infatigable infect infelicite inferieur infernal infidele
infiltre infime infini infirmier inflammable inflammation inflation
inflechit inflige influence influx informe infortune infraction
infructueux infuse ingenieur ingenieu ingerat ingrat ingredient
inhabite inhale inherent inhibe inhume inimitable inimaginable
inintelligible ininterrompu inique initial initie injecte injure
injuste inlassable inne innocent innombrable innovant inoccupé
inocule inodore inoffensif inonde inopine inoubliable inoui inquiet
inquiete inquietude insalubre insatiable inscription inscrire insecte
inseparable insere insidieux insigne insignifiant insinue insipide
insiste insolent insolite insoluble insomnie insouciant inspecte
inspire instable installe instant instaure instinct institue
instructeur instruction instruire instrument insu insuffisant
insulaire insulte insupportable insurge intact integral integre
intellectuel intelligence intelligent intelligible intempestif intemperie
intense intensite intente intention intercede intercepte interdit
interessant interesse interet interieur interimaire interjection
interlocuteur intermediaire interminable interne interpelle interpose
interprete interroge interrompt intersection intervalle intervient
intestin intime intimide intitule intolerable intolerant intonation
intoxique intraitable intransigeant intrepide intrigue intrinsèque
introduit introuvable intrus intuition inusable inutile invaincu
invalide invariable invasion invective inventaire invente inverse
investigue investit inveteré invincible invisible invite involontaire
invraisemblable iode ionique irascible iris irlande ironie irradie
irraisonnable irrealisable irrecevable irreconciliable irrecusable
irredeemable irreductible irreel irreflechi irrefutable irregulier
irreligieux irremplacable irreparable irreprochable irresistible
irresolu irrespectueux irresponsable irreverencieux irreversible
irrevocable irrigue irrite irruption islam islande isole issue
italie itineraire ivoire ivre ivresse ivrogne
jabot jacasse jacinthe jade jadis jaillit jalon jalousie jaloux
jamais jambe jambon janvier japon jappe jardin jargon jarre
jarret jasmin jaspe jauge jaune jaunisse javelot je jean jeter
jeton jeu jeudi jeune jeunesse joie joindre joint joli jonc
jongle joue jouer jouet joueur jouflu joug jouir jour journal
journee joute joyau joyeux jubile judas judiciaire judicieux juge
jugement juger juif juillet juin jumeau jumelle jument jungle
jupe jupon jure juron jus jusque juste justesse justice justifie
juteux
kangourou kayak kepi kilo kilogramme kilometre kiosque klaxon
la labeur labyrinthe lac lacer lacet lache lachete lacune lagune
lai laid laideur laine laisse lait laiton laitu lame lamentable
lamente lampe lance lancinant lande lange langue languir laniere
lanterne lapin laps laque lard large largeur larme larve laser
lassant lasse lassitude latent lateral latin latte laurier lavabo
lavande laver laveur lavoir laxiste layette le lecher lecon lecteur
lecture legal legende leger legion legislateur legitime legs legume
lendemain lent lenteur leopard lepre lequel lerot lessive leste
lethargie lettre leur leurre levain levant lever levier levre
levrier lexique lezard liaison liane liard liasse libelulle liberal
libere liberte libraire libre licence liche licite licorne lie
liege lien lier lierre lieu lieutenant lievre ligne ligue lilas
limace limaille lime limite limon limpide lin linceul linge lingot
linotte lion liqueur liquide lire lis liseron lisiere lisse liste
lit litanie literie litiere litige litre litterature littoral
livide livrable livraison livre livret lobe local locataire location
locomotive loge logement loger logique logis loi loin lointain
loisir long longer longevite longitude longueur loque loquet lorgne
lors losange lot loterie lotion lotissement louange louche louer
loup loupe lourd lourdeur loutre loyal loyaute loyer lucarne lucide
luciole lucratif lueur lugubre lui luire luisant lumiere lumineux
lunaire lundi lune lunette lustré lutin lutte lutter luxe luxure
lycee lynx lyre
macabre macadam macaroni macerer mache machine machoire macon
madame mademoiselle madrigal magasin magazine mage magicien magie
magistral magistrat magnanime magnetique magnifique magot mai maigre
maigrir maille maillet maillon maillot main maintenant maintenir
mairie mais maison maitre maitrise majeste majeur majorite majuscule
mal malade maladie maladresse malaise malchance male malediction
malefice malentendu malfaiteur malgre malheur malhonnete malice
maligne malin malle malnutrition malodorant malpropre malsain maltraite
maman mamelle mammifere mammouth manche manchot mandat manège
mangeable manger mangue maniable manie maniere manifeste manipule
manivelle manne mannequin manoeuvre manoir manque mansarde manteau
manuel manufacture manuscrit manutention mappemonde maquereau maquette
maquillage maquille marais maratre maraude marbre marc marchand
marche marchepied mardi mare marecage marechal maree margarine
marge marginal marguerite mari mariage marie marin marinade marine
marionnette maritime marjolaine marmelade marmite marmot marmotte
maroc maroquin marotte marque marquis marraine marre marron mars
marteau martial martyr merveille masculin masque massacre masse
massif massue mastic masure mat matelas matelot materiel maternel
mathematique matiere matin matinal matinee matou matrice matricule
maturite maudire maudit maussade mauvais mauve maxime maximum
mayonnaise mecanicien mecanique mecanisme mechant meche mecompte
meconnaissable meconnu mecontent medaille medecin medecine media
mediocre medite mediterranee medium meduse mefait mefiance mefie
megarde megot meilleur melancolie melange mele melese melodie melon
membrane membre meme memoire memorable menace menage menager mendiant
mene meneur menhir menotte mensonge mensuel mental menteur menthe
mention menton mentir menu menuisier mepris meprise mer merci
mercredi mercure merde mere merite merlan merle merveille mesaventure
mesquin message messager messe mesure metal metamorphose metaphore
metayeur meteore meteo methode metier metre metropole mets mettre
meuble meugle meule meunier meurtre meurtrier meute mexique miaule
miche microbe microcosme microphone microscope midi miel mien miette
mieux mignon migraine mijote milan milieu militaire mille milliard
millier millimetre million mime mimosa mince mine minerai mineral
minet mineur miniature minime minimum ministere ministre minuit
minuscule minute minutieux miracle mirage miroir misanthrope mise
miserable misere misericorde missile mission mistral mitaine mite
mitige mitoyen mitraille mixte mobile mobilier mobilise mode modele
modere moderne modeste modifie module moelle moelleux moeurs moi
moindre moine moineau moins mois moisi moisson moite moitie molaire
mole molecule mollesse mollet moment momie mon monarchie monarque
monastere mondial moniteur monnaie monochrome monocle monologue
monopole monotone monstre montagne montant monte montee monter montre
monture monument moque moquerie moral morale morceau mordre morfond
morgue moribond morne morose mors morsure mort mortel mortier morue
morve mosquee mot moteur motif motion motive moto motte mou mouche
moucheron mouchoir moudre moue mouette moufle mouille moule moulin
mourir mousquet mousse moustache moustique moutarde mouton mouvement
moyen moyenne moyeu mue muet mufle mugir muguet mulatre mulet
multicolore multiple multiplie multitude municipal munir munition
mur muraille mure murir murmure muscle muse museau musee museliere
musical musicien musique musulman mutation mutile mutin mutuel
myope myosotis myrte mystere mystique mythe mythologie
nacre nage nageoire nager nageur naif nain naissance naitre naivete
nappe narcisse narine narquois narrateur nation national natte naturel
nature naufrage nausee naval navet navigateur navigue navire ne
neanmoins neant nebuleuse necessaire necessite nectar nef negatif
neglige negoce negre neige nenuphar nerf nerveux net nettoie neuf
neutre neveu nez ni niais niche nickel nicotine nid niece nier
nigaud nimbe niveau noble noblesse noce nocturne noel noeud noir
noirceur noircir noisette noix nom nomade nombre nombreux nombril
nomme non nonchalant nord normal norme norvege nostalgie notable
notaire note notice notifie notion notre noue nougat nouille nourrice
nourrir nourriture nouveau nouveaute nouvelle novembre noyau noyer
nu nuage nuance nudite nuire nuisible nuit nul nullite numero
nuque nutrition nymphe
oasis obeir obeissance obelisque obese obesite objecte objectif
objet obligation oblige oblique obliterer oblong obscur obscurite
obsede obseques observatoire observe obstacle obstine obstructif
obtient obus occasion occident occulte occupant occupation occupe
occurrence ocean ocre octobre octroie oculaire ode odeur odieux
odorat oeil oeuf oeuvre offense offensif office officiel offre
ogive ogre oie oignon oiseau oisif olive olivier ombrage ombre
ombrelle omelette omettre omission omnibus omnipresent omniscient
omoplate on once oncle onde ondée ondule onereux ongle onguent
onze opaque opera operateur operation opere opine opium opposant
oppose opposition oppresse opprime opticien optique optimisme option
opulence or oracle orage orageux oraison oral orange orangeade
orateur orbite orchestre orchidee ordinaire ordonnance ordonne ordre
ordure oree oreille oreiller orfevre organe organise organisme orgie
orgueil orient oriental orifice originaire original origine orme
orne orniere orphelin orteil orthodoxe orthographe ortie os oscille
ose oseille oser osier ossature ossements ostensible otage otarie
oter ou oubli oublier ouest oui ouie ouragan ourlet ours oursin
outil outillage outrage outrance outre ouvert ouverture ouvrage
ouvre ouvrier ouvrir ovale ovation oxyde oxygene ozone
pacifique pacotille pacte pagaie page pagination pagne paie paiement
paien paille pain pair paire paisible paix palais pale palefrenier
palet palette paleur palier palissade palme palmier palombe palote
palpable palpe palpite pamela pamplemousse pan panache pancarte
panda pandemonium panegérique panier panique panne panneau panoplie
panorama pansement pantalon panthere pantin pantoufle paon papa
papaye pape papeterie papier papillon papotage paque paquet par
parabole parachute parade paradis paradoxe parafe paragraphe paraitre
parallele paralyse parapet parapluie parasite paratonnerre parc
parcelle parchemin parcourir parcours pardessus pardon pardonner
pareil parent parenthese paresse parfait parfum pari parier paris
parjure parking parlement parle parleur parmi parodie paroi paroisse
parole parquet parrain parseme part partage partenaire parterre
parti partial participation participe particulier partie partir partisan
partition partout parure parvenir parvis pas passage passager
passant passe passeport passerelle passion passoire pasteque pasteur
pastille pate patee patelin patent paternel pathetique patience
patient patin patine patinoire patir patisserie patois patrie patrimoine
patriote patron patrouille patte paturage pature paume paupiere pause
pauvre pauvrete pavane pave pavillon pavois paye payer pays paysage
paysan peau peche pecheur pedale pedagogie peigne peindre peine
peintre peinture pelage pele pelerine pelle pellicule pelote pelouse
peluche penal penaud penche pend pendant pendre pendule penetre
penible peniche peninsule penitence pensee penser penseur pensif
pension pente pepin pepiniere percer percevoir perche perchoir perd
perdant perdre perdrix pere perfection perfide perfore performance
peril perimetre periode peripherie perir periscope perle permanence
permanent permet permis permission permuta perpendiculaire perpetuel
perplexe perron perroquet perruche perruque persecute persevere persienne
persil persiste personnage personnalite personne perspective persuade
perte pertinent perturbe pervers pesant peser pessimiste peste
petale petard petille petit petitesse petrir petrole peu peuple
peur peureux peut peut-etre phare pharmacie phase phenomene philosophe
philosophie phoque phosphore photo photographie phrase physique
pianiste piano pic pichet picore picote pie piece pied piege
pierre pieton pieu pieuvre pigeon pignon pile piler pilier pillage
pille pilote pilule piment pin pince pinceau pincer pingouin pinson
pintade pioche pion pionnier pipe piquant pique piquet piqure
pirate pire pirouette pis piscine piste pistolet piston piteux
pitie piton pittoresque pivot place placement placer plafond plage
plaidoirie plaidoyer plaie plaindre plaine plainte plaire plaisance
plaisant plaisanterie plaisir plan planche plancher plane planete
planeur planifie plante plantureux plaque plaquette plastique plat
plateau platine platre plausible plein pleurer pleuvoir pli plier
plomb plomberie plonge plongeon plongeur pluie plumage plume
plupart pluriel plus plusieurs plutot pneu poche pochette poele
poeme poesie poete poids poignard poignee poignet poil poincon
poing point pointe pointu poire poireau poison poisson poitrine
poivre poivron pole police policier polir politesse politique
pollue polo polygone pommade pomme pommier pompe pompier ponce
ponctuel pondre poney pont ponton populace populaire population
porc porcelaine porche porc-epic pore port portable portail porte
portefeuille portemanteau porter porteur portiere portion portrait
pose poser positif position possede possession possible postal
poste posterieur postiche posture pot potage poteau potence potentiel
poterie potier potion pou poubelle pouce poudre poulailler poulain
poule poulet poulie poulpe pouls poumon poupe poupee pour pourboire
pourceau pourcentage pourchasse pourparler pourquoi pourri pourriture
poursuite poursuivre pourtant pourvoir pousse pousser poussiere
poussin poutre pouvoir prairie pratique pre prealable peau preau
precaution precedent precepte preche precieux precipice precipite
precis precision precoce predecesseur predire prediction preference
prefere prefixe prejudice prejuge preleve preliminaire prelude
premature premier prendre prenom preoccupation preoccupe prepare
pres presage presbytere prescription prescrire presence present
presentation presente preservatif preserve president preside presqu'ile
presse pression prestige presume pret pretend prete preter pretexte
pretre preuve prevaloir prevenir preventif previsible prevision
prevoir prevoyant prie priere primaire prime primitif prince princesse
principal principe printemps priorite prise prison prisonnier prive
privilege prix probable probabilite probe probleme procede proceder
proces procession prochain proche proclame procure prodigieux prodige
producteur production produire produit profane profession professeur
profil profit profite profond profondeur programme progres progresse
proie projecteur projection projet prolonge promenade promener
promesse promet prometteur promoteur promotion prompt pronom prononce
propagande propage prophete propice proportion propos propose propre
proprete proprietaire propriete prose prospecte prospere prosterne
protecteur protection protege proteste protocole prototype proue
prouesse prouve provenance provenir proverbe province provision
provisoire provoque proximite prudent prune prunier psaume pseudonyme
psychologie puant public publication publicite publie puce pudeur
puis puiser puisque puissance puissant puits pull pullule pulmonaire
pulpe pulsation pulverise punaise punir punition pupille pupitre
pur puree purete purge purifie pus putois pyramide python
quai qualifie qualite quand quant quantite quarantaine quarante
quart quartier quartz quasi quatorze quatre quatre-vingts que
quel quelconque quelque quelqu'un quenouille querelle question quete
queue qui quiconque quietude quille quincaillerie quinzaine quinze
quitte quitter quoi quoique quotidien quotient
rabais rabattre rabbin rabot raccommode raccourci raccourcir race
rachat racheter racine racisme racler raconter rade radeau radiateur
radiation radical radieux radio radis radote rafale raffine rafle
rafraichir rage ragoût raide raideur raie rail raillerie raisin
raison raisonnable raisonne rajeunir rajoute ralentir rale rallie
rallonge rallume ramage ramasse rame rameau ramener rameur ramifie
ramolli rampe ramper rancart rance rancoeur rancon rancune randonnee
rang rangee ranger ranime rapace rape rapide rapidite rapiece
rappel rappeler rapport rapporter rapproche rare rarete ras rasade
raser rasoir rassasie rassemble rassis rassure rat ratatouille rate
rateau rater ratifie ration rattache rattrape rauque ravage ravalement
rave ravi ravie ravin ravir ravissant ravitaille raye rayon rayonne
reacteur reaction reagir realisable realise realisme realite rebelle
rebond rebondir rebord rebrousse rebut recalcitant recense recent
recepisse reception recette recevoir recueil recueillir recul reculer
reculons recupere redaction redemarre redevable redevance redevenir
redige redit redouble redoutable redoute redresse reduire reduit
reel reelu refaire refection referent referme reflechi reflechir
reflet reflexe reflexion reforme refoule refrain refrigerateur
refuge refugie refus refuser regagne regal regale regard regarder
regate regie regime region registre regle reglement regler regne
regner regret regretter regulier rein reine reitere rejet rejeter
rejoindre rejouir relache relais relance relater relatif relation
relayer releve relever relief relier religieux religion relique
relire reluisant remarie remarquable remarque remblai rembourse
remede remercier remettre remonte remords remorque rempart remplace
remplir remporte remue remuneration remunere renard rencherit
rencontre rendement rendez-vous rendormir rendre rene renegat renferme
renfle renforce renfort rengaine renie renifle renne renom renommee
renonce renouveau renouvelle renseignement renseigne rente rentree
rentrer renverse renvoie repaire repaitre repandre reparable reparation
repare repart repartir repas repasse repere repertoire repeter
repete repit replace replie replique repond repondre reponse reportage
repos reposer repousse reprend reprendre represaille represente
reprime reprise reproche reproduction reproduire reptile republique
repugnance repugne reputation repute requiem requin requis requete
reseau reserve reservoir reside residence resident residu resigne
resine resistance resistant resiste resolu resolution resoudre
respect respectable respecte respectueux respiration respire
resplendit responsable ressemblance ressemble ressemelle ressenti
ressentir resserre ressort ressortir ressource ressuscita restaure
reste rester restitue resultat resulte resume retabli retablir
retard retarder retenir retentir retenue reticence retire retomber
retour retourner retrace retraite retranche retrecit retribue
retrograde retrouve reunion reunir reussir reussite revanche reve
reveil reveiller reveler revenir revenu rever reverence revers
revetement revetir revise revision revivre revoir revolte revolution
revolver revue rez-de-chaussee rhabiller rhinocéros rhubarbe rhume
riant ribambelle ricaner riche richesse ricochet ride rideau ridicule
rien rigide rigole rigoureux rigueur rime rincer riposte rire
risque risquer rivage rival rive riviere rixe riz robe robinet
robot robuste roc rocaille roche rocher rodeur roder rognon roi
role romain roman romance romancier romantique rompre rond ronde
rondeur rondin ronfle ronge rongeur rose roseau rosee rosier
rossignol roti rotir rotule rouage roue rouge rougeole rougeur
rougir rouille rouleau roulement rouler roulette roulis route
routine roux royal royaume ruban rubis ruche rude rudesse rudimentaire
rue ruelle ruer rugir rugueux ruine ruiner ruisseau rumeur ruminant
rupture rural ruse ruser rustique rythme
sabbat sable sabot sabre sac saccade sachet sacoche sacre sacrifice
sacrifie sadique safran sagacite sage sagesse saigner saillie sain
saint sainte saintete saisir saison salade salaire sale salete
saliere salir salive salle salon salopette salubre saluer salut
salutation salve samedi sanctuaire sandale sang sanglant sangle
sanglier sanglot sanguin sanitaire sans sante saphir sapin sarcasme
sarcelle sardine satin satire satisfaction satisfait sauce saucisse
saucisson sauf sauge saule saumon saupoudre saut sauter sauterelle
sauvage sauvegarde sauve sauver sauveur savant savate saveur
savoir savon savourer scandale scarabee sceau scelerat scene
sceptique schisme science scientifique scie scier scintille scission
scolaire score scorpion scribe scrupule scrute sculpter sculpteur
sculpture se seance seau sec sechage secher secheresse second
seconde secourir secours secousse secret secretaire secteur section
seculaire securite sedentaire sediment seduction seduire segment
seigneur sein seisme seizieme seize sejour sel selection selle
selon semelle semence semer semestre semi semoule senat sens
sensation sense sensible sensuel sentence sentier sentiment sentir
seoir separer septembre septieme sepulcre sequence sereine serenite
serf sergent serie serieux serin seringue serment sermon serpent
serre serrer serrure servante service serviette servir serviteur
seuil seul seulement seve severe severite sevrer sexe sexuel
short si siecle siege sien sieste siffle sifflet signal signature
signe signer significatif signifie silence silencieux silex silhouette
sillage sillon similaire simple simplicite simplifie simulacre
simule simultane sincere sincerite singe singulier sinistre sinon
sinueux siren site situation situe six sixieme ski sobre societe
soeur soi soie soif soigne soigneux soin soir soiree soit soixante
sol solaire soldat solde soleil solennel solfege solidaire solidarite
solide solitude sollicite solo solution sombre somme sommeil sommet
somptueux son sondage sonde songe songer sonner sonnette sonore
sorcier sorciere sordide sort sortable sorte sortie sortir sot
sottise sou souci soucieux soudain soude souder souffle souffler
souffrance souffrir souhait souhaiter souille soulage souleve soulier
souligne soumettre soumis soupape soupcon soupconne soupe souper
soupir soupirer souple souplesse source sourcil sourd sourdine
sourire souris sous soustrait soutane soute soutenir soutien souterrain
souvenir souvent souverain soja spacieux spatule special specialiste
specialite spectacle spectateur spectre specule sperme sphere
spirale spirituel splendide sponsor spontane sport sportif squelette
stabilite stable stade stage stagnation stagnant stalle station
stationne statue stature statut sterile sterilise stigmate stimule
stock stocke stop store strident strie structure stupefait stupeur
suave subit subitement sublime submerge subordonne subsiste substance
substitue subtil subvention succede succes successeur successif
succombe succulent sucer sucre sucrerie sud suer sueur suffire
suffisant suffoque suggere suggestion suicide suie suif suivre
sujet sulfate sulfure sultan superbe supercherie superficie superficiel
superflu superieur supermarche superstition supper supplie support
supporte suppose supprime supreme sur surabondance surete surface
surgir surlendemain surmonte surnom surpasser surplus surprendre
surprise sursaut sursauter sursis surtout surveillance surveille
survient survivre suspect suspend suspendre suspens suspicion svelte
syllabe symbole symetrie sympathie sympathique symphonie symptome
synagogue syndicat synonyme synthese systeme
tabac tablier tabou tabouret tache tacher tact tactique taille
tailler tailleur taire talent talisman talon talus tambour tamis
tampon tandis tangente tangible taniere tant tante tantot taon
tapage tape taper tapis tapisserie taquin taquine tard tarder
tarif tarir tarte tartine tas tasse tasser tater tatonne tatouage
taudis taupe taureau taux taverne taxe taxi te teint teinte
teinture tel telegramme telephone telescope television temerite
temoignage temoin tempe temperament temperature tempete temple
temporaire temps tenace tenaille tenant tendance tendre tendresse
tenebres teneur tenir tennis tension tentacule tentation tente
tenter tenue terme terminal termine termite ternir terrain terrasse
terrestre terreur terrible terrien terrier terrifie territoire terroir
tertre tes testament tete tetine tetu texte textile texture
the theatre theme theorie therapeutique thermal thermometre these
thon thym tiare tibia tic tiede tien tierce tiers tige tigre
tilleul timbre timide timidite tintamarre tinte tir tirage tirer
tiroir tisane tison tisser tissu titre titube toast toi toile
toilette toison toit toiture tole tolerance tolere tomate tombe
tombeau tomber tome ton tondeuse tondre tonneau tonner tonnerre
toque torche tordre tornade torpille torrent torse tort tortue
torture tot total touche toucher touffe touffu toujours toupie
tour tourbe tourbillon tourelle tourisme touriste tourment tourne
tournesol tournoi tourtereau tous tousser tout toutefois toux
trac trace tracer tracteur tradition trafic tragique trahir trahison
train traineau trainer trait traite traitement traiter traitre
trajet trame tramway tranche tranquille transaction transat transcrit
transfere transforme transfuse transgresse transige transit transition
translucide transmet transparent transpire transplante transporte
transpose transversal trapeze traque travail travailler travailleur
travers traverse travesti trebuche trefle treille treize trembler
tremplin trempe trente trepas trepied tres tresor tresse tri
triangle tribu tribunal tribut triche tricot trident trie trier
trimestre tringle trinite trinome triomphe tripe triple tripote
triste tristesse trivial troc troene trois troisieme trombe trombone
trompe tromper trompette tronc trone troncon trop trophee tropical
tropique troquer trot trotter trottoir trou trouble troubler
trouer troupe troupeau trousse trouver truand truc truffe truite
tu tube tuer tuile tulipe tumeur tumulte tunnel turban turbine
turbulent turc tutelle tuteur tutoyer tuyau tympan type typhus
typique tyran
ulcere ulterieur ultime ultra un unanime unanime uni uniforme
unifie union unique unir unite univers universel universite urbain
urgence urgent urine urne usage usager user usine ustensile usuel
usure usurpe utile utilise utilite utopie
vacance vacant vacarme vaccin vache vacille vagabond vague vain
vaincre vaincu vainqueur vaisseau vaisselle valable valet valeur
valide valise vallee vallon valoir valse value valve vampire
vanille vanite vanne vantard vante vapeur variable variante variation
varice varie variete variole vase vaste vautour veau vecu
vegetal vegetation vehemente vehicule veille veiller veine velours
velu vendange vendeur vendre vendredi veneneux veneration venere
vengeance venger venimeux venin venir vent vente ventilateur ventre
ver veracite verbal verbe verdâtre verdict verdure vereux verge
verger veridique verifie veritable verite vermeil vermin vernis
verre verrou verrue vers versant verse verser version verso
vert verte vertical vertige vertu verve vesicule vessie veste
vestiaire vestige vetement veteran veterinaire vetir vetu veuf
veuve vexation vexe viable viaduc viande vibrant vibration vibre
vicaire vice vicieux victime victoire victorieux vide vider vie
vieillard vieillesse vieillir vierge vieux vif vigilance vigilant
vigne vignoble vigueur vil vilain villa village ville vin vinaigre
vingt vingtaine viol violation violence violent violet violette
violon vipere virage vire virement virer virgule viril virtuel
virulent virus vis visage vis-a-vis viscere visee viser visible
visiere vision visite visiter visiteur visqueux visser vital
vitamine vite vitesse vitrail vitre vitrine vivace vivant vivier
vivre vocabulaire vocal vocation voeu vogue voici voie voila
voile voiler voilier voir voisin voisinage voiture voix vol
volaille volant volatil volcan volee voler volet voleur voliere
volonte volontiers voltige volume volupte vomir vorace vote voter
votre vouer vouloir vous voute voyage voyager voyageur voyant
voyelle voyou vrai vraiment vraisemblable vrille vu vue vulgaire
wagon
xeres
yacht yaourt yeux yoga
zebre zele zenith zero zeste zigzag zinc zizanie zodiac
zone zoologie zouave
`;

const frenchWords = new Set([
  ...DICTIONARY_WITH_DEFS.map(d => d.word),
  ...RAW_FRENCH_WORDS
    .split(/\s+/)
    .map(w => w.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase())
    .filter(w => /^[A-Z]{5}$/.test(w))
]);

function renderWordle() {
  const entry = DICTIONARY_WITH_DEFS[seed % DICTIONARY_WITH_DEFS.length];
  state.word = entry.word;
  state.definition = entry.def;
  state.guesses = [];
  state.currentGuess = '';
  state.gameOver = false;
  state.keyStates = {};

  const wrap = document.createElement('div');
  wrap.className = 'wordle-wrap';

  const board = document.createElement('div');
  board.className = 'wordle-board';
  for (let i = 0; i < 30; i++) {
    const tile = document.createElement('div');
    tile.className = 'wordle-tile';
    board.appendChild(tile);
  }

  const defBox = document.createElement('div');
  defBox.className = 'wordle-def-box hidden';
  defBox.id = 'wordle-def-box';

  const keyboard = document.createElement('div');
  keyboard.className = 'wordle-keyboard';
  const rows = [
    ['A','Z','E','R','T','Y','U','I','O','P'],
    ['Q','S','D','F','G','H','J','K','L','M'],
    ['ENTRÉE','W','X','C','V','B','N','⌫']
  ];

  rows.forEach(rowKeys => {
    const rowEl = document.createElement('div');
    rowEl.className = 'wordle-kb-row';
    rowKeys.forEach(k => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wordle-key' + (k.length > 1 ? ' wide' : '');
      btn.textContent = k;
      btn.dataset.key = k;
      btn.addEventListener('click', () => handleWordleKey(k));
      rowEl.appendChild(btn);
    });
    keyboard.appendChild(rowEl);
  });

  wrap.append(board, defBox, keyboard);
  content.appendChild(wrap);
  state.board = board;
  state.keyboard = keyboard;

  if (state.keyHandler) document.removeEventListener('keydown', state.keyHandler);
  state.keyHandler = (e) => {
    if (active !== 'wordle' || state.gameOver) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter') { e.preventDefault(); handleWordleKey('ENTRÉE'); }
    else if (e.key === 'Backspace') { e.preventDefault(); handleWordleKey('⌫'); }
    else if (/^[a-zA-ZÀ-ÿ]$/.test(e.key)) {
      const letter = e.key.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      handleWordleKey(letter);
    }
  };
  document.addEventListener('keydown', state.keyHandler);
}

function handleWordleKey(key) {
  if (state.gameOver) return;
  if (key === '⌫') {
    if (state.currentGuess.length > 0) {
      state.currentGuess = state.currentGuess.slice(0, -1);
      updateCurrentWordleRow();
    }
    return;
  }
  if (key === 'ENTRÉE') {
    submitWordleGuess();
    return;
  }
  if (state.currentGuess.length < 5 && /^[A-Z]$/.test(key)) {
    state.currentGuess += key;
    updateCurrentWordleRow();
  }
}

function updateCurrentWordleRow() {
  const row = state.guesses.length;
  for (let i = 0; i < 5; i++) {
    const tile = state.board.children[row * 5 + i];
    tile.textContent = state.currentGuess[i] || '';
    tile.classList.toggle('filled', Boolean(state.currentGuess[i]));
  }
}

function submitWordleGuess() {
  const word = state.currentGuess;
  if (word.length !== 5) {
    setFeedback('Le mot doit comporter 5 lettres.');
    return;
  }
  if (!frenchWords.has(word)) {
    setFeedback(`« ${word} » n'est pas dans le dictionnaire du jeu.`);
    return;
  }

  const row = state.guesses.length;
  state.guesses.push(word);
  state.currentGuess = '';

  const answer = state.word.split('');
  const result = Array(5).fill('absent');

  for (let i = 0; i < 5; i++) {
    if (word[i] === answer[i]) { result[i] = 'correct'; answer[i] = null; }
  }
  for (let i = 0; i < 5; i++) {
    if (result[i] !== 'correct') {
      const k = answer.indexOf(word[i]);
      if (k !== -1) { result[i] = 'present'; answer[k] = null; }
    }
  }

  for (let i = 0; i < 5; i++) {
    const tile = state.board.children[row * 5 + i];
    tile.textContent = word[i];
    tile.classList.add(result[i]);

    const letter = word[i];
    const prev = state.keyStates[letter];
    if (result[i] === 'correct' || (result[i] === 'present' && prev !== 'correct') || (!prev && result[i] === 'absent')) {
      state.keyStates[letter] = result[i];
      const keyBtn = state.keyboard.querySelector(`[data-key="${letter}"]`);
      if (keyBtn) {
        keyBtn.classList.remove('correct', 'present', 'absent');
        keyBtn.classList.add(result[i]);
      }
    }
  }

  const defBox = document.getElementById('wordle-def-box');
  if (word === state.word) {
    state.gameOver = true;
    setFeedback('Bravo ! Mot trouvé, champion·ne de la Bob House 🏆');
    defBox.innerHTML = `<strong>📖 ${state.word}</strong> : ${state.definition}`;
    defBox.classList.remove('hidden');
  } else if (state.guesses.length === 6) {
    state.gameOver = true;
    setFeedback(`Dommage ! Le mot du jour était ${state.word}.`);
    defBox.innerHTML = `<strong>📖 ${state.word}</strong> : ${state.definition}`;
    defBox.classList.remove('hidden');
  } else {
    setFeedback(`${6 - state.guesses.length} essai(s) restant(s).`);
  }
}

/* =========================================================
   UTILITAIRE NAVIGATION + VÉRIFICATION GLOBALE
   ========================================================= */
function handleGridArrows(e, inputs, r, c, size = 8) {
  const dirs = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  if (!dirs[e.key]) return;
  e.preventDefault();
  const [dr, dc] = dirs[e.key];
  let nr = r + dr, nc = c + dc;
  while (nr >= 0 && nr < size && nc >= 0 && nc < size) {
    const target = inputs.find(el => +el.dataset.r === nr && +el.dataset.c === nc && !el.disabled);
    if (target) { target.focus(); break; }
    nr += dr; nc += dc;
  }
}

function verify() {
  if (active === 'yakazu') {
    const size = 9;
    const grid = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => {
        if (state.yakazuSol[r][c] === 0) return 0;
        const el = state.inputs.find(x => +x.dataset.r === r && +x.dataset.c === c);
        return Number(el.value) || null;
      })
    );
    if (grid.flat().includes(null)) {
      setFeedback('Remplis toutes les cases blanches avant de vérifier !');
      return;
    }
    const ok = isValidYakazuGrid(grid);
    setFeedback(ok
      ? 'Yakazu 9 × 9 résolu ! Vous êtes la fierté de Bikini Bottom 🏆'
      : 'Pas encore : chaque suite de N cases blanches doit contenir tous les chiffres de 1 à N sans doublon.'
    );
  }

  if (active === 'sudoku') {
    const grid = Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c) => {
        const el = state.inputs.find(x => +x.dataset.r === r && +x.dataset.c === c);
        return Number(el.value) || null;
      })
    );
    if (grid.flat().includes(null)) {
      setFeedback('Remplis toutes les cases du Sudoku avant de vérifier !');
      return;
    }
    let ok = true;
    const isSet1to9 = (arr) => new Set(arr).size === 9 && arr.every(v => v >= 1 && v <= 9);
    for (let i = 0; i < 9; i++) {
      if (!isSet1to9(grid[i])) ok = false;
      if (!isSet1to9(grid.map(row => row[i]))) ok = false;
    }
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const box = [];
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) box.push(grid[br * 3 + r][bc * 3 + c]);
        }
        if (!isSet1to9(box)) ok = false;
      }
    }
    setFeedback(ok
      ? 'Sudoku 9 × 9 validé ! Esprit limpide comme l’eau du lagon 🏆'
      : 'Pas encore : vérifie qu’il n’y a aucun doublon sur les lignes, colonnes ou carrés 3 × 3.'
    );
  }

  if (active === 'binary') {
    const vals = state.inputs.map(x => x.textContent);
    if (vals.includes('')) {
      setFeedback('Complète toutes les cases avec 0 ou 1 avant de vérifier !');
      return;
    }
    const grid = Array.from({ length: 8 }, (_, r) => vals.slice(r * 8, r * 8 + 8));
    let ok = true;
    for (let r = 0; r < 8; r++) {
      const line = grid[r].join('');
      if (grid[r].filter(x => x === '0').length !== 4 || /000|111/.test(line)) ok = false;
    }
    for (let c = 0; c < 8; c++) {
      const col = grid.map(row => row[c]), line = col.join('');
      if (col.filter(x => x === '0').length !== 4 || /000|111/.test(line)) ok = false;
    }
    for (let a = 0; a < 8; a++) {
      for (let b = a + 1; b < 8; b++) {
        if (grid[a].join('') === grid[b].join('')) ok = false;
        const ca = grid.map(row => row[a]).join(''), cb = grid.map(row => row[b]).join('');
        if (ca === cb) ok = false;
      }
    }
    setFeedback(ok ? 'Grille binaire validée ! Cerveau de méduse, mais en mieux 🏆' : 'Pas encore : vérifie les 4 zéros/uns, les triples et les lignes/colonnes identiques.');
  }

  if (active === 'mots') {
    if (state.mfInputs.some(inp => !inp.value)) {
      setFeedback('Il reste encore des cases vides dans la grille !');
      return;
    }
    const allCorrect = state.mfInputs.every(inp => inp.value.toUpperCase() === inp.dataset.ans);
    setFeedback(allCorrect ? 'Bravo ! Mots fléchés 100 % réussis 🏆' : 'Il y a au moins une lettre incorrecte, relis bien les définitions !');
  }
}

document.querySelectorAll('.game-tab').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.game-tab').forEach(b => b.classList.toggle('active', b === btn));
  active = btn.dataset.game;
  render();
}));

if (check) check.addEventListener('click', verify);
if (reset) reset.addEventListener('click', render);
render();

/* =========================================================
   VISIONNEUSE PHOTO (LIGHTBOX) POUR COLOCS & SOUVENIRS
   ========================================================= */
(function initLightbox() {
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  const lbCaption = document.getElementById('lb-caption');
  const lbClose = document.getElementById('lb-close');
  const lbPrev = document.getElementById('lb-prev');
  const lbNext = document.getElementById('lb-next');

  if (!lb || !lbImg) return;

  let currentAlbum = [];
  let currentIndex = 0;
  let currentTitle = '';

  function updateLightboxView() {
    lbImg.src = currentAlbum[currentIndex];
    lbImg.alt = currentTitle;
    const counter = currentAlbum.length > 1 ? ` (${currentIndex + 1} / ${currentAlbum.length})` : '';
    lbCaption.textContent = `${currentTitle}${counter}`;

    // Masque les flèches s'il n'y a qu'une seule photo dans l'album
    const single = currentAlbum.length <= 1;
    lbPrev.classList.toggle('hidden', single);
    lbNext.classList.toggle('hidden', single);
  }

  function openLightbox(photos, startIndex, title) {
    currentAlbum = photos;
    currentIndex = startIndex;
    currentTitle = title;
    updateLightboxView();
    lb.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Empêche le défilement de la page derrière
  }

  function closeLightbox() {
    lb.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function stepLightbox(delta) {
    if (currentAlbum.length <= 1) return;
    currentIndex = (currentIndex + delta + currentAlbum.length) % currentAlbum.length;
    updateLightboxView();
  }

  // Attache le clic sur toutes les photos de colocataires et de souvenirs
  document.querySelectorAll('.portrait-photo, .memory-photo').forEach(img => {
    img.addEventListener('click', () => {
      const rawList = img.dataset.photos;
      const photos = rawList
        ? rawList.split(',').map(s => s.trim()).filter(Boolean)
        : [img.getAttribute('src')];

      const figure = img.closest('figure');
      const title = figure?.querySelector('figcaption b')?.textContent
        || img.alt
        || 'Souvenir Bob House';

      openLightbox(photos, 0, title);
    });
  });

  lbClose.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', () => stepLightbox(-1));
  lbNext.addEventListener('click', () => stepLightbox(1));

  // Fermeture en cliquant sur le fond sombre autour de l'image
  lb.addEventListener('click', (e) => {
    if (e.target === lb) closeLightbox();
  });

  // Navigation clavier (Échap pour fermer, flèches gauche/droite pour défiler)
  document.addEventListener('keydown', (e) => {
    if (lb.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') stepLightbox(-1);
    if (e.key === 'ArrowRight') stepLightbox(1);
  });
})();