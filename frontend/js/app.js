// ALEPH PROJECT - FRONTEND-ONLY ENGINE
let problems = {};
let currentProblemId = null;

// ========== 1. CARGA DE DATOS ==========
async function loadProblemsData() {
    try {
        const response = await fetch('./data/problems.json');
        if (!response.ok) throw new Error("No se pudo cargar el JSON");
        problems = await response.json();
        console.log("Problemas cargados con éxito.");
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
        if (el) el.textContent = value;
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
            <div><strong>${sub.title}</strong></div>
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
    document.getElementById('problemView').style.display = 'block';
    document.querySelector('.problems').style.display = 'none';
    document.querySelector('.submissions').style.display = 'none';
}

function closeProblem() {
    document.getElementById('problemView').style.display = 'none';
    document.querySelector('.problems').style.display = 'block';
    document.querySelector('.submissions').style.display = 'block';
}

// ========== 5. EL NUEVO MOTOR DE VALIDACIÓN (SCORING) ==========
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

    const rawInput = answerInput.value.trim().toLowerCase();

    // --- NORMALIZACIÓN ---
    const normalize = (text) => text
        .replace(/\s+/g, ' ')
        .replace(/[áàäâ]/g, 'a')
        .replace(/[éèëê]/g, 'e')
        .replace(/[íìïî]/g, 'i')
        .replace(/[óòöô]/g, 'o')
        .replace(/[úùüû]/g, 'u')
        .trim();

    const correctAnswer = normalize(problem.answer);
    const userAnswer = normalize(rawInput);

    // --- ANTI-KEYWORDS ---
    const antiKeywords = ['no es', 'falso', 'incorrecto', 'placeholder', 'hola', 'test', 'banana', 'asdf', 'qwerty'];
    const hasAntiKeyword = antiKeywords.some(bad => userAnswer.includes(bad));

    // --- KEYWORDS OBLIGATORIAS ---
    const requiredKeywords = {
        1: ['2a', '2b', 'par'],
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

    const required = requiredKeywords[currentProblemId] || [];
    const matchedKeywords = required.filter(kw => userAnswer.includes(kw)).length;
    const hasEnoughKeywords = required.length === 0 || matchedKeywords >= Math.ceil(required.length * 0.5);

    // --- SCORING ---
    let score = 0;
    if (hasAntiKeyword) {
        score = 0;
    } else if (userAnswer === correctAnswer) {
        score = 100;
    } else if (userAnswer.includes(correctAnswer)) {
        score = 95;
    } else if (hasEnoughKeywords) {
        const keywords = correctAnswer.split(' ').filter(w => w.length > 2);
        const matches = keywords.filter(w => userAnswer.includes(w)).length;
        const keywordScore = keywords.length > 0 ? (matches / keywords.length) * 60 : 60;
        const requiredScore = required.length > 0 ? (matchedKeywords / required.length) * 40 : 40;
        score = keywordScore + requiredScore;
    }

    const isCorrect = score >= 60;

    // --- GUARDAR RESULTADO ---
    user.submissions.push({ 
        problem_id: currentProblemId, 
        title: problem.title, 
        level: problem.level, 
        correct: isCorrect 
    });

    if (isCorrect && !user.solved.includes(currentProblemId)) {
        user.solved.push(currentProblemId);
    }

    saveUser(user);
    checkProgression(user);
    updateUI();
    renderSubmissions();

    resultEl.textContent = isCorrect ? "✓ ¡Correcto!" : "✗ Incorrecto. Revisá tu lógica.";
    resultEl.className = "result " + (isCorrect ? "correct" : "incorrect");
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

// ========== 6. INICIALIZACIÓN ==========
async function init() {
    if (!checkAuth()) return;
    await loadProblemsData();

    if (window.location.pathname.includes('dashboard.html')) {
        updateUI();
        renderProblems();
        renderSubmissions();
        document.getElementById('levelFilter')?.addEventListener('change', renderProblems);
        document.getElementById('answerForm')?.addEventListener('submit', handleSubmission);
    }
}

document.addEventListener('DOMContentLoaded', init);
