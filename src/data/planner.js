import { trips } from "./trips.js";

export const GENERATED_TRIPS_STORAGE_KEY = "oh-my-trip/generated-trips";
export const PLAN_DRAFT_STORAGE_KEY = "oh-my-trip/plan-draft";
export const PREFERENCE_PROFILE_STORAGE_KEY = "oh-my-trip/preference-profile";

const fallbackStorage = new Map();
const heroImages = [
  "/guides/nanjing/assets/hero-bg.jpg",
  "/guides/nanjing/assets/fuzimiao.jpg",
  "/guides/nanjing/assets/xuanwuhu.jpg",
];

const optionBlueprints = [
  {
    id: "route-a",
    title: "经典稳妥两日线",
    summary: "适合第一次去，交通和步行都比较顺手。",
    routeTags: ["经典", "第一次去也稳", "节奏适中"],
    fitLabel: "高确定性",
    transportFocus: "high-speed-rail",
    stayArea: "核心景区 20 分钟通达圈",
  },
  {
    id: "route-b",
    title: "松弛景观漫游线",
    summary: "把移动成本压低，给拍照、休息和城市漫步留更大余量。",
    routeTags: ["风景", "松弛", "拍照友好"],
    fitLabel: "偏好匹配",
    transportFocus: "self-drive",
    stayArea: "景观带或老城步行范围",
  },
  {
    id: "route-c",
    title: "夜景与人文叠加线",
    summary: "白天看骨架，夜里看氛围，适合想把作品感做出来的人。",
    routeTags: ["夜景", "人文", "内容感强"],
    fitLabel: "表达感最强",
    transportFocus: "flight",
    stayArea: "夜间氛围区与次日返程便利区",
  },
];

const signalLabelMap = {
  humanities: "人文历史",
  "city-walk": "城市漫步",
  "night-view": "夜景氛围",
  scenery: "自然风景",
  food: "在地美食",
  "high-speed-rail": "高铁出行",
  "self-drive": "自驾出行",
  flight: "飞机出行",
  "self-drive-nearby": "周边自驾",
  "night-driving": "避免夜间驾驶",
  "overpacked-schedule": "避免过密行程",
  "over-commercial": "避免过度商业化",
  "good-location": "位置便利",
  atmospheric: "有氛围感",
  "mid-high": "中高档住宿",
  "easy-going": "省心即可",
};

function storageAvailable() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStorage(key, fallbackValue) {
  if (storageAvailable()) {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallbackValue;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return fallbackValue;
    }
  }
  return fallbackStorage.has(key) ? fallbackStorage.get(key) : fallbackValue;
}

function writeStorage(key, value) {
  if (storageAvailable()) {
    window.localStorage.setItem(key, JSON.stringify(value));
    return;
  }
  fallbackStorage.set(key, value);
}

function todayIso() {
  return new Date().toISOString();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function ensureArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (!value) {
    return [];
  }
  return [value];
}

function humanizeSignal(value) {
  return signalLabelMap[value] || value;
}

function normalizeFormInput(formInput) {
  return {
    destination: String(formInput.destination || "").trim(),
    origin: String(formInput.origin || "").trim(),
    days: Number(formInput.days),
    partySize: Number(formInput.partySize),
    budgetMin: Number(formInput.budgetMin),
    budgetMax: Number(formInput.budgetMax),
    travelDate: String(formInput.travelDate || ""),
    riskPreference: String(formInput.riskPreference || ""),
    transportBias: ensureArray(formInput.transportBias),
    pace: String(formInput.pace || "moderate"),
    interests: ensureArray(formInput.interests),
    hotelStyle: ensureArray(formInput.hotelStyle),
    avoidRules: ensureArray(formInput.avoidRules),
  };
}

