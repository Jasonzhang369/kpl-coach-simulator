/* =====================================================================
   KPL主教练：王者之路  v9.1
   v9：修复 gameIndex 自增/选边锁死 · 危险操作二次确认+撤销 · 体能红标与一键轮换
       BP 分路筛选/键盘操作/对手情报 · 局部渲染与底部固定操作条 · 积分榜晋级线
       多存档槽+导入导出 · 难度与名单模式拆分 · 年龄/合同/续约 · 赛中租借
   v9.1：难度改为「只影响对手 BP 水平」（不再乘战力系数）；真实大名单固定按传奇 BP
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

/* ---------------- 工具 ---------------- */
const rand = () => Math.random();
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => Math.random().toString(36).slice(2, 9);
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function ratingForOvr(ovr) { return ovr >= 88 ? "S" : ovr >= 82 ? "A" : ovr >= 75 ? "B" : "C"; }
function priceFor(ovr) { return Math.round((ovr - 58) * 11 + 24); }
// 卖出价：转会费 50%（买入 50% 折价，避免"低买高卖"套利）
function sellPrice(p) { return Math.round(priceFor(p.ovr) * 0.5); }
function ceilFor(rating) { return clamp({ S: 94, A: 87, B: 79, C: 71 }[rating] + randInt(-2, 2), 60, 98); }

/* ---------------- 生成 ---------------- */
function makePlayerFrom(e) {
  // 属性围绕「真实总评」小幅波动（±3~4），保证战力与历史评分一致，不会被随机数改写
  const span = e.ovr >= 82 ? 3 : 4;
  const ceil = clamp(Math.max(ceilFor(e.rating), e.ovr + randInt(0, 2)), 60, 99); // 成长上限至少不低于当前总评
  const r = () => clamp(Math.round(e.ovr + randInt(-span, span)), 45, ceil);
  // 年龄：评分越高的成型选手偏老；合同 2~6 个赛季（3 赛季 = 1 岁；赛季末递减）
  const age = clamp(e.ovr >= 90 ? randInt(20, 28) : e.ovr >= 84 ? randInt(19, 27) : randInt(17, 25), 17, 30);
  return {
    id: uid(), name: e.name, pos: e.pos, rating: e.rating, ovr: e.ovr,
    level: 1, exp: 0, age, contract: randInt(2, 6),
    op: r(), aw: r(), co: r(), me: r(),
    st: clamp(Math.round(e.ovr * 0.95 + randInt(-4, 6)), 55, 100),
    ceil,
    arcPref: choice(posArcPool(e.pos)),
    heroPool: pickHeroes(e.pos, 5),
    status: "ok", statusRounds: 0
  };
}
function pickHeroes(pos, n) {
  // 选手熟练池：主场英雄为主，掺入该选手也会用的高匹配摇摆英雄
  const mainPool = HEROES.filter(h => h.pos === pos).map(h => h.name);
  const flexPool = HEROES.filter(h => h.pos !== pos && laneFit(h, pos) >= 0.85).map(h => h.name);
  const pool = shuffle(mainPool.slice()).concat(shuffle(flexPool.slice()));
  const out = [];
  for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(randInt(0, pool.length - 1), 1)[0]);
  return out;
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = randInt(0, i); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
const FA_SY = ["小", "阿", "大", "老", "子", "青", "新", "夜", "风", "云", "星", "月", "山", "海", "林", "川", "泽", "屿", "晨", "暮"];
const FA_TA = ["星", "月", "阳", "风", "雨", "辰", "帆", "野", "鹿", "鹤", "澜", "舟", "辞", "年", "河", "岚", "川", "潼", "陌", "野"];
function uniqueRookieName(pos) {
  const existing = new Set();
  S.teams.forEach(t => { POS.forEach(p => { t.players[p].forEach(pl => existing.add(pl.name)); }); });
  for (let i = 0; i < 60; i++) { const n = choice(FA_SY) + choice(FA_TA); if (!existing.has(n)) return n; }
  return "新人" + randInt(100, 999);
}
function makeRookie(pos, ovr) {
  // 仅在真实选手池耗尽时的兜底（正常情况下不会出现虚构姓名）
  const o = ovr != null ? clamp(ovr, 55, 90) : randInt(58, 82);
  return makePlayerFrom({ name: uniqueRookieName(pos), pos, rating: ratingForOvr(o), ovr: o });
}
// 从自由身池取一名【真实选手】（用尽时才兜底生成）
function takeFreeAgent(pos) {
  const list = (S && S.freeAgents && S.freeAgents[pos]) || [];
  if (list.length) return makePlayerFrom(list.splice(randInt(0, list.length - 1), 1)[0]);
  return makeRookie(pos);
}
// 把一名选手放回自由身池（后续可被任何战队签走）
function recycleToFreeAgents(p) {
  if (!S || !S.freeAgents) return;
  if (!S.freeAgents[p.pos]) S.freeAgents[p.pos] = [];
  S.freeAgents[p.pos].push({ name: p.name, pos: p.pos, rating: p.rating, ovr: p.ovr });
}
// 分配初始名单：全部使用真实选手，按总评从高到低【蛇形选秀】——
// 每队拿到「一强一弱」两人，各队战力天然接近（靠分配平衡，绝不修改任何选手的评分/属性）。
function assignRosters(names) {
  const byPos = {};
  POS.forEach(pos => { byPos[pos] = shuffle(POOL.filter(p => p.pos === pos).map(p => ({ ...p }))); });
  const leftover = {};
  POS.forEach(pos => leftover[pos] = []);
  const result = {};
  names.forEach(name => { result[name] = {}; POS.forEach(pos => result[name][pos] = []); });

  POS.forEach((pos, pi) => {
    const need = names.length * 2;
    let list = byPos[pos].slice().sort((a, b) => b.ovr - a.ovr);
    // 预留 2 名「中上水平」的选手不参加选秀，作为赛季初转会市场的自由身（否则市场只剩最弱的替补）
    const reserve = list.filter(e => e.ovr >= 78 && e.ovr <= 87);
    const preLeft = [];
    while (preLeft.length < 2 && reserve.length) preLeft.push(reserve.splice(randInt(0, reserve.length - 1), 1)[0]);
    list = list.filter(e => !preLeft.includes(e));
    const take = list.slice(0, need), rest = list.slice(need);
    // 蛇形：0..n-1 拿排名 1..n，n-1..0 拿排名 n+1..2n → 各队两人名次之和几乎相同
    const idxs = names.map((_, i) => i);
    const order = (pi % 2 === 0) ? idxs.concat(idxs.slice().reverse()) : idxs.slice().reverse().concat(idxs);
    order.forEach((teamIdx, i) => { const e = take[i]; if (e) result[names[teamIdx]][pos].push(makePlayerFrom(e)); });
    rest.forEach(e => leftover[pos].push(e));
    preLeft.forEach(e => leftover[pos].push(e));
  });
  names.forEach(n => POS.forEach(pos => {
    while (result[n][pos].length < 2) result[n][pos].push(makePlayerFrom(choice(POOL.filter(p => p.pos === pos))));
    result[n][pos].sort((a, b) => b.ovr - a.ovr); // 首发用更强的
  }));
  POS.forEach(pos => shuffle(leftover[pos]));
  return { result, leftover };
}
function freeAgentEntry(pos) { return choice(POOL.filter(p => p.pos === pos)); }
/* ---------------- 难度 = 对手 BP 水平（不改任何战力/属性） ----------------
   新秀：会犯小错——不读对手英雄池、不针对克制、偶尔拿"舒适英雄"；
         但仍然认分路、仍会挑强度高的英雄（不降智，只是不够细）。
   职业：常规水平——看克制、看自家选手擅长、读阵容前排/输出。
   传奇：近乎最优——几乎总拿最强解，ban 直指你的核心英雄。
   「真实大名单」模式：对手 BP 水平固定按传奇处理（强队 + 强 BP）。 */
const BP_LEVELS = {
  新秀: {
    name: "新秀", noise: 0.24, topN: 5, profW: 0.50, fitW: 0.78, counterW: 0.22,
    compAware: false, banPoolN: 8, banRandom: 0.85, banUseThreat: false, peakTopN: 4
  },
  职业: {
    name: "职业", noise: 0.18, topN: 4, profW: 0.85, fitW: 0.85, counterW: 0.85,
    compAware: true, banPoolN: 4, banRandom: 0.25, banUseThreat: true, peakTopN: 3
  },
  传奇: {
    name: "传奇", noise: 0.08, topN: 2, profW: 1.0, fitW: 1.0, counterW: 0.96,
    compAware: true, banPoolN: 2, banRandom: 0.03, banUseThreat: true, peakTopN: 1
  }
};
function aiBpLevel() {
  if (S && S.rosterMode === "real") return "传奇";     // 真实大名单：BP 按传奇
  const d = S && S.difficulty;
  return BP_LEVELS[d] ? d : "职业";
}
const LANE_PICK_FLOOR = 0.88;   // AI 选将的分路下限（摇摆·常见 0.95 / 摇摆 0.88 才用；逆用直接排除）
function aiBpCfg() { return BP_LEVELS[aiBpLevel()] || BP_LEVELS["职业"]; }
function aiBpLabel() { return aiBpLevel(); }
function posArcPool(pos) {
  return { top: ["fighter", "tank"], jungle: ["assassin", "fighter"], mid: ["mage", "assassin"], bot: ["marksman"], support: ["support", "tank"] }[pos];
}
function makeTeam(name, tier, players) {
  return {
    id: uid(), name, tier, players, lineup: {},
    wins: 0, losses: 0, points: 0,
    // 所有战队（含 AI）起点一致：相同资金、相同声望、相同粉丝量级
    fans: 30000,
    money: 250, trainPoints: 10, streak: 0,
    prestige: 45
  };
}
function initLineup(team) {
  POS.forEach(pos => {
    const best = team.players[pos].slice().sort((a, b) => b.ovr - a.ovr)[0];
    team.lineup[pos] = best.id;
  });
}

/* ---------------- 全局状态 ---------------- */
let S = null;

function newGame(opts) {
  const myName = opts.teamName || choice(TEAMS);
  const rivalNames = TEAMS.filter(t => t !== myName);
  // 两个独立维度：难度（只影响对手战力）与名单模式（平衡选秀 / 真实大名单）
  const diff = (opts.difficulty === "真实") ? "职业" : (opts.difficulty || "职业");
  const rosterMode = opts.rosterMode || (opts.difficulty === "真实" ? "real" : "draft");
  const { result: rosterMap, leftover } = (rosterMode === "real")
    ? buildRealRosters([myName, ...rivalNames])
    : assignRosters([myName, ...rivalNames]);
  const teams = [];
  const myTeam = makeTeam(myName, diff, rosterMap[myName]);
  initLineup(myTeam);
  teams.push(myTeam);
  rivalNames.forEach(n => {
    const t = makeTeam(n, diff, rosterMap[n]);
    initLineup(t);
    teams.push(t);
  });
  // 不再对选手做任何战力加成/削弱：真实评分保持原样，
  // 开局平衡完全靠「蛇形选秀」的分配来完成；难度只影响对手 BP 水平（见 BP_LEVELS）。

  const _sch = buildSchedule(myTeam.id, teams);
  S = {
    version: 9, page: "main", tab: "team", slot: clamp(opts.slot || 1, 1, SLOT_COUNT),
    saveName: String(opts.saveName || "").slice(0, 24),
    difficulty: diff, rosterMode, myTeamId: myTeam.id, season: 1,
    teams, round: 1, maxRegular: 11, phase: "regular",
    schedule: _sch.schedule,
    fixtures: _sch.fixtures,
    trainPoints: 10,
    series: null, bracket: null, pendingPlayoff: null,
    report: null, reportRewards: null, event: null, log: [],
    market: null, freeAgents: leftover,
    transfersUsed: 0, maxTransfers: 3,
    loansUsed: 0, maxLoans: 1, loans: [],
    transferWindow: true, aiTransfers: [], transferSeen: 0,
    fanMeets: 0, maxFanMeets: 2, gameOver: null,
    champion: false, seasonResult: null, history: [],
    contractNotices: [], undo: null, savedAt: Date.now()
  };
  S.maxRegular = S.schedule.length;
  buildMarket();          // 赛季初自动刷新转会市场（赛季内不变）
  maybeEvent();
  save();
  render();
}
// 完整单循环赛程（圆桌法）：返回我的赛程 + 全部对阵
function buildSchedule(myId, teams) {
  const ids = teams.map(t => t.id);
  const rounds = roundRobin(ids);
  const fixtures = rounds.map(r => r.map(([a, b]) => ({ a, b, played: false })));
  const schedule = rounds.map((r, i) => {
    const pair = r.find(p => p[0] === myId || p[1] === myId);
    const oppId = pair[0] === myId ? pair[1] : pair[0];
    return { round: i + 1, oppId, played: false };
  });
  return { schedule, fixtures };
}
function roundRobin(ids) {
  const arr = ids.slice();
  if (arr.length % 2 === 1) arr.push(null); // 奇数补位
  const n = arr.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const round = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      if (a && b) round.push([a, b]);
    }
    rounds.push(round);
    arr.splice(1, 0, arr.pop()); // 固定第一个，其余轮转
  }
  return rounds;
}
// 战队比赛收益（AI 战队与玩家同规则：胜者拿资金/粉丝/声望）
function addTeamPrestige(team, delta, reason) {
  if (!team) return;
  team.prestige = clamp(team.prestige + delta, 0, 100);
  if (Math.abs(delta) >= 0.01) {
    S.log.unshift(`S${S.season}R${S.round} ${team.name} 声望${delta >= 0 ? "+" : ""}${delta}（${reason}）`);
    if (S.log.length > 60) S.log.pop();
  }
}
// 战队比赛收益：与玩家完全同规则（胜 +1.5声望 / 负 -1.2，季后赛胜 +3 / 负 -2）
function awardTeamMatch(team, win, playoff) {
  if (!team) return null;
  const mul = playoff ? 1.8 : 1;
  const money = Math.round((win ? randInt(32, 68) : randInt(9, 23)) * mul);
  const fans = Math.round((win ? randInt(4000, 11000) : -randInt(800, 3500)) * (1 + team.prestige / 150));
  team.money += money;
  team.fans = Math.max(1000, team.fans + fans);
  addTeamPrestige(team, win ? (playoff ? 3 : 1.5) : (playoff ? -2 : -1.2), playoff ? (win ? "季后赛胜利" : "季后赛失利") : (win ? "系列赛胜利" : "系列赛失利"));
  return { money, fans };
}
// 赛季结算：其他战队与玩家同规则（进季后赛 +3、无缘季后赛 -8、冠军 +15、亚军 +4）
function finalizeAiPrestige() {
  if (!S || !S.teams) return;
  // 没进季后赛（我未进四强）时没有 bracket，需要按常规赛积分榜取前四，否则会把四强也扣 -8
  let top4 = (S.bracket && S.bracket.order) || [];
  if (!top4.length) {
    top4 = standingsSorted().slice(0, 4).map(t => t.id);
  }
  const gf = S.bracket && S.bracket.resolved && S.bracket.resolved.gf;
  const champId = S.champion ? S.myTeamId : (gf ? gf.winner : null);
  const runnerId = gf ? gf.loser : null;
  S.teams.forEach(t => {
    if (t.id === S.myTeamId) return; // 玩家已按原有规则结算
    let d = top4.includes(t.id) ? 3 : -8;
    if (champId && t.id === champId) d = 15;
    else if (runnerId && t.id === runnerId) d = 4;
    addTeamPrestige(t, d, d > 0 ? (d >= 15 ? "总冠军" : d === 4 ? "亚军" : "晋级季后赛") : "无缘季后赛");
  });
}
// 结算某轮中「非我方」的对阵（其他战队也比赛，保证场次一致）
// 一套"BP 阵容"：按分路取选手擅长英雄。
// ownUsed = 本系列赛本队已用（近似全局BP）；takenNow = 本局对方已选（同一局双方不能重复）。
// 注意：local 会随生成立即更新，保证同一条阵容内部 5 个英雄互不重复。
function aiSeriesLineup(team, ownUsed, takenNow) {
  const local = (ownUsed || []).slice().concat(takenNow || []);
  return POS.map(pos => {
    const p = getPlayer(team, team.lineup[pos]);
    if (!p) return "—";
    const own = (p.heroPool || []).filter(h => heroByName(h));
    let pick = choice(own.filter(h => !local.includes(h))) || null;
    if (!pick) {
      // 兜底：先用本分路匹配的英雄，再退到全部英雄（都排除已用，避免重复）
      const laneCand = HEROES.filter(h => laneFit(h, pos) >= 1 && !local.includes(h.name));
      const anyCand = HEROES.filter(h => !local.includes(h.name));
      pick = laneCand.length ? choice(laneCand).name
        : anyCand.length ? choice(anyCand).name
        : (own.find(h => !local.includes(h)) || "—");
    }
    if (pick && pick !== "—") local.push(pick);
    return pick || "—";
  });
}
// 模拟 AI vs AI 的 BO 系列赛：返回比分与每局双方阵容
function simAiSeries(aTeam, bTeam, bestOf) {
  const need = Math.ceil(bestOf / 2);
  let sa = 0, sb = 0, guard = 0;
  const games = [], usedA = [], usedB = [];
  while (sa < need && sb < need && guard++ < 20) {
    const pa = teamPower(aTeam), pb = teamPower(bTeam);
    const pWinA = 1 / (1 + Math.pow(10, (pb - pa) / 22));
    const aWin = rand() < clamp(pWinA + (rand() - 0.5) * 0.12, 0.05, 0.95);
    // BO7 打到 3:3 → 第 7 局为巅峰对决：不受全局BP限制、双方可撞英雄
    const isPeak = bestOf === 7 && sa === 3 && sb === 3 && games.length === 6;
    let luA, luB;
    if (isPeak) {
      luA = aiPeakPicks(aTeam).map(e => e.hero);
      luB = aiPeakPicks(bTeam).map(e => e.hero);
    } else {
      luA = aiSeriesLineup(aTeam, usedA, []);
      luB = aiSeriesLineup(bTeam, usedB, luA.filter(h => h !== "—")); // 同一局双方英雄也不同
      luA.forEach(h => { if (h !== "—") usedA.push(h); });
      luB.forEach(h => { if (h !== "—") usedB.push(h); });
    }
    games.push({ aWin, luA, luB, peak: isPeak });
    if (aWin) sa++; else sb++;
  }
  return { sa, sb, games };
}
// 结算某轮中「非我方」的对阵（其他战队也比赛，保证场次一致；记录比分与阵容）
function simRoundAIFixtures(round) {
  const fx = (S.fixtures || [])[round - 1];
  if (!fx) return;
  const bestOf = S.phase === "playoff" ? 7 : 5;
  fx.forEach(f => {
    if (f.played) return;
    if (f.a === S.myTeamId || f.b === S.myTeamId) return; // 我的比赛由玩家打
    const A = S.teams.find(t => t.id === f.a), B = S.teams.find(t => t.id === f.b);
    if (!A || !B) { f.played = true; return; }
    const r = simAiSeries(A, B, bestOf);
    f.sa = r.sa; f.sb = r.sb; f.games = r.games; f.played = true;
    const aWin = r.sa > r.sb;
    const wt = aWin ? A : B, lt = aWin ? B : A;
    wt.wins++; wt.points += 2; wt.streak++;
    lt.losses++; lt.streak = 0;
    awardTeamMatch(wt, true, S.phase === "playoff");
    awardTeamMatch(lt, false, S.phase === "playoff");
  });
}

/* ---------------- 计算 ---------------- */
function counterMult(atkArc, defArc) { return (COUNTER[atkArc] && COUNTER[atkArc][defArc]) || 1.0; }
function counterLabel(atkArc, defArc) {
  if (counterMult(atkArc, defArc) > 1) return "克制";
  if (counterMult(defArc, atkArc) > 1) return "被克";
  return "均势";
}
function heroByName(name) { return HEROES.find(h => h.name === name); }
function heroStrength(h) { return (h.o + h.s + h.c + h.m) / 4; }
function getPlayer(team, id) { for (const pos of POS) for (const p of team.players[pos]) if (p.id === id) return p; return null; }
function getMyTeam() { return (S && S.teams) ? S.teams.find(t => t.id === S.myTeamId) : null; }
function teamName(id) { const t = S.teams.find(x => x.id === id); return t ? t.name : "?"; }
function statusMul(p) { return p.status === "hot" ? 1.12 : p.status === "low" ? 0.90 : 1.0; }
function statusLabel(p) {
  return { ok: ["status-ok", "正常"], hot: ["status-hot", "火热"], low: ["status-low", "低迷"], inj: ["status-inj", "伤病"] }[p.status] || ["status-ok", "正常"];
}
/* ---------------- 体能 ---------------- */
const GAME_STAMINA_COST = 5;   // 每局消耗（原 6，连续 BO5 必见底）
const REST_STAMINA_GAIN = 14;  // 全队休息（2 训练点）
const ROUND_STAMINA_GAIN = 8;  // 每轮自然恢复
const STAMINA_FLOOR = 35;
function staminaLevel(p) { return p.st <= 45 ? "crit" : p.st <= 60 ? "low" : ""; }
function staminaTagHtml(p) {
  const lv = staminaLevel(p);
  if (!lv) return "";
  return `<span class="st-tag ${lv}" aria-label="体能${lv === "crit" ? "告急" : "偏低"}">${lv === "crit" ? "体力告急" : "体能偏低"} ${Math.round(p.st)}</span>`;
}
// 选手当前综合价值（用于轮换比较）
function lineupValue(p) { return p.op * 0.30 + p.aw * 0.25 + p.co * 0.20 + p.me * 0.10 + p.st * 0.15; }
// 一键轮换建议：伤停必换；体能过低且替补明显更能跑时轮换（弱不超过 8 总评）
function rotationSuggest(team) {
  const out = [];
  POS.forEach(pos => {
    const cur = getPlayer(team, team.lineup[pos]);
    if (!cur) return;
    const bench = team.players[pos].filter(p => p.id !== cur.id && !(p.status === "inj" && p.statusRounds > 0));
    if (!bench.length) return;
    const best = bench.slice().sort((a, b) => lineupValue(b) - lineupValue(a))[0];
    if (cur.status === "inj" && cur.statusRounds > 0) { out.push({ pos, from: cur, to: best, reason: "伤停" }); return; }
    if (cur.st <= 55 && best.st >= cur.st + 12 && best.ovr >= cur.ovr - 8) { out.push({ pos, from: cur, to: best, reason: `体能 ${Math.round(cur.st)}→${Math.round(best.st)}` }); return; }
    if (cur.status === "low" && best.ovr >= cur.ovr - 2 && best.st >= 60) { out.push({ pos, from: cur, to: best, reason: "低迷换人" }); }
  });
  return out;
}
function applyRotation(auto) {
  const t = getMyTeam();
  const sug = rotationSuggest(t);
  if (!sug.length) { toast("无需轮换：首发体能充足、状态正常"); return; }
  if (!auto) {
    confirmDialog({
      title: "一键轮换建议",
      body: sug.map(x => `<div>• <b>${POS_NAME[x.pos]}</b>：${escapeHtml(x.from.name)} → <b style="color:var(--gold)">${escapeHtml(x.to.name)}</b>（${escapeHtml(x.reason)}）</div>`).join(""),
      okText: "按建议轮换"
    }).then(ok => { if (ok) applyRotation(true); });
    return;
  }
  snapshot("一键轮换");
  sug.forEach(x => { t.lineup[x.pos] = x.to.id; });
  S.log.unshift(`S${S.season}R${S.round} 轮换：${sug.map(x => `${POS_NAME[x.pos]}${x.from.name}→${x.to.name}`).join("、")}`);
  toast(`已轮换 ${sug.length} 个位置`);
  save(); render();
}
function posPower(p, hero, oppHero, tactic, pos) {
  if (!p || !hero || !oppHero) return 0;
  if (p.status === "inj" && p.statusRounds > 0) return 0;
  const attrPower = p.op * 0.30 + p.aw * 0.25 + p.co * 0.20 + p.me * 0.10 + p.st * 0.15;
  const hs = heroStrength(hero) / 100;
  const proficient = p.heroPool.includes(hero.name) ? 1.12 : 0.95; // 选手是否擅长该英雄
  const fit = pos != null ? laneFit(hero, pos) : 1.0;              // 英雄与分路匹配度（不匹配掉战斗力）
  const counter = matchupMult(hero, oppHero); // 定位克制 × 英雄级克制（可跨分路）
  const tacticMul = tactic === "攻" ? 1.05 : tactic === "奇" ? 1.03 : 1.0;
  return attrPower * (0.6 + hs * 0.5) * proficient * fit * counter * statusMul(p) * tacticMul * (0.92 + rand() * 0.16);
}
function teamPower(team) {
  let tot = 0;
  POS.forEach(pos => {
    const p = getPlayer(team, team.lineup[pos]);
    if (!p || p.status === "inj") return;
    tot += (p.op * 0.3 + p.aw * 0.25 + p.co * 0.2 + p.me * 0.1 + p.st * 0.15) * POS_WEIGHT[pos];
  });
  return tot;
}
function simAI(idA, idB) {
  const a = S.teams.find(t => t.id === idA), b = S.teams.find(t => t.id === idB);
  const pa = teamPower(a), pb = teamPower(b);
  return pa + rand() * 20 >= pb + rand() * 20 ? idA : idB;
}

/* ---------------- BP 官方规则（四阶段，每方5个ban） ----------------
   阶段一 禁用：蓝→红→蓝→红（4）
   阶段二 选择：蓝→红 红→蓝 蓝→红（6）
   阶段三 禁用：红→蓝→红→蓝→红→蓝（6）
   阶段四 选择：红→蓝 蓝→红（4）
   合计 10 ban（每方5）+ 10 选将（每方5） */
function buildDraftSteps() {
  const s = [];
  ["blue", "red", "blue", "red"].forEach(a => s.push({ actor: a, type: "ban" }));                 // 阶段一
  ["blue", "red", "red", "blue", "blue", "red"].forEach(a => s.push({ actor: a, type: "pick" }));   // 阶段二
  ["red", "blue", "red", "blue", "red", "blue"].forEach(a => s.push({ actor: a, type: "ban" }));    // 阶段三
  ["red", "blue", "blue", "red"].forEach(a => s.push({ actor: a, type: "pick" }));                  // 阶段四
  return s;
}
function aiSide(d) { return d.mySide === "blue" ? "red" : "blue"; }

/* ---------------- 巅峰对决（BO7 打到 3:3 时的第 7 局） ----------------
   官方规则：无 ban、双方盲选、不受全局 BP 影响（此前用过的英雄仍可选）、
   双方甚至可以选到同一个英雄。
   实现：进入本局时先决定 AI 的 5 个英雄但隐藏（盲选），玩家填满 5 个后立即揭示并开打。 */
function isPeakGame(s) {
  return !!(s && s.kind === "playoff" && s.bestOf === 7 && s.myScore === 3 && s.opScore === 3 &&
    (s.games || []).length === 6);
}
function peakHeroScore(h, pos, team) {
  const starter = getPlayer(team, team.lineup[pos]);
  const prof = starter && starter.heroPool.includes(h.name) ? 1.12 : 0.95;
  return heroStrength(h) * prof * laneFit(h, pos);
}
// AI 的巅峰对决盲选阵容（每个分路取较优解，同队内不重复；盲选质量同样随 BP 难度变化）
function aiPeakPicks(team) {
  const topN = (aiBpCfg() || {}).peakTopN || 2;
  return POS.map(pos => {
    const list = HEROES.filter(h => h.pos === pos).slice()
      .sort((a, b) => peakHeroScore(b, pos, team) - peakHeroScore(a, pos, team));
    const pick = list[randInt(0, Math.min(topN - 1, list.length - 1))] || list[0];
    return { pos, hero: pick ? pick.name : "—" };
  });
}
// 玩家侧一键选人（巅峰对决专用：不受全局 BP 限制）
function myPeakAutoPick(pos) {
  if (!autoBpAllowed()) return null;
  const myT = getMyTeam();
  const list = HEROES.filter(h => h.pos === pos).slice()
    .sort((a, b) => peakHeroScore(b, pos, myT) - peakHeroScore(a, pos, myT));
  if (!list.length) return null;
  const n = Math.max(1, Math.min(3, list.length));
  return list[randInt(0, n - 1)].name;
}
// 揭示对手盲选并开打（双方阵容都已就绪）
function finishPeakDraft() {
  const s = S.series, d = s.draft;
  d.picks[aiSide(d)] = (d.peakAi || aiPeakPicks(S.teams.find(t => t.id === s.oppId))).slice();
  d.over = true; d.phase = "done";
  simGame();
}function sideName(s) { return s === "blue" ? "蓝方" : "红方"; }
function filledPos(d, side) { return d.picks[side].map(e => e.pos); }
/* ---------------- 全局BP：以【战队】为单位记录已用英雄（与红蓝方完全无关） ----------------
   阵营（蓝/红）每局都会互换，因此英雄归属只按 teamId 存，绝不按 side 存。
   usedByTeam = { [teamId]: ["英雄", ...] }                                        */
