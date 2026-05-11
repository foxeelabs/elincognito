let wordDatabase = {
    "Comida": [],
    "Lugares": [],
    "Películas": [],
    "Objetos": [],
    "Animales": []
};

// Cargar categorías desde los scripts incluidos
function loadCategories() {
    wordDatabase["Comida"] = window.dataComida || [];
    wordDatabase["Lugares"] = window.dataLugares || [];
    wordDatabase["Películas"] = window.dataPeliculas || [];
    wordDatabase["Objetos"] = window.dataObjetos || [];
    wordDatabase["Animales"] = window.dataAnimales || [];
    console.log("Categorías cargadas exitosamente (modo local)");
}

// Estado del juego
let state = {
    players: [],
    impostorsCount: 1,
    selectedCategories: ["Comida", "Lugares", "Películas", "Objetos", "Animales"],
    usedWords: [],
    impostorHistory: {},
    allowImpostorStart: false,

    // Variables de persistencia de partida
    isActiveRound: false,
    currentScreen: 'config-screen',
    roundData: {
        word: "",
        impostors: [],
        revealIndex: 0,
        starter: ""
    }
};

// Referencias DOM
const screens = {
    config: document.getElementById('config-screen'),
    revealRoles: document.getElementById('role-reveal-screen'),
    game: document.getElementById('game-screen'),
    confirmReveal: document.getElementById('confirm-reveal-screen'),
    results: document.getElementById('results-screen')
};

const dom = {
    playerInput: document.getElementById('new-player-input'),
    addPlayerBtn: document.getElementById('add-player-btn'),
    clearPlayersBtn: document.getElementById('clear-players-btn'),
    playersList: document.getElementById('players-list'),
    playersCountBadge: document.getElementById('players-count-badge'),
    impostorsCountDisplay: document.getElementById('impostors-count'),
    decImpostorsBtn: document.getElementById('dec-impostors'),
    incImpostorsBtn: document.getElementById('inc-impostors'),
    categoryCheckboxes: document.querySelectorAll('.category-label input'),
    allowImpostorStartCb: document.getElementById('allow-impostor-start-cb'),
    validationMsg: document.getElementById('validation-msg'),
    startBtn: document.getElementById('start-btn'),
    resetBtn: document.getElementById('reset-btn'),

    // Collapsible
    playersCard: document.getElementById('players-card'),
    playersToggle: document.getElementById('players-toggle'),

    // Reveal screen
    interactiveCard: document.getElementById('interactive-card'),
    cardFront: document.querySelector('.card-front'),
    cardBack: document.querySelector('.card-back'),
    revealPlayerName: document.getElementById('reveal-player-name'),
    revealSecretInfo: document.getElementById('reveal-secret-info'),
    nextPlayerBtn: document.getElementById('next-player-btn'),
    prevPlayerBtn: document.getElementById('prev-player-btn'),
    revealProgress: document.getElementById('reveal-progress'),

    // Game screen
    starterName: document.getElementById('starter-name'),
    revealBtn: document.getElementById('reveal-btn'),

    // Confirmation & Results screens
    confirmYesBtn: document.getElementById('confirm-yes-btn'),
    confirmNoBtn: document.getElementById('confirm-no-btn'),
    secretWord: document.getElementById('secret-word'),
    impostorsListDisplay: document.getElementById('impostors-list'),
    nextRoundBtn: document.getElementById('next-round-btn')
};

// Variables Globales de la interfaz
let currentWord = "";
let currentImpostors = [];
let currentRevealIndex = 0;
let currentStarter = "";

// Inicialización
function init() {
    loadCategories();
    loadState();

    if (dom.allowImpostorStartCb) {
        dom.allowImpostorStartCb.checked = state.allowImpostorStart || false;
    }

    renderPlayers();
    updateImpostorsDisplay();
    validateStart();
    setupEventListeners();
    restoreActiveGame();
}

// LocalStorage
function loadState() {
    const saved = localStorage.getItem('elIncognitoState');
    if (saved) {
        // Asegurar retrocompatibilidad combinando el estado guardado con la estructura por defecto
        state = { ...state, ...JSON.parse(saved) };
    }
}

