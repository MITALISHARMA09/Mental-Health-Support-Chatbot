import os
import json
import pandas as pd
from rapidfuzz import process
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import SystemMessage, HumanMessage
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Flask App Initialization
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")  # secret key from .env
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

# Load dataset
DATASET_PATH = "train.csv"
df = pd.read_csv(DATASET_PATH) if os.path.exists(DATASET_PATH) else None

# Get API key
API_KEY = os.getenv("API_KEY")

# Initialize Chat Model
chat_model = ChatGoogleGenerativeAI(model="gemini-1.5-pro", google_api_key=API_KEY)

# Define system instructions for AI
system_prompt = SystemMessage(content="""
You are a friendly and empathetic mental health chatbot.
Provide supportive responses based on past expert conversations or generate helpful advice.
""")

# Function to find the best match from the dataset
def find_best_match(user_message, confidence_threshold=75):
    if df is None or "Concern" not in df.columns or "Response" not in df.columns:
        return None, 0
    concerns = df["Concern"].dropna().tolist()
    match, score, index = process.extractOne(user_message, concerns)
    return (df.iloc[index]["Response"], score) if score >= confidence_threshold else (None, 0)

# Function to generate AI response
def get_ai_response(user_message, context=""):
    messages = [system_prompt, HumanMessage(content=f"{context} User: {user_message}")]
    try:
        response = chat_model.invoke(messages)
        return response.content.replace("\n\n", " ").replace("\n", " ")
    except Exception as e:
        return f"Sorry, an error occurred: {e}"

# Chatbot logic
def chat_with_bot(user_message):
    dataset_response, confidence = find_best_match(user_message)
    if confidence >= 85:
        return {"source": "dataset", "response": dataset_response}
    elif confidence >= 75:
        refined_response = get_ai_response(user_message, context=f"Past Expert Response: {dataset_response}\nRefine this response.")
        return {"source": "ai-enhanced", "response": refined_response}
    return {"source": "ai-model", "response": get_ai_response(user_message)}

# API Endpoint: Chatbot
@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "").strip()
    if not user_message:
        return jsonify({"error": "Message parameter is required."}), 400
    chatbot_response = chat_with_bot(user_message)
    session.setdefault("chat_history", []).append({"user": user_message, "bot": chatbot_response["response"]})
    session["chat_history"] = session["chat_history"][-10:]
    session.modified = True
    return jsonify({"response": chatbot_response, "chat_history": session["chat_history"]})

# API Endpoint: End Session
@app.route("/end_session", methods=["POST"])
def end_session():
    session.clear()
    return jsonify({"message": "Session ended. Chat history cleared."})

# Run Flask app
if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)

# How to test:
#    Test the chatbot endpoint:
#    URL: http://127.0.0.1:5000/chat
#    Method: POST
#    Body (JSON): {"message": "I'm feeling stressed."}