function seriesTeamUsed(teamId) {
  const s = S.series;
  if (!s.usedByTeam) s.usedByTeam = {};
  if (!s.usedByTeam[teamId]) s.usedByTeam[teamId] = [];
  return s.usedByTeam[teamId];
}
function myUsed() { return seriesTeamUsed(S.myTeamId); }
function oppUsed() { return seriesTeamUsed(S.series.oppId); }
// 阵营 → 战队：阵营每局变，战队不变
function teamIdOfSide(side) { const s = S.series; return side === s.draft.mySide ? S.myTeamId : s.oppId; }
function usedOfSide(side) { return seriesTeamUsed(teamIdOfSide(side)); }
function usedOfOtherSide(side) { const s = S.series; return seriesTeamUsed(teamIdOfSide(side) === S.myTeamId ? s.oppId : S.myTeamId); }
// 全局BP已用英雄（合并，仅供展示）
function allUsedHeroes() { return Array.from(new Set(myUsed().concat(oppUsed()))); }
// 选将池：只排除「本战队」用过的英雄；对方用过的我方仍可选用
function availPickHeroes(side) {
  const own = usedOfSide(side);
  return HEROES.filter(h => !own.includes(h.name) && !S.series.draft.used.includes(h.name));
}
function availHeroes() { return availPickHeroes(S.series.draft.mySide); }
// ban位池：只去掉「对方战队」用过的英雄（本队用过的仍可 ban，只是不能选）
function availBanHeroes(forMySide) {
  const otherUsed = forMySide ? oppUsed() : myUsed();
  return HEROES.filter(h => !otherUsed.includes(h.name) && !S.series.draft.used.includes(h.name));
}
function currentStep() {
  const d = S.series.draft;
  return d.stepIndex < d.steps.length ? d.steps[d.stepIndex] : null;
}
function currentActor() { const st = currentStep(); return st ? st.actor : null; }
/* 我值多少分（用于 AI 判断该 ban 谁）：我在哪个分路拿到这个英雄最赚 */
function myThreatScore(h) {
  const my = getMyTeam();
  if (!my || !h) return 0;
  let best = 0;
  POS.forEach(pos => {
    const p = getPlayer(my, my.lineup[pos]);
    if (!p) return;
    const prof = p.heroPool.includes(h.name) ? 1.12 : 0.95;
    const sc = heroStrength(h) * prof * laneFit(h, pos) * (POS_WEIGHT[pos] || 1);
    if (sc > best) best = sc;
  });
  return best;
}
// AI 的 ban：难度决定「是否读我的英雄池 / 是否针对我的核心」
//  新秀：约一半回合根本不看我会什么，只按当前版本强度 ban；另一半才看威胁，且候选范围很宽
//  职业：按我对每个英雄的威胁值排序，在前 4 里挑
//  传奇：几乎总是直接 ban 我的第一核心
function aiBanHero() {
  const cfg = aiBpCfg();
  const pool = availBanHeroes(false);          // 去掉我方战队已用过的（对 AI 而言是对方）
  if (!pool.length) return null;
  const byStrength = pool.slice().sort((a, b) => heroStrength(b) - heroStrength(a));
  const byThreat = pool.map(h => ({ h, sc: myThreatScore(h) })).sort((a, b) => b.sc - a.sc).map(x => x.h.name);
  if (!cfg.banUseThreat) {
    // 新秀：一半回合只按版本强度 ban（不看我会什么）；另一半"凭印象"针对，但只在最扎眼的 3 个里挑
    if (rand() < 0.5) {
      const n = Math.max(1, Math.min(3, byThreat.length));
      return byThreat[randInt(0, n - 1)];
    }
    const n = Math.max(1, Math.min(cfg.banPoolN, byStrength.length));
    return byStrength[randInt(0, n - 1)].name;
  }
  const n = Math.max(1, Math.min(cfg.banPoolN, byThreat.length));
  const idx = (rand() < cfg.banRandom) ? randInt(0, n - 1) : 0;
  return byThreat[idx];
}
// AI 读阵容：缺前排/缺输出/缺控制时，优先补对应定位（仅职业/传奇）
function aiCompFactor(d, side, hero) {
  const picks = d.picks[side].map(e => heroByName(e.hero)).filter(Boolean);
  const front = picks.filter(h => h.arc === "tank" || h.arc === "support").length;
  const dmg = picks.filter(h => ["mage", "marksman", "assassin", "fighter"].includes(h.arc)).length;
  const cc = picks.filter(h => h.c >= 70).length;
  let f = 1;
  if (front < 2 && (hero.arc === "tank" || hero.arc === "support")) f *= 1.08;
  if (dmg < 3 && ["mage", "marksman", "assassin", "fighter"].includes(hero.arc)) f *= 1.05;
  if (cc < 2 && hero.c >= 70) f *= 1.05;
  return f;
}
function aiPickTurn(st) {
  const s = S.series, d = s.draft, side = st.actor;
  const aiTeam = S.teams.find(t => t.id === s.oppId);
  const cfg = aiBpCfg();
  const filled = filledPos(d, side);
  const unfilled = POS.filter(p => !filled.includes(p));
  const pool = availPickHeroes(side);
  const cands = [];
  unfilled.forEach(pos => {
    const starter = getPlayer(aiTeam, aiTeam.lineup[pos]);
    const enemy = (d.picks[d.mySide] || []).find(e => e.pos === pos);
    const enemyHero = enemy ? heroByName(enemy.hero) : null;
    // 底线：AI 不会把英雄塞到明显不适合的分路（摇摆·常见及以上才考虑），
    // 只有整个分路池都被 BP 吃光时才放宽——保证「低难度也不降智」。
    const laneOk = pool.filter(h => laneFit(h, pos) >= LANE_PICK_FLOOR);
    const usePool = laneOk.length ? laneOk : pool;
    usePool.forEach(h => {
      const prof = starter && starter.heroPool.includes(h.name) ? 1.12 : 0.95;
      const fit = laneFit(h, pos);
      const counter = enemyHero ? matchupMult(h, enemyHero) : 1;
      let sc = heroStrength(h);
      sc *= 1 + (prof - 1) * cfg.profW;        // 选手擅长（新秀权重低）
      sc *= 1 - (1 - fit) * cfg.fitW;          // 分路匹配（新秀容忍度高一点）
      sc *= 1 + (counter - 1) * cfg.counterW;  // 克制对手（新秀基本不读）
      if (cfg.compAware) sc *= aiCompFactor(d, side, h);
      sc *= 1 + cfg.noise * (rand() * 2 - 1);  // 判断噪声 = 失误率
      cands.push({ pos, hero: h, sc });
    });
  });
  if (!cands.length) return;
  cands.sort((a, b) => b.sc - a.sc);
  const n = Math.max(1, Math.min(cfg.topN, cands.length));
  const pick = cands[randInt(0, n - 1)];
  d.picks[side].push({ pos: pick.pos, hero: pick.hero.name });
  d.used.push(pick.hero.name);
}
function runDraftAI() {
  const d = S.series.draft;
  if (d.peak) return; // 巅峰对决：双方盲选，没有 AI 回合可跑
  let guard = 0;
  while (guard++ < 200 && d.stepIndex < d.steps.length) {
    const st = d.steps[d.stepIndex];
    if (st.actor === d.mySide) break;
    if (st.type === "ban") { const hn = aiBanHero(); if (hn) { d.bans[st.actor].push(hn); d.used.push(hn); } }
    else aiPickTurn(st);
    d.stepIndex++;
  }
  if (d.stepIndex >= d.steps.length) { d.over = true; d.phase = "done"; }
}
function afterDraftAction() {
  runDraftAI();
  const d = S.series.draft;
  if (d.stepIndex >= d.steps.length) { d.over = true; d.phase = "done"; simGame(); } // 计算战力，进入战前预览
  save(); render();
}
function draftBan(hn) {
  const s = S.series, d = s.draft;
  const st = currentStep();
  if (!st || st.actor !== d.mySide || st.type !== "ban") return;
  if (d.used.includes(hn) || oppUsed().includes(hn)) return; // 本队用过的仍可ban；对方战队用过的已从ban池移除
  d.bans[d.mySide].push(hn); d.used.push(hn); d.stepIndex++;
  afterDraftAction();
}
function draftPick(pos, hn) {
  const s = S.series, d = s.draft;
  if (d.peak) {
    // 巅峰对决：不受全局 BP 限制（此前用过的英雄仍可选），双方可撞英雄；但本队内不能重复
    if (d.over) return;
    if (filledPos(d, d.mySide).includes(pos)) return;
    if (!heroByName(hn)) return;
    if (d.picks[d.mySide].some(e => e.hero === hn)) return;
    d.picks[d.mySide].push({ pos, hero: hn });
    if (d.picks[d.mySide].length >= 5) finishPeakDraft();
    save(); render();
    return;
  }
  const st = currentStep();
  if (!st || st.actor !== d.mySide || st.type !== "pick") return;
  if (filledPos(d, d.mySide).includes(pos)) return;
  const h = heroByName(hn);
  if (!h || d.used.includes(hn) || myUsed().includes(hn)) return; // 只锁「本战队」用过的英雄；对方用过的仍可选用（英雄不分区）
  d.picks[d.mySide].push({ pos, hero: hn }); d.used.push(hn); d.stepIndex++;
  afterDraftAction();
}

/* ---------------- 单局模拟 ---------------- */
function simGame() {
  const s = S.series, d = s.draft;
  const myT = getMyTeam(), opp = S.teams.find(t => t.id === s.oppId);
  const myPicks = {}, oppPicks = {};
  d.picks[d.mySide].forEach(e => myPicks[e.pos] = e.hero);
  d.picks[aiSide(d)].forEach(e => oppPicks[e.pos] = e.hero);
  let myTotal = 0, oppTotal = 0; const posDetail = {};
  POS.forEach(pos => {
    const mp = getPlayer(myT, myT.lineup[pos]);
    const op = getPlayer(opp, opp.lineup[pos]);
    const mh = heroByName(myPicks[pos]) || heroByName(mp.heroPool[0]);
    const oh = heroByName(oppPicks[pos]) || heroByName(op.heroPool[0]);
    const mpow = posPower(mp, mh, oh, d.tactic, pos) * POS_WEIGHT[pos];
    const opow = posPower(op, oh, mh, d.tactic, pos) * POS_WEIGHT[pos];
    myTotal += mpow; oppTotal += opow;
    posDetail[pos] = { mpow, opow, mh: mh.name, oh: oh.name, counter: matchupMult(mh, oh) };
  });
  const myCo = POS.reduce((a, p) => a + getPlayer(myT, myT.lineup[p]).co, 0) / 5;
  const opCo = POS.reduce((a, p) => a + getPlayer(opp, opp.lineup[p]).co, 0) / 5;
  myTotal *= (1 + (myCo - 70) / 400); oppTotal *= (1 + (opCo - 70) / 400);
  // 英雄组合/体系加成
  const cb = comboBonus(Object.values(myPicks));
  const ocb = comboBonus(Object.values(oppPicks));
  myTotal *= cb.mult; oppTotal *= ocb.mult;
  // 阵容 & 战术合理性判定（在胜率计算之前应用，真正影响战力与结果）
  const myComp = evaluateComp(myPicks, d.tactic);
  const oppComp = evaluateComp(oppPicks, "稳");
  myTotal *= myComp.mult; oppTotal *= oppComp.mult;
  const scale = 22;
  // 难度不再影响战力：双方战力完全由选手属性 / 英雄强度 / 阵容判定决定，
  // 难度只体现在对手的 BP 水平（ban 是否针对、选将是否读克制与阵容）——见 aiBpCfg()。
  const pWin = 1 / (1 + Math.pow(10, (oppTotal - myTotal) / scale));
  const variance = d.tactic === "稳" ? 0.08 : d.tactic === "攻" ? 0.16 : 0.12;
  const pw = clamp(pWin + (rand() - 0.5) * variance, 0.05, 0.95);
  const myWin = rand() < pw;
  // 虚拟战斗：局内1分钟=现实1秒。时长与双方战力差相关（势均力敌更长、一边倒更短），但不绝对
  const closeness = 1 - Math.abs(pWin - 0.5) * 2; // 1=势均力敌，0=一边倒
  let durRaw = 8 + closeness * 17 + randInt(-4, 5);
  // 意外：约22%概率打破正相关（均势速败 / 一边倒却拖长）
  if (rand() < 0.22) durRaw += (rand() < 0.5 ? -randInt(4, 8) : randInt(4, 10));
  const duration = clamp(Math.round(durRaw), 6, 35);
  const noise = [];
  for (let i = 0; i < duration; i++) noise.push((rand() - 0.5) * 0.10);
  s.battle = {
    myWin, duration, minute: 0, lines: [], done: false, pWin, noise, swing: 0, surprises: [],
    myTotal, oppTotal, myPicks, oppPicks, posDetail, mySide: d.mySide, tactic: d.tactic,
    combos: cb.hits, oppCombos: ocb.hits, comboMult: cb.mult, oppComboMult: ocb.mult,
    myComp, oppComp, peak: !!d.peak
  };
  s.sub = "preview"; // 先出战力计算，等玩家点「开始比赛」
}
// 阵容 & 战术合理性：返回档位/分数/建议/战力系数
function evaluateComp(picks, tactic) {
  const heroes = POS.map(p => heroByName(picks[p])).filter(Boolean);
  if (heroes.length < 5) return { tier: "—", score: 0, tips: ["阵容未完成"], mult: 1, fitAvg: 0 };
  const fitAvg = POS.reduce((a, p) => a + (picks[p] ? laneFit(heroByName(picks[p]), p) : 0), 0) / 5;
  const arcs = heroes.map(h => h.arc);
  const frontline = arcs.filter(a => a === "tank" || a === "support").length;
  const damage = arcs.filter(a => a === "mage" || a === "marksman" || a === "assassin" || a === "fighter").length;
  const cc = heroes.filter(h => h.c >= 70).length;
  let score = 55; const tips = [];
  if (fitAvg >= 0.97) { score += 15; tips.push("分路匹配到位"); }
  else if (fitAvg >= 0.90) { score += 8; }
  else { score -= 12; tips.push("有英雄逆用/生疏，战力受损"); }
  if (frontline >= 2) { score += 12; tips.push("前排充足，团战能扛"); }
  else if (frontline === 1) { score += 3; tips.push("前排偏少"); }
  else { score -= 15; tips.push("缺少坦克/辅助，团战易崩"); }
  if (damage >= 3) score += 8; else { score -= 10; tips.push("输出点偏少"); }
  if (cc >= 2) { score += 8; tips.push("控制链完整"); } else { score -= 5; tips.push("控制不足"); }
  if (tactic === "攻") { if (damage >= 3) { score += 6; tips.push("激进战术契合高输出阵容"); } else { score -= 6; tips.push("激进但输出不足，易被打回"); } }
  else if (tactic === "稳") { if (frontline >= 2) { score += 6; tips.push("稳健战术契合有前排阵容"); } else { score -= 6; tips.push("稳健但缺前排，守不住"); } }
  else if (tactic === "奇") { if (arcs.includes("assassin")) { score += 6; tips.push("奇袭契合刺客/切入阵容"); } else { score -= 4; } }
  score = clamp(Math.round(score), 0, 100);
  const tier = score >= 85 ? "优" : score >= 70 ? "良" : score >= 55 ? "中" : "差";
  const mult = score >= 85 ? 1.03 : score >= 70 ? 1.01 : score >= 55 ? 1.0 : 0.96;
  return { tier, score, tips, mult, fitAvg };
}

/* ---------------- 虚拟战斗过程 ---------------- */
function startBattleTick() {
  const s = S.series;
  if (s._battleTimer) clearInterval(s._battleTimer);
  s._battleTimer = setInterval(() => {
    if (!S.series || S.series.sub !== "battle" || !S.series.battle) { clearInterval(s._battleTimer); s._battleTimer = null; return; }
    battleTick();
  }, 1000);
}
function battleTick() {
  const s = S.series, b = s.battle;
  if (!b || b.done) return;
  b.minute++;
  // 意外事件（第2分钟起有概率触发）
  if (b.minute >= 2 && rand() < 0.16) {
    const sp = makeSurprise(b);
    if (sp) {
      b.swing = clamp(b.swing + sp.swing, -0.35, 0.35);
      b.lines.push({ text: `⚡ ${sp.text}`, surprise: true });
      b.surprises.push(sp.text);
    }
  }
  b.lines.push({ text: genBattleLine(b), surprise: false });
  if (b.minute >= b.duration) { finishBattle(); return; }
  patchBattle(); // 局部更新，避免整页重绘造成滚动/按钮跳动
}
function finishBattle() {
  const s = S.series, b = s.battle;
  if (!b) return;
  if (s._battleTimer) { clearInterval(s._battleTimer); s._battleTimer = null; }
  b.done = true;
  commitGame(b);
}
function commitGame(b) {
  const s = S.series;
  if (b.myWin) s.myScore++; else s.opScore++;
  s.games.push({
    mySide: b.mySide, myPicks: b.myPicks, oppPicks: b.oppPicks, winner: b.myWin ? "me" : "opp",
    posDetail: b.posDetail, myTotal: b.myTotal, oppTotal: b.oppTotal, combos: b.combos, oppCombos: b.oppCombos,
    peak: !!b.peak
  });
  // 全局BP归属：按【战队】记（与红蓝方无关）。巅峰对决不受全局BP影响，本局英雄不写入已用池
  if (!b.peak) {
    Object.values(b.myPicks).forEach(h => { if (h) { const arr = seriesTeamUsed(S.myTeamId); if (!arr.includes(h)) arr.push(h); } });
    Object.values(b.oppPicks).forEach(h => { if (h) { const arr = seriesTeamUsed(s.oppId); if (!arr.includes(h)) arr.push(h); } });
  }
  // 局内影响：体力下降 + 状态漂移
  const myT = getMyTeam();
  POS.forEach(pos => {
    const p = getPlayer(myT, myT.lineup[pos]);
    if (!p) return;
    p.st = clamp(p.st - GAME_STAMINA_COST, STAMINA_FLOOR, 100);
    if (p.status === "ok" && rand() < 0.08) { if (rand() < 0.5) { p.status = "hot"; p.statusRounds = 2; } else { p.status = "low"; p.statusRounds = 1; } }
  });
  // 败方选边权（下一局红蓝方由败方决定）
  s.nextSideBy = b.myWin ? "opp" : "me";
  const need = Math.ceil(s.bestOf / 2);
  if (s.myScore >= need || s.opScore >= need) {
    s.sub = "over";
    const win = s.myScore > s.opScore;
    const phaseMul = s.kind === "playoff" ? 2 : 1;
    s.rewards = {
      money: Math.round((win ? randInt(42, 98) : randInt(7, 28)) * phaseMul),
      fans: Math.round((win ? randInt(5000, 15000) : -randInt(1000, 6000)) * (1 + myT.prestige / 150)),
      win
    };
  } else {
    if (s.nextSideBy === "opp") s.nextSide = rand() < 0.5 ? "blue" : "red"; // AI（败方）自动选边
    s.sub = "result";
  }
  save(); render();
}
// 意外事件：随机触发，制造局势反转（不提前剧透结果）
const SURPRISES = [
  { id: "stealTyrant", w: 12, min: 2, swing: 0.13, txt: (c) => `${c.who === "me" ? "我方" : "对手"}${c.hero} 惩戒抢下暴君！${c.who === "me" ? "拿到增益，节奏起飞" : "被抢，我方节奏被打断"}` },
  { id: "stealLord", w: 10, min: 8, swing: 0.18, txt: (c) => `${c.who === "me" ? "我方" : "对手"}抢下主宰！${c.who === "me" ? "三路兵线压制，直推高地" : "主宰丢失，我方被迫守家"}` },
  { id: "ace", w: 9, min: 4, swing: 0.22, txt: (c) => `${c.who === "me" ? "我方" : "对手"}一波团灭对方五人（ACE）！${c.who === "me" ? "顺势推掉中路二塔" : "我方只剩两人守家"}` },
  { id: "backdoor", w: 6, min: 10, swing: 0.16, txt: (c) => `${c.who === "me" ? "我方" : "对手"}${c.hero} 单人偷家，直拆水晶！${c.who === "me" ? "对手回防不及" : "我方回防及时才守住"}` },
  { id: "popoff", w: 11, min: 3, swing: 0.12, txt: (c) => `${c.who === "me" ? "我方" : "对手"}${c.hero} 手感爆棚，靠${c.skill}连续收割，打出一波小高潮` },
  { id: "throw", w: 9, min: 5, swing: -0.15, txt: (c) => `${c.who === "me" ? "我方" : "对手"}核心位走位失误被秒，${c.who === "me" ? "我方" : "对手"}丢掉关键资源` },
  { id: "hold", w: 7, min: 12, swing: 0.14, txt: (c) => `水晶前${c.who === "me" ? "我方" : "对手"}成功守家，反打一波，硬生生把节奏拖了回来` },
  { id: "stormSteal", w: 5, min: 20, swing: 0.20, txt: (c) => `风暴龙王团：${c.who === "me" ? "我方" : "对手"}拿下风暴龙王，一波终结比赛` }
];
function rollSurprise(b) {
  const m = b.minute;
  const pool = SURPRISES.filter(s => m >= s.min);
  if (!pool.length) return null;
  const total = pool.reduce((a, s) => a + s.w, 0);
  let r = rand() * total;
  for (const s of pool) { r -= s.w; if (r <= 0) return s; }
  return null;
}
function makeSurprise(b) {
  const s = rollSurprise(b);
  if (!s) return null;
  // 受益方：偏向最终赢家，但也有意外（约30%反向）
  const towardWinner = rand() < 0.7;
  const who = towardWinner ? (b.myWin ? "me" : "opp") : (b.myWin ? "opp" : "me");
  const pos = choice(POS);
  const hero = who === "me" ? b.myPicks[pos] : b.oppPicks[pos];
  const text = s.txt({ who, hero, skill: heroSkill(hero) });
  const swing = (who === "me" ? 1 : -1) * Math.abs(s.swing);
  return { text, swing };
}
function genBattleLine(b) {
  const m = b.minute, myW = b.myWin;
  const pos = choice(POS);
  const mh = b.myPicks[pos], oh = b.oppPicks[pos], pn = POS_NAME[pos];
  const ms = heroSkill(mh), os = heroSkill(oh);
  const lead = b.myTotal - b.oppTotal;
  const fav = lead > 6 ? "me" : lead < -6 ? "opp" : "even";
  // 关键节点（贴近真实节奏）：暴君约2分钟刷新，主宰约8分钟，风暴龙王约20分钟
  const tpl = [];
  if (m <= 1) {
    tpl.push(`开局：双方buff区开野，${pn}${mh} 用${ms}抢线，${fav === "me" ? "我方补刀占优" : fav === "opp" ? "对手压制稍强" : "双方持平"}。`);
    tpl.push(`河道蟹争夺，${pn}${mh} 抢到视野，${os ? `对手${oh} 的${os}没能占到便宜` : "双方各退一步"}。`);
  } else if (m === 2) {
    tpl.push(`第一条暴君刷新：双方集结河道，${myW ? `我方${mh} 的${ms}先手开团，暴君收入囊中` : `对手${oh} 用${os}抢先，暴君被对方拿下`}。`);
  } else if (m < 8) {
    tpl.push(`${pn}${mh} 靠${ms}抓到对方落单，${myW ? "完成击杀并推掉一塔" : "反被支援赶到，被换掉"}。`);
    tpl.push(`我方${choice(["下路", "中路", "上路"])}一塔告破${myW ? "，顺势拿到第二条暴君" : "，经济被拉开"}。`);
    tpl.push(`小规模碰撞：${mh} 的${ms} 换掉对方${oh}，${myW ? "我方赚了" : "我方亏了"}。`);
  } else if (m === 8) {
    tpl.push(`主宰刷新：双方在主宰坑拉扯，${myW ? `我方拿下主宰，兵线优势明显` : `主宰被对手拿下，我方只能守塔`}。`);
  } else if (m < 20) {
    tpl.push(`中期团战：${pn}${mh} 用${ms}进场，${myW ? "打出 2 换 3，顺势推掉高地" : "被对方集火，团战失利"}。`);
    tpl.push(`兵线运营：${mh} 带线牵制，${myW ? "我方趁机拿资源滚雪球" : "对方抱团推进，我方防守吃紧"}。`);
    tpl.push(`中路高地攻防：${myW ? "我方磨掉高地塔" : "水晶前惊险守住"}。`);
  } else {
    tpl.push(`风暴龙王团：${myW ? `我方${mh} 的${ms}先手秒掉核心，一波带走` : `对手抢到风暴龙王，我方无力回天`}。`);
    tpl.push(`决胜团：${pn}${mh} 的${ms} 定胜负，${myW ? "直破水晶" : "被反打，水晶告急"}。`);
  }
  return `第 ${m} 分钟：${choice(tpl)}`;
}

/* ---------------- 声望 ---------------- */
function addPrestige(delta, reason) {
  if (!S || S.gameOver) return;
  const t = getMyTeam();
  t.prestige = clamp(t.prestige + delta, 0, 100);
  if (Math.abs(delta) >= 0.01) {
    S.log.unshift(`S${S.season}R${S.round} 声望${delta >= 0 ? "+" : ""}${delta}（${reason}）`);
    if (S.log.length > 60) S.log.pop();
  }
  // 声望归零 → 战队失去公信力，游戏失败
  if (t.prestige <= 0) triggerGameOver(reason);
}
function triggerGameOver(reason) {
  if (!S || S.gameOver) return;
  const t = getMyTeam();
  S.gameOver = {
    reason: reason || "声望归零",
    team: t.name, season: S.season, round: S.round,
    wins: t.wins, losses: t.losses,
    rank: (S.seasonResult && S.seasonResult.rank) || null,
    money: t.money, fans: t.fans
  };
  S.page = "gameover";
  S.event = null;
  const m = document.getElementById("event-mask"); if (m) m.remove();
  const tm = document.getElementById("transfer-mask"); if (tm) tm.remove();
  save();
  render();
}
function renderGameOver() {
  const g = S.gameOver || {};
  const t = getMyTeam();
  return `${renderTopbar()}<div class="card">
    <div class="center" style="font-size:40px;font-weight:900;color:var(--red2);letter-spacing:4px">GAME OVER</div>
    <div class="center" style="font-size:15px;margin:10px 0 18px">声望归零，投资方与粉丝彻底失去信心，${escapeHtml(g.team || t.name)} 被迫解散。</div>
    <div class="warn" style="border-color:rgba(255,59,48,.5);background:rgba(255,59,48,.1);color:var(--red2)">失败原因：声望降至 0（最近触发：${escapeHtml(g.reason || "—")}）</div>
    <div class="section-title mt">最终战绩</div>
    <div class="report-line"><span class="tag key">赛季</span><span class="body">S${g.season || S.season} · 第 ${g.round || 1} 轮</span></div>
    <div class="report-line"><span class="tag key">战绩</span><span class="body">${g.wins || 0} 胜 ${g.losses || 0} 负${g.rank ? ` · 常规赛第 ${g.rank} 名` : ""}</span></div>
    <div class="report-line"><span class="tag key">资产</span><span class="body">资金 ¥${g.money || 0}万 · 粉丝 ${(g.fans || 0).toLocaleString()}</span></div>
    <div class="muted mt">声望是本作的生存线：连续失利、无缘季后赛、卖掉主力都会扣声望，降到 0 即游戏结束。</div>
    <button class="btn gold mt" data-act="restartgame" style="width:100%">重新开始新赛季</button>
  </div>`;
}
function prestigeTier(p) { return p >= 80 ? "传奇" : p >= 60 ? "豪门" : p >= 40 ? "劲旅" : p >= 20 ? "新锐" : "无名"; }
function prestigeNext(p) { for (const x of [20, 40, 60, 80]) if (p < x) return x; return 100; }

/* ---------------- 随机事件 ---------------- */
const EVENTS = [
  { title: "选手状态火热", weight: 10, text: "队内一名选手近期手感爆棚，训练赛屡屡打出高光操作。",
    apply: () => { const p = randomStarter(getMyTeam()); p.status = "hot"; p.statusRounds = 3; return `【${p.name}】进入火热状态，未来 3 轮属性提升！`; } },
  { title: "突发伤病", weight: 9, text: "一名首发选手在训练中扭伤，需要休养。",
    apply: () => { const p = randomStarter(getMyTeam()); p.status = "inj"; p.statusRounds = randInt(2, 3); return `【${p.name}】受伤，将伤停 ${p.statusRounds} 轮，请到【阵容】调整首发！`; } },
  { title: "赞助商青睐", weight: 8, text: "一家电竞外设品牌看中战队人气，送来一笔赞助。",
    apply: () => { const bonus = Math.round(getMyTeam().prestige / 10) * 10; const m = randInt(55, 140) + bonus; getMyTeam().money += m; return `获得赞助资金 +${m} 万（声望加成 +${bonus}）！`; } },
  { title: "粉丝暴涨", weight: 8, text: "上一场精彩操作被剪成集锦，全网刷屏。",
    apply: () => { const f = Math.round(randInt(3000, 12000) * (1 + getMyTeam().prestige / 120)); getMyTeam().fans += f; return `粉丝 +${f}！人气水涨船高。`; } },
  { title: "队内矛盾", weight: 6, text: "两名选手因战术分歧发生争执，影响更衣室氛围。",
    apply: () => { const ps = getMyTeam().players; const all = POS.flatMap(p => ps[p]); const a = choice(all), b = choice(all); a.me = clamp(a.me - 4, 40, a.ceil); b.me = clamp(b.me - 4, 40, b.ceil); a.status = "low"; b.status = "low"; a.statusRounds = Math.max(a.statusRounds, 2); b.statusRounds = Math.max(b.statusRounds, 2); return `【${a.name}】与【${b.name}】心态下滑，低迷 2 轮。`; } },
  { title: "青训惊喜", weight: 7, text: "二队一名小将表现惊艳，可上调一队。",
    apply: () => { const t = getMyTeam(); const pos = choice(POS); const rookie = takeFreeAgent(pos); t.players[pos].push(rookie); return `青训提拔【${rookie.name}】（${ratingForOvr(rookie.ovr)}/总评${rookie.ovr}）加入 ${POS_NAME[pos]} 轮换！`; } },
  { title: "对手情报", weight: 7, text: "侦察到下一对手近期状态波动，是个抢分良机。",
    apply: () => { const opp = nextOpponent(); if (opp) { const p = randomStarter(opp); if (p) { p.status = "low"; p.statusRounds = 2; } } return `情报到手：下个对手一名首发状态低迷，把握机会！`; } },
  { title: "媒体赞誉", weight: 6, text: "战队近期的表现获得主流电竞媒体好评。",
    apply: () => { const d = randInt(2, 4); addPrestige(d, "媒体赞誉"); return `声望 +${d}！战队口碑上升。`; } }
];
function randomStarter(team) { if (!team) return null; return getPlayer(team, choice(POS.map(p => team.lineup[p]).filter(Boolean))); }
function nextOpponent() {
  if (S.phase === "regular") { const sc = S.schedule.find(s => !s.played); return sc ? S.teams.find(t => t.id === sc.oppId) : null; }
  if (S.pendingPlayoff && S.pendingPlayoff.oppId) return S.teams.find(t => t.id === S.pendingPlayoff.oppId);
  return null;
}
function maybeEvent() {
  if (rand() < 0.7) {
    const total = EVENTS.reduce((s, e) => s + e.weight, 0);
    let r = rand() * total, ev = EVENTS[0];
    for (const e of EVENTS) { r -= e.weight; if (r <= 0) { ev = e; break; } }
    S.event = { title: ev.title, text: ev.text, msg: ev.apply() };
  } else S.event = null;
}
function tickStatuses() {
  S.teams.forEach(t => POS.forEach(pos => t.players[pos].forEach(p => {
    if (p.status && p.status !== "ok") { p.statusRounds--; if (p.statusRounds <= 0) { p.status = "ok"; p.statusRounds = 0; } }
  })));
}

