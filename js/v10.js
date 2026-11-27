/**
 * 首发 1.0 的新增和替换：
 *   Shop.lack     金币不足弹窗（1.0 版）：免费补助、换个场次、本地对战；没有会员、任务、充值
 *   Shop.aidUsed  今天已经领了几次免费补助
 *   Legal.open    用户协议、隐私政策（网页版的演示）
 * 其余的 Vip / Tasks 只是占位：V7 原型里别处还会引用它们，首发 1.0 没有这些功能
 */
(() => {
  'use strict';

  /* ================= 免费补助（1.0 新增，见需求文档 4.5） ================= */
  // 示例数值：余额低于最低场次底注时才能领；每个自然日最多 2 次，每次 300 金币；正式产品在后台配置
  const AID_MAX = 2;
  const AID_COINS = 300;
  const dayKey = () => new Date().toDateString();
  const minBet = () => Math.min(...D.stakes.map((x) => x.bet));
  function aidUsed() {
    const a = Store.s.aid;
    return a && a.d === dayKey() ? a.n : 0;
  }
  const aidLeft = () => Math.max(0, AID_MAX - aidUsed());
  /** 领一次：成功返回金币数，今天已经用完返回 0 */
  function useAid() {
    if (!aidLeft()) return 0;
    Store.s.aid = { d: dayKey(), n: aidUsed() + 1 };
    Store.save();
    return AID_COINS;
  }

  /* ================= 金币不足弹窗 ================= */
  let showing = false;
  async function lack({ need, stake }) {
    if (showing) return;
    showing = true;
    const st = stake ? D.stake[stake] : null;
    const coins = Store.s.coins;
    const poor = coins < minBet(); // 连最低一档都进不了：才有免费补助
    const left = aidLeft();
    const IMG = D.IMG;
    const ops = [];
    if (poor && left > 0) {
      ops.push(`<button class="lack-op is-vip" data-act="__btn" data-key="aid"><span class="lack-vip-ic">${UI.ic('gift', 20)}</span><span><b>领取免费补助 · +${AID_COINS}金币</b><small>今日还剩${left}次</small></span>${UI.ic('right', 18)}</button>`);
    } else if (poor) {
      ops.push(`<div class="lack-op is-off"><span class="lack-vip-ic is-off">${UI.ic('gift', 20)}</span><span><b>今天的免费补助已用完</b><small>明天再来，或者先玩本地对战</small></span></div>`);
    } else {
      ops.push(`<button class="lack-op" data-act="__btn" data-key="stakes"><span class="lack-vip-ic is-blue">${UI.ic('swords', 20)}</span><span><b>换个场次</b><small>选一个你够得上的场次</small></span>${UI.ic('right', 18)}</button>`);
    }
    ops.push(`<button class="lack-op" data-act="__btn" data-key="local"><img src="${IMG}brand/blobs-vs.png" alt=""><span><b>本地对战</b><small>不扣金币，不用联网</small></span>${UI.ic('right', 18)}</button>`);
    const k = await UI.dialog({
      cls: 'dlg-lack',
      img: `${IMG}ui/coin.svg`, imgCls: 'is-small',
      title: '金币不足',
      text: `${st ? `${st.name}` : ''}底注<b>${UI.fmt(need)}金币</b>，你只有<b>${UI.fmt(coins)}</b>`,
      html: `<div class="lack-ops">${ops.join('')}</div>`,
    });
    showing = false;
    if (k === 'aid') {
      const n = useAid();
      if (!n) { UI.toast('今天的免费补助已用完'); return; }
      await UI.grant({ coins: n }, '免费补助');
      UI.toast('补助已到账，再点一次就能开局');
      App.refresh();
    } else if (k === 'stakes') {
      if (window.Channel && Channel.stakes) Channel.stakes();
    } else if (k === 'local') {
      Battle.local({ replace: App.top() === 'result' });
    }
  }

  window.Shop = { lack, aidUsed, aidLeft, useAid, AID_MAX, AID_COINS, openItem() {}, pay() {} };
  window.Vip = { open() {} };
  window.Tasks = { streakToast() {} };
  window.Rooms = { checkCoins: () => true };

  /* ================= 用户协议、隐私政策（演示：网页版的摘要） ================= */
  const DOCS = {
    terms: {
      title: '用户协议',
      body: [
        ['一、服务说明', 'Soulgame 提供四子棋等棋类游戏的实时对战服务。金币只能在 Soulgame 里使用：对局底注、赢得奖池。金币不能提现，不能兑换现金或实物，也不能转让给他人。'],
        ['二、对局和对手', '快速开始会为你匹配水平相近的对手。匹配不到玩家时，系统可能安排其他玩家陪你对局。对局按公布的规则判定输赢，认输、连续超时、掉线过久都按判负处理。'],
        ['三、账号', '你以游客身份使用 Soulgame 时，数据只保存在这台手机上；卸载、换手机或清除应用数据后无法找回。你可以在“设置 → 注销账号”里随时注销账号，注销后数据会被删除，不能恢复。'],
        ['四、行为规范', '请不要使用作弊程序，不要故意挂机或消极对局。发现违规的玩家，我们会视情况限制或封禁账号。你可以在对局中或结算页举报对手。'],
        ['五、联系我们', '遇到问题可以在“设置 → 联系我们”给客服发邮件，我们会带上你的展示 ID 和版本号，方便核实。'],
      ],
    },
    privacy: {
      title: '隐私政策',
      body: [
        ['我们收集什么', '设备标识（用来创建和恢复游客账号）、对局记录和金币记录（用来结算和客服核对）、必要的运行日志（用来排查崩溃和断线）。1.0 不收集你的通讯录、位置、麦克风和摄像头数据。'],
        ['用来做什么', '提供对局、匹配和金币结算，处理举报，保障账号和金币安全，改进产品。'],
        ['保存多久', '账号存续期间保存。你注销账号后，账号和对局记录会被删除；备份数据按备份周期滚动删除，最长 30 天；日志去标识化后保留。'],
        ['你的权利', '你可以在“设置 → 注销账号”里删除自己的账号和数据；也可以通过客服邮箱查询、更正或删除个人数据。'],
        ['未成年人', '请在监护人同意下使用 Soulgame。'],
        ['联系方式', '客服邮箱以应用商店页面和“设置 → 联系我们”显示的为准。'],
      ],
    },
  };
  window.Legal = {
    open(kind) {
      const d = DOCS[kind];
      if (!d) return;
      UI.sheet({
        title: d.title,
        sub: '演示摘要 · 正式版是网页，印尼语和英语各一份',
        cls: 'sheet-legal',
        html: `<div class="legal">${d.body.map(([h, t]) => `<h4>${h}</h4><p>${t}</p>`).join('')}</div>`,
      });
    },
  };
})();
