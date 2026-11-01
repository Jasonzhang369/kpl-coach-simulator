/* =====================================================================
   data.js — 静态数据：分路 / 英雄 / 摇摆 / 技能 / 组合 / 战队 / 真实选手池 / 克制表
   由 game.js 拆分而来（v10）。所有文件按 index.html 中的顺序加载。
   ===================================================================== */

/* ---------------- 基础数据 ---------------- */
const POS = ["top", "jungle", "mid", "bot", "support"];
const POS_NAME = { top: "对抗路", jungle: "打野", mid: "中路", bot: "发育路", support: "辅助" };
const POS_WEIGHT = { top: 1.0, jungle: 1.15, mid: 1.2, bot: 1.1, support: 0.95 };

// 英雄池（按王者荣耀官方五路补全）：name / pos 位置 / arc 定位 / o输出 s生存 c控制 m机动
const HEROES = [
  // ===== 对抗路 =====
  { name: "吕布", pos: "top", arc: "fighter", o: 80, s: 78, c: 60, m: 55 },
  { name: "花木兰", pos: "top", arc: "fighter", o: 82, s: 62, c: 70, m: 72 },
  { name: "铠", pos: "top", arc: "fighter", o: 78, s: 75, c: 50, m: 58 },
  { name: "狂铁", pos: "top", arc: "fighter", o: 76, s: 74, c: 55, m: 60 },
  { name: "关羽", pos: "top", arc: "fighter", o: 74, s: 66, c: 65, m: 85 },
  { name: "马超", pos: "top", arc: "assassin", o: 80, s: 58, c: 40, m: 88 },
  { name: "夏洛特", pos: "top", arc: "fighter", o: 76, s: 68, c: 62, m: 70 },
  { name: "廉颇", pos: "top", arc: "tank", o: 60, s: 88, c: 75, m: 50 },
  { name: "白起", pos: "top", arc: "tank", o: 62, s: 90, c: 78, m: 48 },
  { name: "亚瑟", pos: "top", arc: "tank", o: 64, s: 82, c: 60, m: 62 },
  { name: "老夫子", pos: "top", arc: "fighter", o: 74, s: 80, c: 55, m: 60 },
  { name: "夏侯惇", pos: "top", arc: "tank", o: 66, s: 84, c: 70, m: 55 },
  { name: "孙策", pos: "top", arc: "fighter", o: 72, s: 76, c: 68, m: 62 },
  { name: "哪吒", pos: "top", arc: "fighter", o: 70, s: 74, c: 60, m: 78 },
  { name: "刘邦", pos: "top", arc: "tank", o: 58, s: 86, c: 72, m: 80 },
  { name: "钟无艳", pos: "top", arc: "fighter", o: 70, s: 78, c: 65, m: 55 },
  { name: "曹操", pos: "top", arc: "fighter", o: 78, s: 70, c: 55, m: 72 },
  { name: "典韦", pos: "top", arc: "fighter", o: 80, s: 72, c: 45, m: 55 },
  { name: "达摩", pos: "top", arc: "fighter", o: 74, s: 76, c: 68, m: 70 },
  { name: "李信", pos: "top", arc: "fighter", o: 84, s: 66, c: 50, m: 62 },
  { name: "蒙恬", pos: "top", arc: "fighter", o: 76, s: 82, c: 60, m: 50 },
  { name: "芈月", pos: "top", arc: "mage", o: 76, s: 72, c: 55, m: 66 },
  { name: "司空震", pos: "top", arc: "mage", o: 78, s: 68, c: 55, m: 70 },
  { name: "项羽", pos: "top", arc: "tank", o: 64, s: 90, c: 72, m: 48 },
  { name: "猪八戒", pos: "top", arc: "tank", o: 62, s: 88, c: 68, m: 60 },
  { name: "元歌", pos: "top", arc: "assassin", o: 82, s: 54, c: 60, m: 84 },
  { name: "影", pos: "top", arc: "fighter", o: 82, s: 72, c: 55, m: 76 },
  { name: "蚩奼", pos: "top", arc: "fighter", o: 82, s: 74, c: 62, m: 68 },
  // ===== 打野 =====
  { name: "澜", pos: "jungle", arc: "assassin", o: 86, s: 60, c: 45, m: 82 },
  { name: "镜", pos: "jungle", arc: "assassin", o: 88, s: 56, c: 40, m: 86 },
  { name: "露娜", pos: "jungle", arc: "assassin", o: 84, s: 58, c: 42, m: 88 },
  { name: "韩信", pos: "jungle", arc: "assassin", o: 82, s: 55, c: 38, m: 90 },
  { name: "李白", pos: "jungle", arc: "assassin", o: 84, s: 56, c: 40, m: 89 },
  { name: "云中君", pos: "jungle", arc: "assassin", o: 83, s: 57, c: 40, m: 87 },
  { name: "裴擒虎", pos: "jungle", arc: "fighter", o: 80, s: 62, c: 45, m: 80 },
  { name: "赵云", pos: "jungle", arc: "fighter", o: 78, s: 68, c: 55, m: 76 },
  { name: "娜可露露", pos: "jungle", arc: "assassin", o: 85, s: 54, c: 35, m: 84 },
  { name: "暃", pos: "jungle", arc: "assassin", o: 82, s: 58, c: 42, m: 85 },
  { name: "百里玄策", pos: "jungle", arc: "assassin", o: 84, s: 56, c: 50, m: 84 },
  { name: "橘右京", pos: "jungle", arc: "fighter", o: 80, s: 64, c: 55, m: 80 },
  { name: "阿轲", pos: "jungle", arc: "assassin", o: 86, s: 54, c: 40, m: 88 },
  { name: "兰陵王", pos: "jungle", arc: "assassin", o: 82, s: 56, c: 55, m: 82 },
  { name: "孙悟空", pos: "jungle", arc: "assassin", o: 85, s: 60, c: 40, m: 78 },
  { name: "刘备", pos: "jungle", arc: "fighter", o: 82, s: 66, c: 45, m: 70 },
  { name: "雅典娜", pos: "jungle", arc: "assassin", o: 82, s: 64, c: 50, m: 78 },
  { name: "东方曜", pos: "jungle", arc: "fighter", o: 82, s: 66, c: 55, m: 84 },
  { name: "云缨", pos: "jungle", arc: "fighter", o: 80, s: 70, c: 60, m: 76 },
  { name: "宫本武藏", pos: "jungle", arc: "fighter", o: 82, s: 72, c: 55, m: 74 },
  { name: "盘古", pos: "jungle", arc: "fighter", o: 78, s: 74, c: 55, m: 62 },
  { name: "司马懿", pos: "jungle", arc: "assassin", o: 84, s: 58, c: 55, m: 80 },
  { name: "诸葛亮", pos: "jungle", arc: "mage", o: 84, s: 56, c: 55, m: 76 },
  { name: "杨戬", pos: "top", arc: "fighter", o: 80, s: 74, c: 55, m: 70 },
  { name: "梦奇", pos: "jungle", arc: "fighter", o: 76, s: 78, c: 55, m: 66 },
  { name: "阿古朵", pos: "jungle", arc: "tank", o: 60, s: 82, c: 70, m: 62 },
  // ===== 中路 =====
  { name: "不知火舞", pos: "mid", arc: "mage", o: 86, s: 52, c: 72, m: 78 },
  { name: "上官婉儿", pos: "mid", arc: "mage", o: 84, s: 50, c: 68, m: 82 },
  { name: "西施", pos: "mid", arc: "mage", o: 78, s: 50, c: 85, m: 70 },
  { name: "嬴政", pos: "mid", arc: "mage", o: 82, s: 48, c: 55, m: 60 },
  { name: "沈梦溪", pos: "mid", arc: "mage", o: 80, s: 50, c: 70, m: 64 },
  { name: "王昭君", pos: "mid", arc: "mage", o: 78, s: 52, c: 80, m: 58 },
  { name: "周瑜", pos: "mid", arc: "mage", o: 80, s: 50, c: 75, m: 62 },
  { name: "弈星", pos: "mid", arc: "mage", o: 76, s: 52, c: 78, m: 60 },
  { name: "海月", pos: "mid", arc: "mage", o: 82, s: 54, c: 74, m: 72 },
  { name: "女娲", pos: "mid", arc: "mage", o: 80, s: 50, c: 76, m: 66 },
  { name: "安琪拉", pos: "mid", arc: "mage", o: 84, s: 48, c: 60, m: 52 },
  { name: "妲己", pos: "mid", arc: "mage", o: 82, s: 46, c: 65, m: 58 },
  { name: "小乔", pos: "mid", arc: "mage", o: 83, s: 48, c: 62, m: 60 },
  { name: "干将莫邪", pos: "mid", arc: "mage", o: 86, s: 46, c: 55, m: 55 },
  { name: "高渐离", pos: "mid", arc: "mage", o: 84, s: 52, c: 55, m: 68 },
  { name: "扁鹊", pos: "mid", arc: "mage", o: 78, s: 54, c: 55, m: 58 },
  { name: "姜子牙", pos: "mid", arc: "mage", o: 76, s: 48, c: 78, m: 55 },
  { name: "张良", pos: "mid", arc: "mage", o: 74, s: 50, c: 84, m: 55 },
  { name: "杨玉环", pos: "mid", arc: "mage", o: 78, s: 52, c: 76, m: 64 },
  { name: "貂蝉", pos: "mid", arc: "mage", o: 84, s: 56, c: 60, m: 74 },
  { name: "米莱狄", pos: "mid", arc: "mage", o: 80, s: 50, c: 60, m: 58 },
  { name: "金蝉", pos: "mid", arc: "mage", o: 76, s: 52, c: 80, m: 55 },
  { name: "武则天", pos: "mid", arc: "mage", o: 85, s: 48, c: 78, m: 58 },
  { name: "嫦娥", pos: "mid", arc: "mage", o: 80, s: 54, c: 60, m: 66 },
  { name: "墨子", pos: "mid", arc: "mage", o: 76, s: 60, c: 80, m: 58 },
  { name: "甄姬", pos: "mid", arc: "mage", o: 78, s: 48, c: 84, m: 52 },
  { name: "王维", pos: "mid", arc: "mage", o: 82, s: 50, c: 76, m: 62 },
  { name: "海诺", pos: "mid", arc: "mage", o: 80, s: 54, c: 78, m: 64 },
  // ===== 发育路 =====
  { name: "公孙离", pos: "bot", arc: "marksman", o: 86, s: 48, c: 40, m: 88 },
  { name: "马可波罗", pos: "bot", arc: "marksman", o: 84, s: 50, c: 45, m: 84 },
  { name: "狄仁杰", pos: "bot", arc: "marksman", o: 80, s: 55, c: 50, m: 70 },
  { name: "孙尚香", pos: "bot", arc: "marksman", o: 82, s: 50, c: 42, m: 82 },
  { name: "鲁班七号", pos: "bot", arc: "marksman", o: 84, s: 44, c: 38, m: 55 },
  { name: "虞姬", pos: "bot", arc: "marksman", o: 80, s: 58, c: 42, m: 74 },
  { name: "伽罗", pos: "bot", arc: "marksman", o: 86, s: 42, c: 35, m: 52 },
  { name: "黄忠", pos: "bot", arc: "marksman", o: 85, s: 46, c: 55, m: 45 },
  { name: "艾琳", pos: "bot", arc: "marksman", o: 82, s: 50, c: 40, m: 80 },
  { name: "戈娅", pos: "bot", arc: "marksman", o: 80, s: 52, c: 45, m: 86 },
  { name: "后羿", pos: "bot", arc: "marksman", o: 85, s: 46, c: 55, m: 45 },
  { name: "李元芳", pos: "bot", arc: "marksman", o: 82, s: 50, c: 48, m: 74 },
  { name: "百里守约", pos: "bot", arc: "marksman", o: 88, s: 44, c: 40, m: 60 },
  { name: "蒙犽", pos: "bot", arc: "marksman", o: 82, s: 48, c: 45, m: 60 },
  { name: "莱西奥", pos: "bot", arc: "marksman", o: 84, s: 48, c: 45, m: 70 },
  { name: "敖隐", pos: "bot", arc: "marksman", o: 86, s: 50, c: 45, m: 82 },
  { name: "苍", pos: "bot", arc: "marksman", o: 84, s: 48, c: 45, m: 76 },
  { name: "卢雅那", pos: "bot", arc: "marksman", o: 84, s: 48, c: 45, m: 80 },
  { name: "孙权", pos: "bot", arc: "marksman", o: 84, s: 52, c: 50, m: 72 },
  // ===== 辅助 =====
  { name: "瑶", pos: "support", arc: "support", o: 50, s: 70, c: 60, m: 75 },
  { name: "大乔", pos: "support", arc: "support", o: 52, s: 64, c: 85, m: 78 },
  { name: "孙膑", pos: "support", arc: "support", o: 54, s: 66, c: 78, m: 80 },
  { name: "张飞", pos: "support", arc: "tank", o: 58, s: 86, c: 80, m: 60 },
  { name: "牛魔", pos: "support", arc: "tank", o: 60, s: 84, c: 82, m: 56 },
  { name: "鬼谷子", pos: "support", arc: "support", o: 56, s: 62, c: 88, m: 82 },
  { name: "东皇太一", pos: "support", arc: "tank", o: 62, s: 82, c: 90, m: 50 },
  { name: "蔡文姬", pos: "support", arc: "support", o: 50, s: 72, c: 70, m: 68 },
  { name: "盾山", pos: "support", arc: "tank", o: 56, s: 88, c: 84, m: 48 },
  { name: "明世隐", pos: "support", arc: "support", o: 54, s: 70, c: 75, m: 66 },
  { name: "庄周", pos: "support", arc: "support", o: 56, s: 78, c: 60, m: 66 },
  { name: "刘禅", pos: "support", arc: "tank", o: 58, s: 84, c: 82, m: 52 },
  { name: "鲁班大师", pos: "support", arc: "support", o: 54, s: 70, c: 86, m: 62 },
  { name: "太乙真人", pos: "support", arc: "support", o: 56, s: 74, c: 80, m: 60 },
  { name: "苏烈", pos: "support", arc: "tank", o: 60, s: 86, c: 80, m: 55 },
  { name: "钟馗", pos: "support", arc: "tank", o: 58, s: 80, c: 88, m: 50 },
  { name: "桑启", pos: "support", arc: "support", o: 52, s: 72, c: 82, m: 70 },
  { name: "朵莉亚", pos: "support", arc: "support", o: 54, s: 74, c: 80, m: 72 },
  { name: "少司缘", pos: "support", arc: "support", o: 56, s: 70, c: 84, m: 74 },
  { name: "赵怀真", pos: "support", arc: "tank", o: 60, s: 80, c: 78, m: 66 },
  { name: "大禹", pos: "support", arc: "tank", o: 56, s: 88, c: 82, m: 58 },
  { name: "空空儿", pos: "support", arc: "support", o: 54, s: 70, c: 86, m: 82 }
];