/* ---------------- 渲染 ---------------- */
const root = document.getElementById("game-root");
function toast(msg) { const el = document.createElement("div"); el.className = "toast"; el.textContent = msg; document.body.appendChild(el); setTimeout(() => el.remove(), 2200); }
/* 滚动/焦点锚定：整页重渲染时保住滚动位置与输入焦点，避免按钮乱跳 */
function captureView() {
  const sc = { y: window.scrollY || window.pageYOffset || 0, inner: [], focus: null, sel: null };
  document.querySelectorAll("[data-scroll-id]").forEach(el => sc.inner.push([el.getAttribute("data-scroll-id"), el.scrollTop]));
  const ae = document.activeElement;
  if (ae && ae.id && /^(bench|ban)-filter$/.test(ae.id)) {
    sc.focus = ae.id;
    try { sc.sel = [ae.selectionStart, ae.selectionEnd]; } catch (e) {}
  }
  return sc;
}
function restoreView(sc) {
  if (!sc) return;
  if (sc.inner.length) sc.inner.forEach(([id, top]) => { const el = document.querySelector(`[data-scroll-id="${id}"]`); if (el) el.scrollTop = top; });
  if (sc.y) { try { window.scrollTo(0, sc.y); } catch (e) {} }
  if (sc.focus) {
    const el = document.getElementById(sc.focus);
    if (el) {
      el.focus({ preventScroll: true });
      if (sc.sel) { try { el.setSelectionRange(sc.sel[0], sc.sel[1]); } catch (e) {} }
    }
  }
}
function render() {
  const sc = captureView();
  if (!S) { renderTitle(); }
  else if (S.gameOver) { root.innerHTML = renderGameOver(); }
  else if (S.page === "title") { renderTitle(); }
  else if (S.page === "series") { renderSeries(); }
  else if (S.page === "event") { renderEvent(); }
  else { renderMain(); }
  renderUndoBar();
  restoreView(sc);
}
/* ---------------- 撤销（单步快照） ---------------- */
function snapshot(label) {
  if (!S || S.page === "series" || S.gameOver) return;
  try {
    S.undo = { label, at: Date.now(), data: JSON.stringify(S, (k, v) => (k && k.charAt(0) === "_" ? undefined : v)) };
  } catch (e) { S.undo = null; }
  // 12 秒后自动收起撤销条（避免长期占位）
  if (S._undoTimer) { try { clearTimeout(S._undoTimer); } catch (e) {} }
  S._undoTimer = setTimeout(() => {
    if (S && S.undo && Date.now() - S.undo.at > 11000) { S.undo = null; render(); }
  }, 12000);
}
function undoLast() {
  if (!S || !S.undo) { toast("没有可撤销的操作"); return; }
  const keepSlot = S.slot, label = S.undo.label;
  try {
    const d = JSON.parse(S.undo.data);
    d.slot = keepSlot; d.undo = null;
    S = d;
    render();
    toast(`已撤销：${label}`);
  } catch (e) { toast("撤销失败"); }
}
function clearUndo() { if (S) S.undo = null; render(); }
function renderUndoBar() {
  let el = document.getElementById("undo-bar");
  if (!S || !S.undo || S.page === "series" || S.gameOver) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement("div");
    el.id = "undo-bar"; el.className = "undo-bar";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const a = b.getAttribute("data-act");
      if (a === "undo") undoLast();
      else if (a === "undoclear") clearUndo();
    });
  }
  el.innerHTML = `<span>已执行：<b>${escapeHtml(S.undo.label || "上一步")}</b></span>
    <button class="btn sm ghost" data-act="undo" aria-label="撤销 ${escapeHtml(S.undo.label || "上一步")}">↩ 撤销</button>
    <button class="btn sm ghost" data-act="undoclear" aria-label="关闭撤销提示">×</button>`;
}
/* ---------------- 文本输入弹窗（改名用，Promise） ---------------- */
function nameDialog(opt) {
  return new Promise(resolve => {
    const o = opt || {};
    const mask = document.createElement("div");
    mask.className = "modal-mask"; mask.id = "name-mask";
    mask.setAttribute("role", "dialog"); mask.setAttribute("aria-modal", "true");
    mask.innerHTML = `<div class="modal">
      <h3>${escapeHtml(o.title || "重命名")}</h3>
      ${o.tip ? `<div class="muted mb" style="font-size:12.5px;line-height:1.6">${o.tip}</div>` : ""}
      <input id="name-input" maxlength="24" value="${escapeHtml(o.value || "")}" placeholder="${escapeHtml(o.placeholder || "")}" aria-label="存档名称" autocomplete="off"
        style="width:100%;background:var(--bg2);border:1px solid var(--line);color:var(--txt);padding:10px 12px;border-radius:9px;font-size:14px" />
      <div class="muted" style="font-size:11.5px;margin-top:6px">最多 24 个字符 · 留空则恢复显示战队名</div>
      <div class="opts mt">
        <button class="btn gold" data-x="ok">保存名称</button>
        <button class="btn ghost" data-x="cancel">取消</button>
      </div></div>`;
    document.body.appendChild(mask);
    const inp = () => document.getElementById("name-input");
    const done = v => { mask.remove(); resolve(v); };
    mask._cancel = () => done(null);
    mask.addEventListener("click", e => {
      if (e.target === mask) return done(null);
      const b = e.target.closest("[data-x]"); if (!b) return;
      done(b.getAttribute("data-x") === "ok" ? (inp() ? inp().value.trim() : "") : null);
    });
    mask.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); done(inp() ? inp().value.trim() : ""); }
    });
    const i = inp();
    if (i) { i.focus(); if (i.select) i.select(); }
  });
}
/* ---------------- 二次确认弹窗（Promise） ---------------- */
function confirmDialog(opt) {
  return new Promise(resolve => {
    const o = opt || {};
    const mask = document.createElement("div");
    mask.className = "modal-mask"; mask.id = "confirm-mask";
    mask.setAttribute("role", "dialog"); mask.setAttribute("aria-modal", "true");
    mask.innerHTML = `<div class="modal">
      <h3>${escapeHtml(o.title || "确认操作")}</h3>
      <div class="modal-body" style="color:var(--txt2);font-size:13.5px;line-height:1.7;margin-bottom:14px">${o.body || ""}</div>
      <div class="opts">
        <button class="btn ${o.danger ? '' : 'gold'}" data-x="ok">${escapeHtml(o.okText || "确认")}</button>
        <button class="btn ghost" data-x="cancel">${escapeHtml(o.cancelText || "取消")}</button>
      </div></div>`;
    document.body.appendChild(mask);
    const done = v => { mask.remove(); resolve(v); };
    mask._cancel = () => done(false);
    mask.addEventListener("click", e => {
      if (e.target === mask) return done(false);
      const b = e.target.closest("[data-x]"); if (!b) return;
      done(b.getAttribute("data-x") === "ok");
    });
    const ok = mask.querySelector('[data-x="ok"]');
    if (ok) ok.focus();
  });
}
function renderTitle() {
  const slots = [];
  for (let i = 1; i <= SLOT_COUNT; i++) {
    const m = slotMeta(i);
    if (!m) {
      slots.push(`<div class="slot empty" aria-label="存档位 ${i}，当前为空">
        <div class="slot-h"><b>存档 ${i}</b><span class="muted">空</span></div>
        <div class="slot-body muted">还没有存档</div>
        <div class="hero-opt"><button class="btn gold sm" data-act="newgame:${i}" aria-label="在存档位 ${i} 开始新赛季">开始新赛季</button></div>
      </div>`);
    } else {
      const d = m.savedAt ? new Date(m.savedAt) : null;
      const label = m.name || m.team;
      const sub = m.name ? `${escapeHtml(m.team)} · S${m.season} 第 ${m.round} 轮` : `S${m.season} 第 ${m.round} 轮`;
      slots.push(`<div class="slot" aria-label="存档 ${i}：${escapeHtml(label)}，${escapeHtml(m.team)}，第 ${m.season} 赛季第 ${m.round} 轮，${m.wins}胜${m.losses}负">
        <div class="slot-h"><b>存档 ${i}</b><span class="muted">${d ? `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : ""}</span></div>
        <div class="slot-body"><b style="color:var(--gold)">${escapeHtml(label)}</b> <span class="muted">· ${sub}</span></div>
        <div class="muted" style="font-size:12px">${m.difficulty}难度 · ${m.rosterMode === "real" ? "真实名单" : "平衡选秀"} · ${m.wins}胜${m.losses}负 · 声望 ${m.prestige}</div>
        <div class="hero-opt">
          <button class="btn gold sm" data-act="loadslot:${i}" aria-label="载入存档 ${i}">载入</button>
          <button class="btn ghost sm" data-act="renameslot:${i}" aria-label="重命名存档 ${i}">改名</button>
          <button class="btn ghost sm" data-act="exportslot:${i}" aria-label="导出存档 ${i} 为文件">导出</button>
          <button class="btn ghost sm" data-act="delslot:${i}" aria-label="删除存档 ${i}">删除</button>
          <button class="btn ghost sm" data-act="newgame:${i}" aria-label="覆盖存档 ${i} 并开始新赛季">重开</button>
        </div>
      </div>`);
    }
  }
  root.innerHTML = `
  <div class="title-screen">
    <div><div class="logo">KPL主教练</div><div class="sub">王 者 之 路</div></div>
    <div class="tip">你是一名 KPL 战队主教练。选人、训练、转会，按官方规则 BP（全局BP、红蓝方、ban位、克制），带领战队从常规赛杀进双败淘汰赛，捧起冠军奖杯，打造多赛季王朝。<br><b style="color:var(--gold)">选手均为真实 KPL 选手 ID，评级/总评按其历史战绩评估（非官方数据）。</b><br>难度（<b>新秀 / 职业 / 传奇</b>）与技术名单（<b>平衡选秀 / 真实大名单</b>）是<b>两个独立维度</b>，可自由搭配。</div>
    <div class="slot-list" role="list">${slots.join("")}</div>
    <div class="row" style="justify-content:center">
      <button class="btn ghost" data-act="importsave" aria-label="从文件导入存档">导入存档文件</button>
      <button class="btn ghost" data-act="showhelp" aria-label="查看快捷键与帮助">快捷键 / 帮助</button>
    </div>
    <input type="file" id="import-file" accept="application/json,.json" class="hidden" aria-hidden="true" />
    <div class="tip" style="opacity:.6">进度自动保存在所选存档位（本地浏览器）。可导出 .json 备份，或导入到任意槽位。</div>
  </div>`;
  const fi = document.getElementById("import-file");
  if (fi) fi.addEventListener("change", () => {
    const f = fi.files && fi.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => importSaveText(String(rd.result || ""), null);
    rd.onerror = () => toast("读取文件失败");
    rd.readAsText(f);
  });
}
function prestigeColor(p) { return p >= 80 ? "#ff3b30" : p >= 60 ? "#f5c518" : p >= 40 ? "#34d3e0" : "#9aa6c4"; }
function renderTopbar() {
  const t = getMyTeam();
  const phaseName = S.phase === "regular" ? "常规赛" : S.phase === "playoff" ? "季后赛" : "赛季结束";
  const tabs = [["team", "战队"], ["train", "训练"], ["lineup", "阵容"], ["schedule", "赛程"], ["standings", "积分榜"], ["market", "转会"], ["prestige", "声望"], ["format", "赛制"]];
  const nav = tabs.map(([k, n], i) => `<button class="${S.tab === k ? 'active' : ''}" data-act="tab:${k}" aria-label="${n}（快捷键 ${i + 1}）" aria-current="${S.tab === k ? "page" : "false"}">${n}${k === "market" && S.transferWindow ? '<span class="dot-open" aria-label="转会窗口开放"></span>' : ""}</button>`).join("");
  return `
  <div class="topbar" role="banner">
    <div class="team-name">${escapeHtml(t.name)}</div>
    <div class="stat">S${S.season}·第${seasonYear(S.season)}年·${phaseName}<b>第 ${S.round} 轮</b></div>
    <div class="stat">资金<b>¥${t.money}万</b></div>
    <div class="stat">粉丝<b>${t.fans.toLocaleString()}</b></div>
    <div class="stat">声望<b style="color:${prestigeColor(t.prestige)}">${prestigeTier(t.prestige)} ${Math.round(t.prestige)}</b>${t.prestige <= 10 ? '<b style="color:var(--red2);margin-left:4px">⚠</b>' : ''}</div>
    <div class="stat">训练点<b>${S.trainPoints}</b></div>
    <div class="stat">战绩<b>${t.wins}胜${t.losses}负</b></div>
    <div class="spacer"></div>
    <div class="nav" role="navigation" aria-label="主菜单">${nav}</div>
    <button class="btn ghost sm" data-act="renamecurrent" aria-label="重命名当前存档（存档 ${S.slot || 1}）" title="重命名当前存档（${escapeHtml(S.saveName || t.name)}）">💾</button>
    <button class="btn ghost sm" data-act="showhelp" aria-label="快捷键与帮助（问号键）" title="快捷键 / 帮助（?）">?</button>
  </div>`;
}
function ratingColor(r) { return { S: "#ff3b30", A: "#f5c518", B: "#34d3e0", C: "#9aa6c4" }[r] || "#9aa6c4"; }
function playerCard(p, isStarter) {
  const [cls, label] = statusLabel(p);
  const attrs = [["操作", p.op], ["意识", p.aw], ["配合", p.co], ["心态", p.me], ["体能", p.st]]
    .map(([n, v]) => {
      const lowSt = n === "体能" && v <= 60;
      return `<div class="a" role="group" aria-label="${n} ${Math.round(v)}">
        <span class="name" aria-hidden="true">${n}</span>
        <span class="bar ${lowSt ? "st-low" : ""}" aria-hidden="true"><i style="width:${v}%"></i></span>
        <span aria-hidden="true">${Math.round(v)}</span></div>`;
    }).join("");
  let note = "";
  if (p.status === "inj") note = `<div class="muted" style="margin-top:6px;color:#e08cff">🚑 伤停 ${p.statusRounds} 轮</div>`;
  else if (p.status === "hot") note = `<div class="muted" style="margin-top:6px;color:var(--red2)">🔥 火热 ${p.statusRounds} 轮</div>`;
  else if (p.status === "low") note = `<div class="muted" style="margin-top:6px">😞 低迷 ${p.statusRounds} 轮</div>`;
  const rc = ratingColor(p.rating);
  const stWarn = staminaTagHtml(p);
  const age = p.age || 0;
  const ageTxt = `${p.age || "?"}岁${age >= AGE_DECLINE_FROM ? `<span class="age-down" title="${age >= 30 ? "30 岁以上：每赛季整体 -2" : "27 岁以上：每赛季整体 -1"}">↘</span>` : ""}`;
  const a11y = `${p.name}，${POS_NAME[p.pos]}，评级${p.rating}，总评${p.ovr}，${p.age || "?"}岁${age >= AGE_DECLINE_FROM ? "，已过巅峰期" : ""}，合同剩余${p.contract != null ? p.contract : "?"}个赛季，操作${Math.round(p.op)}，意识${Math.round(p.aw)}，配合${Math.round(p.co)}，心态${Math.round(p.me)}，体能${Math.round(p.st)}，状态${label}`;
  return `
  <div class="player-card" role="group" aria-label="${escapeHtml(a11y)}">
    <span class="pos ${p.pos}">${POS_NAME[p.pos]}</span>
    <h4>${escapeHtml(p.name)} ${isStarter ? '<span class="pill gold" style="font-size:10px">首发</span>' : ''} <span class="pill" style="font-size:10px;color:${rc};border-color:${rc}">${p.rating}</span></h4>
    <div class="lv">Lv.${p.level} · 总评 ${p.ovr} · 上限${p.ceil} · ${ageTxt} · 合同${p.contract != null ? p.contract + "赛季" : "?"}</div>
    <div class="attr">${attrs}</div>
    <span class="status-tag ${cls}">${label}</span>${stWarn}${note}
  </div>`;
}
function renderMain() {
  let body = "";
  if (S.tab === "team") body = renderTeam();
  else if (S.tab === "train") body = renderTrain();
  else if (S.tab === "lineup") body = renderLineup();
  else if (S.tab === "schedule") body = renderSchedule();
  else if (S.tab === "standings") body = renderStandings();
  else if (S.tab === "market") body = renderMarket();
  else if (S.tab === "prestige") body = renderPrestige();
  else if (S.tab === "format") body = renderFormat();
  root.innerHTML = renderTopbar() + `<div class="card">${body}</div>`;
  if (S.event) showEventModal();
  showTransferNotices();
}
function renderTeam() {
  const t = getMyTeam();
  const starters = POS.map(p => getPlayer(t, t.lineup[p]));
  const benches = POS.map(p => t.players[p].filter(pl => pl.id !== t.lineup[p])).flat();
  const left = (S.maxFanMeets || 2) - (S.fanMeets || 0);
  const meetMoney = fanMeetingIncome();
  const meetBlock = `<div class="section-title" style="margin-top:18px">粉丝运营</div>
    <div class="warn" style="border-color:rgba(52,211,224,.35);background:rgba(52,211,224,.07)">
      <b>粉丝见面会</b>：每赛季限 ${S.maxFanMeets || 2} 次（剩余 <b>${left}</b> 次）· 本次预计收入 <b style="color:var(--gold)">¥${meetMoney}万</b>（与粉丝数 ${t.fans.toLocaleString()}、声望挂钩）
      <button class="btn ${left > 0 ? 'gold' : 'ghost'} sm" style="margin-left:8px" data-act="fanmeet" ${left > 0 ? '' : 'disabled'} aria-label="举办粉丝见面会，预计收入 ${meetMoney} 万">举办见面会</button>
    </div>
    ${t.prestige <= 10 ? `<div class="warn" style="border-color:rgba(255,59,48,.5);background:rgba(255,59,48,.1);color:var(--red2)">⚠ 声望仅剩 ${Math.round(t.prestige)}，<b>降为 0 将直接判定赛季失败（游戏结束）</b>！</div>` : ''}`;
  // 合同临期：赛季末会自动续约（身价 50%），资金不足则离队
  const expiring = POS.flatMap(pos => t.players[pos].filter(p => (p.contract == null ? 3 : p.contract) <= 1).map(p => ({ pos, p })));
  const contractBlock = expiring.length ? `<div class="section-title" style="margin-top:18px">合同临期（本赛季末处理）</div>
    <div class="warn" style="border-color:rgba(245,197,24,.4);background:rgba(245,197,24,.07);color:var(--gold)">以下选手合同仅剩 1 个赛季：赛季结束时自动续约（费用 ★ 身价 50%），资金不足会<b>直接离队</b>。也可以现在手动续约锁定。</div>
    ${expiring.map(({ pos, p }) => {
      const cost = renewCost(p);
      const can = t.money >= cost;
      return `<div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--line)">
        <div><span class="pos ${pos}" style="position:static;margin-right:6px">${POS_NAME[pos]}</span><b>${escapeHtml(p.name)}</b> <span class="muted">总评 ${p.ovr} · ${p.age}岁${(p.age || 0) >= AGE_DECLINE_FROM ? '<b class="c-bad">↘</b>' : ""} · 合同 ${p.contract == null ? 1 : p.contract} 赛季</span>${staminaTagHtml(p)}</div>
        <button class="btn ${can ? "gold" : "ghost"} sm" data-act="renew:${p.id}" ${can ? "" : "disabled"} aria-label="续约 ${escapeHtml(p.name)}，费用 ${cost} 万">续约 ¥${cost}万</button>
      </div>`;
    }).join("")}` : "";
  const lowSt = POS.map(p => getPlayer(t, t.lineup[p])).filter(p => p && p.st <= 60);
  return `
  <div class="section-title">首发阵容 · 声望 ${prestigeTier(t.prestige)}</div>
  ${lowSt.length ? `<div class="warn mb">⚠ 首发体能偏低：${lowSt.map(p => `${escapeHtml(p.name)}（${Math.round(p.st)}）`).join("、")} — 可到【阵容】用「一键轮换建议」调整，或在【训练】全队休息（-2 训练点 +${REST_STAMINA_GAIN} 体能）。</div>` : ""}
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">${starters.map(p => playerCard(p, true)).join("")}</div>
  <div class="section-title" style="margin-top:18px">替补 / 轮换</div>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">${benches.map(p => playerCard(p, false)).join("") || '<div class="muted">暂无替补（可从青训/转会补充）</div>'}</div>
  ${contractBlock}
  ${meetBlock}`;
}
// 粉丝见面会收益：与粉丝数、声望挂钩
function fanMeetingIncome() {
  const t = getMyTeam();
  return Math.round((t.fans / 1600) * (1 + t.prestige / 150));
}
function holdFanMeeting() {
  const t = getMyTeam();
  if ((S.fanMeets || 0) >= (S.maxFanMeets || 2)) { toast(`本赛季粉丝见面会已用完（${S.maxFanMeets} 次）`); return; }
  const money = Math.round(fanMeetingIncome() * (0.9 + rand() * 0.25));
  const fansGain = Math.round(t.fans * 0.03 + randInt(300, 1500));
  S.fanMeets = (S.fanMeets || 0) + 1;
  t.money += money;
  t.fans += fansGain;
  addPrestige(1, "粉丝见面会");
  S.log.unshift(`S${S.season} 粉丝见面会：+¥${money}万，粉丝 +${fansGain.toLocaleString()}`);
  toast(`🎉 见面会成功！+¥${money}万 · 粉丝 +${fansGain.toLocaleString()}`);
  save(); render();
}
function renderTrain() {
  const t = getMyTeam();
  if (S.trainPoints <= 0 && !POS.flatMap(p => t.players[p]).some(p => isCapped(p))) {
    return `<div class="section-title">训练中心</div><div class="warn">本轮训练点已用完（剩余 ${S.trainPoints}）。每轮比赛后恢复训练点。训练/休息都消耗训练点，请合理分配。</div>
    <div class="muted mt">每次特训还要花资金（按总评定价）；属性练满后可用「突破上限」继续提升（大量训练点 + 资金）。</div>`;
  }
  const all = POS.flatMap(p => t.players[p]);
  const options = all.map(p => {
    const cost = trainCost(p);
    const capped = isCapped(p);
    const bCost = breakCost(p);
    const ageOk = (p.age || 22) < AGE_DECLINE_FROM;
    const breakBtn = !ageOk
      ? `<div class="muted" style="font-size:11px;margin-top:6px;color:var(--red2)">${p.age} 岁已过巅峰，无法突破上限（上限会逐季下滑）</div>`
      : capped
        ? `<button class="btn ${S.trainPoints >= BREAK_PTS && t.money >= bCost ? 'gold' : 'ghost'} sm mt" data-act="trainbreak:${p.id}" aria-label="为 ${escapeHtml(p.name)} 突破成长上限，消耗 ${BREAK_PTS} 训练点与 ${bCost} 万" ${S.trainPoints >= BREAK_PTS && t.money >= bCost ? '' : 'disabled'}>突破上限 ¥${bCost}万 · ${BREAK_PTS}点</button>`
        : `<div class="muted" style="font-size:11px;margin-top:6px">练满后可突破上限</div>`;
    return `
    <div class="player-card">
      <span class="pos ${p.pos}">${POS_NAME[p.pos]}</span>
      <h4>${escapeHtml(p.name)} <span class="pill" style="font-size:10px;color:${ratingColor(p.rating)};border-color:${ratingColor(p.rating)}">${p.rating}</span></h4>
      <div class="lv">Lv.${p.level} · 上限 ${p.ceil} · ${p.age || "?"}岁${ageOk ? "" : '<span class="age-down">↘</span>'} · 特训 ¥${cost}万/次</div>
      <div class="hero-opt">
        <button data-act="train:op:${p.id}" aria-label="特训 ${escapeHtml(p.name)} 的操作，消耗 1 训练点与 ${cost} 万">操作</button><button data-act="train:aw:${p.id}" aria-label="特训 ${escapeHtml(p.name)} 的意识，消耗 1 训练点与 ${cost} 万">意识</button>
        <button data-act="train:co:${p.id}" aria-label="特训 ${escapeHtml(p.name)} 的配合，消耗 1 训练点与 ${cost} 万">配合</button><button data-act="train:me:${p.id}" aria-label="特训 ${escapeHtml(p.name)} 的心态，消耗 1 训练点与 ${cost} 万">心态</button>
        <button data-act="train:st:${p.id}" aria-label="特训 ${escapeHtml(p.name)} 的体能，消耗 1 训练点与 ${cost} 万">体能</button>
      </div>
      ${breakBtn}
    </div>`;
  }).join("");
  return `
  <div class="section-title">训练中心（剩余训练点 ${S.trainPoints} · 资金 ¥${t.money}万）</div>
  <div class="muted mb">特训每次消耗 <b>1 训练点 + ¥（按选手总评 4~8 万）</b>，单项 +1~2（不超过上限）。<button class="btn ghost sm" data-act="rest" aria-label="全队休息，消耗 2 训练点，恢复体能 ${REST_STAMINA_GAIN}">全队休息（-2 训练点）</button> 恢复体能心态。练满后可花 <b>${BREAK_PTS} 训练点 + 大量资金</b>「突破上限」。</div>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">${options}</div>`;
}
function renderLineup() {
  const t = getMyTeam();
  const avg = Math.round(POS.reduce((a, pos) => { const p = getPlayer(t, t.lineup[pos]); return a + (p ? p.st : 0); }, 0) / 5);
  const rows = POS.map(pos => {
    const opts = t.players[pos].map(p => {
      const stCls = p.st <= 45 ? "c-bad" : p.st <= 60 ? "c-mid" : "muted";
      const con = p.contract != null && p.contract <= 1 ? ' <span class="pill red" style="font-size:9px;padding:1px 5px">合同末</span>' : "";
      return `<button class="btn ${t.lineup[pos] === p.id ? 'gold' : 'ghost'} sm" data-act="setlineup:${pos}:${p.id}" aria-label="将 ${escapeHtml(p.name)} 设为${POS_NAME[pos]}首发，总评${p.ovr}，体能${Math.round(p.st)}${p.contract != null ? "，合同剩余" + p.contract + "个赛季" : ""}">${escapeHtml(p.name)}${p.status === 'inj' ? '🚑(' + p.statusRounds + ')' : ''} <span class="${stCls}" style="font-size:10px">体${Math.round(p.st)}</span>${con}</button>`;
    }).join(" ");
    const cur = getPlayer(t, t.lineup[pos]);
    const curWarn = cur && cur.st <= 55 ? ` <b class="c-bad" style="font-size:11px">⚠ 体能告急</b>` : "";
    return `<div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--line)">
      <div><b style="color:var(--gold)">${POS_NAME[pos]}</b> &nbsp; <span class="muted">现任：${escapeHtml(cur.name)}</span>${curWarn}</div>
      <div class="hero-opt">${opts}</div></div>`;
  }).join("");
  const sug = rotationSuggest(t);
  return `<div class="section-title">排兵布阵</div>
  <div class="muted mb">点击切换首发。伤病选手（🚑）无法首发。系列赛局间也可在换人界面调整。当前首发平均体能 <b class="${avg <= 55 ? "c-bad" : ""}">${avg}</b>（每局 -${GAME_STAMINA_COST}，每轮自然 +${ROUND_STAMINA_GAIN}；全队休息 +${REST_STAMINA_GAIN} / 2 训练点，<b>仅在大场之间可休息</b>，系列赛局间不行）。</div>
  <div class="hero-opt mb">
    <button class="btn ${sug.length ? "gold" : "ghost"} sm" data-act="rotate" aria-label="一键轮换建议">🔄 一键轮换建议${sug.length ? `（${sug.length} 处）` : ""}</button>
    ${sug.length ? `<span class="muted" style="font-size:12px;align-self:center">${sug.map(x => `${POS_NAME[x.pos]} ${escapeHtml(x.from.name)}→${escapeHtml(x.to.name)}`).join(" · ")}</span>` : '<span class="muted" style="font-size:12px;align-self:center">当前阵容无需轮换</span>'}
  </div>
  ${rows}`;
}
function renderSchedule() {
  const t = getMyTeam();
  if (S.phase === "regular") {
    const sc = S.schedule.find(s => !s.played);
    if (!sc) return `<div class="section-title">赛程</div><div class="muted">常规赛已全部结束，正在结算季后赛资格……</div>`;
    const opp = S.teams.find(x => x.id === sc.oppId);
    const diffTxt = teamPower(t) > teamPower(opp) ? "我方略占上风" : teamPower(t) < teamPower(opp) ? "对手稍强" : "五五开";
    return `<div class="section-title">本周对阵（第 ${sc.round} / ${S.maxRegular} 轮）· BO5</div>
    <div class="matchup card" style="padding:18px">
      <div class="center"><div style="font-weight:800;color:var(--gold)">${escapeHtml(t.name)}</div><div class="muted">战力 ${teamPower(t).toFixed(1)}</div></div>
      <div class="vs">VS</div>
      <div class="center"><div style="font-weight:800">${escapeHtml(opp.name)}</div><div class="muted">战力 ${teamPower(opp).toFixed(1)}</div></div>
    </div>
    <div class="muted mt">赛前评估：${diffTxt}。每局都会 BP（全局BP）。可在【阵容】调整首发、【训练】补强、【转会】引援后开打。</div>
    ${S.transferWindow ? `<div class="warn" style="border-color:rgba(61,220,132,.4);background:rgba(61,220,132,.08);color:var(--green)">🟢 赛季初<b>转会窗口开放中</b>（剩余 ${S.maxTransfers - S.transfersUsed} 次）— 点【转会】买卖选手，<b>打本场后关闭</b>。</div>` : ''}
    <button class="btn mt" data-act="startmatch">进入系列赛</button>
    <div class="section-title mt">第 ${sc.round} 轮 · 联盟对战（点开看比分与阵容）</div>
    <div class="fx-list">${roundFixturesHtml(sc.round) || '<div class="muted">暂无</div>'}</div>
    <div class="section-title mt">本赛季对战记录（按轮，可折叠）</div>
    ${seasonFixturesHtml() || '<div class="muted">还没有打完的比赛</div>'}
    ${renderHistory()}`;
  }
  if (S.phase === "playoff") {
    const next = S.pendingPlayoff || playoffMyNext();
    let oppBlock = "";
    if (next && next.oppId) {
      const opp = S.teams.find(x => x.id === next.oppId);
      oppBlock = `<div class="matchup card" style="padding:18px">
        <div class="center"><div style="font-weight:800;color:var(--gold)">${escapeHtml(t.name)}</div><div class="muted">战力 ${teamPower(t).toFixed(1)}</div></div>
        <div class="vs">VS</div>
        <div class="center"><div style="font-weight:800">${escapeHtml(opp.name)}</div><div class="muted">战力 ${teamPower(opp).toFixed(1)}</div></div>
      </div>
      <div class="muted mt">下一场：<b style="color:var(--gold)">${next.label}</b> · BO7（每局BP，全局BP；<b>3:3 进入巅峰对决</b>）</div>
      <button class="btn gold mt" data-act="startmatch">进入系列赛</button>`;
    }
    return `<div class="section-title">季后赛 · 双败淘汰</div>${oppBlock}${renderBracket()}
    <div class="section-title mt">常规赛对战记录（按轮，可折叠）</div>${seasonFixturesHtml() || '<div class="muted">暂无</div>'}
    ${renderHistory()}`;
  }
  const r = S.seasonResult || {};
  const title = S.champion ? "🏆 冠军" : r.final ? "亚军" : r.playoff ? "四强" : `第 ${r.rank || "?"} 名`;
  const myMatches = [];
  (S.fixtures || []).forEach((fx, i) => fx.forEach(f => {
    const mine = f.a === S.myTeamId || f.b === S.myTeamId;
    if (!mine || !f.played || f.sa == null) return;
    const iAmA = f.a === S.myTeamId;
    const myScore = iAmA ? f.sa : f.sb, opScore = iAmA ? f.sb : f.sa;
    myMatches.push({ round: i + 1, oppName: teamNameOf(iAmA ? f.b : f.a), myScore, opScore, win: myScore > opScore });
  }));
  return `<div class="section-title">第 ${S.season} 赛季 · 结束</div>
  <div class="warn" style="${S.champion ? 'border-color:rgba(61,220,132,.4);background:rgba(61,220,132,.08);color:var(--green)' : ''}">本赛季成绩：<b>${title}</b> · 当前声望 <b style="color:${prestigeColor(t.prestige)}">${prestigeTier(t.prestige)} ${Math.round(t.prestige)}</b></div>
  <details class="season-block" open><summary><b>S${S.season}</b> 本赛季对战（${myMatches.filter(m => m.win).length}胜${myMatches.length - myMatches.filter(m => m.win).length}负）</summary>
    <div class="season-body"><table><thead><tr><th>轮次</th><th style="text-align:left">对手</th><th>比分</th><th>结果</th></tr></thead><tbody>${myMatchRows(myMatches) || '<tr><td colspan="4" class="muted">暂无</td></tr>'}</tbody></table>
    <details class="fx-round"><summary>联盟全部对战（含比分与阵容）</summary>${seasonFixturesHtml() || '<div class="muted">暂无</div>'}</details></div>
  </details>
  ${renderHistory()}<button class="btn gold mt" data-act="newseason">开启第 ${S.season + 1} 赛季</button>`;
}
function teamNameOf(id) { const t = S.teams.find(x => x.id === id); return t ? t.name : "?"; }
// 单场比赛（可展开看每局 BP 阵容）
// 同一局内英雄不应重复：渲染时再兜底去重一次（兼容旧存档里已存的重复阵容）
// 注意：巅峰对决（g.peak）允许双方撞英雄，所以只在队内去重
function dedupeLineup(arr) {
  const own = new Set();
  return (arr || []).filter(h => {
    if (!h || h === "—") return false;
    if (own.has(h)) return false;
    own.add(h); return true;
  });
}
function fixtureDetails(f, round, opts) {
  const o = opts || {};
  const A = o.aName || teamNameOf(f.a), B = o.bName || teamNameOf(f.b);
  const me = f.a === S.myTeamId || f.b === S.myTeamId;
  const played = f.played && f.sa != null;
  const score = played ? `${f.sa} : ${f.sb}` : (f.played ? "已赛" : "未赛");
  const winCls = played ? (f.sa > f.sb ? "c-good" : "c-bad") : "muted";
  const games = (f.games || []).map((g, i) => {
    const luA = dedupeLineup(g.luA);
    let luB = dedupeLineup(g.luB);
    if (!g.peak) luB = luB.filter(h => !luA.includes(h)); // 普通对局：同一局双方不重复
    return `<div class="fx-game"><span class="muted">第${i + 1}局</span>${g.peak ? '<b class="peak-mark">巅峰对决</b>' : ""} <b class="${g.aWin ? "c-good" : "c-bad"}">${escapeHtml(g.aWin ? A : B)}</b> 胜
    <div class="fx-lu">${escapeHtml(A)}：${escapeHtml(luA.join(" / ") || "—")}</div>
    <div class="fx-lu">${escapeHtml(B)}：${escapeHtml(luB.join(" / ") || "—")}</div></div>`;
  }).join("");
  return `<details class="fx ${me ? "fx-me" : ""}"><summary><span class="fx-team">${escapeHtml(A)}</span><b class="fx-score ${winCls}">${score}</b><span class="fx-team right">${escapeHtml(B)}</span></summary>${games || `<div class="muted" style="padding:6px 0">${f.played ? "旧存档无阵容记录" : "尚未开赛"}</div>`}</details>`;
}
// 某一轮的全部对阵
function roundFixturesHtml(round) {
  const fx = (S.fixtures || [])[round - 1] || [];
  if (!fx.length) return "";
  return fx.map(f => fixtureDetails(f, round)).join("");
}
// 本赛季已打完的各轮（新→旧），可折叠
function seasonFixturesHtml() {
  const played = [];
  (S.fixtures || []).forEach((fx, i) => { if (fx.some(f => f.played)) played.push(i + 1); });
  if (!played.length) return "";
  return played.slice().reverse().map(r => {
    const done = ((S.fixtures || [])[r - 1] || []).filter(f => f.played).length;
    return `<details class="fx-round"><summary>第 ${r} 轮 · ${done} 场已赛</summary>${roundFixturesHtml(r)}</details>`;
  }).join("");
}
// 我的赛季战绩（对手 / 比分 / 胜负）
function myMatchRows(fixturesArr) {
  return (fixturesArr || []).map(m => `<tr class="${m.win ? "" : ""}"><td>${m.tag ? escapeHtml(m.tag) : "R" + m.round}</td><td style="text-align:left">${escapeHtml(m.oppName)}${m.label ? ` <span class="muted" style="font-size:11px">${escapeHtml(m.label)}</span>` : ""}</td><td><b class="${m.win ? "c-good" : "c-bad"}">${m.myScore} : ${m.opScore}</b></td><td class="${m.win ? "c-good" : "c-bad"}">${m.win ? "胜" : "负"}</td></tr>`).join("");
}
function renderHistory() {
  if (!S.history.length) return `<div class="muted mt">这是你的第一个赛季。</div>`;
  const blocks = S.history.slice().reverse().map(h => {
    const title = h.champion ? "🏆 冠军" : h.final ? "亚军" : h.rank ? `第 ${h.rank} 名` : (h.playoff ? "四强" : "未进季后赛");
    const wins = (h.matches || []).filter(m => m.win).length, loses = (h.matches || []).length - wins;
    const myTable = (h.matches && h.matches.length)
      ? `<table><thead><tr><th>轮次</th><th style="text-align:left">对手</th><th>比分</th><th>结果</th></tr></thead><tbody>${myMatchRows(h.matches)}</tbody></table>`
      : '<div class="muted">无对战记录（旧赛季）</div>';
    const league = (h.fixtures && h.fixtures.length)
      ? `<details class="fx-round"><summary>联盟全部对战（${h.fixtures.length} 场，按轮）</summary>${h.fixtures.map(f => `<div class="fx-line"><span class="muted">${typeof f[0] === "number" ? "R" + f[0] : escapeHtml(f[0])}</span> ${escapeHtml(f[1])} <b>${f[3]} : ${f[4]}</b> ${escapeHtml(f[2])}</div>`).join("")}</details>`
      : "";
    return `<details class="season-block"${S.history.length === 1 ? " open" : ""}>
      <summary><b>S${h.season}</b> · ${escapeHtml(h.team)} · <b class="${h.champion ? "c-good" : ""}">${title}</b> · ${wins}胜${loses}负 · 声望 ${Math.round(h.prestige)}</summary>
      <div class="season-body">${myTable}${league}</div>
    </details>`;
  }).join("");
  return `<div class="section-title mt">历届赛季总结（可折叠）</div>${blocks}`;
}
/* 小分（净胜局）与相互战绩：积分榜并列时的排序依据 */
function teamGameStats() {
  const m = {};
  (S.teams || []).forEach(t => m[t.id] = { gw: 0, gl: 0, diff: 0 });
  (S.fixtures || []).forEach(fx => (fx || []).forEach(f => {
    if (!f.played || f.sa == null) return;
    if (m[f.a]) { m[f.a].gw += f.sa; m[f.a].gl += f.sb; }
    if (m[f.b]) { m[f.b].gw += f.sb; m[f.b].gl += f.sa; }
  }));
  Object.keys(m).forEach(k => m[k].diff = m[k].gw - m[k].gl);
  return m;
}
function headToHead(aId, bId) {
  let a = 0, b = 0;
  (S.fixtures || []).forEach(fx => (fx || []).forEach(f => {
    if (!f.played || f.sa == null) return;
    if (f.a === aId && f.b === bId) { if (f.sa > f.sb) a++; else if (f.sb > f.sa) b++; }
    else if (f.a === bId && f.b === aId) { if (f.sa > f.sb) b++; else if (f.sb > f.sa) a++; }
  }));
  return a - b;
}
function standingsSorted() {
  const stats = teamGameStats();
  return S.teams.slice().sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;          // 1) 积分
    const da = stats[a.id] ? stats[a.id].diff : 0, db = stats[b.id] ? stats[b.id].diff : 0;
    if (db !== da) return db - da;                                  // 2) 小分（净胜局）
    const h = headToHead(b.id, a.id);
    if (h !== 0) return h;                                          // 3) 相互战绩
    if (b.wins !== a.wins) return b.wins - a.wins;                   // 4) 胜场
    return a.losses - b.losses;
  });
}
function renderStandings() {
  const sorted = standingsSorted();
  const stats = teamGameStats();
  let rows = "";
  sorted.forEach((t, i) => {
    const s = stats[t.id] || { gw: 0, gl: 0, diff: 0 };
    const cls = [t.id === S.myTeamId ? "you" : "", i < 4 ? "top4" : ""].filter(Boolean).join(" ");
    rows += `<tr class="${cls}">
      <td>${i < 4 ? '<b class="c-good">' + (i + 1) + "</b>" : i + 1}</td>
      <td style="text-align:left">${escapeHtml(t.name)}${t.id === S.myTeamId ? ' <span class="pill gold" style="font-size:10px">你</span>' : ""}</td>
      <td>${t.wins + t.losses}</td><td>${t.wins}</td><td>${t.losses}</td><td><b>${t.points}</b></td>
      <td class="${s.diff > 0 ? "c-good" : s.diff < 0 ? "c-bad" : "muted"}">${s.diff > 0 ? "+" : ""}${s.diff}</td>
      <td class="muted">${t.fans.toLocaleString()}</td><td class="muted">¥${t.money}万</td>
      <td style="color:${prestigeColor(t.prestige)}">${prestigeTier(t.prestige)}</td></tr>`;
    if (i === 3) rows += `<tr class="cutline"><td colspan="10">✂ 季后赛晋级线 — 前 4 名进入双败淘汰赛</td></tr>`;
  });
  return `<div class="section-title">联盟积分榜 · S${S.season}</div>
  <div class="standings-wrap"><table><thead><tr><th>排名</th><th style="text-align:left">战队</th><th>场次</th><th>胜</th><th>负</th><th>积分</th><th>小分</th><th>粉丝</th><th>资金</th><th>声望</th></tr></thead><tbody>${rows}</tbody></table></div>
  <div class="legend mt">
    <div><b class="c-good">前 4 名</b>（绿底）晋级季后赛（双败淘汰，BO7）。</div>
    <div><b>小分</b> = 系列赛中<b>净胜局</b>（拿下的局数 − 丢掉的局数），用来衡量同为 X 积分时的强弱。</div>
    <div><b>排序规则</b>：① 积分（每场胜 +2）→ ② 小分（净胜局）→ ③ <b>相互战绩</b>（两队直接交手的胜负）→ ④ 总胜场 → ⑤ 总负场。</div>
    <div class="muted">全部 12 队每轮各打一场（其他战队比赛自动结算），场次保持一致。其他战队与玩家<b>同规则</b>：通过比赛获取资金/粉丝/声望，并在<b>赛季初</b>买卖选手。</div>
  </div>`;
}
/* ---------- 双败 bracket 可视化 ---------- */
function bracketSlot(name) {
  const B = S.bracket, SL = B.slots[name], R = B.resolved[name];
  const label = { usf1: "胜者组半决赛①", usf2: "胜者组半决赛②", ufin: "胜者组决赛", lr1: "败者组一轮", lfin: "败者组决赛", gf: "总决赛" }[name];
  if (!SL || !SL.a || !SL.b) return `<div class="bk-row"><span class="bk-label">${label}</span><span class="muted">待定</span></div>`;
  const aN = escapeHtml(teamName(SL.a)), bN = escapeHtml(teamName(SL.b));
  if (!R) return `<div class="bk-row"><span class="bk-label">${label}</span><span>${aN} vs ${bN}</span></div>`;
  // 有比分与阵容记录时，与常规赛一样可展开看每局 BP
  if (R.sa != null) {
    return `<div class="bk-wrap"><span class="bk-label">${label}<i class="muted" style="font-size:10px"> BO7</i></span>
      ${fixtureDetails({ a: SL.a, b: SL.b, sa: R.sa, sb: R.sb, played: true, games: R.games || [] })}</div>`;
  }
  // 兼容旧存档（只有胜负）
  const winN = escapeHtml(teamName(R.winner));
  return `<div class="bk-row done"><span class="bk-label">${label}</span><span>${aN} vs ${bN} → <b style="color:var(--green)">${winN}</b></span></div>`;
}
function renderBracket() {
  if (!S.bracket) return "";
  const order = S.bracket.order.map(id => teamName(id));
  return `<div class="section-title mt">双败淘汰赛程（前4：${order.map((n, i) => `${i + 1}.${escapeHtml(n)}`).join(" / ")}）</div>
  <div class="bracket">
    ${bracketSlot("usf1")}${bracketSlot("usf2")}${bracketSlot("ufin")}
    <div class="bk-sep">— 败者组 —</div>
    ${bracketSlot("lr1")}${bracketSlot("lfin")}
    <div class="bk-sep">— 总决赛 —</div>
    ${bracketSlot("gf")}
  </div>
  <div class="muted mt">双败规则：胜者组半决赛 1v4、2v3；胜者组决赛胜者直通总决赛，负者坠入败者组决赛；败者组再负即淘汰。总决赛 BO7，胜者夺冠。BO7 打到 3:3 时第 7 局为<b style="color:var(--gold)">巅峰对决</b>（无 ban、盲选、不受全局BP限制）。点开每场可看比分与每局双方阵容。</div>`;
}

