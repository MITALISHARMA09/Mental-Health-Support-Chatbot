import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import YouTube from "react-youtube";
import "./App5.css";

function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([
    { sender: "bot", text: "Hello! How can I support your mental health today?" }
  ]);
  const [showMusic, setShowMusic] = useState(false);
  const [musicId, setMusicId] = useState("");
  const [ttsEnabled, setTtsEnabled] = useState(true);

  const messagesEndRef = useRef(null);

  // ✅ Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // ✅ Send text message (from input)
  const sendMessage = async () => {
    if (message.trim() === "") return;

    const newChat = [...chat, { sender: "user", text: message }];
    setChat(newChat);
    setMessage(""); // Clear input

    window.speechSynthesis.cancel(); // Stop any previous TTS
    
      if (isStopMusicRequest(message)) {
    setShowMusic(false);
    setChat([
      ...newChat,
      { sender: "bot", text: "Stopping the soothing sounds for you. 🎧" },
    ]);
    return;
  }
    if (isTherapyMusicRequest(message)) {
      playTherapyMusic();
      setChat([
        ...newChat,
        { sender: "bot", text: "Playing some soothing sounds for you... 🎧" },
      ]);
      return;
    }

    try {
      const response = await axios.post("http://127.0.0.1:5000/chat", {
        message,
      });

      const botResponse = response.data.response.response || "Sorry, I couldn't understand that.";
      setChat((prevChat) => [...prevChat, { sender: "bot", text: botResponse }]);

      if (ttsEnabled) speakTextInChunks(botResponse);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = "Oops! Something went wrong. Please try again later.";
      setChat((prevChat) => [...prevChat, { sender: "bot", text: errorMessage }]);
      if (ttsEnabled) speakTextInChunks(errorMessage);
    }
  };

  // ✅ Handle message from voice input
  const handleVoiceMessage = async (transcript) => {
    const newChat = [...chat, { sender: "user", text: transcript }];
    setChat(newChat);
    setMessage("");

    window.speechSynthesis.cancel();

    if (isTherapyMusicRequest(transcript)) {
      playTherapyMusic();
      setChat([
        ...newChat,
        { sender: "bot", text: "Playing some soothing sounds for you... 🎧" },
      ]);
      return;
    }
    const isStopMusicRequest = (msg) => {
  const lowerMsg = msg.toLowerCase();
  return lowerMsg.includes("stop") && (lowerMsg.includes("music") || lowerMsg.includes("sound"));
};

if (isStopMusicRequest(transcript)) {
  setShowMusic(false);
  setChat([
    ...newChat,
    { sender: "bot", text: "Stopping the soothing sounds for you. 🎧" },
  ]);
  return;
}

    try {
      const response = await axios.post("http://127.0.0.1:5000/chat", {
        message: transcript,
      });

      const botResponse = response.data.response.response || "Sorry, I couldn't understand that.";
      setChat((prevChat) => [...prevChat, { sender: "bot", text: botResponse }]);

      if (ttsEnabled) speakTextInChunks(botResponse);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = "Oops! Something went wrong. Please try again later.";
      setChat((prevChat) => [...prevChat, { sender: "bot", text: errorMessage }]);
      if (ttsEnabled) speakTextInChunks(errorMessage);
    }
  };

  const isTherapyMusicRequest = (message) => {
    const lowerMsg = message.toLowerCase();
    const relaxWords = ["music", "sound", "song", "listen", "play"];
    const calmWords = ["calm", "soothing", "relax", "meditation", "peace", "stress"];

    const hasMusicWord = relaxWords.some((word) => lowerMsg.includes(word));
    const hasCalmWord = calmWords.some((word) => lowerMsg.includes(word));

    return hasMusicWord || hasCalmWord;
  };
const isStopMusicRequest = (msg) => {
  const lowerMsg = msg.toLowerCase();
  return (
    lowerMsg.includes("stop") &&
    (lowerMsg.includes("music") || lowerMsg.includes("sound") || lowerMsg.includes("song"))
  );
};
  const playTherapyMusic = () => {
    setShowMusic(true);
    setMusicId("PLE_hWyYbJLoE9D9fUyuTa5vtPJAZCBoyi"); // You can set a specific video ID here if needed
  };

  const speakTextInChunks = (text) => {
    const chunkSize = 200;
    const chunks = text.match(new RegExp(`.{1,${chunkSize}}`, 'g'));

    chunks.forEach((chunk, index) => {
      setTimeout(() => {
        if (ttsEnabled) {
          const speech = new SpeechSynthesisUtterance(chunk);
          speech.lang = "en-US";
          speech.rate = 1;
          speech.pitch = 1;
          window.speechSynthesis.speak(speech);
        }
      }, index * 3000);
    });
  };

  const startListening = () => {
    const recognition = new window.webkitSpeechRecognition() || new window.SpeechRecognition();
    recognition.lang = "en-US";
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log("Voice Input:", transcript);
      handleVoiceMessage(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
    };

    recognition.onend = () => {
      console.log("Voice recognition ended.");
    };
  };

  const handleTtsToggle = () => {
    setTtsEnabled(!ttsEnabled);
    if (!ttsEnabled) {
      window.speechSynthesis.cancel();
    }
  };

  return (
    <div className="chat-container">
      <h2>HEALBOT 🤖</h2>

      {showMusic && (
        <div className="music-container">
         <div className="music-header">
      <h3>🎵 Relax and Enjoy</h3>
      <button className="close-button" onClick={() => setShowMusic(false)}>×</button>
    </div>
          <YouTube
            videoId={musicId || ""}
            opts={{
              height: "360",
              width: "100%",
              playerVars: {
                autoplay: 1,
                listType: "playlist",
                list: musicId,
              },
            }}
          />
        </div>
      )}

      <div className="chat-box">
        {chat.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.sender}`}>
            <span>{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="tts-toggle">
        <label>
          <input type="checkbox" checked={ttsEnabled} onChange={handleTtsToggle} />
          Enable Text-to-Speech
        </label>
      </div>

      <div className="input-box">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message or use voice..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
        />
        <button onClick={sendMessage}>Send</button>
        <button onClick={startListening}>🎤</button>
      </div>
    </div>
  );
}

export default App;