// Función para cambiar de pantalla y guardarlo
function switchScreen(screenId) {
    Object.values(screens).forEach(s => s.classList.remove('active'));

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        state.currentScreen = screenId;
        saveState();
    }
}

function saveState() {
    localStorage.setItem('elIncognitoState', JSON.stringify(state));
}

// Gestión de Jugadores
function addPlayer() {
    const name = dom.playerInput.value.trim();
    if (name && !state.players.includes(name)) {
        state.players.push(name);
        dom.playerInput.value = '';
        saveState();
        renderPlayers();
        validateStart();
    }
}

function removePlayer(name) {
    state.players = state.players.filter(p => p !== name);
    saveState();
    renderPlayers();
    validateStart();
}

function clearPlayers() {
    if (state.players && state.players.length > 0) {
        state.players = [];
        saveState();
        renderPlayers();
        validateStart();

        // Dar algo de feedback visual al usuario
        const originalText = dom.clearPlayersBtn.innerHTML;
        dom.clearPlayersBtn.innerHTML = "✅ ¡Borrados!";
        setTimeout(() => {
            dom.clearPlayersBtn.innerHTML = originalText;
        }, 2000);
    } else {
        const originalText = dom.clearPlayersBtn.innerHTML;
        dom.clearPlayersBtn.innerHTML = "La lista ya está vacía";
        setTimeout(() => {
            dom.clearPlayersBtn.innerHTML = originalText;
        }, 2000);
    }
}

function renderPlayers() {
    dom.playersList.innerHTML = '';
    // Actualizar contador en el header
    dom.playersCountBadge.textContent = `(${state.players.length})`;

    state.players.forEach((player, index) => {
        const li = document.createElement('li');
        li.className = 'player-item';

        const span = document.createElement('span');
        span.textContent = `${index + 1}.- ${player}`;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'player-actions';

        const upBtn = document.createElement('button');
        upBtn.className = 'move-player';
        upBtn.innerHTML = '↑';
        upBtn.disabled = index === 0;
        upBtn.onclick = () => movePlayer(index, -1);

        const downBtn = document.createElement('button');
        downBtn.className = 'move-player';
        downBtn.innerHTML = '↓';
        downBtn.disabled = index === state.players.length - 1;
        downBtn.onclick = () => movePlayer(index, 1);

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-player';
        delBtn.innerHTML = '×';
        delBtn.onclick = () => removePlayer(player);

        actionsDiv.appendChild(upBtn);
        actionsDiv.appendChild(downBtn);
        actionsDiv.appendChild(delBtn);

        li.appendChild(span);
        li.appendChild(actionsDiv);
        dom.playersList.appendChild(li);
    });

    // Auto-scroll al fondo para que se vea el último jugador agregado
    const listContainer = document.querySelector('.list-container');
    if (listContainer) {
        listContainer.scrollTop = listContainer.scrollHeight;
    }
}

function movePlayer(index, direction) {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < state.players.length) {
        const temp = state.players[index];
        state.players[index] = state.players[newIndex];
        state.players[newIndex] = temp;
        saveState();
        renderPlayers();
    }
}

// Ajuste de Embusteros
function changeImpostors(delta) {
    const newVal = state.impostorsCount + delta;
    if (newVal >= 1 && newVal <= 10) {
        state.impostorsCount = newVal;
        updateImpostorsDisplay();
        saveState();
        validateStart();
    }
}

function updateImpostorsDisplay() {
    dom.impostorsCountDisplay.textContent = state.impostorsCount;
}

