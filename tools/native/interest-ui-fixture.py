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

state = {"state": "pending", "interests": ""}
chat = {"id": "interests37-conversation", "title": "Reading interests", "updated": 0}
messages = []
feed = {"enabled": False, "revision": 1, "offline": False, "requests": []}

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
        if path == "/__qa/feed":
            return self.reply(feed)
        if path == "/api/session":
            return self.reply({"user": {"id": "interests37-reader", "name": "Reading tester", "login": "reading-tester"}, "capabilities": {}})
        if path == "/api/chats":
            return self.reply({"chats": [chat] if messages else [], "recommendations": state})
        if path == "/api/chats/" + chat["id"]:
            return self.reply({"chat": chat, "messages": messages, "pending": [], "agent": {"online": False}})
        if path == "/api/papers":
            return self.reply({"papers": []})
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

    def do_POST(self):
        if self.headers.get("Authorization") != "Bearer synthetic-interests37-token":
            return self.reply({"error": "Synthetic fixture only"}, 401)
        size = int(self.headers.get("Content-Length", 0))
        if not 0 <= size <= 4096:
            return self.reply({"error": "Too large"}, 413)
        value = json.loads(self.rfile.read(size) or b"{}")
        if self.path == "/__qa/feed":
            if value.get("reset"):
                feed.update(enabled=True, revision=1, offline=False, requests=[])
            for key in ("revision", "offline"):
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
