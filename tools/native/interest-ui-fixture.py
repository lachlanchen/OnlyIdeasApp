#!/usr/bin/env python3
"""Loopback-only synthetic transport for the native interest UI test.

Server preference persistence/account isolation are tested separately with the
real app in tests/research-preferences.test.mjs. No live account or model is used.
"""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
import json
import os
import time

preferences = {"topics":["imaging","optics","biomedicine"],"journals":["S137773608","S4210197940","S127827428"],"journalScope":"selected","interests":"","discipline":"","language":"en","dailyEnabled":False,"dailyTime":"09:00","timezone":"UTC","commentAlerts":True,"likeAlerts":True,"revision":"fixture-1"}
options = {"topics":[{"id":i,"name":n} for i,n in [("imaging","Imaging"),("optics","Optics"),("biomedicine","Biomedicine"),("microscopy","Microscopy"),("organoids","Organoids")]],"journals":[{"id":i,"name":n} for i,n in [("S137773608","Nature"),("S4210197940","Optica"),("S127827428","Nature Methods")]],"defaults":{k:preferences[k] for k in ["topics","journals","journalScope","interests"]}}

state = {"state": "pending", "interests": ""}
chat = {"id": "interests37-conversation", "title": "Reading interests", "updated": 0}
messages = []
notebook = {"text":"", "version":""}
reader_paper = {"id":"reader40-fixture", "title":"Cellular imaging", "authors":"Reading fixture", "language":"en", "visibility":"public", "revision":"reader40-r1", "mmd":"# Cellular imaging\n\n## Abstract\n\nOptical imaging reveals cellular structure.\n\n## Methods\n\nThe relation $E=mc^2$ remains readable.\n\n![Cell diagram](figures/diagram.svg)\n\n## Results\n\nImaging results can be annotated privately.", "assets":[{"path":"figures/diagram.svg"}]}
feed = {"enabled": False, "revision": 1, "offline": False, "anonymous": False, "requests": []}

def paper(number):
    return {"id": "cache39-" + str(number), "title": "Recommendation cache paper " + str(number), "authors": "A. Researcher", "source": "https://example.org/paper/" + str(number), "year": "2026", "journal": "Research methods", "summary": "A synthetic paper for testing saved recommendations and page navigation.", "paperId": "cache39-" + str(number)}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def reply(self, value, status=200):
        data = json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/updates.json":
            feed["updateChecks"]=feed.get("updateChecks",0)+1
            return self.reply({"schema":1,"ios":{"version":"9.9.9","build":"999"},"macos":{"version":"9.9.9","build":"999"}})
        if path == "/__qa/feed":
            return self.reply(feed)
        if path == "/api/preferences":
            return self.reply({"preferences": preferences})
        if path == "/api/preferences/options":
            return self.reply(options)
        if path == "/api/session":
            return self.reply({"user": None if feed["anonymous"] else {"id": "interests37-reader", "name": "Reading tester", "login": "reading-tester"}, "capabilities": {}})
        if path == "/api/chats":
            return self.reply({"chats": [chat] if messages else [], "recommendations": state})
        if path == "/api/chats/" + chat["id"]:
            return self.reply({"chat": chat, "messages": messages, "pending": [], "agent": {"online": False}})
        if path == "/api/papers":
            return self.reply({"papers": [reader_paper]})
        if path == "/api/papers/reader40-fixture":
            return self.reply({"paper": reader_paper})
        if path == "/api/papers/reader40-fixture/annotations":
            return self.reply({"annotations": []})
        if path == "/api/papers/reader40-fixture/notes":
            return self.reply(notebook)
        if path == "/content/reader40-fixture/figures/diagram.svg":
            data=b'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="400" height="240" fill="#e4f4ee"/><circle cx="200" cy="120" r="70" fill="#479688"/><text x="200" y="125" text-anchor="middle" fill="white">Cell</text></svg>'
            self.send_response(200);self.send_header("Content-Type","image/svg+xml");self.send_header("Content-Length",str(len(data)));self.end_headers();self.wfile.write(data);return
        if path == "/api/jobs":
            return self.reply({"jobs": []})
        if path == "/api/discovery/taxonomy":
            return self.reply({"arxiv": [], "openalex": []})
        if path == "/api/discovery" and feed["enabled"]:
            query = parse_qs(urlparse(self.path).query)
            page = int(query.get("page", ["1"])[0])
            feed["requests"].append({"page": page, "refresh": query.get("refresh", [""])[0]})
            if feed["offline"]:
                return self.reply({"error": "Offline fixture — saved papers remain available."}, 503)
            start = 101 if feed["revision"] == 2 else (1 if page == 1 else 9)
            count = 8 if page == 1 else 2
            return self.reply({"papers": [paper(i) for i in range(start, start + count)], "nextPage": 2 if page == 1 else None})
        if path.startswith("/api/discovery"):
            return self.reply({"papers": [], "items": [], "next": None})
        if path == "/api/health":
            return self.reply({"ok": True, "synthetic": True, "pid": os.getpid()})
        return self.reply({})

    def do_PUT(self):
        if self.path not in ["/api/preferences", "/api/papers/reader40-fixture/notes"] or self.headers.get("Authorization") != "Bearer synthetic-interests37-token":
            return self.reply({"error":"Fixture only"},403)
        size = int(self.headers.get("Content-Length",0))
        if not 0 <= size <= 4096:
            return self.reply({"error":"Too large"},413)
        value=json.loads(self.rfile.read(size) or b"{}")
        if self.path.endswith("/notes"):
            if value.get("version") != notebook["version"]:
                return self.reply({"error":"Notes changed"},409)
            notebook.update(text=value.get("text",""),version="notes-"+str(time.time_ns()))
            return self.reply(notebook)
        if value.get("revision") != preferences["revision"]:
            return self.reply({"error":"Preferences changed elsewhere"},409)
        preferences.update(value)
        preferences["revision"]="fixture-"+str(time.time_ns())
        return self.reply({"preferences":preferences})

    def do_POST(self):
        if self.headers.get("Authorization") != "Bearer synthetic-interests37-token":
            return self.reply({"error": "Synthetic fixture only"}, 401)
        size = int(self.headers.get("Content-Length", 0))
        if not 0 <= size <= 4096:
            return self.reply({"error": "Too large"}, 413)
        value = json.loads(self.rfile.read(size) or b"{}")
        if self.path == "/__qa/feed":
            if value.get("reset"):
                feed.update(enabled=True, revision=1, offline=False, anonymous=False, requests=[])
            for key in ("revision", "offline", "anonymous"):
                if key in value:
                    feed[key] = value[key]
            return self.reply(feed)
        if self.path == "/api/chats/interests":
            if value.get("skip"):
                state.update(state="skipped")
            else:
                state.update(state="chosen", interests=value["text"])
                chat["updated"] = int(time.time() * 1000)
                messages[:] = [
                    {"id": "interests37-user", "role": "user", "text": value["text"]},
                    {"id": "interests37-assistant", "role": "assistant", "text": "Your reading interests are saved."},
                ]
            return self.reply({"recommendations": state, "chat": chat, "messages": messages})
        if self.path == "/api/lac/activity":
            return self.reply({"enabled": False})
        return self.reply({"error": "Not a fixture operation"}, 404)


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 18649), Handler).serve_forever()
