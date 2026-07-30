import type { Category, Equipment } from "../types";

export interface SeedExercise {
  name: string;
  category: Category;
  equipment: Equipment;
  primary_muscle: string;
  description: string;
}

// 30+ common gym exercises spanning 6 muscle categories (plus cardio).
export const SEED_EXERCISES: SeedExercise[] = [
  // --- CHEST (5) ---
  {
    name: "杠铃卧推",
    category: "chest",
    equipment: "barbell",
    primary_muscle: "胸大肌",
    description: "平躺仰卧，双手略宽于肩，下放至胸口轻触再推起。",
  },
  {
    name: "哑铃卧推",
    category: "chest",
    equipment: "dumbbell",
    primary_muscle: "胸大肌",
    description: "平躺持哑铃于胸两侧，弧形路线上推至双臂伸直。",
  },
  {
    name: "哑铃飞鸟",
    category: "chest",
    equipment: "dumbbell",
    primary_muscle: "胸大肌",
    description: "平躺持哑铃于胸上方，双臂微屈向两侧张开至胸部拉伸。",
  },
  {
    name: "上斜杠铃卧推",
    category: "chest",
    equipment: "barbell",
    primary_muscle: "上胸",
    description: "30-45° 斜板卧推，专注于上胸发力。",
  },
  {
    name: "双杠臂屈伸",
    category: "chest",
    equipment: "bodyweight",
    primary_muscle: "下胸/三头",
    description: "撑在双杠上，身体略前倾下放再推起。",
  },
  {
    name: "绳索夹胸",
    category: "chest",
    equipment: "cable",
    primary_muscle: "胸中缝",
    description: "滑轮高位，双手向前下方合拢挤压胸中缝。",
  },

  // --- BACK (6) ---
  {
    name: "硬拉",
    category: "back",
    equipment: "barbell",
    primary_muscle: "竖脊肌/臀大肌",
    description: "双脚与髋同宽，俯身握杠，蹬地挺髋拉起杠铃。",
  },
  {
    name: "引体向上",
    category: "back",
    equipment: "bodyweight",
    primary_muscle: "背阔肌",
    description: "正握单杠，拉起至下巴超过横杆。",
  },
  {
    name: "杠铃划船",
    category: "back",
    equipment: "barbell",
    primary_muscle: "背阔肌中部",
    description: "俯身约 45°，杠贴腿拉至下腹。",
  },
  {
    name: "坐姿绳索划船",
    category: "back",
    equipment: "cable",
    primary_muscle: "背阔肌",
    description: "坐姿双脚蹬板，绳索拉至腹部。",
  },
  {
    name: "高位下拉",
    category: "back",
    equipment: "cable",
    primary_muscle: "背阔肌上部",
    description: "坐姿下拉横杆至锁骨上方。",
  },
  {
    name: "哑铃单臂划船",
    category: "back",
    equipment: "dumbbell",
    primary_muscle: "背阔肌",
    description: "一手一膝撑凳，另一手划哑铃至髋侧。",
  },

  // --- LEGS (7) ---
  {
    name: "深蹲",
    category: "legs",
    equipment: "barbell",
    primary_muscle: "股四头肌/臀大肌",
    description: "杠位斜方肌，蹲至大腿与地面平行或更低。",
  },
  {
    name: "前蹲",
    category: "legs",
    equipment: "barbell",
    primary_muscle: "股四头肌",
    description: "杠位前三角肌，躯干更直立，强化股四头。",
  },
  {
    name: "腿举",
    category: "legs",
    equipment: "machine",
    primary_muscle: "股四头肌/臀大肌",
    description: "坐姿蹬出器械至双腿伸直。",
  },
  {
    name: "腿屈伸",
    category: "legs",
    equipment: "machine",
    primary_muscle: "股四头肌",
    description: "坐姿勾腿伸直至完全收紧股四头。",
  },
  {
    name: "俯身腿弯举",
    category: "legs",
    equipment: "machine",
    primary_muscle: "腘绳肌",
    description: "俯卧位勾小腿至大腿后侧收紧。",
  },
  {
    name: "罗马尼亚硬拉",
    category: "legs",
    equipment: "barbell",
    primary_muscle: "腘绳肌/臀大肌",
    description: "微屈膝，髋主导下放杠至小腿中段。",
  },
  {
    name: "站姿提踵",
    category: "legs",
    equipment: "machine",
    primary_muscle: "小腿腓肠肌",
    description: "前脚掌踩台，踮起至最高点。",
  },

  // --- SHOULDERS (5) ---
  {
    name: "站姿推举",
    category: "shoulders",
    equipment: "barbell",
    primary_muscle: "三角肌前束",
    description: "杠位锁骨，垂直推起至双臂伸直。",
  },
  {
    name: "哑铃推举",
    category: "shoulders",
    equipment: "dumbbell",
    primary_muscle: "三角肌",
    description: "坐姿或站姿，哑铃从耳侧推起。",
  },
  {
    name: "哑铃侧平举",
    category: "shoulders",
    equipment: "dumbbell",
    primary_muscle: "三角肌中束",
    description: "双臂微屈，向两侧抬至与肩同高。",
  },
  {
    name: "俯身飞鸟",
    category: "shoulders",
    equipment: "dumbbell",
    primary_muscle: "三角肌后束",
    description: "俯身约 45°，向两侧抬哑铃。",
  },
  {
    name: "绳索面拉",
    category: "shoulders",
    equipment: "cable",
    primary_muscle: "三角肌后束/肩袖",
    description: "绳索高位拉向额头，外旋肩部。",
  },

  // --- ARMS (5) ---
  {
    name: "杠铃弯举",
    category: "arms",
    equipment: "barbell",
    primary_muscle: "肱二头肌",
    description: "反握杠铃，肘部固定弯举至胸前。",
  },
  {
    name: "哑铃弯举",
    category: "arms",
    equipment: "dumbbell",
    primary_muscle: "肱二头肌",
    description: "交替或同时弯举哑铃，可加旋腕。",
  },
  {
    name: "锤式弯举",
    category: "arms",
    equipment: "dumbbell",
    primary_muscle: "肱肌/肱桡肌",
    description: "中立握（虎口朝前）弯举。",
  },
  {
    name: "仰卧臂屈伸",
    category: "arms",
    equipment: "barbell",
    primary_muscle: "肱三头肌",
    description: "平躺，杠从额头后方伸直至双臂锁定。",
  },
  {
    name: "绳索下压",
    category: "arms",
    equipment: "cable",
    primary_muscle: "肱三头肌",
    description: "肘部贴体侧，下压绳索至双臂伸直。",
  },

  // --- CORE (4) ---
  {
    name: "平板支撑",
    category: "core",
    equipment: "bodyweight",
    primary_muscle: "腹横肌",
    description: "俯撑，前臂着地，身体保持一条直线。",
  },
  {
    name: "卷腹",
    category: "core",
    equipment: "bodyweight",
    primary_muscle: "腹直肌",
    description: "屈膝仰卧，卷起肩胛离地。",
  },
  {
    name: "仰卧举腿",
    category: "core",
    equipment: "bodyweight",
    primary_muscle: "腹直肌下部",
    description: "仰卧双腿并拢抬至垂直。",
  },
  {
    name: "俄罗斯转体",
    category: "core",
    equipment: "bodyweight",
    primary_muscle: "腹斜肌",
    description: "坐姿屈膝，双手持负重左右扭转。",
  },

  // --- CARDIO (2) ---
  {
    name: "跑步机慢跑",
    category: "cardio",
    equipment: "machine",
    primary_muscle: "心肺",
    description: "中等强度 30-60 分钟，坡度可调。",
  },
  {
    name: "划船机",
    category: "cardio",
    equipment: "machine",
    primary_muscle: "心肺/背",
    description: "腿-髋-臂顺序发力划动。",
  },
];
