from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, EmailStr
from cryptography.fernet import Fernet
import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRY_MINUTES = 60
CONFIG_ENCRYPTION_KEY = os.getenv("CONFIG_ENCRYPTION_KEY", Fernet.generate_key().decode())
cipher = Fernet(CONFIG_ENCRYPTION_KEY.encode())

app = FastAPI(title="Centinela Auth & Config Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:8010"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

client = AsyncIOMotorClient(MONGO_URI)
db = client.bayora_auth


class UserSignup(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ApiKeyRequest(BaseModel):
    api_key: str = ""

class ConfigSettings(BaseModel):
    provider: str = "OPENAI"
    model: str = "gpt-4-turbo-preview"
    domain: str = "General"
    severity: str = "MEDIUM"
    budget: int = 250
    system_prompt: str = ""
    organization: str = ""
    auditor: str = ""


async def get_user(email: str):
    return await db.users.find_one({"email": email})

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRY_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


@app.post("/auth/signup")
async def signup(user: UserSignup):
    if await get_user(user.email):
        raise HTTPException(status_code=400, detail="User already exists")
    hashed_password = pwd_context.hash(user.password[:72])
    new_user = {
        "email": user.email,
        "password": hashed_password,
        "created_at": datetime.now(timezone.utc)
    }
    await db.users.insert_one(new_user)
    return {"message": "User created successfully"}

@app.post("/auth/login")
async def login(user_data: UserLogin):
    user = await get_user(user_data.email)
    if not user or not pwd_context.verify(user_data.password[:72], user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token(data={"sub": user_data.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "email": user_data.email
    }

@app.post("/auth/logout")
async def logout():
    return {"message": "Successfully logged out"}


@app.post("/config/api-key")
async def save_api_key(req: ApiKeyRequest, email: str = Depends(get_current_user)):
    encrypted = cipher.encrypt(req.api_key.encode()).decode()
    await db.configs.update_one(
        {"email": email},
        {"$set": {"api_key_encrypted": encrypted, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"status": "saved"}

@app.get("/config/api-key")
async def get_api_key(email: str = Depends(get_current_user)):
    doc = await db.configs.find_one({"email": email})
    if not doc or "api_key_encrypted" not in doc:
        return {"has_key": False, "key_preview": None}
    decrypted = cipher.decrypt(doc["api_key_encrypted"].encode()).decode()
    return {"has_key": True, "key_preview": decrypted[:4] + "..." + decrypted[-4:]}

@app.delete("/config/api-key")
async def delete_api_key(email: str = Depends(get_current_user)):
    await db.configs.update_one(
        {"email": email},
        {"$unset": {"api_key_encrypted": ""}}
    )
    return {"status": "deleted"}

@app.put("/config/settings")
async def save_settings(settings: ConfigSettings, email: str = Depends(get_current_user)):
    await db.configs.update_one(
        {"email": email},
        {"$set": {**settings.model_dump(), "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"status": "saved"}

@app.get("/config/settings")
async def get_settings(email: str = Depends(get_current_user)):
    doc = await db.configs.find_one({"email": email})
    if not doc:
        return ConfigSettings().model_dump()
    return {
        "provider": doc.get("provider", "OPENAI"),
        "model": doc.get("model", "gpt-4-turbo-preview"),
        "domain": doc.get("domain", "General"),
        "severity": doc.get("severity", "MEDIUM"),
        "budget": doc.get("budget", 250),
        "system_prompt": doc.get("system_prompt", ""),
        "organization": doc.get("organization", ""),
        "auditor": doc.get("auditor", ""),
    }
