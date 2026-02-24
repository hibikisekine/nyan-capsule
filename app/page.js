'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { GoogleGenerativeAI } from "@google/generative-ai";

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
    thinking: "考え中...",
    replyFrom: "のきもち",
    aiSettings: "Gemini AI 設定",
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
    featureRequest: "✨ 犬対応などの新機能リクエストはこちら",
    bestShot: "👑 BEST SHOT",
    videoDigest: "▶ 動画ダイジェスト",
    bestVideo: "✨ ベスト版作成",
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
    thinking: "Thinking...",
    replyFrom: "'s feelings",
    aiSettings: "Gemini AI Settings",
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
    featureRequest: "✨ Request new features here",
    bestShot: "👑 BEST SHOT",
    videoDigest: "▶ Video Digest",
    bestVideo: "✨ Best Version",
  },
  ZH: {
    welcome: "将回忆装入胶囊。",
    welcomeSub: "在AI的帮助下记录与宠物的珍贵时光。",
    start: "开始 🐾",
    timeline: "时间轴",
    list: "列表",
    calendar: "日历",
    settings: "设置",
    edit: "编辑",
    save: "保存",
    delete: "删除",
    createCapsule: "记录回忆",
    thinking: "思考中...",
    replyFrom: "的心情",
    aiSettings: "Gemini AI 设置",
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
    featureRequest: "✨ 在此申请新功能",
    bestShot: "👑 最佳瞬间",
    videoDigest: "▶ 视频摘要",
    bestVideo: "✨ 制作精华版",
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

  const [isCreating, setIsCreating] = useState(false);
  const [newText, setNewText] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🐱');
  const [mediaType, setMediaType] = useState('video');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const activeCat = cats.find(c => c.id === activeCatId) || cats[0];

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
    const toSave = entries.map(({ mediaUrl, ...rest }) => rest);
    localStorage.setItem('nyan_entries', JSON.stringify(toSave));
    localStorage.setItem('nyan_cats', JSON.stringify(cats));
    localStorage.setItem('nyan_active_id', activeCatId.toString());
    localStorage.setItem('nyan_user_name', userName);
    localStorage.setItem('nyan_api_key', apiKey);
  }, [lang, entries, cats, activeCatId, userName, apiKey, isMounted]);

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
        Task: Reply to the diary entry in ${currentLang}. Be warm, unique, and empathetic. 1-2 sentences. 
        If it's special, set isSpecial to true.
        Return ONLY valid JSON: { "reaction": "your reply", "isSpecial": true/false }
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
      {notification && <div className="notification-toast glass animate-slide-up">{notification.message}</div>}

      <header className="header glass">
        <div className="header-content">
          <div className="avatar-group" onClick={() => setIsEditingProfile(true)}>
            <div className="cat-avatar nyan-gradient">{activeCat.emoji}</div>
            <div className="edit-dot" />
          </div>
          <div className="header-main">
            <div className="title-row">
              <h2>{activeCat.name}</h2>
              <span className="badge">{activeCat.type === 'cat' ? t.cat : t.dog}</span>
            </div>
            <div className="tab-nav">
              <button className={view === 'timeline' ? 'active' : ''} onClick={() => setView('timeline')}>{t.timeline}</button>
              <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>{t.list}</button>
              <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>{t.calendar}</button>
            </div>
          </div>
          <div className="lang-switcher">
            <select value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="JA">JP</option>
              <option value="EN">EN</option>
              <option value="ZH">CN</option>
            </select>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="pet-bar">
          {cats.map(c => (
            <button key={c.id} className={`pet-btn ${activeCatId === c.id ? 'active' : ''}`} onClick={() => setActiveCatId(c.id)}>
              {c.emoji}
            </button>
          ))}
          <button className="pet-btn add" onClick={() => {
            const id = Date.now();
            setCats([...cats, { id, name: 'New Pet', sex: '?', age: '0', personality: 'sweet', emoji: '🐾', type: 'cat' }]);
            setActiveCatId(id);
            setIsEditingProfile(true);
          }}>+</button>
        </div>

        {view === 'timeline' && (
          <div className="timeline">
            {entries.filter(e => e.catId === activeCatId).map(entry => (
              <div key={entry.id} className={`card glass ${entry.isSpecial ? 'special' : ''}`}>
                <div className="card-media" style={{ background: entry.mediaColor }}>
                  {entry.isSpecial && <div className="special-label">{t.bestShot}</div>}
                  {entry.mediaUrl ? (
                    entry.mediaType === 'video' ? <video src={entry.mediaUrl} controls playsInline /> : <img src={entry.mediaUrl} alt="Mem" />
                  ) : <span className="media-emoji">{entry.mediaEmoji}</span>}
                  <div className="media-actions">
                    {entry.mediaType === 'video' && <Link href="/video" className="badge-btn">▶ {t.videoDigest}</Link>}
                    {entry.isSpecial && <Link href="/video?mode=best" className="badge-btn glow">✨ {t.bestVideo}</Link>}
                  </div>
                </div>
                <div className="card-body">
                  <div className="card-meta">
                    <span className="date">{entry.displayDate}</span>
                    <button className="del-btn" title={t.delete} onClick={() => {
                      setEntries(prev => prev.filter(e => e.id !== entry.id));
                    }}>×</button>
                  </div>
                  <p className="diary-text">{entry.text}</p>
                  <div className="reply-box">
                    <div className="reply-avatar">{activeCat.emoji}</div>
                    <div className="reply-content">
                      <span className="reply-label">{activeCat.name} {t.replyFrom}</span>
                      {entry.catReaction ? <p>{entry.catReaction}</p> : <div className="thinking">{t.thinking}</div>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {isEditingProfile && (
        <div className="modal-overlay">
          <div className="modal-content glass animate-pop-in">
            <div className="modal-header">
              <h3>{t.settings}</h3>
              <button className="close" onClick={() => setIsEditingProfile(false)}>×</button>
            </div>
            <div className="tabs">
              <div className="setting-section">
                <label>{t.aiSettings}</label>
                <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API Key" />
                <button className="test-btn" onClick={testAiConnection}>Test</button>
              </div>
              <div className="setting-section">
                <label>{t.petSettings}</label>
                <input type="text" value={activeCat.name} onChange={(e) => updateActiveCat({ name: e.target.value })} placeholder={t.name} />
                <select value={activeCat.type} onChange={(e) => updateActiveCat({ type: e.target.value })}>
                  <option value="cat">{t.cat}</option>
                  <option value="dog">{t.dog}</option>
                  <option value="other">{t.other}</option>
                </select>
                <div className="emoji-row">
                  {['🐱', '🐶', '🐰', '🐹', '🦁'].map(e => <button key={e} className={activeCat.emoji === e ? 'active' : ''} onClick={() => updateActiveCat({ emoji: e })}>{e}</button>)}
                </div>
              </div>
            </div>
            <button className="action-btn nyan-gradient" onClick={() => setIsEditingProfile(false)}>{t.save}</button>
          </div>
        </div>
      )}

      {isCreating && (
        <div className="modal-overlay">
          <div className="modal-content glass animate-pop-in">
            <div className="modal-header">
              <h3>{t.createCapsule}</h3>
              <button className="close" onClick={() => setIsCreating(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="upload-zone">
                <input
                  type="file"
                  id="file"
                  accept="image/*,video/*"
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
                <label htmlFor="file" className="upload-btn">
                  {previewUrl ? (
                    mediaType === 'video' ? (
                      <video src={previewUrl} className="preview" muted playsInline />
                    ) : (
                      <img src={previewUrl} className="preview" />
                    )
                  ) : "📷 +"}
                </label>
              </div>
              <textarea placeholder="..." value={newText} onChange={(e) => setNewText(e.target.value)} autoFocus />
              <button type="submit" className="action-btn nyan-gradient" disabled={!newText.trim() || isSaving}>
                {isSaving ? "Creating..." : t.save}
              </button>
            </form>
          </div>
        </div>
      )}

      {!isCreating && !isEditingProfile && (
        <button className="fab nyan-gradient btn-hover" onClick={() => setIsCreating(true)}>+</button>
      )}

      {showOnboarding && (
        <div className="modal-overlay onboarding">
          <div className="onboarding-card glass animate-pop-in">
            <div className="icon">✨</div>
            <h2>{t.welcome}</h2>
            <p>{t.welcomeSub}</p>
            <button className="action-btn nyan-gradient" onClick={() => {
              localStorage.setItem('nyan_onboarded', 'true');
              setShowOnboarding(false);
            }}>{t.start}</button>
          </div>
        </div>
      )}

      <footer className="footer shadow-premium">
        <div className="ad-box">
          <span>SPONSORED</span>
          <p>Ad Placement</p>
        </div>
        <button onClick={() => window.open('https://forms.gle/dummy')} className="request-link">{t.featureRequest}</button>
      </footer>

      <style jsx>{`
        .app-container { min-height: 100vh; display: flex; flex-direction: column; background: #fffcf9; }
        .header { padding: 40px 20px 20px; border-radius: 0 0 40px 40px; }
        .header-content { display: flex; align-items: center; gap: 15px; max-width: 600px; margin: 0 auto; width: 100%; }
        .avatar-group { position: relative; cursor: pointer; }
        .cat-avatar { width: 50px; height: 50px; border-radius: 18px; display: flex; items-center; justify-content: center; font-size: 28px; box-shadow: 0 8px 20px rgba(255,118,117,0.3); }
        .edit-dot { position: absolute; bottom: -2px; right: -2px; width: 12px; height: 12px; background: #2ecc71; border: 2px solid white; border-radius: 50%; }
        .header-main { flex: 1; }
        .title-row { display: flex; align-items: center; gap: 10px; }
        .title-row h2 { font-size: 20px; font-weight: 900; }
        .badge { font-size: 10px; background: rgba(0,0,0,0.05); padding: 2px 8px; border-radius: 10px; font-weight: 800; color: #666; }
        .tab-nav { display: flex; gap: 15px; margin-top: 5px; }
        .tab-nav button { background: none; border: none; font-size: 12px; font-weight: 700; color: #999; cursor: pointer; padding: 5px 0; }
        .tab-nav button.active { color: var(--primary); border-bottom: 2px solid var(--primary); }
        .lang-switcher select { background: none; border: 1px solid #ddd; border-radius: 5px; font-size: 10px; padding: 2px; }

        .main-content { flex: 1; padding: 20px; max-width: 600px; margin: 0 auto; width: 100%; }
        .pet-bar { display: flex; gap: 10px; margin-bottom: 25px; overflow-x: auto; padding: 5px; }
        .pet-btn { width: 45px; height: 45px; border-radius: 14px; border: 2px solid transparent; background: white; font-size: 20px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.05); transition: all 0.2s; }
        .pet-btn.active { border-color: var(--primary); transform: scale(1.1); }
        .pet-btn.add { border: 2px dashed #ddd; color: #999; }

        .timeline { display: flex; flex-direction: column; gap: 30px; }
        .card { border-radius: 32px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.3s; }
        .card:hover { transform: translateY(-5px); }
        .card.special { border: 2px solid #f1c40f; box-shadow: 0 20px 40px rgba(241,196,15,0.1); }
        .card-media { height: 220px; position: relative; display: flex; align-items: center; justify-content: center; }
        .card-media img, .card-media video { width: 100%; height: 100%; object-fit: cover; }
        .media-emoji { font-size: 80px; }
        .special-label { position: absolute; top: 15px; left: 15px; background: #f1c40f; color: white; padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: 900; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .media-actions { 
          position: absolute; 
          top: 15px; 
          right: 15px; 
          display: flex; 
          flex-direction: column;
          gap: 8px; 
          z-index: 20;
        }
        .badge-btn { 
          background: rgba(255, 255, 255, 0.95); 
          backdrop-filter: blur(10px);
          color: #2d3436 !important; 
          padding: 10px 18px; 
          border-radius: 30px; 
          font-size: 12px; 
          font-weight: 900; 
          text-decoration: none !important; 
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
          border: 1px solid rgba(255,255,255,0.3);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .badge-btn:hover {
          transform: translateY(-2px) scale(1.02);
          background: #fff;
          box-shadow: 0 12px 25px rgba(0,0,0,0.2);
        }
        .badge-btn.glow { 
          background: linear-gradient(135deg, #f1c40f, #f39c12); 
          color: white !important;
          box-shadow: 0 8px 20px rgba(241,196,15,0.4); 
          border: none;
        }
        .badge-btn.glow:hover {
          box-shadow: 0 12px 30px rgba(241,196,15,0.6);
        }

        .card-body { padding: 25px; }
        .card-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .date { font-size: 14px; font-weight: 800; color: var(--primary); }
        .del-btn { background: none; border: none; font-size: 24px; color: #ccc; cursor: pointer; }
        .diary-text { font-size: 16px; line-height: 1.6; color: #444; margin-bottom: 20px; font-weight: 600; }
        .reply-box { background: rgba(255,118,117,0.06); padding: 20px; border-radius: 24px; display: flex; gap: 15px; border: 1px dashed rgba(255,118,117,0.2); }
        .reply-avatar { font-size: 24px; }
        .reply-label { display: block; font-size: 10px; font-weight: 900; color: #999; margin-bottom: 4px; text-transform: uppercase; }
        .reply-content p { font-size: 14px; font-style: italic; color: #333; line-height: 1.5; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.1); backdrop-filter: blur(15px); z-index: 1000; display: flex; align-items: flex-end; justify-content: center; }
        .modal-content { width: 100%; max-width: 500px; background: white; padding: 30px; border-radius: 40px 40px 0 0; max-height: 90vh; overflow-y: auto; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .close { font-size: 28px; background: none; border: none; color: #ccc; cursor: pointer; }
        .setting-section { margin-bottom: 25px; }
        .setting-section label { display: block; font-size: 12px; font-weight: 900; color: #999; margin-bottom: 10px; }
        .setting-section input, .setting-section select { width: 100%; padding: 15px; border-radius: 15px; border: 1px solid #f0f0f0; background: #f9f9f9; font-size: 14px; font-weight: 600; margin-bottom: 10px; outline: none; }
        .test-btn { width: 100%; background: #2ecc71; color: white; border: none; padding: 10px; border-radius: 10px; font-weight: 800; cursor: pointer; }
        .emoji-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .emoji-row button { font-size: 24px; padding: 10px; border-radius: 12px; border: 1px solid #f0f0f0; background: white; cursor: pointer; }
        .emoji-row button.active { background: var(--primary); border: none; }

        .upload-zone { margin-bottom: 20px; }
        #file { display: none; }
        .upload-btn { height: 180px; border: 2px dashed #ddd; border-radius: 24px; display: flex; align-items: center; justify-content: center; font-size: 30px; color: #999; cursor: pointer; overflow: hidden; background: #f9f9f9; }
        .preview { width: 100%; height: 100%; object-fit: cover; }
        textarea { width: 100%; height: 120px; background: #f9f9f9; border: 1px solid #f0f0f0; border-radius: 20px; padding: 20px; font-size: 16px; margin-bottom: 20px; outline: none; resize: none; font-family: inherit; }

        .action-btn { width: 100%; padding: 18px; border-radius: 20px; border: none; color: white; font-weight: 900; font-size: 16px; cursor: pointer; box-shadow: 0 10px 25px rgba(255,118,117,0.3); }

        .fab { position: fixed; bottom: 30px; right: 30px; width: 65px; height: 65px; border-radius: 22px; font-size: 30px; z-index: 50; border: none; }
        
        .onboarding-overlay { background: rgba(255,255,255,0.98); align-items: center; }
        .onboarding-card { width: 100%; max-width: 350px; text-align: center; padding: 50px 30px; border-radius: 50px; }
        .icon { font-size: 60px; margin-bottom: 20px; }
        .onboarding-card h2 { font-size: 24px; font-weight: 900; margin-bottom: 15px; }
        .onboarding-card p { font-size: 15px; color: #666; margin-bottom: 30px; line-height: 1.6; }

        .footer { padding: 40px 20px; text-align: center; background: #fbfbfd; border-top: 1px solid #eee; margin-top: 50px; }
        .ad-box { background: white; border: 1px solid #eee; padding: 20px; border-radius: 24px; display: inline-block; width: 100%; max-width: 300px; margin-bottom: 20px; }
        .ad-box span { font-size: 10px; font-weight: 800; color: #ccc; display: block; margin-bottom: 5px; }
        .ad-box p { font-size: 12px; color: #999; }
        .request-link { background: none; border: none; font-size: 12px; font-weight: 800; color: var(--primary); cursor: pointer; }

        .notification-toast { position: fixed; top: 100px; left: 50%; transform: translateX(-50%); background: white; padding: 12px 30px; border-radius: 50px; border: 1px solid var(--primary); color: var(--primary); font-weight: 900; font-size: 14px; z-index: 2000; }
        @keyframes slideUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        .animate-slide-up { animation: slideUp 0.4s ease-out; }
        .thinking { font-size: 14px; color: #999; font-style: italic; }
      `}</style>
    </div>
  );
}
