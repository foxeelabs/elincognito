// Datos iniciales
const wordDatabase = {
    "Comida": ["Tacos al pastor", "Tamales", "Pozole", "Chilaquiles", "Enchiladas", "Guacamole", "Elote en vaso", "Torta ahogada", "Mole", "Quesadillas", "Sopes", "Churros", "Barbacoa", "Carnitas", "Menudo"],
    "Lugares": ["Xochimilco", "Teotihuacán", "Zócalo", "Cancún", "Tulum", "Chichén Itzá", "Chapultepec", "Cenote", "Mercado", "Trajinera", "Palenque", "Acapulco", "Guanajuato", "Bellas Artes", "Coyoacán"],
    "Películas": ["Amores Perros", "Roma", "Nosotros los Nobles", "Coco", "El Laberinto del Fauno", "Macario", "Matando Cabos", "Y tu mamá también", "Rudo y Cursi", "La Ley de Herodes", "El Infierno", "Cantinflas"],
    "Objetos": ["Piñata", "Molcajete", "Trompo", "Balero", "Matraca", "Sombrero charro", "Zarape", "Alebrije", "Maracas", "Metate", "Comal", "Guitarrón", "Rebozo"]
};

// Estado del juego
let state = {
    players: [],
    impostorsCount: 1,
    usedWords: []
};

// Referencias DOM
const screens = {
    config: document.getElementById('config-screen'),
    game: document.getElementById('game-screen')
};

const dom = {
    playerInput: document.getElementById('new-player-input'),
    addPlayerBtn: document.getElementById('add-player-btn'),
    playersList: document.getElementById('players-list'),
    playersCountBadge: document.getElementById('players-count-badge'),
    impostorsCountDisplay: document.getElementById('impostors-count'),
    decImpostorsBtn: document.getElementById('dec-impostors'),
    incImpostorsBtn: document.getElementById('inc-impostors'),
    categoryCheckboxes: document.querySelectorAll('.category-label input'),
    validationMsg: document.getElementById('validation-msg'),
    startBtn: document.getElementById('start-btn'),
    resetBtn: document.getElementById('reset-btn'),
    
    // Collapsible
    playersCard: document.getElementById('players-card'),
    playersToggle: document.getElementById('players-toggle'),
    
    // Game screen
    starterName: document.getElementById('starter-name'),
    revealBtn: document.getElementById('reveal-btn'),
    revealArea: document.getElementById('reveal-area'),
    secretWord: document.getElementById('secret-word'),
    impostorsListDisplay: document.getElementById('impostors-list'),
    nextRoundBtn: document.getElementById('next-round-btn')
};

// Variables de ronda
let currentWord = "";
let currentImpostors = [];

// Inicialización
function init() {
    loadState();
    renderPlayers();
    updateImpostorsDisplay();
    validateStart();
    setupEventListeners();
}

// LocalStorage
function loadState() {
    const saved = localStorage.getItem('elIncognitoState');
    if (saved) {
        state = JSON.parse(saved);
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

function renderPlayers() {
    dom.playersList.innerHTML = '';
    // Actualizar contador en el header
    dom.playersCountBadge.textContent = `(${state.players.length})`;

    state.players.forEach((player, index) => {
        const li = document.createElement('li');
        li.className = 'player-item';
        
        const span = document.createElement('span');
        span.textContent = `${index + 1}.- ${player}`;
        
        const btn = document.createElement('button');
        btn.className = 'delete-player';
        btn.innerHTML = '×';
        btn.onclick = () => removePlayer(player);
        
        li.appendChild(span);
        li.appendChild(btn);
        dom.playersList.appendChild(li);
    });
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
function startGame() {
    if (!validateStart()) return;

    const activeCategories = getSelectedCategories();
    
    // Juntar todas las palabras posibles
    let pool = [];
    activeCategories.forEach(cat => {
        pool = pool.concat(wordDatabase[cat]);
    });

    // Filtrar las ya usadas
    let availableWords = pool.filter(w => !state.usedWords.includes(w));
    
    // Si se acabaron las palabras, reiniciar la lista de usadas solo para las categorias activas
    if (availableWords.length === 0) {
        alert("¡Se han usado todas las palabras de estas categorías! Se reiniciará la lista de palabras.");
        pool.forEach(w => {
            state.usedWords = state.usedWords.filter(used => used !== w);
        });
        availableWords = pool;
    }

    // Seleccionar palabra aleatoria
    const wordIndex = Math.floor(Math.random() * availableWords.length);
    currentWord = availableWords[wordIndex];
    
    // Asignar embusteros
    let shuffledPlayers = [...state.players].sort(() => 0.5 - Math.random());
    currentImpostors = shuffledPlayers.slice(0, state.impostorsCount);
    
    // Seleccionar quién empieza (que NO sea embustero)
    const innocents = shuffledPlayers.slice(state.impostorsCount);
    const starter = innocents[Math.floor(Math.random() * innocents.length)];

    // Actualizar UI para pantalla de juego
    dom.starterName.textContent = starter;
    
    // Ocultar area de revelar por defecto
    dom.revealArea.classList.add('hidden');
    dom.revealBtn.classList.remove('hidden');
    
    // Llenar datos ocultos
    dom.secretWord.textContent = currentWord;
    dom.impostorsListDisplay.innerHTML = '';
    currentImpostors.forEach(imp => {
        const li = document.createElement('li');
        li.textContent = imp;
        dom.impostorsListDisplay.appendChild(li);
    });

    // Cambiar de pantalla
    screens.config.classList.remove('active');
    screens.game.classList.add('active');
}

function revealImpostors() {
    dom.revealBtn.classList.add('hidden');
    dom.revealArea.classList.remove('hidden');
}

function nextRound() {
    // Registrar palabra como usada
    state.usedWords.push(currentWord);
    saveState();

    // Regresar a pantalla principal
    screens.game.classList.remove('active');
    screens.config.classList.add('active');
}

function resetSession() {
    if (confirm("¿Estás seguro de que quieres reiniciar la sesión? Esto borrará el historial de palabras usadas y la lista de jugadores.")) {
        state = {
            players: [],
            impostorsCount: 1,
            usedWords: []
        };
        saveState();
        renderPlayers();
        updateImpostorsDisplay();
        validateStart();
        
        dom.categoryCheckboxes.forEach(cb => cb.checked = true);
    }
}

// Event Listeners
function setupEventListeners() {
    dom.addPlayerBtn.addEventListener('click', addPlayer);
    dom.playerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addPlayer();
    });

    dom.decImpostorsBtn.addEventListener('click', () => changeImpostors(-1));
    dom.incImpostorsBtn.addEventListener('click', () => changeImpostors(1));

    dom.categoryCheckboxes.forEach(cb => {
        cb.addEventListener('change', validateStart);
    });

    dom.startBtn.addEventListener('click', startGame);
    dom.resetBtn.addEventListener('click', resetSession);

    dom.playersToggle.addEventListener('click', () => {
        dom.playersCard.classList.toggle('collapsed');
    });

    dom.revealBtn.addEventListener('click', revealImpostors);
    dom.nextRoundBtn.addEventListener('click', nextRound);
}

// Arrancar app
document.addEventListener('DOMContentLoaded', init);
