/**
 * Play 首页（登录后的启动页）。V4 精简成一屏、不用滚动，参考 Yalla Ludo：
 *   首发 1.0：顶栏（头像、金币）→ 一行四子棋标志 → 快速开始（大卡片，一点就匹配）→ 本地对战。没有和好友玩、签到任务、商城
 *   快速开始一点就匹配；金币分场收进“换场次”弹层
 * 以及启动相关的：B2 新手礼包、B5 退出挽留、B6 离线收益（B3 7 日签到在 tasks.js 顶部）、
 * K3 好友主动发来邀请（V7 首发版不做 C3 回合制对局）
 */
(() => {
  'use strict';

  const IMG = D.IMG;
  let retainShown = false;
  let pingTimer = 0;
  const pageEl = () => document.querySelector('.page[data-page="play"]');

  /* ================= 启动 / 退出 ================= */
  // Play 是 app 的启动页：打开时记一次访问，距上次离开超过 2 秒就发离线收益
  let pendingOffline = false;
  App.onInit(() => {
    const s = Store.s;
    pendingOffline = !!(s.welcome && s.lastExit && Date.now() - s.lastExit > 2000);
    s.lastExit = 0;
    s.visits += 1;
    Store.save();
  });
  // 关闭或刷新页面时记下离开时间，下次打开用来判断离线收益；
  // 已经点过 Leave 的保留更早的那次时间
  addEventListener('pagehide', () => {
    if (Store.s.lastExit) return;
    Store.s.lastExit = Date.now();
    Store.save();
  });

  window.Channel = {
    exit() {
      Store.s.lastExit = Date.now();
      Store.save();
      UI.toast('已退出 Soulgame（演示）');
    },
  };

  /* ================= 大厅各区块 ================= */
  function header() {
    return `<header class="lobby-top safe-top">
      <button class="lobby-me" data-tab="me" aria-label="我的资料">${UI.av('me', 36)}</button>
      <div class="lobby-chips">${UI.chips(['coins'], { plus: false })}</div>
    </header>`;
  }

  /** 四子棋标志缩成一行（左边标志，右边在玩人数和玩法），把位置让给“开始游戏” */
  function logo() {
    const g = D.game[D.GAME];
    const chars = [...g.name];
    const x = (i) => 44 + i * 82;
    return `<div class="hm-logo">
      <svg class="hm-title" viewBox="0 0 252 86" width="150" height="51" role="img" aria-label="${g.name}">
        <defs>
          <linearGradient id="hmg1" x1="0" y1="0" x2="0" y2="1"><stop offset=".1" stop-color="#7cc0ff"/><stop offset="1" stop-color="#1f4fe0"/></linearGradient>
          <linearGradient id="hmg2" x1="0" y1="0" x2="0" y2="1"><stop offset=".1" stop-color="#ff9aa6"/><stop offset="1" stop-color="#e01f3d"/></linearGradient>
          <linearGradient id="hmg3" x1="0" y1="0" x2="0" y2="1"><stop offset=".1" stop-color="#ffe98a"/><stop offset="1" stop-color="#ff9500"/></linearGradient>
        </defs>
        <g class="hm-title-o">${chars.map((ch, i) => `<text x="${x(i)}" y="66">${ch}</text>`).join('')}</g>
        <g class="hm-title-i">${chars.map((ch, i) => `<text x="${x(i)}" y="66" class="c${i + 1}">${ch}</text>`).join('')}</g>
      </svg>
      <div class="hm-meta"><span class="hm-live"><i class="live-dot"></i>${UI.fmt(g.online)}人在玩</span><button class="hm-howto" data-act="howto">${UI.ic('book', 13)}玩法</button></div>
    </div>`;
  }

  /** 快速开始用的场次（规则见 battle.js 的 pickStake，消息页的“快速开始一局”也用它） */
  const pickStake = () => Battle.pickStake();

  function modes() {
    const st = pickStake();
    return `<div class="hm-modes">
      <div class="hm-tile is-quick is-big">
        <button class="hm-hit" data-act="quick" data-id="${st.id}" aria-label="开始游戏 · ${st.name}"></button>
        <img class="hm-art" src="${IMG}games/c4.jpg" alt="">
        <b class="hm-name">快速开始</b>
        <span class="hm-desc">实时对战 · 赢家拿走奖池</span>
        <button class="hm-change" data-act="stakes" aria-label="换场次">${st.name} · ${UI.cur('coins', 14)}${UI.fmt(st.bet)}${UI.ic('down', 13)}</button>
        <span class="hm-go">${UI.ic('play', 18)}开始游戏</span>
      </div>
      <button class="hm-tile is-local is-wide" data-act="local">
        <img class="hm-art" src="${IMG}brand/blobs-vs.png" alt="">
        <b class="hm-name">本地对战</b>
        <span class="hm-desc">同一台手机 · 两人轮流下</span>
        <span class="hm-free">免费 · 不用联网匹配</span>
      </button>
    </div>`;
  }

  /** 金币分场（参考 Yalla Ludo）：换场次弹层里点场次直接开始匹配，并记住这次的场次 */
  function stakeCard(st, i) {
    const s = Store.s;
    const k = Battle.canEnter(st);
    return `<button class="stake st-${i + 1} ${st.vip ? 'is-vip' : ''} ${k === 'lock' || k === 'vip' ? 'is-locked' : ''} ${s.stake === st.id ? 'is-last' : ''}" data-act="stake" data-id="${st.id}">
      <b class="stake-name">${st.vip ? `${UI.vipTag(2)} ` : ''}${st.name}</b>
      <span class="stake-bet">${UI.cur('coins', 22)}${UI.fmt(st.bet)}</span>
      <span class="stake-pot">奖池 ${UI.fmt(Battle.pot(st))}</span>
      ${k === 'vip' ? `<span class="stake-lock">${UI.ic('crown', 12)} 超级会员专属 · 奖池×${st.potX}</span>` : `<span class="stake-on"><i class="live-dot"></i>${UI.fmt(st.online)}${st.vip ? ` · 奖池×${st.potX}` : ''}</span>`}
      ${s.stake === st.id && k !== 'lock' && k !== 'vip' ? '<i class="stake-tag">上次</i>' : ''}
      ${st.vip ? `<img class="stake-crown" src="${IMG}ui/crown.png" alt="">` : ''}
    </button>`;
  }
  function stakeSheet() {
    const c = UI.sheet({
      title: '选择场次',
      sub: '入场扣底注，赢家拿走奖池，平局退还',
      cls: 'sheet-stakes',
      html: `<div class="lb-stakes is-sheet">${D.stakes.map(stakeCard).join('')}</div>`,
      acts: {
        stake: (el) => {
          const st = D.stake[el.dataset.id];
          c.close();
          Battle.quick(st.id);
        },
      },
    });
  }

  Channel.stakes = () => stakeSheet();

  /* ================= B2 新手礼包 ================= */
  // 点“全部领取”才算领过，和金币一起存盘：弹窗开着时关掉 app，下次进首页还会弹
  const GIFT = { coins: 1500 };
  let gifting = null; // 礼包弹窗开着时再进首页，不重复弹
  function welcome() {
    if (!gifting) gifting = gift().finally(() => { gifting = null; });
    return gifting;
  }
  async function gift() {
    await UI.sleep(200);
    const from = await UI.reward({
      title: '欢迎来到 Soulgame！',
      sub: '先下一局，再交个朋友。见面礼请收好！',
      img: `${IMG}brand/mascot-gift.png`,
      items: GIFT,
      btn: '全部领取',
      grant: false,
    });
    Store.s.welcome = true; // 下一行发金币时一起存盘
    await UI.grant(GIFT, '新手礼包', from);
    await UI.sleep(350);
    if (App.top() !== 'play') return;
    // 先教开局，让新用户马上玩上第一局；签到的引导等打完第一局回到首页再出（见 shown）
    await UI.coach(pageEl().querySelector('.hm-tile.is-quick'), '点这里马上开一局，赢家拿走奖池。先从新手场试试！', { key: 'play' });
  }
  /* ================= 页面 ================= */
  App.page('play', {
    render(el) {
      el.innerHTML = `<div class="lobby-bg"></div>${header()}
        <div class="body lobby-body hm-body" data-scroll="main">
          ${logo()}
          ${modes()}
          <i class="hm-foot" aria-hidden="true"></i>
        </div>
        ${UI.tabbar('play')}`;
    },
    async shown() {
      if (!Store.s.welcome) await welcome();
    },
    // 首发 1.0 没有退出挽留：在首页按返回键直接退出 app
    back() {
      Channel.exit();
      return false;
    },
    act: {
      quick: (el) => Battle.quick(el.dataset.id),
      local: () => Battle.local(),
      stakes: () => stakeSheet(),
      howto: () => Battle.howto(D.GAME, { manual: true }),
    },
  });
})();