export function derivePreferenceProfile(existingProfile) {
  const baseProfile = {
    travelerId: "default",
    profileVersion: 1,
    storageStrategy: {
      mode: "localStorage",
      fallback: "memory",
      serverPersistence: false,
      note: "MVP 首版只在浏览器本地保存 preferenceProfile，不引入后端持久化。",
    },
    infoSourceStrategy: {
      mode: "static-demo-data",
      freshnessBoundary: "当前候选方案中的交通、住宿和玩法建议基于静态与示例数据生成，页面会明确标注时效性。",
      replacementPlan: "后续可替换为实时 API，但不改变 planDraft -> trip 主链路。",
    },
    stableSignals: {
      preferredTripLength: [...new Set(trips.map((trip) => trip.duration))],
      transportBias: ["high-speed-rail", "self-drive-nearby"],
      avoidRules: ["night-driving", "overpacked-schedule"],
      hotelStyle: ["good-location", "atmospheric", "mid-high"],
      interestBias: ["humanities", "city-walk", "night-view", "scenery"],
    },
    inferredSignals: {
      budgetBand: { value: "mid", confidence: 0.72, lastUpdated: "2026-04-16", decayMonths: 6 },
      familyContext: { value: "pair-friendly", confidence: 0.81, lastUpdated: "2026-04-16", decayMonths: null },
      paceBias: { value: "moderate", confidence: 0.86, lastUpdated: "2026-04-16", decayMonths: null },
    },
    evidence: [
      {
        sourceType: "trip",
        sourceId: "nanjing",
        signal: "high-speed-rail",
        confidence: 0.8,
        timestamp: "2026-03-08T12:00:00Z",
      },
      {
        sourceType: "trip",
        sourceId: "nanjing",
        signal: "night-view",
        confidence: 0.78,
        timestamp: "2026-03-08T12:00:00Z",
      },
    ],
    lastUpdatedAt: todayIso(),
  };

  if (!existingProfile) {
    return baseProfile;
  }

  return {
    ...baseProfile,
    ...existingProfile,
    stableSignals: { ...baseProfile.stableSignals, ...existingProfile.stableSignals },
    inferredSignals: { ...baseProfile.inferredSignals, ...existingProfile.inferredSignals },
    evidence: existingProfile.evidence?.length ? existingProfile.evidence : baseProfile.evidence,
    lastUpdatedAt: existingProfile.lastUpdatedAt || baseProfile.lastUpdatedAt,
  };
}

export function loadPreferenceProfile() {
  const storedProfile = readStorage(PREFERENCE_PROFILE_STORAGE_KEY, null);
  const profile = derivePreferenceProfile(storedProfile);
  writeStorage(PREFERENCE_PROFILE_STORAGE_KEY, profile);
  return profile;
}

export function savePreferenceProfile(profile) {
  const nextProfile = {
    ...profile,
    lastUpdatedAt: todayIso(),
  };
  writeStorage(PREFERENCE_PROFILE_STORAGE_KEY, nextProfile);
  return nextProfile;
}

function buildRiskNotes(formInput) {
  const notes = [];
  if (formInput.riskPreference === "cautious") {
    notes.push("优先避开高峰与夜间驾驶");
  }
  if (formInput.partySize >= 4) {
    notes.push("多人同行需预留更稳妥的交通与住宿机动性");
  }
  if (formInput.budgetMax - formInput.budgetMin < 800) {
    notes.push("预算弹性较窄，建议优先保证交通与位置");
  }
  return notes;
}

function defaultInfoSource(generatedAt) {
  return {
    mode: "static-demo-data",
    label: "静态 / 示例数据",
    freshnessBoundary: "当前页面使用 MVP 示例信息，出发前请自行核实景区开放状态、路线时长与天气变化。",
    replacementPlan: "后续替换实时 API 时保留相同的数据结构与页面入口。",
    lastUpdated: generatedAt,
    providerStatus: [
      { provider: "amap", status: "fallback", reason: "未启用实时信息源" },
      { provider: "qweather", status: "fallback", reason: "未启用实时信息源" },
      { provider: "holiday", status: "fallback", reason: "未启用实时信息源" },
    ],
  };
}