// Validación antes de iniciar
function getSelectedCategories() {
    return Array.from(dom.categoryCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
}

function validateStart() {
    let isValid = true;
    let msg = "";

    const numPlayers = state.players.length;
    const numImpostors = state.impostorsCount;
    const activeCategories = getSelectedCategories();

    if (numPlayers < 3) {
        msg = "Se necesitan al menos 3 jugadores.";
        isValid = false;
    } else if (numImpostors >= numPlayers) {
        msg = "Debe haber menos incógnitos que jugadores.";
        isValid = false;
    } else if (activeCategories.length === 0) {
        msg = "Selecciona al menos una categoría.";
        isValid = false;
    }

    dom.validationMsg.textContent = msg;
    dom.startBtn.disabled = !isValid;
    return isValid;
}

// Lógica de Juego Principal
function prepareGame() {
    if (!validateStart()) return;

    const activeCategories = getSelectedCategories();

    // Función auxiliar para obtener palabras disponibles de una categoría
    const getAvailableWordsForCategory = (cat) => {
        // Verificar si la categoría existe y tiene datos cargados
        if (!wordDatabase[cat] || wordDatabase[cat].length === 0) return [];
        return wordDatabase[cat].filter(w => !state.usedWords.includes(w));
    };

    // Filtrar categorías que aún tienen palabras disponibles
    let validCategories = activeCategories.filter(cat => getAvailableWordsForCategory(cat).length > 0);

    // Si todas las categorías seleccionadas se agotaron, reiniciar usadas para esas categorías
    if (validCategories.length === 0) {
        alert("¡Se han usado todas las palabras de estas categorías! Se reiniciará la lista de palabras.");
        activeCategories.forEach(cat => {
            if (wordDatabase[cat]) {
                wordDatabase[cat].forEach(w => {
                    state.usedWords = state.usedWords.filter(used => used !== w);
                });
            }
        });
        validCategories = activeCategories.filter(cat => getAvailableWordsForCategory(cat).length > 0);

        // Si sigue vacía (ej. error cargando JSON), cancelar
        if (validCategories.length === 0) {
            alert("Error: No se pudieron cargar las palabras. Asegúrate de ejecutar el juego en un servidor local.");
            return;
        }
    }

    // 1. Escoger categoría aleatoria
    const randomCategoryIndex = Math.floor(Math.random() * validCategories.length);
    const chosenCategory = validCategories[randomCategoryIndex];

    // 2. Escoger palabra aleatoria dentro de esa categoría
    const categoryAvailableWords = getAvailableWordsForCategory(chosenCategory);
    const wordIndex = Math.floor(Math.random() * categoryAvailableWords.length);
    currentWord = categoryAvailableWords[wordIndex];

    // Asignar embusteros con aleatoriedad equitativa y límite de racha
    if (!state.impostorHistory) state.impostorHistory = {};

    // Asegurar registro de todos los jugadores actuales
    state.players.forEach(p => {
        if (!state.impostorHistory[p]) {
            state.impostorHistory[p] = { consecutive: 0, total: 0 };
        }
    });

    // Separar jugadores que NO pueden ser incógnitos por racha (máximo 2 veces seguidas)
    let eligiblePlayers = state.players.filter(p => state.impostorHistory[p].consecutive < 2);

    // Fallback: si el límite deja muy pocos elegibles, lo ignoramos temporalmente
    if (eligiblePlayers.length < state.impostorsCount) {
        eligiblePlayers = [...state.players];
    }

    // Algoritmo de "Rifa con Boletos": Damos más boletos a quienes menos han sido incógnitos
    let maxTotal = Math.max(...eligiblePlayers.map(p => state.impostorHistory[p].total));
    if (maxTotal === -Infinity) maxTotal = 0;

    let tickets = [];
    eligiblePlayers.forEach(p => {
        // Fórmula: el que menos veces ha sido, recibe más boletos. +1 asegura que todos tengan al menos 1 boleto.
        let playerTickets = (maxTotal - state.impostorHistory[p].total) + 1;
        for (let i = 0; i < playerTickets; i++) {
            tickets.push(p);
        }
    });

    // Sacar a los incógnitos de la rifa
    currentImpostors = [];
    for (let i = 0; i < state.impostorsCount; i++) {
        if (tickets.length === 0) break;
        let randomTicketIndex = Math.floor(Math.random() * tickets.length);
        let chosen = tickets[randomTicketIndex];
        currentImpostors.push(chosen);

        // Quitar todos los boletos del jugador recién elegido para evitar elegirlo doble en esta ronda
        tickets = tickets.filter(t => t !== chosen);
    }

    // Si por algo faltó asignar, completamos aleatoriamente con los elegibles restantes
    if (currentImpostors.length < state.impostorsCount) {
        let remaining = eligiblePlayers.filter(p => !currentImpostors.includes(p));
        let shuffledRemaining = remaining.sort(() => 0.5 - Math.random());
        currentImpostors = currentImpostors.concat(shuffledRemaining.slice(0, state.impostorsCount - currentImpostors.length));
    }

    // Actualizar el historial para la próxima ronda
    state.players.forEach(p => {
        if (currentImpostors.includes(p)) {
            state.impostorHistory[p].consecutive += 1;
            state.impostorHistory[p].total += 1;
        } else {
            state.impostorHistory[p].consecutive = 0; // Se resetea la racha si no fue incógnito
        }
    });

    // Seleccionar quién empieza
    let possibleStarters;
    if (state.allowImpostorStart) {
        possibleStarters = state.players;
    } else {
        possibleStarters = state.players.filter(p => !currentImpostors.includes(p));
    }

    const starter = possibleStarters.length > 0
        ? possibleStarters[Math.floor(Math.random() * possibleStarters.length)]
        : currentImpostors[0]; // Fallback por si todos son incógnitos
    currentStarter = starter;

    // Guardar estado de la ronda
    state.isActiveRound = true;
    state.roundData = {
        word: currentWord,
        impostors: currentImpostors,
        revealIndex: 0,
        starter: currentStarter
    };
    saveState();

    // Actualizar UI para pantalla de juego
    dom.starterName.textContent = currentStarter;

    // Llenar datos ocultos
    dom.secretWord.textContent = currentWord;
    dom.impostorsListDisplay.innerHTML = '';
    currentImpostors.forEach(imp => {
        const li = document.createElement('li');
        li.textContent = imp;
        dom.impostorsListDisplay.appendChild(li);
    });

    // Iniciar fase de revelación
    startRevealPhase();
}

// Restaurar partida activa tras un recargo de la página
function restoreActiveGame() {
    if (state.isActiveRound) {
        currentWord = state.roundData.word;
        currentImpostors = state.roundData.impostors;
        currentRevealIndex = state.roundData.revealIndex;
        currentStarter = state.roundData.starter;

        // Restaurar elementos de UI estáticos
        dom.starterName.textContent = currentStarter;
        dom.secretWord.textContent = currentWord;
        dom.impostorsListDisplay.innerHTML = '';
        currentImpostors.forEach(imp => {
            const li = document.createElement('li');
            li.textContent = imp;
            dom.impostorsListDisplay.appendChild(li);
        });

        // Actualizar pantalla de revelación si estamos en ella
        if (state.currentScreen === 'role-reveal-screen') {
            updateRevealScreen();
        }

        // Ir a la pantalla donde nos quedamos
        switchScreen(state.currentScreen);
    } else {
        switchScreen('config-screen');
    }
}

// Fase de revelación de roles
function startRevealPhase() {
    currentRevealIndex = 0;
    state.roundData.revealIndex = currentRevealIndex;
    updateRevealScreen();

    switchScreen('role-reveal-screen');
}

function updateRevealScreen() {
    const player = state.players[currentRevealIndex];

    // Configurar frente de la carta
    dom.revealPlayerName.textContent = player;

    // Configurar reverso de la carta
    if (currentImpostors.includes(player)) {
        dom.revealSecretInfo.innerHTML = `<span class="reveal-prefix">hoy eres TU el</span><br>[ Incógnito ]`;
        dom.revealSecretInfo.style.color = "var(--text-main)";
    } else {
        dom.revealSecretInfo.innerHTML = `<span class="reveal-prefix">la palabra es</span><br>[ ${currentWord} ]`;
        dom.revealSecretInfo.style.color = "var(--text-main)";
    }

    // Ocultar carta por defecto
    dom.cardFront.classList.remove('hidden');
    dom.cardBack.classList.add('hidden');

    // Actualizar progreso
    dom.revealProgress.textContent = `Jugador ${currentRevealIndex + 1} de ${state.players.length}`;

    // Configurar botones
    if (currentRevealIndex < state.players.length - 1) {
        const nextPlayer = state.players[currentRevealIndex + 1];
        dom.nextPlayerBtn.textContent = `Siguiente (${nextPlayer})`;
    } else {
        dom.nextPlayerBtn.textContent = "¡Jugar!";
    }

    if (currentRevealIndex > 0) {
        const prevPlayer = state.players[currentRevealIndex - 1];
        dom.prevPlayerBtn.textContent = `Anterior (${prevPlayer})`;
        dom.prevPlayerBtn.style.display = 'block';
    } else {
        dom.prevPlayerBtn.style.display = 'none';
    }
}

function nextReveal() {
    if (currentRevealIndex < state.players.length - 1) {
        currentRevealIndex++;
        state.roundData.revealIndex = currentRevealIndex;
        saveState();
        updateRevealScreen();
    } else {
        // Termina revelación, ir a juego activo
        switchScreen('game-screen');
    }
}

function prevReveal() {
    if (currentRevealIndex > 0) {
        currentRevealIndex--;
        state.roundData.revealIndex = currentRevealIndex;
        saveState();
        updateRevealScreen();
    }
}

function showCard() {
    dom.cardFront.classList.add('hidden');
    dom.cardBack.classList.remove('hidden');
}

function hideCard() {
    dom.cardFront.classList.remove('hidden');
    dom.cardBack.classList.add('hidden');
}

function revealImpostors() {
    switchScreen('confirm-reveal-screen');
}

function confirmReveal() {
    switchScreen('results-screen');
}

function cancelReveal() {
    switchScreen('game-screen');
}

function nextRound() {
    // Registrar palabra como usada
    state.usedWords.push(currentWord);

    // Finalizar partida
    state.isActiveRound = false;
    saveState();

    // Regresar a pantalla principal
    switchScreen('config-screen');
}

function resetSession() {
    if (confirm("¿Estás seguro de que quieres reiniciar la sesión? Esto borrará el historial de palabras usadas y la lista de jugadores.")) {
        state.players = [];
        state.impostorsCount = 1;
        state.usedWords = [];
        state.impostorHistory = {};
        state.isActiveRound = false;
        saveState();

        renderPlayers();
        updateImpostorsDisplay();
        validateStart();
        switchScreen('config-screen');

        dom.categoryCheckboxes.forEach(cb => cb.checked = true);
    }
}

// Event Listeners
function setupEventListeners() {
    dom.addPlayerBtn.addEventListener('click', addPlayer);
    dom.clearPlayersBtn.addEventListener('click', clearPlayers);
    dom.playerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addPlayer();
    });

    dom.decImpostorsBtn.addEventListener('click', () => changeImpostors(-1));
    dom.incImpostorsBtn.addEventListener('click', () => changeImpostors(1));

    dom.categoryCheckboxes.forEach(cb => {
        cb.addEventListener('change', validateStart);
    });

    if (dom.allowImpostorStartCb) {
        dom.allowImpostorStartCb.addEventListener('change', (e) => {
            state.allowImpostorStart = e.target.checked;
            saveState();
        });
    }

    dom.startBtn.addEventListener('click', prepareGame);
    dom.resetBtn.addEventListener('click', resetSession);

    dom.playersToggle.addEventListener('click', () => {
        dom.playersCard.classList.toggle('collapsed');
    });

    // Eventos de la carta de revelación
    dom.interactiveCard.addEventListener('mousedown', showCard);
    dom.interactiveCard.addEventListener('mouseup', hideCard);
    dom.interactiveCard.addEventListener('mouseleave', hideCard);

    dom.interactiveCard.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Evitar comportamientos por defecto como scroll o zoom
        showCard();
    });
    dom.interactiveCard.addEventListener('touchend', (e) => {
        e.preventDefault();
        hideCard();
    });
    dom.interactiveCard.addEventListener('touchcancel', hideCard);

    dom.nextPlayerBtn.addEventListener('click', nextReveal);
    dom.prevPlayerBtn.addEventListener('click', prevReveal);

    dom.revealBtn.addEventListener('click', revealImpostors);
    dom.confirmYesBtn.addEventListener('click', confirmReveal);
    dom.confirmNoBtn.addEventListener('click', cancelReveal);
    dom.nextRoundBtn.addEventListener('click', nextRound);
}

// Arrancar app
document.addEventListener('DOMContentLoaded', init);
