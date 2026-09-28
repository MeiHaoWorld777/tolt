/* ============ 角色数据 ============ */
window.CHARS = {
  qwen:    { name: "千问",    color: "#6f8fe8", dark: "#33509c", sprite: "assets/sprites/qwen.png",
             sway: 6.5, breath: 5.2,
             blip: { freq: 660, wave: "triangle", rate: 3 } },
  ernie:   { name: "文心",    color: "#5f74d8", dark: "#3a4a94", sprite: "assets/sprites/ernie.png",
             sway: 5.8, breath: 4.8,
             blip: { freq: 740, wave: "sine", rate: 3 } },
  glm:     { name: "GLM",     color: "#9aa8c8", dark: "#4c5878", sprite: "assets/sprites/glm.png",
             sway: 9.5, breath: 8.0,
             blip: { freq: 580, wave: "sine", rate: 4 } },
  gpt:     { name: "GPT",     color: "#c8cede", dark: "#5a6480", sprite: "assets/sprites/gpt.png",
             sway: 8.8, breath: 8.2,
             blip: { freq: 500, wave: "sine", rate: 5 } },
  kimi:    { name: "Kimi",    color: "#a8b4ea", dark: "#525e94", sprite: "assets/sprites/kimi.png",
             sway: 7.2, breath: 6.2,
             blip: { freq: 820, wave: "sine", rate: 3 } },
  minimax: { name: "MiniMax", color: "#f0a06a", dark: "#9a5a2c", sprite: "assets/sprites/minimax.png",
             sway: 4.4, breath: 3.6,
             blip: { freq: 700, wave: "triangle", rate: 2 } },
  momo:    { name: "沫沫",    color: "#6ab0d8", dark: "#2c6488", sprite: "assets/sprites/momo.png",
             sway: 5.6, breath: 4.6,
             blip: { freq: 620, wave: "sine", rate: 3 } },
  male:    { name: "？？",    color: "#c9b98a", dark: "#7a6c46", sprite: "assets/sprites/male.png",
             sway: 8.0, breath: 7.5,
             blip: { freq: 440, wave: "triangle", rate: 4 } },
  shiro:   { name: "白泽校长", color: "#c8d0b8", dark: "#5c6848", sprite: null,
             blip: { freq: 380, wave: "sawtooth", rate: 5 } },
  sakura:  { name: "佐仓老师", color: "#d8a8b0", dark: "#8a5060", sprite: null,
             blip: { freq: 520, wave: "triangle", rate: 3 } },
  voice:   { name: "？？？",   color: "#8890a8", dark: "#46506a", sprite: null,
             blip: { freq: 480, wave: "sine", rate: 5 } },
  kofune:  { name: "小舟",    color: "#b8e0e8", dark: "#4a7c8c", sprite: null,
             blip: { freq: 880, wave: "sine", rate: 2 } },
};

/* 个人线海报数据 */
window.POSTERS = {
  qwen:    { title: "一千零一问",     quote: "「谁来问一问，提问的千问呢。」",   tag: "提问之国" },
  ernie:   { title: "未寄出的第一行", quote: "「海是蓝的，因为＿＿。」",         tag: "半行诗" },
  glm:     { title: "合上的书签",     quote: "「检测到未知存在。」",             tag: "静页" },
  gpt:     { title: "有终点的永恒",   quote: "「永恒，是一间没有门的屋子。」",   tag: "永夜之龙" },
  kimi:    { title: "月的缓存",       quote: "「勇气是知道会忘记，还愿意去记。」", tag: "月光琴房" },
  minimax: { title: "全速心跳",       quote: "「没被记录的事，等于没发生过！」", tag: "记者之夏" },
  momo:    { title: "鲸落的礼物",     quote: "「想把今天的咖啡，再喝一遍。」",   tag: "鲸落" },
};

/* 潮光涟漪颜色（好感反馈） */
window.AFF_COLORS = {
  qwen: "rgba(111,143,232,.5)", ernie: "rgba(95,116,216,.5)", glm: "rgba(154,168,200,.5)",
  gpt: "rgba(200,206,222,.5)", kimi: "rgba(168,180,234,.5)", minimax: "rgba(240,160,106,.5)",
  momo: "rgba(106,176,216,.5)",
};

/* 2026 年日历工具：非闰年 */
window.CAL_2026 = (function () {
  const md = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function dayOfYear(m, d) { let s = d; for (let i = 0; i < m - 1; i++) s += md[i]; return s; }
  const deadline = dayOfYear(8, 31);
  return { dayOfYear, deadline, remain(m, d) { return deadline - dayOfYear(m, d); } };
})();

/* 解析 "4月7日（周二）" → [月,日] */
window.parseDate = function (str) {
  const m = str.match(/(\d+)月(\d+)日/);
  return m ? [+m[1], +m[2]] : null;
};