// 英雄分路匹配度（摇摆位）：按各英雄摇摆到不同分路的常见程度分档（基于出场分路统计）。
// 主场(hero.pos)=1.0；摇摆 0.98(核心摇摆) ~ 0.80(少见逆用)；极少出现(未列出) 0.72。
const HERO_FLEX = {
  // 对抗路主的摇摆
  吕布: { jungle: 0.88 }, 铠: { jungle: 0.97 }, 关羽: { jungle: 0.86, support: 0.83 },
  马超: { jungle: 0.96 }, 廉颇: { support: 0.94, jungle: 0.84 }, 白起: { support: 0.92, jungle: 0.84 },
  亚瑟: { jungle: 0.90, support: 0.86 }, 老夫子: { jungle: 0.84 }, 夏侯惇: { support: 0.95, jungle: 0.86 },
  孙策: { support: 0.84, jungle: 0.84 }, 哪吒: { support: 0.82, jungle: 0.84 }, 刘邦: { support: 0.93 },
  钟无艳: { jungle: 0.84, support: 0.83 }, 曹操: { jungle: 0.98 }, 典韦: { jungle: 0.92 },
  达摩: { jungle: 0.86, support: 0.80 }, 芈月: { jungle: 0.95 }, 项羽: { support: 0.93 },
  猪八戒: { jungle: 0.93, support: 0.88 }, 元歌: { jungle: 0.86, mid: 0.80 }, 杨戬: { jungle: 0.96 },
  影: { jungle: 0.96 }, 蚩奼: { jungle: 0.92, bot: 0.88 },
  // 打野主的摇摆
  赵云: { top: 0.88, support: 0.84 }, 橘右京: { top: 0.90, support: 0.80 }, 兰陵王: { support: 0.84 },
  雅典娜: { top: 0.90, support: 0.80 }, 东方曜: { top: 0.96 }, 云缨: { top: 0.95 },
  宫本武藏: { top: 0.94, support: 0.82 }, 盘古: { top: 0.86, support: 0.80 }, 司马懿: { mid: 0.92 },
  诸葛亮: { mid: 0.95 }, 梦奇: { top: 0.84, support: 0.80 }, 阿古朵: { support: 0.88 },
  // 中路主的摇摆
  不知火舞: { support: 0.86, top: 0.82 }, 上官婉儿: { top: 0.81 }, 西施: { support: 0.88 },
  沈梦溪: { support: 0.81 }, 王昭君: { support: 0.91 }, 弈星: { support: 0.86 }, 海月: { top: 0.81 },
  安琪拉: { support: 0.81 }, 妲己: { support: 0.81 }, 高渐离: { top: 0.81 }, 扁鹊: { support: 0.86, top: 0.80 },
  姜子牙: { support: 0.92, top: 0.80 }, 张良: { support: 0.94 }, 杨玉环: { support: 0.88 },
  貂蝉: { top: 0.83, jungle: 0.80 }, 金蝉: { support: 0.86 }, 武则天: { support: 0.81 },
  嫦娥: { jungle: 0.90, top: 0.86 }, 墨子: { support: 0.96, top: 0.84 }, 司空震: { top: 0.93, jungle: 0.86 },
  甄姬: { support: 0.86 }, 王维: { support: 0.84 }, 海诺: { support: 0.84 },
  // 发育路主的摇摆
  公孙离: { mid: 0.82 }, 马可波罗: { mid: 0.82 }, 狄仁杰: { top: 0.80, mid: 0.82 }, 孙尚香: { mid: 0.82 },
  虞姬: { top: 0.82, mid: 0.82 }, 艾琳: { mid: 0.84 }, 后羿: { mid: 0.82 }, 李元芳: { jungle: 0.90, top: 0.84 },
  百里守约: { mid: 0.86 }, 蒙犽: { mid: 0.81 }, 莱西奥: { mid: 0.81 }, 敖隐: { mid: 0.84 }, 苍: { jungle: 0.86 },
  卢雅那: { mid: 0.82 }, 孙权: { mid: 0.82 },
  // 辅助主的摇摆
  瑶: { mid: 0.80 }, 孙膑: { mid: 0.85 }, 张飞: { top: 0.94, jungle: 0.80 }, 牛魔: { top: 0.92, jungle: 0.80 },
  鬼谷子: { mid: 0.86 }, 东皇太一: { top: 0.90, jungle: 0.80 }, 盾山: { top: 0.86 }, 庄周: { top: 0.92, jungle: 0.80 },
  刘禅: { top: 0.92 }, 太乙真人: { top: 0.82 }, 苏烈: { top: 0.93, jungle: 0.86 }, 钟馗: { mid: 0.88, top: 0.82, jungle: 0.80 },
  桑启: { mid: 0.85 }, 朵莉亚: { mid: 0.85 }, 少司缘: { mid: 0.85 }, 赵怀真: { top: 0.88, jungle: 0.84 },
  大禹: { top: 0.94 }, 空空儿: { mid: 0.86 }
};
function laneFit(hero, pos) {
  if (!hero) return 1;
  if (hero.pos === pos) return 1.0;
  const f = HERO_FLEX[hero.name];
  return (f && f[pos] != null) ? f[pos] : 0.72;
}
// 英雄招牌技能/特点（用于战斗播报，贴近游戏常识）
const HERO_SKILL = {
  吕布: "大招跳大封路", 花木兰: "双剑连招", 铠: "大招魔铠爆发", 狂铁: "一技能续航回血", 关羽: "冲锋劈砍",
  马超: "投枪拉扯", 夏洛特: "连招减速", 廉颇: "大招击飞开团", 白起: "大招嘲讽", 亚瑟: "一技能沉默",
  老夫子: "大招捆人", 夏侯惇: "一技能击飞", 孙策: "大招开船抓人", 哪吒: "大招全图支援", 刘邦: "大招传送保人",
  钟无艳: "大招石化", 曹操: "一技能突进回血", 典韦: "大招真伤", 达摩: "大招踢墙上墙", 李信: "光暗双形态",
  蒙恬: "方阵承伤", 芈月: "一技能链子续航", 司空震: "远程强化普攻", 项羽: "一技能击退", 猪八戒: "大招圈人",
  元歌: "傀儡牵制", 杨戬: "大招三段激光斩杀", 影: "影分身突进收割", 蚩奼: "大招强化突进",
  澜: "潜水突进收割", 镜: "镜像位移", 露娜: "月下无限连", 韩信: "多段位移", 李白: "大招青莲剑歌",
  云中君: "飞行突进", 裴擒虎: "人虎双形态", 赵云: "大招击飞", 娜可露露: "大招俯冲", 暃: "多段位移",
  百里玄策: "二技能勾人", 橘右京: "拔刀斩", 阿轲: "背后暴击收割", 兰陵王: "隐身突袭", 孙悟空: "多段位移爆发",
  刘备: "贴脸霰弹", 雅典娜: "大招斩杀", 东方曜: "多段位移连招", 云缨: "枪意连招", 宫本武藏: "大招锁定",
  盘古: "缴械克制", 司马懿: "大招突进", 诸葛亮: "大招元气弹", 梦奇: "大招困人", 阿古朵: "球球承伤",
  不知火舞: "扇子消耗接位移", 上官婉儿: "大招飞天", 西施: "一技能拉人", 嬴政: "大招万剑", 沈梦溪: "大招远程轰炸",
  王昭君: "二技能冰冻接大招", 周瑜: "火区铺场", 弈星: "大招棋盘封路", 海月: "大招拉入幻境", 女娲: "大招全图",
  安琪拉: "二技能控制", 妲己: "二技能眩晕", 小乔: "一技能扇子", 干将莫邪: "远程二三技能", 高渐离: "大招持续输出",
  扁鹊: "毒层叠加", 姜子牙: "大招减速", 张良: "大招压制", 杨玉环: "治疗兼输出", 貂蝉: "位移真伤",
  米莱狄: "机械仆从推塔", 金蝉: "大招禁锢", 武则天: "大招全图控制", 嫦娥: "大招爆发", 墨子: "二技能炮击控制",
  甄姬: "二技能冰冻接大招", 王维: "诗画控制输出", 海诺: "远程消耗接控制",
  公孙离: "位移拉扯输出", 马可波罗: "真伤叠加", 狄仁杰: "大招控制", 孙尚香: "翻滚强化普攻", 鲁班七号: "扫射",
  虞姬: "二技能免疫物理", 伽罗: "超远射程破盾", 黄忠: "大招架炮", 艾琳: "位移接暴击", 戈娅: "骑射拉扯",
  后羿: "大招远程开团", 李元芳: "大招飞镖", 百里守约: "二技能狙击", 蒙犽: "大招远程轰",
  莱西奥: "腾空输出", 敖隐: "多形态切换", 苍: "陷阱布置", 卢雅那: "位移接爆发", 孙权: "制衡输出",
  瑶: "附身给盾", 大乔: "传送回城", 孙膑: "大招回血", 张飞: "大招变身击退", 牛魔: "大招击飞",
  鬼谷子: "二技能拉人", 东皇太一: "大招压制", 蔡文姬: "持续治疗", 盾山: "一技能托举格挡", 明世隐: "链接增益",
  庄周: "大招解控", 刘禅: "大招拆塔", 鲁班大师: "拉人位移", 太乙真人: "大招复活", 苏烈: "大招蓄力击飞",
  钟馗: "二技能勾人", 桑启: "飞行治疗", 朵莉亚: "大招传送", 少司缘: "附身增益", 赵怀真: "一技能拉人",
  大禹: "大招治水开团", 空空儿: "二技能抓人"
};
function heroSkill(name) { return HERO_SKILL[name] || "技能连招"; }
function fitLabel(fit) {
  return fit >= 1 ? "✓ 主场" : fit >= 0.95 ? "○ 摇摆·常见" : fit >= 0.88 ? "~ 摇摆" : fit >= 0.80 ? "⚠ 逆用" : "✖ 生疏";
}
function fitClass(fit) { return fit >= 1 ? "c-good" : fit >= 0.95 ? "c-good" : fit >= 0.88 ? "c-mid" : "c-bad"; }