/* ---------------- AI 战队转会（与玩家同规则：赛季初窗口、按 ovr 定价） ---------------- */
function aiTeamDoTransfers(team, season, moved) {
  const out = [];
  if (!team || team.id === S.myTeamId) return out;
  const movedSet = moved || new Set();
  // 弱队更积极补强（战力低于联盟平均 6% 以上，多试几次）
  const avgPower = S.teams.reduce((a, t) => a + teamPower(t), 0) / S.teams.length;
  const rounds = teamPower(team) < avgPower * 0.94 ? randInt(2, 4) : randInt(1, 3);
  for (let r = 0; r < rounds; r++) {
    // 最弱首发
    let weakest = null, wpos = null;
    POS.forEach(pos => { const p = getPlayer(team, team.lineup[pos]); if (p && (!weakest || p.ovr < weakest.ovr)) { weakest = p; wpos = pos; } });
    if (!wpos) break;
    // 1) 先从自由身签到更强的（按 ovr 定价）
    if (!S.freeAgents[wpos]) S.freeAgents[wpos] = [];
    const faList = S.freeAgents[wpos].filter(e => e).sort((a, b) => b.ovr - a.ovr);
    const target = faList.find(e => e.ovr > weakest.ovr && priceFor(e.ovr) <= team.money && !movedSet.has(e.name));
    if (target && team.players[wpos].length < 4) {
      const price = priceFor(target.ovr);
      const idx = S.freeAgents[wpos].indexOf(target);
      if (idx !== -1) S.freeAgents[wpos].splice(idx, 1);
      const np = makePlayerFrom(target);
      team.players[wpos].push(np);
      team.money -= price;
      initLineup(team);
      movedSet.add(target.name);
      out.push({ season, teamId: team.id, teamName: team.name, type: "in", pos: wpos, name: np.name, ovr: np.ovr, price });
      continue;
    }
    // 2) 自由身没有合适的，就挖其他 AI 战队的替补（加价 25%）；弱队因此能补强
    const donors = [];
    S.teams.forEach(o => {
      if (o.id === team.id || o.id === S.myTeamId) return;
      POS.forEach(pos => o.players[pos].forEach(p => { if (o.lineup[pos] !== p.id) donors.push({ team: o, pos, p }); }));
    });
    donors.sort((a, b) => b.p.ovr - a.p.ovr);
    const poach = donors.find(d => d.p.ovr > weakest.ovr && Math.round(priceFor(d.p.ovr) * 1.25) <= team.money && !movedSet.has(d.p.name));
    if (poach && team.players[poach.pos].length < 4) {
      const price = Math.round(priceFor(poach.p.ovr) * 1.25);
      const idx = poach.team.players[poach.pos].findIndex(x => x.id === poach.p.id);
      if (idx !== -1) {
        const moved_p = poach.team.players[poach.pos].splice(idx, 1)[0];
        if (poach.team.players[poach.pos].length === 0) poach.team.players[poach.pos].push(takeFreeAgent(poach.pos));
        initLineup(poach.team);
        team.players[poach.pos].push(moved_p);
        team.money -= price; poach.team.money += price;
        initLineup(team);
        movedSet.add(moved_p.name);
        out.push({ season, teamId: team.id, teamName: team.name, type: "in", pos: poach.pos, name: moved_p.name, ovr: moved_p.ovr, price, from: poach.team.name });
        continue;
      }
    }
    // 3) 资金偏少就卖掉一个替补回血（进自由身池，玩家也能签）
    const bench = POS.map(pos => { const p = team.players[pos].find(x => x.id !== team.lineup[pos]); return p ? { pos, p } : null; }).filter(Boolean).sort((a, b) => b.p.ovr - a.p.ovr)[0];
    if (bench && team.money < 140) {
      const price = Math.round(priceFor(bench.p.ovr) * 0.55);
      const idx = team.players[bench.pos].findIndex(x => x.id === bench.p.id);
      if (idx !== -1) {
        const sold = team.players[bench.pos].splice(idx, 1)[0];
        team.money += price;
        if (!S.freeAgents[bench.pos]) S.freeAgents[bench.pos] = [];
        S.freeAgents[bench.pos].push({ name: sold.name, pos: bench.pos, rating: sold.rating, ovr: sold.ovr });
        out.push({ season, teamId: team.id, teamName: team.name, type: "out", pos: bench.pos, name: sold.name, ovr: sold.ovr, price });
      }
    }
  }
  return out;
}
// 赛季初：全部 AI 战队开启转会窗口
function runAiTransferWindow(season) {
  const all = [];
  const moved = new Set(); // 同一转会窗内一名选手只流动一次
  S.teams.filter(t => t.id !== S.myTeamId).forEach(t => { all.push(...aiTeamDoTransfers(t, season, moved)); });
  all.forEach(x => {
    S.log.unshift(`S${x.season} 转会：${x.teamName} ${x.type === "in" ? "签下" : "卖出"} ${POS_NAME[x.pos]}${x.name}（总评${x.ovr}，¥${x.price}万）`);
  });
  S.aiTransfers = all;
  return all;
}
function showTransferNotices() {
  const list = S.aiTransfers || [];
  if (!list.length || (S.transferSeen || 0) >= list.length) return;
  if (document.getElementById("event-mask")) return; // 等事件弹窗关掉再弹
  const old = document.getElementById("transfer-mask"); if (old) old.remove();
  const rows = list.map(x => `<div class="report-line"><span class="tag ${x.type === "in" ? "win" : "lose"}">${x.type === "in" ? "签入" : "卖出"}</span><span class="body"><b>${escapeHtml(x.teamName)}</b> ${x.type === "in" ? "签下" : "卖出"} ${POS_NAME[x.pos]}【${escapeHtml(x.name)}】总评${x.ovr} · ¥${x.price}万${x.from ? `（来自 ${escapeHtml(x.from)}）` : ""}</span></div>`).join("");
  const mask = document.createElement("div");
  mask.className = "modal-mask"; mask.id = "transfer-mask";
  mask.innerHTML = `<div class="modal"><h3>🔄 赛季初转会窗口</h3>
    <p>其他战队也在买卖选手（资金、声望与你同规则），阵容已变化：</p>
    <div style="max-height:260px;overflow:auto">${rows}</div>
    <div class="warn" style="margin:10px 0">转会窗口现已开放，<b>打第一场常规赛后关闭</b>。可在【转会】页操作。</div>
    <button class="btn" data-act="closetransfer" style="width:100%">知道了</button></div>`;
  document.body.appendChild(mask);
  mask.addEventListener("click", ev => { const b = ev.target.closest("[data-act]"); if (b) handleAct(b.getAttribute("data-act")); });
  S.transferSeen = list.length;
  save();
}

/* ---------------- 转会市场 ---------------- */
// 每个赛季初自动刷新一次（赛季内固定，不可手动刷新）
function buildMarket() {
  const myP = getMyTeam().prestige;
  let cands = [];
  const fa = S.freeAgents || {};
  POS.forEach(pos => {
    const list = (fa[pos] || []).filter(e => e);
    shuffle(list);
    const take = list.slice(0, 2);
    take.forEach(e => {
      const p = makePlayerFrom(e);
      cands.push({ id: uid(), kind: "fa", name: p.name, pos, rating: p.rating, ovr: p.ovr, ceil: p.ceil, price: priceFor(p.ovr), player: p });
    });
  });
  // 挖角：他队替补
  const benchPool = [];
  S.teams.filter(t => t.id !== S.myTeamId).forEach(t => POS.forEach(pos => t.players[pos].forEach(p => { if (t.lineup[pos] !== p.id) benchPool.push({ team: t, pos, p }); })));
  shuffle(benchPool);
  const nPoach = clamp(1 + Math.floor(myP / 28), 1, 4);
  for (let i = 0; i < nPoach && i < benchPool.length; i++) {
    const { team, pos, p } = benchPool[i];
    cands.push({ id: uid(), kind: "poach", name: p.name, pos, rating: p.rating, ovr: p.ovr, ceil: p.ceil, price: Math.round(priceFor(p.ovr) * 1.3), teamId: team.id, teamName: team.name, playerId: p.id });
  }
  // S 级选手罕见：整个市场最多出现 1 个，且只有 25% 的赛季会刷出
  const sCands = cands.filter(c => c.rating === "S");
  if (sCands.length) {
    const keep = rand() < 0.25 ? choice(sCands) : null;
    cands = cands.filter(c => c.rating !== "S" || c === keep);
  }
  S.market = cands;
  S.marketSeason = S.season;
}
function renderMarket() {
  if (!S.market) buildMarket();
  const t = getMyTeam();
  const open = !!S.transferWindow;
  const myBench = POS.flatMap(pos => t.players[pos].filter(p => p.id !== t.lineup[pos]));
  const cands = S.market.map(c => {
    const can = open && t.money >= c.price && S.transfersUsed < S.maxTransfers && t.players[c.pos].length < 4;
    return `<div class="player-card">
      <span class="pos ${c.pos}">${POS_NAME[c.pos]}</span>
      <h4>${escapeHtml(c.name)} <span class="pill" style="font-size:10px;color:${ratingColor(c.rating)};border-color:${ratingColor(c.rating)}">${c.rating}</span></h4>
      <div class="lv">总评 ${c.ovr} · 上限${c.ceil != null ? c.ceil : ceilFor(c.rating)} · ${c.kind === "poach" ? `来自 ${escapeHtml(c.teamName)}(替补)` : "自由身"}</div>
      <div class="flex-between mt"><span style="color:var(--gold);font-weight:800">¥${c.price}万</span>
      <button class="btn sm ${can ? '' : 'ghost'}" data-act="marketbuy:${c.id}" aria-label="签约 ${escapeHtml(c.name)}，${POS_NAME[c.pos]}，总评 ${c.ovr}，价格 ${c.price} 万" ${can ? '' : 'disabled'}>签约</button></div>
    </div>`;
  }).join("");
  const bench = myBench.map(p => `<div class="player-card">
      <span class="pos ${p.pos}">${POS_NAME[p.pos]}</span><h4>${escapeHtml(p.name)}</h4>
      <div class="lv">总评 ${p.ovr} · ${ratingForOvr(p.ovr)}</div>
      <div class="flex-between mt"><span class="muted">卖出约 ¥${sellPrice(p)}万</span>
      <button class="btn ghost sm" data-act="marketsell:${p.id}" aria-label="卖出 ${escapeHtml(p.name)}，总评 ${p.ovr}" ${open && S.transfersUsed < S.maxTransfers ? '' : 'disabled'}>卖出</button></div></div>`).join("");
  const windowBar = open
    ? `<div class="warn" style="border-color:rgba(61,220,132,.4);background:rgba(61,220,132,.08);color:var(--green)">🟢 转会窗口开放中（赛季初）— 打第一场常规赛后关闭</div>`
    : `<div class="warn">🔴 转会窗口已关闭 — 每个赛季初才可买卖选手（下赛季开始时重新开放）</div>`;
  const aiFeed = (S.aiTransfers || []).map(x => `<div class="report-line"><span class="tag ${x.type === "in" ? "win" : "lose"}">${x.type === "in" ? "签入" : "卖出"}</span><span class="body"><b>${escapeHtml(x.teamName)}</b> ${x.type === "in" ? "签下" : "卖出"} ${POS_NAME[x.pos]}【${escapeHtml(x.name)}】总评${x.ovr} · ¥${x.price}万${x.from ? `（来自 ${escapeHtml(x.from)}）` : ""}</span></div>`).join("");
  // 赛中租借：转会窗关闭后仍可短期补强
  const loanLeft = Math.max(0, (S.maxLoans || 1) - (S.loansUsed || 0));
  const loanCard = c => {
    const fee = Math.round(priceFor(c.p.ovr) * 0.25);
    const can = !open && loanLeft > 0 && t.money >= fee && t.players[c.pos].length < 4;
    return `<div class="player-card">
      <span class="pos ${c.pos}">${POS_NAME[c.pos]}</span>
      <h4>${escapeHtml(c.p.name)} <span class="pill" style="font-size:10px;color:${ratingColor(c.p.rating)};border-color:${ratingColor(c.p.rating)}">${c.p.rating}</span></h4>
      <div class="lv">总评 ${c.p.ovr} · ${c.p.age || "?"}岁 · 来自 ${escapeHtml(c.fromTeam.name)}（替补）</div>
      <div class="flex-between mt"><span style="color:var(--gold);font-weight:800">租费 ¥${fee}万</span>
      <button class="btn sm ${can ? '' : 'ghost'}" data-act="loanin:${loanCandidates().indexOf(c)}" ${can ? '' : 'disabled'} aria-label="租借 ${escapeHtml(c.p.name)}，租费 ${fee} 万，期限 3 轮">租借 3 轮</button></div>
    </div>`;
  };
  const loanBlock = `<div class="section-title" style="margin-top:18px">赛中租借（${open ? "窗口开放中，可直接签约" : "转会窗关闭后可用"}）</div>
    <div class="muted mb" style="font-size:12.5px">租借费 = 身价 <b>25%</b>，<b>3 轮后自动返回</b>原队。每赛季限 <b>${S.maxLoans || 1}</b> 次（剩余 <b>${loanLeft}</b> 次）。${(S.loans || []).length ? `<br>租借中：${S.loans.map(l => `${POS_NAME[l.pos]}【${escapeHtml(l.name)}】剩余 ${l.roundsLeft} 轮`).join("、")}` : ""}</div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${loanCandidates().slice(0, 6).map(loanCard).join("") || '<div class="muted">暂无可租借的替补</div>'}</div>`;
  return `<div class="section-title">转会市场（赛季转会 ${S.transfersUsed} / ${S.maxTransfers}）</div>
  ${windowBar}
  <div class="muted mb" style="margin-top:8px">资金 <b style="color:var(--gold)">¥${t.money}万</b> · 声望越高池子越强（${prestigeTier(t.prestige)}）。买入入替补席，需到【阵容】提首发。
    <span class="pill" style="margin-left:8px">🔒 市场每赛季初自动刷新（赛季中不可刷新）</span></div>
  <div class="section-title" style="margin-top:6px">可签约</div>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${cands || '<div class="muted">暂无候选</div>'}</div>
  <div class="section-title" style="margin-top:18px">我的替补（可卖出）</div>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${bench || '<div class="muted">暂无替补可卖</div>'}</div>
  ${loanBlock}
  <div class="section-title" style="margin-top:18px">其他战队转会动态（本赛季）</div>
  ${aiFeed || '<div class="muted">其他战队本赛季暂无转会</div>'}`;
}
function marketBuy(id) {
  const c = (S.market || []).find(x => x.id === id);
  const t = getMyTeam();
  if (!c) return;
  if (!S.transferWindow) { toast("转会窗口已关闭：每个赛季初才可操作"); return; }
  if (S.transfersUsed >= S.maxTransfers) { toast(`本赛季转会次数已用完（${S.maxTransfers} 次）`); return; }
  if (t.money < c.price) { toast("资金不足！"); return; }
  if (t.players[c.pos].length >= 4) { toast(`${POS_NAME[c.pos]} 人数已满`); return; }
  snapshot(`签下 ${c.name}`);
  if (c.kind === "fa") t.players[c.pos].push(c.player);
  else {
    const src = S.teams.find(x => x.id === c.teamId);
    const idx = src.players[c.pos].findIndex(p => p.id === c.playerId);
    if (idx === -1) { toast("该选手已被挖走"); S.market = null; render(); return; }
    const moved = src.players[c.pos].splice(idx, 1)[0];
    if (src.players[c.pos].length === 0) src.players[c.pos].push(takeFreeAgent(c.pos));
    if (src.lineup[c.pos] === moved.id) initLineup(src);
    t.players[c.pos].push(moved);
  }
  t.money -= c.price; S.transfersUsed++;
  S.log.unshift(`S${S.season} 转会：签下 ${c.name}（¥${c.price}万）`);
  S.market = (S.market || []).filter(x => x.id !== c.id); // 赛季内不刷新，只移除已签走的
  toast(`成功签下【${c.name}】！`); save(); render();
}
function marketSell(pid) {
  const t = getMyTeam();
  if (!S.transferWindow) { toast("转会窗口已关闭：每个赛季初才可操作"); return; }
  if (S.transfersUsed >= S.maxTransfers) { toast(`本赛季转会次数已用完（${S.maxTransfers} 次）`); return; }
  let found = null;
  POS.forEach(p => { const idx = t.players[p].findIndex(x => x.id === pid); if (idx !== -1 && t.lineup[p] !== pid) found = { pos: p, p: t.players[p][idx] }; });
  if (!found) { toast("只能卖出替补席选手"); return; }
  const price = sellPrice(found.p);
  confirmDialog({
    title: "确认卖出选手？",
    body: `【${escapeHtml(found.p.name)}】${POS_NAME[found.pos]} · 总评 ${found.p.ovr}。<br>卖出可得 <b style="color:var(--gold)">¥${price}万</b>，占用 1 次转会次数（剩余 ${S.maxTransfers - S.transfersUsed - 1} 次）。${found.p.ovr >= 85 ? '<br><b class="c-bad">卖掉 85+ 主力会额外 -3 声望。</b>' : ""}`,
    okText: "确认卖出", danger: true
  }).then(ok => {
    if (!ok) return;
    let sold = null;
    POS.forEach(p => { const idx = t.players[p].findIndex(x => x.id === pid); if (idx !== -1 && t.lineup[p] !== pid) { sold = t.players[p][idx]; t.players[p].splice(idx, 1); } });
    if (!sold) { toast("该选手已不在替补席"); return; }
    snapshot(`卖出 ${sold.name}`);
    t.money += price; S.transfersUsed++;
    if (sold.ovr >= 85) addPrestige(-3, `卖掉主力 ${sold.name}`);
    S.log.unshift(`S${S.season} 转会：卖出 ${sold.name}（+¥${price}万）`);
    toast(`卖出【${sold.name}】，+¥${price}万`); save(); render();
  });
}
/* ---------------- 续约 / 年龄 / 合同 ---------------- */
function renewCost(p) { return Math.round(priceFor(p.ovr) * 0.5); }
function renewContract(pid) {
  const t = getMyTeam();
  const p = getPlayer(t, pid);
  if (!p) return;
  const cost = renewCost(p);
  if (t.money < cost) { toast(`资金不足：续约需 ¥${cost}万`); return; }
  confirmDialog({
    title: "续约选手",
    body: `与【${escapeHtml(p.name)}】续约 <b>3~6 个赛季</b>（约 1~2 年，3 赛季 = 1 岁），费用 <b style="color:var(--gold)">¥${cost}万</b>（身价 50%）。<br>当前资金 ¥${t.money}万。`,
    okText: "确认续约"
  }).then(ok => {
    if (!ok) return;
    if (t.money < cost) { toast("资金不足"); return; }
    snapshot(`续约 ${p.name}`);
    t.money -= cost;
    p.contract = randInt(3, 6);
    S.log.unshift(`S${S.season} 续约：${p.name} 合同 +${p.contract} 赛季（-¥${cost}万）`);
    toast(`${p.name} 续约成功：合同 ${p.contract} 个赛季`);
    save(); render();
  });
}
/* 赛季末合同结算：自动续约（有资金）或离队 */
function settleContracts() {
  const t = getMyTeam();
  const notices = [];
  POS.forEach(pos => {
    t.players[pos].slice().forEach(p => {
      if (p.loan) return;                       // 租借球员不参与合同结算
      p.contract = (p.contract == null ? 1 : p.contract) - 1;
      if (p.contract > 0) return;
      const cost = renewCost(p);
      const isStarter = t.lineup[pos] === p.id;
      if (t.money >= cost && (isStarter || p.ovr >= 82)) {
        t.money -= cost;
        p.contract = randInt(3, 6);
        notices.push(`【${p.name}】自动续约 ${p.contract} 赛季（-¥${cost}万）`);
      } else {
        const idx = t.players[pos].findIndex(x => x.id === p.id);
        if (idx === -1 || t.players[pos].length <= 1) { p.contract = 1; return; } // 最后一人不放手
        t.players[pos].splice(idx, 1);
        recycleToFreeAgents(p);
        notices.push(`【${p.name}】合同到期离队（资金不足 ¥${cost}万）`);
        if (p.ovr >= 85) addPrestige(-2, `${p.name} 合同到期离队`);
      }
    });
    // 离队造成空位时从自由身补人
    while (!t.players[pos].length) t.players[pos].push(takeFreeAgent(pos));
    initLineup(t);
  });
  // AI 战队同样处理（简化：直接续约，不弹通知）
  S.teams.forEach(tm => {
    if (tm.id === S.myTeamId) return;
    POS.forEach(pos => tm.players[pos].forEach(p => {
      p.contract = (p.contract == null ? 1 : p.contract) - 1;
      if (p.contract <= 0) p.contract = randInt(2, 3);
    }));
  });
  S.contractNotices = notices;
  return notices;
}
/* ---------------- 年龄 / 成长（3 个赛季 = 1 岁） ----------------
   年 = 3 个赛季：第 4、7、10… 赛季开始时全联盟年龄 +1。
   衰退是「逐季」结算的，不是等长一岁才掉：
     · 27~29 岁：每赛季 操作/意识/配合/心态 -1，成长上限 -1
     · 30 岁以上：每赛季 -2，上限 -2（下限 40 / 60）
   ≤26 岁仍有成长机会（越年轻概率越高），27 岁起停止成长、只减不增。 */
