// نقطه‌ی ورود اصلی Worker.
// درخواست‌های /api/* رو خودمون هندل می‌کنیم و بقیه رو به فایل‌های استاتیک (dist) می‌سپاریم.
// دیگه هیچ فیلتر هشتگ یا زبانی روی پست‌های ورودی اعمال نمی‌شه — هرچی از هر کانالی
// که ربات توش ادمینه بیاد، مستقیم ذخیره و تو «پوشش زنده اخبار» نمایش داده می‌شه.
// گزارش «عملیات روانی» هم خودکار/زمان‌بندی‌شده نیست — فقط با کلیک دکمه‌ی «تولید گزارش»
// تو خودِ سایت ساخته می‌شه، و بازه‌ش «از نیمه‌شب امروز (وقت عراق) تا همین لحظه» است.

const KV_KEY = 'posts';
const MAX_STORED_POSTS = 5000; // سقف فنی برای جلوگیری از رشد بی‌رویه‌ی KV؛ عملاً نامحدود

// چهار منطقه: عراق از قبل کلیدهای خودش رو داره (بدون تغییر، برای سازگاری با داده‌ی قدیمی)،
// بقیه‌ی مناطق کلید جدا با پیشوند منطقه می‌گیرن — تا وقتی کانالی وصل نشده، همیشه خالی برمی‌گردن.
const VALID_REGIONS = ['iraq', 'syria', 'usa', 'europe', 'latam'];

function normalizeRegion(region) {
  return VALID_REGIONS.includes(region) ? region : 'iraq';
}

function postsKey(region) {
  return region === 'iraq' ? KV_KEY : `posts:${region}`;
}

function psyopLatestKey(region) {
  return region === 'iraq' ? 'psyop_report_latest' : `psyop_report_latest:${region}`;
}

function psyopHistoryKey(region) {
  return region === 'iraq' ? 'psyop_report_history' : `psyop_report_history:${region}`;
}

function psyopLastGenKey(region) {
  return region === 'iraq' ? 'psyop_report_last_generated_at' : `psyop_report_last_generated_at:${region}`;
}

// «خبر فوری الجزیره» یه کانال عمومیه که ما ادمینش نیستیم، پس به‌جای وبهوک،
// از صفحه‌ی پیش‌نمایش عمومی تلگرام (t.me/s/...) می‌خونیمش — این صفحه برای هر
// کانال عمومی بدون نیاز به هیچ دسترسی خاصی در دسترسه.
const BREAKING_NEWS_CHANNEL = 'aljazeeraBrk';
const BREAKING_NEWS_CACHE_KEY = 'breaking_news_cache';
const BREAKING_NEWS_CACHE_MS = 3 * 60 * 1000; // ۳ دقیقه کش، تا هم تلگرام هم API دیپ‌سیک زیاد صدا زده نشن
const MAX_BREAKING_NEWS = 8;

const STOPWORDS = new Set([
  'و', 'در', 'به', 'از', 'که', 'این', 'را', 'با', 'است', 'برای', 'آن', 'یک', 'هم', 'تا', 'یا',
  'های', 'شد', 'شده', 'کرد', 'می', 'کند', 'ها', 'اما', 'نیز', 'هر', 'بر', 'بود', 'باشد', 'دارد',
  'داشت', 'او', 'ما', 'شما', 'آنها', 'چه', 'چون', 'اگر', 'پس', 'بی', 'بین', 'روی', 'زیر', 'چند',
  'همه', 'دیگر', 'خود', 'کنند', 'کرده', 'گفت', 'گفته', 'بعد', 'قبل', 'هنوز', 'فقط', 'باید',
  'نباید', 'کنیم', 'شود', 'ولی', 'یعنی', 'خواهد', 'کنید', 'شدند', 'کردند', 'کنیم', 'ایم', 'اند',
]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ---------- مسیرهای عمومی (بدون نیاز به ورود) ----------
    if (path === '/api/auth/login' && request.method === 'POST') {
      return handleLogin(request, env);
    }
    if (path === '/api/auth/bootstrap-admin' && request.method === 'POST') {
      return handleBootstrapAdmin(request, env);
    }

    // ---------- بقیه‌ی مسیرهای /api/* نیاز به ورود دارن ----------
    if (path.startsWith('/api/')) {
      const session = await getSession(request, env);
      if (!session) {
        return jsonResp({ ok: false, error: 'لطفاً ابتدا وارد شوید.' }, 401);
      }

      if (path === '/api/auth/logout' && request.method === 'POST') return handleLogout(request, env);
      if (path === '/api/auth/me' && request.method === 'GET') return handleMe(session);

      if (path === '/api/admin/users' && request.method === 'GET') return handleListUsers(session, env);
      if (path === '/api/admin/users' && request.method === 'POST') return handleCreateUser(request, session, env);
      if (path === '/api/admin/users' && request.method === 'DELETE') return handleDeleteUser(request, session, env);

      // کاربر «منطقه‌ای» فقط به منطقه‌ی خودش دسترسی داره، صرف‌نظر از چیزی که تو URL بخواد
      const requestedRegion = normalizeRegion(url.searchParams.get('region'));
      const region = session.role === 'admin' ? requestedRegion : (session.region || 'iraq');

      if (path === '/api/telegram-posts' && request.method === 'GET') return handlePosts(env, region);
      if (path === '/api/archive' && request.method === 'GET') return handleArchive(request, env, region);
      if (path === '/api/psyop-report' && request.method === 'GET') return handlePsyopReportGet(env, region);
      if (path === '/api/psyop-report/generate' && request.method === 'POST') return handlePsyopReportGenerate(request, env, region);
      if (path === '/api/breaking-news' && request.method === 'GET') return handleBreakingNewsGet(env);
      if (path === '/api/admin/clear-posts' && request.method === 'POST') return handleClearPosts(env, region);
      if (path === '/api/scenario/generate' && request.method === 'POST') return handleScenarioGenerate(request, env);
      if (path === '/api/caption/generate' && request.method === 'POST') return handleCaptionGenerate(request, env);
      if (path === '/api/wordcloud' && request.method === 'GET') return handleWordCloud(env, region);
      if (path === '/api/youtube-videos' && request.method === 'GET') return handleYoutubeVideos(env, region);

      return jsonResp({ ok: false, error: 'مسیر یافت نشد.' }, 404);
    }

    // هر درخواست دیگه‌ای -> فایل‌های استاتیک ساخته‌شده توسط Vite (پوشه‌ی dist)
    return env.ASSETS.fetch(request);
  },
};