// 经典英雄组合/体系（参考常见搭配统计）：同队同时选出可增加战斗力
const COMBOS = [
  // 朵莉亚「双大」体系（给关键大招刷新，影响力翻倍）
  { heroes: ["朵莉亚", "杨戬"], bonus: 1.13, name: "双大杨戬（T0 野辅体系）" },
  { heroes: ["朵莉亚", "上官婉儿"], bonus: 1.12, name: "双大婉儿（连续飞天）" },
  { heroes: ["朵莉亚", "吕布"], bonus: 1.12, name: "双大吕布（双重圈控真伤）" },
  { heroes: ["朵莉亚", "后羿"], bonus: 1.11, name: "双鸟后羿（双大远程开团）" },
  { heroes: ["朵莉亚", "武则天"], bonus: 1.10, name: "双大武则天（双沉默双击飞）" },
  { heroes: ["朵莉亚", "夏侯惇"], bonus: 1.09, name: "双大夏侯（进场再撤场）" },
  { heroes: ["朵莉亚", "铠"], bonus: 1.09, name: "双大铠（连续开大顶伤）" },
  // 盾山护核体系
  { heroes: ["盾山", "艾琳"], bonus: 1.12, name: "盾山托举+艾琳位移（T0）" },
  { heroes: ["盾山", "曹操"], bonus: 1.10, name: "盾曹（托举曹操强普）" },
  { heroes: ["盾山", "孙尚香"], bonus: 1.09, name: "盾山+孙尚香组合技" },
  { heroes: ["盾山", "鲁班七号"], bonus: 1.08, name: "盾山+鲁班空中扫射" },
  { heroes: ["盾山", "后羿"], bonus: 1.08, name: "后羿控+盾山背人" },
  { heroes: ["盾山", "伽罗"], bonus: 1.08, name: "盾山护伽罗远程输出" },
  // 控制/团控体系
  { heroes: ["鬼谷子", "王昭君", "吕布"], bonus: 1.14, name: "鬼昭吕·完美团控" },
  { heroes: ["鬼谷子", "王昭君"], bonus: 1.10, name: "鬼昭组合" },
  { heroes: ["张良", "王昭君"], bonus: 1.10, name: "张良压制+昭君分割战场" },
  { heroes: ["张良", "安琪拉"], bonus: 1.09, name: "张良控场+安琪拉秒人" },
  { heroes: ["墨子", "干将莫邪"], bonus: 1.09, name: "墨子远程控+干将消耗" },
  // 软辅/游走体系
  { heroes: ["瑶", "马可波罗"], bonus: 1.08, name: "瑶附身+马可真伤" },
  { heroes: ["朵莉亚", "马可波罗"], bonus: 1.08, name: "朵莉亚+马可输出体系" },
  { heroes: ["公孙离", "瑶"], bonus: 1.08, name: "公孙离+瑶保护" },
  { heroes: ["公孙离", "少司缘"], bonus: 1.09, name: "公孙离+少司缘（T0.5）" },
  { heroes: ["戈娅", "少司缘"], bonus: 1.08, name: "戈娅+少司缘游走" },
  { heroes: ["大乔", "马超"], bonus: 1.08, name: "大乔传送+马超带线" },
  { heroes: ["鲁班大师", "鲁班七号"], bonus: 1.07, name: "双鲁班体系" },
  { heroes: ["张飞", "后羿"], bonus: 1.07, name: "硬辅保后排" },
  { heroes: ["蔡文姬", "伽罗"], bonus: 1.07, name: "蔡文姬续航+伽罗" },
  { heroes: ["后羿", "王昭君"], bonus: 1.07, name: "后羿大招+法师补伤" }
];
function comboBonus(pickNames) {
  let mult = 1; const hits = [];
  COMBOS.forEach(c => { if (c.heroes.every(h => pickNames.includes(h))) { mult *= c.bonus; hits.push(c.name); } });
  return { mult: Math.min(mult, 1.30), hits };
}
const TEAMS = [
  "成都AG超玩会", "武汉eStarPro", "重庆狼队", "北京WB", "佛山DRG",
  "上海EDG.M", "广州TTG", "苏州KSG", "南京Hero久竞", "北京JDG",
  "杭州LGD.NW", "济南RW侠"
];