const AGE_SEASONS_PER_YEAR = 3;
const AGE_DECLINE_FROM = 27;          // 26 岁以上开始下滑
function seasonYear(season) { return Math.floor((Math.max(1, season || 1) - 1) / AGE_SEASONS_PER_YEAR) + 1; }
// 涨岁季：第 4、7、10… 赛季（第 1 赛季是开局，不算"长了一岁"）
function isAgeYearTick(season) { const s = Math.max(1, season || 1); return s > 1 && (s - 1) % AGE_SEASONS_PER_YEAR === 0; }
function ageDecline(p) { const a = p.age || 22; return a >= 30 ? 2 : a >= AGE_DECLINE_FROM ? 1 : 0; }
function growthChance(age) { const a = age || 22; return a <= 21 ? 0.75 : a <= 24 ? 0.55 : a <= 26 ? 0.30 : 0; }
// 赛季末调用：返回 { tick: 是否长了一岁, aged: 本队涨岁名单 }
function agePlayers() {
  const tick = isAgeYearTick(S.season);
  const aged = [];
  S.teams.forEach(tm => POS.forEach(pos => tm.players[pos].forEach(p => {
    if (tick) {
      p.age = (p.age || 22) + 1;
      if (tm.id === S.myTeamId) aged.push(`${p.name} ${p.age}岁`);
    }
    const dec = ageDecline(p);
    if (dec > 0) {
      ["op", "aw", "co", "me"].forEach(k => { p[k] = clamp(p[k] - dec, 40, p.ceil); });
      p.ceil = clamp(p.ceil - dec, 60, 99);   // 上限随年龄回落，练不回来
    }
    p.ovr = Math.round((p.op + p.aw + p.co + p.me + p.st) / 5);
  })));
  return { tick, aged };
}
/* ---------------- 赛中租借（转会窗关闭后仍可短期补强） ---------------- */
function loanCandidates() {
  const out = [];
  S.teams.forEach(o => {
    if (o.id === S.myTeamId) return;
    POS.forEach(pos => o.players[pos].forEach(p => {
      if (o.lineup[pos] === p.id) return;
      out.push({ pos, p, fromTeam: o });
    }));
  });
  return out.sort((a, b) => b.p.ovr - a.p.ovr).slice(0, 8);
}
function loanSign(key) {
  const t = getMyTeam();
  if ((S.loansUsed || 0) >= (S.maxLoans || 1)) { toast("本赛季租借次数已用完"); return; }
  if (S.transferWindow) { toast("转会窗口开放期间不需要租借，可直接签约"); return; }
  const cands = loanCandidates();
  const c = cands[parseInt(key, 10)];
  if (!c) { toast("该租借目标已不可用"); return; }
  if (t.players[c.pos].length >= 4) { toast(`${POS_NAME[c.pos]} 人数已满`); return; }
  const fee = Math.round(priceFor(c.p.ovr) * 0.25);
  if (t.money < fee) { toast(`资金不足：租借费 ¥${fee}万`); return; }
  confirmDialog({
    title: "赛中租借",
    body: `从 <b>${escapeHtml(c.fromTeam.name)}</b> 租借 ${POS_NAME[c.pos]}【<b>${escapeHtml(c.p.name)}</b>】（总评 ${c.p.ovr}）。<br>租借费 <b style="color:var(--gold)">¥${fee}万</b>，期限 <b>3 轮</b>，到期自动返回原队。<br>本赛季剩余租借次数：${(S.maxLoans || 1) - (S.loansUsed || 0)} 次。`,
    okText: "确认租借"
  }).then(ok => {
    if (!ok) return;
    if (t.money < fee) { toast("资金不足"); return; }
    snapshot(`租借 ${c.p.name}`);
    const idx = c.fromTeam.players[c.pos].findIndex(x => x.id === c.p.id);
    if (idx === -1) { toast("该选手已被其他队签走"); render(); return; }
    const moved = c.fromTeam.players[c.pos].splice(idx, 1)[0];
    moved.loan = { fromTeamId: c.fromTeam.id, roundsLeft: 3, origId: moved.id };
    if (c.fromTeam.players[c.pos].length === 0) c.fromTeam.players[c.pos].push(takeFreeAgent(c.pos));
    initLineup(c.fromTeam);
    t.players[c.pos].push(moved);
    t.money -= fee; c.fromTeam.money += fee;
    S.loansUsed = (S.loansUsed || 0) + 1;
    S.loans.push({ name: moved.name, pos: c.pos, fromTeamId: c.fromTeam.id, roundsLeft: 3 });
    S.log.unshift(`S${S.season} 租借：从 ${c.fromTeam.name} 租入 ${moved.name}（¥${fee}万 / 3轮）`);
    toast(`租入【${moved.name}】（3 轮后自动返回）`);
    save(); render();
  });
}
function loanTick() {
  const t = getMyTeam();
  if (!t || !S.loans) return;
  const back = [];
  POS.forEach(pos => t.players[pos].slice().forEach(p => {
    if (!p.loan) return;
    p.loan.roundsLeft--;
    if (p.loan.roundsLeft > 0) return;
    const idx = t.players[pos].findIndex(x => x.id === p.id);
    if (idx !== -1) t.players[pos].splice(idx, 1);
    const src = S.teams.find(x => x.id === p.loan.fromTeamId);
    delete p.loan;
    if (src) { src.players[pos].push(p); initLineup(src); }
    else recycleToFreeAgents(p);
    back.push(`${p.name}`);
    if (t.lineup[pos] === p.id) initLineup(t);
    if (!t.players[pos].length) t.players[pos].push(takeFreeAgent(pos));
    initLineup(t);
  }));
  S.loans = (S.loans || []).filter(l => !back.includes(l.name));
  if (back.length) { S.log.unshift(`S${S.season}R${S.round} 租借到期：${back.join("、")} 已返回原队`); toast(`租借到期：${back.join("、")} 返回原队`); }
}
function loanReturnById(key) { /* 兼容占位：租借到期自动返回 */ }
// 赛季结束时把所有租借球员强行退回原队（避免跨赛季残留）
function returnAllLoans() {
  const t = getMyTeam();
  if (!t) return;
  POS.forEach(pos => t.players[pos].slice().forEach(p => {
    if (!p.loan) return;
    const idx = t.players[pos].findIndex(x => x.id === p.id);
    if (idx !== -1) t.players[pos].splice(idx, 1);
    const src = S.teams.find(x => x.id === p.loan.fromTeamId);
    const back = p; delete back.loan;
    if (src) { src.players[pos].push(back); initLineup(src); } else recycleToFreeAgents(back);
    if (!t.players[pos].length) t.players[pos].push(takeFreeAgent(pos));
  }));
  S.loans = [];
  initLineup(t);
}
/* ---------------- 声望页 ---------------- */
function renderPrestige() {
  const t = getMyTeam(), p = t.prestige, next = prestigeNext(p);
  const pct = p >= 100 ? 100 : Math.round((p % 20) / 20 * 100);
  const eff = [`粉丝增长 ×${(1 + p / 150).toFixed(2)}`, `转会吸引力：${p >= 80 ? "极强(可挖顶级)" : p >= 60 ? "强" : p >= 40 ? "中等" : "一般"}`, `赞助加成 +¥${Math.round(p / 10) * 10}万`];
  const logs = (S.log || []).slice(0, 20).map(l => `<div class="report-line"><span class="tag even">记</span><span class="body">${escapeHtml(l)}</span></div>`).join("");
  return `<div class="section-title">战队声望</div>
  <div class="center" style="font-size:34px;font-weight:900;color:${prestigeColor(p)}">${prestigeTier(p)}</div>
  <div class="center muted" style="margin-bottom:10px">声望值 ${Math.round(p)} / 100</div>
  <div class="bar" style="height:12px"><i style="width:${pct}%;background:linear-gradient(90deg,var(--cyan),${prestigeColor(p)})"></i></div>
  <div class="muted mt">距离下一档「${prestigeTier(next)}」还差 ${Math.max(0, Math.round(next - p))} 点。</div>
  <div class="section-title mt">声望效果</div>
  <ul class="muted" style="line-height:1.9;padding-left:18px">${eff.map(e => `<li>${e}</li>`).join("")}</ul>
  <div class="muted mt">获取：比赛/系列赛胜利、晋级/夺冠、正面事件、媒体赞誉；失利与卖主力会降低。</div>
  <div class="section-title mt">近期动态</div>${logs || '<div class="muted">暂无记录</div>'}`;
}
/* ---------------- 赛制表 ---------------- */
function renderFormat() {
  return `<div class="section-title">KPL 赛制表（S${S.season}）</div>
  <div class="report-line"><span class="tag key">联盟</span><span class="body">共 12 支战队，与其余 11 支进行一个赛季较量。</span></div>
  <div class="report-line"><span class="tag win">常规赛</span><span class="body">单循环，每队 11 场，每场为 <b>BO5 系列赛</b>（先拿 3 分）。系列赛中<b>每一局都要 BP</b>，采用<b>全局 BP</b>：任意一方选过的英雄，后续局双方都不能再用。胜一场积 2 分，取<b>前 4 名</b>晋级季后赛。</span></div>
  <div class="report-line"><span class="tag key">季后赛</span><span class="body"><b>双败淘汰</b>。胜者组半决赛 1v4、2v3（BO7）；胜者组决赛胜者直通总决赛、负者坠入败者组决赛；败者组半决赛（两个半决赛负者）再负即淘汰；败者组决赛胜者进总决赛。<b>总决赛 BO7</b>，胜者夺冠。</span></div>
  <div class="report-line"><span class="tag key">巅峰对决</span><span class="body">BO7 打到 <b>3:3</b> 时，第 7 局为<b>巅峰对决</b>：<b>没有 ban 位</b>、双方<b>盲选</b>、<b>不受全局BP限制</b>（此前用过的英雄仍可选），双方甚至可能<b>选到同一个英雄</b>。选满 5 人后立即揭示对手阵容并开赛。</span></div>
  <div class="report-line"><span class="tag key">季后赛赛果</span><span class="body">季后赛每场都会记录<b>比分与每局双方 BP 阵容</b>，在【赛程】页的双败赛程里点开即可查看；赛季结束后也会写进该赛季的赛季总结。</span></div>
  <div class="report-line"><span class="tag key">BP规则</span><span class="body">每局系统分配<b>蓝/红方</b>并逐局交替。官方四阶段征召，<b>每方共 5 个 ban</b>：①禁用 蓝→红→蓝→红；②选择 蓝→红 红→蓝 蓝→红；③禁用 红→蓝→红→蓝→红→蓝；④选择 红→蓝 蓝→红。<b>对手选将实时可见</b>，可后手 Counter；选将时可自选填充位置。</span></div>
  <div class="report-line"><span class="tag key">摇摆位</span><span class="body">英雄<b>不锁死分路</b>，可拖到任意分路槽。按各英雄摇摆到不同分路的常见程度<b>分档</b>：主场 1.0（✓）、摇摆·常见 0.95~0.98（○）、摇摆 0.88~0.94（~）、逆用 0.80~0.87（⚠）、极少出现 0.72（✖）。<b>不匹配会直接扣战斗力，并连带降低胜算</b>；★=有选手擅长该英雄。</span></div>
  <div class="report-line"><span class="tag key">克制</span><span class="body">两层叠加：①<b>定位克制</b>（刺客克射手/法师、射手法师克坦克战士、坦克克刺客、战士克法师射手）；②<b>英雄级克制</b>（<b>可跨分路</b>，如张良/东皇压制进场刺客、盾山格挡弹道射手、吕布·马可波罗·貂蝉真伤破坦、虞姬免疫物理克制物理刺客、庄周解控克甄姬王昭君、老夫子捆位移射手）。BP 界面对每个候选/已选英雄都会标出<b>克制/被克</b>与原因，鼠标悬停雷达图可看 OSCM。</span></div>
  <div class="report-line"><span class="tag key">OSCM</span><span class="body">英雄按 <b>输出(O)/生存(S)/控制(C)/机动(M)</b> 四维建模。BP 界面有双方阵容的 <b>OSCM 雷达图</b>（我方 vs 对手均值对比 + 逐项差值），并给每个已选英雄配迷你雷达；点选英雄时弹出该英雄雷达与对位克制提示，方便判断"差的是输出还是前排"。</span></div>
  <div class="report-line"><span class="tag key">一键BP</span><span class="body">BP 界面右上角 <b>⚡ 一键BP</b>：自动完成本局剩余全部 ban/选将（含 AI 回合），完成后直接进入战前战力计算。<b>强度介于「新秀」与「职业」之间</b>——会按分路/克制/选手擅长打分，但偶尔放过克制、偶尔随到次优英雄、ban 有时不盯对面绝活，<b>不适合当成稳赢工具</b>。<b>传奇难度（含真实大名单）直接禁用一键BP</b>，必须手动 ban/选。<b>不限使用次数</b>；执行时<b>逐步演示</b>（约 0.5 秒/步），运行中可点『停止自动BP』中止。</span></div>
  <div class="report-line"><span class="tag key">全局BP</span><span class="body">以<b>战队</b>为单位记录（<b>与红蓝方无关</b>，阵营每局互换不影响归属）：<b>本队用过的英雄后续局不能再选</b>；<b>对方战队用过的英雄，本队仍可抢选</b>（对方只锁它自己）。ban 位池只移除<b>对方战队</b>用过的英雄（本队用过的仍可 ban、只是不能选）。</span></div>
  <div class="report-line"><span class="tag key">赛程</span><span class="body">全部 12 队每轮各打一场（其他战队比赛自动按战力结算），<b>场次保持一致</b>，积分榜实时更新。每轮的 <b>6 场对阵都会列出比分</b>，点开可看<b>每局双方 BP 阵容</b>；本赛季各轮对战可在赛程页折叠查看。</span></div>
  <div class="report-line"><span class="tag key">赛季总结</span><span class="body">每个赛季结束会把<b>你与各队的全部战绩（对手/比分/胜负）</b>和联盟全部对战比分写入该赛季总结，<b>可折叠但永久保留</b>（赛程页底部与赛季结束页均可查看）。</span></div>
  <div class="report-line"><span class="tag key">战前</span><span class="body">选将完成后先出<b>战力计算</b>：双方战力对比、分路克制、<b>阵容合理性判定</b>（分路匹配/前排/输出/控制/战术契合），确认后点「开始比赛」。</span></div>
  <div class="report-line"><span class="tag key">败方选边</span><span class="body">系列赛中<b>上一局的败方</b>有权选择下一局的红/蓝方（蓝方先选、红方后手 Counter）。你落败时可自行选择阵营。</span></div>
  <div class="report-line"><span class="tag key">组合体系</span><span class="body">同队同时选出经典组合（如盾山+艾琳、张良+王昭君、鬼昭吕）可<b>提升全队战力</b>，多个组合可叠加（上限 +18%）。</span></div>
  <div class="report-line"><span class="tag key">转会</span><span class="body">每赛季 <b>${S.maxTransfers}</b> 次转会，<b>仅在赛季初转会窗口开放</b>（打第一场常规赛后关闭）。市场<b>每赛季初自动刷新一次、赛季内不可手动刷新</b>；<b>S 级选手极罕见</b>（约 1/4 的赛季才会出现 1 名）。<b>价格按身价</b>：总评 80 ≈ ¥266 万、90 ≈ ¥376 万，<b>卖出只回收 50%</b>。<b>其他 11 支战队与玩家完全同规则</b>：起点资金 250 万、声望 45、选手评分相近，通过比赛赚取资金/粉丝/声望，并在赛季初自动买卖选手——他们完成交易时会弹出通知，也可在【转会】页查看全部动态。</span></div>
  <div class="report-line"><span class="tag key">训练</span><span class="body">特训每次消耗 <b>1 训练点 + 资金</b>（按选手总评 5~11 万，越强越贵），单项 +1~2 且不超过上限。练满后可花 <b>${BREAK_PTS} 训练点 + 大量资金</b>（约 290~330 万）<b>突破上限</b> +1~2，继续成长（执行前二次确认）；<b>27 岁以上已过巅峰，不能突破上限</b>。<b>全队休息</b>：2 训练点 → 体能 +${REST_STAMINA_GAIN}、心态 +4。每次特训/休息都可<b>撤销</b>。</span></div>
  <div class="report-line"><span class="tag key">经济</span><span class="body">收入已收紧：<b>系列赛</b>胜利约 ¥42~98 万（季后赛 ×2）、失利 ¥7~28 万，另有同额的联盟分成；<b>赛季奖金</b> 冠军 140 / 进季后赛 85 / 其他 42 万；<b>粉丝见面会</b>与粉丝数、声望挂钩（每赛季 2 次）；赞助事件 55~140 万 + 声望加成。<b>支出</b>：特训 5~11 万/次、突破上限约 290~330 万、<b>转会按身价</b>（总评 90 约 376 万，卖出仅回收 50%）、<b>续约 = 身价 50%</b>。一个赛季正常运营下来，通常只够补 1~2 个关键位置。</span></div>
  <div class="report-line"><span class="tag key">粉丝运营</span><span class="body">每赛季可举办 <b>2 次粉丝见面会</b>，收入与<b>粉丝数、声望</b>挂钩（粉丝越多赚得越多），并小幅涨粉。入口在【战队】页。</span></div>
  <div class="report-line"><span class="tag key">失败条件</span><span class="body"><b>声望降到 0 即游戏失败（GAME OVER）</b>：连续失利每场 −1.2（季后赛 −2）、无缘季后赛 −8、卖掉 85+ 主力 −3。声望低于 10 时【战队】页会红字警告。</span></div>
  <div class="report-line"><span class="tag key">积分榜</span><span class="body">前 <b>4 名高亮</b>并标出<b>晋级线</b>。并列时依次比较：① 积分（胜 +2）→ ② <b>小分</b>（系列赛净胜局 = 拿下局数 − 丢掉局数）→ ③ <b>相互战绩</b>（两队直接交手）→ ④ 总胜场 → ⑤ 总负场。</span></div>
  <div class="report-line"><span class="tag key">体能</span><span class="body">每局消耗 <b>${GAME_STAMINA_COST}</b> 体能（下限 ${STAMINA_FLOOR}）；≤60 标「体能偏低」、≤45 标「体力告急」红标。恢复途径：<b>轮间自然 +${ROUND_STAMINA_GAIN}</b>（每轮开赛前）· <b>全队休息 +${REST_STAMINA_GAIN}</b>（2 训练点，<b>只有大场打完后才能休息</b>，系列赛局间不可）· 赛季重置 +25。系列赛局间只能<b>换人</b>或<b>一键轮换</b>；<b>一键轮换建议</b>按体能/伤病/低迷自动推荐替补，可在【阵容】与系列赛局间使用。</span></div>
  <div class="report-line"><span class="tag key">年龄合同</span><span class="body"><b>3 个赛季 = 1 岁</b>：第 4、7、10… 赛季开始时全联盟年龄 +1（顶栏显示「第 N 年」）。<b>26 岁以上开始衰退</b>，而且是<b>逐季</b>掉：<b>27~29 岁</b>每赛季操作/意识/配合/心态 <b>−1</b>、成长上限 −1；<b>30 岁起</b>每赛季 <b>−2</b>、上限 −2（练不回来）。≤26 岁仍有成长机会（21 岁以下最高，27 岁起不再成长）。<b>合同按赛季计（2~6 赛季）</b>，赛季末 −1；到期自动续约（身价 50%，主力或 A 级以上且资金足够），否则<b>离队进自由身池</b>；也可在【战队】页手动续约（3~6 赛季）。</span></div>
  <div class="report-line"><span class="tag key">赛中租借</span><span class="body">转会窗口关闭后，仍可从其他战队<b>租借替补</b>：租费 = 身价 <b>25%</b>，期限 <b>3 轮</b>，到期<b>自动返回原队</b>。每赛季限 <b>${S.maxLoans || 1}</b> 次，入口在【转会】页。</span></div>
  <div class="report-line"><span class="tag key">难度</span><span class="body"><b>难度 = 对手的 BP 水平</b>，<b>不改动任何战力/属性</b>：<b>新秀</b> 会犯小错——多数回合只按版本强度 ban（很少主动针对你的英雄池）、基本不读克制、偶尔拿舒适英雄，但仍会认分路、挑强度高的英雄；<b>职业</b> 会读克制、照顾自家选手擅长、补阵容前排与输出，ban 会瞄着你的核心；<b>传奇</b> 近乎最优，几乎总拿最强解，ban 基本必中你的第一核心。<b>名单模式</b>（平衡选秀 / 真实大名单）是另一个维度，只决定 12 队怎么分人；<b>真实大名单下对手 BP 固定按「传奇」</b>。</span></div>
  <div class="report-line"><span class="tag key">存档</span><span class="body"><b>3 个存档槽</b>，自动保存到当前槽位；每个槽可<b>改自定义名称</b>（标题界面「改名」，或游戏内右上角 💾），留空则显示战队名。标题界面可<b>导出 .json 备份</b>、<b>导入存档</b>（自动找空槽）、删除槽位。旧版单存档会自动迁移到存档 1。<b>危险操作</b>（覆盖开档、删除存档、卖出选手、突破上限、放弃系列赛）都会<b>二次确认</b>；特训/休息/签约等消耗型操作支持<b>↩ 撤销</b>（底部撤销条，仅主界面可撤销）。</span></div>
  <div class="report-line"><span class="tag key">开档</span><span class="body">选手全部来自<b>真实 KPL/K甲 参赛选手</b>（2016-2026 各届大名单），评级与总评按其<b>历史战绩</b>综合评估：S = 拿过总冠军/FMVP（Fly、小胖、一诺、清融、久诚、花海、钟意、长生、坦然、大帅、子阳、流浪、轩染、清清等），A = 冠军队成员/总决赛常客，B = KPL 常规首发，C = 轮换替补/新秀。<b>平衡选秀</b>下开局不做任何属性加成或削弱，12 队靠<b>蛇形分配</b>拉平（每队一强一弱）；<b>真实名单</b>则按大名单原样绑定。后续各队靠训练、转会、比赛自行发展。</span></div>
  <div class="report-line"><span class="tag key">操作</span><span class="body">键盘：<b>1~8</b> 切换页签 · <b>/</b> 搜索英雄 · <b>方向键 + Enter</b> 选/ban 英雄 · <b>B</b> 一键BP · <b>S</b> 跳过战斗 · <b>R</b> 一键轮换 · <b>Esc</b> 关闭弹窗 · <b>?</b> 帮助。所有按钮带 <b>aria-label</b>，属性条与选手卡有完整读屏描述；页面重渲染会<b>保留滚动位置与输入焦点</b>。</span></div>
  <div class="report-line"><span class="tag key">其他</span><span class="body">训练有<b>成长上限</b>（可花训练点+资金突破）；声望五档影响粉丝/转会/赞助；<b>一键BP 不限次数</b>；<b>BP 支持分路筛选/只看我的英雄池/对手擅长提示</b>；可打多个赛季建立王朝。</span></div>`;
}

/* ---------------- OSCM 雷达图（输出/生存/控制/机动） ---------------- */
const OSCM_AXES = [
  { k: 0, label: "输出", a: -90 },
  { k: 2, label: "控制", a: 0 },
  { k: 1, label: "生存", a: 90 },
  { k: 3, label: "机动", a: 180 }
];
function oscmVals(h) { return h ? [h.o, h.s, h.c, h.m] : [0, 0, 0, 0]; }
function radarSvg(items, size, withLabels) {
  const cx = size / 2, cy = size / 2, R = size * (withLabels ? 0.32 : 0.38);
  const pt = (v, a) => {
    const r = R * (clamp(v, 0, 100) / 100), rad = a * Math.PI / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  let s = `<svg class="radar" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;
  [0.25, 0.5, 0.75, 1].forEach(f => {
    const p = OSCM_AXES.map(ax => pt(100 * f, ax.a).map(n => n.toFixed(1)).join(",")).join(" ");
    s += `<polygon points="${p}" fill="none" stroke="#2a3454" stroke-width="1"/>`;
  });
  OSCM_AXES.forEach(ax => {
    const [x, y] = pt(100, ax.a);
    s += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#2a3454" stroke-width="1"/>`;
  });
  items.forEach(it => {
    const p = OSCM_AXES.map(ax => pt(it.vals[ax.k], ax.a).map(n => n.toFixed(1)).join(",")).join(" ");
    s += `<polygon points="${p}" fill="${it.fill}" stroke="${it.color}" stroke-width="1.8" stroke-linejoin="round"/>`;
  });
  if (withLabels) {
    OSCM_AXES.forEach(ax => {
      const [x, y] = pt(122, ax.a);
      s += `<text x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" font-size="10" fill="#8b96b0" text-anchor="middle">${ax.label}</text>`;
    });
  }
  return s + `</svg>`;
}
// 阵容 OSCM 均值（用于对比双方风格）
function lineupOscm(picks) {
  const hs = POS.map(p => heroByName(picks[p])).filter(Boolean);
  if (!hs.length) return [0, 0, 0, 0];
  return [0, 1, 2, 3].map(i => Math.round(hs.reduce((a, h) => a + oscmVals(h)[i], 0) / hs.length));
}
function renderOscmPanel(myPicks, oppPicks, oppName) {
  const mine = lineupOscm(myPicks), foe = lineupOscm(oppPicks);
  const diff = i => mine[i] - foe[i];
  const rows = ["输出", "生存", "控制", "机动"].map((n, i) => {
    const d = diff(i);
    const cls = d > 3 ? "c-good" : d < -3 ? "c-bad" : "c-mid";
    return `<div class="oscm-row"><span class="oscm-k">${n}</span>
      <span class="oscm-bar"><i style="width:${mine[i]}%"></i></span><b>${mine[i]}</b>
      <span class="muted" style="margin:0 6px">vs</span>
      <span class="oscm-bar foe"><i style="width:${foe[i]}%"></i></span><b>${foe[i]}</b>
      <b class="${cls}" style="margin-left:6px">${d > 0 ? "+" : ""}${d}</b></div>`;
  }).join("");
  return `<div class="oscm-panel">
    <div class="oscm-left">${radarSvg([
      { vals: mine, color: "#34d3e0", fill: "rgba(52,211,224,.22)" },
      { vals: foe, color: "#ff6b5e", fill: "rgba(255,107,94,.18)" }
    ], 150, true)}
      <div class="oscm-legend"><span class="c-good">● 我方</span> <span class="c-bad">● ${escapeHtml(oppName || "对手")}</span></div>
    </div>
    <div class="oscm-right">${rows}
      <div class="muted" style="font-size:11px;margin-top:4px">OSCM = 输出/生存/控制/机动（阵容五人均值）。缺输出或前排时按需 pick。</div>
    </div>
  </div>`;
}

/* ---------------- 选将中的英雄卡片（OSCM + 跨分路克制提示） ---------------- */
function renderPendingCard(name) {
  const h = heroByName(name);
  if (!h) return "";
  const d = S.series.draft, oth = aiSide(d);
  const rel = POS.map(pos => {
    const e = d.picks[oth].find(x => x.pos === pos);
    if (!e) return null;
    const eh = heroByName(e.hero);
    const m = matchupMult(h, eh);
    return { pos, hero: e.hero, m, note: heroCounterNote(h.name, eh.name) };
  }).filter(Boolean);
  const good = rel.filter(x => x.m >= 1.06).sort((a, b) => b.m - a.m).slice(0, 3);
  const bad = rel.filter(x => x.m <= 0.96).sort((a, b) => a.m - b.m).slice(0, 2);
  const tag = (x, cls) => `<span class="pill ${cls}" style="font-size:10px">${POS_NAME[x.pos]} ${x.hero} ×${x.m.toFixed(2)}${x.note ? ` · ${escapeHtml(x.note)}` : ""}</span>`;
  return `<div class="pend-card">
    <span class="mini-radar">${radarSvg([{ vals: oscmVals(h), color: "#f5c518", fill: "rgba(245,197,24,.22)" }], 64, true)}</span>
    <div style="flex:1">
      <div><b style="color:var(--gold)">${escapeHtml(h.name)}</b> <span class="muted" style="font-size:11px">${POS_NAME[h.pos]} · ${ARC_NAME[h.arc]}</span></div>
      <div class="muted" style="font-size:11.5px">输出 <b>${h.o}</b> · 生存 <b>${h.s}</b> · 控制 <b>${h.c}</b> · 机动 <b>${h.m}</b></div>
      <div style="margin-top:4px">${good.map(x => tag(x, "green")).join(" ")}${bad.map(x => tag(x, "red")).join(" ")}${!good.length && !bad.length ? '<span class="muted" style="font-size:11px">对位无明显克制关系</span>' : ""}</div>
    </div>
  </div>`;
}

/* ---------------- 一键 BP ----------------
   强度刻意设在「新秀 < 一键BP < 职业」之间：会犯一些不致命的判断错误
   （偶尔放过克制、偶尔随到次优英雄、ban 有时不盯着对面绝活），
   但不会把英雄塞到不该去的分路（同样遵守 LANE_PICK_FLOOR）。
   传奇难度（含真实大名单）直接禁用一键 BP，必须手动 ban/选。 */
const AUTO_BP = { noise: 0.21, topN: 5, profW: 0.65, fitW: 0.82, counterW: 0.50, banTop: 2, banTargetRate: 0.75 };
function autoBpAllowed() { return aiBpLevel() !== "传奇"; }
function myAutoBan() {
  if (!autoBpAllowed()) return null;
  const opp = S.teams.find(t => t.id === S.series.oppId);
  const pool = availBanHeroes(true);
  if (!pool.length) return null;
  const oppPool = new Set();
  POS.forEach(pos => { const p = getPlayer(opp, opp.lineup[pos]); if (p) (p.heroPool || []).forEach(h => oppPool.add(h)); });
  const byStrength = pool.slice().sort((a, b) => heroStrength(b) - heroStrength(a));
  const targeted = byStrength.filter(h => oppPool.has(h.name));
  // 75% 会盯对面英雄池（但只在最扎眼的 2 个里挑），25% 只看版本强度
  const useTarget = targeted.length >= 2 && rand() < AUTO_BP.banTargetRate;
  const list = useTarget ? targeted : byStrength;
  const n = Math.max(1, Math.min(useTarget ? AUTO_BP.banTop : 6, list.length));
  return list[randInt(0, n - 1)].name;
}
function myAutoPick() {
  if (!autoBpAllowed()) return null;
  const s = S.series, d = s.draft, mySide = d.mySide, oth = aiSide(d);
  const myT = getMyTeam();
  const filled = filledPos(d, mySide);
  const unfilled = POS.filter(p => !filled.includes(p));
  const pool = availHeroes();
  const cands = [];
  unfilled.forEach(pos => {
    const starter = getPlayer(myT, myT.lineup[pos]);
    const enemy = (d.picks[oth] || []).find(e => e.pos === pos);
    const enemyHero = enemy ? heroByName(enemy.hero) : null;
    const laneOk = pool.filter(h => laneFit(h, pos) >= LANE_PICK_FLOOR);
    (laneOk.length ? laneOk : pool).forEach(h => {
      const prof = starter && starter.heroPool.includes(h.name) ? 1.12 : 0.95;
      const fit = laneFit(h, pos);
      const counter = enemyHero ? matchupMult(h, enemyHero) : 1;
      let sc = heroStrength(h);
      sc *= 1 + (prof - 1) * AUTO_BP.profW;
      sc *= 1 - (1 - fit) * AUTO_BP.fitW;
      sc *= 1 + (counter - 1) * AUTO_BP.counterW;
      sc *= 1 + AUTO_BP.noise * (rand() * 2 - 1);
      cands.push({ pos, hero: h.name, sc });
    });
  });
  if (!cands.length) return null;
  cands.sort((a, b) => b.sc - a.sc);
  const n = Math.max(1, Math.min(AUTO_BP.topN, cands.length));
  return cands[randInt(0, n - 1)];
}
// 一键 BP：逐帧执行（默认 260ms/步），玩家能看清 ban/选将过程；运行中再点一次即停止
const AUTO_BP_DELAY = 500; // 每步约 0.5 秒，玩家能看清 ban/选将过程
function autoBpRunning() { return !!S._autoRun; }
function stopAutoBp(msg) {
  if (S._autoTimer) { try { clearTimeout(S._autoTimer); } catch (e) {} S._autoTimer = null; }
  S._autoRun = false;
  if (msg) toast(msg);
}
// 执行一步（我或对手的 ban / pick）
function autoBpStep() {
  const s = S.series;
  if (!s || s.sub !== "draft" || !s.draft) return false;
  const d = s.draft;
  if (d.peak) {
    // 巅峰对决：一键补满我方 5 个分路（不考虑全局 BP）
    if (d.over) return false;
    const filled = filledPos(d, d.mySide);
    const pos = POS.find(p => !filled.includes(p));
    if (!pos) { finishPeakDraft(); return false; }
    const hn = myPeakAutoPick(pos);
    if (!hn) { finishPeakDraft(); return false; }
    d.picks[d.mySide].push({ pos, hero: hn });
    if (d.picks[d.mySide].length >= 5) { finishPeakDraft(); return false; }
    return true;
  }
  if (d.over || d.stepIndex >= d.steps.length) {
    if (!d.over) { d.over = true; d.phase = "done"; simGame(); }
    return false;
  }
  const st = d.steps[d.stepIndex];
  if (st.type === "ban") {
    const hn = st.actor === d.mySide ? myAutoBan() : aiBanHero(st.actor);
    if (!hn) return false;                       // 我方被禁用一键BP / ban池空：停在原步，不推进
    d.bans[st.actor].push(hn); d.used.push(hn);
  } else if (st.actor === d.mySide) {
    const pk = myAutoPick();
    if (!pk) return false;                       // 同上：不跳过玩家的选将回合
    d.picks[d.mySide].push({ pos: pk.pos, hero: pk.hero }); d.used.push(pk.hero);
  } else {
    aiPickTurn(st);
  }
  d.stepIndex++;
  if (d.stepIndex >= d.steps.length) { d.over = true; d.phase = "done"; simGame(); return false; }
  return true;
}
function autoBpTick() {
  const delay = S._autoDelay != null ? S._autoDelay : AUTO_BP_DELAY;
  S._autoTimer = setTimeout(() => {
    S._autoTimer = null;
    if (!S._autoRun || !S.series || S.series.sub !== "draft") { stopAutoBp(); return; }
    const more = autoBpStep();
    save(); render();
    if (more && S._autoRun) autoBpTick(); else stopAutoBp();
  }, delay);
}
function autoBp() {
  if (!autoBpAllowed()) { toast("传奇难度（含真实大名单）禁用一键 BP，请手动 ban / 选将"); return; }
  if (S._autoRun) { stopAutoBp("已停止自动 BP"); render(); return; }
  if (!S.series || S.series.sub !== "draft" || !S.series.draft) { toast("现在不是 BP 阶段"); return; }
  if (S.series.draft.over) { toast("本局 BP 已结束"); return; }
  S._autoRun = true;
  const more = autoBpStep();   // 第一步立即执行，玩家马上看到变化
  save(); render();
  if (more && S._autoRun) autoBpTick(); else stopAutoBp();
}