/* -------------------------------------------------------------------
   احراز هویت و مدیریت کاربران
------------------------------------------------------------------- */
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // ۳۰ روز

function jsonResp(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

// هش‌کردن رمز عبور با PBKDF2 (Web Crypto API که تو Cloudflare Workers هم در دسترسه)
async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return { hash: bytesToHex(new Uint8Array(bits)), salt: bytesToHex(salt) };
}

async function verifyPassword(password, saltHex, expectedHashHex) {
  const { hash } = await hashPassword(password, saltHex);
  return hash === expectedHashHex;
}

async function getSession(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const raw = await env.POSTS.get(`session:${token}`);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    session.token = token;
    return session;
  } catch {
    return null;
  }
}

async function handleLogin(request, env) {
  let body;
  try { body = await request.json(); } catch { return jsonResp({ ok: false, error: 'بدنه‌ی درخواست نامعتبر است.' }, 400); }

  const username = (body.username || '').trim();
  const password = body.password || '';
  if (!username || !password) return jsonResp({ ok: false, error: 'نام‌کاربری و رمز عبور را وارد کنید.' }, 400);

  const raw = await env.POSTS.get(`user:${username}`);
  if (!raw) return jsonResp({ ok: false, error: 'نام‌کاربری یا رمز عبور اشتباه است.' }, 401);

  const user = JSON.parse(raw);
  const valid = await verifyPassword(password, user.salt, user.hash);
  if (!valid) return jsonResp({ ok: false, error: 'نام‌کاربری یا رمز عبور اشتباه است.' }, 401);

  const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  await env.POSTS.put(
    `session:${token}`,
    JSON.stringify({ username: user.username, role: user.role, region: user.region || null }),
    { expirationTtl: SESSION_TTL_SECONDS }
  );

  return jsonResp({ ok: true, token, username: user.username, role: user.role, region: user.region || null });
}

async function handleLogout(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) await env.POSTS.delete(`session:${token}`);
  return jsonResp({ ok: true });
}

function handleMe(session) {
  return jsonResp({ ok: true, username: session.username, role: session.role, region: session.region || null });
}

// ساخت اولین حساب مدیر — فقط یک‌بار قابل‌استفاده‌ست (اگه مدیری از قبل وجود داشته باشه رد می‌شه)
// و با WEBHOOK_SECRET محافظت می‌شه، نه با session (چون اولین ورودِ به سیستمه).
async function handleBootstrapAdmin(request, env) {
  const secretHeader = request.headers.get('X-Setup-Secret');
  if (!env.WEBHOOK_SECRET || secretHeader !== env.WEBHOOK_SECRET) {
    return jsonResp({ ok: false, error: 'رمز راه‌اندازی نادرست است.' }, 401);
  }

  const list = await env.POSTS.list({ prefix: 'user:' });
  for (const k of list.keys) {
    const raw = await env.POSTS.get(k.name);
    if (raw) {
      const u = JSON.parse(raw);
      if (u.role === 'admin') return jsonResp({ ok: false, error: 'یک حساب مدیر از قبل وجود دارد.' }, 400);
    }
  }

  let body;
  try { body = await request.json(); } catch { return jsonResp({ ok: false, error: 'بدنه‌ی درخواست نامعتبر است.' }, 400); }
  const username = (body.username || '').trim();
  const password = body.password || '';
  if (!username || !password) return jsonResp({ ok: false, error: 'نام‌کاربری و رمز عبور را وارد کنید.' }, 400);

  const { hash, salt } = await hashPassword(password);
  await env.POSTS.put(`user:${username}`, JSON.stringify({ username, hash, salt, role: 'admin', region: null }));

  return jsonResp({ ok: true });
}

async function handleListUsers(session, env) {
  if (session.role !== 'admin') return jsonResp({ ok: false, error: 'دسترسی ندارید.' }, 403);

  const list = await env.POSTS.list({ prefix: 'user:' });
  const users = [];
  for (const k of list.keys) {
    const raw = await env.POSTS.get(k.name);
    if (raw) {
      const u = JSON.parse(raw);
      users.push({ username: u.username, role: u.role, region: u.region || null });
    }
  }
  users.sort((a, b) => a.username.localeCompare(b.username));
  return jsonResp({ ok: true, users });
}

async function handleCreateUser(request, session, env) {
  if (session.role !== 'admin') return jsonResp({ ok: false, error: 'دسترسی ندارید.' }, 403);

  let body;
  try { body = await request.json(); } catch { return jsonResp({ ok: false, error: 'بدنه‌ی درخواست نامعتبر است.' }, 400); }

  const username = (body.username || '').trim();
  const password = body.password || '';
  const role = body.role === 'admin' ? 'admin' : 'region';
  const region = role === 'region' ? normalizeRegion(body.region) : null;

  if (!username || !password) return jsonResp({ ok: false, error: 'نام‌کاربری و رمز عبور الزامی است.' }, 400);
  if (password.length < 6) return jsonResp({ ok: false, error: 'رمز عبور باید حداقل ۶ کاراکتر باشد.' }, 400);

  const existing = await env.POSTS.get(`user:${username}`);
  if (existing) return jsonResp({ ok: false, error: 'این نام‌کاربری قبلاً استفاده شده است.' }, 400);

  const { hash, salt } = await hashPassword(password);
  await env.POSTS.put(`user:${username}`, JSON.stringify({ username, hash, salt, role, region }));

  return jsonResp({ ok: true });
}

