/**
 * FILE LOCATION: frontend/static/js/chatbot.js
 *
 * SkillBridge AI Assistant — Bridget (Rule-Based, Zero API Cost)
 * Reads live SKILLBRIDGE_DATA.workers and real bookings via API.
 * No external API needed — works completely offline.
 */

(function () {

  const BOT_NAME    = 'Bridget';
  const BOT_TAGLINE = 'Your SkillBridge Assistant';
  const PRIMARY     = '#6c8a3d';
  const DARK        = '#1a2717';

  function getBase() {
    return (typeof CONFIG !== 'undefined' && CONFIG.SERVER_BASE)
      ? CONFIG.SERVER_BASE : 'http://127.0.0.1:8000';
  }

  let isOpen     = false;
  let isTyping   = false;
  let booksCache = null;

  // ── STYLES ──────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('sb-cs')) return;
    const s = document.createElement('style');
    s.id = 'sb-cs';
    s.textContent = `
      #sb-bubble {
        position:fixed; bottom:28px; right:28px;
        width:56px; height:56px; border-radius:50%;
        background:${PRIMARY}; border:none; cursor:pointer;
        z-index:10001; display:flex; align-items:center; justify-content:center;
        box-shadow:0 4px 20px rgba(108,138,61,0.5);
        transition:transform .2s, box-shadow .2s;
      }
      #sb-bubble:hover { transform:scale(1.08); box-shadow:0 6px 28px rgba(108,138,61,.6); }
      #sb-bubble .sb-bi { display:flex; }
      #sb-bubble .sb-bc { display:none; color:#fff; font-size:18px; font-weight:700; }
      #sb-bubble.sb-on .sb-bi { display:none; }
      #sb-bubble.sb-on .sb-bc { display:flex; align-items:center; justify-content:center; }
      #sb-ndot {
        position:absolute; top:1px; right:1px;
        width:15px; height:15px; background:#ef4444;
        border-radius:50%; border:2px solid #fff;
        font-size:9px; color:#fff; font-weight:700;
        display:none; align-items:center; justify-content:center;
        animation:sb-np 2s infinite;
      }
      @keyframes sb-np { 0%,100%{transform:scale(1)} 50%{transform:scale(1.25)} }

      #sb-win {
        position:fixed; bottom:96px; right:28px;
        width:355px; height:510px; border-radius:18px;
        background:var(--card,#fff);
        border:1px solid var(--border,rgba(0,0,0,.1));
        box-shadow:0 20px 60px rgba(0,0,0,.16);
        z-index:10000; display:flex; flex-direction:column; overflow:hidden;
        transform:scale(.88) translateY(14px); opacity:0; pointer-events:none;
        transition:transform .25s cubic-bezier(.34,1.56,.64,1), opacity .2s;
        transform-origin:bottom right;
      }
      #sb-win.sb-on { transform:scale(1) translateY(0); opacity:1; pointer-events:all; }

      #sb-hdr {
        background:${DARK}; padding:13px 15px;
        display:flex; align-items:center; gap:10px; flex-shrink:0;
      }
      .sb-bav {
        width:36px; height:36px; border-radius:50%;
        background:${PRIMARY}; display:flex; align-items:center;
        justify-content:center; font-size:17px; flex-shrink:0;
        box-shadow:0 0 0 3px rgba(108,138,61,.3);
      }
      .sb-bn  { color:#fff; font-weight:700; font-size:13px; line-height:1.2; }
      .sb-bt  { color:rgba(255,255,255,.5); font-size:11px; }
      .sb-dot {
        width:8px; height:8px; background:#10b981; border-radius:50%;
        margin-left:auto; flex-shrink:0; box-shadow:0 0 6px #10b981;
        animation:sb-gl 2s infinite;
      }
      @keyframes sb-gl { 0%,100%{opacity:1} 50%{opacity:.35} }

      #sb-msgs {
        flex:1; overflow-y:auto; padding:13px;
        display:flex; flex-direction:column; gap:10px; scroll-behavior:smooth;
      }
      #sb-msgs::-webkit-scrollbar { width:3px; }
      #sb-msgs::-webkit-scrollbar-thumb { background:var(--border,rgba(0,0,0,.1)); border-radius:3px; }

      .sb-m { display:flex; gap:7px; align-items:flex-end; animation:sb-mi .2s ease; }
      @keyframes sb-mi { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
      .sb-m.sb-u { flex-direction:row-reverse; }

      .sb-av {
        width:25px; height:25px; border-radius:50%;
        background:${PRIMARY}; display:flex; align-items:center;
        justify-content:center; font-size:12px; flex-shrink:0; color:#fff;
      }
      .sb-av.sb-ua { background:#3b82f6; font-weight:700; font-size:11px; }

      .sb-bbl {
        max-width:80%; padding:8px 12px; border-radius:13px;
        font-size:13px; line-height:1.55; word-break:break-word;
        background:var(--surface,#f3f4f6); color:var(--text,#1a1a1a);
        border:1px solid var(--border,rgba(0,0,0,.06));
      }
      .sb-m.sb-b .sb-bbl { border-radius:13px 13px 13px 3px; }
      .sb-m.sb-u .sb-bbl {
        background:${PRIMARY}; color:#fff; border-color:transparent;
        border-radius:13px 13px 3px 13px;
      }

      .sb-wc {
        display:flex; align-items:center; gap:9px;
        background:var(--card,#fff);
        border:1.5px solid var(--border,rgba(0,0,0,.08));
        border-radius:11px; padding:8px 11px; margin-top:4px;
        cursor:pointer; text-decoration:none;
        transition:border-color .15s, transform .15s;
      }
      .sb-wc:hover { border-color:${PRIMARY}; transform:translateX(3px); }
      .sb-wc img { width:34px; height:34px; border-radius:50%; object-fit:cover; flex-shrink:0; }
      .sb-wn { font-weight:700; font-size:12px; color:var(--text,#1a1a1a); }
      .sb-wm { font-size:11px; color:var(--muted,#666); margin-top:1px; }
      .sb-wr { margin-left:auto; font-weight:700; font-size:12px; color:${PRIMARY}; flex-shrink:0; }

      .sb-tp {
        display:flex; gap:4px; padding:8px 12px;
        background:var(--surface,#f3f4f6); border-radius:13px 13px 13px 3px;
        border:1px solid var(--border,rgba(0,0,0,.06)); width:fit-content;
      }
      .sb-tp span {
        width:6px; height:6px; border-radius:50%;
        background:var(--muted,#999); animation:sb-bo 1.2s infinite;
      }
      .sb-tp span:nth-child(2){animation-delay:.18s}
      .sb-tp span:nth-child(3){animation-delay:.36s}
      @keyframes sb-bo { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }

      #sb-qr {
        padding:5px 13px 3px; display:flex; gap:5px;
        flex-wrap:wrap; flex-shrink:0; min-height:0;
      }
      .sb-ch {
        padding:5px 10px; border-radius:20px;
        border:1.5px solid ${PRIMARY}; background:transparent;
        color:${PRIMARY}; font-size:11px; font-weight:600;
        cursor:pointer; transition:all .15s; white-space:nowrap; font-family:inherit;
      }
      .sb-ch:hover { background:${PRIMARY}; color:#fff; }

      #sb-ftr {
        padding:9px 11px; border-top:1px solid var(--border,rgba(0,0,0,.08));
        display:flex; gap:7px; align-items:flex-end;
        flex-shrink:0; background:var(--card,#fff);
      }
      #sb-inp {
        flex:1; border:1.5px solid var(--border,rgba(0,0,0,.1));
        border-radius:9px; padding:8px 11px; font-size:13px;
        outline:none; resize:none; background:var(--card,#fff);
        color:var(--text,#1a1a1a); font-family:inherit;
        max-height:68px; line-height:1.4; transition:border-color .2s;
      }
      #sb-inp:focus { border-color:${PRIMARY}; }
      #sb-inp::placeholder { color:var(--muted,#aaa); }
      #sb-snd {
        width:34px; height:34px; border-radius:8px;
        background:${PRIMARY}; border:none; cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        flex-shrink:0; color:#fff; transition:filter .15s, transform .15s;
      }
      #sb-snd:hover    { filter:brightness(1.1); transform:scale(1.06); }
      #sb-snd:disabled { opacity:.4; cursor:not-allowed; transform:none; }

      @media(max-width:420px){
        #sb-win    { width:calc(100vw - 24px); right:12px; }
        #sb-bubble { right:12px; bottom:12px; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── BUILD DOM ────────────────────────────────────────────────
  function buildDOM() {
    const bubble = document.createElement('button');
    bubble.id = 'sb-bubble';
    bubble.setAttribute('aria-label', 'Open AI Assistant');
    bubble.innerHTML = `
      <span class="sb-bi">
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </span>
      <span class="sb-bc">✕</span>
      <div id="sb-ndot">!</div>`;

    const win = document.createElement('div');
    win.id = 'sb-win';
    win.innerHTML = `
      <div id="sb-hdr">
        <div class="sb-bav">🤖</div>
        <div>
          <div class="sb-bn">${BOT_NAME}</div>
          <div class="sb-bt">${BOT_TAGLINE}</div>
        </div>
        <div class="sb-dot"></div>
      </div>
      <div id="sb-msgs"></div>
      <div id="sb-qr"></div>
      <div id="sb-ftr">
        <textarea id="sb-inp" rows="1" placeholder="Ask me anything..." maxlength="200"></textarea>
        <button id="sb-snd" aria-label="Send">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>`;

    document.body.appendChild(bubble);
    document.body.appendChild(win);

    bubble.addEventListener('click', toggle);
    document.getElementById('sb-snd').addEventListener('click', send);
    document.getElementById('sb-inp').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    document.getElementById('sb-inp').addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 68) + 'px';
    });
  }

  // ── TOGGLE ───────────────────────────────────────────────────
  function toggle() {
    isOpen = !isOpen;
    document.getElementById('sb-bubble').classList.toggle('sb-on', isOpen);
    document.getElementById('sb-win').classList.toggle('sb-on', isOpen);
    if (isOpen) {
      document.getElementById('sb-ndot').style.display = 'none';
      const msgs = document.getElementById('sb-msgs');
      if (msgs && msgs.children.length === 0) welcome();
      setTimeout(() => document.getElementById('sb-inp')?.focus(), 280);
    }
  }

  // ── WELCOME ──────────────────────────────────────────────────
  function welcome() {
    const name = localStorage.getItem('first_name') || 'there';
    botMsg(`Hi **${name}**! 👋 I'm **Bridget**, your SkillBridge assistant.\n\nI can help you:\n• 🔍 Find the right worker\n• 📋 Check your bookings\n• 💡 Answer service questions\n\nWhat do you need today?`);
    chips(['🔍 Find a plumber', '📋 My bookings', '⭐ Top rated workers', '💰 Best value']);
  }

  // ── CHIPS ────────────────────────────────────────────────────
  function chips(opts) {
    const el = document.getElementById('sb-qr');
    if (!el) return;
    el.innerHTML = opts.map(o =>
      `<button class="sb-ch" onclick="window._sbc('${o.replace(/'/g,"&#39;")}')">${o}</button>`
    ).join('');
  }
  window._sbc = t => { document.getElementById('sb-qr').innerHTML = ''; processMsg(t); };

  // ── SEND ─────────────────────────────────────────────────────
  function send() {
    const el = document.getElementById('sb-inp');
    const t  = el.value.trim();
    if (!t || isTyping) return;
    el.value = ''; el.style.height = 'auto';
    document.getElementById('sb-qr').innerHTML = '';
    processMsg(t);
  }

  // ── PROCESS MESSAGE ──────────────────────────────────────────
  async function processMsg(text) {
    userMsg(text);
    showTyping();
    isTyping = true;
    document.getElementById('sb-snd').disabled = true;

    // Small delay to feel natural
    await delay(600 + Math.random() * 400);

    const response = await generateResponse(text.toLowerCase());
    hideTyping();
    isTyping = false;
    document.getElementById('sb-snd').disabled = false;

    botMsg(response.text);
    if (response.workers?.length) workerCards(response.workers);
    if (response.chips)           chips(response.chips);
  }

  // ── RULE-BASED RESPONSE ENGINE ───────────────────────────────
  async function generateResponse(input) {
    const workers = getWorkers();

    // ── BOOKINGS ──
    if (match(input, ['my booking', 'my order', 'booking status', 'my job', 'check booking', 'what did i book', 'booked'])) {
      return await bookingResponse();
    }

    // ── GREETING ──
    if (match(input, ['hello', 'hi', 'hey', 'salam', 'helo', 'hii'])) {
      const name = localStorage.getItem('first_name') || '';
      return {
        text: `Hi${name ? ' ' + name : ''}! 😊 How can I help you today?`,
        chips: ['🔍 Find a worker', '📋 My bookings', '⭐ Top rated']
      };
    }

    // ── THANKS ──
    if (match(input, ['thank', 'thanks', 'shukriya', 'great', 'awesome', 'perfect', 'good'])) {
      return { text: `You're welcome! 😊 Is there anything else I can help you with?`,
        chips: ['🔍 Find a worker', '📋 My bookings'] };
    }

    // ── SERVICE-SPECIFIC SEARCHES ──
    const serviceMap = {
      plumb:      'plumbing',
      'pipe':     'plumbing',
      'water':    'plumbing',
      electr:     'electrical',
      'wiring':   'electrical',
      'light':    'electrical',
      carp:       'carpentry',
      'wood':     'carpentry',
      'furniture':'carpentry',
      mechanic:   'mechanic',
      'car':      'mechanic',
      'vehicle':  'mechanic',
      paint:      'painting',
      'wall':     'painting',
      clean:      'cleaning',
      'maid':     'cleaning',
      'ac':       'ac_repair',
      'air cond': 'ac_repair',
      weld:       'welding',
      mason:      'masonry',
      'tile':     'tiling',
      garden:     'gardening',
    };

    for (const [keyword, service] of Object.entries(serviceMap)) {
      if (input.includes(keyword)) {
        return findWorkersByService(service, input);
      }
    }

    // ── TOP RATED ──
    if (match(input, ['top rated', 'best worker', 'best rated', 'highest rated', '5 star', 'best', 'top'])) {
      const top = [...workers].sort((a, b) => b.rating - a.rating).slice(0, 3);
      if (!top.length) return noWorkersResponse();
      return {
        text: `⭐ Here are our **top rated workers** right now:`,
        workers: top,
        chips: ['📋 My bookings', '💰 Cheapest workers', '🔍 Find by service']
      };
    }

    // ── CHEAPEST ──
    if (match(input, ['cheap', 'affordable', 'low price', 'budget', 'low cost', 'best value', 'inexpensive', 'value'])) {
      const cheap = [...workers].filter(w => w.availability).sort((a, b) => a.price - b.price).slice(0, 3);
      if (!cheap.length) return noWorkersResponse();
      return {
        text: `💰 Here are our **most affordable available workers**:`,
        workers: cheap,
        chips: ['⭐ Top rated', '📋 My bookings', '🔍 Find by service']
      };
    }

    // ── AVAILABLE NOW ──
    if (match(input, ['available', 'available now', 'free now', 'who is free', 'right now'])) {
      const avail = workers.filter(w => w.availability).slice(0, 3);
      if (!avail.length) return { text: `😔 No workers are marked as available right now. Try again soon!`,
        chips: ['⭐ Top rated', '📋 My bookings'] };
      return {
        text: `✅ These workers are **available right now**:`,
        workers: avail,
        chips: ['📋 My bookings', '⭐ Top rated']
      };
    }

    // ── LOCATION SEARCH ──
    const cities = ['lahore', 'karachi', 'islamabad', 'rawalpindi', 'faisalabad', 'multan', 'peshawar'];
    for (const city of cities) {
      if (input.includes(city)) {
        const cityWorkers = workers.filter(w => w.location?.toLowerCase().includes(city)).slice(0, 3);
        if (!cityWorkers.length) return {
          text: `😔 No workers found in **${cap(city)}** right now. Try another city!`,
          chips: ['⭐ Top rated workers', '💰 Best value']
        };
        return {
          text: `📍 Workers available in **${cap(city)}**:`,
          workers: cityWorkers,
          chips: ['📋 My bookings', '⭐ Top rated']
        };
      }
    }

    // ── HOW MANY WORKERS ──
    if (match(input, ['how many worker', 'total worker', 'how many professional'])) {
      return { text: `We have **${workers.length} skilled professionals** on SkillBridge across multiple service categories. 💪`,
        chips: ['🔍 Find a plumber', '⭐ Top rated', '💰 Best value'] };
    }

    // ── PRICE / RATE QUESTION ──
    if (match(input, ['price', 'rate', 'cost', 'charge', 'how much', 'fee', 'kitna'])) {
      const avg = workers.length
        ? Math.round(workers.reduce((s, w) => s + w.price, 0) / workers.length)
        : 0;
      return {
        text: `💰 Worker rates on SkillBridge start from **Rs${Math.min(...workers.map(w=>w.price))}/hr**. The average rate is around **Rs${avg}/hr**.\n\nWant me to find someone within your budget?`,
        chips: ['💰 Cheapest workers', '⭐ Top rated', '🔍 Find a plumber']
      };
    }

    // ── VERIFIED WORKERS ──
    if (match(input, ['verified', 'trusted', 'legit', 'safe'])) {
      const verified = workers.filter(w => w.verified).slice(0, 3);
      return {
        text: `🛡️ Here are some of our **verified professionals**:`,
        workers: verified,
        chips: ['📋 My bookings', '⭐ Top rated']
      };
    }

    // ── BOOKING HELP ──
    if (match(input, ['how to book', 'how do i book', 'book a worker', 'make booking', 'hire'])) {
      return {
        text: `📋 **How to book a worker:**\n1. Browse workers or ask me to find one\n2. Click on a worker card to view their profile\n3. Click **"Book Worker"** on their profile\n4. Choose date, time and describe the job\n5. Confirm your booking!\n\nWant me to find a worker for you?`,
        chips: ['🔍 Find a plumber', '🔍 Find an electrician', '⭐ Top rated']
      };
    }

    // ── BOOK BY NAME ──
    if (match(input, ['book', 'hire', 'want'])) {
      // Try to find worker by name in the input
      const workers = getWorkers();
      const match2  = workers.find(w =>
        w.name && input.includes(w.name.toLowerCase())
      );
      if (match2) {
        return {
          text: `Great choice! 🎉 Here's **${match2.name}** — click the card to view their profile and book them:`,
          workers: [match2],
          chips: ['📋 My bookings', '🔍 Find another worker']
        };
      }
      // No name match — show top workers
      const top = [...workers].sort((a, b) => b.rating - a.rating).slice(0, 3);
      return {
        text: `I couldn't find that specific worker. Here are our top rated workers you can book:`,
        workers: top,
        chips: ['📋 My bookings', '💰 Cheapest workers']
      };
    }

    // ── WORKER NAME SEARCH (no book keyword) ──
    {
      const workers = getWorkers();
      const nameMatch = workers.find(w =>
        w.name && input.includes(w.name.toLowerCase())
      );
      if (nameMatch) {
        return {
          text: `Found **${nameMatch.name}**! ⭐${nameMatch.rating} • ${nameMatch.service} • Rs${nameMatch.price}/hr • ${nameMatch.location}

Click the card below to view their full profile and book them:`,
          workers: [nameMatch],
          chips: ['📋 My bookings', '🔍 Find similar workers']
        };
      }
    }

    // ── FALLBACK ──
    return {
      text: `I can help you find workers or check your bookings! Try asking me:\n• "Find a plumber in Lahore"\n• "Book Eshaal Hussain"\n• "What's my booking status?"`,
      chips: ['🔍 Find a plumber', '📋 My bookings', '⭐ Top rated workers', '💰 Best value']
    };
  }

  // ── FIND WORKERS BY SERVICE ───────────────────────────────────
  function findWorkersByService(service, input) {
    const workers = getWorkers();
    let filtered  = workers.filter(w =>
      w.service?.toLowerCase().includes(service) ||
      w.service?.toLowerCase().includes(service.replace('_', ' '))
    );

    // Apply additional filters from input
    if (input.includes('cheap') || input.includes('affordable') || input.includes('budget')) {
      filtered = filtered.sort((a, b) => a.price - b.price);
    } else if (input.includes('best') || input.includes('top') || input.includes('rated')) {
      filtered = filtered.sort((a, b) => b.rating - a.rating);
    } else if (input.includes('available')) {
      filtered = filtered.filter(w => w.availability);
    } else {
      filtered = filtered.sort((a, b) => b.rating - a.rating);
    }

    const top = filtered.slice(0, 3);
    const serviceLabel = cap(service.replace('_', ' '));

    if (!top.length) return noWorkersResponse(serviceLabel);

    const avail = filtered.filter(w => w.availability).length;
    return {
      text: `🔧 Found **${filtered.length} ${serviceLabel} professionals** (${avail} available now). Here are the best matches:`,
      workers: top,
      chips: ['📋 My bookings', `⭐ Best rated ${serviceLabel}`, '💰 Cheapest option']
    };
  }

  // ── BOOKING RESPONSE ─────────────────────────────────────────
  async function bookingResponse() {
    // Try to load real bookings
    if (!booksCache) {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          const r = await fetch(getBase() + '/api/bookings/my/', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (r.ok) booksCache = await r.json();
        }
      } catch (_) {}
    }

    if (!booksCache || !booksCache.length) {
      return {
        text: `📋 You don't have any bookings yet.\n\nWant me to help you find a worker to book?`,
        chips: ['🔍 Find a plumber', '⭐ Top rated workers', '💰 Best value']
      };
    }

    const statusEmoji = {
      pending:     '⏳',
      accepted:    '✅',
      in_progress: '🔧',
      completed:   '🎉',
      cancelled_customer: '❌',
      cancelled_worker:   '❌',
    };

    const recent = booksCache.slice(0, 4);
    const lines  = recent.map(b => {
      const emoji = statusEmoji[b.status] || '📋';
      const date  = b.scheduled_at
        ? new Date(b.scheduled_at).toLocaleDateString('en-US', {month:'short', day:'numeric'})
        : '';
      return `${emoji} **${b.worker_name || 'Worker'}** — ${cap(b.service_category)} — ${cap(b.status.replace('_',' '))} (${date})`;
    }).join('\n');

    const active    = booksCache.filter(b => ['pending','accepted','in_progress'].includes(b.status)).length;
    const completed = booksCache.filter(b => b.status === 'completed').length;

    return {
      text: `📋 You have **${booksCache.length} total bookings** (${active} active, ${completed} completed):\n\n${lines}`,
      chips: ['🔍 Find another worker', '⭐ Top rated workers']
    };
  }

  // ── HELPERS ──────────────────────────────────────────────────
  function getWorkers() {
    return (typeof SKILLBRIDGE_DATA !== 'undefined' && SKILLBRIDGE_DATA.workers) || [];
  }

  function match(input, keywords) {
    return keywords.some(k => input.includes(k));
  }

  function cap(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function noWorkersResponse(service = '') {
    return {
      text: `😔 No ${service} workers found right now. Try a different service!`,
      chips: ['⭐ Top rated workers', '💰 Best value', '📋 My bookings']
    };
  }

  // ── WORKER CARDS ─────────────────────────────────────────────
  function workerCards(workers) {
    const base = getBase();
    const msgs = document.getElementById('sb-msgs');
    if (!msgs) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;padding-left:32px;animation:sb-mi .2s ease';
    workers.forEach(w => {
      const src  = w.photo
        ? (w.photo.startsWith('http') ? w.photo : base + w.photo)
        : `https://i.pravatar.cc/150?u=${w.id}`;
      const card = document.createElement('a');
      card.href      = `profile.html?worker=${w.id}`;
      card.className = 'sb-wc';
      card.innerHTML = `
        <img src="${src}" onerror="this.src='https://i.pravatar.cc/150?u=${w.id}'" alt="${w.name}">
        <div style="min-width:0">
          <div class="sb-wn">${w.name}${w.verified?' ✅':''}</div>
          <div class="sb-wm">⭐${w.rating} • ${w.location} • ${w.experience}yrs exp</div>
        </div>
        <div class="sb-wr">Rs${w.price}/hr</div>`;
      wrap.appendChild(card);
    });
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  // ── MESSAGE HELPERS ──────────────────────────────────────────
  function userMsg(text) {
    const msgs = document.getElementById('sb-msgs');
    if (!msgs) return;
    const init = (localStorage.getItem('first_name') || 'U')[0].toUpperCase();
    const d = document.createElement('div');
    d.className = 'sb-m sb-u';
    d.innerHTML = `<div class="sb-av sb-ua">${init}</div><div class="sb-bbl">${esc(text)}</div>`;
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
  }

  function botMsg(text) {
    const msgs = document.getElementById('sb-msgs');
    if (!msgs) return;
    const d = document.createElement('div');
    d.className = 'sb-m sb-b';
    d.innerHTML = `<div class="sb-av">🤖</div><div class="sb-bbl">${fmt(text)}</div>`;
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    const msgs = document.getElementById('sb-msgs');
    if (!msgs) return;
    const d = document.createElement('div');
    d.id = 'sb-tp'; d.className = 'sb-m sb-b';
    d.innerHTML = `<div class="sb-av">🤖</div><div class="sb-tp"><span></span><span></span><span></span></div>`;
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
  }
  function hideTyping() { document.getElementById('sb-tp')?.remove(); }

  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fmt = t => esc(t)
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/\n/g,'<br>');

  // ── INIT ─────────────────────────────────────────────────────
  function init() {
    injectStyles();
    buildDOM();
    setTimeout(() => {
      const n = document.getElementById('sb-ndot');
      if (n && !isOpen) n.style.display = 'flex';
    }, 4000);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

})();