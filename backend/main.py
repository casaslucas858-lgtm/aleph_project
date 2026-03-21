from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from pathlib import Path
import jwt
import hashlib
import sqlite3

# --- CONFIGURACIÓN DE RUTAS Y DB ---
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "database.db"

app = FastAPI(title="ALEPH API")

# Middleware para CORS
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

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

# --- MODELOS ---
class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Problem(BaseModel):
    id: Optional[int] = None
    level: str
    title: str
    statement: str
    answer: Optional[str] = None

class Submission(BaseModel):
    problem_id: int
    answer: str

# --- AUTH LOGIC ---
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
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

# --- INICIALIZACIÓN DE TABLAS ---
def init_db():
    db = get_db()
    cursor = db.cursor()
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
    db.close()

# Evento de startup
@app.on_event("startup")
async def startup_event():
    init_db()

# --- RUTAS ---
@app.get("/")
async def root():
    return {"status": "ALEPH API is running", "version": "1.0.0"}

@app.post("/register")
async def register(user: UserRegister):
    db = get_db()
    cursor = db.cursor()
    try:
        hashed_pw = hash_password(user.password)
        cursor.execute(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            (user.username, user.email, hashed_pw)
        )
        db.commit()
        user_id = cursor.lastrowid
        token = create_token(user_id)
        return {"token": token, "username": user.username}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="El usuario o email ya existe")
    finally:
        db.close()

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
    db.close()
    
    if not db_user:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    return {
        "token": create_token(db_user['id']), 
        "username": db_user['username'], 
        "level": db_user['level']
    }

@app.get("/problems/{level}")
async def get_problems(level: str, user_id: int = Depends(verify_token)):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT id, title, statement, level FROM problems WHERE level = ?", (level,))
    problems = [dict(row) for row in cursor.fetchall()]
    db.close()
    return problems

@app.post("/submit")
async def submit(submission: Submission, user_id: int = Depends(verify_token)):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT answer FROM problems WHERE id = ?", (submission.problem_id,))
    problem = cursor.fetchone()
    
    if not problem:
        db.close()
        raise HTTPException(status_code=404, detail="Problema no encontrado")
    
    correct = submission.answer.strip().lower() == problem['answer'].strip().lower()
    
    cursor.execute(
        "INSERT INTO submissions (user_id, problem_id, answer, correct) VALUES (?, ?, ?, ?)",
        (user_id, submission.problem_id, submission.answer, correct)
    )
    db.commit()
    db.close()
    return {"correct": correct}

@app.post("/admin/problem")
async def create_problem(problem: Problem):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO problems (level, title, statement, answer) VALUES (?, ?, ?, ?)",
        (problem.level, problem.title, problem.statement, problem.answer)
    )
    db.commit()
    new_id = cursor.lastrowid
    db.close()
    return {"id": new_id, "status": "Problema creado"}