/* ---------------- 系列赛页面 ---------------- */
function renderSeries() {
  const s = S.series, d = s.draft;
  const myT = getMyTeam(), opp = S.teams.find(t => t.id === s.oppId);
  const head = `${renderTopbar()}<div class="card">
    <div class="section-title">${escapeHtml(s.label)} — ${escapeHtml(myT.name)} vs ${escapeHtml(opp.name)} · BO${s.bestOf}</div>
    <div class="center muted" style="font-size:12px;margin-bottom:4px">对手 BP 水平：<b style="color:var(--gold)">${escapeHtml(aiBpLabel())}</b>${S.rosterMode === "real" ? "（真实大名单固定按传奇）" : "（由难度决定，不改战力）"}</div>
    <div class="score-big" style="font-size:30px"><span class="w">${s.myScore}</span> : <span class="l">${s.opScore}</span></div>
    ${d && d.peak
      ? `<div class="center peak-banner" style="margin-bottom:10px"><b>⚡ 第 7 局 · 巅峰对决</b> · 无 ban 位 · 双方盲选 · 不受全局BP限制（此前用过的英雄仍可选）· 双方可选到相同英雄</div>`
      : `<div class="center muted" style="margin-bottom:10px">第 ${s.gameIndex + 1} 局 · 全局BP（按战队记）：${escapeHtml(myT.name)} 已用 ${myUsed().length} / ${escapeHtml(opp.name)} 已用 ${oppUsed().length}</div>`}`;

  if (s.sub === "over") { root.innerHTML = head + renderSeriesOver(s) + "</div>"; return; }
  if (s.sub === "preview") { root.innerHTML = head + renderPreview(s) + "</div>"; return; }
  if (s.sub === "battle") { root.innerHTML = head + renderBattle(s) + "</div>"; return; }
  if (s.sub === "result") { root.innerHTML = head + renderGameResult(s) + "</div>"; return; }
  if (s.sub === "sub") { root.innerHTML = head + renderSubBetween(s) + "</div>"; return; }

  // draft
  const mySide = d.mySide, oth = aiSide(d);
  const peak = !!d.peak;
  const playerTurn = !d.over && currentActor() === mySide;
  const sideTag = mySide === "blue" ? '<span class="pill cyan">本局我方蓝方 · 先选</span>' : '<span class="pill red">本局我方红方 · 后手Counter</span>';
  function board(side) {
    const banTxt = peak ? '<i class="muted">无（巅峰对决）</i>' : (d.bans[side].length ? d.bans[side].map(b => escapeHtml(b)).join("、") : '<i class="muted">—</i>');
    // 巅峰对决为盲选：我方填满前不揭示对手阵容
    if (peak && !d.over && side !== mySide) {
      const hiddenRows = POS.map(pos => `<div class="draft-row"><span class="pname">${POS_NAME[pos]}</span><span class="phero"><i class="muted">盲选中…</i></span></div>`).join("");
      return `<div class="draft-side foe">
      <div class="draft-head">${escapeHtml(opp.name)} · ${sideName(side)} · 盲选</div>
      <div class="draft-bans">禁：${banTxt}</div>
      ${hiddenRows}</div>`;
    }
    const rows = POS.map(pos => {
      const e = d.picks[side].find(x => x.pos === pos);
      const h = e ? heroByName(e.hero) : null;
      const fit = h ? laneFit(h, pos) : null;
      const fitHtml = h ? ` <b class="${fitClass(fit)}" style="font-size:11px">${fitLabel(fit)}</b>` : "";
      const mini = h ? `<span class="mini-radar" title="OSCM 输出${h.o}/生存${h.s}/控制${h.c}/机动${h.m}">${radarSvg([{ vals: oscmVals(h), color: "#8b96b0", fill: "rgba(139,150,176,.18)" }], 22)}</span>` : "";
      return `<div class="draft-row"><span class="pname">${POS_NAME[pos]}</span><span class="phero">${e ? escapeHtml(e.hero) + fitHtml + mini : '<i class="muted">…</i>'}</span></div>`;
    }).join("");
    return `<div class="draft-side ${side === mySide ? 'me' : 'foe'}">
      <div class="draft-head">${side === mySide ? "我方" : escapeHtml(opp.name)} · ${sideName(side)}${peak ? " · 巅峰对决" : ""}</div>
      <div class="draft-bans">禁：${banTxt}</div>
      ${rows}</div>`;
  }
  // 我方侧：选将回合变为可拖拽的分路槽
  const st = currentStep();
  const peakTurn = peak && !d.over;
  const pickTurn = peak ? peakTurn : (playerTurn && st && st.type === "pick");
  function myBoard() {
    if (!pickTurn) return board(mySide);
    const pending = S._pendingHero;
    const rows = POS.map(pos => {
      const e = d.picks[mySide].find(x => x.pos === pos);
      let heroHtml, fit = null;
      const sw = S._swapFrom === pos ? " swapfrom" : "";
      if (e) {
        const h = heroByName(e.hero);
        fit = laneFit(h, pos);
        const mini = `<span class="mini-radar" title="OSCM 输出${h.o}/生存${h.s}/控制${h.c}/机动${h.m}">${radarSvg([{ vals: oscmVals(h), color: "#34d3e0", fill: "rgba(52,211,224,.22)" }], 22)}</span>`;
        heroHtml = `<span class="chip" draggable="true" data-hero="${escapeHtml(e.hero)}">${escapeHtml(e.hero)}</span> <b class="${fitClass(fit)}" style="font-size:11px">${fitLabel(fit)}</b>${mini}`;
      }
      else if (pending) {
        const ph = heroByName(pending);
        fit = laneFit(ph, pos);
        const enemySame = d.picks[oth].find(x => x.pos === pos);
        const lbl = enemySame ? matchupLabel(ph, heroByName(enemySame.hero)) : "";
        heroHtml = `<span class="muted">放置【${escapeHtml(pending)}】</span> <b class="${fitClass(fit)}" style="font-size:11px">${fitLabel(fit)}</b>${lbl ? ` <b class="${lbl === '克制' ? 'c-good' : lbl === '被克' ? 'c-bad' : 'c-mid'}" style="font-size:11px">${lbl}</b>` : ""}`;
      }
      else heroHtml = `<span class="muted">拖拽英雄到此 / 或先点英雄</span>`;
      return `<div class="draft-row slot ${e ? 'filled' : ''} ${pending && !e ? 'hint' : ''}${sw}" data-slot="${pos}" data-act="placeslot:${pos}"><span class="pname">${POS_NAME[pos]}</span><span class="phero">${heroHtml}</span></div>`;
    }).join("");
    return `<div class="draft-side me">
      <div class="draft-head">我方 · ${sideName(mySide)}（拖拽英雄到分路）${peak ? " · 巅峰对决" : ""}</div>
      <div class="draft-bans">禁：${peak ? '<i class="muted">无（巅峰对决）</i>' : (d.bans[mySide].length ? d.bans[mySide].map(b => escapeHtml(b)).join("、") : '<i class="muted">—</i>')}</div>
      ${rows}</div>`;
  }
  let action = "";
  const banNo = d.bans[mySide].length + 1; // 我方第几个ban（共5）
  if (peakTurn) {
    // 巅峰对决：全部英雄可选（含此前用过的），无 ban、不受全局BP限制
    const pending = S._pendingHero;
    const prevUsed = myUsed();
    const benchHtml = HEROES.map(h => {
      const mine = heroInMyPool(h.name);
      const star = mine ? "★" : "";
      const sel = pending === h.name ? "sel" : "";
      const tag = prevUsed.includes(h.name) ? `<em class="peak-tag" title="本系列赛用过，巅峰对决仍可选">曾用</em>` : "";
      return `<button class="hero-chip ${sel}" draggable="true" data-hero="${h.name}" data-lane="${h.pos}" data-mine="${mine ? 1 : 0}" data-act="pickhero:${h.name}" aria-label="选择 ${h.name}，${POS_NAME[h.pos]}，${ARC_NAME[h.arc]}${mine ? "，本队选手擅长" : ""}">${h.name}${star}${tag}<i class="muted" style="font-size:10px"> ${ARC_NAME[h.arc]}</i></button>`;
    }).join("");
    action = `<div class="section-title mt">⚡ 巅峰对决 · 我方盲选（${d.picks[mySide].length}/5）</div>
      <div class="warn mb peak-note">本局 <b>没有 ban 位</b>、<b>不受全局BP限制</b>：此前用过的英雄仍可选（标 <em class="peak-tag">曾用</em>），双方也可能选到<b>同一个英雄</b>。选满 5 个后立即揭示对手阵容并开赛。</div>
      ${pending ? renderPendingCard(pending) : ""}
      ${bpFilterBarHtml("bench")}
      <div class="bench" id="bench" data-scroll-id="bench">${benchHtml}</div>`;
  } else if (playerTurn && st && st.type === "ban") {
    const pool = availBanHeroes(true); // ban位池：只去掉对方全局BP用过的
    const threat = oppThreatHeroes(6);
    const groups = POS.map(pos => {
      const hs = pool.filter(h => h.pos === pos); if (!hs.length) return "";
      return `<div class="mb" data-lane-group="${pos}"><div class="muted" style="font-size:12px;margin-bottom:4px">${POS_NAME[pos]}</div>
        <div class="hero-opt">${hs.map(h => `<button class="ban-btn" data-act="ban:${h.name}" data-hero="${h.name}" data-lane="${h.pos}" data-mine="${heroInMyPool(h.name) ? 1 : 0}" aria-label="禁用 ${h.name}，${POS_NAME[h.pos]}，${ARC_NAME[h.arc]}">${h.name}<i class="muted" style="font-size:10px"> ${ARC_NAME[h.arc]}</i></button>`).join("")}</div></div>`;
    }).join("");
    const intel = threat.length ? `<div class="intel mb">
      <div class="intel-h">🎯 对手擅长（按其首发选手英雄池与战力排序，建议优先 ban）</div>
      <div class="hero-opt">${threat.map(t => `<button class="ban-btn threat" data-act="ban:${t.name}" data-hero="${t.name}" aria-label="禁用对手擅长英雄 ${t.name}，由 ${escapeHtml(t.by)} 使用">${t.name}<i class="muted" style="font-size:10px"> ${POS_NAME[t.pos]}·${escapeHtml(t.by)}</i></button>`).join("")}</div>
      ${oppPickHistoryHtml()}
    </div>` : "";
    action = `<div class="section-title mt">禁用阶段 · 我方第 ${banNo}/5 个 ban ${sideTag} — 点击英雄禁用</div>
      <div class="muted mb" style="font-size:12px">ban 位池按<b>战队</b>过滤：已移除<b>对手战队</b>用过的英雄；本队用过的仍可 ban（只是不能再选）。</div>
      ${intel}
      ${bpFilterBarHtml("ban")}
      <div class="ban-pool" id="banpool" data-scroll-id="banpool">${groups}</div>`;
  } else if (pickTurn) {
    const bench = availHeroes();
    const pending = S._pendingHero;
    const oppPrev = oppUsed(); // 对手战队的已用英雄：本队仍可选（全局BP按战队）
    const benchHtml = bench.map(h => {
      const mine = heroInMyPool(h.name);
      const star = mine ? "★" : "";
      const sel = pending === h.name ? "sel" : "";
      const otag = oppPrev.includes(h.name) ? `<em class="otag" title="对手战队用过，本队仍可选用">敌用</em>` : "";
      return `<button class="hero-chip ${sel}" draggable="true" data-hero="${h.name}" data-lane="${h.pos}" data-mine="${mine ? 1 : 0}" data-oppused="${oppPrev.includes(h.name) ? 1 : 0}" data-act="pickhero:${h.name}" aria-label="选择 ${h.name}，${POS_NAME[h.pos]}，${ARC_NAME[h.arc]}${mine ? "，本队选手擅长" : ""}${oppPrev.includes(h.name) ? "，对手用过但本队仍可选" : ""}">${h.name}${star}${otag}<i class="muted" style="font-size:10px"> ${ARC_NAME[h.arc]}</i></button>`;
    }).join("");
    action = `<div class="section-title mt">选将台（点英雄或直接拖拽到左侧分路）${sideTag}</div>
      ${pending ? renderPendingCard(pending) : ""}
      ${bpFilterBarHtml("bench")}
      <div class="bench" id="bench" data-scroll-id="bench">${benchHtml || '<div class="muted">已无可选英雄</div>'}</div>
      <div class="muted mt">★=有选手擅长；<em class="otag">敌用</em>=对手战队用过、本队仍可抢；<b>本队用过的英雄已从池中锁定</b>（与红蓝方无关，只按战队记）。键盘：<kbd>/</kbd> 搜索、方向键移动、<kbd>Enter</kbd> 选择。</div>`;
  } else {
    action = `<div class="section-title mt">对手正在选择…</div><div class="muted">BP 推进中。</div>`;
  }
  root.innerHTML = head + `
    ${renderLineupVs()}
    <div class="draft-board">${myBoard()}<div class="draft-vs">VS</div>${board(oth)}</div>
    ${renderOscmPanel(Object.fromEntries(d.picks[mySide].map(e => [e.pos, e.hero])), Object.fromEntries(d.picks[oth].map(e => [e.pos, e.hero])), opp.name)}
    ${renderPastGames()}
    <div class="flex-between mt">
      <div class="hero-opt">
        <span class="muted" style="margin-right:6px">本局战术：</span>
        <button class="btn ghost sm ${d.tactic === '稳' ? 'gold' : ''}" data-act="drafttactic:稳" aria-pressed="${d.tactic === '稳'}" aria-label="本局战术：稳健">稳健</button>
        <button class="btn ghost sm ${d.tactic === '攻' ? 'gold' : ''}" data-act="drafttactic:攻" aria-pressed="${d.tactic === '攻'}" aria-label="本局战术：激进">激进</button>
        <button class="btn ghost sm ${d.tactic === '奇' ? 'gold' : ''}" data-act="drafttactic:奇" aria-pressed="${d.tactic === '奇'}" aria-label="本局战术：奇袭">奇袭</button>
      </div>
      ${autoBpAllowed()
        ? `<button class="btn ${autoBpRunning() ? 'ghost' : 'gold'} sm" data-act="autobp" aria-label="${autoBpRunning() ? "停止自动BP" : "一键BP，自动完成剩余禁用与选将"}" title="强度略低于手动（介于新秀与职业之间）：偶尔会放过克制或随到次优英雄。可再次点击停止，快捷键 B">${autoBpRunning() ? '⏹ 停止自动BP' : '⚡ 一键BP'}</button>`
        : `<button class="btn ghost sm" disabled aria-label="传奇难度禁用一键BP，必须手动 ban 和选将" title="传奇难度（含真实大名单）禁用一键BP">🔒 一键BP（传奇禁用）</button>`}
    </div>
    ${!autoBpAllowed() ? `<div class="warn" style="border-color:rgba(255,59,59,.35);background:rgba(255,59,59,.07)">🔒 <b>传奇难度</b>（含真实大名单）下<b>禁用一键 BP</b>：请手动 ban / 选将。想用一键 BP 请切到新秀或职业难度开档。</div>` : ''}
    ${autoBpRunning() ? (peak
      ? `<div class="warn" style="border-color:rgba(245,197,24,.45);background:rgba(245,197,24,.08);color:var(--gold)">⚡ 正在自动盲选…（巅峰对决，选满 5 人即开赛）</div>`
      : `<div class="warn" style="border-color:rgba(245,197,24,.45);background:rgba(245,197,24,.08);color:var(--gold)">⚡ 自动 BP 进行中… 第 ${Math.min(d.stepIndex + 1, d.steps.length)} / ${d.steps.length} 步 · 我方 ${sideName(mySide)}（点『停止自动BP』可中止）</div>`) : ''}
    ${action}
    ${d.over ? '' : '<button class="btn ghost sm mt" data-act="abandonseries" aria-label="放弃本场系列赛并返回">放弃本场系列赛（返回）</button>'}
    </div>`;
  wireBpTools();
}
/* ---------------- BP 筛选（分路Tab / 只看我的英雄池 / 搜索 / 键盘） ---------------- */
function bpFilter() {
  if (!S._bpFilter) S._bpFilter = { lane: "all", mine: false, q: "" };
  return S._bpFilter;
}
function heroInMyPool(name) {
  const myT = getMyTeam();
  if (!myT) return false;
  return POS.some(pos => { const p = getPlayer(myT, myT.lineup[pos]); return p && (p.heroPool || []).includes(name); });
}
function bpFilterBarHtml(kind) {
  const f = bpFilter();
  const lanes = [["all", "全部"], ["top", "对抗路"], ["jungle", "打野"], ["mid", "中路"], ["bot", "发育路"], ["support", "辅助"]];
  const tabs = lanes.map(([k, n]) => `<button class="lane-tab ${f.lane === k ? "sel" : ""}" data-act="bplane:${k}" role="tab" aria-selected="${f.lane === k}" aria-pressed="${f.lane === k}" aria-label="只看${n}英雄">${n}</button>`).join("");
  return `<div class="bp-tools">
    <div class="lane-tabs" role="tablist" aria-label="分路筛选">${tabs}</div>
    <label class="bp-toggle"><input type="checkbox" id="bp-mine" ${f.mine ? "checked" : ""} aria-label="只看我的英雄池" /> 只看我的英雄池</label>
    <input id="${kind}-filter" class="bp-search" type="search" placeholder="搜索英雄（按 / 定位）…" value="${escapeHtml(f.q || "")}" aria-label="搜索英雄" />
    <span class="muted" style="font-size:11px">方向键移动 · <kbd>Enter</kbd> 确认</span>
    <span class="muted" id="bp-count" style="font-size:11px"></span>
  </div>`;
}
function bpVisibleList() {
  return Array.from(document.querySelectorAll("#bench .hero-chip, #banpool .ban-btn")).filter(el => el.offsetParent !== null);
}
function markBpFocus() {
  const list = bpVisibleList();
  list.forEach((el, i) => el.classList.toggle("kbd", i === S._bpIdx));
  if (S._bpIdx >= 0 && list[S._bpIdx]) { try { list[S._bpIdx].scrollIntoView({ block: "nearest" }); } catch (e) {} }
}
function applyBpFilter() {
  const f = bpFilter();
  const hit = el => {
    const name = el.getAttribute("data-hero") || (el.getAttribute("data-act") || "").split(":")[1] || "";
    const lane = el.getAttribute("data-lane") || "";
    if (f.lane !== "all" && lane !== f.lane) return false;
    if (f.mine && el.getAttribute("data-mine") !== "1") return false;
    if (f.q && !name.includes(f.q)) return false;
    return true;
  };
  document.querySelectorAll("#bench .hero-chip, #banpool .ban-btn").forEach(el => { el.style.display = hit(el) ? "" : "none"; });
  document.querySelectorAll("#banpool [data-lane-group]").forEach(g => {
    const any = Array.from(g.querySelectorAll(".ban-btn")).some(b => b.style.display !== "none");
    g.style.display = any ? "" : "none";
  });
  const shown = Array.from(document.querySelectorAll("#bench .hero-chip, #banpool .ban-btn")).filter(el => el.style.display !== "none").length;
  const cnt = document.getElementById("bp-count"); if (cnt) cnt.textContent = `显示 ${shown} 个`;
  const list = bpVisibleList();
  if (S._bpIdx != null && S._bpIdx > list.length - 1) S._bpIdx = list.length - 1;
  markBpFocus();
}
function wireBpTools() {
  ["bench-filter", "ban-filter"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => { bpFilter().q = el.value; applyBpFilter(); });
  });
  const mineEl = document.getElementById("bp-mine");
  if (mineEl) mineEl.addEventListener("change", () => { bpFilter().mine = mineEl.checked; applyBpFilter(); });
  applyBpFilter();
}
// 对手擅长英雄（用于 ban 阶段情报）
function oppThreatHeroes(n) {
  if (!S || !S.series) return [];
  const opp = S.teams.find(t => t.id === S.series.oppId);
  if (!opp) return [];
  const best = {};
  POS.forEach(pos => {
    const p = getPlayer(opp, opp.lineup[pos]);
    if (!p) return;
    (p.heroPool || []).forEach(nm => {
      const h = heroByName(nm); if (!h) return;
      const sc = heroStrength(h) * 1.12 * laneFit(h, pos) * (POS_WEIGHT[pos] || 1);
      if (!best[nm] || best[nm].score < sc) best[nm] = { name: nm, pos, score: sc, by: p.name };
    });
  });
  const pool = new Set(availBanHeroes(true).map(h => h.name));
  return Object.values(best).filter(x => pool.has(x.name)).sort((a, b) => b.score - a.score).slice(0, n || 6);
}
// 对手本系列赛的常用 pick（ban 阶段参考）
function oppPickHistoryHtml() {
  const s = S.series;
  const cnt = {};
  (s.games || []).forEach(g => Object.values(g.oppPicks || {}).forEach(h => { if (h) cnt[h] = (cnt[h] || 0) + 1; }));
  const list = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (!list.length) return `<div class="muted" style="font-size:11.5px;margin-top:6px">本系列赛对手尚无 pick 记录（第 ${s.gameIndex + 1} 局）。</div>`;
  return `<div class="muted" style="font-size:11.5px;margin-top:6px">本系列赛对手已用：${list.map(([h, c]) => `${escapeHtml(h)}${c > 1 ? `×${c}` : ""}`).join("、")}</div>`;
}
// 当前分钟的我方胜率（从赛前 pWin 向最终结果过渡，叠加局势波动）
function battleWinRate(b) {
  const p = Math.min(1, b.minute / b.duration);
  const target = b.myWin ? 0.92 : 0.08;
  const base = (b.pWin != null ? b.pWin : 0.5) + (target - (b.pWin != null ? b.pWin : 0.5)) * Math.pow(p, 0.8);
  const n = (b.noise && b.noise[Math.max(0, b.minute - 1)]) || 0;
  return clamp(base + n + (b.swing || 0), 0.03, 0.97);
}
function renderPreview(s) {
  const b = s.battle;
  const myPow = Math.round(b.myTotal), oppPow = Math.round(b.oppTotal);
  const tot = (myPow + oppPow) || 1; const mp = Math.round(myPow / tot * 100);
  const myIsBlue = b.mySide === "blue";
  const compBadge = (c) => `<span class="pill ${c.tier === '优' ? 'green' : c.tier === '差' ? 'red' : 'gold'}">${c.tier} ${c.score}</span>`;
  const rows = POS.map(pos => {
    const mh = b.myPicks[pos], oh = b.oppPicks[pos];
    const lh = heroByName(mh), ohh = heroByName(oh);
    const lbl = matchupLabel(lh, ohh);
    const note = heroCounterNote(lh.name, ohh.name);
    return `<div class="draft-row"><span class="pname">${POS_NAME[pos]}</span><span class="phero">${escapeHtml(mh)} <i class="muted">vs</i> ${escapeHtml(oh)} <b class="${lbl === '克制' ? 'c-good' : lbl === '被克' ? 'c-bad' : 'c-mid'}">${lbl}</b>${note ? ` <i class="muted" style="font-size:11px">${escapeHtml(note)}</i>` : ""}</span></div>`;
  }).join("");
  return `<div class="section-title mt">战前 · 战力计算</div>
  <div class="pk-wrap"><div class="pk-half ${myIsBlue ? 'blue' : 'red'}" style="width:${mp}%">我方 ${myPow}</div><div class="pk-half ${myIsBlue ? 'red' : 'blue'}" style="width:${100 - mp}%">${oppPow} 对手</div></div>
  <div class="pk-labels"><span>◀ 我方战力（${sideName(b.mySide)}）</span><span>对手战力（${sideName(b.mySide === 'blue' ? 'red' : 'blue')}）▶</span></div>
  ${rows}
  ${renderOscmPanel(b.myPicks, b.oppPicks, S.teams.find(t => t.id === S.series.oppId).name)}
  <div class="mb mt"><b>我方阵容判定</b> ${compBadge(b.myComp)} <span class="muted" style="font-size:12px">${b.myComp.tips.map(escapeHtml).join("；")}</span></div>
  <div class="mb"><b>对手阵容判定</b> ${compBadge(b.oppComp)}</div>
  ${b.combos.length ? `<div class="warn" style="border-color:rgba(245,197,24,.4);background:rgba(245,197,24,.08);color:var(--gold)">触发组合体系：${b.combos.map(escapeHtml).join(" / ")}（战力 ×${b.comboMult.toFixed(2)}）</div>` : ""}
  <div class="muted mt">本局战术：<b>${b.tactic}</b> · 阵容系数 ×${b.myComp.mult.toFixed(2)}</div>
  <button class="btn gold mt" data-act="startbattle">开始比赛</button>`;
}
function renderPastGames() {
  const s = S.series;
  if (!s.games || !s.games.length) return "";
  const opp = S.teams.find(t => t.id === s.oppId);
  const myT = getMyTeam();
  const rows = s.games.map((g, i) => {
    const myH = POS.map(p => g.myPicks[p]).filter(Boolean).join("、");
    const opH = POS.map(p => g.oppPicks[p]).filter(Boolean).join("、");
    return `<div class="bk-row"><span class="bk-label">第${i + 1}局${g.peak ? '<b class="peak-mark">巅峰对决</b>' : ""}</span><span>"${escapeHtml(myH)}" VS "${escapeHtml(opH)}" <b class="${g.winner === 'me' ? 'c-good' : 'c-bad'}">${g.winner === 'me' ? '胜' : '负'}</b></span></div>`;
  }).join("");
  // 按战队统计已用英雄（与红蓝方无关，阵营每局互换也不影响归属）
  const teamBlock = (name, list, cls) => `<div class="mb"><div class="muted" style="font-size:12px;margin-bottom:4px"><b class="${cls}">${escapeHtml(name)}</b> 已用 ${list.length} 个 · 本队后续局不可再选${cls === 'c-bad' ? '（且已从你 ban 位池移除）' : '（仍可被 ban）'}</div><div class="hero-opt">${list.length ? list.map(h => `<span class="tag even">${escapeHtml(h)}</span>`).join("") : '<i class="muted">—</i>'}</div></div>`;
  return `<div class="section-title mt">往期对局英雄（本系列赛）</div><div class="bracket">${rows}</div>
  <div class="section-title mt">全局BP 已用英雄 · 按战队记（红蓝方每局互换不改变归属）</div>
  ${teamBlock(`${myT.name}（本队）`, myUsed(), "c-good")}
  ${teamBlock(`${opp.name}（对手）`, oppUsed(), "c-bad")}`;
}
function battleFeedHtml(b) {
  // 最新战况在最上面（不提前告知本局总时长）
  return b.lines.slice().reverse().map(l => `<div class="report-line ${l.surprise ? 'sp' : ''}"><span class="tag ${l.surprise ? 'key' : 'even'}">${l.surprise ? '⚡' : '战'}</span><span class="body">${escapeHtml(l.text)}</span></div>`).join("");
}
function renderBattle(s) {
  const b = s.battle;
  const pct = Math.min(100, Math.round(b.minute / b.duration * 100));
  const wr = battleWinRate(b);
  const myPct = Math.round(wr * 100), oppPct = 100 - myPct;
  const mySide = b.mySide, oth = mySide === "blue" ? "red" : "blue";
  const myIsBlue = mySide === "blue";
  // 胜率条：左=我方（标注红/蓝），右=对手（标注红/蓝），避免混淆
  const bar = `
  <div class="pk-wrap" role="img" aria-label="实时胜算：我方 ${myPct}%，对手 ${oppPct}%">
    <div class="pk-half ${myIsBlue ? 'blue' : 'red'}" id="battle-bar-me" style="width:${myPct}%">我方·${sideName(mySide)} ${myPct}%</div>
    <div class="pk-half ${myIsBlue ? 'red' : 'blue'}" id="battle-bar-op" style="width:${oppPct}%">${oppPct}% 对手·${sideName(oth)}</div>
  </div>
  <div class="pk-labels"><span>◀ 我方（${sideName(mySide)}${myIsBlue ? '，先选' : '，后手Counter'}）</span><span>（${sideName(oth)}）对手 ▶</span></div>`;
  const feed = battleFeedHtml(b);
  return `<div class="section-title mt">本局进行中（实时战况，最新在上）</div>
  ${bar}
  <div class="center muted mt">第 <b id="battle-minute">${b.minute}</b> 分钟 · 系列赛 ${s.myScore} : ${s.opScore}</div>
  <div class="battle-feed mt" id="battle-feed" data-scroll-id="battle-feed" aria-live="polite" aria-label="实时战况播报">${feed || '<div class="muted">双方进入召唤师峡谷…</div>'}</div>
  <div class="action-spacer"></div>
  <div class="action-bar" role="toolbar" aria-label="战斗操作条">
    <div class="ab-progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="本局进度"><i id="battle-progress" style="width:${pct}%"></i></div>
    <div class="ab-btns">
      <span class="muted" style="font-size:12px">按 <kbd>S</kbd> 也可跳过</span>
      <button class="btn gold" data-act="battleskip" aria-label="跳过战斗，直接看结果">⏭ 跳过战斗</button>
    </div>
  </div>`;
}
/* 战斗页局部更新：只改播报区/进度/胜率条，不再整页重绘（避免滚动与按钮跳动） */
function patchBattle() {
  const b = S && S.series && S.series.battle;
  const feed = document.getElementById("battle-feed");
  if (!b || !feed) { render(); return; }
  feed.innerHTML = battleFeedHtml(b) || '<div class="muted">双方进入召唤师峡谷…</div>';
  const m = document.getElementById("battle-minute"); if (m) m.textContent = b.minute;
  const pct = Math.min(100, Math.round(b.minute / b.duration * 100));
  const pr = document.getElementById("battle-progress");
  if (pr) pr.style.width = pct + "%";
  const wr = battleWinRate(b), my = Math.round(wr * 100), op = 100 - my;
  const me = document.getElementById("battle-bar-me"), fo = document.getElementById("battle-bar-op");
  const sideTxt = sideName(b.mySide), othTxt = sideName(b.mySide === "blue" ? "red" : "blue");
  if (me) { me.style.width = my + "%"; me.textContent = `我方·${sideTxt} ${my}%`; }
  if (fo) { fo.style.width = op + "%"; fo.textContent = `${op}% 对手·${othTxt}`; }
}
function renderGameResult(s) {
  const g = s.games[s.games.length - 1];
  const win = g.winner === "me";
  const rows = POS.map(pos => {
    const lh = heroByName(g.myPicks[pos]), oh = heroByName(g.oppPicks[pos]);
    const lbl = matchupLabel(lh, oh);
    return `<div class="draft-row"><span class="pname">${POS_NAME[pos]}</span><span class="phero">${escapeHtml(g.myPicks[pos])} <i class="muted">vs</i> ${escapeHtml(g.oppPicks[pos])} <b class="${lbl === '克制' ? 'c-good' : lbl === '被克' ? 'c-bad' : 'c-mid'}">${lbl}</b></span></div>`;
  }).join("");
  const comboTxt = (g.combos && g.combos.length) ? `<div class="warn mt" style="border-color:rgba(245,197,24,.4);background:rgba(245,197,24,.08);color:var(--gold)">触发组合体系：${g.combos.map(c => escapeHtml(c)).join(" / ")}（我方战力加成）</div>` : "";
  const oppComboTxt = (g.oppCombos && g.oppCombos.length) ? `<div class="muted mt">对手组合：${g.oppCombos.map(c => escapeHtml(c)).join(" / ")}</div>` : "";
  return `<div class="section-title mt">第 ${s.games.length} 局结果${g.peak ? ' <b class="peak-mark">⚡ 巅峰对决</b>' : ""}</div>
  <div class="warn" style="${win ? 'border-color:rgba(61,220,132,.4);background:rgba(61,220,132,.08);color:var(--green)' : ''}">${win ? '✅ 本局获胜' : '❌ 本局落败'} · 系列赛比分 ${s.myScore} : ${s.opScore}</div>
  ${rows}${comboTxt}${oppComboTxt}
  ${renderLineupVs()}
  <div class="muted mt">${g.peak ? "⚡ 巅峰对决结束，本系列赛收官（本局英雄不写入全局BP池）。" : "本局我方选将后续局不可再用（但仍可ban）；对方选将从ban位池移除。可先换人再进入下一局。"}</div>
  <button class="btn gold mt" data-act="seriesnext">下一局 · 准备</button>`;
}
function renderSubBetween(s) {
  const t = getMyTeam();
  const avg = Math.round(POS.reduce((a, pos) => { const p = getPlayer(t, t.lineup[pos]); return a + (p ? p.st : 0); }, 0) / 5);
  const worn = POS.filter(pos => { const p = getPlayer(t, t.lineup[pos]); return p && p.st <= 55; });
  const rows = POS.map(pos => {
    const opts = t.players[pos].map(p => {
      const st = p.st <= 45 ? " <b class=\"c-bad\">体" + Math.round(p.st) + "</b>" : p.st <= 60 ? " <b class=\"c-mid\">体" + Math.round(p.st) + "</b>" : "";
      return `<button class="btn ${t.lineup[pos] === p.id ? 'gold' : 'ghost'} sm" data-act="setlineup:${pos}:${p.id}" aria-label="将 ${escapeHtml(p.name)} 设为${POS_NAME[pos]}首发，总评${p.ovr}，体能${Math.round(p.st)}">${escapeHtml(p.name)}${p.status === 'inj' ? '🚑' : ''}${st}</button>`;
    }).join(" ");
    const cur = getPlayer(t, t.lineup[pos]);
    const warn = cur && cur.st <= 55 ? `<b class="c-bad" style="font-size:11px;margin-left:6px">⚠ 体能 ${Math.round(cur.st)}</b>` : "";
    return `<div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--line)">
      <div><b style="color:var(--gold)">${POS_NAME[pos]}</b> <span class="muted">${escapeHtml(cur.name)} 体${Math.round(cur.st)}${cur.status !== 'ok' ? ' ' + statusLabel(cur)[1] : ''}</span>${warn}</div>
      <div class="hero-opt">${opts}</div></div>`;
  }).join("");
  // 败方选边（巅峰对决为盲选，没有先手/后手之分，无需选边）
  let sideBlock = "";
  const nextPeak = isPeakGame(s);
  const locked = !!s.sideLocked;
  if (nextPeak) {
    sideBlock = `<div class="warn mt peak-note">下一局是 <b>⚡ 巅峰对决</b>：双方盲选，没有先选/后手之分，无需选边（也没有 ban 位）。</div>`;
  } else if (s.nextSideBy === "me") {
    sideBlock = `<div class="section-title mt">败方选边（上局你落败，由你选择下一局阵营）</div>
      <div class="hero-opt">
        <button class="btn ${s.nextSide === 'blue' ? 'gold' : 'ghost'} sm" data-act="chooseside:blue" ${locked ? "disabled" : ""} aria-pressed="${s.nextSide === 'blue'}" aria-label="选择蓝方，先选英雄">${s.nextSide === 'blue' && locked ? '✓ ' : ''}蓝方（先选）</button>
        <button class="btn ${s.nextSide === 'red' ? 'gold' : 'ghost'} sm" data-act="chooseside:red" ${locked ? "disabled" : ""} aria-pressed="${s.nextSide === 'red'}" aria-label="选择红方，后手 Counter">${s.nextSide === 'red' && locked ? '✓ ' : ''}红方（后手Counter）</button>
      </div>
      <div class="muted mt">${locked ? `<b class="c-good">已锁定：${sideName(s.nextSide)}</b> · 正在进入第 ${s.gameIndex + 1} 局 BP…` : "选择后即锁定（不可反悔），并自动进入下一局 BP。"}</div>`;
  } else if (s.nextSideBy === "opp") {
    sideBlock = `<div class="warn mt">上局对手落败，对手选择了下一局阵营：<b>${sideName(s.nextSide)}</b>。</div>`;
  }
  return `<div class="section-title mt">局间换人（第 ${(s.games || []).length + 1} 局前 · 系列赛 ${s.myScore} : ${s.opScore}）</div>
  <div class="muted mb">上一局后选手体能下降（每局 -${GAME_STAMINA_COST}）、状态可能波动。当前首发平均体能 <b class="${avg <= 55 ? 'c-bad' : ''}">${avg}</b>${worn.length ? ` · <b class="c-bad">${worn.map(p => POS_NAME[p]).join("/")} 体能告急</b>` : ""}。
    <br><b>系列赛进行中不能全队休息</b>（大场打完后才能休息），这段只能靠<b>换人</b>和<b>一键轮换</b>调度体能。</div>
  <div class="hero-opt mb">
    <button class="btn ghost sm" data-act="rotate" aria-label="一键轮换建议，自动换上体能更好的替补">🔄 一键轮换建议</button>
    <span class="muted" style="font-size:12px;align-self:center">局间仅可换人 · 全队休息需等本场结束</span>
  </div>
  ${sideBlock}
  ${rows}
  <button class="btn gold mt" data-act="seriesstartgame" ${(!nextPeak && s.nextSideBy === "me" && !s.nextSide) ? "disabled" : ""}>开始第 ${(s.games || []).length + 1} 局 BP</button>`;
}
// 双方出场选手（ID + 评级/总评）
function renderLineupVs() {
  const s = S.series;
  const myT = getMyTeam(), opp = S.teams.find(t => t.id === s.oppId);
  const row = (team) => POS.map(pos => {
    const p = getPlayer(team, team.lineup[pos]);
    const rc = ratingColor(p.rating);
    return `<span class="pill" style="font-size:11px">${POS_NAME[pos]} <b>${escapeHtml(p.name)}</b> <span style="color:${rc}">${p.rating}</span>${p.ovr}</span>`;
  }).join(" ");
  return `<div class="section-title mt">双方出场选手</div>
  <div class="mb"><div class="muted" style="font-size:12px;margin-bottom:4px">我方 ${escapeHtml(myT.name)}</div><div class="hero-opt">${row(myT)}</div></div>
  <div class="mb"><div class="muted" style="font-size:12px;margin-bottom:4px">${escapeHtml(opp.name)}</div><div class="hero-opt">${row(opp)}</div></div>`;
}
function renderSeriesOver(s) {
  const win = s.myScore > s.opScore;
  const rw = s.rewards || { money: 0, fans: 0 };
  const gameLines = s.games.map((g, i) => `<div class="report-line"><span class="tag ${g.winner === 'me' ? 'win' : 'lose'}">${g.winner === 'me' ? '胜' : '负'}</span><span class="body">第${i + 1}局${g.peak ? '<b class="peak-mark">巅峰对决</b>' : ""}（我方${sideName(g.mySide)}）：${POS.map(p => `${POS_NAME[p]}${g.myPicks[p]}`).join("/")} 击败/负于 ${POS.map(p => g.oppPicks[p]).join("/")}</span></div>`).join("");
  const opp = S.teams.find(t => t.id === s.oppId);
  const usedNote = `全局BP按<b>战队</b>记（与红蓝方无关）：${escapeHtml(getMyTeam().name)} 已用 ${myUsed().length} 个（本队后续局不可再选、但仍可 ban）；${escapeHtml(opp.name)} 已用 ${oppUsed().length} 个（从本队 ban 位池移除，其英雄本队仍可选）。`;
  const myT2 = getMyTeam();
  const starters2 = POS.map(p => getPlayer(myT2, myT2.lineup[p])).filter(Boolean);
  const avgSt = starters2.length ? Math.round(starters2.reduce((a, p) => a + p.st, 0) / starters2.length) : 0;
  const tired = POS.filter(p => { const pl = getPlayer(myT2, myT2.lineup[p]); return pl && pl.st <= 55; });
  return `<div class="center muted">BO${s.bestOf} · ${win ? '🏆 系列赛胜利！' : '💢 系列赛落败'}</div>
  <div class="warn mt" style="${win ? 'border-color:rgba(61,220,132,.4);background:rgba(61,220,132,.08);color:var(--green)' : ''}">${win ? `胜利！资金 +${rw.money}万，粉丝 +${rw.fans.toLocaleString()}。` : `落败。粉丝 ${rw.fans >= 0 ? '+' : ''}${rw.fans.toLocaleString()}。`}</div>
  <div class="warn mt" style="border-color:rgba(245,197,24,.35);background:rgba(245,197,24,.06);color:var(--gold)">
    赛后体能：本场 ${s.games.length} 局，首发平均体能 <b>${avgSt}</b>。
    ${tired.length ? `⚠ ${tired.map(p => POS_NAME[p]).join("、")} 体能偏低（≤55）→ 下一轮开始前自动恢复 +${ROUND_STAMINA_GAIN}；本场已结束，现在就可以让队伍休息。` : "队伍体能状况良好，可直接进入下一轮。"}
    <div class="hero-opt" style="margin-top:8px">
      <button class="btn gold sm" data-act="rest" ${S.trainPoints < 2 ? "disabled" : ""} aria-label="全队休息，消耗 2 训练点，恢复体能 ${REST_STAMINA_GAIN}">🛌 全队休息（-2 训练点 · 体能 +${REST_STAMINA_GAIN}）</button>
      <span class="muted" style="font-size:11.5px;align-self:center">大场已结束，这是本场唯一能休息的时机（剩余训练点 ${S.trainPoints}）</span>
    </div>
  </div>
  <div class="section-title mt">各局回顾</div>${gameLines}
  ${renderLineupVs()}
  <div class="muted mt">${usedNote}</div>
  <button class="btn gold mt" data-act="seriescontinue" aria-label="继续，返回主界面">继续</button>`;
}

