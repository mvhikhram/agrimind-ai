import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  User, 
  Droplet, 
  HelpCircle, 
  CheckCircle2,
  Calendar,
  Layers
} from 'lucide-react';
import { Farm, Zone, SensorData } from '../types';
import { aiService } from '../services/aiService';

interface FarmCopilotProps {
  farm: Farm;
  zones: Zone[];
  telemetry: SensorData;
}

interface Message {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  timestamp: string;
}

const SUGGESTED_QUESTIONS = [
  "Should I irrigate now?",
  "What should I do today?",
  "Why is Zone 2 dry?",
  "How much water did I use today?",
  "What crop can I grow?",
  "Check this plant disease."
];

export const FarmCopilot: React.FC<FarmCopilotProps> = ({ farm, zones, telemetry }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-1',
      sender: 'copilot',
      text: `Namaste! I am your AI Farm Copilot for ${farm.name} in ${farm.district}, ${farm.state}.\n\nI am connected to your STM32 Nucleo + ESP32 gateway telemetry. Current status: Soil Moisture is ${telemetry.soil_moisture}%, Tank Level is ${telemetry.tank_level}%, and 1,280 Liters have been consumed today. How can I assist your field operations?`,
      timestamp: 'Just now'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (questionText?: string) => {
    const textToSend = questionText || inputText;
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: 'Just now'
    };

    setMessages(prev => [...prev, userMsg]);
    if (!questionText) setInputText('');
    setIsTyping(true);

    // Simulate snappy contextual reply
    setTimeout(() => {
      const reply = aiService.generateCopilotResponse(textToSend, farm, zones);
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'copilot',
        text: reply,
        timestamp: 'Just now'
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-farm-400" />
            <span>FARM COPILOT: Context-Aware Agronomic Assistant</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time advisory grounded in physical sensor readings, soil chemistry, and weather cues.
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-farm-300 bg-farm-500/10 px-3 py-1.5 rounded-full border border-farm-500/20">
          Connected: {farm.name}
        </span>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-obsidian-850/90 border border-farm-500/20 rounded-3xl p-6 flex flex-col h-[650px] shadow-glow-sm">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-xs sm:text-sm">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isUser 
                    ? 'bg-slate-700 text-white' 
                    : 'bg-gradient-to-br from-farm-400 to-farm-600 text-obsidian-950 font-bold shadow-glow-sm'
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 stroke-[2.5]" />}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-xl p-4 rounded-2xl whitespace-pre-line leading-relaxed ${
                  isUser
                    ? 'bg-farm-600 text-white rounded-tr-none font-medium'
                    : 'bg-obsidian-900 border border-farm-500/20 text-slate-200 rounded-tl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-farm-500/20 flex items-center justify-center text-farm-300">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="bg-obsidian-900 border border-farm-500/10 p-3 rounded-2xl text-slate-400 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-farm-400 animate-pulse"></span>
                <span>Farm Copilot is analyzing soil & weather telemetry...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="pt-4 border-t border-farm-500/10 mb-3">
          <span className="text-[11px] font-semibold text-slate-400 block mb-2">
            Ask Farm Copilot directly:
          </span>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="px-3 py-1.5 rounded-full bg-obsidian-900 hover:bg-farm-900/40 text-slate-300 hover:text-farm-300 border border-farm-500/15 text-xs transition-all font-medium"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            placeholder="Ask about irrigation, soil deficit, tank levels, or crop profitability..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-obsidian-900 border border-farm-500/20 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-farm-400 transition-all placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="px-5 py-3.5 rounded-2xl bg-farm-500 hover:bg-farm-400 text-obsidian-950 font-black text-sm shadow-glow-sm transition-all disabled:opacity-40 flex items-center gap-2"
          >
            <span>Ask</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
