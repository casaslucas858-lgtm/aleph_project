// API Configuration
const API_URL = 'https://aleph-backend.railway.app'; // Cambiar después del deploy

// Auth Functions
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

// Login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            throw new Error('Credenciales inválidas');
        }
        
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('level', data.level);
        
        window.location.href = 'dashboard.html';
    } catch (error) {
        errorEl.textContent = error.message;
    }
});

// Register
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const errorEl = document.getElementById('registerError');
    
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al registrar');
        }
        
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('level', 'pi=3');
        
        window.location.href = 'dashboard.html';
    } catch (error) {
        errorEl.textContent = error.message;
    }
});

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('level');
    window.location.href = 'index.html';
}

// Load User Data
async function loadUserData() {
    const username = localStorage.getItem('username');
    const level = localStorage.getItem('level');
    
    document.getElementById('username').textContent = username;
    document.getElementById('userLevel').textContent = level;
    document.getElementById('currentLevel').textContent = level;
    
    // Load submissions to calculate stats
    await loadSubmissions();
}

// Load Problems
async function loadProblems() {
    const level = document.getElementById('levelFilter')?.value || 'pi=3';
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_URL}/problems/${level}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al cargar problemas');
        
        const problems = await response.json();
        const problemList = document.getElementById('problemList');
        
        if (problems.length === 0) {
            problemList.innerHTML = '<p style="text-align: center; padding: 40px; color: #999;">No hay problemas disponibles en este nivel.</p>';
            return;
        }
        
        problemList.innerHTML = problems.map(problem => `
            <div class="problem-item" onclick="openProblem(${problem.id})">
                <span class="level-tag">${problem.level}</span>
                <h3>${problem.title}</h3>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('problemList').innerHTML = '<p style="color: red;">Error al cargar problemas</p>';
    }
}

// Open Problem
let currentProblemId = null;

async function openProblem(id) {
    const token = localStorage.getItem('token');
    currentProblemId = id;
    
    try {
        const response = await fetch(`${API_URL}/problem/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error al cargar problema');
        
        const problem = await response.json();
        
        document.getElementById('problemTitle').textContent = problem.title;
        document.getElementById('problemStatement').textContent = problem.statement;
        document.getElementById('result').innerHTML = '';
        document.getElementById('answerInput').value = '';
        
        document.querySelector('.problems').style.display = 'none';
        document.querySelector('.submissions').style.display = 'none';
        document.getElementById('problemView').style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar el problema');
    }
}

// Close Problem
function closeProblem() {
    document.getElementById('problemView').style.display = 'none';
    document.querySelector('.problems').style.display = 'block';
    document.querySelector('.submissions').style.display = 'block';
}

// Submit Answer
document.getElementById('answerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const answer = document.getElementById('answerInput').value;
    const token = localStorage.getItem('token');
    const resultEl = document.getElementById('result');
    
    try {
        const response = await fetch(`${API_URL}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                problem_id: currentProblemId,
                answer: answer
            })
        });
        
        if (!response.ok) throw new Error('Error al enviar respuesta');
        
        const data = await response.json();
        
        resultEl.className = 'result ' + (data.correct ? 'correct' : 'incorrect');
        resultEl.textContent = data.correct 
            ? '✓ ¡Correcto! Excelente trabajo.' 
            : '✗ Incorrecto. Intentá de nuevo o probá otro problema.';
        
        // Reload submissions
        setTimeout(() => {
            loadSubmissions();
        }, 1000);
    } catch (error) {
        console.error('Error:', error);
        resultEl.className = 'result incorrect';
        resultEl.textContent = 'Error al enviar respuesta';
    }
});

// Load Submissions
async function loadSubmissions() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    
    // Get user ID from token (simplified - in production decode JWT properly)
    const userId = 1; // Placeholder
    
    try {
        const response = await fetch(`${API_URL}/submissions/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) return;
        
        const submissions = await response.json();
        const submissionsList = document.getElementById('submissionsList');
        
        if (submissions.length === 0) {
            submissionsList.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">Todavía no hiciste ningún intento.</p>';
            return;
        }
        
        // Calculate stats
        const solved = submissions.filter(s => s.correct).length;
        const total = submissions.length;
        const accuracy = total > 0 ? Math.round((solved / total) * 100) : 0;
        
        if (document.getElementById('solvedCount')) {
            document.getElementById('solvedCount').textContent = solved;
        }
        if (document.getElementById('accuracy')) {
            document.getElementById('accuracy').textContent = accuracy + '%';
        }
        
        // Display submissions
        submissionsList.innerHTML = submissions.slice(0, 10).map(sub => `
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
    } catch (error) {
        console.error('Error:', error);
    }
}
