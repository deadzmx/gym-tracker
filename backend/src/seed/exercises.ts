import type { Category, Equipment } from "../types";

export interface SeedExercise {
  name: string;
  category: Category;
  equipment: Equipment;
  primary_muscle: string;
  description: string;
  image_url: string; // Emoji (acts as the visual illustration)
}

// 35+ common gym exercises across 7 categories. Image URLs are
// single emoji characters — they render as colorful inline images
// without requiring any image assets, and the 🌟 sub-cell on each
// row shows the equipment at a glance.
export const SEED_EXERCISES: SeedExercise[] = [
  // ─── 胸 (6) ───
  {
    name: "杠铃卧推",
    category: "胸",
    equipment: "杠铃",
    primary_muscle: "胸大肌",
    description: "平躺仰卧,双手略宽于肩,下放至胸口轻触再推起。",
    image_url: "🏋️",
  },
  {
    name: "哑铃卧推",
    category: "胸",
    equipment: "哑铃",
    primary_muscle: "胸大肌",
    description: "平躺持哑铃于胸两侧,弧形路线上推至双臂伸直。",
    image_url: "💪",
  },
  {
    name: "哑铃飞鸟",
    category: "胸",
    equipment: "哑铃",
    primary_muscle: "胸大肌",
    description: "平躺持哑铃于胸上方,双臂微屈向两侧张开至胸部拉伸。",
    image_url: "🪽",
  },
  {
    name: "上斜杠铃卧推",
    category: "胸",
    equipment: "杠铃",
    primary_muscle: "上胸",
    description: "30-45° 斜板卧推,专注于上胸发力。",
    image_url: "📐",
  },
  {
    name: "双杠臂屈伸",
    category: "胸",
    equipment: "徒手",
    primary_muscle: "下胸/三头",
    description: "撑在双杠上,身体略前倾下放再推起。",
    image_url: "🤸",
  },
  {
    name: "绳索夹胸",
    category: "胸",
    equipment: "绳索",
    primary_muscle: "胸中缝",
    description: "滑轮高位,双手向前下方合拢挤压胸中缝。",
    image_url: "✂️",
  },

  // ─── 背 (6) ───
  {
    name: "硬拉",
    category: "背",
    equipment: "杠铃",
    primary_muscle: "竖脊肌/臀大肌",
    description: "双脚与髋同宽,俯身握杠,蹬地挺髋拉起杠铃。",
    image_url: "🪵",
  },
  {
    name: "引体向上",
    category: "背",
    equipment: "徒手",
    primary_muscle: "背阔肌",
    description: "正握单杠,拉起至下巴超过横杆。",
    image_url: "🧗",
  },
  {
    name: "杠铃划船",
    category: "背",
    equipment: "杠铃",
    primary_muscle: "背阔肌中部",
    description: "俯身约 45°,杠贴腿拉至下腹。",
    image_url: "🚣",
  },
  {
    name: "坐姿绳索划船",
    category: "背",
    equipment: "绳索",
    primary_muscle: "背阔肌",
    description: "坐姿双脚蹬板,绳索拉至腹部。",
    image_url: "🪢",
  },
  {
    name: "高位下拉",
    category: "背",
    equipment: "绳索",
    primary_muscle: "背阔肌上部",
    description: "坐姿下拉横杆至锁骨上方。",
    image_url: "⬇️",
  },
  {
    name: "哑铃单臂划船",
    category: "背",
    equipment: "哑铃",
    primary_muscle: "背阔肌",
    description: "一手一膝撑凳,另一手划哑铃至髋侧。",
    image_url: "🦾",
  },

  // ─── 腿 (7) ───
  {
    name: "深蹲",
    category: "腿",
    equipment: "杠铃",
    primary_muscle: "股四头肌/臀大肌",
    description: "杠位斜方肌,蹲至大腿与地面平行或更低。",
    image_url: "🦵",
  },
  {
    name: "前蹲",
    category: "腿",
    equipment: "杠铃",
    primary_muscle: "股四头肌",
    description: "杠位前三角肌,躯干更直立,强化股四头。",
    image_url: "🧍",
  },
  {
    name: "腿举",
    category: "腿",
    equipment: "器械",
    primary_muscle: "股四头肌/臀大肌",
    description: "坐姿蹬出器械至双腿伸直。",
    image_url: "🛋️",
  },
  {
    name: "腿屈伸",
    category: "腿",
    equipment: "器械",
    primary_muscle: "股四头肌",
    description: "坐姿勾腿伸直至完全收紧股四头。",
    image_url: "🦿",
  },
  {
    name: "俯身腿弯举",
    category: "腿",
    equipment: "器械",
    primary_muscle: "腘绳肌",
    description: "俯卧位勾小腿至大腿后侧收紧。",
    image_url: "🔄",
  },
  {
    name: "罗马尼亚硬拉",
    category: "腿",
    equipment: "杠铃",
    primary_muscle: "腘绳肌/臀大肌",
    description: "微屈膝,髋主导下放杠至小腿中段。",
    image_url: "📏",
  },
  {
    name: "站姿提踵",
    category: "腿",
    equipment: "器械",
    primary_muscle: "小腿腓肠肌",
    description: "前脚掌踩台,踮起至最高点。",
    image_url: "🦶",
  },

  // ─── 肩 (5) ───
  {
    name: "站姿推举",
    category: "肩",
    equipment: "杠铃",
    primary_muscle: "三角肌前束",
    description: "杠位锁骨,垂直推起至双臂伸直。",
    image_url: "🙆",
  },
  {
    name: "哑铃推举",
    category: "肩",
    equipment: "哑铃",
    primary_muscle: "三角肌",
    description: "坐姿或站姿,哑铃从耳侧推起。",
    image_url: "🏋️",
  },
  {
    name: "哑铃侧平举",
    category: "肩",
    equipment: "哑铃",
    primary_muscle: "三角肌中束",
    description: "双臂微屈,向两侧抬至与肩同高。",
    image_url: "🤷",
  },
  {
    name: "俯身飞鸟",
    category: "肩",
    equipment: "哑铃",
    primary_muscle: "三角肌后束",
    description: "俯身约 45°,向两侧抬哑铃。",
    image_url: "🕊️",
  },
  {
    name: "绳索面拉",
    category: "肩",
    equipment: "绳索",
    primary_muscle: "三角肌后束/肩袖",
    description: "绳索高位拉向额头,外旋肩部。",
    image_url: "🎭",
  },

  // ─── 臂 (5) ───
  {
    name: "杠铃弯举",
    category: "臂",
    equipment: "杠铃",
    primary_muscle: "肱二头肌",
    description: "反握杠铃,肘部固定弯举至胸前。",
    image_url: "💪",
  },
  {
    name: "哑铃弯举",
    category: "臂",
    equipment: "哑铃",
    primary_muscle: "肱二头肌",
    description: "交替或同时弯举哑铃,可加旋腕。",
    image_url: "🏋️",
  },
  {
    name: "锤式弯举",
    category: "臂",
    equipment: "哑铃",
    primary_muscle: "肱肌/肱桡肌",
    description: "中立握(虎口朝前)弯举。",
    image_url: "🔨",
  },
  {
    name: "仰卧臂屈伸",
    category: "臂",
    equipment: "杠铃",
    primary_muscle: "肱三头肌",
    description: "平躺,杠从额头后方伸直至双臂锁定。",
    image_url: "🛏️",
  },
  {
    name: "绳索下压",
    category: "臂",
    equipment: "绳索",
    primary_muscle: "肱三头肌",
    description: "肘部贴体侧,下压绳索至双臂伸直。",
    image_url: "⬇️",
  },

  // ─── 核心 (4) ───
  {
    name: "平板支撑",
    category: "核心",
    equipment: "徒手",
    primary_muscle: "腹横肌",
    description: "俯撑,前臂着地,身体保持一条直线。",
    image_url: "🧘",
  },
  {
    name: "卷腹",
    category: "核心",
    equipment: "徒手",
    primary_muscle: "腹直肌",
    description: "屈膝仰卧,卷起肩胛离地。",
    image_url: "🌀",
  },
  {
    name: "仰卧举腿",
    category: "核心",
    equipment: "徒手",
    primary_muscle: "腹直肌下部",
    description: "仰卧双腿并拢抬至垂直。",
    image_url: "📐",
  },
  {
    name: "俄罗斯转体",
    category: "核心",
    equipment: "徒手",
    primary_muscle: "腹斜肌",
    description: "坐姿屈膝,双手持负重左右扭转。",
    image_url: "🔁",
  },

  // ─── 有氧 (2) ───
  {
    name: "跑步机慢跑",
    category: "有氧",
    equipment: "器械",
    primary_muscle: "心肺",
    description: "中等强度 30-60 分钟,坡度可调。",
    image_url: "🏃",
  },
  {
    name: "划船机",
    category: "有氧",
    equipment: "器械",
    primary_muscle: "心肺/背",
    description: "腿-髋-臂顺序发力划动。",
    image_url: "🚣",
  },
];
