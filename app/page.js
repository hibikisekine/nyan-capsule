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
    contact: "お問い合わせ",
    backupTitle: "データのバックアップ",
    exportData: "現在のデータを書き出す (JSON)",
    importData: "データを読み込む",
    backupSuccess: "バックアップを保存しました！",
    restoreSuccess: "データを復元しました。ページをリロードします。",
    restoreError: "データの読み込みに失敗しました。",
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
    contact: "Contact Us",
    backupTitle: "Data Backup",
    exportData: "Export Current Data (JSON)",
    importData: "Import Data",
    backupSuccess: "Backup saved!",
    restoreSuccess: "Data restored! Reloading...",
    restoreError: "Failed to load data.",
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
    contact: "联系我们",
    backupTitle: "数据备份",
    exportData: "导出当前数据 (JSON)",
    importData: "导入数据",
    backupSuccess: "备份已保存！",
    restoreSuccess: "数据已恢复！正在重新加载...",
    restoreError: "数据加载失败。",
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
  const handleExport = async () => {
    try {
      const db = await getDB();
      const tx = db.transaction('media', 'readonly');
      const store = tx.objectStore('media');
      const allMediaKeys = await new Promise(resolve => {
        const req = store.getAllKeys();
        req.onsuccess = () => resolve(req.result);
      });

      const mediaData = {};
      for (const key of allMediaKeys) {
        const blob = await new Promise(resolve => {
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result);
        });
        if (blob instanceof Blob) {
          const reader = new FileReader();
          mediaData[key] = await new Promise(resolve => {
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        }
      }

      const backup = {
        version: 1,
        localStorage: {
          nyan_entries: localStorage.getItem('nyan_entries'),
          nyan_cats: localStorage.getItem('nyan_cats'),
          nyan_active_id: localStorage.getItem('nyan_active_id'),
          nyan_lang: localStorage.getItem('nyan_lang'),
          nyan_user_name: localStorage.getItem('nyan_user_name'),
          nyan_api_key: localStorage.getItem('nyan_api_key'),
          nyan_stable_model: localStorage.getItem('nyan_stable_model'),
        },
        media: mediaData
      };

      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nyan-capsule-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      setNotification({ message: t.backupSuccess });
      setTimeout(() => setNotification(null), 3000);
    } catch (e) {
      console.error(e);
      alert(t.restoreError);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (backup.localStorage) {
        Object.entries(backup.localStorage).forEach(([k, v]) => {
          if (v !== null) localStorage.setItem(k, v);
        });
      }

      if (backup.media) {
        const db = await getDB();
        const tx = db.transaction('media', 'readwrite');
        const store = tx.objectStore('media');
        for (const [key, dataUrl] of Object.entries(backup.media)) {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          store.put(blob, key);
        }
      }

      setNotification({ message: t.restoreSuccess });
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      console.error(err);
      alert(t.restoreError);
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
              className="settings-btn-clay clay-card shrink-0"
              onClick={() => setIsEditingProfile(true)}
              title={t.settings}
            >
              <Settings size={18} />
            </motion.button>

            <div className="lang-selector-clay shrink-0">
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
              <div className="inline-create-clay clay-card">
                <form onSubmit={handleCreate}>
                  <textarea
                    placeholder={`${activeCat.name} との思い出を記録する...`}
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    className="inline-textarea"
                  />
                  <div className="inline-actions">
                    <div className="inline-media">
                      <input
                        type="file"
                        id="file"
                        accept="image/*,video/*"
                        className="hidden"
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
                      <label htmlFor="file" className="inline-upload-btn transition-colors">
                        <Camera size={18} className="mr-1 text-orange-400" />
                        <span className="text-xs font-bold text-orange-400 tracking-wider">MEDIA</span>
                      </label>
                      {previewUrl && (
                        <div className="relative ml-3">
                          {mediaType === 'video' ? (
                            <div className="relative flex items-center">
                              <video src={previewUrl} muted playsInline className="h-10 w-10 object-cover rounded-xl shadow-sm" />
                            </div>
                          ) : (
                            <img src={previewUrl} className="h-10 w-10 object-cover rounded-xl shadow-sm border-2 border-white" alt="Preview" />
                          )}
                          <button type="button" className="absolute -top-2 -right-2 bg-red-400 text-white rounded-full p-0.5 shadow-md hover:bg-red-500" onClick={() => { setPreviewUrl(null); setSelectedFile(null); }}>
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      className="clay-button-sm font-heading"
                      disabled={!newText.trim() || isSaving}
                    >
                      {isSaving ? "記録中..." : t.createCapsule}
                    </motion.button>
                  </div>
                </form>
              </div>

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
                {(() => {
                  const now = new Date();
                  const year = now.getFullYear();
                  const month = now.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();

                  const days = [];
                  // Padding for first day
                  for (let i = 0; i < firstDay; i++) {
                    days.push(<div key={`empty-${i}`} className="cal-day-clay opacity-0" />);
                  }

                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${year}/${month + 1}/${d}`;
                    const hasEntry = entries.some(e =>
                      e.catId === activeCatId &&
                      (e.displayDate === dateStr || e.displayDate.endsWith(`/${d}`))
                    );
                    days.push(
                      <motion.div
                        key={d}
                        whileHover={hasEntry ? { scale: 1.1 } : {}}
                        className={`cal-day-clay ${hasEntry ? 'has-data' : ''}`}
                      >
                        <span className="day-num">{d}</span>
                        {hasEntry && <div className="dot-clay nyan-gradient" />}
                      </motion.div>
                    );
                  }
                  return days;
                })()}
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

                <div className="setting-section">
                  <label className="font-heading"><Clock size={14} className="inline mr-1" /> {t.backupTitle}</label>
                  <p className="sub-label mb-2">ブラウザを初期化しても、このファイルがあれば復元できます。</p>
                  <div className="flex flex-col gap-2">
                    <button className="clay-button w-full text-sm py-3" onClick={handleExport}>
                      📥 {t.exportData}
                    </button>
                    <label className="clay-card p-3 text-center text-xs font-bold cursor-pointer hover:bg-orange-50 transition-colors">
                      📤 {t.importData}
                      <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                    </label>
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

        {/* Create Form has been moved inline to timeline top */}
      </AnimatePresence>

      {/* Removed FAB button here to avoid overlapping with footer and forcing deep scroll */}

      <footer className="footer-clay border-t border-orange-100">
        <div className="footer-content">
          <div className="ad-box-clay clay-card">
            <span className="font-heading">NYANCAPSULE SUPPORT</span>
            <p className="text-sm">私たちのサービスを応援してください 🐾</p>
          </div>

          <div className="policy-links">
            <Link href="/privacy">{t.privacy}</Link>
            <Link href="/terms">{t.terms}</Link>
            <button onClick={() => window.open('https://forms.gle/S2Y2r7Y9YEqXQYvP9')} className="contact-btn-footer">
              {t.contact}
            </button>
          </div>

          <div className="about-section opacity-70 text-xs leading-relaxed max-w-sm">
            <p className="mb-2 font-bold">NyanCapsuleについて</p>
            <p>NyanCapsuleは、愛するペットとの日常生活をAIの力で特別な思い出として保存するためのデジタルカプセルです。あなたのペットが何を考えているのか、AIがその気持ちを代弁し、一生の宝物になる動画ダイジェストを作成します。</p>
          </div>

          <div className="mt-8 text-[10px] opacity-40 font-bold tracking-widest uppercase">
            &copy; {new Date().getFullYear()} NyanCapsule Team. All Rights Reserved.
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
        
        .header { padding: 40px 20px 20px; border-radius: 0 0 24px 24px; position: sticky; top: -20px; z-index: 100; border-bottom: 1px solid #E5E7EB; background: rgba(255,255,255,0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
        .header-content { display: flex; align-items: center; gap: 16px; max-width: 600px; margin: 0 auto; width: 100%; }
        
        .avatar-group { position: relative; cursor: pointer; }
        .cat-avatar { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; font-size: 24px; border: 1px solid #E5E7EB; border-radius: 12px; background: white; }
        .edit-dot { position: absolute; bottom: -2px; right: -2px; width: 12px; height: 12px; background: #10B981; border: 2px solid white; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        
        .header-main { flex: 1; }
        .title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
        .title-row h2 { font-size: 20px; margin: 0; color: var(--text-main); font-weight: 600; }
        .badge { font-size: 10px; background: #F3F4F6; padding: 2px 8px; border-radius: 6px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; border: 1px solid #E5E7EB; }
        
        .tab-nav { display: flex; gap: 16px; }
        .tab-nav button { background: none; border: none; font-size: 12px; font-weight: 600; color: var(--text-muted); cursor: pointer; padding: 6px 0; display: flex; align-items: center; gap: 6px; transition: color 0.2s; }
        .tab-nav button span { display: inline; }
        .tab-nav button.active { color: var(--primary); border-bottom: 2px solid var(--primary); }
        
        .lang-selector-clay { background: white; border-radius: 8px; padding: 6px 10px; display: flex; align-items: center; gap: 6px; border: 1px solid #E5E7EB; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .lang-selector-clay select { background: none; border: none; font-size: 12px; font-weight: 600; color: var(--text-main); outline: none; cursor: pointer; }
        .globe-icon { color: var(--text-muted); }

        .main-content { flex: 1; padding: 20px 20px 80px; max-width: 600px; margin: 0 auto; width: 100%; }
        
        .pet-bar-container { margin: 10px 0 24px; overflow-x: auto; padding-bottom: 10px; -webkit-overflow-scrolling: touch; }
        .pet-bar { display: flex; gap: 12px; }
        .pet-btn { width: 56px; height: 56px; min-width: 56px; border-radius: 12px; border: 1px solid #E5E7EB; display: flex; align-items: center; justify-content: center; font-size: 28px; cursor: pointer; background: white; transition: all 0.2s; }
        .pet-btn.active { border-color: var(--primary); background: #F9FAFB; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .pet-btn.add { color: #9CA3AF; border-style: dashed; font-size: 24px; background: transparent; }

        .timeline { display: flex; flex-direction: column; gap: 24px; }
        .card { border-radius: 16px; border: 1px solid #E5E7EB; overflow: hidden; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .card.special { border-color: #D1D5DB; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .card-media { height: 260px; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #F3F4F6; }
        .card-media img, .card-media video { width: 100%; height: 100%; object-fit: cover; }
        .media-emoji { font-size: 64px; }
        
        .special-label { position: absolute; top: 16px; left: 16px; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.9); backdrop-filter: blur(4px); box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 10; border: 1px solid #E5E7EB; color: #111827; }
        
        .media-actions { position: absolute; top: 16px; right: 16px; display: flex; flex-direction: column; gap: 8px; z-index: 10; }
        .badge-btn { padding: 8px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; text-decoration: none !important; display: flex; align-items: center; gap: 6px; border: 1px solid #E5E7EB; background: rgba(255,255,255,0.9); backdrop-filter: blur(4px); color: var(--text-main) !important; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .badge-btn.glow { background: var(--primary); color: white !important; border-color: var(--primary); }

        .card-body { padding: 24px; }
        .card-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .date-pill { color: var(--text-muted); font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
        .del-btn { background: none; border: none; color: #9CA3AF; cursor: pointer; padding: 4px; transition: color 0.2s; }
        .del-btn:hover { color: #EF4444; }
        
        .diary-text { font-size: 16px; line-height: 1.6; color: var(--text-main); margin-bottom: 24px; font-weight: 400; }
        
        .reply-box-clay { background: #F9FAFB; padding: 20px; border-radius: 12px; display: flex; gap: 16px; border: 1px solid #F3F4F6; }
        .reply-avatar { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 1px solid #E5E7EB; border-radius: 8px; background: white; }
        .reply-label { display: block; font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
        .reply-content p { font-size: 14px; color: var(--text-main); line-height: 1.5; font-style: normal; }

        .thinking-anim { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #9CA3AF; }
        .thinking-anim .dot { animation: blink 1.4s infinite; font-weight: bold; }
        .thinking-anim .dot:nth-child(2) { animation-delay: 0.2s; }
        .thinking-anim .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: flex-end; justify-content: center; padding-top: env(safe-area-inset-top); }
        .modal-content-clay { width: 100%; max-width: 500px; background: white; padding: 24px; border-radius: 24px 24px 0 0; border: 1px solid #E5E7EB; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 -10px 25px rgba(0,0,0,0.1); }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .close-btn { background: none; border: none; color: #9CA3AF; cursor: pointer; padding: 4px; }
        
        .modal-scroll-area { flex: 1; overflow-y: auto; padding-right: 4px; }
        .setting-section { margin-bottom: 32px; }
        .setting-section label { display: block; font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 12px; }
        .sub-label { font-size: 12px !important; margin-bottom: 8px !important; color: var(--text-muted) !important; font-weight: 400 !important; }
        
        .clay-input { width: 100%; padding: 12px 16px; border-radius: 8px; border: 1px solid #E5E7EB; background: #F9FAFB; font-size: 14px; outline: none; transition: all 0.2s; color: var(--text-main); }
        .clay-input:focus { border-color: var(--primary); background: white; }
        
        .input-group-clay { display: flex; gap: 8px; margin-top: 8px; }
        .test-btn-clay { padding: 0 16px; border-radius: 8px; border: 1px solid #E5E7EB; font-weight: 600; font-size: 13px; cursor: pointer; background: white; color: var(--text-main); transition: all 0.2s; }
        .test-btn-clay:hover { background: #F9FAFB; }
        .test-btn-clay.success { background: #10B981; color: white; border-color: #10B981; }
        .test-btn-clay.testing { opacity: 0.7; cursor: wait; }

        .api-help-card-clay { background: #F3F4F6; border: 1px solid #E5E7EB; padding: 16px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; color: var(--text-main); line-height: 1.5; }
        .error-text { color: #EF4444; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 4px; margin-top: 8px; }

        .select-row-clay { display: flex; gap: 8px; }
        .clay-select { padding: 12px 16px; border-radius: 8px; border: 1px solid #E5E7EB; background: #F9FAFB; font-size: 14px; color: var(--text-main); outline: none; appearance: none; cursor: pointer; transition: border-color 0.2s; }
        .clay-select:focus { border-color: var(--primary); background: white; }

        .emoji-btn { width: 44px; height: 44px; font-size: 24px; border: 1px solid #E5E7EB; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: white; }
        .emoji-btn.active { border-color: var(--primary); background: #F9FAFB; }

        .inline-create-clay { padding: 20px; border: 1px solid #E5E7EB; background: white; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
        .inline-textarea { width: 100%; min-height: 60px; border: none; outline: none; font-size: 15px; font-family: inherit; resize: none; color: var(--text-main); background: transparent; }
        .inline-textarea::placeholder { color: #9CA3AF; }
        .inline-actions { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #F3F4F6; }
        .inline-media { display: flex; align-items: center; }
        .inline-upload-btn { display: flex; align-items: center; cursor: pointer; padding: 6px 12px; border-radius: 8px; background: #F3F4F6; border: 1px solid transparent; transition: all 0.2s; }
        .inline-upload-btn:hover { background: #E5E7EB; }
        .inline-upload-btn .text-xs { color: var(--text-muted); }
        .clay-button-sm { background: var(--primary); color: white; padding: 8px 16px; border-radius: 8px; border: none; font-weight: 600; font-size: 13px; cursor: pointer; transition: background 0.2s; }
        .clay-button-sm:hover { background: #374151; }
        .clay-button-sm:disabled { opacity: 0.5; cursor: not-allowed; }

        .list-view-clay { padding: 12px; border-radius: 16px; background: white; border: 1px solid #E5E7EB; }
        .list-item-clay { display: flex; align-items: center; gap: 16px; padding: 16px; border-bottom: 1px solid #F3F4F6; transition: background 0.2s; border-radius: 12px; cursor: pointer; }
        .list-item-clay:last-child { border: none; }
        .list-item-clay:hover { background: #F9FAFB; }
        .item-left { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 50px; }
        .item-date-pill { font-size: 11px; font-weight: 600; color: var(--text-muted); }
        .item-media-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; background: #F3F4F6; color: var(--text-muted); }
        .item-center { flex: 1; }
        .item-text { font-size: 14px; color: var(--text-main); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .item-special { font-size: 16px; color: #111827; }

        .calendar-view-clay { padding: 24px; border-radius: 16px; border: 1px solid #E5E7EB; background: white; }
        .cal-header-clay { font-size: 20px; font-weight: 600; text-align: center; margin-bottom: 24px; color: var(--text-main); }
        .cal-grid-clay { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
        .cal-weekday { text-align: center; font-size: 11px; font-weight: 600; color: var(--text-muted); padding-bottom: 12px; }
        .cal-day-clay { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 8px; background: #F9FAFB; position: relative; cursor: pointer; transition: all 0.2s; }
        .cal-day-clay.has-data { background: white; border: 1px solid #E5E7EB; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
        .day-num { font-size: 13px; font-weight: 500; color: #9CA3AF; }
        .cal-day-clay.has-data .day-num { color: var(--text-main); font-weight: 600; }
        .dot-clay { position: absolute; bottom: 6px; width: 4px; height: 4px; border-radius: 50%; background: var(--primary); }

        .notification-toast { position: fixed; bottom: 40px; left: 50%; background: #111827; padding: 12px 24px; border-radius: 8px; color: white; font-weight: 500; font-size: 14px; z-index: 2000; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #374151; }
        
        .footer-clay { padding: 40px 20px; text-align: center; border-top: 1px solid #E5E7EB; background: white; }
        .footer-content { max-width: 400px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .ad-box-clay { padding: 20px; border-radius: 12px; border: 1px solid #E5E7EB; font-size: 13px; width: 100%; transition: border-color 0.2s; background: #F9FAFB; }
        .ad-box-clay:hover { border-color: #D1D5DB; }
        .ad-box-clay span { font-size: 10px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px; letter-spacing: 0.05em; }
        .ad-box-clay p { color: var(--text-main); font-weight: 500; }
        
        .policy-links { margin-top: 16px; display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
        .policy-links a, .policy-links button { font-size: 12px; color: var(--text-muted); text-decoration: none; font-weight: 500; transition: color 0.2s; background: none; border: none; cursor: pointer; padding: 0; }
        .policy-links a:hover, .policy-links button:hover { color: var(--text-main); }
        
        .w-full { width: 100%; }
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .items-center { align-items: center; }
        .gap-2 { gap: 8px; }
        .gap-3 { gap: 12px; }
        .shrink-0 { flex-shrink: 0; }
        .hidden { display: none; }

        .contact-btn-footer { background: none; border: none; font-size: 12px; color: var(--text-muted); cursor: pointer; font-weight: 500; padding: 0; transition: color 0.2s; }
        .contact-btn-footer:hover { color: var(--text-main); }
        
        .mt-8 { margin-top: 32px; }
        .text-sm { font-size: 14px; }
        .max-w-sm { max-width: 384px; }
        
        .about-section { margin-top: 24px; text-align: center; color: var(--text-muted); }
        .about-section p { margin-bottom: 8px; font-size: 12px; }

        .empty-state { padding: 60px 20px; text-align: center; color: var(--text-muted); }
        .empty-icon { font-size: 40px; margin-bottom: 16px; }

        .settings-btn-clay { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 8px; border: 1px solid #E5E7EB; cursor: pointer; color: var(--text-main); transition: background 0.2s; }
        .settings-btn-clay:hover { background: #F9FAFB; }
        
        .onboarding-card-clay { max-width: 400px; width: 90%; padding: 40px 32px; text-align: center; border-radius: 16px; border: 1px solid #E5E7EB; }
        .onboarding-emoji { font-size: 64px; margin-bottom: 16px; }

        /* Mobile specific adjustments */
        @media (max-width: 480px) {
          .header { padding-top: 24px; }
          .cat-avatar { width: 40px; height: 40px; font-size: 20px; flex-shrink: 0; }
          .title-row h2 { font-size: 18px; }
          .tab-nav button span { display: none; }
          .tab-nav button { padding: 8px; font-size: 14px; }
          .pet-btn { width: 48px; height: 48px; min-width: 48px; font-size: 24px; }
          .card-media { height: 200px; }
          .diary-text { font-size: 15px; }
          .modal-content-clay { padding: 24px 20px; border-radius: 20px 20px 0 0; }
        }
      `}</style>
    </div>
  );
}