export function createPlanDraft(formInput, preferenceProfile = loadPreferenceProfile(), sourceContext = {}) {
  const normalized = normalizeFormInput(formInput);
  const generatedAt = todayIso();
  const id = `plan-${slugify(normalized.destination)}-${generatedAt.slice(0, 10)}`;
  const infoSource = sourceContext.infoSource || defaultInfoSource(generatedAt);

  const planDraft = {
    id,
    status: "results",
    infoSource,
    sourceSignals: {
      routeHints: sourceContext.routeHints || {},
      holidaySummary: sourceContext.holidaySummary || null,
      freewayFree: Boolean(sourceContext.freewayFree),
      weatherSummary: sourceContext.weatherSummary || null,
      weatherWindow: sourceContext.weatherWindow || [],
      poiCandidates: sourceContext.poiCandidates || [],
    },
    destination: {
      city: normalized.destination,
      origin: normalized.origin,
      days: normalized.days,
      season: normalized.travelDate,
    },
    travelerContext: {
      partySize: normalized.partySize,
      budgetMin: normalized.budgetMin,
      budgetMax: normalized.budgetMax,
      riskPreference: normalized.riskPreference,
      confirmedFields: ["partySize", "budget", "travelDate", "riskPreference"],
      riskNotes: buildRiskNotes(normalized),
    },
    preferences: {
      transportBias: normalized.transportBias,
      avoid: normalized.avoidRules,
      interests: normalized.interests,
      hotelStyle: normalized.hotelStyle,
      pace: normalized.pace,
    },
    selectedOptionId: null,
    selectedTransportType: null,
    discussionLog: [
      {
        type: "system",
        message: "已根据当前输入生成候选方案，保留多方案讨论，不直接进入交易流程。",
        timestamp: generatedAt,
      },
    ],
    updatedAt: generatedAt,
  };

  planDraft.options = generatePlanOptions(planDraft, preferenceProfile, sourceContext);
  return planDraft;
}

function transportLabel(value) {
  return {
    "high-speed-rail": "高铁",
    "self-drive": "自驾",
    flight: "飞机",
  }[value] || value;
}

function paceLabel(value) {
  return {
    relaxed: "松弛",
    moderate: "适中",
    packed: "紧凑",
  }[value] || "适中";
}

function recommendationReasons(planDraft, matchedSignals, option) {
  const reasons = [
    `结合 ${planDraft.destination.origin} 出发与 ${planDraft.destination.days} 天时长做了路线密度控制。`,
    `围绕 ${planDraft.travelerContext.partySize} 人与 ${planDraft.travelerContext.budgetMin}-${planDraft.travelerContext.budgetMax} 元预算做平衡。`,
  ];

  if (matchedSignals.length > 0) {
    reasons.push(`历史偏好命中：${matchedSignals.slice(0, 2).map((item) => humanizeSignal(item)).join("、")}。`);
  }

  if (planDraft.preferences.avoid.includes("night-driving")) {
    reasons.push("已对需要夜间驾驶的路线降权，但仍保留展示选择权。");
  }

  reasons.push(`推荐交通以 ${transportLabel(option.transportPlans[0].type)} 为主，兼顾时长与稳定性。`);
  return reasons.slice(0, 4);
}

function resolveTransportPreference(defaultType, selectedBias) {
  if (!selectedBias.length) {
    return defaultType;
  }
  if (selectedBias.includes(defaultType)) {
    return defaultType;
  }
  return selectedBias[0];
}