async function handleDeleteUser(request, session, env) {
  if (session.role !== 'admin') return jsonResp({ ok: false, error: 'دسترسی ندارید.' }, 403);

  const url = new URL(request.url);
  const username = url.searchParams.get('username');
  if (!username) return jsonResp({ ok: false, error: 'نام‌کاربری مشخص نشده.' }, 400);
  if (username === session.username) return jsonResp({ ok: false, error: 'نمی‌توانید حساب خودتان را حذف کنید.' }, 400);

  await env.POSTS.delete(`user:${username}`);
  return jsonResp({ ok: true });
}

/* -------------------------------------------------------------------
   نوار «خبر فوری» — از صفحه‌ی عمومی پیش‌نمایش تلگرام می‌خونه، به فارسی
   ترجمه می‌کنه (با دیپ‌سیک)، و چند دقیقه کش می‌کنه.
------------------------------------------------------------------- */
async function handleBreakingNewsGet(env) {
  const now = Date.now();

  const cachedRaw = await env.POSTS.get(BREAKING_NEWS_CACHE_KEY);
  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw);
      if (cached.fetchedAt && now - cached.fetchedAt < BREAKING_NEWS_CACHE_MS) {
        return new Response(JSON.stringify({ items: cached.items }), {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      }
    } catch {
      // کش خراب بود، رد می‌شیم و از نو می‌سازیم
    }
  }

  try {
    const items = await fetchAndTranslateBreakingNews(env);
    await env.POSTS.put(BREAKING_NEWS_CACHE_KEY, JSON.stringify({ fetchedAt: now, items }));
    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    // اگه گرفتن نسخه‌ی جدید خطا داد ولی کش قدیمی داشتیم، همون رو برگردون (بهتر از خالی)
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw);
        return new Response(JSON.stringify({ items: cached.items }), {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      } catch {
        // ادامه به پاسخ خالی زیر
      }
    }
    return new Response(JSON.stringify({ items: [], error: e.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripHtmlTags(html) {
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim()
  );
}

async function fetchAndTranslateBreakingNews(env) {
  const res = await fetch(`https://t.me/s/${BREAKING_NEWS_CHANNEL}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RaviBot/1.0)' },
  });
  if (!res.ok) throw new Error(`دریافت صفحه‌ی تلگرام با خطای ${res.status} مواجه شد`);
  const html = await res.text();

  const chunks = html.split('class="tgme_widget_message_wrap').slice(1);
  const raw = [];

  for (const chunk of chunks) {
    const postMatch = chunk.match(/data-post="([^"]+)"/);
    const textMatch = chunk.match(/class="tgme_widget_message_text js-message_text"[^>]*>([\s\S]*?)<\/div>/);
    const timeMatch = chunk.match(/<time datetime="([^"]+)"/);
    if (!postMatch || !textMatch) continue;

    const text = stripHtmlTags(textMatch[1]);
    if (!text) continue;

    raw.push({
      id: postMatch[1],
      link: `https://t.me/${postMatch[1]}`,
      originalText: text,
      date: timeMatch ? new Date(timeMatch[1]).getTime() : Date.now(),
    });
  }

  // جدیدترین‌ها آخر صفحه‌ان
  raw.reverse();
  const latest = raw.slice(0, MAX_BREAKING_NEWS);

  if (latest.length === 0) return [];

  const translations = await translateBatchToPersian(env, latest.map((it) => it.originalText));

  return latest.map((it, i) => ({
    id: it.id,
    link: it.link,
    date: it.date,
    text: translations[i] || it.originalText,
  }));
}

// ترجمه‌ی دسته‌ای (یک تماس API برای چند خبر، برای سرعت و صرفه‌جویی)
async function translateBatchToPersian(env, texts) {
  if (!env.DEEPSEEK_API_KEY) return texts;
  if (texts.length === 0) return [];

  const numbered = texts.map((t, i) => `${i + 1}. ${safeTruncate(t, 500)}`).join('\n');
  const prompt = `متن‌های زیر خبرهای عربی هستند. هرکدام را به فارسیِ روان و خبری ترجمه کن.
فقط یک آرایه‌ی JSON از رشته‌ها برگردان، دقیقاً به همان ترتیب و همان تعداد ورودی، بدون هیچ توضیح یا متن اضافه.

${numbered}`;

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'تو فقط و فقط یک آرایه‌ی JSON از رشته‌های ترجمه‌شده برمی‌گردانی، بدون هیچ متن اضافه.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    const rawBody = await res.text();
    if (!res.ok) return texts;

    let data;
    try { data = JSON.parse(rawBody); } catch { return texts; }

    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) return texts;

    const cleaned = stripLoneSurrogates(content.replace(/```json/g, '').replace(/```/g, '').trim());
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed) && parsed.length === texts.length) return parsed;
    return texts;
  } catch {
    return texts;
  }
}