/* ---------------- 事件弹窗 ---------------- */
function showEventModal() {
  const e = S.event; if (!e) return;
  const mask = document.createElement("div");
  mask.className = "modal-mask"; mask.id = "event-mask";
  const old = document.getElementById("event-mask"); if (old) old.remove();
  mask.innerHTML = `<div class="modal"><h3>📰 ${escapeHtml(e.title)}</h3><p>${escapeHtml(e.text)}</p>
    <div class="warn" style="margin-bottom:14px">${escapeHtml(e.msg)}</div>
    <button class="btn" data-act="closeevent" style="width:100%">知道了</button></div>`;
  document.body.appendChild(mask);
  mask.addEventListener("click", (e) => { const b = e.target.closest("[data-act]"); if (b) handleAct(b.getAttribute("data-act")); });
}
function renderEvent() { renderMain(); }

/* ---------------- 交互 ---------------- */
root.addEventListener("click", (e) => { const el = e.target.closest("[data-act]"); if (el) handleAct(el.getAttribute("data-act")); });

/* ---------------- 键盘快捷键 / 帮助 ---------------- */
const TAB_SHORTCUTS = [["team", "战队"], ["train", "训练"], ["lineup", "阵容"], ["schedule", "赛程"], ["standings", "积分榜"], ["market", "转会"], ["prestige", "声望"], ["format", "赛制"]];
function closeTopModal() {
  const ids = ["help-mask", "name-mask", "confirm-mask", "newgame-mask", "event-mask", "transfer-mask"];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (typeof el._cancel === "function") { el._cancel(); return true; } // 让 Promise 正常 resolve
    el.remove();
    if (id === "event-mask" && S) { S.event = null; save(); }
    if (id === "newgame-mask" && S) S.page = "title";
    return true;
  }
  return false;
}
function showHelp() {
  const old = document.getElementById("help-mask"); if (old) old.remove();
  const mask = document.createElement("div");
  mask.className = "modal-mask"; mask.id = "help-mask";
  mask.setAttribute("role", "dialog"); mask.setAttribute("aria-modal", "true"); mask.setAttribute("aria-label", "快捷键与帮助");
  const rows = [
    ["1 ~ 8", "切换主菜单页签（战队 / 训练 / 阵容 / 赛程 / 积分榜 / 转会 / 声望 / 赛制）"],
    ["/", "聚焦英雄搜索框（BP 阶段）"],
    ["方向键", "在英雄列表中移动高亮（↑↓ 跨行、←→ 逐个）"],
    ["Enter", "选择 / 禁用当前高亮的英雄"],
    ["B", "一键 BP / 停止自动 BP（传奇难度与真实大名单禁用）"],
    ["S", "战斗中跳过（直接看结果）"],
    ["R", "一键轮换建议（首发体能偏低时）"],
    ["Esc", "关闭弹窗 / 取消待放置的英雄"],
    ["?", "打开本帮助"]
  ];
  mask.innerHTML = `<div class="modal"><h3>⌨️ 快捷键 / 无障碍</h3>
    <div class="muted mb" style="font-size:12.5px">所有按钮都可 Tab 聚焦、Enter 触发；选手卡与属性条都带读屏标签（会完整读出选手名、位置、评级、年龄合同与五项属性），不再只念「操作/意识/配合」。</div>
    ${rows.map(([k, d]) => `<div class="report-line"><span class="tag key">${k}</span><span class="body">${d}</span></div>`).join("")}
    <button class="btn" data-act="closehelp" style="width:100%;margin-top:8px">知道了</button></div>`;
  document.body.appendChild(mask);
  mask.addEventListener("click", e => {
    if (e.target === mask) { mask.remove(); return; }
    const b = e.target.closest("[data-act]");
    if (b && b.getAttribute("data-act") === "closehelp") mask.remove();
  });
}
document.addEventListener("keydown", (e) => {
  const tag = (e.target && e.target.tagName || "").toLowerCase();
  const typing = tag === "input" || tag === "textarea" || tag === "select";
  if (e.key === "Escape") {
    if (closeTopModal()) { e.preventDefault(); return; }
    if (S) {
      S._pendingHero = null; S._swapFrom = null;
      if (S.series && S.series.sub === "draft") { e.preventDefault(); render(); }
    }
    return;
  }
  if (e.key === "?") {
    if (typing) return;             // 输入框里打问号不应弹帮助
    e.preventDefault(); showHelp(); return;
  }
  if (typing || !S) return;
  if (bpHandleKey(e)) return;
  const k = e.key;
  if (k === "/") {
    const el = document.getElementById("bench-filter") || document.getElementById("ban-filter");
    if (el) { e.preventDefault(); el.focus(); if (el.select) el.select(); }
    return;
  }
  if (k >= "1" && k <= "8") {
    const t = TAB_SHORTCUTS[parseInt(k, 10) - 1];
    if (t && S.page === "main" && !S.gameOver) { e.preventDefault(); S.tab = t[0]; render(); }
    return;
  }
  if (k === "s" || k === "S") { if (S.series && S.series.sub === "battle") { e.preventDefault(); finishBattle(); } return; }
  if (k === "b" || k === "B") { if (S.series && S.series.sub === "draft") { e.preventDefault(); autoBp(); } return; }
  if (k === "r" || k === "R") { if (S.page === "main" && !S.gameOver) { e.preventDefault(); applyRotation(false); } return; }
});
function bpHandleKey(e) {
  const k = e.key;
  if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End", "Enter"].includes(k)) return false;
  const list = bpVisibleList();
  if (!list.length) return false;
  if (k === "Enter") {
    const i = S._bpIdx == null ? 0 : S._bpIdx;
    if (list[i]) { e.preventDefault(); list[i].click(); return true; }
    return false;
  }
  let i = S._bpIdx == null ? -1 : S._bpIdx;
  if (k === "ArrowRight") i = Math.min(list.length - 1, i + 1);
  else if (k === "ArrowLeft") i = Math.max(0, i - 1);
  else if (k === "ArrowDown") i = Math.min(list.length - 1, i + 5);
  else if (k === "ArrowUp") i = Math.max(0, i - 5);
  else if (k === "Home") i = 0;
  else if (k === "End") i = list.length - 1;
  S._bpIdx = i;
  e.preventDefault();
  markBpFocus();
  return true;
}

/* 拖拽选将：英雄芯片 -> 分路槽 */
root.addEventListener("dragstart", (e) => {
  const chip = e.target.closest("[data-hero]");
  if (!chip) return;
  S._pendingHero = chip.getAttribute("data-hero");
  try { e.dataTransfer.setData("text/plain", S._pendingHero); e.dataTransfer.effectAllowed = "move"; } catch (err) {}
});
root.addEventListener("dragover", (e) => {
  const slot = e.target.closest("[data-slot]");
  if (!slot) return;
  e.preventDefault();
  try { e.dataTransfer.dropEffect = "move"; } catch (err) {}
  slot.classList.add("dragover");
});
root.addEventListener("dragleave", (e) => {
  const slot = e.target.closest("[data-slot]");
  if (slot) slot.classList.remove("dragover");
});
root.addEventListener("drop", (e) => {
  const slot = e.target.closest("[data-slot]");
  if (!slot) return;
  e.preventDefault();
  slot.classList.remove("dragover");
  let hero = S._pendingHero;
  try { const dt = e.dataTransfer.getData("text/plain"); if (dt) hero = dt; } catch (err) {}
  const pos = slot.getAttribute("data-slot");
  const d = S.series && S.series.draft;
  if (hero && d) {
    const placed = d.picks[d.mySide].find(x => x.hero === hero);
    if (placed) {
      // 拖的是已放置英雄 -> 与目标槽互换（仅已放置的槽之间，不可反悔/不可移出）
      const target = d.picks[d.mySide].find(x => x.pos === pos);
      if (target && target.pos !== placed.pos) swapSlots(placed.pos, pos);
    } else {
      draftPick(pos, hero);
    }
  }
  S._pendingHero = null;
});
// 分路槽点击：空槽=放置待选；已放置=选中/完成对调（不可撤销BP）
function handleSlotClick(pos) {
  const d = S.series && S.series.draft; if (!d) return;
  const e = d.picks[d.mySide].find(x => x.pos === pos);
  if (e) {
    if (!S._swapFrom) { S._swapFrom = pos; render(); return; }
    if (S._swapFrom === pos) { S._swapFrom = null; render(); return; }
    swapSlots(S._swapFrom, pos); S._swapFrom = null; render(); return;
  }
  const hero = S._pendingHero;
  if (hero) { draftPick(pos, hero); S._pendingHero = null; }
}
function swapSlots(a, b) {
  const s = S.series, d = s.draft; if (!d) return;
  const ea = d.picks[d.mySide].find(x => x.pos === a);
  const eb = d.picks[d.mySide].find(x => x.pos === b);
  if (!ea || !eb) return;
  const tmp = ea.hero; ea.hero = eb.hero; eb.hero = tmp;
  toast(`已对调 ${POS_NAME[a]} 与 ${POS_NAME[b]} 的英雄（不可反悔BP）`);
  save();
}
function handleAct(act) {
  const [cmd, ...args] = act.split(":");
  if (cmd === "newgame") return openNewGame(parseInt(args[0], 10) || 1);
  if (cmd === "loadslot") return load(parseInt(args[0], 10) || 1);
  if (cmd === "exportslot") return exportSave(parseInt(args[0], 10) || 1);
  if (cmd === "importsave") { const fi = document.getElementById("import-file"); if (fi) fi.click(); return; }
  if (cmd === "renameslot") {
    const n = parseInt(args[0], 10) || 1, m = slotMeta(n);
    return nameDialog({
      title: `重命名存档 ${n}`,
      value: m ? m.name : "",
      placeholder: m ? m.team : "",
      tip: "给这个存档起个名字，标题界面会用它来区分不同存档（例如「AG王朝」「真实名单挑战」）。留空则恢复显示战队名。"
    }).then(v => { if (v !== null) renameSlot(n, v); });
  }
  if (cmd === "renamecurrent") {
    if (!S || !S.slot) return;
    const team = getMyTeam();
    return nameDialog({
      title: `重命名当前存档（存档 ${S.slot}）`,
      value: S.saveName || "",
      placeholder: team ? team.name : "",
      tip: "名字会自动保存，标题界面显示。留空则恢复显示战队名。"
    }).then(v => { if (v !== null) renameSlot(S.slot, v); });
  }
  if (cmd === "delslot") {
    const n = parseInt(args[0], 10) || 1, m = slotMeta(n);
    return confirmDialog({
      title: `删除存档 ${n}？`,
      body: m ? `将删除 <b>${escapeHtml(m.team)}</b> · S${m.season} 第 ${m.round} 轮的进度（${m.wins}胜${m.losses}负）。<br><b style="color:var(--red2)">此操作不可恢复</b>，建议先导出备份。` : "该槽位为空。",
      okText: "确认删除", danger: true
    }).then(ok => { if (ok) deleteSlot(n); });
  }
  if (cmd === "showhelp") return showHelp();
  if (cmd === "undo") return undoLast();
  if (cmd === "undoclear") return clearUndo();
  if (cmd === "rotate") return applyRotation(false);
  if (cmd === "continue") { load(); return; }
  if (cmd === "closeevent") { S.event = null; const m = document.getElementById("event-mask"); if (m) m.remove(); save(); render(); return; }
  if (cmd === "closetransfer") { const m = document.getElementById("transfer-mask"); if (m) m.remove(); return; }
  if (cmd === "tab") { S.tab = args[0]; if (args[0] === "market" && !S.market) { buildMarket(); save(); } render(); return; }
  if (cmd === "rest") { restTeam(); return; }
  if (cmd === "train") { doTrain(args[0], args[1]); return; }
  if (cmd === "setlineup") { setLineup(args[0], args[1]); return; }
  if (cmd === "startmatch") { startMatch(); return; }
  if (cmd === "ban") { draftBan(args[0]); return; }
  if (cmd === "pick") { draftPick(args[0], args[1]); return; }
  if (cmd === "pickhero") { S._pendingHero = (S._pendingHero === args[0]) ? null : args[0]; render(); return; }
  if (cmd === "placeslot") { handleSlotClick(args[0]); return; }
  if (cmd === "battleskip") { finishBattle(); return; }
  if (cmd === "startbattle") { const s = S.series; if (s && s.sub === "preview") { s.sub = "battle"; startBattleTick(); save(); render(); } return; }
  if (cmd === "chooseside") {
    const s = S.series;
    if (!s || s.nextSideBy !== "me" || s.sideLocked) return;   // 锁定后不再响应，防止反复横跳
    s.nextSide = args[0]; s.sideLocked = true;
    s.nextSideBy = "me";
    save(); render();
    toast(`已锁定 ${sideName(s.nextSide)}，进入第 ${s.gameIndex + 1} 局`);
    setTimeout(() => {
      if (S && S.series === s && S.series.sub === "sub" && S.series.sideLocked) { S.series.sideLocked = false; newGameDraft(); }
    }, 750);
    return;
  }
  if (cmd === "drafttactic") { S.series.draft.tactic = args[0]; render(); return; }
  if (cmd === "autobp") { autoBp(); return; }
  if (cmd === "bplane") { bpFilter().lane = args[0]; render(); return; }
  if (cmd === "seriesnext") { S.series.sub = "sub"; save(); render(); return; }
  if (cmd === "seriesstartgame") { newGameDraft(); return; }
  if (cmd === "seriescontinue") { seriesContinue(); return; }
  if (cmd === "abandonseries") {
    confirmDialog({
      title: "放弃本场系列赛？",
      body: "本场将按 <b>0 : " + Math.ceil(S.series.bestOf / 2) + "</b> 判负处理（战绩、声望都会受影响），并返回主界面。BP 进度会丢失。",
      okText: "放弃并返回", danger: true
    }).then(ok => {
      if (!ok) return;
      stopAutoBp(); S.series = null; S.page = "main"; save(); render();
    });
    return;
  }
  if (cmd === "newseason") {
    const nextS = S.season + 1;
    return confirmDialog({
      title: `开启第 ${nextS} 赛季？`,
      body: `本赛季战绩会被写入历史（不可回退），随后：<br>• 各队补充赛季奖金、选手<b>合同 −1 个赛季</b>（<b>每 3 个赛季年龄 +1</b>）<br>• <b>27 岁以上的选手整体属性逐季下滑</b><br>• 合同到期的选手将<b>续约或离队</b><br>• 赛程重置，转会窗口重新开放<br><br>当前声望 <b>${Math.round(getMyTeam().prestige)}</b>。`,
      okText: "开启新赛季"
    }).then(ok => { if (ok) newSeason(); });
  }
  if (cmd === "marketbuy") { marketBuy(args[0]); return; }
  if (cmd === "marketsell") { marketSell(args[0]); return; }
  if (cmd === "fanmeet") { holdFanMeeting(); return; }
  if (cmd === "trainbreak") { trainBreakthrough(args[0]); return; }
  if (cmd === "loanin") { loanSign(args[0]); return; }
  if (cmd === "loanreturn") { loanReturnById(args[0]); return; }
  if (cmd === "renew") { renewContract(args[0]); return; }
  if (cmd === "confirmnew") { confirmNewGame(); return; }
  if (cmd === "cancelnew") { S.page = "title"; render(); return; }
  if (cmd === "restartgame") {
    const slot = (S && S.slot) || 1;
    return confirmDialog({ title: "删除本存档并重开？", body: `存档 ${slot} 的进度将被清空。`, okText: "清空重开", danger: true }).then(ok => {
      if (!ok) return;
      try { localStorage.removeItem(slotKey(slot)); } catch (e) {}
      S = null; render();
    });
  }
}
function ngModalHtml() {
  const ng = S._ng;
  const teamBtns = TEAMS.map(t => `<button class="btn ghost sm ${ng.teamName === t ? 'gold' : ''}" data-act="selteam:${encodeURIComponent(t)}" aria-pressed="${ng.teamName === t}">${t}</button>`).join(" ");
  const diffBtn = d => `<button class="btn ghost sm ${ng.difficulty === d ? 'gold' : ''}" data-act="seldiff:${d}" aria-pressed="${ng.difficulty === d}" aria-label="难度 ${d}">${d}</button>`;
  const rosterBtn = (k, name, tip) => `<button class="btn ghost sm ${ng.rosterMode === k ? 'gold' : ''}" data-act="selroster:${k}" aria-pressed="${ng.rosterMode === k}" aria-label="名单模式 ${name}：${tip}">${name}</button>`;
  const teamNow = ng.teamName ? escapeHtml(ng.teamName) : "随机";
  const occupied = slotMeta(ng.slot || 1);
  const diffTip = {
    新秀: "会犯小错：不读你的英雄池、基本不针对克制，偶尔拿舒适英雄；但仍会认分路、挑强英雄。可用一键BP（强度略低于职业）。",
    职业: "常规教练：会读克制、会照顾自家选手擅长、会补阵容前排与输出。可用一键BP，但它<b>打不过手动</b>。",
    传奇: "近乎最优：几乎总拿最强解，ban 直指你的核心英雄，选将严丝合缝。<b>该难度禁用一键 BP</b>，必须手动 ban/选。"
  }[ng.difficulty] || "";
  return `<div class="modal" role="dialog" aria-modal="true" aria-label="开启新赛季"><h3>开启新赛季</h3>
    <p>难度与名单是<b>两个独立维度</b>：<b>难度只决定对手的 BP 水平</b>（ban/选将有多强），<b>不改任何战力与属性</b>；名单决定 12 队怎么分人。</p>
    ${occupied ? `<div class="warn mb" style="border-color:rgba(255,59,48,.5)">⚠ 存档 ${ng.slot || 1} 已有进度（${escapeHtml(occupied.team)} · S${occupied.season} 第 ${occupied.round} 轮），<b>确认后将被覆盖</b>。</div>` : ""}
    <div class="muted mb">难度 / 对手 BP 水平（当前：<b style="color:var(--gold)">${ng.difficulty}</b>）：</div>
    <div class="hero-opt">${diffBtn("新秀")}${diffBtn("职业")}${diffBtn("传奇")}<button class="btn ghost sm" data-act="seldiffrand" aria-label="随机难度">🎲 随机</button></div>
    <div class="muted" style="font-size:12px;margin:6px 0 12px;line-height:1.6">${diffTip}</div>
    <div class="muted mb">名单模式（当前：<b style="color:var(--gold)">${ng.rosterMode === "real" ? "真实大名单" : "平衡选秀"}</b>）：</div>
    <div class="hero-opt mb">${rosterBtn("draft", "平衡选秀", "蛇形分配，各队战力接近")}${rosterBtn("real", "真实大名单", "按 2025 KPL 名单绑定，强队更强")}</div>
    <div class="muted" style="font-size:12px;margin-bottom:10px">${ng.rosterMode === "real" ? "真实名单：12 队按 <b>2025 KPL 真实大名单</b>绑定首发/替补（强队更强、不平均分配）。<b>该名单下对手 BP 水平固定按「传奇」处理</b>（与所选难度无关）。" : "平衡选秀：按总评蛇形分配（每队一强一弱），各队开局战力接近；对手 BP 水平按上面的难度决定。"}</div>
    <div class="muted mb">选择战队（当前：<b style="color:var(--gold)">${teamNow}</b>）：</div>
    <div class="hero-opt" style="max-height:150px;overflow:auto">
      <button class="btn ghost sm ${ng.teamName === "" ? 'gold' : ''}" data-act="selrandom" aria-label="随机战队">🎲 随机战队</button>
      ${teamBtns}
    </div>
    <div class="flex-between mt"><input id="team-input" placeholder="或输入自定义战队名" value="${escapeHtml(ng.teamName)}" aria-label="自定义战队名称" style="flex:1;background:var(--bg2);border:1px solid var(--line);color:var(--txt);padding:9px 12px;border-radius:9px" /></div>
    <div class="opts mt"><button class="btn gold" data-act="confirmnew">确认，开始执教！</button><button class="btn ghost" data-act="cancelnew">返回</button></div></div>`;
}
function openNewGame(slot) {
  S = S || {};
  const s = clamp(slot || 1, 1, SLOT_COUNT);
  S._ng = { difficulty: "职业", teamName: "", rosterMode: "draft", slot: s };
  const mask = document.createElement("div");
  mask.className = "modal-mask"; mask.id = "newgame-mask";
  const renderNg = () => { mask.innerHTML = ngModalHtml(); };
  renderNg();
  document.body.appendChild(mask);
  mask.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const a = b.getAttribute("data-act");
    const inp = () => document.getElementById("team-input");
    if (a.startsWith("seldiff:")) { const i = inp(); if (i && i.value.trim()) S._ng.teamName = i.value.trim(); S._ng.difficulty = a.split(":")[1]; renderNg(); }
    else if (a === "seldiffrand") { const i = inp(); if (i && i.value.trim()) S._ng.teamName = i.value.trim(); S._ng.difficulty = choice(["新秀", "职业", "传奇"]); renderNg(); }
    else if (a.startsWith("selroster:")) { const i = inp(); if (i && i.value.trim()) S._ng.teamName = i.value.trim(); S._ng.rosterMode = a.split(":")[1]; renderNg(); }
    else if (a.startsWith("selteam:")) { S._ng.teamName = decodeURIComponent(a.split(":")[1]); renderNg(); }
    else if (a === "selrandom") { S._ng.teamName = ""; renderNg(); }
    else if (a === "confirmnew") { const i = inp(); if (i && i.value.trim()) S._ng.teamName = i.value.trim(); confirmNewGame(); }
    else if (a === "cancelnew") { mask.remove(); S.page = "title"; render(); }
  });
}
function confirmNewGame() {
  const ng = (S && S._ng) || { difficulty: "职业", teamName: "", rosterMode: "draft", slot: 1 };
  const occupied = slotMeta(ng.slot || 1);
  const go = () => {
    const mask = document.getElementById("newgame-mask"); if (mask) mask.remove();
    newGame({ difficulty: ng.difficulty, teamName: ng.teamName, rosterMode: ng.rosterMode, slot: ng.slot || 1 });
  };
  if (!occupied) return go();
  confirmDialog({
    title: "覆盖存档？",
    body: `存档 <b>${ng.slot || 1}</b> 已有进度：<b>${escapeHtml(occupied.team)}</b> · S${occupied.season} 第 ${occupied.round} 轮（${occupied.wins}胜${occupied.losses}负）。<br><br><b style="color:var(--red2)">开始新赛季会永久覆盖该进度</b>，无法恢复（建议先导出备份）。`,
    okText: "确认覆盖并开档", danger: true
  }).then(ok => { if (ok) go(); });
}

