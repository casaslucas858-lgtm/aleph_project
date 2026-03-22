// FRONTEND-ONLY VERSION - No backend needed
// All data stored in localStorage

let problems = {};
let currentProblemId = null;

// Load problems from JSON
async function loadProblemsData() {
    try {
        const response = await fetch('data/problems.json');
        problems = await response.json();
    } catch (error) {
        console.error('Error loading problems:', error);
        problems = {}; // Fallback to empty
    }
}

// Initialize
loadProblemsData();

// ========== AUTH (FAKE) ==========

function showLogin() {
    document.getElementById('loginForm').style.display = 'flex';
    document.getElementById('registerForm').style.display = 'none';
    document.querySelectorAll('.tab')[0].classList.add('active');
    document.querySelectorAll('.tab')[1].classList.remove('active');
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'flex';
    document.querySelectorAll('.tab')[0].classList.remove('active');
    document.querySelectorAll('.tab')[1].classList.add('active');
}

// Login (fake)
// Login (fake)
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    // Check if user exists
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    
    if (!users[username]) {
        document.getElementById('loginError').textContent = 'Usuario no existe';
        return;
    }
    
    if (users[username].password !== password) {
        document.getElementById('loginError').textContent = 'Contraseña incorrecta';
        return;
    }
    
    // Login successful
    localStorage.setItem('currentUser', username);
    
    // Ensure problems are loaded before redirecting
    if (Object.keys(problems).length === 0) {
        await loadProblemsData();
    }
    
    window.location.href = 'dashboard.html';
});
// Register (fake)
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    
    if (users[username]) {
        document.getElementById('registerError').textContent = 'Usuario ya existe';
        return;
    }
    
    // Create user
    users[username] = {
        email: email,
        password: password,
        level: 'pi=3',
        solved: [],
        submissions: []
    };
    
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('currentUser', username);
    
    // Ensure problems are loaded before redirecting
    if (Object.keys(problems).length === 0) {
        await loadProblemsData();
    }
    
    window.location.href = 'dashboard.html';
});

// Logout
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// ========== DASHBOARD ==========

function getCurrentUser() {
    const username = localStorage.getItem('currentUser');
    if (!username) {
        window.location.href = 'index.html';
        return null;
    }
    
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    return { username, ...users[username] };
}

function saveUser(user) {
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    users[user.username] = {
        email: user.email,
        password: user.password,
        level: user.level,
        solved: user.solved,
        submissions: user.submissions
    };
    localStorage.setItem('users', JSON.stringify(users));
}

// Load user data
async function loadUserData() {
    const user = getCurrentUser();
    if (!user) return;
    
    document.getElementById('username').textContent = user.username;
    document.getElementById('userLevel').textContent = user.level;
    document.getElementById('currentLevel').textContent = user.level;
    
    // Calculate stats
    const solved = user.solved.length;
    const total = user.submissions.length;
    const accuracy = total > 0 ? Math.round((solved / total) * 100) : 0;
    
    document.getElementById('solvedCount').textContent = solved;
    document.getElementById('accuracy').textContent = accuracy + '%';
}

// Load problems
async function loadProblems() {
    const level = document.getElementById('levelFilter')?.value || 'pi=3';
    const problemList = document.getElementById('problemList');
    
    if (!problems[level] || problems[level].length === 0) {
        problemList.innerHTML = '<p style="text-align: center; padding: 40px; color: #999;">No hay problemas disponibles en este nivel.</p>';
        return;
    }
    
    problemList.innerHTML = problems[level].map(problem => `
        <div class="problem-item" onclick="openProblem(${problem.id})">
            <span class="level-tag">${problem.level}</span>
            <h3>${problem.title}</h3>
        </div>
    `).join('');
}