// 真实选手池：取自 KPL 历年参赛选手（2016-2026 各届大名单）与 KPL/K甲 升班马阵容。
// 评级与总评依据公开战绩综合评估（总冠军 / FMVP / 亚军 / 多年首发），非官方数据：
//   S = 拿过总冠军或 FMVP 的顶级主力；A = 冠军队成员 / 总决赛常客 / 长期 S 组首发；
//   B = KPL 常规首发；C = 轮换替补、新秀或租借。
const POOL = [
  // ===== 对抗路 =====
  { name: "Fly", pos: "top", rating: "S", ovr: 94 },      // 4×FMVP（2017春/秋、2023春）
  { name: "轩染", pos: "top", rating: "S", ovr: 89 },     // AG 六连冠主力，2025夏 FMVP
  { name: "清清", pos: "top", rating: "S", ovr: 88 },     // TTG 2023夏冠军 FMVP
  { name: "坦然", pos: "top", rating: "A", ovr: 87 },     // eStar 2021秋/2022春冠军，2022春 FMVP
  { name: "梓墨", pos: "top", rating: "A", ovr: 86 },
  { name: "归期", pos: "top", rating: "A", ovr: 85 },
  { name: "花缘", pos: "top", rating: "A", ovr: 85 },
  { name: "小落", pos: "top", rating: "A", ovr: 84 },
  { name: "六点六", pos: "top", rating: "A", ovr: 83 },   // QG 双冠边路
  { name: "Djie", pos: "top", rating: "A", ovr: 83 },     // RW 侠，2018-19 最佳阵容一阵
  { name: "萝卜", pos: "top", rating: "A", ovr: 82 },
  { name: "流星", pos: "top", rating: "A", ovr: 82 },
  { name: "轻语", pos: "top", rating: "B", ovr: 81 },
  { name: "小泽", pos: "top", rating: "B", ovr: 81 },
  { name: "无痕", pos: "top", rating: "B", ovr: 80 },     // AG 早期主力边路
  { name: "樱花", pos: "top", rating: "B", ovr: 80 },
  { name: "小困", pos: "top", rating: "B", ovr: 79 },
  { name: "冷轩", pos: "top", rating: "B", ovr: 79 },
  { name: "北诗", pos: "top", rating: "B", ovr: 78 },
  { name: "梓轩", pos: "top", rating: "B", ovr: 78 },
  { name: "誓约", pos: "top", rating: "B", ovr: 78 },
  { name: "小度", pos: "top", rating: "B", ovr: 77 },
  { name: "仙语", pos: "top", rating: "B", ovr: 77 },
  { name: "花花", pos: "top", rating: "B", ovr: 76 },
  { name: "无幻", pos: "top", rating: "B", ovr: 76 },
  { name: "䲷龙", pos: "top", rating: "C", ovr: 74 },
  { name: "景晚", pos: "top", rating: "B", ovr: 77 },     // 南京Hero久竞 2025春首发
  { name: "栋栋", pos: "top", rating: "B", ovr: 75 },     // 南京Hero久竞
  { name: "恒心", pos: "top", rating: "C", ovr: 73 },
  { name: "风行", pos: "top", rating: "C", ovr: 72 },

  // ===== 打野 =====
  { name: "小胖", pos: "jungle", rating: "S", ovr: 92 },   // 3×FMVP（2022夏、2024春、2026夏）
  { name: "花海", pos: "jungle", rating: "S", ovr: 91 },   // eStar 冠军打野，2021秋 FMVP
  { name: "钟意", pos: "jungle", rating: "S", ovr: 90 },   // AG 双冠，2024夏/2025春 FMVP
  { name: "暖阳", pos: "jungle", rating: "S", ovr: 89 },   // 2020春冠军，打野首位 FMVP
  { name: "今屿", pos: "jungle", rating: "A", ovr: 86 },
  { name: "Alan", pos: "jungle", rating: "A", ovr: 85 },   // eStar 2019 冠军打野
  { name: "皖皖", pos: "jungle", rating: "A", ovr: 85 },
  { name: "佳心", pos: "jungle", rating: "A", ovr: 84 },
  { name: "句号", pos: "jungle", rating: "A", ovr: 84 },
  { name: "小白熊", pos: "jungle", rating: "A", ovr: 83 },
  { name: "初晨", pos: "jungle", rating: "A", ovr: 83 },
  { name: "小楼", pos: "jungle", rating: "A", ovr: 82 },
  { name: "余忆", pos: "jungle", rating: "A", ovr: 82 },
  { name: "无双", pos: "jungle", rating: "B", ovr: 81 },
  { name: "夏凌", pos: "jungle", rating: "B", ovr: 81 },
  { name: "赤辰", pos: "jungle", rating: "B", ovr: 80 },
  { name: "落尘", pos: "jungle", rating: "B", ovr: 80 },
  { name: "梦泪", pos: "jungle", rating: "B", ovr: 80 },   // AG 传奇打野（历史地位高、年份较早）
  { name: "小兽", pos: "jungle", rating: "B", ovr: 79 },   // BA 黑凤梨
  { name: "晨阳", pos: "jungle", rating: "B", ovr: 79 },
  { name: "阿改", pos: "jungle", rating: "B", ovr: 79 },
  { name: "深巅", pos: "jungle", rating: "B", ovr: 78 },
  { name: "神人", pos: "jungle", rating: "B", ovr: 77 },   // 佛山 GK 打野
  { name: "嘉宝", pos: "jungle", rating: "B", ovr: 77 },
  { name: "安七", pos: "jungle", rating: "C", ovr: 74 },

  // ===== 中路 =====
  { name: "清融", pos: "mid", rating: "S", ovr: 91 },      // Hero 2021春冠军 FMVP，多冠
  { name: "长生", pos: "mid", rating: "S", ovr: 90 },      // AG，2024年总 FMVP
  { name: "久诚", pos: "mid", rating: "S", ovr: 90 },      // Hero 2018 双冠双 FMVP
  { name: "Cat", pos: "mid", rating: "S", ovr: 89 },       // 猫神，2019春冠军 FMVP
  { name: "流浪", pos: "mid", rating: "S", ovr: 88 },      // KSG，2026春 FMVP
  { name: "九尾", pos: "mid", rating: "A", ovr: 86 },
  { name: "紫幻", pos: "mid", rating: "A", ovr: 85 },
  { name: "听悦", pos: "mid", rating: "A", ovr: 84 },
  { name: "早点", pos: "mid", rating: "A", ovr: 84 },
  { name: "Ming", pos: "mid", rating: "A", ovr: 84 },
  { name: "鹤辞", pos: "mid", rating: "A", ovr: 83 },
  { name: "花卷", pos: "mid", rating: "A", ovr: 83 },
  { name: "暴风锐", pos: "mid", rating: "A", ovr: 82 },    // RNG.M
  { name: "Mojo", pos: "mid", rating: "A", ovr: 82 },      // QGhappy
  { name: "小名", pos: "mid", rating: "B", ovr: 81 },
  { name: "见月", pos: "mid", rating: "B", ovr: 81 },
  { name: "挽墨", pos: "mid", rating: "B", ovr: 80 },
  { name: "久寒", pos: "mid", rating: "B", ovr: 79 },
  { name: "小优", pos: "mid", rating: "B", ovr: 79 },
  { name: "雨空", pos: "mid", rating: "B", ovr: 78 },
  { name: "旭旭", pos: "mid", rating: "B", ovr: 78 },
  { name: "小凡", pos: "mid", rating: "B", ovr: 78 },
  { name: "千世", pos: "mid", rating: "B", ovr: 77 },
  { name: "辰鬼", pos: "mid", rating: "B", ovr: 77 },      // 2016秋初代 FMVP
  { name: "橘子", pos: "mid", rating: "B", ovr: 77 },      // eStar 2019 冠军阵容
  { name: "景诗", pos: "mid", rating: "B", ovr: 78 },     // 南京Hero久竞 2025首发中路
  { name: "铃铛", pos: "mid", rating: "C", ovr: 73 },     // 南京Hero久竞
  { name: "小晗", pos: "mid", rating: "C", ovr: 74 },     // 济南RW侠
  { name: "许诺", pos: "mid", rating: "C", ovr: 74 },
  { name: "老帅", pos: "mid", rating: "C", ovr: 74 },      // AG 首冠成员（现已淡出）
  { name: "冰尘", pos: "mid", rating: "C", ovr: 73 },

  // ===== 发育路 =====
  { name: "一诺", pos: "bot", rating: "S", ovr: 93 },      // AG，2019秋/2025年总 FMVP，六连冠核心
  { name: "妖刀", pos: "bot", rating: "A", ovr: 87 },
  { name: "梦岚", pos: "bot", rating: "A", ovr: 86 },
  { name: "道崽", pos: "bot", rating: "A", ovr: 86 },
  { name: "易峥", pos: "bot", rating: "A", ovr: 86 },      // eStar 2021-22 冠军射手
  { name: "小义", pos: "bot", rating: "A", ovr: 85 },      // DYG，2020秋 FMVP
  { name: "小俞", pos: "bot", rating: "A", ovr: 83 },
  { name: "绝意", pos: "bot", rating: "A", ovr: 83 },
  { name: "凌云", pos: "bot", rating: "A", ovr: 82 },
  { name: "小麦", pos: "bot", rating: "B", ovr: 81 },
  { name: "乔兮", pos: "bot", rating: "B", ovr: 81 },
  { name: "小雪", pos: "bot", rating: "B", ovr: 80 },
  { name: "小久", pos: "bot", rating: "B", ovr: 80 },
  { name: "小涵", pos: "bot", rating: "B", ovr: 79 },
  { name: "卡密望", pos: "bot", rating: "B", ovr: 79 },
  { name: "鸣鸣", pos: "bot", rating: "B", ovr: 78 },
  { name: "秋源", pos: "bot", rating: "B", ovr: 78 },
  { name: "佩恩", pos: "bot", rating: "B", ovr: 78 },
  { name: "风箫", pos: "bot", rating: "B", ovr: 78 },
  { name: "鹏鹏", pos: "bot", rating: "B", ovr: 78 },      // 佛山 GK
  { name: "零栩", pos: "bot", rating: "B", ovr: 77 },
  { name: "小玖", pos: "bot", rating: "B", ovr: 77 },      // 北京 JDG
  { name: "陌冷", pos: "bot", rating: "B", ovr: 77 },
  { name: "虔诚", pos: "bot", rating: "B", ovr: 77 },      // RNG.M
  { name: "润润", pos: "bot", rating: "B", ovr: 76 },
  { name: "极光", pos: "bot", rating: "B", ovr: 76 },
  { name: "亮宇", pos: "bot", rating: "B", ovr: 76 },
  { name: "蓝桉", pos: "bot", rating: "B", ovr: 76 },
  { name: "SILVER", pos: "bot", rating: "B", ovr: 79 },   // 南京Hero久竞（黄本帅）
  { name: "墨衍", pos: "bot", rating: "C", ovr: 74 },     // 南京Hero久竞

  // ===== 游走（辅助） =====
  { name: "大帅", pos: "support", rating: "S", ovr: 89 },   // AG，2025夏 FMVP
  { name: "子阳", pos: "support", rating: "S", ovr: 88 },   // eStar 冠军辅助，现 KSG 主力
  { name: "星宇", pos: "support", rating: "A", ovr: 86 },   // eStar 2021-22 冠军阵容
  { name: "一笙", pos: "support", rating: "A", ovr: 85 },
  { name: "久酷", pos: "support", rating: "A", ovr: 84 },
  { name: "梦溪", pos: "support", rating: "A", ovr: 84 },
  { name: "无畏", pos: "support", rating: "A", ovr: 84 },   // 2026春冠军 JDG
  { name: "阿豆", pos: "support", rating: "A", ovr: 83 },
  { name: "帆帆", pos: "support", rating: "A", ovr: 83 },
  { name: "晚星", pos: "support", rating: "A", ovr: 82 },
  { name: "四宝", pos: "support", rating: "A", ovr: 82 },
  { name: "玖欣", pos: "support", rating: "B", ovr: 81 },
  { name: "小崽", pos: "support", rating: "B", ovr: 81 },
  { name: "九幽", pos: "support", rating: "B", ovr: 80 },
  { name: "笑影", pos: "support", rating: "B", ovr: 80 },
  { name: "小A", pos: "support", rating: "B", ovr: 80 },
  { name: "信", pos: "support", rating: "B", ovr: 80 },     // 重庆狼队
  { name: "玖痕", pos: "support", rating: "B", ovr: 79 },
  { name: "落空", pos: "support", rating: "B", ovr: 79 },
  { name: "紫渊", pos: "support", rating: "B", ovr: 79 },
  { name: "koko", pos: "support", rating: "B", ovr: 78 },   // EDG.M，2018 最佳阵容一阵
  { name: "小七", pos: "support", rating: "B", ovr: 78 },
  { name: "啊泽", pos: "support", rating: "B", ovr: 78 },
  { name: "源", pos: "support", rating: "B", ovr: 77 },
  { name: "770", pos: "support", rating: "B", ovr: 77 },    // BA 黑凤梨 指挥位
  { name: "胖墩", pos: "support", rating: "B", ovr: 76 },   // 佛山 GK
  { name: "易瞳", pos: "support", rating: "B", ovr: 76 },
  { name: "Zero", pos: "support", rating: "B", ovr: 75 },   // RNG.M
  { name: "涛", pos: "support", rating: "C", ovr: 74 },
  { name: "无铭", pos: "support", rating: "C", ovr: 73 }    // eStar（现转教练）
];

