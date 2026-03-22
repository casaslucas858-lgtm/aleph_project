// FRONTEND-ONLY VERSION - ALEPH PROJECT
// Configuración global
let problems = {};
let currentProblemId = null;

// ========== 1. CARGA DE PROBLEMAS ==========
async function loadProblemsData() {
    try {
        const response = await fetch('./data/problems.json');
        if (!response.ok) throw new Error("No se pudo cargar el JSON");
        problems = await response.json();
        console.log("Problemas cargados:", problems);
    } catch (error) {
        console.error("Error cargando problemas:", error);
        // Fallback
        problems = {
            "pi=3": [
                { id: 1, title: "Suma Básica", statement: "¿Cuánto es 2 + 2?", answer: "4", level: "pi=3" }
            ]
        };
    }
}


// ========== 2. GESTIÓN DE USUARIOS ==========
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

// ========== 3. NAVEGACIÓN Y AUTH ==========
function checkAuth() {
    const isDashboard = window.location.pathname.includes('dashboard.html');
    const user = getCurrentUser();

    if (isDashboard && !user) {
        console.warn("Acceso denegado. Redirigiendo a login...");
        window.location.href = './index.html';
        return false;
    }
    
    // NO auto-redirigir si estás en index con user logueado
    // El login/register ya hacen la redirección
    
    return true;
}

// ========== 4. UI DEL DASHBOARD ==========
function updateUI() {
    const user = getCurrentUser();
    if (!user) return;

    const usernameEl = document.getElementById('username');
    const userLevelEl = document.getElementById('userLevel');
    const currentLevelEl = document.getElementById('currentLevel');
    const solvedCountEl = document.getElementById('solvedCount');
    const accuracyEl = document.getElementById('accuracy');

    if (usernameEl) usernameEl.textContent = user.username;
    if (userLevelEl) userLevelEl.textContent = user.level;
    if (currentLevelEl) currentLevelEl.textContent = user.level;
    if (solvedCountEl) solvedCountEl.textContent = user.solved.length;
    
    const accuracy = user.submissions.length > 0 
        ? Math.round((user.solved.length / user.submissions.length) * 100) 
        : 0;
    if (accuracyEl) accuracyEl.textContent = accuracy + '%';
}

function renderProblems() {
    const levelFilter = document.getElementById('levelFilter');
    const problemList = document.getElementById('problemList');
    if (!levelFilter || !problemList) return;

    const level = levelFilter.value || 'pi=3';
    const levelProblems = problems[level] || [];

    if (levelProblems.length === 0) {
        problemList.innerHTML = '<p style="text-align: center; padding: 40px; color: #999;">No hay problemas en este nivel.</p>';
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
    if (!user) return;
    
    const submissionsList = document.getElementById('submissionsList');
    if (!submissionsList) return;
    
    if (user.submissions.length === 0) {
        submissionsList.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">Todavía no hiciste ningún intento.</p>';
        return;
    }
    
    const recentSubmissions = user.submissions.slice(-10).reverse();
    
    submissionsList.innerHTML = recentSubmissions.map(sub => `
        <div class="submission-item ${sub.correct ? 'correct' : 'incorrect'}">
            <div>
                <strong>${sub.title || 'Problema #' + sub.problem_id}</strong>
                <span style="color: #999; margin-left: 10px;">${sub.level || ''}</span>
            </div>
            <div>
                ${sub.correct ? '✓ Correcto' : '✗ Incorrecto'}
            </div>
        </div>
    `).join('');
}

function openProblem(id) {
    currentProblemId = id;
    let problem = null;
    
    for (const lvl in problems) {
        problem = problems[lvl].find(p => p.id === id);
        if (problem) break;
    }

    if (!problem) {
        alert('Problema no encontrado');
        return;
    }

    const problemTitle = document.getElementById('problemTitle');
    const problemStatement = document.getElementById('problemStatement');
    const problemView = document.getElementById('problemView');
    const problemsSection = document.querySelector('.problems');
    const submissionsSection = document.querySelector('.submissions');
    const resultEl = document.getElementById('result');
    const answerInput = document.getElementById('answerInput');

    if (problemTitle) problemTitle.textContent = problem.title;
    if (problemStatement) problemStatement.textContent = problem.statement;
    if (resultEl) resultEl.textContent = '';
    if (answerInput) answerInput.value = '';
    
    if (problemView) problemView.style.display = 'block';
    if (problemsSection) problemsSection.style.display = 'none';
    if (submissionsSection) submissionsSection.style.display = 'none';
}

function closeProblem() {
    const problemView = document.getElementById('problemView');
    const problemsSection = document.querySelector('.problems');
    const submissionsSection = document.querySelector('.submissions');
    
    if (problemView) problemView.style.display = 'none';
    if (problemsSection) problemsSection.style.display = 'block';
    if (submissionsSection) submissionsSection.style.display = 'block';
}

// ========== 5. LOGIN / REGISTER ==========
// Login handler (called from HTML)
function handleLogin(e) {
    e.preventDefault();
    console.log('LOGIN EJECUTADO');
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const users = JSON.parse(localStorage.getItem('users') || '{}');

    if (users[username] && users[username].password === password) {
        localStorage.setItem('currentUser', username);
        console.log('Login exitoso, redirigiendo...');
        window.location.href = './dashboard.html';
    } else {
        const errorEl = document.getElementById('loginError');
        if (errorEl) errorEl.textContent = 'Usuario o contraseña incorrectos';
    }
    
    return false;
}

// Register handler (called from HTML)
function handleRegister(e) {
    e.preventDefault();
    console.log('REGISTER EJECUTADO');
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const users = JSON.parse(localStorage.getItem('users') || '{}');

    if (users[username]) {
        const errorEl = document.getElementById('registerError');
        if (errorEl) errorEl.textContent = 'El usuario ya existe';
        return false;
    }

    users[username] = { 
        email, 
        password, 
        level: 'pi=3', 
        solved: [], 
        submissions: [] 
    };
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('currentUser', username);
    
    console.log('Usuario creado, redirigiendo...');
    window.location.href = './dashboard.html';
    
    return false;
}



function showLogin() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm) loginForm.style.display = 'flex';
    if (registerForm) registerForm.style.display = 'none';
    
    const tabs = document.querySelectorAll('.tab');
    if (tabs[0]) tabs[0].classList.add('active');
    if (tabs[1]) tabs[1].classList.remove('active');
}