/* ---------------- 动作 ---------------- */
function restTeam() {
  // 休息只在大场之间可用：系列赛进行中（draft/battle/sub 等）不允许休息，只能在"大场已打完"或回到主界面后休息
  if (S && S.series && S.series.sub !== "over") { toast("系列赛进行中不能全队休息：请先打完本场大场（BO5/BO7 全部打完）再休息"); return; }
  if (S.trainPoints < 2) { toast("休息需消耗 2 训练点，点数不足"); return; }
  snapshot("全队休息");
  S.trainPoints -= 2;
  POS.flatMap(p => getMyTeam().players[p]).forEach(p => {
    p.st = clamp(p.st + REST_STAMINA_GAIN, 40, 100); p.me = clamp(p.me + 4, 40, p.ceil);
    if (p.status === "low") { p.status = "ok"; p.statusRounds = 0; }
  });
  toast(`全队休息（-2 训练点）· 体能 +${REST_STAMINA_GAIN}、心态 +4`);
  save(); render();
}
function doTrain(attr, pid) {
  const p = getPlayer(getMyTeam(), pid); if (!p) return;
  const money = trainCost(p);
  if (S.trainPoints <= 0) { toast("训练点不足"); return; }
  if (getMyTeam().money < money) { toast(`资金不足：本次特训需 ¥${money}万`); return; }
  if (p[attr] >= p.ceil) { toast(`${p.name} 该项已达上限(${p.ceil})，可用「突破上限」提升`); render(); return; }
  // 二次确认：一次特训会同时扣训练点与资金，避免误点
  const nameMap = { op: "操作", aw: "意识", co: "配合", me: "心态", st: "体能" };
  snapshot(`${nameMap[attr]}特训·${p.name}`);
  const gain = randInt(1, 2);
  const before = p[attr];
  p[attr] = clamp(p[attr] + gain, 40, p.ceil);
  S.trainPoints--;
  getMyTeam().money -= money;
  p.ovr = Math.round((p.op + p.aw + p.co + p.me + p.st) / 5);
  toast(`${p.name} ${nameMap[attr]} +${p[attr] - before}（-¥${money}万 · -1 训练点）`);
  save(); render();
}
// 特训费用：与选手总评挂钩（越强越贵）
function trainCost(p) { return Math.round(5 + Math.max(0, p.ovr - 55) / 6.5); }
// 突破上限：需要大量训练点与资金
const BREAK_PTS = 5;
function breakCost(p) { return Math.round(150 + p.ovr * 1.9); }
function isCapped(p) { return p.ceil < 99 && ["op", "aw", "co", "me"].every(a => p[a] >= p.ceil - 1); }
function trainBreakthrough(pid) {
  const p = getPlayer(getMyTeam(), pid); if (!p) return;
  if ((p.age || 22) >= AGE_DECLINE_FROM) { toast(`${p.name} ${p.age} 岁已过巅峰期，无法再突破成长上限`); return; }
  if (!isCapped(p)) { toast("属性还没练满，无需突破"); return; }
  const money = breakCost(p);
  if (S.trainPoints < BREAK_PTS) { toast(`突破需 ${BREAK_PTS} 训练点`); return; }
  if (getMyTeam().money < money) { toast(`资金不足：突破需 ¥${money}万`); return; }
  confirmDialog({
    title: "突破成长上限",
    body: `【${escapeHtml(p.name)}】当前上限 <b>${p.ceil}</b>。<br>本次将消耗 <b>${BREAK_PTS} 训练点</b> + <b style="color:var(--gold)">¥${money}万</b>，上限 +1~2（不可退回）。<br><br>当前训练点 ${S.trainPoints} · 资金 ¥${getMyTeam().money}万。`,
    okText: "确认突破"
  }).then(ok => {
    if (!ok) return;
    if (S.trainPoints < BREAK_PTS || getMyTeam().money < money) { toast("资源不足，操作已取消"); return; }
    snapshot(`突破上限·${p.name}`);
    S.trainPoints -= BREAK_PTS;
    getMyTeam().money -= money;
    const up = randInt(1, 2);
    p.ceil = clamp(p.ceil + up, 60, 99);
    ["op", "aw", "co", "me"].forEach(a => p[a] = clamp(p[a] + 1, 40, p.ceil));
    p.ovr = Math.round((p.op + p.aw + p.co + p.me + p.st) / 5);
    S.log.unshift(`S${S.season} 特训：${p.name} 突破上限 +${up}（-¥${money}万）`);
    toast(`💪 ${p.name} 突破上限！上限 ${p.ceil}（-${BREAK_PTS}训练点 -¥${money}万）`);
    save(); render();
  });
}
function setLineup(pos, pid) {
  const p = getPlayer(getMyTeam(), pid);
  if (p && p.status === "inj" && p.statusRounds > 0) { toast(`${p.name} 伤病中，无法首发`); return; }
  getMyTeam().lineup[pos] = pid; toast("已调整首发"); save(); render();
}
function startMatch() {
  const t = getMyTeam();
  // 自动处理伤停首发：有健康替补就换上，没有就带伤出战（避免卡死）
  POS.forEach(pos => {
    const cur = getPlayer(t, t.lineup[pos]);
    if (cur && cur.status === "inj" && cur.statusRounds > 0) {
      const bench = t.players[pos]
        .filter(p => p.id !== t.lineup[pos] && !(p.status === "inj" && p.statusRounds > 0))
        .sort((a, b) => b.ovr - a.ovr);
      if (bench.length) { t.lineup[pos] = bench[0].id; toast(`${POS_NAME[pos]}首发伤停，已自动换上 ${bench[0].name}`); }
      else { cur.status = "ok"; cur.statusRounds = 0; toast(`${POS_NAME[pos]}无健康替补，${cur.name} 带伤出战`); }
    }
  });
  if (S.phase === "regular") {
    const sc = S.schedule.find(s => !s.played); if (!sc) return;
    startSeries(sc.oppId, 5, "regular", null, `第 ${sc.round} 轮常规赛`);
  } else if (S.phase === "playoff") {
    const next = S.pendingPlayoff || playoffMyNext();
    if (!next || !next.oppId) return;
    startSeries(next.oppId, 7, "playoff", next.slot, next.label);
  }
}
function startSeries(oppId, bestOf, kind, slot, label) {
  const firstSide = rand() < 0.5 ? "blue" : "red";
  // 转会窗口只在赛季初开放：打第一场常规赛即关闭
  if (kind === "regular" && S.transferWindow) { S.transferWindow = false; S.market = null; }
  S.series = { oppId, bestOf, kind, playoffSlot: slot, label, myScore: 0, opScore: 0, gameIndex: 0, usedByTeam: { [S.myTeamId]: [], [oppId]: [] }, games: [], firstSide, nextSide: firstSide, nextSideBy: null, sideLocked: false, draft: null, sub: "draft", rewards: null, battle: null };
  S.page = "series";
  newGameDraft();
}
function newGameDraft() {
  stopAutoBp();
  const s = S.series;
  // 关键修复：gameIndex 以「已打完的局数」为准，每开一局同步一次（旧版从不自增，
  // 导致永远显示「第 1 局」、局间永远「第 2 局前」、选边兜底也一直落在第 1 局的阵营上）
  s.gameIndex = (s.games || []).length;
  s.sideLocked = false;
  // 红蓝方：有败方选边结果则用之，否则按局数交替
  const side = s.nextSide || (s.gameIndex % 2 === 0 ? s.firstSide : (s.firstSide === "blue" ? "red" : "blue"));
  if (isPeakGame(s)) {
    // 第 7 局 · 巅峰对决：无 ban、盲选、不受全局 BP 限制
    const opp = S.teams.find(t => t.id === s.oppId);
    s.draft = {
      mySide: side, phase: "peak", peak: true, steps: [], stepIndex: 0,
      bans: { blue: [], red: [] }, picks: { blue: [], red: [] }, used: [],
      tactic: "稳", over: false,
      peakAi: aiPeakPicks(opp)   // 对手盲选阵容（已决定但先隐藏）
    };
  } else {
    s.draft = { mySide: side, phase: "ban", steps: buildDraftSteps(), stepIndex: 0, bans: { blue: [], red: [] }, picks: { blue: [], red: [] }, used: [], tactic: "稳", over: false };
  }
  s.sub = "draft";
  s.nextSide = null; s.nextSideBy = null;
  runDraftAI();
  save(); render();
}
function seriesContinue() {
  stopAutoBp();
  const s = S.series, t = getMyTeam(), win = s.myScore > s.opScore;
  const rw = s.rewards || { money: 0, fans: 0 };
  t.money += rw.money; t.fans = Math.max(1000, t.fans + rw.fans);
  t.wins += win ? 1 : 0; t.losses += win ? 0 : 1;
  if (s.kind === "regular" && win) t.points += 2;
  addPrestige(win ? (s.kind === "playoff" ? 3 : 1.5) : (s.kind === "playoff" ? -2 : -1.2), win ? "系列赛胜利" : "系列赛失利");
  POS.forEach(pos => {
    const p = getPlayer(t, t.lineup[pos]);
    if (!p) return;
    p.exp += win ? 60 : 35;
    if (p.exp < p.level * 100) return;
    p.exp = 0; p.level++;
    // 升级涨属性只在巅峰期前有效：27 岁起升级不再回补属性，否则会把年龄衰退抵消掉
    if ((p.age || 22) < AGE_DECLINE_FROM) ["op", "aw", "co", "me"].forEach(a => p[a] = clamp(p[a] + randInt(1, 2), 40, p.ceil));
    p.st = clamp(p.st + 10, 40, 100);
    p.ovr = Math.round((p.op + p.aw + p.co + p.me + p.st) / 5);
  });
  S.series = null; S.page = "main"; S.tab = "schedule";

  if (s.kind === "regular") {
    const sc = S.schedule.find(x => !x.played); if (sc) sc.played = true;
    // 把我这场比赛也写进本轮对阵（含比分与每局阵容，供赛程页展示）
    const myFx = ((S.fixtures || [])[S.round - 1] || []).find(f => f.a === S.myTeamId || f.b === S.myTeamId);
    if (myFx) {
      const iAmA = myFx.a === S.myTeamId;
      myFx.sa = iAmA ? s.myScore : s.opScore;
      myFx.sb = iAmA ? s.opScore : s.myScore;
      myFx.played = true;
      myFx.games = (s.games || []).map(g => ({
        aWin: iAmA ? g.winner === "me" : g.winner === "opp",
        luA: iAmA ? POS.map(p => g.myPicks[p]) : POS.map(p => g.oppPicks[p]),
        luB: iAmA ? POS.map(p => g.oppPicks[p]) : POS.map(p => g.myPicks[p])
      }));
    }
    // 记录本场对手战绩（否则对手场次落后）
    const oppT = S.teams.find(x => x.id === s.oppId);
    if (oppT) {
      oppT.wins += win ? 0 : 1; oppT.losses += win ? 1 : 0;
      if (!win) oppT.points += 2;
      oppT.streak = win ? 0 : oppT.streak + 1;
      awardTeamMatch(oppT, !win, false); // 对手同样拿到/损失资金、粉丝、声望
    }
    // 结算本轮其他战队的比赛（保证全场次一致）
    simRoundAIFixtures(S.round);
    advanceRegular();
  } else {
    if (s.playoffSlot === "gf") {
      S.phase = "end"; S.champion = win; S.seasonResult = { champion: win, final: true };
      if (win) { addPrestige(15, "总冠军"); t.fans += randInt(30000, 80000); }
      else addPrestige(4, "亚军");
      recordHistory();
      S.event = { title: win ? "🏆 总冠军！" : "亚军", text: win ? "你带领战队捧起冠军奖杯！" : "总决赛惜败。", msg: win ? `恭喜！${t.name} 夺得 KPL 总冠军！` : "距离巅峰只差一步，明年卷土重来！" };
      S.page = "event"; save(); render(); return;
    }
    {
      // 记录本场季后赛比分与每局阵容（供 bracket 与赛季总结展示，与常规赛一致）
      const SL = S.bracket.slots[s.playoffSlot] || {};
      const iAmA = SL.a === S.myTeamId;
      S.bracket.resolved[s.playoffSlot] = {
        winner: win ? S.myTeamId : s.oppId, loser: win ? s.oppId : S.myTeamId,
        sa: iAmA ? s.myScore : s.opScore, sb: iAmA ? s.opScore : s.myScore,
        games: (s.games || []).map(g => ({
          aWin: iAmA ? g.winner === "me" : g.winner === "opp",
          luA: iAmA ? POS.map(p => g.myPicks[p]) : POS.map(p => g.oppPicks[p]),
          luB: iAmA ? POS.map(p => g.oppPicks[p]) : POS.map(p => g.myPicks[p]),
          peak: !!g.peak
        }))
      };
    }
    const next = playoffMyNext();
    if (next.eliminated) {
      S.phase = "end"; S.seasonResult = { champion: false, playoff: true }; recordHistory();
      S.event = { title: "季后赛止步", text: "双败淘汰赛出局。", msg: `${next.label}。来年再战！` };
      S.page = "event"; save(); render(); return;
    }
    S.pendingPlayoff = next;
    S.event = { title: "晋级下一轮", text: "双败淘汰赛推进。", msg: `下一场：${next.label} vs ${teamName(next.oppId)}（BO7）。可在赛程页进入，期间可训练/换人/转会。` };
    S.page = "event"; save(); render(); return;
  }
}
function advanceRegular() {
  tickStatuses();
  loanTick();                       // 租借到期自动返回
  const remaining = S.schedule.filter(s => !s.played).length;
  if (remaining > 0) {
    S.round++;
    // 轮间休整：全队（含 AI）自然恢复体能，避免连续 BO5 一路掉到见底
    S.teams.forEach(tm => POS.forEach(pos => tm.players[pos].forEach(p => { p.st = clamp(p.st + ROUND_STAMINA_GAIN, 40, 100); })));
    refreshTrainPoints();
    maybeEvent();
    toast(`轮间休整：全队体能 +${ROUND_STAMINA_GAIN} · 训练点已补充`);
    save(); render(); return;
  }
  const sorted = standingsSorted();
  const top4 = sorted.slice(0, 4);
  const myRank = top4.findIndex(t => t.id === S.myTeamId);
  if (myRank === -1) {
    S.phase = "end"; S.seasonResult = { rank: sorted.findIndex(t => t.id === S.myTeamId) + 1, champion: false };
    addPrestige(-8, "无缘季后赛"); recordHistory();
    S.event = { title: "赛季落幕", text: "常规赛结束。", msg: `很遗憾未能进入前四，最终排名第 ${S.seasonResult.rank}。` };
    S.page = "event"; S.tab = "schedule"; save(); render(); return;
  }
  setupPlayoff(top4.map(t => t.id));
  const next = playoffMyNext();
  S.pendingPlayoff = next;
  addPrestige(3, "晋级季后赛");
  S.event = { title: "晋级季后赛（双败）！", text: "常规赛结束，杀入四强。", msg: `以第 ${myRank + 1} 名进入双败淘汰赛！首战：${next.label} vs ${teamName(next.oppId)}。` };
  S.page = "event"; S.tab = "schedule"; save(); render();
}

/* ---------------- 双败淘汰 ---------------- */
function setupPlayoff(top4) {
  S.bracket = {
    order: top4,
    slots: {
      usf1: { a: top4[0], b: top4[3] },
      usf2: { a: top4[1], b: top4[2] },
      ufin: { a: null, b: null }, lr1: { a: null, b: null }, lfin: { a: null, b: null }, gf: { a: null, b: null }
    },
    resolved: {}
  };
  S.phase = "playoff"; S.round = 1;
}
function resolveAI(name) {
  const B = S.bracket, SL = B.slots[name], R = B.resolved;
  if (!R[name] && SL && SL.a && SL.b) {
    const A = S.teams.find(t => t.id === SL.a), Bt = S.teams.find(t => t.id === SL.b);
    const r = simAiSeries(A, Bt, 7); // 季后赛全部 BO7（3:3 时第 7 局自动为巅峰对决）
    const aWin = r.sa > r.sb;
    const w = aWin ? SL.a : SL.b, l = aWin ? SL.b : SL.a;
    R[name] = { winner: w, loser: l, sa: r.sa, sb: r.sb, games: r.games };
    awardTeamMatch(S.teams.find(t => t.id === w), true, true);  // 季后赛收益更高
    awardTeamMatch(S.teams.find(t => t.id === l), false, true);
  }
}
function playoffMyNext() {
  const myId = S.myTeamId, B = S.bracket, R = B.resolved, SL = B.slots;
  const mine = (SL.usf1.a === myId || SL.usf1.b === myId) ? "usf1" : "usf2";
  const other = mine === "usf1" ? "usf2" : "usf1";
  const semiOpp = SL[mine].a === myId ? SL[mine].b : SL[mine].a;
  if (!R[mine]) return { slot: mine, oppId: semiOpp, label: mine === "usf1" ? "胜者组半决赛 (1v4)" : "胜者组半决赛 (2v3)" };
  const wonSemi = R[mine].winner === myId;
  if (wonSemi) {
    resolveAI(other);
    const otherWin = R[other].winner;
    if (!R.ufin) { SL.ufin = { a: myId, b: otherWin }; return { slot: "ufin", oppId: otherWin, label: "胜者组决赛" }; }
    if (R.ufin.winner === myId) {
      resolveAI(mine); resolveAI(other);
      if (!SL.lr1.a) { SL.lr1 = { a: R[mine].loser, b: R[other].loser }; resolveAI("lr1"); }
      if (!SL.lfin.a) { SL.lfin = { a: R.ufin.loser, b: R.lr1.winner }; resolveAI("lfin"); }
      SL.gf = { a: myId, b: R.lfin.winner };
      return { slot: "gf", oppId: R.lfin.winner, label: "总决赛" };
    } else {
      resolveAI(mine); resolveAI(other);
      if (!SL.lr1.a) { SL.lr1 = { a: R[mine].loser, b: R[other].loser }; resolveAI("lr1"); }
      if (!R.lfin) { SL.lfin = { a: myId, b: R.lr1.winner }; return { slot: "lfin", oppId: R.lr1.winner, label: "败者组决赛" }; }
      if (R.lfin.winner !== myId) return { eliminated: true, label: "止步败者组决赛" };
      SL.gf = { a: myId, b: R.ufin.winner };
      return { slot: "gf", oppId: R.ufin.winner, label: "总决赛" };
    }
  } else {
    resolveAI(other);
    const otherLose = R[other].loser;
    if (!R.lr1) { SL.lr1 = { a: myId, b: otherLose }; return { slot: "lr1", oppId: otherLose, label: "败者组第一轮" }; }
    if (R.lr1.winner !== myId) return { eliminated: true, label: "止步败者组第一轮" };
    resolveAI(mine); resolveAI(other);
    if (!SL.ufin.a) { SL.ufin = { a: R[mine].winner, b: R[other].winner }; resolveAI("ufin"); }
    if (!R.lfin) { SL.lfin = { a: myId, b: R.ufin.loser }; return { slot: "lfin", oppId: R.ufin.loser, label: "败者组决赛" }; }
    if (R.lfin.winner !== myId) return { eliminated: true, label: "止步败者组决赛" };
    SL.gf = { a: myId, b: R.ufin.winner };
    return { slot: "gf", oppId: R.ufin.winner, label: "总决赛" };
  }
}
function recordHistory() {
  finalizeAiPrestige();
  const t = getMyTeam(), r = S.seasonResult || {};
  // 本赛季我的所有对战（对手/比分/胜负）
  const matches = [];
  (S.fixtures || []).forEach((fx, i) => {
    fx.forEach(f => {
      const mine = f.a === S.myTeamId || f.b === S.myTeamId;
      if (!mine || !f.played || f.sa == null) return;
      const iAmA = f.a === S.myTeamId;
      const myScore = iAmA ? f.sa : f.sb, opScore = iAmA ? f.sb : f.sa;
      matches.push({ round: i + 1, oppName: teamNameOf(iAmA ? f.b : f.a), myScore, opScore, win: myScore > opScore });
    });
  });
  // 联盟全部对战（只存比分，控制存档体积）
  const fixtures = [];
  (S.fixtures || []).forEach((fx, i) => {
    fx.forEach(f => { if (f.played && f.sa != null) fixtures.push([i + 1, teamNameOf(f.a), teamNameOf(f.b), f.sa, f.sb]); });
  });
  // 季后赛（双败）对战也计入赛季总结：我的战绩 + 联盟全部季后赛比分
  if (S.bracket && S.bracket.slots) {
    const SLOT_LABEL = { usf1: "胜者组半决赛①", usf2: "胜者组半决赛②", ufin: "胜者组决赛", lr1: "败者组一轮", lfin: "败者组决赛", gf: "总决赛" };
    Object.keys(S.bracket.slots).forEach(slot => {
      const SL = S.bracket.slots[slot], R = S.bracket.resolved[slot];
      if (!SL || !SL.a || !SL.b || !R || R.sa == null) return;
      fixtures.push([SLOT_LABEL[slot] || "季后赛", teamNameOf(SL.a), teamNameOf(SL.b), R.sa, R.sb]);
      if (SL.a !== S.myTeamId && SL.b !== S.myTeamId) return;
      const iAmA = SL.a === S.myTeamId;
      const myScore = iAmA ? R.sa : R.sb, opScore = iAmA ? R.sb : R.sa;
      matches.push({ tag: "季后赛", round: 0, label: SLOT_LABEL[slot], oppName: teamNameOf(iAmA ? SL.b : SL.a), myScore, opScore, win: myScore > opScore });
    });
  }
  S.history.push({ season: S.season, team: t.name, rank: r.rank || null, playoff: !!r.playoff || !!r.final || !!r.champion, final: !!r.final, champion: !!S.champion, prestige: Math.round(t.prestige), matches, fixtures });
}
function newSeason() {
  const t = getMyTeam(), r = S.seasonResult || {};
  recordHistory();
  S.season++;
  returnAllLoans();   // 先把租借球员退回原队
  // 赛季末：年龄按「3 赛季 = 1 岁」结算，27 岁起逐季下滑；合同 -1（按赛季）
  const ageInfo = agePlayers();
  const notices = settleContracts();
  S.teams.forEach(tm => {
    tm.wins = 0; tm.losses = 0; tm.points = 0; tm.streak = 0;
    POS.forEach(pos => tm.players[pos].forEach(p => {
      p.status = "ok"; p.statusRounds = 0; p.st = clamp(p.st + 25, 60, 100);
      // 成长只给 26 岁及以下（越年轻概率越高）；27 岁起停止成长，开始被年龄拖累
      const gr = growthChance(p.age);
      if (gr > 0 && rand() < gr) { ["op", "aw", "co", "me"].forEach(a => p[a] = clamp(p[a] + randInt(0, 2), 45, p.ceil)); }
      p.ovr = Math.round((p.op + p.aw + p.co + p.me + p.st) / 5);
    }));
    POS.forEach(pos => {
      if (tm.players[pos].length > 1 && rand() < 0.3) {
        const benched = tm.players[pos][1];
        recycleToFreeAgents(benched);              // 被换下的选手回到市场（真实姓名循环）
        tm.players[pos][1] = takeFreeAgent(pos);   // 从自由身签一名真实选手
      }
    });
    initLineup(tm);
  });
  const bonus = S.champion ? 140 : (r.playoff || r.final ? 85 : 42);
  // 赛季奖金按战绩给：AI 战队同样领取（冠军 140 / 季后赛 85 / 其他 42）
  S.teams.forEach(tm => {
    if (tm.id === S.myTeamId) return;
    tm.money += 42 + Math.round(tm.prestige * 0.3) + randInt(0, 28);
    tm.fans = Math.max(1000, Math.round(tm.fans * (1 + (tm.prestige - 30) / 400)));
  });
  t.money += bonus;
  t.fans = Math.max(1000, Math.round(t.fans * (1 + (t.prestige - 30) / 400)));
  S.round = 1; S.phase = "regular"; S.champion = false; S.seasonResult = null;
  const _sch2 = buildSchedule(t.id, S.teams);
  S.schedule = _sch2.schedule; S.fixtures = _sch2.fixtures;
  S.maxRegular = S.schedule.length;
  S.trainPoints = 10; S.transfersUsed = 0; S.market = null;
  S.fanMeets = 0;   // 每赛季重置：2 次粉丝见面会
  S.loans = []; S.loansUsed = 0;   // 租借赛季重置
  // 赛季初转会窗口：AI 战队先行动，随后弹出通知
  S.transferWindow = true; S.transferSeen = 0; S.aiTransfers = [];
  runAiTransferWindow(S.season);
  buildMarket();      // 赛季初自动刷新转会市场（赛季内不变）
  S.series = null; S.bracket = null; S.pendingPlayoff = null; S.event = null;
  S.page = "main"; S.tab = "schedule";
  toast(`第 ${S.season} 赛季开始！赛季奖金 +¥${bonus}万 · 转会窗口开启`);
  maybeEvent();
  // 赛季年 + 合同结算合并成一条消息（优先于随机事件，避免信息丢失）
  const rep = [];
  if (ageInfo.tick) rep.push(`🎂 <b>新赛季年</b>：3 个赛季 = 1 岁，全联盟年龄 +1${ageInfo.aged.length ? `（本队：${ageInfo.aged.join("、")}）` : ""}`);
  if (notices.length) rep.push(...notices);
  if (rep.length) S.event = {
    title: ageInfo.tick ? "🎂 新赛季年 · 合同结算" : "📄 合同季结算",
    text: ageInfo.tick ? `第 ${S.season} 赛季开始（第 ${seasonYear(S.season)} 年）。27 岁以上的选手整体属性已开始逐季下滑。` : `赛季末共有 ${notices.length} 份到期合同在处理（自动续约或离队）。`,
    msg: rep.join("；")
  };
  save(); render();
}
function refreshTrainPoints() { S.trainPoints = 8 + Math.floor(getMyTeam().fans / 40000); }

/* ---------------- 存档（3 槽位 + 导入/导出） ---------------- */
const SAVE_PREFIX = "kpl_coach_save_v9_s";
const LEGACY_SAVE_KEY = "kpl_coach_save_v4";
const SLOT_COUNT = 3;
const LAST_SLOT_KEY = "kpl_coach_last_slot";
function slotKey(n) { return SAVE_PREFIX + n; }
function slotMeta(n) {
  try {
    const raw = localStorage.getItem(slotKey(n));
    if (!raw) return null;
    const o = JSON.parse(raw);
    const t = (o.teams || []).find(x => x.id === o.myTeamId) || {};
    return {
      n, name: o.saveName || "", team: t.name || "?", season: o.season || 1, round: o.round || 1,
      wins: t.wins || 0, losses: t.losses || 0, prestige: Math.round(t.prestige || 0),
      difficulty: o.difficulty || "职业",
      rosterMode: o.rosterMode || (o.difficulty === "真实" ? "real" : "draft"),
      phase: o.phase || "regular", savedAt: o.savedAt || 0
    };
  } catch (e) { return null; }
}
function save() {
  if (!S) return;
  S.savedAt = Date.now(); S.version = 9;
  S.slot = clamp(S.slot || 1, 1, SLOT_COUNT);
  const keepUndo = S.undo;
  S.undo = null;                       // 撤销快照只存在内存里，避免存档体积翻倍
  try {
    localStorage.setItem(slotKey(S.slot), JSON.stringify(S));
    localStorage.setItem(LAST_SLOT_KEY, String(S.slot));
  } catch (e) {} finally { S.undo = keepUndo; }
}
function hasAnySave() { for (let i = 1; i <= SLOT_COUNT; i++) if (localStorage.getItem(slotKey(i))) return true; return false; }
// 重命名存档：空名字 = 恢复显示战队名
function renameSlot(n, name) {
  const nm = String(name == null ? "" : name).trim().slice(0, 24);
  try {
    const raw = localStorage.getItem(slotKey(n));
    if (raw) {
      const o = JSON.parse(raw);
      o.saveName = nm;
      localStorage.setItem(slotKey(n), JSON.stringify(o));
    } else if (!(S && S.slot === n)) {
      toast("该存档位为空");
      return false;
    }
  } catch (e) { toast("重命名失败"); return false; }
  if (S && S.slot === n) { S.saveName = nm; save(); }
  render();
  toast(nm ? `存档 ${n} 已命名为「${nm}」` : `存档 ${n} 已恢复默认名称`);
  return true;
}
function deleteSlot(n) {
  try { localStorage.removeItem(slotKey(n)); } catch (e) {}
  if (S && S.slot === n) S = null;
  render();
  toast(`存档 ${n} 已删除`);
}
function migrateLegacySave() {
  try {
    const raw = localStorage.getItem(LEGACY_SAVE_KEY);
    if (!raw) return;
    if (!localStorage.getItem(slotKey(1))) localStorage.setItem(slotKey(1), raw);
    localStorage.removeItem(LEGACY_SAVE_KEY);
  } catch (e) {}
}
function exportSave(n) {
  const raw = localStorage.getItem(slotKey(n));
  if (!raw) { toast("该存档位为空"); return; }
  try {
    const meta = slotMeta(n) || {};
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const nm = String(meta.name || meta.team || "save").replace(/[\\/:*?"<>|]/g, "_");
    a.download = `KPL教练_${nm}_S${meta.season || 1}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast("已导出存档文件");
  } catch (e) { toast("导出失败"); }
}
function importSaveText(text, preferSlot) {
  let o;
  try { o = JSON.parse(text); } catch (e) { toast("文件不是有效的存档"); return false; }
  if (!o || !o.myTeamId || !Array.isArray(o.teams) || !o.teams.length) { toast("存档内容不完整"); return false; }
  let slot = preferSlot;
  if (!slot) { for (let i = 1; i <= SLOT_COUNT; i++) if (!localStorage.getItem(slotKey(i))) { slot = i; break; } }
  if (!slot) slot = 1;
  o.slot = slot; o.savedAt = o.savedAt || Date.now();
  try { localStorage.setItem(slotKey(slot), JSON.stringify(o)); } catch (e) { toast("写入存档失败"); return false; }
  load(slot);
  toast(`已导入到存档 ${slot}`);
  return true;
}
function load(n) {
  let slot = n;
  if (!slot) slot = parseInt(localStorage.getItem(LAST_SLOT_KEY) || "0", 10) || 0;
  if (!slot) { for (let i = 1; i <= SLOT_COUNT; i++) if (localStorage.getItem(slotKey(i))) { slot = i; break; } }
  if (!slot) slot = 1;
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) { toast("该存档位为空"); S = { page: "title" }; render(); return; }
    S = JSON.parse(raw);
    S.slot = slot;
    S._autoRun = false; S._autoTimer = null; // 读档时不会残留自动BP 计时器
    if (!S.page) S.page = "main";
    if (!S.tab) S.tab = "team";
    if (S.season == null) S.season = 1;
    if (!S.history) S.history = [];
    if (S.transfersUsed == null) S.transfersUsed = 0;
    if (S.maxTransfers == null) S.maxTransfers = 3;
    if (!S.freeAgents) S.freeAgents = {};
    delete S.marketRefreshUsed;
    if (S.fanMeets == null) S.fanMeets = 0;
    if (S.maxFanMeets == null) S.maxFanMeets = 2;
    delete S.autoBpUsed;
    if (S.gameOver === undefined) S.gameOver = null;
    if (!S.fixtures) S.fixtures = buildSchedule(S.myTeamId, S.teams).fixtures;
    if (S.transferWindow == null) S.transferWindow = !(S.round > 1 || (S.schedule || []).some(s => s.played));
    if (!S.aiTransfers) S.aiTransfers = [];
    if (S.transferSeen == null) S.transferSeen = (S.aiTransfers || []).length;
    // 旧存档字段补齐：年龄/合同/租借/撤销/存档名
    if (!S.rosterMode) S.rosterMode = (S.difficulty === "真实") ? "real" : "draft";
    if (S.difficulty === "真实") S.difficulty = "职业"; // 旧版把「真实」当难度，现在拆成名单模式
    if (S.saveName == null) S.saveName = "";
    if (!S.loans) S.loans = [];
    if (S.loansUsed == null) S.loansUsed = 0;
    if (S.maxLoans == null) S.maxLoans = 1;
    if (!S.contractNotices) S.contractNotices = [];
    if (S.undo === undefined) S.undo = null;
    // 旧存档：补齐 AI 战队的资金/声望字段（与玩家同规则的经济体系）
    (S.teams || []).forEach(tm => {
      if (tm.money == null) tm.money = 200;
      if (tm.prestige == null) tm.prestige = 45;
      POS.forEach(pos => (tm.players[pos] || []).forEach(p => {
        if (p.age == null) p.age = randInt(18, 27);
        if (p.contract == null) p.contract = randInt(1, 3);
      }));
    });
    // 旧存档迁移：全局BP由「红蓝方」改为「战队」记录
    if (S.series) {
      if (!S.series.usedByTeam) {
        S.series.usedByTeam = {};
        if (Array.isArray(S.series.myUsedHeroes)) S.series.usedByTeam[S.myTeamId] = S.series.myUsedHeroes.slice();
        if (Array.isArray(S.series.oppUsedHeroes)) S.series.usedByTeam[S.series.oppId] = S.series.oppUsedHeroes.slice();
      }
      delete S.series.myUsedHeroes; delete S.series.oppUsedHeroes;
      if (!S.series.usedByTeam[S.myTeamId]) S.series.usedByTeam[S.myTeamId] = [];
      if (!S.series.usedByTeam[S.series.oppId]) S.series.usedByTeam[S.series.oppId] = [];
      if (S.series.gameIndex == null) S.series.gameIndex = (S.series.games || []).length;
    }
    // 读档时若停在虚拟战斗中，直接结算，避免卡住
    if (S.series && S.series.sub === "battle" && S.series.battle) { finishBattle(); return; }
    // 声望已归零的存档直接进失败页
    const me = getMyTeam();
    if (!S.gameOver && me && me.prestige <= 0) triggerGameOver("声望归零");
    render();
  } catch (e) { toast("存档读取失败"); }
}

/* ---------------- 启动 ---------------- */
S = null;
migrateLegacySave();   // 旧版单存档 → 存档 1
render();