// 「真实难度」专用：12 支战队的真实大名单（以 2025 KPL 年度总决赛/挑战者杯/夏季赛大名单为准，
// 个别位置按夏季赛补齐；转会期流动以最近一次名单归属为准）。首发=名单首个，其余为替补。
const REAL_ROSTERS = {
  "成都AG超玩会": {
    top: ["轩染", "坦然", "北诗"], jungle: ["钟意"],
    mid: ["长生", "小凡"], bot: ["一诺", "小俞"], support: ["大帅"]
  },
  "武汉eStarPro": {
    top: ["誓约"], jungle: ["花海", "小楼", "余忆"],
    mid: ["Ming"], bot: ["亮宇"], support: ["紫渊"]
  },
  "重庆狼队": {
    top: ["归期", "樱花"], jungle: ["小胖"],
    mid: ["紫幻"], bot: ["道崽"], support: ["一笙", "信"]
  },
  "北京WB": {
    top: ["梓墨", "䲷龙"], jungle: ["暖阳"],
    mid: ["听悦"], bot: ["小麦", "乔兮"], support: ["梦溪", "晚星"]
  },
  "佛山DRG": {
    top: ["花缘"], jungle: ["皖皖", "阿改"],
    mid: ["早点"], bot: ["梦岚"], support: ["四宝", "久酷"]
  },
  "上海EDG.M": {
    top: ["小泽"], jungle: ["夏凌", "初晨"],
    mid: ["花卷"], bot: ["凌云", "鸣鸣"], support: ["帆帆", "笑影"]
  },
  "广州TTG": {
    top: ["清清", "小困"], jungle: ["佳心", "落尘"],
    mid: ["鹤辞"], bot: ["小雪"], support: ["玖欣", "涛"]
  },
  "苏州KSG": {
    top: ["萝卜", "流星"], jungle: ["句号"],
    mid: ["流浪"], bot: ["妖刀", "卡密望"], support: ["子阳", "九幽", "啊泽"]
  },
  "南京Hero久竞": {
    top: ["栋栋", "景晚"], jungle: ["小义"],
    mid: ["景诗", "铃铛"], bot: ["SILVER", "墨衍"], support: ["阿豆"]
  },
  "北京JDG": {
    top: ["轻语"], jungle: ["今屿"],
    mid: ["清融"], bot: ["绝意", "零栩", "小玖"], support: ["无畏"]
  },
  "杭州LGD.NW": {
    top: ["小落", "花花"], jungle: ["小白熊", "赤辰"],
    mid: ["小名", "九尾"], bot: ["小久", "小涵"], support: ["小崽"]
  },
  "济南RW侠": {
    top: ["Fly", "梓轩", "小度"], jungle: ["无双"],
    mid: ["见月", "小晗"], bot: ["秋源"], support: ["小A"]
  }
};
// 按真实大名单构建 12 队（同一选手只会属于一支队；未上名单的真实选手进自由身池）
function buildRealRosters(names) {
  const result = {}, leftover = {};
  const used = new Set();
  POS.forEach(pos => leftover[pos] = []);
  names.forEach(n => {
    result[n] = {}; POS.forEach(pos => result[n][pos] = []);
    const roster = REAL_ROSTERS[n];
    if (!roster) return;
    POS.forEach(pos => (roster[pos] || []).forEach(nm => {
      if (used.has(nm)) return;
      const e = POOL.find(x => x.name === nm);
      if (!e) return;
      used.add(nm);
      result[n][pos].push(makePlayerFrom(e));
    }));
  });
  // 名单里若有位置空缺，用同位置最强的未归属真实选手补（保证每队五路都有人）
  names.forEach(n => POS.forEach(pos => {
    if (result[n][pos].length) return;
    const cand = POOL.filter(x => x.pos === pos && !used.has(x.name)).sort((a, b) => b.ovr - a.ovr)[0];
    if (cand) { used.add(cand.name); result[n][pos].push(makePlayerFrom(cand)); }
  }));
  POOL.filter(p => !used.has(p.name)).forEach(p => leftover[p.pos].push({ name: p.name, pos: p.pos, rating: p.rating, ovr: p.ovr }));
  POS.forEach(pos => shuffle(leftover[pos]));
  return { result, leftover };
}

