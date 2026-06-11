from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, HttpUrl

from .storage import Storage

app = FastAPI(title="Doctrina example — URL shortener")
storage = Storage("urls.db")


class ShortenRequest(BaseModel):
    url: HttpUrl


@app.post("/shorten")
def shorten(req: ShortenRequest) -> dict[str, str]:
    code = storage.put(str(req.url))
    return {"code": code, "short_url": f"/{code}"}


@app.get("/{code}")
def redirect(code: str) -> RedirectResponse:
    target = storage.get(code)
    if target is None:
        raise HTTPException(status_code=404, detail="unknown code")
    return RedirectResponse(url=target, status_code=302)
