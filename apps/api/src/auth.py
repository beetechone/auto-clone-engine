import httpx, time
from jose import jwt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from loguru import logger
import os

AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE")
AUTH0_ALG = os.getenv("AUTH0_ALG", "RS256")
JWKS_CACHE = {"keys": None, "exp": 0}

security = HTTPBearer(auto_error=False)

async def get_jwks():
    now = time.time()
    if JWKS_CACHE["keys"] and JWKS_CACHE["exp"] > now:
        return JWKS_CACHE["keys"]
    url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url)
        r.raise_for_status()
        keys = r.json()
        JWKS_CACHE["keys"] = keys
        JWKS_CACHE["exp"] = now + 3600
        return keys

def get_kid(token):
    header = jwt.get_unverified_header(token)
    return header.get("kid")

def match_key(keys, kid):
    for k in keys.get("keys", []):
        if k.get("kid") == kid: return k
    return None

async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing Authorization")
    token = credentials.credentials
    try:
        keys = await get_jwks()
        kid = get_kid(token)
        key = match_key(keys, kid)
        if not key: raise Exception("No matching JWK")
        payload = jwt.decode(token, key, algorithms=[AUTH0_ALG], audience=AUTH0_AUDIENCE, options={"verify_at_hash": False})
        return payload
    except Exception as e:
        logger.error({"event":"auth_error","error":str(e)})
        raise HTTPException(status_code=401, detail="Invalid token")