// پاک‌کردن کامل اخبار ذخیره‌شده (پوشش زنده + آرشیو، چون هر دو از همین کلید می‌خونن).
// عملی غیرقابل‌بازگشته، برای همین با همون WEBHOOK_SECRET محافظت می‌شه
// و کلید رو تو خودِ مرورگر ذخیره نمی‌کنیم — هر بار باید واردش کنی.
// دیگه نیازی به رمز جدا نیست — همین که کاربر وارد شده و به این منطقه دسترسی داره کافیه
// (این چک‌ها تو خودِ fetch() قبل از رسیدن به اینجا انجام می‌شه).
async function handleClearPosts(env, region) {
  await env.POSTS.delete(postsKey(region));
  return jsonResp({ ok: true });
}

/* -------------------------------------------------------------------
   خوندن کانال‌های عمومی از صفحه‌ی پیش‌نمایش عمومی تلگرام (بدون نیاز به ربات/ادمین).
   فقط متن پیام‌ها استخراج می‌شه، بدون عکس.
------------------------------------------------------------------- */
const SCRAPED_CHANNELS_BY_REGION = {
  iraq: 'Pulse0fIraq',
  syria: 'SyriaMonitoring',
};
const SCRAPE_INTERVAL_MS = 3 * 60 * 1000; // حداکثر هر ۳ دقیقه یک بار اسکرپ می‌شه

async function scrapeChannelPosts(channelUsername) {
  const res = await fetch(`https://t.me/s/${channelUsername}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RaviBot/1.0)' },
  });
  if (!res.ok) throw new Error(`دریافت صفحه‌ی ${channelUsername} با خطای ${res.status} مواجه شد`);
  const html = await res.text();

  const chunks = html.split('class="tgme_widget_message_wrap').slice(1);
  const posts = [];

  for (const chunk of chunks) {
    const postMatch = chunk.match(/data-post="([^"]+)"/);
    if (!postMatch) continue;

    const textMatch = chunk.match(/class="tgme_widget_message_text js-message_text"[^>]*>([\s\S]*?)<\/div>/);
    const timeMatch = chunk.match(/<time datetime="([^"]+)"/);

    const text = textMatch ? stripHtmlTags(textMatch[1]) : '';
    if (!text) continue;

    const messageIdStr = postMatch[1].split('/')[1];

    posts.push({
      id: postMatch[1],
      messageId: parseInt(messageIdStr, 10) || 0,
      text,
      date: timeMatch ? new Date(timeMatch[1]).getTime() : Date.now(),
      photoFileId: null,
      photoUrl: null,
      link: `https://t.me/${postMatch[1]}`,
    });
  }

  return posts;
}

async function maybeScrapeChannelForRegion(env, region) {
  const channelUsername = SCRAPED_CHANNELS_BY_REGION[region];
  if (!channelUsername) return;

  const lastScrapeKey = `scrape_last_at:${region}`;
  const lastRaw = await env.POSTS.get(lastScrapeKey);
  const last = lastRaw ? parseInt(lastRaw, 10) : 0;
  const now = Date.now();
  if (now - last < SCRAPE_INTERVAL_MS) return;

  // فوری ثبت می‌کنیم تا درخواست‌های هم‌زمان دیگه دوباره اسکرپ نکنن
  await env.POSTS.put(lastScrapeKey, String(now));

  try {
    const scraped = await scrapeChannelPosts(channelUsername);
    if (scraped.length === 0) return;

    const key = postsKey(region);
    const existingRaw = await env.POSTS.get(key);
    let list = existingRaw ? JSON.parse(existingRaw) : [];

    for (const post of scraped) {
      const idx = list.findIndex((p) => p.id === post.id);
      if (idx >= 0) list[idx] = post;
      else list.unshift(post);
    }

    list.sort((a, b) => b.date - a.date);
    list = list.slice(0, MAX_STORED_POSTS);
    await env.POSTS.put(key, JSON.stringify(list));
  } catch {
    // اگه اسکرپ خطا داد، بی‌سروصدا رد می‌شیم؛ نوبت بعدی دوباره امتحان می‌شه
  }
}

