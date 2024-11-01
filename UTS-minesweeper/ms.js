let SIZE = 40;
let canvas = document.getElementById('canvas');
let restartButton = document.getElementById('restart');
let startButton = document.getElementById('start');
let rowsInput = document.getElementById('rows');
let colsInput = document.getElementById('cols');
let notification = document.getElementById('notification');
let notificationMessage = document.getElementById('notification-message');
let closeNotificationButton = document.getElementById('close-notification');
let timerElement = document.getElementById('timer');

let cells = new Map();
let failedBombKey = null;
let revealedKeys = new Set();
let flaggedKeys = new Set();
let map;
let ROWS = 9;
let COLS = 9;
let timerInterval;
let elapsedTime = 0;
let gameStarted = false; // New variable to track game start

function toKey(row, col) {
    return row + '-' + col;
}

function fromKey(key) {
    return key.split('-').map(Number);
}

function createButtons() {
    canvas.style.width = COLS * SIZE + 'px';
    canvas.style.height = ROWS * SIZE + 'px';
    for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
            let key = toKey(i, j);
            let cell = document.createElement('button');
            cell.style.float = 'left';
            cell.style.width = SIZE + 'px';
            cell.style.height = SIZE + 'px';

            cell.oncontextmenu = (e) => {
                e.preventDefault();
                if (failedBombKey === null) {
                    toggleFlag(key);
                    updateButtons();
                }
            };
            cell.onclick = (e) => {
                if (failedBombKey === null && !flaggedKeys.has(key)) {
                    if (!gameStarted) {
                        startTimer(); // Start the timer on the first click
                        gameStarted = true; // Mark the game as started
                    }
                    revealCell(key);
                    updateButtons();
                }
            };

            canvas.appendChild(cell);
            cells.set(key, cell);
        }
    }
}

function startTimer() {
    elapsedTime = 0;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        elapsedTime++;
        timerElement.textContent = `Time: ${elapsedTime}s`;
    }, 1000);
}

function startGame() {
    ROWS = parseInt(rowsInput.value);
    COLS = parseInt(colsInput.value);

    failedBombKey = null;
    revealedKeys.clear();
    flaggedKeys.clear();
    cells.clear();
    map = generateMap(generateBombs());

    canvas.innerHTML = '';
    createButtons();
    updateButtons();
    restartButton.style.display = 'none';
    notification.style.display = 'none';

    gameStarted = false;

    elapsedTime = 0;
    timerElement.textContent = `Time: ${elapsedTime}s`;
    clearInterval(timerInterval);
}


function updateButtons() {
    let isGameOver = failedBombKey !== null;
    let isGameWon = revealedKeys.size === ROWS * COLS - Array.from(map.values()).filter(v => v === 'bomb').length;

    for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
            let key = toKey(i, j);
            let cell = cells.get(key);

            cell.style.backgroundColor = '';
            cell.style.color = 'black';
            cell.textContent = '';
            cell.disabled = false;

            let value = map.get(key);
            if (isGameOver && value === 'bomb') {
                cell.textContent = '💣';
                if (key === failedBombKey) {
                    cell.style.backgroundColor = 'red';
                }
            } else if (revealedKeys.has(key)) {
                cell.disabled = true;
                if (value === undefined) {
                } else if (value === 1) {
                    cell.textContent = '1';
                    cell.style.color = 'blue';
                } else if (value === 2) {
                    cell.textContent = '2';
                    cell.style.color = 'green';
                } else if (value >= 3) {
                    cell.textContent = value;
                    cell.style.color = 'red';
                }
            } else if (flaggedKeys.has(key)) {
                cell.textContent = '🚩';
            }
        }
    }

    canvas.style.pointerEvents = (isGameOver || isGameWon) ? 'none' : '';
    restartButton.style.display = isGameOver ? 'block' : 'none';
}

function toggleFlag(key) {
    if (flaggedKeys.has(key)) {
        flaggedKeys.delete(key);
    } else {
        flaggedKeys.add(key);
    }
}

function revealCell(key) {
    if (map.get(key) === 'bomb') {
        failedBombKey = key;
        showNotification("Game Over! You hit a bomb.");
    } else {
        propagateReveal(key, new Set());

        if (revealedKeys.size === ROWS * COLS - Array.from(map.values()).filter(v => v === 'bomb').length) {
            showNotification("Congratulations! You won!");
        }
    }
}

function propagateReveal(key, visited) {
    revealedKeys.add(key);
    visited.add(key);

    let isEmpty = !map.has(key);
    if (isEmpty) {
        for (let neighborKey of getNeighbors(key)) {
            if (!visited.has(neighborKey)) {
                propagateReveal(neighborKey, visited);
            }
        }
    }
}

function isInBounds([row, col]) {
    return row >= 0 && col >= 0 && row < ROWS && col < COLS;
}

function getNeighbors(key) {
    let [row, col] = fromKey(key);
    let neighborRowCols = [
        [row - 1, col - 1],
        [row - 1, col],
        [row - 1, col + 1],
        [row, col - 1],
        [row, col + 1],
        [row + 1, col - 1],
        [row + 1, col],
        [row + 1, col + 1],
    ];
    return neighborRowCols
        .filter(isInBounds)
        .map(([r, c]) => toKey(r, c));
}

function generateBombs() {
    let count = Math.round(Math.sqrt(ROWS * COLS));
    let bombs = [];
    let allKeys = [];
    for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
            allKeys.push(toKey(i, j));
        }
    }
    allKeys.sort(() => (Math.random() > 0.5 ? 1 : -1));
    return allKeys.slice(0, count);
}

function generateMap(seedBombs) {
    let map = new Map();

    function incrementDanger(neighborKey) {
        if (!map.has(neighborKey)) {
            map.set(neighborKey, 1);
        } else {
            let oldVal = map.get(neighborKey);
            if (oldVal !== 'bomb') {
                map.set(neighborKey, oldVal + 1);
            }
        }
    }

    for (let key of seedBombs) {
        map.set(key, 'bomb');
        for (let neighborKey of getNeighbors(key)) {
            incrementDanger(neighborKey);
        }
    }
    return map;
}

function showNotification(message) {
    clearInterval(timerInterval);
    notificationMessage.textContent = message;
    notification.style.display = 'block';
}

closeNotificationButton.onclick = () => {
    notification.style.display = 'none';
};

startButton.onclick = startGame;
restartButton.onclick = startGame;

startGame();