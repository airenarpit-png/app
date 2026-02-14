from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Create the main app
app = FastAPI(title="Decode Maths Now API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Enums
class ClassLevel(str, Enum):
    CLASS_10 = "10"
    CLASS_11 = "11"
    CLASS_12 = "12"

class QuestionType(str, Enum):
    MCQ = "MCQ"
    TWO_MARKS = "2M"
    THREE_MARKS = "3M"
    FIVE_MARKS = "5M"
    CASE_STUDY = "CaseStudy"

# ============= MODELS =============

# User Models
class UserCreate(BaseModel):
    name: str
    mobile_number: str
    email: EmailStr
    password: str
    class_level: ClassLevel
    school_name: str
    city: str

class UserLogin(BaseModel):
    mobile_number: str
    password: str

class UserUpdateClass(BaseModel):
    class_level: ClassLevel

class User(BaseModel):
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    mobile_number: str
    email: str
    class_level: Optional[str] = None
    school_name: str
    city: str
    registration_date: str
    is_admin: bool = False

class UserInDB(User):
    password_hash: str

# Admin Models
class AdminLogin(BaseModel):
    username: str
    password: str

# Chapter Models
class ChapterCreate(BaseModel):
    class_level: ClassLevel
    chapter_name: str
    subject: str = "Mathematics"
    description: str
    order: int

class Chapter(BaseModel):
    chapter_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    class_level: str
    chapter_name: str
    subject: str
    description: str
    order: int

# Question Models
class QuestionCreate(BaseModel):
    chapter_id: str
    question_type: QuestionType
    question_text: str
    options: Optional[List[str]] = None
    correct_answer: str
    marks: int
    youtube_solution_url: Optional[str] = None
    explanation: Optional[str] = None

class Question(BaseModel):
    question_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chapter_id: str
    question_type: str
    question_text: str
    options: Optional[List[str]] = None
    correct_answer: str
    marks: int
    youtube_solution_url: Optional[str] = None
    explanation: Optional[str] = None

# Chapter Video Models
class ChapterVideoCreate(BaseModel):
    chapter_id: str
    title: str
    youtube_url: str
    description: Optional[str] = None
    order: int = 1

class ChapterVideo(BaseModel):
    video_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chapter_id: str
    title: str
    youtube_url: str
    description: Optional[str] = None
    order: int

# Test Attempt Models
class TestAttemptCreate(BaseModel):
    chapter_id: str
    questions_answered: List[Dict[str, Any]]

class TestAttempt(BaseModel):
    attempt_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    chapter_id: str
    questions_answered: List[Dict[str, Any]]
    score: float
    total_questions: int
    timestamp: str

# ============= HELPER FUNCTIONS =============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ============= AUTHENTICATION ROUTES =============

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if mobile number exists
    existing_user = await db.users.find_one({"mobile_number": user_data.mobile_number})
    if existing_user:
        raise HTTPException(status_code=400, detail="Mobile number already registered")
    
    # Check if email exists
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create user
    user = UserInDB(
        user_id=str(uuid.uuid4()),
        name=user_data.name,
        mobile_number=user_data.mobile_number,
        email=user_data.email,
        class_level=user_data.class_level,
        school_name=user_data.school_name,
        city=user_data.city,
        registration_date=datetime.now(timezone.utc).isoformat(),
        is_admin=False,
        password_hash=hash_password(user_data.password)
    )
    
    await db.users.insert_one(user.model_dump())
    
    # Create token
    token = create_access_token({"user_id": user.user_id, "mobile_number": user.mobile_number})
    
    return {
        "message": "User registered successfully",
        "token": token,
        "user": User(**user.model_dump()).model_dump()
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"mobile_number": credentials.mobile_number})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid mobile number or password")
    
    token = create_access_token({"user_id": user["user_id"], "mobile_number": user["mobile_number"]})
    user.pop("password_hash", None)
    user.pop("_id", None)
    
    return {
        "message": "Login successful",
        "token": token,
        "user": user
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@api_router.put("/auth/update-class")
async def update_class(
    class_data: UserUpdateClass,
    current_user: dict = Depends(get_current_user)
):
    result = await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"class_level": class_data.class_level}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_user["class_level"] = class_data.class_level
    return {"message": "Class updated successfully", "user": current_user}

