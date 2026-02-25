'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Calendar, List, Clock, Settings, Globe,
  ChevronRight, Trash2, Video, Image as ImageIcon,
  Heart, Sparkles, MessageCircle, Info, CheckCircle,
  AlertCircle, Camera, X, Play
} from 'lucide-react';

const LANGUAGES = {
  JA: {
    welcome: "思い出をカプセルに。",
    welcomeSub: "ペットとの大切な時間をAIと一緒に記録しましょう。",
    start: "はじめる 🐾",
    timeline: "タイムライン",
    list: "リスト",
    calendar: "カレンダー",
    settings: "設定",
    edit: "編集",
    save: "保存",
    delete: "削除",
    createCapsule: "思い出を記録",
    thinking: (name, type) => `${name}があとで返信してくれるよ、まってて${type === 'dog' ? 'ワン' : 'ニャ'}`,
    replyFrom: "のきもち",
    aiSettings: "AIの知能設定 (Gemini API)",
    userName: "飼い主の名前",
    petSettings: "ペット設定",
    name: "お名前",
    type: "種類",
    cat: "猫",
    dog: "犬",
    other: "その他",
    age: "年齢",
    sex: "性別",
    personality: "性格",
    sweet: "あまえんぼ",
    cool: "クール",
    playful: "やんちゃ",
    featureRequest: "✨ 犬対応などの新機能リクエスト",
    bestShot: "👑 BEST SHOT",
    videoDigest: "🎬 動画ダイジェスト",
    bestVideo: "✨ ベスト版作成",
    apiKeyHelp: "AIと会話するにはGoogle GeminiのAPIキーが必要です（無料）。1.Google AI Studioでキーを作成 2.ここに貼り付けて保存してください。",
    howToTitle: "APIキーの取得方法",
    privacy: "プライバシーポリシー",
    terms: "利用規約",
  },
  EN: {
    welcome: "Memories in Capsules.",
    welcomeSub: "Record precious moments with your pets assisted by AI.",
    start: "Get Started 🐾",
    timeline: "Timeline",
    list: "List",
    calendar: "Calendar",
    settings: "Settings",
    edit: "Edit",
    save: "Save",
    delete: "Delete",
    createCapsule: "Create Capsule",
    thinking: (name, type) => `${name} is writing a reply for you, wait for me ${type === 'dog' ? 'woof' : 'meow'}`,
    replyFrom: "'s feelings",
    aiSettings: "AI Intelligence (Gemini API)",
    userName: "Owner Name",
    petSettings: "Pet Settings",
    name: "Name",
    type: "Type",
    cat: "Cat",
    dog: "Dog",
    other: "Other",
    age: "Age",
    sex: "Sex",
    personality: "Personality",
    sweet: "Sweet",
    cool: "Cool",
    playful: "Playful",
    featureRequest: "✨ Request New Features",
    bestShot: "👑 BEST SHOT",
    videoDigest: "🎬 Video Digest",
    bestVideo: "✨ Best Version",
    apiKeyHelp: "Need a free Gemini API key to talk to your pet. 1. Create key at Google AI Studio 2. Paste here and Save.",
    howToTitle: "How to get API Key",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
  },
  ZH: {
    welcome: "将回忆装入胶囊。",
    welcomeSub: "在AI的帮助下记录与宠物の珍贵时光。",
    start: "开始 🐾",
    timeline: "时间轴",
    list: "列表",
    calendar: "日历",
    settings: "设置",
    edit: "编辑",
    save: "保存",
    delete: "删除",
    createCapsule: "记录回忆",
    thinking: (name, type) => `${name}稍后会回复你的，等我一下${type === 'dog' ? '汪' : '喵'}`,
    replyFrom: "的心情",
    aiSettings: "AI 智能设置 (Gemini API)",
    userName: "主人姓名",
    petSettings: "宠物设置",
    name: "名字",
    type: "种类",
    cat: "猫",
    dog: "狗",
    other: "其他",
    age: "年龄",
    sex: "性别",
    personality: "性格",
    sweet: "撒娇",
    cool: "高冷",
    playful: "淘气",
    featureRequest: "✨ 核心功能反馈与新功能请求",
    bestShot: "👑 最佳瞬间",
    videoDigest: "🎬 视频摘要",
    bestVideo: "✨ 制作精华版",
    apiKeyHelp: "需要免费的 Gemini API 密钥。1. 在 Google AI Studio 创建密钥 2. 粘贴到此处并保存。",
    howToTitle: "如何获取 API 密钥",
    privacy: "隐私政策",
    terms: "使用条款",
  }
};

/**
 * Helper to convert File to base64 for Gemini
 */
