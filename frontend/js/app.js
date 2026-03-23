// ALEPH PROJECT - FRONTEND-ONLY ENGINE
// ALEPH PROJECT - FRONTEND-ONLY ENGINE
let problems = {};
let currentProblemId = null;

// ========== SANITIZATION ==========
function sanitize(text) {
    if (!text) return '';
    const temp = document.createElement('div');
    temp.textContent = text;
    return temp.innerHTML;
}

// ========== 1. CARGA DE DATOS ==========
async function loadProblemsData() {
    try {
        const response = await fetch('./data/problems.json');
        if (!response.ok) throw new Error("No se pudo cargar el JSON");
        problems = await response.json();
        console.log("Problemas cargados:", problems);
    } catch (error) {
        console.error("Error cargando problemas:", error);
        problems = {
            "pi=3": [{ id: 1, title: "Suma Básica", statement: "¿2 + 2?", answer: "4", level: "pi=3" }]
        };
    }
}

// ========== 2. SESIÓN Y USUARIOS ==========
function getCurrentUser() {
    const username = localStorage.getItem('currentUser');
    if (!username) return null;
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    return users[username] ? { username, ...users[username] } : null;
}

function saveUser(user) {
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    users[user.username] = {
        email: user.email,
        password: user.password,
        level: user.level || 'pi=3',
        solved: user.solved || [],
        submissions: user.submissions || []
    };
    localStorage.setItem('users', JSON.stringify(users));
}

function checkAuth() {
    const isDashboard = window.location.pathname.includes('dashboard.html');
    const user = getCurrentUser();
    if (isDashboard && !user) {
        window.location.href = './index.html';
        return false;
    }
    return true;
}

// ========== 3. UI Y RENDERIZADO ==========
function updateUI() {
    const user = getCurrentUser();
    if (!user) return;

    const elements = {
        'username': user.username,
        'userLevel': user.level,
        'currentLevel': user.level,
        'solvedCount': user.solved.length
    };

for (const [id, value] of Object.entries(elements)) {
    const el = document.getElementById(id);
    if (el) el.textContent = sanitize(value);
}
    
    const accuracyEl = document.getElementById('accuracy');
    if (accuracyEl) {
        const acc = user.submissions.length > 0 
            ? Math.round((user.solved.length / user.submissions.length) * 100) : 0;
        accuracyEl.textContent = acc + '%';
    }
}

function renderProblems() {
    const levelFilter = document.getElementById('levelFilter');
    const problemList = document.getElementById('problemList');
    if (!levelFilter || !problemList) return;

    const level = levelFilter.value || 'pi=3';
    const levelProblems = problems[level] || [];

    if (levelProblems.length === 0) {
        problemList.innerHTML = '<p class="empty-msg">No hay problemas disponibles.</p>';
        return;
    }

    problemList.innerHTML = levelProblems.map(p => `
        <div class="problem-item" onclick="openProblem(${p.id})">
            <span class="level-tag">${p.level}</span>
            <h3>${p.title}</h3>
        </div>
    `).join('');
}

function renderSubmissions() {
    const user = getCurrentUser();
    const list = document.getElementById('submissionsList');
    if (!user || !list) return;

    if (user.submissions.length === 0) {
        list.innerHTML = '<p class="empty-msg">Sin intentos registrados.</p>';
        return;
    }

    list.innerHTML = user.submissions.slice(-10).reverse().map(sub => `
        <div class="submission-item ${sub.correct ? 'correct' : 'incorrect'}">
            <div><strong>${sub.title || 'Problema'}</strong></div>
            <div>${sub.correct ? '✓ Correcto' : '✗ Incorrecto'}</div>
        </div>
    `).join('');
}

// ========== 4. MANEJO DE PROBLEMAS ==========
function openProblem(id) {
    currentProblemId = id;
    let problem = null;
    for (const lvl in problems) {
        problem = problems[lvl].find(p => p.id === id);
        if (problem) break;
    }

    if (!problem) return;

    document.getElementById('problemTitle').textContent = problem.title;
    document.getElementById('problemStatement').textContent = problem.statement;
const resultEl = document.getElementById('result');
if (resultEl) {
    resultEl.textContent = '';
    resultEl.className = 'result';
    resultEl.style.display = 'none';
}
    document.getElementById('answerInput').value = '';
    document.getElementById('problemView').style.display = 'block';
    document.querySelector('.problems').style.display = 'none';
    document.querySelector('.submissions').style.display = 'none';
}