# ============= ADMIN ROUTES =============

@api_router.post("/admin/login")
async def admin_login(credentials: AdminLogin):
    user = await db.users.find_one({"username": credentials.username, "is_admin": True})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    
    token = create_access_token({"user_id": user["user_id"], "username": user["username"]})
    user.pop("password_hash", None)
    user.pop("_id", None)
    
    return {
        "message": "Admin login successful",
        "token": token,
        "user": user
    }

# ============= CHAPTER ROUTES =============

@api_router.get("/chapters")
async def get_chapters(class_level: Optional[str] = None):
    query = {}
    if class_level:
        query["class_level"] = class_level
    
    chapters = await db.chapters.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    return chapters

@api_router.get("/chapters/{chapter_id}")
async def get_chapter(chapter_id: str):
    chapter = await db.chapters.find_one({"chapter_id": chapter_id}, {"_id": 0})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return chapter

@api_router.post("/chapters", dependencies=[Depends(get_current_admin)])
async def create_chapter(chapter: ChapterCreate):
    chapter_obj = Chapter(**chapter.model_dump())
    await db.chapters.insert_one(chapter_obj.model_dump())
    return {"message": "Chapter created", "chapter": chapter_obj.model_dump()}

@api_router.put("/chapters/{chapter_id}", dependencies=[Depends(get_current_admin)])
async def update_chapter(chapter_id: str, chapter_update: ChapterCreate):
    result = await db.chapters.update_one(
        {"chapter_id": chapter_id},
        {"$set": chapter_update.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return {"message": "Chapter updated"}

@api_router.delete("/chapters/{chapter_id}", dependencies=[Depends(get_current_admin)])
async def delete_chapter(chapter_id: str):
    result = await db.chapters.delete_one({"chapter_id": chapter_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return {"message": "Chapter deleted"}

# ============= QUESTION ROUTES =============

@api_router.get("/questions")
async def get_questions(chapter_id: Optional[str] = None, question_type: Optional[str] = None):
    query = {}
    if chapter_id:
        query["chapter_id"] = chapter_id
    if question_type:
        query["question_type"] = question_type
    
    questions = await db.questions.find(query, {"_id": 0}).to_list(1000)
    return questions

@api_router.get("/questions/{question_id}")
async def get_question(question_id: str):
    question = await db.questions.find_one({"question_id": question_id}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question

@api_router.post("/questions", dependencies=[Depends(get_current_admin)])
async def create_question(question: QuestionCreate):
    # Validate chapter exists
    chapter = await db.chapters.find_one({"chapter_id": question.chapter_id})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    question_obj = Question(**question.model_dump())
    await db.questions.insert_one(question_obj.model_dump())
    return {"message": "Question created", "question": question_obj.model_dump()}

@api_router.put("/questions/{question_id}", dependencies=[Depends(get_current_admin)])
async def update_question(question_id: str, question_update: QuestionCreate):
    result = await db.questions.update_one(
        {"question_id": question_id},
        {"$set": question_update.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Question updated"}

@api_router.delete("/questions/{question_id}", dependencies=[Depends(get_current_admin)])
async def delete_question(question_id: str):
    result = await db.questions.delete_one({"question_id": question_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Question deleted"}

# ============= CHAPTER VIDEO ROUTES =============

@api_router.get("/chapter-videos")
async def get_chapter_videos(chapter_id: Optional[str] = None):
    query = {}
    if chapter_id:
        query["chapter_id"] = chapter_id
    
    videos = await db.chapter_videos.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    return videos

@api_router.post("/chapter-videos", dependencies=[Depends(get_current_admin)])
async def create_chapter_video(video: ChapterVideoCreate):
    video_obj = ChapterVideo(**video.model_dump())
    await db.chapter_videos.insert_one(video_obj.model_dump())
    return {"message": "Video created", "video": video_obj.model_dump()}

@api_router.put("/chapter-videos/{video_id}", dependencies=[Depends(get_current_admin)])
async def update_chapter_video(video_id: str, video_update: ChapterVideoCreate):
    result = await db.chapter_videos.update_one(
        {"video_id": video_id},
        {"$set": video_update.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    return {"message": "Video updated"}

@api_router.delete("/chapter-videos/{video_id}", dependencies=[Depends(get_current_admin)])
async def delete_chapter_video(video_id: str):
    result = await db.chapter_videos.delete_one({"video_id": video_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    return {"message": "Video deleted"}

# ============= TEST ATTEMPT ROUTES =============

@api_router.post("/test-attempts")
async def create_test_attempt(
    attempt_data: TestAttemptCreate,
    current_user: dict = Depends(get_current_user)
):
    # Calculate score
    total_questions = len(attempt_data.questions_answered)
    correct_answers = 0
    total_marks = 0
    scored_marks = 0
    
    for answer in attempt_data.questions_answered:
        question = await db.questions.find_one({"question_id": answer["question_id"]})
        if question:
            total_marks += question["marks"]
            if answer["user_answer"] == question["correct_answer"]:
                correct_answers += 1
                scored_marks += question["marks"]
    
    score_percentage = (scored_marks / total_marks * 100) if total_marks > 0 else 0
    
    attempt = TestAttempt(
        user_id=current_user["user_id"],
        chapter_id=attempt_data.chapter_id,
        questions_answered=attempt_data.questions_answered,
        score=round(score_percentage, 2),
        total_questions=total_questions,
        timestamp=datetime.now(timezone.utc).isoformat()
    )
    
    await db.test_attempts.insert_one(attempt.model_dump())
    
    return {
        "message": "Test attempt saved",
        "attempt": attempt.model_dump(),
        "correct_answers": correct_answers,
        "total_marks": total_marks,
        "scored_marks": scored_marks
    }

@api_router.get("/test-attempts")
async def get_test_attempts(current_user: dict = Depends(get_current_user)):
    attempts = await db.test_attempts.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(100)
    return attempts

@api_router.get("/progress")
async def get_progress(current_user: dict = Depends(get_current_user)):
    attempts = await db.test_attempts.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    if not attempts:
        return {
            "total_attempts": 0,
            "average_score": 0,
            "total_questions_attempted": 0,
            "chapter_wise_progress": []
        }
    
    total_score = sum(a["score"] for a in attempts)
    total_questions = sum(a["total_questions"] for a in attempts)
    
    # Chapter-wise progress
    chapter_progress = {}
    for attempt in attempts:
        chapter_id = attempt["chapter_id"]
        if chapter_id not in chapter_progress:
            chapter_progress[chapter_id] = {"attempts": 0, "total_score": 0}
        chapter_progress[chapter_id]["attempts"] += 1
        chapter_progress[chapter_id]["total_score"] += attempt["score"]
    
    chapter_wise = []
    for chapter_id, data in chapter_progress.items():
        chapter = await db.chapters.find_one({"chapter_id": chapter_id}, {"_id": 0})
        if chapter:
            chapter_wise.append({
                "chapter_id": chapter_id,
                "chapter_name": chapter["chapter_name"],
                "attempts": data["attempts"],
                "average_score": round(data["total_score"] / data["attempts"], 2)
            })
    
    return {
        "total_attempts": len(attempts),
        "average_score": round(total_score / len(attempts), 2),
        "total_questions_attempted": total_questions,
        "chapter_wise_progress": chapter_wise
    }

# ============= ADMIN STATS ROUTES =============

@api_router.get("/admin/stats", dependencies=[Depends(get_current_admin)])
async def get_admin_stats():
    total_users = await db.users.count_documents({"is_admin": False})
    total_chapters = await db.chapters.count_documents({})
    total_questions = await db.questions.count_documents({})
    total_attempts = await db.test_attempts.count_documents({})
    
    return {
        "total_users": total_users,
        "total_chapters": total_chapters,
        "total_questions": total_questions,
        "total_attempts": total_attempts
    }

@api_router.get("/admin/users", dependencies=[Depends(get_current_admin)])
async def get_all_users():
    users = await db.users.find(
        {"is_admin": False},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    return users

# ============= ROOT ROUTE =============

@api_router.get("/")
async def root():
    return {"message": "Decode Maths Now API is running"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