function buildTransportPlans(planDraft, preferredTransport, avoidNightDriving, index, sourceContext = {}) {
  const selfDriveHint = sourceContext.routeHints?.selfDrive;
  const railHint = sourceContext.routeHints?.highSpeedRail;
  const routes = {
    "high-speed-rail": {
      durationText: railHint?.durationText || "单程约 1.5-2.5 小时",
      costText: railHint?.costText || "票价待确认（按车次实时）",
      notes: [
        "进出城稳定，适合热门城市周末线",
        avoidNightDriving ? "避免夜间驾驶压力" : "适合第一阶段稳妥方案",
        railHint?.trainNo ? `建议车次：${railHint.trainNo}` : "未拿到高铁车次，建议在 12306 确认",
      ],
      routeLineText: railHint?.routeLineText || "高铁站路线待确认",
      sourceProvider: railHint?.provider || "estimated",
    },
    "self-drive": {
      durationText: selfDriveHint?.durationText || "单程约 2.5-4 小时",
      costText: `高速费约 ${selfDriveHint?.tollPerCar ?? 0} 元/车`,
      notes: [
        "机动性更强，适合多停靠点",
        avoidNightDriving ? "建议提前返程，避免夜间回程" : "多人同行分摊成本更优",
        selfDriveHint?.distanceText ? `实时路程：${selfDriveHint.distanceText}` : "里程为示例估算",
        selfDriveHint?.tollText || "高速费以导航实时报价为准",
      ],
      routeLineText: selfDriveHint?.routeLineText || `${planDraft.destination.origin} → ${planDraft.destination.city}`,
      sourceProvider: selfDriveHint?.provider || "estimated",
    },
    flight: {
      durationText: "飞行 1-1.5 小时 + 机场换乘",
      costText: "票价待确认（按航班实时）",
      notes: ["适合跨区域高密度玩法", "未接入航班实时数据，建议在航司/OTA确认"],
      routeLineText: "航线待确认",
      sourceProvider: "estimated",
    },
  };

  const selectedTypes = planDraft.preferences.transportBias
    .filter((value) => ["high-speed-rail", "self-drive", "flight"].includes(value))
    .filter((value, position, array) => array.indexOf(value) === position);
  const orderedTypes = selectedTypes.length
    ? [
      ...(selectedTypes.includes(preferredTransport) ? [preferredTransport] : []),
      ...selectedTypes.filter((item) => item !== preferredTransport),
    ]
    : [preferredTransport, "high-speed-rail", "self-drive", "flight"].filter(
      (value, position, array) => array.indexOf(value) === position,
    );

  return orderedTypes.slice(0, 3).map((type, planIndex) => ({
    type,
    recommendation: planIndex === 0 ? "recommended" : planIndex === 1 ? "consider" : "backup",
    durationText: routes[type].durationText,
    costText: routes[type].costText,
    routeText: routes[type].routeLineText,
    sourceProvider: routes[type].sourceProvider,
    notes: [...routes[type].notes, index === 2 ? "夜景与返程节奏需额外平衡" : "MVP 首版使用示例路径数据"],
    dataSource: "static-demo-route",
    lastUpdated: todayIso(),
  }));
}

function buildStayAreas(planDraft, defaultArea, index) {
  const budgetHint = planDraft.travelerContext.budgetMax >= 4500 ? "中高预算更从容" : "优先保证位置与交通效率";
  return [
    {
      area: `${planDraft.destination.city}${defaultArea}`,
      why: index === 1 ? "利于步行与拍照，减少跨区移动。" : "景点与返程衔接顺畅，适合两日线压缩切换成本。",
      budgetHint,
      hotelStyleHint: planDraft.preferences.hotelStyle.length
        ? `更贴近你偏好的 ${planDraft.preferences.hotelStyle.map((item) => humanizeSignal(item)).join(" / ")}`
        : "酒店风格可在发布前再细化",
    },
  ];
}

function buildItinerary(planDraft, template, sourceContext = {}) {
  const days = Math.max(2, planDraft.destination.days);
  const interests = planDraft.preferences.interests.length
    ? planDraft.preferences.interests.map((item) => humanizeSignal(item))
    : ["城市漫步", "自然风景"];
  const poiCandidates = Array.isArray(sourceContext.poiCandidates) ? sourceContext.poiCandidates : [];
  const fallbackSpot = `${planDraft.destination.city}主城区精选点位`;

  return Array.from({ length: days }, (_, dayIndex) => {
    const start = dayIndex * 3;
    const spots = poiCandidates.slice(start, start + 3).map((item) => item.name);
    const finalSpots = spots.length ? spots : [fallbackSpot];
    const dayTag = template.routeTags[dayIndex % template.routeTags.length];
    const summary = dayIndex === 0
      ? `首日建议先玩 ${finalSpots.slice(0, 2).join("、")}，晚上可补充 ${finalSpots[2] || finalSpots[0]}。`
      : `建议串联 ${finalSpots.join("、")}，按 ${paceLabel(planDraft.preferences.pace)} 节奏游玩。`;
    return {
      day: dayIndex + 1,
      title: `${planDraft.destination.city}${dayIndex + 1}日 · ${dayTag}`,
      summary: `${summary} 重点偏好：${interests[dayIndex % interests.length]}。`,
      spots: finalSpots,
    };
  });
}

