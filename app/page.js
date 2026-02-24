'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { GoogleGenerativeAI } from "@google/generative-ai";

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
  const [view, setView] = useState('timeline'); // timeline, list, calendar
  const [entries, setEntries] = useState([]);
  const [isMounted, setIsMounted] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // App Settings
  const [apiKey, setApiKey] = useState('');
  const [userName, setUserName] = useState('飼い主');
  const [aiStatus, setAiStatus] = useState('idle'); // idle, testing, success, error
  const [aiError, setAiError] = useState('');
  const [stableModel, setStableModel] = useState('gemini-1.5-flash');

  // Multi-Cat State
  const [cats, setCats] = useState([
    { id: 1, name: 'たま', sex: 'オス', age: '2', personality: 'sweet', emoji: '🐱', type: 'cat' }
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

  // --- IndexedDB Utils ---
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
      const savedEntries = localStorage.getItem('nyan_entries');
      const savedCats = localStorage.getItem('nyan_cats');
      const savedActiveId = localStorage.getItem('nyan_active_id');
      const savedUser = localStorage.getItem('nyan_user_name');
      const savedKey = localStorage.getItem('nyan_api_key');
      const onboarded = localStorage.getItem('nyan_onboarded');

      if (!onboarded) setShowOnboarding(true);
      if (savedUser) setUserName(savedUser);
      if (savedKey) setApiKey(savedKey);

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
    const toSave = entries.map(({ mediaUrl, ...rest }) => rest);
    localStorage.setItem('nyan_entries', JSON.stringify(toSave));
  }, [entries, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem('nyan_cats', JSON.stringify(cats));
    localStorage.setItem('nyan_active_id', activeCatId.toString());
    localStorage.setItem('nyan_user_name', userName);
    localStorage.setItem('nyan_api_key', apiKey);
  }, [cats, activeCatId, userName, apiKey, isMounted]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setSelectedFile(file);
      setMediaType(file.type.startsWith('image') ? 'photo' : 'video');
    }
  };

  const testAiConnection = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) return setAiError('キーを入力してください');
    setAiStatus('testing');
    setAiError('');

    try {
      let listData = { models: [] };
      try {
        const resV1 = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${trimmedKey}`);
        listData = await resV1.json();
        if (listData.error) throw new Error(listData.error.message);
      } catch (e) {
        const resBeta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${trimmedKey}`);
        listData = await resBeta.json();
      }

      if (listData.error) throw new Error(`APIエラー: ${listData.error.message}`);

      const availableModels = (listData.models || [])
        .filter(m => m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));

      const modelsToTry = [...new Set(["gemini-1.5-flash", "gemini-1.5-flash-latest", ...availableModels])];
      const genAI = new GoogleGenerativeAI(trimmedKey);
      let success = false;
      let lastMessage = "";

      for (const modelName of modelsToTry) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent("Test");
          if (result) {
            setStableModel(modelName);
            setAiStatus('success');
            setNotification({ message: `接続成功！ 使用モデル: ${modelName} 🐾` });
            setTimeout(() => setNotification(null), 3000);
            success = true;
            break;
          }
        } catch (e) { lastMessage = e.message; }
      }
      if (!success) {
        setAiStatus('error');
        setAiError(`モデルは見つかりませんでしたが、通信は確認されました。`);
      }
    } catch (e) {
      setAiStatus('error');
      setAiError(`接続エラー: ${e.message}`);
    }
  };

  const callGeminiAI = async (text, file, catProf) => {
    if (!apiKey || !apiKey.trim().startsWith('AIza')) return null;
    try {
      const genAI = new GoogleGenerativeAI(apiKey.trim());
      const model = genAI.getGenerativeModel({ model: stableModel });

      const persona = `
        あなたは${catProf.name}という${catProf.type === 'dog' ? '犬' : '猫'}です。
        性別:${catProf.sex}, 年齢:${catProf.age}, 性格:${catProf.personality}。
        飼い主:${userName}。
        
        【重要】
        - 必ず「やあ${userName}」のように呼びかけてください。
        - 日記と画像の内容に具体的に触れて1〜2文で返信してください。
        - ${catProf.type === 'dog' ? '「ワン！」「〜だワン」のような犬らしい語尾' : '「〜にゃ」「〜だにゃん」のような猫らしい語尾'}を混ぜて、愛らしく答えてください。
        
        また、この思い出が特別に素晴らしいものであればisSpecialをtrueにしてください。
        返信は以下のJSON形式で返してください。
        { "reaction": "返信内容", "isSpecial": true/false }
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
    } catch (e) { return null; }
  };

  const generateFallbackReaction = (text, prof) => {
    const p = prof.personality;
    const name = prof.name;
    const u = userName;
    const pools = {
      sweet: [`やあ${u}、${name}はね、きみの隣にいるだけで幸せなんだにゃ。`],
      cool: [`おい${u}。まあ、今日も頑張ったんじゃない？`],
      playful: [`ニャッハ、${u}！追いかけっこしような！🐾`]
    };
    const pool = pools[p] || pools.sweet;
    return { reaction: pool[0], isSpecial: false };
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newText.trim() || isSaving) return;
    setIsSaving(true);
    const entryId = Date.now();
    const targetCat = activeCat;
    try {
      if (selectedFile) await saveMediaToDB(entryId, selectedFile);
      const newEntry = {
        id: entryId, catId: targetCat.id, date: new Date().toISOString().split('T')[0],
        displayDate: `${new Date().getMonth() + 1}月${new Date().getDate()}日`,
        text: newText, catReaction: null, isSpecial: false, mediaType: mediaType,
        mediaEmoji: selectedEmoji, mediaUrl: previewUrl, hasStoredMedia: !!selectedFile,
        mediaColor: mediaType === 'video' ? 'linear-gradient(135deg, #6c5ce7, #a29bfe)' : 'linear-gradient(135deg, #a8e063, #56ab2f)'
      };
      setEntries(prev => [newEntry, ...prev]);
      setNewText(''); setPreviewUrl(null); setSelectedFile(null); setIsCreating(false);
      setTimeout(async () => {
        let res = await callGeminiAI(newEntry.text, selectedFile, targetCat);
        if (!res) res = generateFallbackReaction(newEntry.text, targetCat);
        setEntries(cur => cur.map(ent => ent.id === entryId ? { ...ent, catReaction: res.reaction, isSpecial: res.isSpecial } : ent));
        setNotification({ message: `${targetCat.name}からお返事があったよ！🐾` });
        setTimeout(() => setNotification(null), 4000);
      }, 5000);
    } catch (err) { } finally { setIsSaving(false); }
  };

  const addNewCat = () => {
    if (cats.length >= 5) return;
    const newId = Date.now();
    setCats([...cats, { id: newId, name: '新しい子', sex: 'ひみつ', age: '0', personality: 'playful', emoji: '😸', type: 'cat' }]);
    setActiveCatId(newId);
    setIsEditingProfile(true);
  };

  const updateActiveCat = (data) => {
    setCats(cats.map(c => c.id === activeCatId ? { ...c, ...data } : c));
  };

  const deleteEntry = (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    getDB().then(db => {
      const tx = db.transaction('media', 'readwrite');
      tx.objectStore('media').delete(id.toString());
    }).catch(() => { });
  };

  if (!isMounted) return null;

  return (
    <div className="app-container">
      {notification && <div className="notification-toast">{notification.message}</div>}

      <header className="header glass">
        <div className="header-content">
          <div className="cat-avatar-container" onClick={() => setIsEditingProfile(true)}>
            <div className="cat-avatar nyan-gradient">{activeCat.emoji}</div>
            <div className="avatar-badge">Edit</div>
          </div>
          <div className="header-info">
            <div className="profile-summary">
              <h1>{activeCat.name}</h1>
              <span className="profile-tags">{activeCat.age}歳・{activeCat.sex}</span>
            </div>
            <div className="view-switcher">
              <button className={`view-btn ${view === 'timeline' ? 'active' : ''}`} onClick={() => setView('timeline')}>タイムライン</button>
              <button className={`view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>リスト</button>
              <button className={`view-btn ${view === 'calendar' ? 'active' : ''}`} onClick={() => setView('calendar')}>カレンダー</button>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="cat-switcher">
          {cats.map(cat => (
            <div key={cat.id} className={`cat-switcher-item ${activeCatId === cat.id ? 'active' : ''}`} onClick={() => setActiveCatId(cat.id)}>
              {cat.emoji}
            </div>
          ))}
          {cats.length < 5 && <button className="cat-switcher-item add-cat-btn" onClick={addNewCat}>+</button>}
        </div>

        {view === 'timeline' && (
          <div className="timeline-area">
            {entries.filter(e => e.catId === activeCatId).map((entry) => (
              <div key={entry.id} className={`capsule-card glass ${entry.isSpecial ? 'special-memory' : ''}`}>
                <div className="capsule-media-preview" style={{ background: entry.mediaColor }}>
                  {entry.isSpecial && <div className="special-crown">👑 BEST SHOT</div>}
                  {entry.mediaUrl ? (
                    entry.mediaType === 'video' ? <video src={entry.mediaUrl} className="preview-media" controls playsInline /> : <img src={entry.mediaUrl} className="preview-media" alt="Memory" />
                  ) : <span className="emoji-large">{entry.mediaEmoji}</span>}
                  <div style={{ display: 'flex', gap: 8, position: 'absolute', bottom: 12, right: 12 }}>
                    {entry.mediaType === 'video' && <Link href="/video"><div className="play-badge">▶ 動画ダイジェスト</div></Link>}
                    {entry.isSpecial && <Link href="/video?mode=best"><div className="best-badge">✨ ベスト版作成</div></Link>}
                  </div>
                </div>
                <div className="capsule-content">
                  <div className="capsule-header">
                    <div className="capsule-date">{entry.displayDate}</div>
                    <button className="delete-btn" onClick={() => deleteEntry(entry.id)}>×</button>
                  </div>
                  <p className="user-diary-text">{entry.text}</p>
                  <div className="cat-reply-box">
                    <div className="cat-reply-icon">{activeCat.emoji}</div>
                    <div className="cat-reply-content">
                      <span className="cat-name">{activeCat.name}のきもち</span>
                      {entry.catReaction ? <p>{entry.catReaction}</p> : <div className="thinking-dots">考え中...</div>}
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
            <div className="modal-header"><h3>設定</h3><button className="close-x" onClick={() => setIsEditingProfile(false)}>×</button></div>
            <div className="profile-form">
              <div className="form-group" style={{ background: 'rgba(108,92,231,0.05)', padding: '16px', borderRadius: '16px' }}>
                <label>Gemini AI設定</label>
                <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="diary-input-field" placeholder="APIキーを入力" />
                <button type="button" onClick={testAiConnection} className="save-btn" style={{ background: 'white', color: 'black', border: '1px solid #ddd', marginTop: 10 }}>接続テスト</button>
              </div>
              <div className="form-group"><label>飼い主の名前</label><input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="diary-input-field" /></div>
              <div style={{ borderTop: '1px solid #efefef', paddingTop: 20 }}>
                <label>ペット設定</label>
                <div className="form-group"><label>お名前</label><input type="text" value={activeCat.name} onChange={(e) => updateActiveCat({ name: e.target.value })} className="diary-input-field" /></div>
                <div className="form-group">
                  <label>種類</label>
                  <select value={activeCat.type || 'cat'} onChange={(e) => updateActiveCat({ type: e.target.value })} className="diary-input-field">
                    <option value="cat">猫</option>
                    <option value="dog">犬</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                <div className="emoji-picker">{['🐱', '🐶', '🐰', '🐹', '🦁'].map(e => <button key={e} type="button" className={`emoji-btn ${activeCat.emoji === e ? 'active' : ''}`} onClick={() => updateActiveCat({ emoji: e })}>{e}</button>)}</div>
              </div>
              <button className="save-btn nyan-gradient" onClick={() => setIsEditingProfile(false)}>保存</button>
            </div>
          </div>
        </div>
      )}

      {isCreating && (
        <div className="modal-overlay">
          <div className="modal-content glass animate-pop-in">
            <div className="modal-header"><h3>思い出を記録</h3><button className="close-x" onClick={() => setIsCreating(false)}>×</button></div>
            <form onSubmit={handleCreate}>
              <input type="file" onChange={handleFileChange} />
              <textarea value={newText} onChange={(e) => setNewText(e.target.value)} className="diary-input-text" />
              <button type="submit" className="save-btn nyan-gradient">保存 ✨</button>
            </form>
          </div>
        </div>
      )}

      {!isCreating && !isEditingProfile && <button className="fab nyan-gradient" onClick={() => setIsCreating(true)}><span>🐾</span></button>}

      {showOnboarding && (
        <div className="onboarding-overlay">
          <div className="onboarding-card glass animate-pop-in">
            <div className="slide-icon">✨</div>
            <h2>思い出をカプセルに。</h2>
            <p>ペットとの大切な時間をAIと一緒に記録しましょう。</p>
            <button className="save-btn nyan-gradient" style={{ marginTop: 20 }} onClick={() => { localStorage.setItem('nyan_onboarded', 'true'); setShowOnboarding(false); }}>はじめる 🐾</button>
          </div>
        </div>
      )}

      <footer className="footer-ad-placeholder">
        <div className="ad-box">
          <span>Supported by Ads</span>
          <p>ここに将来的に広告を配置して、運営を支えることができます</p>
        </div>
        <div className="market-research-link">
          <button className="view-btn" onClick={() => window.open('https://forms.gle/dummy', '_blank')}>
            ✨ 犬対応などの新機能リクエストはこちら
          </button>
        </div>
      </footer>

      <style jsx>{`
        .app-container { min-height: 100vh; background: #fffcf9; color: #2d3436; font-family: 'Outfit', sans-serif; display: flex; flex-direction: column; }
        .header { padding: 40px 24px 20px; border-radius: 0 0 32px 32px; background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(0,0,0,0.05); }
        .header-content { display: flex; align-items: center; gap: 16px; }
        .cat-avatar { width: 48px; height: 48px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 26px; box-shadow: 0 8px 16px rgba(255,159,67,0.3); }
        .main-content { flex: 1; padding: 20px; }
        .cat-switcher { display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 5px; }
        .cat-switcher-item { width: 50px; height: 50px; background: white; border-radius: 15px; display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .cat-switcher-item.active { border: 2px solid #ff9f43; }
        .capsule-card { border-radius: 24px; overflow: hidden; margin-bottom: 24px; background: white; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        .capsule-media-preview { height: 200px; display: flex; align-items: center; justify-content: center; position: relative; }
        .preview-media { width: 100%; height: 100%; object-fit: cover; }
        .special-crown { position: absolute; top: 12px; left: 12px; background: #f1c40f; color: white; padding: 4px 10px; border-radius: 10px; font-size: 10px; font-weight: 900; }
        .capsule-content { padding: 20px; }
        .cat-reply-box { margin-top: 15px; background: #fff9f2; padding: 15px; border-radius: 18px; display: flex; gap: 12px; border: 1px dashed #ff9f43; }
        .onboarding-overlay { position: fixed; inset: 0; z-index: 10000; background: rgba(255,255,255,0.98); display: flex; align-items: center; justify-content: center; }
        .onboarding-card { width: 320px; text-align: center; padding: 40px; border-radius: 40px; }
        .footer-ad-placeholder { padding: 40px; background: #fbfbfd; border-top: 1px solid #efefef; text-align: center; }
        .ad-box { background: #eee; padding: 15px; border-radius: 20px; }
        .nyan-gradient { background: linear-gradient(135deg, #ff9f67, #ff6b6b); color: white; border: none; }
        .fab { position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; border-radius: 20px; font-size: 30px; cursor: pointer; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.1); backdrop-filter: blur(10px); display: flex; align-items: flex-end; justify-content: center; }
        .modal-content { background: white; width: 100%; max-width: 500px; padding: 30px; border-radius: 30px 30px 0 0; }
        .diary-input-field { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #eee; margin-top: 8px; }
        .save-btn { width: 100%; padding: 15px; border-radius: 15px; font-weight: 800; }
      `}</style>
    </div>
  );
}