// Open problem
function openProblem(id) {
    currentProblemId = id;
    
    // Find problem across all levels
    let problem = null;
    for (const level in problems) {
        problem = problems[level].find(p => p.id === id);
        if (problem) break;
    }
    
    if (!problem) {
        alert('Problema no encontrado');
        return;
    }
    
    document.getElementById('problemTitle').textContent = problem.title;
    document.getElementById('problemStatement').textContent = problem.statement;
    document.getElementById('result').innerHTML = '';
    document.getElementById('answerInput').value = '';
    
    document.querySelector('.problems').style.display = 'none';
    document.querySelector('.submissions').style.display = 'none';
    document.getElementById('problemView').style.display = 'block';
}

// Close problem
function closeProblem() {
    document.getElementById('problemView').style.display = 'none';
    document.querySelector('.problems').style.display = 'block';
    document.querySelector('.submissions').style.display = 'block';
}

// Submit answer
document.getElementById('answerForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const answer = document.getElementById('answerInput').value.trim().toLowerCase();
    const resultEl = document.getElementById('result');
    const user = getCurrentUser();
    
    // Find problem
    let problem = null;
    for (const level in problems) {
        problem = problems[level].find(p => p.id === currentProblemId);
        if (problem) break;
    }
    
    if (!problem) return;
    
    // Normalize answer for comparison
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
    const correct = correctAnswer.split(' ').some(word => 
        word.length > 3 && userAnswer.includes(word)
    ) || userAnswer.includes(correctAnswer);
    
    // Save submission
    user.submissions.push({
        problem_id: currentProblemId,
        title: problem.title,
        level: problem.level,
        answer: answer,
        correct: correct,
        timestamp: new Date().toISOString()
    });
    
    if (correct && !user.solved.includes(currentProblemId)) {
        user.solved.push(currentProblemId);
    }
    
    saveUser(user);
    
    // Check for level progression
    checkProgression(user);
    
    // Show result
    resultEl.className = 'result ' + (correct ? 'correct' : 'incorrect');
    resultEl.textContent = correct 
        ? '✓ ¡Correcto! Excelente trabajo.' 
        : '✗ Incorrecto. Intentá de nuevo o probá otro problema.';
    
    // Reload stats
    setTimeout(() => {
        loadUserData();
        loadSubmissions();
    }, 1000);
});

// Check progression
function checkProgression(user) {
    const levels = ['pi=3', 'pi=3.1', 'pi=3.14', 'pi=3.141', 'pi=3.1415'];
    const currentLevelIndex = levels.indexOf(user.level);
    
    if (currentLevelIndex === -1 || currentLevelIndex === levels.length - 1) return;
    
    // Count solved in current level
    const currentLevelProblems = problems[user.level] || [];
    const solvedInLevel = user.solved.filter(id => 
        currentLevelProblems.some(p => p.id === id)
    ).length;
    
    const percentage = (solvedInLevel / currentLevelProblems.length) * 100;
    
    // Auto-promote at 70%
    if (percentage >= 70) {
        user.level = levels[currentLevelIndex + 1];
        saveUser(user);
        
        alert(`¡Felicitaciones! Avanzaste a ${user.level}`);
        location.reload();
    }
}

// Load submissions
function loadSubmissions() {
    const user = getCurrentUser();
    if (!user) return;
    
    const submissionsList = document.getElementById('submissionsList');
    
    if (user.submissions.length === 0) {
        submissionsList.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">Todavía no hiciste ningún intento.</p>';
        return;
    }
    
    const recentSubmissions = user.submissions.slice(-10).reverse();
    
    submissionsList.innerHTML = recentSubmissions.map(sub => `
        <div class="submission-item ${sub.correct ? 'correct' : 'incorrect'}">
            <div>
                <strong>${sub.title}</strong>
                <span style="color: #999; margin-left: 10px;">${sub.level}</span>
            </div>
            <div>
                ${sub.correct ? '✓ Correcto' : '✗ Incorrecto'}
            </div>
        </div>
    `).join('');
}

// Initialize dashboard
if (window.location.pathname.includes('dashboard.html')) {
    window.addEventListener('DOMContentLoaded', async () => {
        await loadProblemsData();
        loadUserData();
        loadProblems();
        loadSubmissions();
    });
}
