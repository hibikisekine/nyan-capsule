'use client';

import { Player } from '@remotion/player';
import { NyanCapsuleVideo } from '../../remotion/MyVideo';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const LANGUAGES = {
  JA: {
    back: "← 戻る",
    bestDigest: "✨ ベスト思い出ダイジェスト",
    normalDigest: "思い出ダイジェスト",
    hint: "画面を録画してTikTokやInstagramにシェアしよう！✨",
    saveReport: "レポートとして保存 (PDF) 🐾",
  },
  EN: {
    back: "← Back",
    bestDigest: "✨ Best Memory Digest",
    normalDigest: "Memory Digest",
    hint: "Record your screen and share on TikTok or Instagram! ✨",
    saveReport: "Save as Report (PDF) 🐾",
  },
  ZH: {
    back: "← 返回",
    bestDigest: "✨ 最佳回忆精华",
    normalDigest: "回忆精华",
    hint: "录制并分享到 TikTok 或 Instagram！✨",
    saveReport: "保存为报告 (PDF) 🐾",
  }
};

export default function VideoPage() {
  const [lang, setLang] = useState('JA');
  const t = LANGUAGES[lang] || LANGUAGES.JA;

  const [entries, setEntries] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  const [mode, setMode] = useState(null);

  // ... (getDB and getMediaFromDB remain same)
  const getDB = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') return reject('No window');
      const request = indexedDB.open('NyanCapsuleDB', 2);
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }, []);

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

  useEffect(() => {
    setIsMounted(true);
    const init = async () => {
      const savedLang = localStorage.getItem('nyan_lang') || 'JA';
      setLang(savedLang);

      const savedEntries = localStorage.getItem('nyan_entries');
      const savedCats = localStorage.getItem('nyan_cats');
      const savedActiveId = localStorage.getItem('nyan_active_id');

      if (savedCats && savedActiveId) {
        const cats = JSON.parse(savedCats);
        const active = cats.find(c => c.id === Number(savedActiveId)) || cats[0];
        setActiveCat(active);

        if (savedEntries) {
          const parsed = JSON.parse(savedEntries);
          let catEntries = parsed.filter(e => e.catId === active.id);

          const params = new URLSearchParams(window.location.search);
          const currentMode = params.get('mode');
          if (currentMode === 'best') {
            catEntries = catEntries.filter(e => e.isSpecial);
          }
          setMode(currentMode);

          const hydrated = await Promise.all(catEntries.map(async (entry) => {
            if (entry.hasStoredMedia) {
              const blob = await getMediaFromDB(entry.id);
              if (blob instanceof Blob) {
                return { ...entry, mediaUrl: URL.createObjectURL(blob) };
              }
            }
            return entry;
          }));
          setEntries(hydrated);
        }
      }
    };
    init();
  }, [getDB]);

  if (!isMounted || !activeCat) return null;

  const slideDuration = 75;
  const totalFrames = Math.max(slideDuration, entries.length * slideDuration);

  return (
    <div className="video-view-container">
      <header className="video-header glass">
        <Link href="/" className="back-link">{t.back}</Link>
        <div className="header-labels">
          <span className="cat-label">{activeCat.emoji} {activeCat.name}</span>
          <h1>{mode === 'best' ? t.bestDigest : t.normalDigest}</h1>
        </div>
      </header>

      <main className="video-main">
        <div className="player-wrapper shadow-premium">
          <Player
            component={NyanCapsuleVideo}
            durationInFrames={totalFrames}
            compositionWidth={1080}
            compositionHeight={1920}
            fps={30}
            inputProps={{ entries, cat: activeCat }}
            controls
            loop
            style={{
              width: '100%',
              aspectRatio: '9/16',
              borderRadius: '32px',
            }}
          />
        </div>

        <div className="video-actions">
          <p className="hint">{t.hint}</p>
          <button className="share-btn nyan-gradient btn-hover" onClick={() => window.print()}>
            {t.saveReport}
          </button>
        </div>
      </main>

      <style jsx>{`
        .video-view-container {
          min-height: 100vh;
          background: #fbfbfd;
          display: flex;
          flex-direction: column;
        }
        .video-header {
          padding: 60px 24px 20px;
          display: flex;
          align-items: center;
          gap: 20px;
          border-radius: 0 0 32px 32px;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .back-link {
          text-decoration: none;
          color: var(--primary);
          font-weight: 800;
          font-size: 16px;
        }
        .header-labels h1 {
          font-size: 18px;
          font-weight: 900;
          margin: 0;
        }
        .cat-label {
          font-size: 12px;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .video-main {
          flex: 1;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }
        .player-wrapper {
          width: 100%;
          max-width: 400px;
          border-radius: 24px;
          overflow: hidden;
          background: #000;
        }
        .video-actions {
          text-align: center;
          width: 100%;
          max-width: 400px;
        }
        .hint {
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 20px;
          font-weight: 600;
        }
        .share-btn {
          width: 100%;
          padding: 16px;
          border-radius: 16px;
          border: none;
          color: white;
          font-weight: 800;
          font-size: 15px;
          cursor: pointer;
          box-shadow: 0 8px 16px var(--primary-glow);
        }
        .shadow-premium {
          box-shadow: 0 30px 60px rgba(0,0,0,0.12);
        }
      `}</style>
    </div>
  );
}
