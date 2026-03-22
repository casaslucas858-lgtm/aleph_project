// FRONTEND-ONLY VERSION - No backend needed
// All data stored in localStorage

let problems = {};
let currentProblemId = null;

// Load problems from JSON
async function loadProblemsData() {
    try {
        console.log('Attempting to load problems...');
        const response = await fetch('/aleph_project/frontend/data/problems.json');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        problems = await response.json();
        console.log('Problems loaded successfully:', problems);
    } catch (error) {
        console.error('Error loading problems:', error);
        
        // Try alternative path
        try {
            console.log('Trying alternative path...');
            const response2 = await fetch('./data/problems.json');
            problems = await response2.json();
            console.log('Problems loaded from alternative path:', problems);
        } catch (error2) {
            console.error('Alternative path also failed:', error2);
            problems = {};
        }
    }
}

// ========== AUTH (FAKE) ==========

function showLogin() {
    if (!document.getElementById('loginForm')) return;
    document.getElementById('loginForm').style.display = 'flex';
    document.getElementById('registerForm').style.display = 'none';
    document.querySelectorAll('.tab')[0].classList.add('active');
    document.querySelectorAll('.tab')[1].classList.remove('active');
}

function showRegister() {
    if (!document.getElementById('registerForm')) return;
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'flex';
    document.querySelectorAll('.tab')[0].classList.remove('active');
    document.querySelectorAll('.tab')[1].classList.add('active');
}

// Login (fake)
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    
    if (!users[username]) {
        document.getElementById('loginError').textContent = 'Usuario no existe';
        return;
    }
    
    if (users[username].password !== password) {
        document.getElementById('loginError').textContent = 'Contraseña incorrecta';
        return;
    }
    
    localStorage.setItem('currentUser', username);
    
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
    
    users[username] = {
        email: email,
        password: password,
        level: 'pi=3',
        solved: [],
        submissions: []
    };
    
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('currentUser', username);
    
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

// ========== DASHBOARD FUNCTIONS (ONLY RUN ON DASHBOARD) ==========

function getCurrentUser() {
    const username = localStorage.getItem('currentUser');
    console.log('getCurrentUser - username:', username);
    
    if (!username) {
        console.log('No username found, redirecting...');
        window.location.href = 'index.html';
        return null;
    }
    
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    console.log('getCurrentUser - user exists:', !!users[username]);
    
    if (!users[username]) {
        console.log('User data not found, redirecting...');
        window.location.href = 'index.html';
        return null;
    }
    
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

function loadUserData() {
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
    
    const solved = user.solved.length;
    const total = user.submissions.length;
    const accuracy = total > 0 ? Math.round((solved / total) * 100) : 0;
    
    if (solvedCountEl) solvedCountEl.textContent = solved;
    if (accuracyEl) accuracyEl.textContent = accuracy + '%';
}

function loadProblems() {
    console.log('loadProblems called, current problems:', problems);
    
    const levelFilter = document.getElementById('levelFilter');
    const problemList = document.getElementById('problemList');
    
    if (!levelFilter || !problemList) return;
    
    const level = levelFilter.value || 'pi=3';
    
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

function openProblem(id) {
    currentProblemId = id;
    
    let problem = null;
    for (const level in problems) {
        problem = problems[level].find(p => p.id === id);
        if (problem) break;
    }
    
    if (!problem) {
        alert('Problema no encontrado');
        return;
    }
    
    const problemTitle = document.getElementById('problemTitle');
    const problemStatement = document.getElementById('problemStatement');
    const result = document.getElementById('result');
    const answerInput = document.getElementById('answerInput');
    
    if (problemTitle) problemTitle.textContent = problem.title;
    if (problemStatement) problemStatement.textContent = problem.statement;
    if (result) result.innerHTML = '';
    if (answerInput) answerInput.value = '';
    
    const problemsSection = document.querySelector('.problems');
    const submissionsSection = document.querySelector('.submissions');
    const problemView = document.getElementById('problemView');
    
    if (problemsSection) problemsSection.style.display = 'none';
    if (submissionsSection) submissionsSection.style.display = 'none';
    if (problemView) problemView.style.display = 'block';
}

function closeProblem() {
    const problemView = document.getElementById('problemView');
    const problemsSection = document.querySelector('.problems');
    const submissionsSection = document.querySelector('.submissions');
    
    if (problemView) problemView.style.display = 'none';
    if (problemsSection) problemsSection.style.display = 'block';
    if (submissionsSection) submissionsSection.style.display = 'block';
}

function handleSubmit(e) {
    e.preventDefault();
    
    const answerInput = document.getElementById('answerInput');
    const resultEl = document.getElementById('result');
    
    if (!answerInput || !resultEl) return;
    
    const answer = answerInput.value.trim().toLowerCase();
    const user = getCurrentUser();
    if (!user) return;
    
    let problem = null;
    for (const level in problems) {
        problem = problems[level].find(p => p.id === currentProblemId);
        if (problem) break;
    }
    
    if (!problem) return;
    
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
    
    const correct = correctAnswer.split(' ').some(word => 
        word.length > 3 && userAnswer.includes(word)
    ) || userAnswer.includes(correctAnswer);
    
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
    checkProgression(user);
    
    resultEl.className = 'result ' + (correct ? 'correct' : 'incorrect');
    resultEl.textContent = correct 
        ? '✓ ¡Correcto! Excelente trabajo.' 
        : '✗ Incorrecto. Intentá de nuevo o probá otro problema.';
    
    setTimeout(() => {
        loadUserData();
        loadSubmissions();
    }, 1000);
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

function loadSubmissions() {
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
                <strong>${sub.title}</strong>
                <span style="color: #999; margin-left: 10px;">${sub.level}</span>
            </div>
            <div>
                ${sub.correct ? '✓ Correcto' : '✗ Incorrecto'}
            </div>
        </div>
    `).join('');
}

// ========== INITIALIZE ==========

// Load problems on page load
loadProblemsData();

// Initialize dashboard ONLY if on dashboard page
if (window.location.pathname.includes('dashboard.html')) {
    console.log('Dashboard page detected, initializing...');
    
    window.addEventListener('DOMContentLoaded', async () => {
        console.log('DOM loaded, setting up dashboard...');
        
        // Ensure problems are loaded
        if (Object.keys(problems).length === 0) {
            await loadProblemsData();
        }
        
        // Load dashboard data
        loadUserData();
        loadProblems();
        loadSubmissions();
        
        // Attach event listeners
        const answerForm = document.getElementById('answerForm');
        if (answerForm) {
            answerForm.addEventListener('submit', handleSubmit);
        }
        
        const levelFilter = document.getElementById('levelFilter');
        if (levelFilter) {
            levelFilter.addEventListener('change', loadProblems);
        }
    });
}