function showRegister() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'flex';
    
    const tabs = document.querySelectorAll('.tab');
    if (tabs[0]) tabs[0].classList.remove('active');
    if (tabs[1]) tabs[1].classList.add('active');
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = './index.html';
}

// ========== 6. SUBMIT ANSWER ==========
function handleSubmission(e) {
    e.preventDefault();
    
    const answerInput = document.getElementById('answerInput');
    const resultEl = document.getElementById('result');
    if (!answerInput || !resultEl) return;
    
    const answer = answerInput.value.trim().toLowerCase();
    const user = getCurrentUser();
    if (!user) return;
    
    let problem = null;
    for (const lvl in problems) {
        problem = problems[lvl].find(p => p.id === currentProblemId);
        if (problem) break;
    }
    
    if (!problem) return;
    
    // Normalize both answers
    const correctAnswer = problem.answer.toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[áàäâ]/g, 'a')
        .replace(/[éèëê]/g, 'e')
        .replace(/[íìïî]/g, 'i')
        .replace(/[óòöô]/g, 'o')
        .replace(/[úùüû]/g, 'u');
    
    const userAnswer = answer
        .replace(/\s+/g, ' ')
        .replace(/[áàäâ]/g, 'a')
        .replace(/[éèëê]/g, 'e')
        .replace(/[íìïî]/g, 'i')
        .replace(/[óòöô]/g, 'o')
        .replace(/[úùüû]/g, 'u');
    
    // Check if answer contains key concepts
    const isCorrect = correctAnswer.split(' ').some(word => 
        word.length > 3 && userAnswer.includes(word)
    ) || userAnswer.includes(correctAnswer);
    
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
    
    resultEl.textContent = isCorrect ? "✓ ¡Correcto!" : "✗ Incorrecto. Intentá de nuevo.";
    resultEl.className = "result " + (isCorrect ? "correct" : "incorrect");
}

function checkProgression(user) {
    const levels = ['pi=3', 'pi=3.1', 'pi=3.14', 'pi=3.141', 'pi=3.1415'];
    const currentLevelIndex = levels.indexOf(user.level);
    
    if (currentLevelIndex === -1 || currentLevelIndex === levels.length - 1) return;
    
    const currentLevelProblems = problems[user.level] || [];
    const solvedInLevel = user.solved.filter(id => 
        currentLevelProblems.some(p => p.id === id)
    ).length;
    
    const percentage = (solvedInLevel / currentLevelProblems.length) * 100;
    
    if (percentage >= 70) {
        user.level = levels[currentLevelIndex + 1];
        saveUser(user);
        alert(`¡Felicitaciones! Avanzaste a ${user.level}`);
        location.reload();
    }
}

// ========== 7. INICIALIZACIÓN ==========
async function init() {
    console.log('Iniciando ALEPH...');
    
    // Verificar autenticación
    if (!checkAuth()) return;

    // Cargar problemas
    await loadProblemsData();

    // Si estamos en dashboard, inicializar UI
    if (window.location.pathname.includes('dashboard.html')) {
        console.log('Inicializando dashboard...');
        updateUI();
        renderProblems();
        renderSubmissions();
        
        // Event listeners
        const levelFilter = document.getElementById('levelFilter');
        if (levelFilter) {
            levelFilter.addEventListener('change', renderProblems);
        }
        
        const answerForm = document.getElementById('answerForm');
        if (answerForm) {
            answerForm.addEventListener('submit', handleSubmission);
        }
    }
}

// Arrancar la app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}


// Cache bust
