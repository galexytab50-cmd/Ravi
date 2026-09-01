import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useParams, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import {
  Newspaper, RefreshCw, ExternalLink, ImageOff, WifiOff, Loader2,
  Archive, ShieldAlert, CalendarDays, Hash, AlertTriangle, Image as ImageIcon, Download, Clock,
  Film, MessageSquare, Cloud, X, LogOut, Users, Trash2, Plus, Lock, User, Menu,
} from 'lucide-react';
import raviLogo from './assets/ravi-logo.png';

/* ---------------------------------------------------------------------
   احراز هویت — ذخیره‌ی توکن و ارسال خودکارش با هر درخواست API
--------------------------------------------------------------------- */
const TOKEN_STORAGE_KEY = 'ravi_token';

function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
}
function setToken(token) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}
function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}
function authFetch(url, options = {}) {
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${getToken()}` };
  return fetch(url, { ...options, headers });
}

/* ---------------------------------------------------------------------
   هویت بصری — راوی (بر اساس رنگ لوگو: آبی سرمه‌ای)
--------------------------------------------------------------------- */
const C = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surface2: '#F0F1FA',
  border: '#DEE0F2',
  borderSoft: '#EBECF8',
  gold: '#15159C',
  goldSoft: 'rgba(21,21,156,0.10)',
  maroon: '#D6373F',
  maroonSoft: 'rgba(214,55,63,0.08)',
  text: '#111111',
  textMuted: '#5A5A5A',
  textFaint: '#8C8C8C',
};

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Vazirmatn:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

* { box-sizing: border-box; }
button { font-family: inherit; }
input { font-family: inherit; }
.iraf-root { font-family: 'Vazirmatn', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif; background: ${C.bg}; color: ${C.text}; min-height: 100vh; direction: rtl; }
.iraf-mono { font-family: 'JetBrains Mono', monospace; direction: ltr; unicode-bidi: isolate; }
.iraf-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
.iraf-scroll::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
.iraf-scroll::-webkit-scrollbar-track { background: transparent; }

@keyframes iraf-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(0.65); } }
@keyframes iraf-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes iraf-fadeup { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.iraf-fadeup { animation: iraf-fadeup 0.4s ease both; }

.iraf-card {
  background: ${C.surface}; border: 1.5px solid ${C.gold}; border-radius: 12px;
  box-shadow: 0 2px 6px rgba(21,21,156,0.08); overflow: hidden; min-width: 0;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.iraf-card:hover { box-shadow: 0 6px 16px rgba(21,21,156,0.16); transform: translateY(-2px); }
.iraf-refresh-btn {
  display: flex; align-items: center; gap: 6px; background: ${C.goldSoft}; color: ${C.gold};
  border: 1px solid transparent; border-radius: 7px; padding: 8px 14px; font-size: 12.5px;
  font-weight: 600; cursor: pointer; transition: background 0.15s ease;
}
.iraf-refresh-btn:hover { background: rgba(21,21,156,0.18); }
.iraf-refresh-btn:disabled { opacity: 0.6; cursor: default; }

.iraf-layout { display: flex; gap: 22px; align-items: flex-start; }
.iraf-sidebar { width: 216px; flex-shrink: 0; display: flex; flex-direction: column; gap: 4px; position: sticky; top: 20px; }
.iraf-side-btn {
  display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-radius: 9px;
  font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent;
  background: transparent; color: ${C.textFaint}; text-align: right; width: 100%; transition: all 0.15s ease;
  text-decoration: none; box-sizing: border-box;
}
.iraf-side-btn:hover { background: ${C.goldSoft}; color: ${C.gold}; }
.iraf-side-btn.active { background: ${C.gold}; color: #FFFFFF; box-shadow: 0 2px 6px rgba(21,21,156,0.30); }

.iraf-date-input {
  font-family: inherit; border: 1px solid ${C.border}; border-radius: 8px; padding: 9px 12px;
  font-size: 13px; color: ${C.text}; background: ${C.surface}; cursor: pointer;
}
.iraf-date-input:focus { outline: 2px solid ${C.goldSoft}; }

.iraf-chip {
  display: inline-flex; align-items: center; gap: 5px; background: ${C.goldSoft}; color: ${C.gold};
  border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 600;
}

.iraf-tool-btn {
  display: flex; align-items: center; justify-content: center; gap: 5px; flex: 1;
  background: ${C.surface2}; color: ${C.gold}; border: 1px solid ${C.border}; border-radius: 7px;
  padding: 7px 8px; font-size: 11.5px; font-weight: 700; cursor: pointer; transition: background 0.15s ease;
}
.iraf-tool-btn:hover { background: ${C.goldSoft}; }
.iraf-tool-btn:disabled { opacity: 0.6; cursor: default; }

.iraf-post-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; align-items: stretch; }
@media (max-width: 700px) {
  .iraf-post-grid { grid-template-columns: 1fr; }
}

.iraf-ticker-viewport { overflow: hidden; direction: ltr; }
.iraf-ticker-track {
  display: inline-flex; width: max-content; white-space: nowrap;
  animation: iraf-ticker 70s linear infinite;
}
.iraf-ticker-item {
  color: #FFFFFF; font-size: 12px; font-weight: 600; padding-left: 50px; direction: rtl; unicode-bidi: plaintext;
}
@keyframes iraf-ticker {
  from { transform: translateX(-50%); }
  to { transform: translateX(0); }
}

.iraf-text-input {
  width: 100%; font-family: inherit; border: 1px solid ${C.border}; border-radius: 8px;
  padding: 9px 12px; font-size: 13px; color: ${C.text}; background: ${C.surface};
  box-sizing: border-box;
}
.iraf-text-input:focus { outline: 2px solid ${C.goldSoft}; border-color: ${C.gold}; }

.iraf-mobile-menu-btn {
  display: none; align-items: center; justify-content: center; gap: 6px;
  background: ${C.goldSoft}; color: ${C.gold}; border: 1px solid ${C.border}; border-radius: 8px;
  padding: 9px 14px; font-size: 13px; font-weight: 700; cursor: pointer; width: 100%;
}

@media (max-width: 780px) {
  .iraf-layout { flex-direction: column; }
  .iraf-mobile-menu-btn { display: flex; }
  .iraf-sidebar {
    display: none; width: 100%; position: static; background: ${C.surface};
    border: 1px solid ${C.border}; border-radius: 10px; padding: 8px; margin-top: 8px;
  }
  .iraf-sidebar.iraf-mobile-open { display: flex; }
  .iraf-side-btn { flex-shrink: 0; }
}
@media (max-width: 640px) {
  .iraf-layout { padding: 16px 14px 50px !important; }
  .iraf-header-slogan { display: none !important; }
  .iraf-header-inner { gap: 10px !important; padding: 8px 12px !important; }
  .iraf-admin-form-grid { grid-template-columns: 1fr !important; }
}
`;

const POLL_INTERVAL_MS = 45000;

function timeAgoFa(dateMs) {
  const diffSec = Math.max(0, Math.floor((Date.now() - dateMs) / 1000));
  if (diffSec < 60) return 'همین الان';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin.toLocaleString('fa-IR')} دقیقه پیش`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour.toLocaleString('fa-IR')} ساعت پیش`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay.toLocaleString('fa-IR')} روز پیش`;
}

function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ---------------------------------------------------------------------
   ساعت زنده (بر اساس منطقه‌ی فعال)
--------------------------------------------------------------------- */
const REGION_CLOCKS = {
  iraq: { timeZone: 'Asia/Baghdad', label: 'به‌وقت بغداد' },
  syria: { timeZone: 'Asia/Damascus', label: 'به‌وقت دمشق' },
  usa: { timeZone: 'America/Chicago', label: 'به‌وقت مرکزی آمریکا' },
  europe: { timeZone: 'Europe/London', label: 'به‌وقت لندن' },
  latam: { timeZone: 'America/Caracas', label: 'به‌وقت ونزوئلا' },
};

function LiveClock({ timeZone, label }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('fa-IR', {
    timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const dateStr = now.toLocaleDateString('fa-IR', {
    timeZone, weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="iraf-mono" style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: 6 }}>
      <Clock size={13} />
      <span>{timeStr}</span>
      <span style={{ opacity: 0.7 }}>· {dateStr} · {label}</span>
    </div>
  );
}

/* ---------------------------------------------------------------------
   نوار خبر فوری (الجزیره، ترجمه‌شده به فارسی) — فقط برای راوی عراق
--------------------------------------------------------------------- */
const BREAKING_NEWS_POLL_MS = 60000;

function BreakingNewsTicker() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await authFetch('/api/breaking-news');
        const data = await res.json();
        if (!cancelled && Array.isArray(data.items)) setItems(data.items);
      } catch {
        // خطای شبکه رو نادیده می‌گیریم؛ نوار قبلی (اگه بود) همون‌جا می‌مونه
      }
    };
    load();
    const interval = setInterval(load, BREAKING_NEWS_POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (items.length === 0) return <div />;

  const text = items.map((it) => it.text).join('   ***   ');

  const segment = (
    <span className="iraf-ticker-item">
      <span style={{ color: '#FFD400', fontWeight: 800, marginLeft: 10 }}>خبر فوری</span>
      {text}
    </span>
  );

  return (
    <div className="iraf-ticker-viewport" style={{ flex: 1, minWidth: 0 }}>
      <div className="iraf-ticker-track">
        {segment}
        {segment}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   پنجره‌ی مودال مشترک (برای نمایش نتیجه‌ی سناریو/کپشن)
--------------------------------------------------------------------- */
function Modal({ title, onClose, children }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(13,13,60,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <div
        className="iraf-scroll"
        style={{ background: '#FFFFFF', borderRadius: 14, maxWidth: 560, width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '20px 22px', direction: 'rtl' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>
          <button onClick={onClose} style={{ background: C.surface2, border: 'none', borderRadius: 8, cursor: 'pointer', color: C.textMuted, padding: 6, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   کارت پست
--------------------------------------------------------------------- */
function PostCard({ post }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [scenarioState, setScenarioState] = useState(null); // null | {status, data, error}
  const [captionState, setCaptionState] = useState(null);
  const dateMs = new Date(post.date).getTime();

  const runScenario = async () => {
    setScenarioState({ status: 'loading' });
    try {
      const res = await authFetch('/api/scenario/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: post.text }),
      });
      const data = await res.json();
      if (data.ok) setScenarioState({ status: 'ready', data: data.scenario });
      else setScenarioState({ status: 'error', error: data.error || 'خطا در تولید سناریو.' });
    } catch {
      setScenarioState({ status: 'error', error: 'ارتباط با سرور برقرار نشد.' });
    }
  };

  const runCaption = async () => {
    setCaptionState({ status: 'loading' });
    try {
      const res = await authFetch('/api/caption/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: post.text }),
      });
      const data = await res.json();
      if (data.ok) setCaptionState({ status: 'ready', data: data.captions });
      else setCaptionState({ status: 'error', error: data.error || 'خطا در تولید کپشن.' });
    } catch {
      setCaptionState({ status: 'error', error: 'ارتباط با سرور برقرار نشد.' });
    }
  };

  return (
    <div className="iraf-card iraf-fadeup" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {post.photoUrl && !imgFailed && (
        <img
          src={post.photoUrl}
          alt=""
          loading="lazy"
          onError={() => setImgFailed(true)}
          style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block', borderBottom: `1px solid ${C.borderSoft}` }}
        />
      )}
      <div style={{ padding: '13px 15px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {post.text && (
          <div style={{ fontSize: 13.5, lineHeight: 1.9, whiteSpace: 'pre-wrap', wordBreak: 'break-word', textAlign: 'justify' }}>
            {post.text}
          </div>
        )}
        {!post.text && !post.photoUrl && (
          <div style={{ fontSize: 12.5, color: C.textFaint, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ImageOff size={14} /> پیام بدون متن یا تصویر
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: `1px solid ${C.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span className="iraf-mono" style={{ fontSize: 10.5, color: C.textFaint }} title={new Date(post.date).toLocaleString('fa-IR')}>
            {timeAgoFa(dateMs)}
          </span>
          {post.link && (
            <a href={post.link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.gold, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontWeight: 600 }}>
              مشاهده در تلگرام <ExternalLink size={12} />
            </a>
          )}
        </div>

        {post.text && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="iraf-tool-btn" onClick={runScenario} disabled={scenarioState && scenarioState.status === 'loading'}>
              <Film size={12} /> سناریو ساز
            </button>
            <button className="iraf-tool-btn" onClick={runCaption} disabled={captionState && captionState.status === 'loading'}>
              <MessageSquare size={12} /> کپشن ساز
            </button>
          </div>
        )}
      </div>

      {scenarioState && (
        <Modal title="سناریوی ویدیو" onClose={() => setScenarioState(null)}>
          {scenarioState.status === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '30px 0', color: C.textFaint }}>
              <Loader2 size={20} style={{ animation: 'iraf-spin 1s linear infinite' }} />
              <span style={{ fontSize: 12.5 }}>در حال ساخت سناریو...</span>
            </div>
          )}
          {scenarioState.status === 'error' && (
            <div style={{ fontSize: 12.5, color: C.maroon, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={14} /> {scenarioState.error}
            </div>
          )}
          {scenarioState.status === 'ready' && scenarioState.data && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{scenarioState.data.title}</div>
              <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 16 }}>
                مدت تقریبی: {(scenarioState.data.totalDurationSeconds || 0).toLocaleString('fa-IR')} ثانیه · {(scenarioState.data.shots || []).length.toLocaleString('fa-IR')} شات
              </div>
              {(scenarioState.data.shots || []).map((s, i, arr) => (
                <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < arr.length - 1 ? `1px solid ${C.borderSoft}` : 'none' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, marginBottom: 5 }}>
                    شات {(s.shotNumber || i + 1).toLocaleString('fa-IR')} · {(s.durationSeconds || 0).toLocaleString('fa-IR')} ثانیه
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.9, marginBottom: 6 }}>{s.narration}</div>
                  <div style={{ fontSize: 11.5, color: C.textMuted, display: 'flex', gap: 6 }}>
                    <Film size={12} style={{ flexShrink: 0, marginTop: 2 }} /> {s.visualSuggestion}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {captionState && (
        <Modal title="کپشن شبکه‌های اجتماعی" onClose={() => setCaptionState(null)}>
          {captionState.status === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '30px 0', color: C.textFaint }}>
              <Loader2 size={20} style={{ animation: 'iraf-spin 1s linear infinite' }} />
              <span style={{ fontSize: 12.5 }}>در حال ساخت کپشن...</span>
            </div>
          )}
          {captionState.status === 'error' && (
            <div style={{ fontSize: 12.5, color: C.maroon, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={14} /> {captionState.error}
            </div>
          )}
          {captionState.status === 'ready' && captionState.data && (
            <div>
              {[
                ['اینستاگرام', captionState.data.instagram],
                ['فیس‌بوک', captionState.data.facebook],
                ['ایکس (توییتر)', captionState.data.twitter],
              ].map(([label, txt], i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 800 }}>{label}</span>
                    <button
                      onClick={() => navigator.clipboard && navigator.clipboard.writeText(txt || '')}
                      style={{ fontSize: 11, color: C.gold, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                    >
                      کپی
                    </button>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.9, background: C.surface2, borderRadius: 8, padding: '10px 12px', whiteSpace: 'pre-wrap' }}>
                    {txt}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function PostGrid({ posts }) {
  return (
    <div className="iraf-post-grid">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}

function StateBlock({ icon, text, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '70px 0', color: color || C.textFaint }}>
      {icon}
      <span style={{ fontSize: 13 }}>{text}</span>
    </div>
  );
}

/* ---------------------------------------------------------------------
   ابر کلمات روز — چیدمان مارپیچی با اندازه‌ی متناسب با تکرار، کاملاً با SVG
--------------------------------------------------------------------- */
function WordCloudSvg({ words }) {
  const width = 760;
  const height = 320;
  const colors = [C.gold, C.maroon, '#0D0D6E', C.textMuted, '#7A2E8C'];

  const layout = React.useMemo(() => {
    if (!words || words.length === 0) return [];
    const sorted = [...words].sort((a, b) => b.count - a.count);
    const maxCount = sorted[0].count;
    const minCount = sorted[sorted.length - 1].count;
    const minFont = 14;
    const maxFont = 52;
    const scale = (c) => (minCount === maxCount ? (minFont + maxFont) / 2 : minFont + ((c - minCount) / (maxCount - minCount)) * (maxFont - minFont));

    let ctx = null;
    try {
      const canvas = document.createElement('canvas');
      ctx = canvas.getContext('2d');
    } catch {
      ctx = null;
    }

    const placed = [];
    const centerX = width / 2;
    const centerY = height / 2;
    const results = [];

    sorted.forEach((w, idx) => {
      const fontSize = scale(w.count);
      let boxW;
      if (ctx) {
        ctx.font = `800 ${fontSize}px Vazirmatn, sans-serif`;
        boxW = ctx.measureText(w.word).width + 10;
      } else {
        boxW = w.word.length * fontSize * 0.62 + 10;
      }
      const boxH = fontSize * 1.25;

      let angle = idx * 0.6;
      let radius = 0;
      let x = centerX;
      let y = centerY;

      for (let attempt = 0; attempt < 1500; attempt++) {
        x = centerX + radius * Math.cos(angle) - boxW / 2;
        y = centerY + radius * Math.sin(angle) - boxH / 2;
        const collides = placed.some((p) => !(x + boxW < p.x || p.x + p.w < x || y + boxH < p.y || p.y + p.h < y));
        if (!collides) break;
        angle += 0.28;
        radius += 2.2;
      }

      placed.push({ x, y, w: boxW, h: boxH });
      results.push({ word: w.word, count: w.count, fontSize, x: x + boxW / 2, y: y + boxH / 2, color: colors[idx % colors.length] });
    });

    return results;
  }, [words]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', marginTop: 14 }}>
      {layout.map((item, i) => (
        <text
          key={i}
          x={item.x}
          y={item.y}
          fontSize={item.fontSize}
          fontWeight="800"
          fill={item.color}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontFamily: "'Vazirmatn', sans-serif" }}
        >
          {item.word}
        </text>
      ))}
    </svg>
  );
}

function WordCloudTab({ region }) {
  const [status, setStatus] = useState('idle'); // idle | loading | ready | empty | error
  const [words, setWords] = useState([]);
  const [newsCount, setNewsCount] = useState(0);

  const generate = async () => {
    setStatus('loading');
    try {
      const res = await authFetch(`/api/wordcloud?region=${region}`);
      const data = await res.json();
      if (data.words && data.words.length > 0) {
        setWords(data.words);
        setNewsCount(data.newsCount || 0);
        setStatus('ready');
      } else {
        setStatus('empty');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 11.5, color: C.textFaint }}>
          ابر کلمات پرتکرار اخبار امروز
          {status === 'ready' && ` · بر اساس ${newsCount.toLocaleString('fa-IR')} خبر`}
        </span>
        <button className="iraf-refresh-btn" onClick={generate} disabled={status === 'loading'}>
          <RefreshCw size={13} style={status === 'loading' ? { animation: 'iraf-spin 1s linear infinite' } : undefined} />
          {status === 'loading' ? 'در حال ساخت...' : 'تولید ابر کلمات'}
        </button>
      </div>

      {status === 'idle' && <StateBlock icon={<Cloud size={22} />} text="برای ساختن ابر کلمات، دکمه‌ی «تولید ابر کلمات» رو بزن." />}
      {status === 'loading' && <StateBlock icon={<Loader2 size={22} style={{ animation: 'iraf-spin 1s linear infinite' }} />} text="در حال تحلیل اخبار امروز..." />}
      {status === 'error' && <StateBlock icon={<WifiOff size={22} />} text="ارتباط با سرور برقرار نشد." color={C.maroon} />}
      {status === 'empty' && <StateBlock icon={<Cloud size={22} />} text="امروز هنوز خبری برای تحلیل ثبت نشده است." />}
      {status === 'ready' && (
        <div className="iraf-card" style={{ padding: 18 }}>
          <WordCloudSvg words={words} />
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------
   تب ۱ — پوشش زنده اخبار
--------------------------------------------------------------------- */
function LiveTab({ region }) {
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const cancelledRef = useRef(false);

  const load = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await authFetch(`/api/telegram-posts?region=${region}`);
      const data = await res.json();
      if (cancelledRef.current) return;
      if (data.posts && data.posts.length > 0) {
        setPosts(data.posts);
        setStatus('ready');
      } else {
        setPosts([]);
        setStatus('empty');
      }
      setLastUpdated(new Date());
    } catch (e) {
      if (!cancelledRef.current) setStatus((prev) => (prev === 'ready' ? prev : 'error'));
    } finally {
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    cancelledRef.current = false;
    setStatus('loading');
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => { cancelledRef.current = true; clearInterval(interval); };
  }, [region]);

  const handleClearAll = async () => {
    const confirmed = window.confirm('همه‌ی اخبار ذخیره‌شده (پوشش زنده و آرشیو) برای همیشه پاک می‌شود. مطمئنی؟');
    if (!confirmed) return;

    setClearing(true);
    try {
      const res = await authFetch(`/api/admin/clear-posts?region=${region}`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setPosts([]);
        setStatus('empty');
        window.alert('همه‌ی اخبار پاک شد.');
      } else {
        window.alert(data.error || 'پاک‌کردن اخبار با خطا مواجه شد.');
      }
    } catch (e) {
      window.alert('ارتباط با سرور برقرار نشد.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 11.5, color: C.textFaint }}>
          {lastUpdated ? `آخرین به‌روزرسانی: ${lastUpdated.toLocaleTimeString('fa-IR')}` : 'در حال بارگذاری...'}
          {status === 'ready' && ` · ${posts.length.toLocaleString('fa-IR')} خبر`}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="iraf-refresh-btn" onClick={handleClearAll} disabled={clearing} style={{ background: C.maroonSoft, color: C.maroon }}>
            <AlertTriangle size={13} />
            {clearing ? 'در حال پاک‌کردن...' : 'پاک‌کردن همه‌ی اخبار'}
          </button>
          <button className="iraf-refresh-btn" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw size={13} style={refreshing ? { animation: 'iraf-spin 1s linear infinite' } : undefined} />
            بروزرسانی
          </button>
        </div>
      </div>

      {status === 'loading' && <StateBlock icon={<Loader2 size={22} style={{ animation: 'iraf-spin 1s linear infinite' }} />} text="در حال دریافت اخبار..." />}
      {status === 'error' && <StateBlock icon={<WifiOff size={22} />} text="ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید." color={C.maroon} />}
      {status === 'empty' && <StateBlock icon={<Newspaper size={22} />} text="هنوز خبری دریافت نشده. به محض انتشار پست جدید در کانال تلگرام، اینجا نمایش داده می‌شود." />}
      {status === 'ready' && <PostGrid posts={posts} />}
    </div>
  );
}

/* ---------------------------------------------------------------------
   تب ۲ — آرشیو مطالب (با تقویم قابل کلیک)
--------------------------------------------------------------------- */
function ArchiveTab({ region }) {
  const [date, setDate] = useState(todayIsoDate());
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState('loading');

  const loadDate = async (d) => {
    setStatus('loading');
    try {
      const res = await authFetch(`/api/archive?region=${region}&date=${encodeURIComponent(d)}`);
      const data = await res.json();
      if (data.posts && data.posts.length > 0) {
        setPosts(data.posts);
        setStatus('ready');
      } else {
        setPosts([]);
        setStatus('empty');
      }
    } catch (e) {
      setStatus('error');
    }
  };

  useEffect(() => { loadDate(date); }, [region]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDateChange = (e) => {
    const d = e.target.value;
    setDate(d);
    loadDate(d);
  };

  const dateLabel = (() => {
    try {
      return new Date(date + 'T00:00:00').toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return '';
    }
  })();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarDays size={16} color={C.gold} />
          <span style={{ fontSize: 12.5, color: C.textMuted, fontWeight: 600 }}>{dateLabel}</span>
        </div>
        <input type="date" className="iraf-date-input" value={date} max={todayIsoDate()} onChange={handleDateChange} />
      </div>

      {status === 'loading' && <StateBlock icon={<Loader2 size={22} style={{ animation: 'iraf-spin 1s linear infinite' }} />} text="در حال جست‌وجو در آرشیو..." />}
      {status === 'error' && <StateBlock icon={<WifiOff size={22} />} text="ارتباط با سرور برقرار نشد." color={C.maroon} />}
      {status === 'empty' && <StateBlock icon={<Archive size={22} />} text="هیچ مطلبی برای این تاریخ ثبت نشده است." />}
      {status === 'ready' && <PostGrid posts={posts} />}
    </div>
  );
}

/* ---------------------------------------------------------------------
   تب ۳ — عملیات روانی (گزارش خودکار AI)
--------------------------------------------------------------------- */
function ReportSection({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 10, color: C.text }}>{title}</div>
      {children}
    </div>
  );
}

function PsyopTab({ region }) {
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState('loading');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);

  const load = async () => {
    setStatus('loading');
    try {
      const res = await authFetch(`/api/psyop-report?region=${region}`);
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        setStatus('ready');
      } else {
        setStatus('empty');
      }
    } catch (e) {
      setStatus('error');
    }
  };

  useEffect(() => { load(); }, [region]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await authFetch(`/api/psyop-report/generate?region=${region}`, { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.report) {
        setReport(data.report);
        setStatus('ready');
      } else {
        setGenerateError(data.error || 'خطا در تولید گزارش.');
      }
    } catch (e) {
      setGenerateError('ارتباط با سرور برقرار نشد.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 11.5, color: C.textFaint, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldAlert size={14} color={C.maroon} />
          گزارش اخبار امروز، از نیمه‌شب (وقت عراق) تا لحظه‌ی تولید گزارش
        </span>
        <button className="iraf-refresh-btn" onClick={handleGenerate} disabled={generating}>
          <RefreshCw size={13} style={generating ? { animation: 'iraf-spin 1s linear infinite' } : undefined} />
          {generating ? 'در حال تولید گزارش...' : 'تولید گزارش'}
        </button>
      </div>

      {generateError && (
        <div className="iraf-card" style={{ padding: '10px 14px', marginBottom: 16, background: C.maroonSoft, borderColor: C.maroonSoft, fontSize: 12.5, color: C.maroon, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} /> {generateError}
        </div>
      )}

      {status === 'loading' && <StateBlock icon={<Loader2 size={22} style={{ animation: 'iraf-spin 1s linear infinite' }} />} text="در حال دریافت گزارش..." />}
      {status === 'error' && <StateBlock icon={<WifiOff size={22} />} text="ارتباط با سرور برقرار نشد." color={C.maroon} />}
      {status === 'empty' && <StateBlock icon={<ShieldAlert size={22} />} text="هنوز هیچ گزارشی تولید نشده. روی دکمه‌ی «تولید گزارش» بزن." />}

      {status === 'ready' && report && (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
            <span className="iraf-chip"><Newspaper size={13} /> {report.newsCount.toLocaleString('fa-IR')} خبر در این بازه</span>
            <span className="iraf-chip" style={{ background: C.surface2, color: C.textMuted }}>
              تولید: {new Date(report.generatedAt).toLocaleString('fa-IR')}
            </span>
          </div>

          <ReportSection title="خلاصه‌ی مدیریتی">
            <div className="iraf-card" style={{ padding: '14px 16px', fontSize: 13.5, lineHeight: 2 }}>
              {report.summary || 'خلاصه‌ای ثبت نشده است.'}
            </div>
          </ReportSection>

          <ReportSection title="۵ خبر مهم این بازه">
            {report.top5News && report.top5News.length > 0 ? (
              <div className="iraf-card" style={{ padding: '6px 0' }}>
                {report.top5News.map((n, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 16px', borderBottom: i < report.top5News.length - 1 ? `1px solid ${C.borderSoft}` : 'none' }}>
                    <span style={{ color: C.gold, fontWeight: 800, fontSize: 13 }}>{(i + 1).toLocaleString('fa-IR')}</span>
                    <span style={{ fontSize: 13, lineHeight: 1.9 }}>{n}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12.5, color: C.textFaint }}>موردی ثبت نشده است.</span>
            )}
          </ReportSection>

          <ReportSection title="اخبار مهم شناسایی‌شده">
            {report.importantNews && report.importantNews.length > 0 ? (
              <ul style={{ margin: 0, paddingRight: 20, fontSize: 13, lineHeight: 2.1 }}>
                {report.importantNews.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            ) : (
              <span style={{ fontSize: 12.5, color: C.textFaint }}>موردی ثبت نشده است.</span>
            )}
          </ReportSection>

          <ReportSection title="تکنیک‌های عملیات روانی شناسایی‌شده">
            {report.techniques && report.techniques.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {report.techniques.map((t, i) => (
                  <div key={i} className="iraf-card" style={{ padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start', borderColor: C.maroonSoft, background: C.maroonSoft }}>
                    <AlertTriangle size={15} color={C.maroon} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 12.5, lineHeight: 1.9 }}>{t}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12.5, color: C.textFaint }}>موردی شناسایی نشده است.</span>
            )}
          </ReportSection>

          <ReportSection title="پرتکرارترین کلمات (بدون احتساب هشتگ‌ها)">
            {report.topWords && report.topWords.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {report.topWords.map((w, i) => (
                  <span key={i} className="iraf-chip">
                    <Hash size={11} /> {w.word} <span style={{ opacity: 0.7 }}>({w.count.toLocaleString('fa-IR')})</span>
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12.5, color: C.textFaint }}>داده‌ای ثبت نشده است.</span>
            )}
          </ReportSection>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------
   تب ۴ — اینفوگرافیک (خروجی JPEG از گزارش عملیات روانی، بدون هیچ API بیرونی)
--------------------------------------------------------------------- */
function PosterBar({ word, count, max }) {
  const pct = Math.max(6, Math.round((count / max) * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 12, width: 90, flexShrink: 0, textAlign: 'left', color: C.textMuted }}>
        {count.toLocaleString('fa-IR')}
      </span>
      <div style={{ flex: 1, background: C.surface2, borderRadius: 6, overflow: 'hidden', height: 16 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: C.gold, borderRadius: 6 }} />
      </div>
      <span style={{ fontSize: 12.5, width: 90, flexShrink: 0, fontWeight: 700 }}>{word}</span>
    </div>
  );
}

function InfographicTab({ region }) {
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState('loading');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const posterRef = useRef(null);

  const load = async () => {
    setStatus('loading');
    try {
      const res = await authFetch(`/api/psyop-report?region=${region}`);
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        setStatus('ready');
      } else {
        setStatus('empty');
      }
    } catch (e) {
      setStatus('error');
    }
  };

  useEffect(() => { load(); }, [region]);

  const handleDownload = async () => {
    if (!posterRef.current || !report) return;
    setExporting(true);
    setExportError(null);
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const dateLabel = new Date(report.generatedAt).toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `گزارش-عملیات-روانی-${dateLabel}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      setExportError('ساخت فایل JPEG با خطا مواجه شد. دوباره تلاش کنید.');
    } finally {
      setExporting(false);
    }
  };

  const maxWordCount = report && report.topWords && report.topWords.length > 0
    ? Math.max(...report.topWords.map((w) => w.count))
    : 1;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 11.5, color: C.textFaint, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ImageIcon size={14} color={C.gold} />
          اینفوگرافیک از آخرین گزارش عملیات روانی تولیدشده
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="iraf-refresh-btn" onClick={load}>
            <RefreshCw size={13} />
            بروزرسانی
          </button>
          {status === 'ready' && (
            <button className="iraf-refresh-btn" onClick={handleDownload} disabled={exporting} style={{ background: C.gold, color: '#fff' }}>
              <Download size={13} style={exporting ? { animation: 'iraf-spin 1s linear infinite' } : undefined} />
              {exporting ? 'در حال ساخت...' : 'دانلود JPEG'}
            </button>
          )}
        </div>
      </div>

      {exportError && (
        <div className="iraf-card" style={{ padding: '10px 14px', marginBottom: 16, background: C.maroonSoft, borderColor: C.maroonSoft, fontSize: 12.5, color: C.maroon, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} /> {exportError}
        </div>
      )}

      {status === 'loading' && <StateBlock icon={<Loader2 size={22} style={{ animation: 'iraf-spin 1s linear infinite' }} />} text="در حال دریافت گزارش..." />}
      {status === 'error' && <StateBlock icon={<WifiOff size={22} />} text="ارتباط با سرور برقرار نشد." color={C.maroon} />}
      {status === 'empty' && <StateBlock icon={<ImageIcon size={22} />} text="هنوز گزارشی وجود نداره. اول از تب «عملیات روانی» یه گزارش بساز." />}

      {status === 'ready' && report && (
        <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto', padding: '8px 0' }}>
          <div
            ref={posterRef}
            style={{
              width: 760, background: '#FFFFFF', padding: '34px 38px', direction: 'rtl',
              fontFamily: "'Vazirmatn', sans-serif", border: `1px solid ${C.border}`,
            }}
          >
            {/* سربرگ پوستر */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `3px solid ${C.gold}`, paddingBottom: 16, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.gold }}>گزارش عملیات روانی</div>
                <div style={{ fontSize: 12.5, color: C.textFaint, marginTop: 4 }}>راوی عراق</div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div className="iraf-mono" style={{ fontSize: 11, color: C.textFaint }}>
                  {new Date(report.generatedAt).toLocaleDateString('fa-IR')}
                </div>
                <div className="iraf-mono" style={{ fontSize: 11, color: C.textFaint }}>
                  {new Date(report.generatedAt).toLocaleTimeString('fa-IR')}
                </div>
              </div>
            </div>

            {/* تعداد اخبار */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 26 }}>
              <div style={{ flex: 1, background: C.goldSoft, borderRadius: 10, padding: '16px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: C.gold }}>{report.newsCount.toLocaleString('fa-IR')}</div>
                <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 4 }}>خبر بررسی‌شده</div>
              </div>
              <div style={{ flex: 1, background: C.maroonSoft, borderRadius: 10, padding: '16px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: C.maroon }}>{(report.techniques || []).length.toLocaleString('fa-IR')}</div>
                <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 4 }}>تکنیک شناسایی‌شده</div>
              </div>
              <div style={{ flex: 1, background: C.surface2, borderRadius: 10, padding: '16px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: C.text }}>{(report.topWords || []).length.toLocaleString('fa-IR')}</div>
                <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 4 }}>کلمه‌ی پرتکرار</div>
              </div>
            </div>

            {/* خلاصه‌ی مدیریتی */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>خلاصه‌ی مدیریتی</div>
              <div style={{ fontSize: 12.5, lineHeight: 2, background: C.surface2, borderRadius: 8, padding: '12px 14px' }}>
                {report.summary || 'خلاصه‌ای ثبت نشده است.'}
              </div>
            </div>

            {/* ۵ خبر مهم */}
            {report.top5News && report.top5News.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>۵ خبر مهم این بازه</div>
                <div>
                  {report.top5News.map((n, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12, lineHeight: 1.9 }}>
                      <span style={{ color: C.gold, fontWeight: 800, flexShrink: 0 }}>{(i + 1).toLocaleString('fa-IR')}.</span>
                      <span>{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* تکنیک‌های عملیات روانی */}
            {report.techniques && report.techniques.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 8, color: C.maroon }}>تکنیک‌های عملیات روانی شناسایی‌شده</div>
                <div>
                  {report.techniques.map((t, i) => (
                    <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 6, fontSize: 11.5, lineHeight: 1.9 }}>
                      <span style={{ color: C.maroon, flexShrink: 0 }}>▸</span>
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* پرتکرارترین کلمات - نمودار میله‌ای */}
            {report.topWords && report.topWords.length > 0 && (
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 10 }}>پرتکرارترین کلمات</div>
                {report.topWords.slice(0, 10).map((w, i) => (
                  <PosterBar key={i} word={w.word} count={w.count} max={maxWordCount} />
                ))}
              </div>
            )}

            <div style={{ marginTop: 26, paddingTop: 14, borderTop: `1px solid ${C.borderSoft}`, textAlign: 'center', fontSize: 10.5, color: C.textFaint }}>
              تولیدشده توسط راوی عراق
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ---------------------------------------------------------------------
   اپ اصلی — هدر با لوگو، ساعت زنده، ناوبری مناطق، و مسیریابی واقعی
--------------------------------------------------------------------- */
const TABS = [
  { key: 'live', label: 'پوشش زنده اخبار', icon: Newspaper },
  { key: 'wordcloud', label: 'ابر کلمات روز', icon: Cloud },
  { key: 'archive', label: 'آرشیو مطالب', icon: Archive },
  { key: 'psyop', label: 'عملیات روانی', icon: ShieldAlert },
  { key: 'infographic', label: 'اینفوگرافیک', icon: ImageIcon },
];

const REGIONS = [
  { key: 'iraq', label: 'راوی عراق' },
  { key: 'syria', label: 'راوی سوریه' },
  { key: 'usa', label: 'راوی آمریکا' },
  { key: 'europe', label: 'راوی اروپا' },
  { key: 'latam', label: 'راوی آمریکای لاتین' },
];

/* ---------------------------------------------------------------------
   صفحه‌ی ورود
--------------------------------------------------------------------- */
function LoginPage({ onLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.ok) {
        setToken(data.token);
        onLoggedIn({ username: data.username, role: data.role, region: data.region });
      } else {
        setError(data.error || 'ورود ناموفق بود.');
      }
    } catch {
      setError('ارتباط با سرور برقرار نشد.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="iraf-root" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <style>{FONT_IMPORT}</style>
      <form onSubmit={handleSubmit} className="iraf-card" style={{ padding: '32px 28px', width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <img src={raviLogo} alt="راوی" style={{ height: 58 }} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, textAlign: 'center', marginBottom: 22, color: C.gold }}>ورود به راوی</div>

        {error && (
          <div style={{ background: C.maroonSoft, color: C.maroon, padding: '9px 12px', borderRadius: 8, fontSize: 12.5, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <label style={{ fontSize: 12, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
          <User size={13} /> نام‌کاربری
        </label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="iraf-text-input"
          style={{ marginBottom: 14 }}
          autoFocus
          required
        />

        <label style={{ fontSize: 12, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
          <Lock size={13} /> رمز عبور
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="iraf-text-input"
          style={{ marginBottom: 22 }}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="iraf-refresh-btn"
          style={{ width: '100%', justifyContent: 'center', background: C.gold, color: '#FFFFFF', padding: '11px 0', fontSize: 13.5 }}
        >
          {loading ? 'در حال ورود...' : 'ورود'}
        </button>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------------------
   پنل مدیریت کاربران (فقط برای مدیر کل)
--------------------------------------------------------------------- */
function AdminUsersPage({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState('loading');
  const [formOpen, setFormOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('region');
  const [newRegion, setNewRegion] = useState('iraq');
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setStatus('loading');
    try {
      const res = await authFetch('/api/admin/users');
      const data = await res.json();
      if (data.ok) {
        setUsers(data.users);
        setStatus('ready');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const res = await authFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole, region: newRegion }),
      });
      const data = await res.json();
      if (data.ok) {
        setNewUsername('');
        setNewPassword('');
        setNewRole('region');
        setNewRegion('iraq');
        setFormOpen(false);
        load();
      } else {
        setFormError(data.error || 'ساخت کاربر با خطا مواجه شد.');
      }
    } catch {
      setFormError('ارتباط با سرور برقرار نشد.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (username) => {
    const confirmed = window.confirm(`کاربر «${username}» برای همیشه حذف شود؟`);
    if (!confirmed) return;
    try {
      const res = await authFetch(`/api/admin/users?username=${encodeURIComponent(username)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) load();
      else window.alert(data.error || 'حذف کاربر با خطا مواجه شد.');
    } catch {
      window.alert('ارتباط با سرور برقرار نشد.');
    }
  };

  const regionLabel = (key) => (REGIONS.find((r) => r.key === key) || {}).label || key;

  return (
    <div className="iraf-root">
      <style>{FONT_IMPORT}</style>

      <div style={{ background: '#FFFFFF', borderBottom: `2px solid ${C.gold}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '10px 20px', flexWrap: 'wrap' }}>
          <Link to="/iraq/live" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <img src={raviLogo} alt="راوی" style={{ height: 46, width: 'auto', display: 'block' }} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12.5, color: C.textMuted }}>{user.username}</span>
            <button className="iraf-refresh-btn" onClick={onLogout}><LogOut size={13} /> خروج</button>
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '26px 20px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} color={C.gold} />
            <span style={{ fontSize: 16, fontWeight: 800 }}>مدیریت کاربران</span>
          </div>
          <button className="iraf-refresh-btn" onClick={() => setFormOpen((v) => !v)} style={{ background: C.gold, color: '#FFFFFF' }}>
            <Plus size={13} /> کاربر جدید
          </button>
        </div>

        {formOpen && (
          <form onSubmit={handleCreate} className="iraf-card" style={{ padding: 18, marginBottom: 22 }}>
            {formError && (
              <div style={{ background: C.maroonSoft, color: C.maroon, padding: '9px 12px', borderRadius: 8, fontSize: 12.5, marginBottom: 14 }}>
                {formError}
              </div>
            )}
            <div className="iraf-admin-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 6 }}>نام‌کاربری</label>
                <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="iraf-text-input" required />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 6 }}>رمز عبور</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="iraf-text-input" required minLength={6} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 6 }}>نوع دسترسی</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="iraf-text-input">
                  <option value="region">کاربر منطقه‌ای</option>
                  <option value="admin">مدیر کل</option>
                </select>
              </div>
              {newRole === 'region' && (
                <div>
                  <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 6 }}>منطقه</label>
                  <select value={newRegion} onChange={(e) => setNewRegion(e.target.value)} className="iraf-text-input">
                    {REGIONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </select>
                </div>
              )}
            </div>
            <button type="submit" disabled={saving} className="iraf-refresh-btn" style={{ background: C.gold, color: '#FFFFFF' }}>
              {saving ? 'در حال ساخت...' : 'ساخت کاربر'}
            </button>
          </form>
        )}

        {status === 'loading' && <StateBlock icon={<Loader2 size={22} style={{ animation: 'iraf-spin 1s linear infinite' }} />} text="در حال بارگذاری کاربران..." />}
        {status === 'error' && <StateBlock icon={<WifiOff size={22} />} text="ارتباط با سرور برقرار نشد." color={C.maroon} />}

        {status === 'ready' && (
          <div className="iraf-card" style={{ padding: 0, overflow: 'hidden' }}>
            {users.map((u, i) => (
              <div
                key={u.username}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px',
                  borderBottom: i < users.length - 1 ? `1px solid ${C.borderSoft}` : 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{u.username}</div>
                  <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 2 }}>
                    {u.role === 'admin' ? 'مدیر کل' : `کاربر منطقه‌ای · ${regionLabel(u.region)}`}
                  </div>
                </div>
                {u.username !== user.username && (
                  <button
                    onClick={() => handleDelete(u.username)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.maroon, padding: 6 }}
                    title="حذف کاربر"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            {users.length === 0 && <div style={{ padding: 20, textAlign: 'center', fontSize: 12.5, color: C.textFaint }}>هنوز کاربری ساخته نشده.</div>}
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------------
   صفحه‌ی هر منطقه — هدر با لوگو، ساعت زنده، ناوبری مناطق (بر اساس دسترسی کاربر)
--------------------------------------------------------------------- */
function RegionPage({ user, onLogout }) {
  const params = useParams();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = user.role === 'admin';
  const allowedRegions = isAdmin ? REGIONS : REGIONS.filter((r) => r.key === user.region);

  const validRegion = allowedRegions.some((r) => r.key === params.region) ? params.region : allowedRegions[0].key;
  const validTab = TABS.some((t) => t.key === params.tab) ? params.tab : 'live';
  const clockInfo = REGION_CLOCKS[validRegion] || REGION_CLOCKS.iraq;
  const activeTabLabel = (TABS.find((t) => t.key === validTab) || TABS[0]).label;

  useEffect(() => {
    if (params.region !== validRegion || params.tab !== validTab) {
      navigate(`/${validRegion}/${validTab}`, { replace: true });
    }
  }, [params.region, params.tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [validRegion, validTab]);

  return (
    <div className="iraf-root">
      <style>{FONT_IMPORT}</style>

      {/* نوار باریک بالا: خبر فوری (عراق/سوریه) + ساعت زنده بر اساس منطقه‌ی فعال */}
      <div style={{ background: '#0D0D6E' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '6px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {(validRegion === 'iraq' || validRegion === 'syria') && <BreakingNewsTicker />}
          </div>
          <LiveClock timeZone={clockInfo.timeZone} label={clockInfo.label} />
        </div>
      </div>

      {/* هدر اصلی: سفید، تا لوگو واضح دیده بشه */}
      <div style={{ background: '#FFFFFF', borderBottom: `2px solid ${C.gold}` }}>
        <div
          className="iraf-header-inner"
          style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '10px 20px', flexWrap: 'wrap' }}
        >
          <Link to={`/${allowedRegions[0].key}/live`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <img src={raviLogo} alt="راوی" style={{ height: 46, width: 'auto', display: 'block' }} />
            <div className="iraf-header-slogan" style={{ borderRight: `1.5px solid ${C.border}`, paddingRight: 12, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.gold, lineHeight: 1.5 }}>روایت زنده‌ی رویدادها</span>
              <span style={{ fontSize: 10.5, color: C.textFaint, lineHeight: 1.5 }}>هر خبر، همان لحظه</span>
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {allowedRegions.map((r) => (
                <Link
                  key={r.key}
                  to={`/${r.key}/live`}
                  style={{
                    background: validRegion === r.key ? C.gold : 'transparent',
                    color: validRegion === r.key ? '#FFFFFF' : C.gold,
                    border: `1px solid ${validRegion === r.key ? C.gold : C.border}`,
                    borderRadius: 8, padding: '8px 15px', fontSize: 13, fontWeight: 700,
                    textDecoration: 'none', transition: 'all 0.15s ease',
                  }}
                >
                  {r.label}
                </Link>
              ))}
            </nav>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderRight: `1.5px solid ${C.border}`, paddingRight: 10, marginRight: 2 }}>
              {isAdmin && (
                <Link to="/admin/users" className="iraf-refresh-btn" style={{ textDecoration: 'none' }}>
                  <Users size={13} /> کاربران
                </Link>
              )}
              <button className="iraf-refresh-btn" onClick={onLogout}>
                <LogOut size={13} /> خروج
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="iraf-layout iraf-scroll" style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px 60px' }}>
        <button
          type="button"
          className="iraf-mobile-menu-btn"
          onClick={() => setMobileMenuOpen((v) => !v)}
        >
          {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          {mobileMenuOpen ? 'بستن منو' : `منو · ${activeTabLabel}`}
        </button>

        <aside className={`iraf-sidebar ${mobileMenuOpen ? 'iraf-mobile-open' : ''}`}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.key}
                to={`/${validRegion}/${tab.key}`}
                className={`iraf-side-btn ${validTab === tab.key ? 'active' : ''}`}
              >
                <Icon size={16} />
                {tab.label}
              </Link>
            );
          })}
        </aside>

        <main style={{ flex: 1, minWidth: 0 }}>
          {validTab === 'live' && <LiveTab region={validRegion} />}
          {validTab === 'wordcloud' && <WordCloudTab region={validRegion} />}
          {validTab === 'archive' && <ArchiveTab region={validRegion} />}
          {validTab === 'psyop' && <PsyopTab region={validRegion} />}
          {validTab === 'infographic' && <InfographicTab region={validRegion} />}
        </main>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   ریشه‌ی اپلیکیشن — دروازه‌ی احراز هویت + مسیریابی
--------------------------------------------------------------------- */
export default function App() {
  const [authState, setAuthState] = useState({ loading: true, user: null });

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthState({ loading: false, user: null });
      return;
    }
    authFetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setAuthState({ loading: false, user: { username: data.username, role: data.role, region: data.region } });
        } else {
          clearToken();
          setAuthState({ loading: false, user: null });
        }
      })
      .catch(() => {
        clearToken();
        setAuthState({ loading: false, user: null });
      });
  }, []);

  const handleLoggedIn = (user) => setAuthState({ loading: false, user });

  const handleLogout = async () => {
    try { await authFetch('/api/auth/logout', { method: 'POST' }); } catch { /* بی‌خیال، هرحالت clearToken انجام می‌شه */ }
    clearToken();
    setAuthState({ loading: false, user: null });
  };

  if (authState.loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={26} style={{ animation: 'iraf-spin 1s linear infinite', color: C.gold }} />
      </div>
    );
  }

  if (!authState.user) {
    return <LoginPage onLoggedIn={handleLoggedIn} />;
  }

  const homeRegion = authState.user.role === 'admin' ? 'iraq' : authState.user.region;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={`/${homeRegion}/live`} replace />} />
        <Route
          path="/admin/users"
          element={authState.user.role === 'admin' ? <AdminUsersPage user={authState.user} onLogout={handleLogout} /> : <Navigate to="/" replace />}
        />
        <Route path="/:region" element={<RegionPage user={authState.user} onLogout={handleLogout} />} />
        <Route path="/:region/:tab" element={<RegionPage user={authState.user} onLogout={handleLogout} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