export function generatePlanOptions(planDraft, profile = loadPreferenceProfile(), sourceContext = planDraft.sourceSignals || {}) {
  const matchedSignals = [
    ...profile.stableSignals.interestBias.filter((item) => planDraft.preferences.interests.includes(item)),
    ...profile.stableSignals.avoidRules.filter((item) => planDraft.preferences.avoid.includes(item)),
    ...profile.stableSignals.transportBias.filter((item) => planDraft.preferences.transportBias.includes(item)),
  ];

  return optionBlueprints.map((template, index) => {
    const fitScore = Math.max(0.62, 0.92 - index * 0.07 + matchedSignals.length * 0.01);
    const preferredTransport = resolveTransportPreference(template.transportFocus, planDraft.preferences.transportBias);
    const avoidNightDriving = planDraft.preferences.avoid.includes("night-driving");
    const transportPlans = buildTransportPlans(planDraft, preferredTransport, avoidNightDriving, index, sourceContext);
    const stayAreas = buildStayAreas(planDraft, template.stayArea, index);
    const itineraryOutline = buildItinerary(planDraft, template, sourceContext);

    const option = {
      id: template.id,
      title: `${planDraft.destination.city}${String.fromCharCode(65 + index)}案 · ${template.title}`,
      summary: template.summary,
      fitScore: Number(fitScore.toFixed(2)),
      fitLabel: template.fitLabel,
      routeTags: [...template.routeTags, paceLabel(planDraft.preferences.pace)],
      transportPlans,
      recommendedTransportType: transportPlans[0]?.type || null,
      stayAreas,
      itineraryOutline,
      hotelAreaSummary: stayAreas[0].area,
      recommendationSummary: `基于你偏好 ${matchedSignals.length ? matchedSignals.map((item) => humanizeSignal(item)).join("、") : "适中节奏与可分享作品感"} 做了优先排序。`,
      dataSourceMeta: {
        poi: { source: "static-demo-poi", timestamp: todayIso() },
        route: {
          source: sourceContext.routeHints?.selfDrive ? "amap-route-api+static-fallback" : "static-demo-route",
          timestamp: todayIso(),
        },
        weather: {
          source: sourceContext.weatherSummary ? "qweather-api+static-fallback" : "static-demo-weather",
          timestamp: todayIso(),
          summary: sourceContext.weatherSummary || "天气示例数据",
        },
        holiday: {
          source: sourceContext.holidaySummary ? "timor-holiday-api+static-fallback" : "static-demo-holiday",
          timestamp: todayIso(),
          summary: sourceContext.holidaySummary || "节假日示例数据",
        },
      },
      routeSummary: itineraryOutline.map((item) => item.summary).join(" · "),
      heroImage: heroImages[index % heroImages.length],
      caution: avoidNightDriving && preferredTransport === "self-drive" ? "已降低夜间自驾权重，建议白天返程。" : "",
    };

    option.fitReasons = recommendationReasons(planDraft, matchedSignals, option);
    return option;
  });
}

export function applyAiRouteRecommendations(planDraft, aiRoutes) {
  if (!Array.isArray(aiRoutes) || !aiRoutes.length || !planDraft?.options?.length) {
    return planDraft;
  }
  const nextOptions = planDraft.options.map((option, index) => {
    const aiRoute = aiRoutes[index];
    if (!aiRoute) {
      return option;
    }
    const nextItinerary = Array.isArray(aiRoute.days) && aiRoute.days.length
      ? aiRoute.days.map((day, dayIndex) => ({
          day: day.day || dayIndex + 1,
          title: day.title || `${option.title} 第 ${dayIndex + 1} 天`,
          summary: day.summary || option.itineraryOutline[Math.min(dayIndex, option.itineraryOutline.length - 1)]?.summary || "",
          spots: Array.isArray(day.spots) ? day.spots.filter(Boolean).slice(0, 5) : option.itineraryOutline[Math.min(dayIndex, option.itineraryOutline.length - 1)]?.spots || [],
        }))
      : option.itineraryOutline;

    const aiPreferredTransport = normalizeTransportType(
      aiRoute.recommendedTransport || inferTransportFromText(`${aiRoute.title} ${aiRoute.summary} ${aiRoute.fitReasons?.join(" ") || ""}`),
    );
    const reorderedTransportPlans = aiPreferredTransport
      ? reorderTransportPlans(option.transportPlans, aiPreferredTransport)
      : option.transportPlans;

    return {
      ...option,
      title: aiRoute.title ? `${planDraft.destination.city}${String.fromCharCode(65 + index)}案 · ${aiRoute.title}` : option.title,
      summary: aiRoute.summary || option.summary,
      fitReasons: aiRoute.fitReasons?.length ? aiRoute.fitReasons : option.fitReasons,
      aiGenerated: true,
      recommendedTransportType: aiPreferredTransport || option.recommendedTransportType || option.transportPlans[0]?.type || null,
      transportPlans: reorderedTransportPlans,
      itineraryOutline: nextItinerary,
      routeSummary: nextItinerary.map((item) => item.summary).join(" · "),
      recommendationSummary: `${option.recommendationSummary} 已结合你的输入做了大模型路线增强。`,
    };
  });
  return {
    ...planDraft,
    options: nextOptions,
  };
}

