const BASE_URL = import.meta.env.BASE_URL || "/";

function withBase(path) {
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  return `${BASE_URL}${normalizedPath}`;
}

export const travelProfile = {
  headline: [
    "oh-my-trip 品牌化生成",
    "周末高密度短途",
    "历史感与城市漫步并重",
    "白天景点 + 夜晚氛围",
    "手机分享优先",
  ],
  manifesto: [
    {
      title: "不是打卡清单，而是情绪曲线",
      description:
        "攻略要有开场、高潮和收束感。白天看城市骨架，晚上看这座城最会发光的地方。",
    },
    {
      title: "信息要够用，但不能像 Excel",
      description:
        "该告诉你的票价、时长、交通和亮点都要有，但整体仍然像一本好看的小型旅行杂志。",
    },
    {
      title: "默认适配两个人一起走",
      description:
        "行程节奏优先考虑情侣或好友同行：移动别太碎，拍照点、休息点和用餐点都要有余量。",
    },
    {
      title: "每一站都是可复用资产",
      description:
        "这不是一次性页面。后续城市会沿用同一套结构、视觉和偏好建模，让 oh-my-trip 越做越像你。",
    },
  ],
};

export const trips = [
  {
    slug: "nanjing",
    city: "南京",
    title: "南京周末漫游记",
    subtitle: "两人两日，寻访金陵旧梦",
    dateRange: "2026年3月7日 - 8日",
    route: "上海 → 南京",
    stay: "夫子庙畔",
    companion: "2人同行",
    duration: "2天1晚",
    theme: "古都漫游",
    coverImage: withBase("guides/nanjing/assets/hero-bg.jpg"),
    cardSummary:
      "从钟山风景区到秦淮夜色，再到鸡鸣寺与玄武湖，把南京最适合周末沉浸的节奏浓缩成两天。",
    highlights: ["历史底色浓", "夜景强", "高铁友好"],
    overview: [
      { day: "Day 1", date: "3月7日 周六", summary: "中山陵 → 明孝陵 → 夫子庙 → 秦淮河夜游" },
      { day: "Day 2", date: "3月8日 周日", summary: "鸡鸣寺 → 玄武湖 → 老门东 → 返程上海" },
    ],
    days: [
      {
        number: "01",
        title: "第一天",
        subtitle: "3月7日 周六 · 寻访民国旧梦",
        entries: [
          { type: "schedule", time: "09:00", title: "上海出发", detail: "高铁 · 上海虹桥 → 南京南 · 约1小时" },
          { type: "schedule", time: "10:00", title: "抵达南京", detail: "地铁前往酒店放行李（夫子庙附近）" },
          {
            type: "spot",
            title: "中山陵",
            image: withBase("guides/nanjing/assets/zhongshanling.jpg"),
            description: "孙中山先生陵墓，中国近代建筑史上的杰作。392级台阶拾级而上，俯瞰金陵城景。",
            meta: ["免费（需预约）", "2-3小时", "钟山风景区"],
            bullets: ["祭堂：中山先生坐像，庄严肃穆", "音乐台：白鸽飞翔，建筑精美", "流徽榭：湖光山色，休憩佳处"],
          },
          { type: "schedule", time: "13:00", title: "午餐", detail: "景区附近简餐，品尝南京特色" },
          {
            type: "spot",
            title: "明孝陵",
            image: withBase("guides/nanjing/assets/mingxiaoling.jpg"),
            description: "明太祖朱元璋陵墓，世界文化遗产。神道石象路与春日梅花，是南京极具代表性的历史风景。",
            meta: ["70元", "2小时", "钟山风景区"],
            bullets: ["石象路：神道石刻，古朴庄严", "梅花山：春季赏梅胜地", "方城明楼：登高望远"],
          },
          { type: "schedule", time: "17:00", title: "返回夫子庙", detail: "地铁返回，入住酒店休息" },
          { type: "schedule", time: "18:00", title: "晚餐", detail: "夫子庙小吃街，品尝南京特色美食" },
          {
            type: "spot",
            featured: true,
            title: "夫子庙 · 秦淮河",
            image: withBase("guides/nanjing/assets/fuzimiao.jpg"),
            description: "十里秦淮在夜里最完整。灯火、画舫、古桥和江南贡院，把这趟南京行的情绪值直接拉满。",
            meta: ["街区免费", "3-4小时", "秦淮区贡院街"],
            bullets: ["画舫夜游：两岸灯火，桨声灯影", "江南贡院：科举文化，历史厚重", "乌衣巷：旧时王谢堂前燕"],
          },
        ],
      },
      {
        number: "02",
        title: "第二天",
        subtitle: "3月8日 周日 · 漫步古都风华",
        entries: [
          { type: "schedule", time: "08:30", title: "早餐", detail: "鸭血粉丝汤，开启美好一天" },
          {
            type: "spot",
            title: "鸡鸣寺",
            image: withBase("guides/nanjing/assets/jimingsi.jpg"),
            description: "南朝古寺与春日樱花相遇，是南京最容易拍出氛围感的一站。",
            meta: ["10元", "1小时", "玄武区鸡鸣寺路"],
            bullets: ["药师佛塔：登塔远眺，玄武湖景", "樱花大道：春季赏樱胜地", "素面馆：适合短暂停留补给"],
          },
          {
            type: "spot",
            title: "玄武湖",
            image: withBase("guides/nanjing/assets/xuanwuhu.jpg"),
            description: "湖景、城墙和城市天际线并置，适合把第二天节奏从古寺切到开阔松弛。",
            meta: ["免费", "2小时", "玄武区玄武巷"],
            bullets: ["环洲烟柳：适合慢走", "明城墙：登高看古今交融", "樱洲花海：春季视觉效果强"],
          },
          { type: "schedule", time: "13:00", title: "午餐", detail: "狮子桥美食街，品尝地道美食" },
          {
            type: "spot",
            title: "老门东",
            image: withBase("guides/nanjing/assets/laomendong.jpg"),
            description: "比夫子庙更适合白天闲逛，保留南京老城肌理，也能兼顾小吃与拍照。",
            meta: ["街区免费", "2小时", "秦淮区箍桶巷"],
            bullets: ["老城南街巷：适合漫步", "小馆与茶饮：补充休息点", "文创与小店：适合带点伴手礼"],
          },
          { type: "schedule", time: "17:00", title: "返程", detail: "地铁前往南京南站，高铁返回上海" },
        ],
      },
    ],
    travelNotes: [
      "南京适合周末短途，因为核心区域景点密度高，高铁与地铁衔接也顺。",
      "如果重点想拍夜景，夫子庙和秦淮河这一段一定留到天黑后。",
      "钟山风景区建议一早去，能避开人流，也更适合走台阶和长距离步行。",
    ],
  },
];