function closeProblem() {
    document.getElementById('problemView').style.display = 'none';
    document.querySelector('.problems').style.display = 'block';
    document.querySelector('.submissions').style.display = 'block';
}

// ========== 5. MOTOR DE VALIDACIÓN ==========
function handleSubmission(e) {
    e.preventDefault();
    const answerInput = document.getElementById('answerInput');
    const resultEl = document.getElementById('result');
    const user = getCurrentUser();
    
    if (!answerInput || !user) return;

    let problem = null;
    for (const lvl in problems) {
        problem = problems[lvl].find(p => p.id === currentProblemId);
        if (problem) break;
    }
    if (!problem) return;

    const rawInput = answerInput.value.trim();

    // Normalización
    const normalize = (text) => text.toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[áàäâ]/g, 'a')
        .replace(/[éèëê]/g, 'e')
        .replace(/[íìïî]/g, 'i')
        .replace(/[óòöô]/g, 'o')
        .replace(/[úùüû]/g, 'u')
        .trim();

    const correctAnswer = normalize(problem.answer);
    const userAnswer = normalize(rawInput);

    // Anti-keywords
    const antiKeywords = ['no es', 'falso', 'incorrecto', 'placeholder', 'hola', 'test', 'banana', 'asdf', 'qwerty'];
    const hasAntiKeyword = antiKeywords.some(bad => userAnswer.includes(bad));

    // Keywords obligatorias por problema
    const requiredKeywords = {
        1: {
            required: ['par'],
            alternatives: [
                ['2a', '2b'],
                ['2m', '2n'],
                ['2k', '2j'],
                ['2(']
            ]
        },
        2: ['10k', '5', '2k'],
        3: ['3k', 'consecutivos'],
        4: ['induccion', 'base'],
        5: ['4', '-4', '5', '-5'],
        6: ['existe', 'para todo'],
        7: ['(a-b)', '4ab', 'raiz'],
        8: ['5', 'diagonal'],
        9: ['13', '12', 'palomar'],
        10: ['euclides', 'producto', 'primo'],
        11: ['contradiccion', 'irreducible'],
        12: ['paralela', 'alternos', '180'],
        13: ['(a,b)', 'equivalencia'],
        14: ['epsilon', '1/epsilon'],
        15: ['biyeccion', 'f(n)=2n']
    };
    
    // Validar keywords
    const keywordConfig = requiredKeywords[currentProblemId];
    let hasEnoughKeywords = true;
    let keywordDebug = '';

    if (keywordConfig) {
        if (typeof keywordConfig === 'object' && !Array.isArray(keywordConfig)) {
            // Formato con required/alternatives
            const requiredMatches = (keywordConfig.required || []).filter(kw => userAnswer.includes(kw)).length;
            const requiredOK = requiredMatches === (keywordConfig.required || []).length;
            
            const alternativesOK = !keywordConfig.alternatives || keywordConfig.alternatives.some(alt => 
                alt.every(kw => userAnswer.includes(kw))
            );
            
            hasEnoughKeywords = requiredOK && alternativesOK;
            keywordDebug = `Required: ${requiredOK ? '✓' : '✗'}, Alternatives: ${alternativesOK ? '✓' : '✗'}`;
            
        } else {
            // Formato array simple
            const required = keywordConfig;
            const matchedKeywords = required.filter(kw => userAnswer.includes(kw)).length;
            hasEnoughKeywords = required.length === 0 || matchedKeywords >= Math.ceil(required.length * 0.5);
            keywordDebug = `${matchedKeywords}/${required.length} keywords`;
        }
    }

    // Scoring
    let score = 0;
    if (hasAntiKeyword) {
        score = 0;
        console.log('❌ Rechazado: anti-keyword detectada');
    } else if (userAnswer === correctAnswer) {
        score = 100;
        console.log('✓ Respuesta exacta');
    } else if (userAnswer.includes(correctAnswer)) {
        score = 95;
        console.log('✓ Contiene respuesta exacta');
} else if (hasEnoughKeywords) {
    // Score base por cumplir keywords
    let baseScore = 70;
    
    // Bonus por fragmentos de respuesta correcta
    const keywords = correctAnswer.split(' ').filter(w => w.length > 2);
    const matches = keywords.filter(w => userAnswer.includes(w)).length;
    const fragmentBonus = keywords.length > 0 ? (matches / keywords.length) * 30 : 0;
    
    score = baseScore + fragmentBonus;
    console.log(`✓ Keywords OK (${keywordDebug}) → base: ${baseScore}%, fragmentos: +${fragmentBonus.toFixed(0)}% → total: ${score.toFixed(0)}%`);
    } else {
        score = 0;
        console.log(`❌ No cumple requisitos: ${keywordDebug}`);
    }

    const isCorrect = score >= 50;
    console.log(`Score final: ${score.toFixed(0)}% → ${isCorrect ? 'CORRECTA' : 'INCORRECTA'}`);