function normalizeTransportType(value) {
  if (!value) {
    return null;
  }
  const normalized = String(value).toLowerCase();
  if (normalized.includes("self-drive") || normalized.includes("自驾")) {
    return "self-drive";
  }
  if (normalized.includes("high-speed-rail") || normalized.includes("高铁")) {
    return "high-speed-rail";
  }
  if (normalized.includes("flight") || normalized.includes("飞机")) {
    return "flight";
  }
  return null;
}

function inferTransportFromText(text) {
  const source = String(text || "");
  if (source.includes("自驾")) {
    return "self-drive";
  }
  if (source.includes("高铁")) {
    return "high-speed-rail";
  }
  if (source.includes("飞机")) {
    return "flight";
  }
  return null;
}

function reorderTransportPlans(plans, preferredType) {
  if (!Array.isArray(plans) || !plans.length || !preferredType) {
    return plans;
  }
  const head = plans.find((item) => item.type === preferredType);
  if (!head) {
    return plans;
  }
  return [head, ...plans.filter((item) => item.type !== preferredType)];
}

export function signalToHumanLabel(value) {
  return humanizeSignal(value);
}

export function savePlanDraft(planDraft) {
  if (!planDraft) {
    writeStorage(PLAN_DRAFT_STORAGE_KEY, null);
    return null;
  }
  const nextDraft = {
    ...planDraft,
    updatedAt: todayIso(),
  };
  writeStorage(PLAN_DRAFT_STORAGE_KEY, nextDraft);
  return nextDraft;
}

export function loadPlanDraft() {
  return readStorage(PLAN_DRAFT_STORAGE_KEY, null);
}

export function clearPlanDraft() {
  writeStorage(PLAN_DRAFT_STORAGE_KEY, null);
}

export function mergeDiscussionFeedback(profile, planDraft, feedbackMessage, signals = []) {
  const nextProfile = derivePreferenceProfile(profile);
  const feedbackSignals = signals.map((signal) => ({
    sourceType: "discussion",
    sourceId: planDraft.id,
    signal,
    confidence: 0.82,
    occurrenceCount: signal === "night-driving" ? 3 : 1,
    timestamp: todayIso(),
  }));

  nextProfile.evidence = [...nextProfile.evidence, ...feedbackSignals];

  if (signals.includes("night-driving")) {
    nextProfile.stableSignals.avoidRules = [...new Set([...nextProfile.stableSignals.avoidRules, "night-driving"])];
  }

  nextProfile.lastUpdatedAt = todayIso();
  writeStorage(PREFERENCE_PROFILE_STORAGE_KEY, nextProfile);

  planDraft.discussionLog = [
    ...planDraft.discussionLog,
    {
      type: "user-feedback",
      message: feedbackMessage,
      effect: signals,
      timestamp: todayIso(),
    },
  ];

  savePlanDraft(planDraft);
  return nextProfile;
}

