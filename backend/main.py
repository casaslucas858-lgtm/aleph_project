from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import jwt
import hashlib
import sqlite3

app = FastAPI(title="ALEPH API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT Config
SECRET_KEY = "aleph_secret_key_change_in_production"
ALGORITHM = "HS256"
security = HTTPBearer()

# Database
def get_db():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

# Models
class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Problem(BaseModel):
    id: Optional[int] = None
    level: str  # pi=3, pi=3.1, etc
    title: str
    statement: str
    answer: Optional[str] = None

class Submission(BaseModel):
    problem_id: int
    answer: str

# Auth
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: int) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["user_id"]
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

# Routes
@app.post("/register")
async def register(user: UserRegister):
    db = get_db()
    cursor = db.cursor()
    
    # Check if user exists
    cursor.execute("SELECT * FROM users WHERE username = ? OR email = ?", 
                   (user.username, user.email))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create user
    hashed_pw = hash_password(user.password)
    cursor.execute(
        "INSERT INTO users (username, email, password, level) VALUES (?, ?, ?, ?)",
        (user.username, user.email, hashed_pw, "pi=3")
    )
    db.commit()
    user_id = cursor.lastrowid
    
    token = create_token(user_id)
    return {"token": token, "username": user.username}

@app.post("/login")
async def login(user: UserLogin):
    db = get_db()
    cursor = db.cursor()
    
    hashed_pw = hash_password(user.password)
    cursor.execute(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        (user.username, hashed_pw)
    )
    db_user = cursor.fetchone()
    
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(db_user['id'])
    return {"token": token, "username": db_user['username'], "level": db_user['level']}

@app.get("/problems/{level}")
async def get_problems(level: str, user_id: int = Depends(verify_token)):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT id, title, statement, level FROM problems WHERE level = ?", (level,))
    problems = [dict(row) for row in cursor.fetchall()]
    return problems

@app.get("/problem/{id}")
async def get_problem(id: int, user_id: int = Depends(verify_token)):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM problems WHERE id = ?", (id,))
    problem = cursor.fetchone()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return dict(problem)

@app.post("/submit")
async def submit(submission: Submission, user_id: int = Depends(verify_token)):
    db = get_db()
    cursor = db.cursor()
    
    # Get problem
    cursor.execute("SELECT * FROM problems WHERE id = ?", (submission.problem_id,))
    problem = cursor.fetchone()
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Check answer
    correct = submission.answer.strip().lower() == problem['answer'].strip().lower()
    
    # Save submission
    cursor.execute(
        "INSERT INTO submissions (user_id, problem_id, answer, correct) VALUES (?, ?, ?, ?)",
        (user_id, submission.problem_id, submission.answer, correct)
    )
    db.commit()
    
    return {"correct": correct}

@app.get("/submissions/{user_id}")
async def get_submissions(user_id: int, current_user: int = Depends(verify_token)):
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
        SELECT s.*, p.title, p.level 
        FROM submissions s 
        JOIN problems p ON s.problem_id = p.id 
        WHERE s.user_id = ?
        ORDER BY s.created_at DESC
    """, (user_id,))
    
    submissions = [dict(row) for row in cursor.fetchall()]
    return submissions

# Admin routes (simplified)
@app.post("/admin/problem")
async def create_problem(problem: Problem):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO problems (level, title, statement, answer) VALUES (?, ?, ?, ?)",
        (problem.level, problem.title, problem.statement, problem.answer)
    )
    db.commit()
    return {"id": cursor.lastrowid}

@app.on_event("startup")
async def startup():
    db = get_db()
    cursor = db.cursor()
    
    # Create tables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            level TEXT DEFAULT 'pi=3',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS problems (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level TEXT NOT NULL,
            title TEXT NOT NULL,
            statement TEXT NOT NULL,
            answer TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            problem_id INTEGER NOT NULL,
            answer TEXT NOT NULL,
            correct BOOLEAN NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (problem_id) REFERENCES problems(id)
        )
    """)
    
    db.commit()