/* -------------------------------------------------------------------
   تب «پوشش زنده اخبار» - همه‌ی پست‌ها، بدون محدودیت نمایشی
------------------------------------------------------------------- */
async function handlePosts(env, region) {
  await maybeScrapeChannelForRegion(env, region);

  const raw = await env.POSTS.get(postsKey(region));
  let allPosts = [];
  if (raw) {
    try { allPosts = JSON.parse(raw); } catch { allPosts = []; }
  }

  // فقط اخبار «امروز» (به وقت عراق) تو پوشش زنده نمایش داده می‌شه؛ بقیه از تب آرشیو در دسترسه.
  const now = Date.now();
  const todayStart = getIraqDayStartMs(now);
  const posts = allPosts.filter((p) => p.date >= todayStart && p.date <= now);

  return new Response(JSON.stringify({ posts }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/* -------------------------------------------------------------------
   تب «آرشیو مطالب» - فیلتر بر اساس تاریخ (به وقت عراق، UTC+3)
------------------------------------------------------------------- */
function toIraqDateString(dateMs) {
  const iraqMs = dateMs + 3 * 60 * 60 * 1000;
  const d = new Date(iraqMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// آغاز روز جاری (ساعت ۰۰:۰۰) به وقت عراق (UTC+3، بدون تغییر ساعت تابستانی)، به میلی‌ثانیه‌ی UTC
function getIraqDayStartMs(nowMs) {
  const iraqMs = nowMs + 3 * 60 * 60 * 1000;
  const d = new Date(iraqMs);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  return Date.UTC(y, m, day, 0, 0, 0) - 3 * 60 * 60 * 1000;
}

async function handleArchive(request, env, region) {
  await maybeScrapeChannelForRegion(env, region);

  const url = new URL(request.url);
  const dateParam = url.searchParams.get('date'); // فرمت مورد انتظار: YYYY-MM-DD

  if (!dateParam) {
    return new Response(JSON.stringify({ posts: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const raw = await env.POSTS.get(postsKey(region));
  const allPosts = raw ? JSON.parse(raw) : [];
  const matched = allPosts.filter((p) => toIraqDateString(p.date) === dateParam);

  return new Response(JSON.stringify({ posts: matched }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/* -------------------------------------------------------------------
   تب «عملیات روانی» - گزارش با کلیک دکمه (بدون خودکارسازی)
------------------------------------------------------------------- */
async function handlePsyopReportGet(env, region) {
  const raw = await env.POSTS.get(psyopLatestKey(region));
  const report = raw ? JSON.parse(raw) : null;

  return new Response(JSON.stringify({ report }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

// این endpoint از خودِ سایت (با کلیک دکمه‌ی «تولید گزارش») صدا زده می‌شه، پس عمداً
// نیازی به secret نداره (چون تو مرورگر قابل مشاهده می‌بود). برای جلوگیری از سوءاستفاده
// (مثلاً کلیک پشت‌سرهم که هزینه‌ی API دیپ‌سیک رو بالا ببره)، یه فاصله‌ی زمانی حداقلی می‌ذاریم.
const GENERATE_COOLDOWN_MS = 60 * 1000; // یک دقیقه

async function handlePsyopReportGenerate(request, env, region) {
  const now = Date.now();
  const lastRaw = await env.POSTS.get(psyopLastGenKey(region));
  const last = lastRaw ? parseInt(lastRaw, 10) : 0;

  if (now - last < GENERATE_COOLDOWN_MS) {
    const waitSec = Math.ceil((GENERATE_COOLDOWN_MS - (now - last)) / 1000);
    return new Response(JSON.stringify({ ok: false, error: `لطفاً ${waitSec} ثانیه‌ی دیگر دوباره تلاش کنید.` }), {
      status: 429,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  await env.POSTS.put(psyopLastGenKey(region), String(now));

  const report = await generatePsyopReport(env, region);
  return new Response(JSON.stringify({ ok: true, report }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function generatePsyopReport(env, region) {
  const raw = await env.POSTS.get(postsKey(region));
  const allPosts = raw ? JSON.parse(raw) : [];

  const now = Date.now();
  const periodStart = getIraqDayStartMs(now); // نیمه‌شب امروز به وقت عراق
  const periodPosts = allPosts.filter((p) => p.date >= periodStart && p.date <= now);

  const topWords = computeTopWords(periodPosts);
  const ai = await callDeepSeekReport(env, periodPosts);

  const report = {
    generatedAt: now,
    periodStart,
    periodEnd: now,
    newsCount: periodPosts.length,
    topWords,
    summary: ai.summary,
    techniques: ai.techniques,
    importantNews: ai.importantNews,
    top5News: ai.top5News,
  };

  await env.POSTS.put(psyopLatestKey(region), JSON.stringify(report));

  // یه تاریخچه‌ی کوتاه هم نگه می‌داریم (برای توسعه‌های بعدی)
  const historyRaw = await env.POSTS.get(psyopHistoryKey(region));
  let history = [];
  if (historyRaw) {
    try { history = JSON.parse(historyRaw); } catch { history = []; }
  }
  history.unshift({ generatedAt: now, newsCount: report.newsCount, summary: report.summary });
  history = history.slice(0, 30);
  await env.POSTS.put(psyopHistoryKey(region), JSON.stringify(history));

  return report;
}

// شمارش کلمات پرتکرار - محاسبه‌ی برنامه‌نویسی‌شده (نه با AI) برای دقت بیشتر.
// هشتگ‌ها و لینک‌ها حذف می‌شن و کلمات توقف (حروف اضافه و ربط رایج) هم حساب نمی‌شن.
function computeTopWords(posts, limit = 15) {
  const freq = new Map();

  for (const p of posts) {
    const text = p.text || '';
    const withoutHashtags = text.replace(/#\S+/g, ' ');
    const withoutUrls = withoutHashtags.replace(/https?:\/\/\S+/g, ' ');
    const words = withoutUrls.match(/[\u0600-\u06FF]{2,}/g) || [];

    for (const raw of words) {
      const w = raw.trim();
      if (!w || STOPWORDS.has(w)) continue;
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

// کوتاه‌کردن امن متن: برخلاف String.slice، از وسط یک ایموجی یا کاراکتر دوبایتی نمی‌بره
function safeTruncate(str, maxLen) {
  if (!str) return '';
  const chars = Array.from(str);
  if (chars.length <= maxLen) return str;
  return chars.slice(0, maxLen).join('');
}

// حذف کاراکترهای surrogate تنها (نیمه‌ایموجی‌های خراب) که باعث خرابی JSON موقع ارسال به API می‌شن
function stripLoneSurrogates(str) {
  return str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, (m) =>
    m.length > 1 ? m[0] : ''
  );
}

// بخش کیفی گزارش (تکنیک‌های عملیات روانی، اخبار مهم، ۵ خبر برتر، خلاصه‌ی مدیریتی) با API دیپ‌سیک
async function callDeepSeekReport(env, posts) {
  if (!env.DEEPSEEK_API_KEY) {
    return {
      summary: 'کلید DEEPSEEK_API_KEY تنظیم نشده است. این گزارش بدون تحلیل هوش مصنوعی تولید شده.',
      techniques: [],
      importantNews: [],
      top5News: [],
    };
  }

  if (posts.length === 0) {
    return {
      summary: 'در این بازه‌ی زمانی هیچ پست جدیدی ثبت نشده است.',
      techniques: [],
      importantNews: [],
      top5News: [],
    };
  }

  const sample = stripLoneSurrogates(
    posts
      .slice(0, 150)
      .map((p, i) => `${i + 1}. ${safeTruncate(p.text || '', 400)}`)
      .join('\n')
  );

  const prompt = `تو یک تحلیلگر رسانه‌ای هستی. متن زیر مجموعه‌ای از پست‌های یک کانال خبری تلگرامی درباره‌ی مراسم اربعین است.
بر اساس این پست‌ها یک گزارش تحلیلی به زبان فارسی و فقط در قالب JSON خام (بدون هیچ توضیح اضافه، بدون markdown، بدون تیک‌بک‌کوت) با دقیقاً این ساختار تولید کن:

{
  "summary": "یک خلاصه‌ی مدیریتی در ۳ تا ۵ جمله درباره‌ی وضعیت کلی این بازه",
  "techniques": ["فهرست تکنیک‌های احتمالی عملیات روانی که در این پست‌ها مشاهده می‌شود، هرکدام با توضیح کوتاه"],
  "importantNews": ["مهم‌ترین اخبار و رویدادهایی که در این پست‌ها مطرح شده"],
  "top5News": ["دقیقاً ۵ خبر مهم این بازه، به‌ترتیب اهمیت"]
}

پست‌ها:
${sample}`;

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'تو فقط و فقط خروجی JSON معتبر تولید می‌کنی، بدون هیچ متن اضافه قبل یا بعدش.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    const rawBody = await res.text();

    if (!res.ok) {
      throw new Error(`دیپ‌سیک خطای ${res.status} برگرداند: ${rawBody.slice(0, 300)}`);
    }

    let data;
    try {
      data = JSON.parse(rawBody);
    } catch {
      throw new Error(`پاسخ دیپ‌سیک JSON معتبر نبود: ${rawBody.slice(0, 300)}`);
    }

    const raw = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!raw) throw new Error('پاسخ دیپ‌سیک ساختار مورد انتظار را نداشت: ' + rawBody.slice(0, 300));

    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      summary: parsed.summary || '',
      techniques: Array.isArray(parsed.techniques) ? parsed.techniques : [],
      importantNews: Array.isArray(parsed.importantNews) ? parsed.importantNews : [],
      top5News: Array.isArray(parsed.top5News) ? parsed.top5News : [],
    };
  } catch (e) {
    return {
      summary: 'خطا در تولید گزارش با دیپ‌سیک: ' + e.message,
      techniques: [],
      importantNews: [],
      top5News: [],
    };
  }
}

/* -------------------------------------------------------------------
   «ارسال به سناریو ساز» — از متن یک خبر، سناریو می‌سازه
------------------------------------------------------------------- */
const AI_TOOL_COOLDOWN_MS = 15 * 1000; // ۱۵ ثانیه، برای جلوگیری از کلیک پشت‌سرهم

const SCENARIO_FORMAT_LABELS = {
  poster: 'پوستر (تصویر ثابت همراه با متن)',
  photo_caption: 'عکس‌نوشته (تصویر همراه با یک نقل‌قول یا متن کوتاه روی آن)',
  video: 'ویدیوی کوتاه (مثل ریلز/شورت)',
  documentary: 'مستند بلند',
};

const LANGUAGE_LABELS = {
  fa: 'فارسی',
  en: 'انگلیسی',
  ar: 'عربی',
  es: 'اسپانیایی',
  fr: 'فرانسوی',
};

const ARABIC_DIALECT_LABELS = {
  iraqi: 'لهجه‌ی عراقی',
  levantine: 'لهجه‌ی شامی (سوریه، لبنان، فلسطین، اردن)',
  gulf: 'لهجه‌ی شبه‌جزیره‌ای (خلیجی)',
  egyptian: 'لهجه‌ی مصری',
  sudanese: 'لهجه‌ی سودانی',
};

const PLATFORM_LABELS = {
  twitter: 'ایکس (توییتر)',
  facebook: 'فیس‌بوک',
  instagram: 'اینستاگرام',
  telegram: 'تلگرام',
  youtube: 'یوتیوب',
};

function resolveLanguageInstruction(language, arabicDialect) {
  if (language === 'ar') {
    const dialectLabel = ARABIC_DIALECT_LABELS[arabicDialect];
    return `زبان عربی، به ${dialectLabel || 'عربی فصیح رسانه‌ای'}`;
  }
  return LANGUAGE_LABELS[language] || LANGUAGE_LABELS.fa;
}

function clampCount(value) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(n, 1), 5);
}

async function checkAiToolCooldown(env, cooldownKvKey) {
  const now = Date.now();
  const lastRaw = await env.POSTS.get(cooldownKvKey);
  const last = lastRaw ? parseInt(lastRaw, 10) : 0;
  if (now - last < AI_TOOL_COOLDOWN_MS) {
    const waitSec = Math.ceil((AI_TOOL_COOLDOWN_MS - (now - last)) / 1000);
    return waitSec;
  }
  await env.POSTS.put(cooldownKvKey, String(now));
  return 0;
}

async function handleScenarioGenerate(request, env) {
  const waitSec = await checkAiToolCooldown(env, 'scenario_last_call');
  if (waitSec > 0) {
    return new Response(JSON.stringify({ ok: false, error: `لطفاً ${waitSec} ثانیه‌ی دیگر دوباره تلاش کنید.` }), {
      status: 429,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  let body;
  try { body = await request.json(); } catch { body = {}; }
  const text = (body.text || '').toString();
  if (!text.trim()) {
    return new Response(JSON.stringify({ ok: false, error: 'متن خبر خالی است.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
  if (!env.DEEPSEEK_API_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'کلید DEEPSEEK_API_KEY تنظیم نشده است.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const format = SCENARIO_FORMAT_LABELS[body.format] ? body.format : 'video';
  const formatLabel = SCENARIO_FORMAT_LABELS[format];
  const language = LANGUAGE_LABELS[body.language] ? body.language : 'fa';
  const languageInstruction = resolveLanguageInstruction(language, body.arabicDialect);
  const count = clampCount(body.count);
  const instructions = (body.instructions || '').toString().trim();

  const formatGuide = {
    poster: 'هر نسخه شامل دقیقاً یک بخش («پوستر») باشد: تیتر اصلی کوتاه در قسمت text، و توصیف دقیق ترکیب‌بندی بصری پوستر در قسمت visual. فیلد duration خالی بماند.',
    photo_caption: 'هر نسخه شامل یک یا دو بخش کوتاه («عکس‌نوشته») باشد: متن کوتاه و ضربتی برای روی تصویر در قسمت text، و پیشنهاد تصویر زمینه در قسمت visual. فیلد duration خالی بماند.',
    video: 'هر نسخه شامل ۳ تا ۶ بخش («شات») باشد؛ برای هرکدام مدت‌زمان تقریبی به ثانیه در duration (مثلاً «۵ ثانیه»)، متن گفتاری در text، و پیشنهاد تصویر/ویدیوی زمینه در visual.',
    documentary: 'هر نسخه شامل ۴ تا ۸ بخش (مثل مقدمه، بدنه‌های موضوعی، نتیجه‌گیری) باشد؛ برای هرکدام مدت‌زمان تقریبی در duration (مثلاً «۱ دقیقه»)، متن روایت در text، و پیشنهاد تصویر/فوتیج در visual.',
  };

  const prompt = `متن خبر زیر را در نظر بگیر. ${count} نسخه‌ی متفاوت سناریو برای تولید یک «${formatLabel}» بساز.
زبان خروجی: ${languageInstruction}.
${formatGuide[format]}
${instructions ? `دستورالعمل/سیاست اضافی از طرف کاربر که باید رعایت شود: «${instructions}»` : ''}

خروجی را فقط و فقط به‌صورت JSON خام (بدون هیچ توضیح یا markdown اضافه) با دقیقاً این ساختار بده:
{
  "variants": [
    {
      "title": "عنوان کوتاه این نسخه",
      "overview": "خلاصه‌ی یک یا دو جمله‌ای از رویکرد این نسخه",
      "sections": [
        { "label": "برچسب این بخش (مثلاً «شات ۱» یا «مقدمه» یا «پوستر»)", "duration": "مدت‌زمان تقریبی به‌صورت رشته، یا رشته‌ی خالی اگر موضوعیت ندارد", "text": "متن گفتاری یا نوشتاری این بخش", "visual": "پیشنهاد تصویر/ویدیوی زمینه‌ی این بخش" }
      ]
    }
  ]
}

باید دقیقاً ${count} آیتم در آرایه‌ی variants باشد.

متن خبر:
${safeTruncate(text, 1500)}`;

  try {
    const result = await callDeepSeekJson(env, prompt, 'تو فقط و فقط خروجی JSON معتبر تولید می‌کنی، بدون هیچ متن اضافه.');
    return new Response(JSON.stringify({ ok: true, scenario: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}

/* -------------------------------------------------------------------
   «ارسال به کپشن ساز» — از متن یک خبر، کپشن مخصوص هر شبکه‌ی اجتماعی می‌سازه
------------------------------------------------------------------- */
async function handleCaptionGenerate(request, env) {
  const waitSec = await checkAiToolCooldown(env, 'caption_last_call');
  if (waitSec > 0) {
    return new Response(JSON.stringify({ ok: false, error: `لطفاً ${waitSec} ثانیه‌ی دیگر دوباره تلاش کنید.` }), {
      status: 429,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  let body;
  try { body = await request.json(); } catch { body = {}; }
  const text = (body.text || '').toString();
  if (!text.trim()) {
    return new Response(JSON.stringify({ ok: false, error: 'متن خبر خالی است.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
  if (!env.DEEPSEEK_API_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'کلید DEEPSEEK_API_KEY تنظیم نشده است.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const language = LANGUAGE_LABELS[body.language] ? body.language : 'fa';
  const languageInstruction = resolveLanguageInstruction(language, body.arabicDialect);
  const count = clampCount(body.count);
  const instructions = (body.instructions || '').toString().trim();

  const requestedPlatforms = Array.isArray(body.platforms) ? body.platforms.filter((p) => PLATFORM_LABELS[p]) : [];
  const platforms = requestedPlatforms.length > 0 ? requestedPlatforms : ['instagram'];

  const platformGuide = {
    twitter: 'کوتاه و مستقیم، حداکثر ۲۸۰ کاراکتر، با ۲ تا ۳ هشتگ',
    facebook: 'توضیح کامل‌تر و روایی‌تر با لحن گفت‌وگومحور، مناسب برای تعامل بیشتر',
    instagram: 'جذاب و کمی احساسی، با ایموجی مناسب و چند هشتگ پرکاربرد مرتبط',
    telegram: 'خلاصه‌ی خبری مستقیم و رسمی، مناسب یک کانال خبری، بدون نیاز به هشتگ زیاد',
    youtube: 'مناسب بخش توضیحات ویدیو: یک خط جذاب اول، سپس توضیح کمی بیشتر و چند هشتگ مرتبط',
  };

  const platformsList = platforms.map((p) => `- ${PLATFORM_LABELS[p]}: ${platformGuide[p]}`).join('\n');
  const jsonShapeExample = platforms.map((p) => `"${p}": ["...", "..."]`).join(', ');

  const prompt = `متن خبر زیر را در نظر بگیر. برای هرکدام از شبکه‌های اجتماعی زیر، دقیقاً ${count} نسخه‌ی متفاوت کپشن (متناسب با سبک همان شبکه، شامل هشتگ‌های مناسب در صورت لزوم) بساز:
${platformsList}

زبان خروجی: ${languageInstruction}.
${instructions ? `دستورالعمل/سیاست اضافی از طرف کاربر که باید رعایت شود: «${instructions}»` : ''}

خروجی را فقط و فقط به‌صورت JSON خام (بدون هیچ توضیح یا markdown اضافه) بده؛ برای هر پلتفرم یک آرایه‌ی دقیقاً ${count} عضوی از رشته (کپشن)، با دقیقاً این ساختار:
{ ${jsonShapeExample} }

متن خبر:
${safeTruncate(text, 1500)}`;

  try {
    const result = await callDeepSeekJson(env, prompt, 'تو فقط و فقط خروجی JSON معتبر تولید می‌کنی، بدون هیچ متن اضافه.');
    return new Response(JSON.stringify({ ok: true, captions: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}

// یه تابع مشترک برای فرستادن یه پرامپت به دیپ‌سیک و گرفتن جواب به‌صورت JSON پارس‌شده
async function callDeepSeekJson(env, userPrompt, systemPrompt) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
    }),
  });

  const rawBody = await res.text();
  if (!res.ok) throw new Error(`دیپ‌سیک خطای ${res.status} برگرداند: ${rawBody.slice(0, 300)}`);

  let data;
  try { data = JSON.parse(rawBody); } catch { throw new Error(`پاسخ دیپ‌سیک JSON معتبر نبود: ${rawBody.slice(0, 300)}`); }

  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) throw new Error('پاسخ دیپ‌سیک ساختار مورد انتظار را نداشت: ' + rawBody.slice(0, 300));

  const cleaned = stripLoneSurrogates(content.replace(/```json/g, '').replace(/```/g, '').trim());
  return JSON.parse(cleaned);
}

/* -------------------------------------------------------------------
   «ابر کلمات روز» — کاملاً محاسباتی، بدون AI، از اخبار امروز همون منطقه
------------------------------------------------------------------- */
/* -------------------------------------------------------------------
   «رصد یوتیوب» — جست‌وجوی کلیدواژه‌ی هر منطقه با YouTube Data API،
   نتیجه حداکثر هر ۲ ساعت یک‌بار تازه می‌شه (برای صرفه‌جویی در سهمیه‌ی رایگان API).
------------------------------------------------------------------- */
const YOUTUBE_CACHE_MS = 2 * 60 * 60 * 1000; // ۲ ساعت

// کلیدواژه‌ی هر منطقه، به زبان همون منطقه
const YOUTUBE_KEYWORDS_BY_REGION = {
  iraq: 'العراق أخبار',
  syria: 'سوريا أخبار',
  usa: 'US news today',
  europe: 'Europe news',
  latam: 'Latinoamérica noticias',
};

async function handleYoutubeVideos(env, region) {
  const cacheKey = `youtube_videos_cache:${region}`;
  const now = Date.now();

  const cachedRaw = await env.POSTS.get(cacheKey);
  let cached = null;
  if (cachedRaw) {
    try { cached = JSON.parse(cachedRaw); } catch { cached = null; }
  }

  if (cached && cached.fetchedAt && now - cached.fetchedAt < YOUTUBE_CACHE_MS) {
    return jsonResp({ videos: cached.videos, fetchedAt: cached.fetchedAt });
  }

  if (!env.YOUTUBE_API_KEY) {
    if (cached) return jsonResp({ videos: cached.videos, fetchedAt: cached.fetchedAt, error: 'کلید YOUTUBE_API_KEY تنظیم نشده است؛ نسخه‌ی قبلی نشون داده می‌شه.' });
    return jsonResp({ videos: [], error: 'کلید YOUTUBE_API_KEY تنظیم نشده است.' });
  }

  const keyword = YOUTUBE_KEYWORDS_BY_REGION[region] || YOUTUBE_KEYWORDS_BY_REGION.iraq;

  try {
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=date&maxResults=12&q=${encodeURIComponent(keyword)}&key=${env.YOUTUBE_API_KEY}`;
    const res = await fetch(apiUrl);
    const rawBody = await res.text();
    if (!res.ok) throw new Error(`یوتیوب خطای ${res.status} برگرداند: ${rawBody.slice(0, 300)}`);

    let data;
    try { data = JSON.parse(rawBody); } catch { throw new Error('پاسخ یوتیوب JSON معتبر نبود.'); }

    const videos = (data.items || [])
      .map((item) => {
        const snippet = item.snippet || {};
        const thumbs = snippet.thumbnails || {};
        return {
          videoId: item.id && item.id.videoId,
          title: decodeHtmlEntities(snippet.title || ''),
          channelTitle: decodeHtmlEntities(snippet.channelTitle || ''),
          publishedAt: snippet.publishedAt || null,
          thumbnail: (thumbs.medium || thumbs.default || {}).url || null,
        };
      })
      .filter((v) => v.videoId);

    await env.POSTS.put(cacheKey, JSON.stringify({ fetchedAt: now, videos }));

    return jsonResp({ videos, fetchedAt: now });
  } catch (e) {
    if (cached) return jsonResp({ videos: cached.videos, fetchedAt: cached.fetchedAt, error: e.message });
    return jsonResp({ videos: [], error: e.message });
  }
}

async function handleWordCloud(env, region) {
  const raw = await env.POSTS.get(postsKey(region));
  const allPosts = raw ? JSON.parse(raw) : [];

  const now = Date.now();
  const periodStart = getIraqDayStartMs(now);
  const todayPosts = allPosts.filter((p) => p.date >= periodStart && p.date <= now);

  const words = computeTopWords(todayPosts, 40);

  return new Response(JSON.stringify({ words, newsCount: todayPosts.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
