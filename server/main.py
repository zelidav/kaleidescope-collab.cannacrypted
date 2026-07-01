"""
Kaleidescope Collab — internal genetics-alignment backend.

Holds the canonical cannacrypted.json in a GCS object, gated behind a single
shared TEAM_KEY. Both read and write require the key, so the data is NOT public
even though the static shell is hosted on GitHub Pages.

Endpoints
  GET  /            → health
  GET  /check       → 200 if X-Team-Key is valid, else 401  (login gate)
  GET  /data        → returns the canonical JSON            (key required)
  POST /publish     → overwrites the canonical JSON         (key required)
"""
import hmac
import json
import os

from flask import Flask, request, jsonify, make_response
from google.cloud import storage

app = Flask(__name__)

BUCKET = os.environ["BUCKET"]
OBJECT = os.environ.get("OBJECT", "cannacrypted.json")
TEAM_KEY = os.environ["TEAM_KEY"]

_client = storage.Client()


def _blob():
    return _client.bucket(BUCKET).blob(OBJECT)


def _authed(req):
    key = req.headers.get("X-Team-Key", "")
    return bool(key) and hmac.compare_digest(key, TEAM_KEY)


def _cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Team-Key"
    resp.headers["Access-Control-Max-Age"] = "86400"
    return resp


@app.after_request
def after(resp):
    return _cors(resp)


@app.route("/", methods=["GET"])
def health():
    return "kaleidescope-collab backend ok", 200


@app.route("/check", methods=["GET", "OPTIONS"])
def check():
    if request.method == "OPTIONS":
        return _cors(make_response("", 204))
    if not _authed(request):
        return jsonify(ok=False, error="unauthorized"), 401
    return jsonify(ok=True), 200


@app.route("/data", methods=["GET", "OPTIONS"])
def get_data():
    if request.method == "OPTIONS":
        return _cors(make_response("", 204))
    if not _authed(request):
        return jsonify(ok=False, error="unauthorized"), 401
    blob = _blob()
    if not blob.exists():
        return jsonify(schema="cannacrypted", strains=[]), 200
    data = json.loads(blob.download_as_text())
    return app.response_class(json.dumps(data), mimetype="application/json")


@app.route("/publish", methods=["POST", "OPTIONS"])
def publish():
    if request.method == "OPTIONS":
        return _cors(make_response("", 204))
    if not _authed(request):
        return jsonify(ok=False, error="unauthorized"), 401
    try:
        data = request.get_json(force=True)
    except Exception as e:
        return jsonify(ok=False, error="bad json: %s" % e), 400
    if not isinstance(data, dict) or not isinstance(data.get("strains"), list):
        return jsonify(ok=False, error="payload must be an object with a strains[] array"), 400
    _blob().upload_from_string(json.dumps(data, indent=2), content_type="application/json")
    return jsonify(ok=True, strains=len(data["strains"])), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
