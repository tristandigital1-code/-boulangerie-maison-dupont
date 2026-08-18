from flask import Flask, render_template, request, jsonify, session
from agent.chatbot import BoulangerieAgent
import secrets

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

agents: dict[str, BoulangerieAgent] = {}


def get_agent() -> BoulangerieAgent:
    sid = session.get("sid")
    if not sid or sid not in agents:
        sid = secrets.token_hex(16)
        session["sid"] = sid
        agents[sid] = BoulangerieAgent()
    return agents[sid]


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    message = data.get("message", "").strip()
    if not message:
        return jsonify({"error": "Message vide"}), 400

    agent = get_agent()
    reponse = agent.repondre(message)
    return jsonify({"reponse": reponse})


@app.route("/api/historique", methods=["GET"])
def historique():
    agent = get_agent()
    return jsonify({"historique": agent.historique})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