const fileToGenerativePart = async (file) => {
  const base64EncodedDataPromise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export default function Home() {
  const [lang, setLang] = useState('JA');
  const t = LANGUAGES[lang];

  const [view, setView] = useState('timeline');
  const [entries, setEntries] = useState([]);
  const [isMounted, setIsMounted] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [apiKey, setApiKey] = useState('');
  const [userName, setUserName] = useState('Owner');
  const [aiStatus, setAiStatus] = useState('idle');
  const [aiError, setAiError] = useState('');
  const [stableModel, setStableModel] = useState('gemini-1.5-flash');

  const [cats, setCats] = useState([
    { id: 1, name: 'Tama', sex: 'Male', age: '2', personality: 'sweet', emoji: '🐱', type: 'cat' }
  ]);
  const [activeCatId, setActiveCatId] = useState(1);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showApiKeyHelp, setShowApiKeyHelp] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [newText, setNewText] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🐱');
  const [mediaType, setMediaType] = useState('video');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const activeCat = cats.find(c => c.id === activeCatId) || cats[0];

  const updateActiveCat = (newData) => {
    setCats(prev => prev.map(c => c.id === activeCatId ? { ...c, ...newData } : c));
  };

  const getDB = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') return reject('No window');
      const request = indexedDB.open('NyanCapsuleDB', 2);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('media')) db.createObjectStore('media');
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }, []);

  const saveMediaToDB = async (id, blob) => {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('media', 'readwrite');
        tx.objectStore('media').put(blob, id.toString());
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
      });
    } catch (e) { console.error(e); }
  };

  const getMediaFromDB = async (id) => {
    try {
      const db = await getDB();
      const tx = db.transaction('media', 'readonly');
      const request = tx.objectStore('media').get(id.toString());
      return new Promise((resolve) => {
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = () => resolve(null);
      });
    } catch (e) { return null; }
  };

  // --- Initialization ---
  useEffect(() => {
    setIsMounted(true);
    const init = async () => {
      const savedLang = localStorage.getItem('nyan_lang');
      const savedEntries = localStorage.getItem('nyan_entries');
      const savedCats = localStorage.getItem('nyan_cats');
      const savedActiveId = localStorage.getItem('nyan_active_id');
      const savedUser = localStorage.getItem('nyan_user_name');
      const savedKey = localStorage.getItem('nyan_api_key');
      const onboarded = localStorage.getItem('nyan_onboarded');

      if (savedLang) setLang(savedLang);
      if (!onboarded) setShowOnboarding(true);
      if (savedUser) setUserName(savedUser);

      // Use env var as fallback if localStorage is empty
      const initialKey = savedKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
      setApiKey(initialKey);

      if (savedCats) {
        try {
          const parsedCats = JSON.parse(savedCats);
          setCats(parsedCats);
          if (savedActiveId) setActiveCatId(Number(savedActiveId));
        } catch (e) { }
      }

      if (savedEntries) {
        try {
          const parsed = JSON.parse(savedEntries);
          const hydrated = await Promise.all(parsed.map(async (entry) => {
            if (entry.hasStoredMedia) {
              const blob = await getMediaFromDB(entry.id);
              if (blob instanceof Blob) {
                return { ...entry, mediaUrl: URL.createObjectURL(blob) };
              }
            }
            return entry;
          }));
          setEntries(hydrated);
        } catch (e) { }
      }
    };
    init();
  }, [getDB]);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem('nyan_lang', lang);
  }, [lang, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    const toSave = entries.map(({ mediaUrl, ...rest }) => rest);
    localStorage.setItem('nyan_entries', JSON.stringify(toSave));
  }, [entries, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem('nyan_cats', JSON.stringify(cats));
  }, [cats, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem('nyan_active_id', activeCatId.toString());
  }, [activeCatId, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem('nyan_user_name', userName);
  }, [userName, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem('nyan_api_key', apiKey);
  }, [apiKey, isMounted]);

  const testAiConnection = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) return setAiError('Key required');
    setAiStatus('testing');
    setAiError('');

    try {
      // Try v1 first, then v1beta
      let listData = { models: [] };
      try {
        const resV1 = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${trimmedKey}`);
        listData = await resV1.json();
        if (listData.error) throw new Error(listData.error.message);
      } catch (e) {
        const resBeta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${trimmedKey}`);
        listData = await resBeta.json();
      }

      if (listData.error) throw new Error(listData.error.message);

      const availableModels = (listData.models || [])
        .filter(m => m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));

      const modelsToTry = [...new Set(["gemini-1.5-flash", "gemini-1.5-flash-latest", ...availableModels])];
      const genAI = new GoogleGenerativeAI(trimmedKey);
      let success = false;

      for (const modelName of modelsToTry) {
        try {
          const m = genAI.getGenerativeModel({ model: modelName });
          const result = await m.generateContent("Test");
          if (result) {
            setStableModel(modelName);
            setAiStatus('success');
            setNotification({ message: `Success! (${modelName}) 🐾` });
            setTimeout(() => setNotification(null), 3000);
            success = true;
            break;
          }
        } catch (e) { }
      }
      if (!success) {
        setAiStatus('error');
        setAiError('Could not find a valid model.');
      }
    } catch (e) {
      setAiStatus('error');
      setAiError(e.message);
    }
  };

  const callGeminiAI = async (text, file, catProf, currentLang, currentUser) => {
    const key = apiKey.trim() || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!key || !key.startsWith('AIza')) {
      console.warn("No valid API Key found");
      return null;
    }

    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: stableModel });

      const persona = `
        Language: ${currentLang}.
        Role: You are ${catProf.name}, a ${catProf.type || 'pet'}. Species: ${catProf.type}. Personality: ${catProf.personality}.
        Owner Name: ${currentUser}.
        Task: Reply to the diary entry in ${currentLang}.
        Length: Aim for approximately 50 characters (or 2-3 detailed sentences).
        Context: Be warm, unique, and empathetic. Specifically reference the TEXT content and any VISUAL details found in the photo/video provided. Use pet-like endings (e.g., 'meow/nyan' for cats, 'woof/wan' for dogs).
        If the memory is exceptionally good or emotional, set isSpecial to true.
        Return ONLY valid JSON: { "reaction": "your detailed reply", "isSpecial": true/false }
      `;

      let result;
      if (file && file.type.startsWith('image')) {
        const imagePart = await fileToGenerativePart(file);
        result = await model.generateContent([persona, text, imagePart]);
      } else {
        result = await model.generateContent([persona, text]);
      }

      const responseText = result.response.text();
      try {
        const jsonMatch = responseText.match(/\{.*\}/s);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
      } catch (e) { }
      return { reaction: responseText, isSpecial: false };
    } catch (e) {
      console.error("AI Error:", e);
      return null;
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newText.trim() || isSaving) return;
    setIsSaving(true);

    // Capture state values before clearing for the async call
    const entryId = Date.now();
    const capturedFile = selectedFile;
    const capturedText = newText;
    const capturedCat = { ...activeCat };
    const capturedLang = lang;
    const capturedUser = userName;

    try {
      if (capturedFile) await saveMediaToDB(entryId, capturedFile);

      const newEntry = {
        id: entryId, catId: capturedCat.id, date: new Date().toISOString().split('T')[0],
        displayDate: `${new Date().getMonth() + 1}/${new Date().getDate()}`,
        text: capturedText, catReaction: null, isSpecial: false, mediaType,
        mediaEmoji: selectedEmoji, mediaUrl: previewUrl, hasStoredMedia: !!capturedFile,
        mediaColor: mediaType === 'video' ? 'linear-gradient(135deg, #6c5ce7, #a29bfe)' : 'linear-gradient(135deg, #ff7675, #fab1a0)'
      };

      setEntries(prev => [newEntry, ...prev]);

      // Clear inputs
      setNewText(''); setPreviewUrl(null); setSelectedFile(null); setIsCreating(false);

      // Delay AI call to simulate "thinking" and ensure persistence
      setTimeout(async () => {
        let res = await callGeminiAI(capturedText, capturedFile, capturedCat, capturedLang, capturedUser);

        if (!res) {
          // Fallback based on personality if AI fails
          const pool = {
            sweet: capturedLang === 'JA' ? "ずっと一緒だにゃん🐾" : "Always with you 🐾",
            playful: capturedLang === 'JA' ? "遊ぼうにゃ！🐾" : "Let's play! 🐾",
            cool: capturedLang === 'JA' ? "フン、頑張ったにゃ。🐾" : "Hmph, you did well. 🐾"
          };
          res = { reaction: pool[capturedCat.personality] || "🐾", isSpecial: false };
        }

        setEntries(cur => cur.map(ent => ent.id === entryId ? { ...ent, catReaction: res.reaction, isSpecial: res.isSpecial } : ent));
        setNotification({ message: 'Got a reply! 🐾' });
        setTimeout(() => setNotification(null), 3000);
      }, 2000);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="app-container">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="notification-toast glass font-heading"
          >
            <Sparkles size={16} className="inline mr-2" />
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="header glass">
        <h1 className="sr-only">NyanCapsule - ペットとの思い出をAIと共に残す日記アプリ</h1>
        <div className="header-content">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="avatar-group"
            onClick={() => setIsEditingProfile(true)}
          >
            <div className="cat-avatar nyan-gradient clay-card">
              {activeCat.emoji}
            </div>
            <div className="edit-dot" title="Edit Profile" />
          </motion.div>

          <div className="header-main">
            <div className="title-row">
              <h2 className="font-heading">{activeCat.name}</h2>
              <span className="badge">{activeCat.type === 'cat' ? t.cat : t.dog}</span>
            </div>
            <div className="tab-nav">
              <button className={view === 'timeline' ? 'active' : ''} onClick={() => setView('timeline')}>
                <Clock size={14} /> <span>{t.timeline}</span>
              </button>
              <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
                <List size={14} /> <span>{t.list}</span>
              </button>
              <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>
                <Calendar size={14} /> <span>{t.calendar}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ rotate: 45, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="settings-btn-clay clay-card"
              onClick={() => setIsEditingProfile(true)}
              title={t.settings}
            >
              <Settings size={18} />
            </motion.button>

            <div className="lang-selector-clay">
              <Globe size={14} className="globe-icon" />
              <select value={lang} onChange={(e) => setLang(e.target.value)}>
                <option value="JA">JP</option>
                <option value="EN">EN</option>
                <option value="ZH">CN</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="pet-bar-container">
          <div className="pet-bar">
            {cats.map(c => (
              <motion.button
                key={c.id}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.9 }}
                className={`pet-btn clay-card ${activeCatId === c.id ? 'active' : ''}`}
                onClick={() => setActiveCatId(c.id)}
              >
                {c.emoji}
              </motion.button>
            ))}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="pet-btn add clay-card"
              onClick={() => {
                const id = Date.now();
                setCats([...cats, { id, name: 'New Pet', sex: '?', age: '0', personality: 'sweet', emoji: '🐾', type: 'cat' }]);
                setActiveCatId(id);
                setIsEditingProfile(true);
              }}
            >
              <Plus size={20} />
            </motion.button>
          </div>
        </div>

        <motion.div
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="view-container"
        >
          {view === 'timeline' && (
            <div className="timeline">
              {entries.filter(e => e.catId === activeCatId).map(entry => (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`card clay-card ${entry.isSpecial ? 'special' : ''}`}
                >
                  <div className="card-media" style={{ background: entry.mediaColor }}>
                    {entry.isSpecial && (
                      <div className="special-label best-shot-gradient">
                        <Sparkles size={12} /> {t.bestShot}
                      </div>
                    )}
                    {entry.mediaUrl ? (
                      entry.mediaType === 'video' ? (
                        <div className="video-container">
                          <video src={entry.mediaUrl} controls playsInline />
                        </div>
                      ) : (
                        <img src={entry.mediaUrl} alt={entry.text.substring(0, 50) || "Pet Memory"} />
                      )
                    ) : (
                      <div className="media-placeholder">
                        <span className="media-emoji float">{entry.mediaEmoji}</span>
                      </div>
                    )}
                    <div className="media-actions">
                      {entry.mediaType === 'video' && (
                        <Link href="/video" className="badge-btn clay-card">
                          <Video size={14} /> {t.videoDigest}
                        </Link>
                      )}
                      {entry.isSpecial && (
                        <Link href="/video?mode=best" className="badge-btn glow clay-card">
                          <Play size={14} /> {t.bestVideo}
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="card-meta">
                      <div className="date-pill">
                        <Calendar size={12} />
                        <span>{entry.displayDate}</span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.2, color: '#ff7675' }}
                        className="del-btn"
                        onClick={() => setEntries(prev => prev.filter(e => e.id !== entry.id))}
                      >
                        <Trash2 size={18} />
                      </motion.button>
                    </div>
                    <p className="diary-text">{entry.text}</p>
                    <div className="reply-box-clay">
                      <div className="reply-avatar-outer">
                        <div className="reply-avatar nyan-gradient clay-card">{activeCat.emoji}</div>
                      </div>
                      <div className="reply-content">
                        <span className="reply-label font-heading">
                          {activeCat.name} {t.replyFrom}
                        </span>
                        {entry.catReaction ? (
                          <p>{entry.catReaction}</p>
                        ) : (
                          <div className="thinking-anim">
                            <span className="dot">.</span><span className="dot">.</span><span className="dot">.</span>
                            {t.thinking(activeCat.name, activeCat.type)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {entries.filter(e => e.catId === activeCatId).length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon float">📦</div>
                  <h3 className="font-heading">Empty Capsule</h3>
                  <p>Start recording your pet's life!</p>
                </div>
              )}
            </div>
          )}

          {view === 'list' && (
            <div className="list-view-clay clay-card">
              {entries.filter(e => e.catId === activeCatId).map(entry => (
                <div key={entry.id} className="list-item-clay">
                  <div className="item-left">
                    <div className="item-date-pill">{entry.displayDate}</div>
                    <div className="item-media-icon nyan-gradient">
                      {entry.mediaEmoji || (entry.mediaType === 'video' ? <Video size={14} /> : <Camera size={14} />)}
                    </div>
                  </div>
                  <div className="item-center">
                    <p className="item-text">{entry.text}</p>
                  </div>
                  {entry.isSpecial && <div className="item-special">✨</div>}
                </div>
              ))}
              {entries.filter(e => e.catId === activeCatId).length === 0 && (
                <div className="p-10 text-center opacity-50">None yet</div>
              )}
            </div>
          )}

          {view === 'calendar' && (
            <div className="calendar-view-clay clay-card">
              <div className="cal-header-clay font-heading">
                {new Date().getFullYear()} / {new Date().getMonth() + 1}
              </div>
              <div className="cal-grid-clay">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="cal-weekday font-heading">{d}</div>
                ))}
                {[...Array(31)].map((_, i) => {
                  const day = i + 1;
                  const hasEntry = entries.some(e => e.catId === activeCatId && e.displayDate.endsWith(`/${day}`));
                  return (
                    <motion.div
                      key={i}
                      whileHover={hasEntry ? { scale: 1.1 } : {}}
                      className={`cal-day-clay ${hasEntry ? 'has-data' : ''}`}
                    >
                      <span className="day-num">{day}</span>
                      {hasEntry && <div className="dot-clay nyan-gradient" />}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </main>

      <AnimatePresence>
        {isEditingProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="modal-content-clay clay-card"
            >
              <div className="modal-header">
                <h3 className="font-heading">{t.settings}</h3>
                <motion.button whileHover={{ rotate: 90 }} className="close-btn" onClick={() => setIsEditingProfile(false)}>
                  <X size={24} />
                </motion.button>
              </div>

              <div className="modal-scroll-area">
                <div className="setting-section">
                  <div className="label-row">
                    <label className="font-heading"><MessageCircle size={14} className="inline mr-1" /> {t.aiSettings}</label>
                    <button className="help-icon-btn" onClick={() => setShowApiKeyHelp(!showApiKeyHelp)}><Info size={14} /></button>
                  </div>
                  <AnimatePresence>
                    {showApiKeyHelp && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="api-help-card-clay overflow-hidden"
                      >
                        <p>{t.apiKeyHelp}</p>
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="manual-link">
                          Google AI Studio →
                        </a>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="input-group-clay">
                    <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API Key" className="clay-input" />
                    <button className={`test-btn-clay ${aiStatus}`} onClick={testAiConnection}>
                      {aiStatus === 'testing' ? '...' : aiStatus === 'success' ? <CheckCircle size={18} /> : 'Test Connection'}
                    </button>
                  </div>
                  {aiError && <div className="error-text"><AlertCircle size={12} /> {aiError}</div>}
                </div>

                <div className="setting-section">
                  <label className="font-heading">Personalization</label>
                  <label className="sub-label">{t.userName}</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder={t.userName}
                    className="clay-input"
                  />
                </div>

                <div className="setting-section">
                  <label className="font-heading">{t.petSettings}</label>
                  <input
                    type="text"
                    value={activeCat.name}
                    onChange={(e) => updateActiveCat({ name: e.target.value })}
                    placeholder={t.name}
                    className="clay-input mb-4"
                  />
                  <div className="select-row-clay mb-4">
                    <select value={activeCat.type} onChange={(e) => updateActiveCat({ type: e.target.value })} className="clay-select flex-1">
                      <option value="cat">{t.cat}</option>
                      <option value="dog">{t.dog}</option>
                      <option value="other">{t.other}</option>
                    </select>
                    <select value={activeCat.personality} onChange={(e) => updateActiveCat({ personality: e.target.value })} className="clay-select flex-1">
                      <option value="sweet">{t.sweet}</option>
                      <option value="cool">{t.cool}</option>
                      <option value="playful">{t.playful}</option>
                    </select>
                  </div>
                  <div className="emoji-row">
                    {['🐱', '🐶', '🐰', '🐹', '🦁', '🐾'].map(e => (
                      <motion.button
                        key={e}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className={`emoji-btn clay-card ${activeCat.emoji === e ? 'active' : ''}`}
                        onClick={() => updateActiveCat({ emoji: e })}
                      >
                        {e}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="clay-button w-full font-heading mt-6"
                onClick={() => setIsEditingProfile(false)}
              >
                {t.save}
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="modal-content-clay clay-card"
            >
              <div className="modal-header">
                <h3 className="font-heading">{t.createCapsule}</h3>
                <motion.button whileHover={{ rotate: 90 }} className="close-btn" onClick={() => setIsCreating(false)}>
                  <X size={24} />
                </motion.button>
              </div>

              <form onSubmit={handleCreate}>
                <div className="upload-zone-clay">
                  <input
                    type="file"
                    id="file"
                    accept="image/*,video/*"
                    className="hidden-input"
                    onChange={(e) => {
                      const f = e.target.files[0];
                      if (f) {
                        const type = f.type.startsWith('image') ? 'photo' : 'video';
                        setSelectedFile(f);
                        setMediaType(type);
                        setPreviewUrl(URL.createObjectURL(f));
                      }
                    }}
                  />
                  <motion.label
                    whileHover={{ scale: 1.02 }}
                    htmlFor="file"
                    className="upload-btn-clay clay-card"
                  >
                    {previewUrl ? (
                      mediaType === 'video' ? (
                        <video src={previewUrl} className="preview-media" muted playsInline />
                      ) : (
                        <img src={previewUrl} className="preview-media" alt="Preview" />
                      )
                    ) : (
                      <div className="upload-placeholder">
                        <Camera size={40} className="mb-2 opacity-50" />
                        <span className="text-xs font-bold opacity-50 uppercase tracking-widest">Add Media</span>
                      </div>
                    )}
                  </motion.label>
                </div>

                <div className="textarea-container-clay clay-card mb-6">
                  <textarea
                    placeholder="What happened today?..."
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    autoFocus
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="clay-button w-full font-heading"
                  disabled={!newText.trim() || isSaving}
                >
                  {isSaving ? "Creating..." : t.save}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isCreating && !isEditingProfile && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9, rotate: -5 }}
          className="fab-clay nyan-gradient clay-card"
          onClick={() => setIsCreating(true)}
        >
          <Plus size={32} strokeWidth={3} />
        </motion.button>
      )}

      <footer className="footer-clay">
        <div className="footer-content">
          <div className="ad-box-clay clay-card">
            <span className="font-heading">SPONSORED</span>
            <p>Support NyanCapsule 🐾</p>
          </div>
          <button onClick={() => window.open('https://forms.gle/S2Y2r7Y9YEqXQYvP9')} className="request-link-clay">
            {t.featureRequest}
          </button>
          <div className="policy-links">
            <Link href="/privacy">{t.privacy || 'プライバシーポリシー'}</Link>
            <Link href="/terms">{t.terms || '利用規約'}</Link>
          </div>
          <div className="about-section mt-10 p-6 opacity-60 text-xs leading-relaxed max-w-md mx-auto">
            <p>NyanCapsuleは、愛するペットとの瞬間を大切に保存し、AIの力でその思い出をより輝かせるためのデジタルカプセルです。動画ダイジェスト生成やAIリアクションなど、最新技術でペットとの絆を深めます。</p>
          </div>
        </div>
      </footer>
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            style={{ alignItems: 'center', background: 'rgba(255, 247, 237, 0.95)' }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="onboarding-card-clay clay-card"
            >
              <div className="onboarding-emoji">🐾</div>
              <h1 className="font-heading text-3xl mb-4">{t.welcome}</h1>
              <p className="opacity-70 mb-8 leading-relaxed">{t.welcomeSub}</p>

              <div className="flex flex-col gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="clay-button text-lg py-4"
                  onClick={() => {
                    setShowOnboarding(false);
                    localStorage.setItem('nyan_onboarded', 'true');
                  }}
                >
                  {t.start}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .app-container { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg-warm); color: var(--text-main); font-family: var(--font-body); }
        
        .header { padding: 50px 20px 25px; border-radius: 0 0 40px 40px; position: sticky; top: -30px; z-index: 100; border-bottom: 4px solid #fff; }
        .header-content { display: flex; align-items: center; gap: 15px; max-width: 600px; margin: 0 auto; width: 100%; }
        
        .avatar-group { position: relative; cursor: pointer; }
        .cat-avatar { width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 32px; border: 4px solid #fff; }
        .edit-dot { position: absolute; bottom: 0; right: 0; width: 14px; height: 14px; background: #2ecc71; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        
        .header-main { flex: 1; }
        .title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
        .title-row h2 { font-size: 22px; margin: 0; color: var(--text-main); }
        .badge { font-size: 10px; background: rgba(0,0,0,0.05); padding: 2px 8px; border-radius: 8px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; }
        
        .tab-nav { display: flex; gap: 12px; }
        .tab-nav button { background: none; border: none; font-size: 11px; font-weight: 800; color: var(--text-muted); cursor: pointer; padding: 6px 4px; display: flex; align-items: center; gap: 4px; transition: all 0.2s; opacity: 0.6; }
        .tab-nav button span { display: inline; }
        .tab-nav button.active { color: var(--primary); opacity: 1; border-bottom: 3px solid var(--primary); }
        
        .lang-selector-clay { background: white; border-radius: 12px; padding: 4px 8px; display: flex; align-items: center; gap: 6px; border: 2px solid #fff; box-shadow: var(--clay-shadow-outer); }
        .lang-selector-clay select { background: none; border: none; font-size: 12px; font-weight: 900; color: var(--text-main); outline: none; cursor: pointer; }
        .globe-icon { color: var(--primary); opacity: 0.7; }

        .main-content { flex: 1; padding: 10px 20px 100px; max-width: 600px; margin: 0 auto; width: 100%; }
        
        .pet-bar-container { margin: 25px 0 35px; overflow-x: auto; padding-bottom: 10px; -webkit-overflow-scrolling: touch; }
        .pet-bar { display: flex; gap: 16px; padding: 4px; }
        .pet-btn { width: 64px; height: 64px; min-width: 64px; border-radius: 20px; border: 4px solid #fff; display: flex; align-items: center; justify-content: center; font-size: 32px; cursor: pointer; background: white; }
        .pet-btn.active { border-color: var(--primary); background: #fff7ed; transform: scale(1.1); box-shadow: 0 12px 24px rgba(249, 115, 22, 0.2); }
        .pet-btn.add { color: #ccc; border-style: dashed; font-size: 24px; background: rgba(0,0,0,0.02); }

        .timeline { display: flex; flex-direction: column; gap: 40px; }
        .card { border-radius: 36px; border: 5px solid #fff; overflow: hidden; background: white; }
        .card.special { border-color: #FDE68A; }
        .card-media { height: 260px; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .card-media img, .card-media video { width: 100%; height: 100%; object-fit: cover; }
        .media-emoji { font-size: 100px; }
        
        .special-label { position: absolute; top: 20px; left: 20px; padding: 6px 14px; border-radius: 14px; font-size: 11px; font-weight: 900; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 10; }
        
        .media-actions { position: absolute; top: 20px; right: 20px; display: flex; flex-direction: column; gap: 10px; z-index: 10; }
        .badge-btn { padding: 10px 18px; border-radius: 20px; font-size: 12px; font-weight: 900; text-decoration: none !important; display: flex; align-items: center; gap: 8px; border: 3px solid #fff; background: white; color: var(--text-main) !important; transition: all 0.2s; }
        .badge-btn.glow { background: var(--primary); color: white !important; border-color: rgba(255,255,255,0.3); box-shadow: 0 8px 16px rgba(249, 115, 22, 0.4); }

        .card-body { padding: 30px; }
        .card-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .date-pill { background: var(--bg-warm); color: var(--text-muted); padding: 4px 12px; border-radius: 10px; font-size: 12px; font-weight: 800; display: flex; align-items: center; gap: 6px; }
        .del-btn { background: none; border: none; color: #fecaca; cursor: pointer; padding: 4px; }
        
        .diary-text { font-size: 18px; line-height: 1.6; color: var(--text-main); margin-bottom: 25px; font-weight: 500; }
        
        .reply-box-clay { background: #fff7ed; padding: 24px; border-radius: 28px; display: flex; gap: 18px; border: 3px solid #fff; box-shadow: inset 0 4px 10px rgba(154, 52, 18, 0.03); }
        .reply-avatar-outer { }
        .reply-avatar { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 24px; border: 3px solid #fff; }
        .reply-label { display: block; font-size: 11px; font-weight: 900; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
        .reply-content p { font-size: 15px; color: var(--text-main); line-height: 1.5; font-style: italic; }

        .thinking-anim { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #999; font-style: italic; }
        .thinking-anim .dot { animation: blink 1.4s infinite; font-weight: bold; }
        .thinking-anim .dot:nth-child(2) { animation-delay: 0.2s; }
        .thinking-anim .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }

        .modal-overlay { position: fixed; inset: 0; background: rgba(154, 52, 18, 0.15); backdrop-filter: blur(20px); z-index: 1000; display: flex; align-items: flex-end; justify-content: center; padding-top: env(safe-area-inset-top); }
        .modal-content-clay { width: 100%; max-width: 500px; background: #fffcf9; padding: 35px; border-radius: 45px 45px 0 0; border: 6px solid #fff; max-height: 94vh; display: flex; flex-direction: column; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .close-btn { background: none; border: none; color: #cbd5e1; cursor: pointer; padding: 4px; }
        
        .modal-scroll-area { flex: 1; overflow-y: auto; padding-right: 4px; }
        .setting-section { margin-bottom: 30px; }
        .setting-section label { display: block; font-size: 13px; font-weight: 900; color: var(--text-muted); margin-bottom: 12px; }
        .sub-label { font-size: 11px !important; margin-bottom: 6px !important; opacity: 0.7; }
        
        .clay-input { width: 100%; padding: 16px 20px; border-radius: 18px; border: 3px solid #fff; background: white; font-size: 15px; font-weight: 600; box-shadow: var(--clay-shadow-outer), inset 0 2px 4px rgba(0,0,0,0.02); outline: none; transition: border-color 0.2s; color: var(--text-main); }
        .clay-input:focus { border-color: var(--primary); }
        
        .input-group-clay { display: flex; gap: 10px; margin-top: 10px; }
        .test-btn-clay { padding: 0 20px; border-radius: 18px; border: 4px solid #fff; font-weight: 900; font-size: 13px; cursor: pointer; background: #f1f5f9; color: #64748b; transition: all 0.2s; }
        .test-btn-clay.success { background: #2ecc71; color: white; border-color: rgba(255,255,255,0.2); }
        .test-btn-clay.testing { opacity: 0.7; cursor: wait; }

        .api-help-card-clay { background: #fffbeb; border: 3px solid #fde68a; padding: 20px; border-radius: 20px; margin-bottom: 20px; font-size: 13px; color: #92400e; line-height: 1.6; }
        .error-text { color: #ef4444; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 4px; margin-top: 8px; }

        .select-row-clay { display: flex; gap: 12px; }
        .clay-select { padding: 14px 18px; border-radius: 18px; border: 3px solid #fff; background: white; font-size: 14px; font-weight: 800; color: var(--text-main); outline: none; box-shadow: var(--clay-shadow-outer); appearance: none; cursor: pointer; }

        .emoji-btn { width: 54px; height: 54px; font-size: 26px; border: 3px solid #fff; display: flex; align-items: center; justify-content: center; }
        .emoji-btn.active { border-color: var(--primary); background: #fff7ed; }

        .upload-zone-clay { margin-bottom: 25px; }
        .hidden-input { display: none; }
        .upload-btn-clay { height: 200px; border-radius: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; background: #f8fafc; border: 4px dashed #e2e8f0; }
        .preview-media { width: 100%; height: 100%; object-fit: cover; }
        .upload-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; }
        
        .textarea-container-clay { padding: 20px; border: 4px solid #fff; background: white; }
        .textarea-container-clay textarea { width: 100%; height: 140px; border: none; outline: none; font-size: 18px; font-weight: 500; font-family: inherit; resize: none; color: var(--text-main); background: transparent; }

        .fab-clay { position: fixed; bottom: 35px; right: 30px; width: 72px; height: 72px; border-radius: 24px; border: 5px solid #fff; z-index: 50; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 15px 30px rgba(249, 115, 22, 0.4); }

        .list-view-clay { padding: 15px; border-radius: 32px; background: white; border: 4px solid #fff; }
        .list-item-clay { display: flex; align-items: center; gap: 20px; padding: 20px; border-bottom: 2px solid #f1f5f9; transition: background 0.2s; border-radius: 20px; cursor: pointer; }
        .list-item-clay:last-child { border: none; }
        .list-item-clay:hover { background: var(--bg-warm); }
        .item-left { display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 60px; }
        .item-date-pill { font-size: 11px; font-weight: 900; color: var(--text-muted); opacity: 0.6; }
        .item-media-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; border: 2px solid rgba(255,255,255,0.3); box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .item-center { flex: 1; }
        .item-text { font-size: 15px; font-weight: 600; color: var(--text-main); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .item-special { font-size: 20px; color: #f1c40f; }

        .calendar-view-clay { padding: 30px; border-radius: 36px; border: 5px solid #fff; background: white; }
        .cal-header-clay { font-size: 24px; font-weight: 900; text-align: center; margin-bottom: 30px; color: var(--text-main); }
        .cal-grid-clay { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; }
        .cal-weekday { text-align: center; font-size: 10px; font-weight: 900; color: var(--text-muted); padding-bottom: 15px; }
        .cal-day-clay { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 12px; background: #f8fafc; position: relative; cursor: pointer; transition: all 0.2s; }
        .cal-day-clay.has-data { background: white; box-shadow: var(--clay-shadow-outer); border: 2px solid var(--bg-warm); }
        .day-num { font-size: 12px; font-weight: 800; color: #64748b; }
        .cal-day-clay.has-data .day-num { color: var(--text-main); }
        .dot-clay { position: absolute; bottom: 6px; width: 6px; height: 6px; border-radius: 50%; box-shadow: 0 2px 4px rgba(249, 115, 22, 0.3); }

        .notification-toast { position: fixed; bottom: 120px; left: 50%; background: white; padding: 14px 28px; border-radius: 20px; border: 4px solid #fff; color: var(--primary); font-weight: 900; font-size: 14px; z-index: 2000; box-shadow: 0 20px 40px rgba(154, 52, 18, 0.15); }
        
        .footer-clay { padding: 60px 20px; text-align: center; }
        .footer-content { max-width: 400px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .ad-box-clay { padding: 25px; border-radius: 28px; border: 4px solid #fff; font-size: 14px; width: 100%; transition: transform 0.3s; }
        .ad-box-clay:hover { transform: scale(1.02); }
        .ad-box-clay span { font-size: 10px; font-weight: 900; color: #cbd5e1; display: block; margin-bottom: 8px; letter-spacing: 0.1em; }
        .ad-box-clay p { color: #94a3b8; font-weight: 600; }
        .request-link-clay { background: none; border: none; font-size: 12px; font-weight: 900; color: var(--primary); cursor: pointer; opacity: 0.7; transition: opacity 0.2s; }
        .request-link-clay:hover { opacity: 1; }

        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }
        .policy-links { margin-top: 20px; display: flex; gap: 20px; justify-content: center; }
        .policy-links a { font-size: 11px; color: var(--text-muted); text-decoration: none; opacity: 0.6; font-weight: 700; transition: opacity 0.2s; }
        .policy-links a:hover { opacity: 1; }

        .about-section { margin-top: 40px; padding: 24px; max-width: 440px; margin-left: auto; margin-right: auto; }
        .mt-10 { margin-top: 40px; }
        .p-6 { padding: 24px; }
        .mx-auto { margin-left: auto; margin-right: auto; }
        .max-w-md { max-width: 448px; }

        .empty-state { padding: 60px 20px; text-align: center; opacity: 0.6; }
        .empty-icon { font-size: 60px; margin-bottom: 20px; }

        .settings-btn-clay { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 12px; border: 3px solid #fff; cursor: pointer; color: var(--text-muted); box-shadow: var(--clay-shadow-outer); }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .gap-3 { gap: 12px; }

        .onboarding-card-clay { max-width: 400px; width: 90%; padding: 50px 30px; text-align: center; }
        .onboarding-emoji { font-size: 80px; margin-bottom: 20px; }

        /* Mobile specific adjustments */
        @media (max-width: 480px) {
          .header { padding-top: 40px; }
          .cat-avatar { width: 44px; height: 44px; font-size: 24px; }
          .title-row h2 { font-size: 18px; }
          .tab-nav button span { display: none; }
          .tab-nav button { padding: 8px; font-size: 14px; }
          .pet-btn { width: 56px; height: 56px; min-width: 56px; font-size: 28px; }
          .card-media { height: 200px; }
          .diary-text { font-size: 16px; }
          .modal-content-clay { padding: 30px 20px; }
        }
      `}</style>
    </div>
  );
}