// 定位克制：atk 打 def 的倍率
const COUNTER = {
  assassin: { marksman: 1.18, mage: 1.15 },
  marksman: { tank: 1.16, fighter: 1.12 },
  mage: { tank: 1.16, fighter: 1.12 },
  tank: { assassin: 1.18 },
  fighter: { mage: 1.12, marksman: 1.12 },
  support: {}
};
const ARC_NAME = { assassin: "刺客", marksman: "射手", mage: "法师", tank: "坦克", fighter: "战士", support: "辅助" };

// 英雄级克制（可跨分路）：[克制方, 被克方, 倍率, 原因]
// 依据官方英雄机制与常见对位（硬控压制/真伤破坦/格挡弹道/解控/免疫等），与定位克制叠加生效
const HERO_COUNTER_LIST = [
  // 硬控压制：张良/东皇太一 罚站进场英雄（跨分路）
  ["张良", "花木兰", 1.10, "大招压制打断进场"], ["张良", "李白", 1.10, "大招压制罚站"],
  ["张良", "韩信", 1.09, "压制多段位移"], ["张良", "上官婉儿", 1.09, "压制打断飞天"],
  ["张良", "澜", 1.08, "压制潜水突进"], ["张良", "镜", 1.08, "压制镜像突进"],
  ["东皇太一", "澜", 1.10, "大招压制强制位移"], ["东皇太一", "镜", 1.09, "压制切后排"],
  ["东皇太一", "阿轲", 1.09, "压制背后收割"], ["东皇太一", "马超", 1.08, "压制高速突进"],
  ["东皇太一", "关羽", 1.06, "压制冲锋开团"],
  // 盾山格挡弹道：克制远程射手/法师
  ["盾山", "后羿", 1.09, "一技能格挡弹道"], ["盾山", "伽罗", 1.10, "格挡超远普攻"],
  ["盾山", "鲁班七号", 1.09, "格挡扫射"], ["盾山", "王昭君", 1.07, "格挡技能弹道"],
  ["盾山", "嬴政", 1.07, "格挡万剑"], ["盾山", "干将莫邪", 1.08, "格挡远程消耗"],
  ["盾山", "百里守约", 1.08, "格挡狙击"], ["盾山", "黄忠", 1.07, "格挡架炮"],
  ["鬼谷子", "盾山", 1.06, "二技能拉人破格挡"],
  // 真伤/破韧：吕布·马可波罗·貂蝉 克坦克
  ["吕布", "白起", 1.10, "真伤无视防御"], ["吕布", "廉颇", 1.09, "真伤破坦"],
  ["吕布", "项羽", 1.09, "真伤破高护甲"], ["吕布", "猪八戒", 1.10, "真伤克回复坦"],
  ["吕布", "盾山", 1.07, "真伤穿格挡"], ["马可波罗", "白起", 1.09, "真伤叠加"],
  ["马可波罗", "廉颇", 1.08, "真伤破坦"], ["马可波罗", "项羽", 1.08, "真伤破坦"],
  ["貂蝉", "白起", 1.08, "位移真伤"], ["貂蝉", "猪八戒", 1.08, "真伤克回血"],
  // 切后排：刺客/战士克制无位移法师射手
  ["兰陵王", "嬴政", 1.08, "隐身绕后切脆皮"], ["兰陵王", "干将莫邪", 1.08, "隐身近身"],
  ["兰陵王", "甄姬", 1.07, "隐身切入无位移法师"], ["司马懿", "王昭君", 1.07, "大招突进贴脸"],
  ["司马懿", "女娲", 1.07, "突进断技能"], ["花木兰", "妲己", 1.08, "沉默打断连招"],
  ["花木兰", "安琪拉", 1.08, "沉默打断大招"], ["花木兰", "小乔", 1.07, "突进沉默"],
  ["阿轲", "妲己", 1.07, "背后暴击秒杀"], ["澜", "鲁班七号", 1.07, "潜水切入无位移"],
  ["孙悟空", "伽罗", 1.06, "多段位移近身"], ["镜", "王昭君", 1.06, "镜像突进贴身"],
  ["关羽", "后羿", 1.07, "冲锋切入无位移"], ["关羽", "伽罗", 1.08, "冲锋破后排"],
  ["马超", "鲁班七号", 1.06, "高速切入"],
  // 反制位移射手：捆/控/免伤
  ["老夫子", "公孙离", 1.09, "大招捆位移射手"], ["老夫子", "马可波罗", 1.08, "捆住打断位移"],
  ["老夫子", "孙尚香", 1.07, "捆翻滚"], ["空空儿", "公孙离", 1.07, "抓人打断位移"],
  ["虞姬", "澜", 1.08, "二技能免疫物理"], ["虞姬", "镜", 1.07, "免疫物理爆发"],
  ["虞姬", "韩信", 1.07, "免疫物理突进"],
  // 解控/复活/嘲讽类反打
  ["庄周", "甄姬", 1.07, "大招解控免冰冻"], ["庄周", "王昭君", 1.07, "解控解冰冻"],
  ["庄周", "钟馗", 1.08, "解控防勾"], ["太乙真人", "兰陵王", 1.07, "复活救被切后排"],
  ["白起", "澜", 1.07, "大招嘲讽硬控"], ["张飞", "韩信", 1.06, "变身击退打断"],
  ["项羽", "阿轲", 1.06, "击退破收割"], ["大禹", "马超", 1.06, "治水控场减速"]
];
const HERO_COUNTER_MAP = (() => {
  const m = {};
  HERO_COUNTER_LIST.forEach(([a, b, v]) => { if (!m[a]) m[a] = {}; m[a][b] = v; });
  return m;
})();
function heroCounterMult(aName, bName) {
  const A = HERO_COUNTER_MAP[aName], B = HERO_COUNTER_MAP[bName];
  if (A && A[bName]) return A[bName];                        // 我克制对方
  if (B && B[aName]) return Math.max(0.90, 1 - (B[aName] - 1) * 0.85); // 被对方克制
  return 1;
}
function heroCounterNote(aName, bName) {
  const hit = HERO_COUNTER_LIST.find(([a, b]) => a === aName && b === bName);
  if (hit) return hit[3];
  const back = HERO_COUNTER_LIST.find(([a, b]) => a === bName && b === aName);
  return back ? back[3] : "";
}
// 综合对位：定位克制 × 英雄级克制（可跨分路）
// 存在英雄级克制关系时以它为主（放大 1.6 倍、定位克制只按 0.35 次幂轻叠加），
// 保证「张良罚站李白」这类明确克制不会被刺客克法师的通用关系抵掉。
function matchupMult(atk, def) {
  if (!atk || !def) return 1;
  const arc = counterMult(atk.arc, def.arc);
  const h = heroCounterMult(atk.name, def.name);
  const v = h !== 1 ? Math.pow(arc, 0.35) * (1 + (h - 1) * 1.6) : arc;
  return clamp(v, 0.85, 1.32);
}
function matchupLabel(atk, def) {
  if (!atk || !def) return "均势";
  const v = matchupMult(atk, def);
  return v >= 1.06 ? "克制" : v <= 0.96 ? "被克" : "均势";
}