export function buildTripFromSelection(planDraft, selectedOption, profile, selectedTransportType = null) {
  const preferredTransport = selectedOption.transportPlans.find((item) => item.type === selectedTransportType) || selectedOption.transportPlans[0];
  const slug = `${slugify(planDraft.destination.city)}-${Date.now()}`;
  const selectedSignals = [
    ...profile.stableSignals.transportBias.filter((item) => planDraft.preferences.transportBias.includes(item)),
    ...profile.stableSignals.interestBias.filter((item) => planDraft.preferences.interests.includes(item)),
    ...profile.stableSignals.avoidRules.filter((item) => planDraft.preferences.avoid.includes(item)),
  ];

  const days = selectedOption.itineraryOutline.map((item, index) => ({
    number: String(index + 1).padStart(2, "0"),
    title: `第 ${index + 1} 天`,
    subtitle: `${planDraft.destination.season} · ${item.title}`,
    entries: [
      {
        type: "schedule",
        time: index === 0 ? "09:00" : "10:00",
        title: index === 0 ? "从出发地进入主线" : "切换到下一段重点玩法",
        detail: `${preferredTransport.routeText}，按 ${selectedOption.fitLabel} 节奏执行。`,
      },
      {
        type: "spot",
        featured: index === 0,
        title: `${planDraft.destination.city} ${item.title}`,
        image: heroImages[index % heroImages.length],
        description: item.summary,
        meta: [selectedOption.routeTags[index % selectedOption.routeTags.length], selectedOption.hotelAreaSummary, preferredTransport.durationText],
        bullets: [
          `交通建议：${transportLabel(preferredTransport.type)}优先。`,
          `住宿建议：${selectedOption.stayAreas[0].area}。`,
          "当前页面只做路线与决策支持，不进入预订闭环。",
        ],
      },
    ],
  }));

  return {
    slug,
    guidePath: `/guides/generated/?trip=${slug}`,
    sourcePlanId: planDraft.id,
    sourceOptionId: selectedOption.id,
    city: planDraft.destination.city,
    title: `${planDraft.destination.city} 共享旅程提案`,
    subtitle: selectedOption.summary,
    dateRange: planDraft.destination.season,
    route: `${planDraft.destination.origin} → ${planDraft.destination.city}`,
    stay: selectedOption.stayAreas[0].area,
    companion: `${planDraft.travelerContext.partySize} 人同行`,
    duration: `${planDraft.destination.days} 天`,
    theme: selectedOption.routeTags[0],
    coverImage: selectedOption.heroImage,
    cardSummary: `${selectedOption.summary} 这份页面由规划页确认后的候选方案直接生成，可继续回看与复用。`,
    highlights: [...selectedOption.routeTags, selectedOption.fitLabel],
    overview: selectedOption.itineraryOutline.map((item) => ({
      day: `Day ${item.day}`,
      date: planDraft.destination.season,
      summary: item.summary,
    })),
    days,
    travelNotes: [
      `推荐理由：${selectedOption.recommendationSummary}`,
      `边界说明：${planDraft.infoSource.freshnessBoundary}`,
      `偏好记忆：本次读取了 ${selectedSignals.length ? selectedSignals.join("、") : "历史周末短途与作品化表达偏好"}。`,
    ],
    planningSummary: {
      destinationDecision: "值得进入 MVP 分享页",
      chosenTransport: transportLabel(preferredTransport.type),
      rejectedTransport: selectedOption.transportPlans.filter((item) => item.type !== preferredTransport.type).map((item) => transportLabel(item.type)),
      stayArea: selectedOption.stayAreas[0].area,
      riskPreference: planDraft.travelerContext.riskPreference,
      dataSourceMeta: selectedOption.dataSourceMeta,
    },
    preferenceSignalsUsed: selectedSignals.length ? selectedSignals : ["weekend-short-trip", "share-first"],
    generatedFromMvp: true,
  };
}

export function loadGeneratedTrips() {
  return readStorage(GENERATED_TRIPS_STORAGE_KEY, []);
}

export function saveGeneratedTrip(trip) {
  const nextTrips = [trip, ...loadGeneratedTrips().filter((item) => item.slug !== trip.slug)];
  writeStorage(GENERATED_TRIPS_STORAGE_KEY, nextTrips);
  return nextTrips;
}

export function getPublishedTrips() {
  return [...loadGeneratedTrips(), ...trips];
}

export function findPublishedTrip(slug) {
  return getPublishedTrips().find((trip) => trip.slug === slug || trip.sourceOptionId === slug);
}