// Mostrar resultado
resultEl.textContent = isCorrect 
    ? `✓ ¡Correcto! (Score: ${score.toFixed(0)}%)` 
    : `✗ Incorrecto (Score: ${score.toFixed(0)}%). Intentá de nuevo.`;
resultEl.className = "result " + (isCorrect ? "correct" : "incorrect");
resultEl.style.display = 'block';  // Asegurar que se muestra

    // Guardar
    user.submissions.push({ 
        problem_id: currentProblemId,
        title: problem.title,
        level: problem.level,
        answer: rawInput,
        correct: isCorrect,
        score: Math.round(score)
    });

    if (isCorrect && !user.solved.includes(currentProblemId)) {
        user.solved.push(currentProblemId);
    }

    saveUser(user);
    checkProgression(user);

    setTimeout(() => {
        updateUI();
        renderSubmissions();
    }, 500);
}

function checkProgression(user) {
    const levels = ['pi=3', 'pi=3.1', 'pi=3.14', 'pi=3.141', 'pi=3.1415'];
    const idx = levels.indexOf(user.level);
    if (idx === -1 || idx === levels.length - 1) return;

    const levelProblems = problems[user.level] || [];
    const solved = user.solved.filter(id => levelProblems.some(p => p.id === id)).length;
    
    if (levelProblems.length > 0 && (solved / levelProblems.length) >= 0.7) {
        user.level = levels[idx + 1];
        saveUser(user);
        alert(`¡Nivel superado! Ahora sos: ${user.level}`);
        location.reload();
    }
}

// ========== 6. LOGIN/REGISTER ==========
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const users = JSON.parse(localStorage.getItem('users') || '{}');

    if (users[username] && users[username].password === password) {
        localStorage.setItem('currentUser', username);
        window.location.href = './dashboard.html';
    } else {
        document.getElementById('loginError').textContent = 'Credenciales incorrectas';
    }
    return false;
}

function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const users = JSON.parse(localStorage.getItem('users') || '{}');

    if (users[username]) {
        document.getElementById('registerError').textContent = 'Usuario ya existe';
        return false;
    }

    users[username] = { email, password, level: 'pi=3', solved: [], submissions: [] };
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('currentUser', username);
    window.location.href = './dashboard.html';
    return false;
}

function showLogin() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm) loginForm.style.display = 'flex';
    if (registerForm) registerForm.style.display = 'none';
    const tabs = document.querySelectorAll('.tab');
    if (tabs.length >= 2) {
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    }
}

function showRegister() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'flex';
    const tabs = document.querySelectorAll('.tab');
    if (tabs.length >= 2) {
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = './index.html';
}

// ========== DARK MODE ==========
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    
    const btn = document.getElementById('darkModeBtn');
    if (btn) {
        btn.textContent = isDark ? '☀️' : '🌙';
    }
}

function initDarkMode() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
    }
    
    const btn = document.getElementById('darkModeBtn');
    if (btn) {
        btn.textContent = isDark ? '☀️' : '🌙';
        btn.addEventListener('click', toggleDarkMode);
    }
}

// ========== INICIALIZACIÓN ==========
async function init() {
    console.log('Iniciando ALEPH...');
    
    if (!checkAuth()) return;
    await loadProblemsData();
    
    if (window.location.pathname.includes('dashboard.html')) {
        console.log('Inicializando dashboard...');
        updateUI();
        renderProblems();
        renderSubmissions();
        document.getElementById('levelFilter')?.addEventListener('change', renderProblems);
        document.getElementById('answerForm')?.addEventListener('submit', handleSubmission);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initDarkMode();
        init();
    });
} else {
    initDarkMode();
    init();
}
