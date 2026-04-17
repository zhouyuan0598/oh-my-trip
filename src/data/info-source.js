const REQUEST_TIMEOUT_MS = 2600;
const DEFAULT_QWEATHER_HOST = "https://devapi.qweather.com";

function withTimeout(url, timeout = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

function enabledLiveSource() {
  return import.meta.env.VITE_ENABLE_LIVE_SOURCE === "true";
}

function buildStaticContext() {
  const now = new Date().toISOString();
  return {
    infoSource: {
      mode: "static-demo-data",
      label: "静态 / 示例数据",
      freshnessBoundary: "当前页面使用 MVP 示例信息，出发前请自行核实景区开放状态、路线时长与天气变化。",
      replacementPlan: "可通过环境变量开启实时 API，失败时自动降级为静态示例数据。",
      lastUpdated: now,
      providerStatus: [
        { provider: "amap", status: "disabled", reason: "VITE_ENABLE_LIVE_SOURCE 未开启" },
        { provider: "qweather", status: "disabled", reason: "VITE_ENABLE_LIVE_SOURCE 未开启" },
        { provider: "holiday", status: "disabled", reason: "VITE_ENABLE_LIVE_SOURCE 未开启" },
      ],
    },
    routeHints: {},
    holidaySummary: null,
    weatherSummary: null,
    weatherWindow: [],
    poiCandidates: [],
  };
}

async function fetchAmapPoi(amapKey, city) {
  if (!amapKey || !city) {
    return [];
  }

  const keywords = ["景区", "古镇", "公园", "博物馆", "历史街区"];
  const results = [];
  for (const keyword of keywords) {
    const url = `https://restapi.amap.com/v3/place/text?key=${encodeURIComponent(amapKey)}&keywords=${encodeURIComponent(keyword)}&city=${encodeURIComponent(city)}&citylimit=true&offset=8&page=1&extensions=base`;
    const response = await withTimeout(url);
    if (!response.ok) {
      continue;
    }
    const payload = await response.json();
    if (payload.status !== "1" || !Array.isArray(payload.pois)) {
      continue;
    }
    const pois = payload.pois
      .filter((item) => item.name)
      .map((item) => ({
        name: item.name,
        address: item.address || item.pname || city,
        type: item.type || "",
      }));
    results.push(...pois);
  }

  const deduped = results.filter((item, index, array) => array.findIndex((x) => x.name === item.name) === index);
  return deduped.slice(0, 18);
}

async function geocodeAddress(amapKey, address) {
  if (!amapKey || !address) {
    return null;
  }
  const url = `https://restapi.amap.com/v3/geocode/geo?key=${encodeURIComponent(amapKey)}&address=${encodeURIComponent(address)}`;
  const response = await withTimeout(url);
  if (!response.ok) {
    return null;
  }
  const payload = await response.json();
  if (payload.status !== "1" || !payload.geocodes?.length || !payload.geocodes[0]?.location) {
    return null;
  }
  const [lng, lat] = payload.geocodes[0].location.split(",");
  return { lng, lat };
}

async function fetchAmapRoute(amapKey, originAddress, destinationAddress, holidayContext = null) {
  if (!amapKey) {
    return null;
  }
  const origin = await geocodeAddress(amapKey, originAddress);
  const destination = await geocodeAddress(amapKey, destinationAddress);
  if (!origin || !destination) {
    return null;
  }

  const routeUrl = `https://restapi.amap.com/v3/direction/driving?key=${encodeURIComponent(amapKey)}&origin=${origin.lng},${origin.lat}&destination=${destination.lng},${destination.lat}`;
  const response = await withTimeout(routeUrl);
  if (!response.ok) {
    return null;
  }
  const payload = await response.json();
  if (payload.status !== "1" || !payload.route?.paths?.length) {
    return null;
  }
  const path = payload.route.paths[0];
  const durationHours = Number(path.duration) / 3600;
  const distanceKm = Number(path.distance) / 1000;
  const rawTollAmount = Number(path.tolls || 0);
  const tollFreeByHoliday = Boolean(holidayContext?.freewayFree);
  const tollAmount = tollFreeByHoliday ? 0 : rawTollAmount;
  const tollDistanceKm = Number(path.toll_distance || 0) / 1000;
  const roadNames = (path.steps || [])
    .map((step) => step.road)
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 4);
  const highwayNames = roadNames.filter((name) => /高速|G\d+|S\d+/.test(name)).slice(0, 3);

  return {
    destinationCoord: destination,
    selfDrive: {
      durationText: `单程约 ${durationHours.toFixed(1)} 小时`,
      distanceText: `约 ${distanceKm.toFixed(0)} km`,
      tollText: tollFreeByHoliday
        ? "法定节假日 7 座及以下小客车高速免费（以官方通告为准）"
        : tollAmount > 0
          ? `高速费约 ${Math.round(tollAmount)} 元（高速里程约 ${tollDistanceKm.toFixed(0)} km）`
          : "未返回高速费，建议出发前再核算",
      tollPerCar: Math.max(0, Math.round(tollAmount)),
      routeLineText: highwayNames.length ? highwayNames.join(" → ") : roadNames.length ? roadNames.join(" → ") : `${originAddress} → ${destinationAddress}`,
      provider: "amap-route-api",
    },
  };
}

async function fetchAmapRail(amapKey, originAddress, destinationAddress) {
  if (!amapKey) {
    return null;
  }
  const origin = await geocodeAddress(amapKey, originAddress);
  const destination = await geocodeAddress(amapKey, destinationAddress);
  if (!origin || !destination) {
    return null;
  }

  const url = `https://restapi.amap.com/v3/direction/transit/integrated?key=${encodeURIComponent(amapKey)}&origin=${origin.lng},${origin.lat}&destination=${destination.lng},${destination.lat}&city=${encodeURIComponent(originAddress)}&cityd=${encodeURIComponent(destinationAddress)}&strategy=0&extensions=all`;
  const response = await withTimeout(url);
  if (!response.ok) {
    return null;
  }
  const payload = await response.json();
  if (payload.status !== "1" || !payload.route?.transits?.length) {
    return null;
  }

  const transit = payload.route.transits[0];
  const segments = transit.segments || [];
  const railways = segments
    .map((segment) => segment.railway)
    .filter(Boolean);
  const buses = segments
    .map((segment) => segment.bus?.buslines?.[0])
    .filter(Boolean);

  const durationHours = Number(transit.duration || 0) / 3600;
  const cost = Number(transit.cost || 0);
  if (railways.length) {
    const firstRail = railways[0];
    return {
      highSpeedRail: {
        durationText: durationHours > 0 ? `全程约 ${durationHours.toFixed(1)} 小时` : "时长以车次为准",
        costText: cost > 0 ? `票价约 ${Math.round(cost)} 元/人（参考）` : "票价以购票平台为准",
        routeLineText: `${firstRail.departure_stop?.name || originAddress} → ${firstRail.arrival_stop?.name || destinationAddress}`,
        trainNo: firstRail.trip || firstRail.name || "高铁/动车",
        provider: "amap-transit-api",
      },
    };
  }

  if (buses.length) {
    const firstBus = buses[0];
    return {
      highSpeedRail: {
        durationText: durationHours > 0 ? `公共交通约 ${durationHours.toFixed(1)} 小时` : "时长待确认",
        costText: cost > 0 ? `费用约 ${Math.round(cost)} 元/人（参考）` : "费用以实际为准",
        routeLineText: `${firstBus.name || "公共交通方案"}（含换乘）`,
        trainNo: "公交/地铁换乘",
        provider: "amap-transit-api",
      },
    };
  }

  return null;
}

function pickWeatherWindow(dailyList, travelDate, days) {
  if (!Array.isArray(dailyList) || !dailyList.length) {
    return [];
  }
  const safeDays = Math.max(1, Number(days) || 1);
  const startIndex = Math.max(
    0,
    dailyList.findIndex((item) => item.fxDate === travelDate),
  );
  const selected = dailyList.slice(startIndex, startIndex + safeDays);
  return selected.map((item) => ({
    date: item.fxDate,
    textDay: item.textDay,
    iconDay: item.iconDay,
    tempMin: item.tempMin,
    tempMax: item.tempMax,
  }));
}

async function fetchQWeather(qweatherKey, destinationCoord, travelDate, days) {
  if (!qweatherKey || !destinationCoord) {
    return null;
  }
  const weatherHost = (import.meta.env.VITE_QWEATHER_HOST || DEFAULT_QWEATHER_HOST).replace(/\/+$/, "");
  const location = `${destinationCoord.lng},${destinationCoord.lat}`;
  const endpointCandidates = ["/v7/weather/7d", "/v7/weather/3d"];

  let payload = null;
  for (const endpoint of endpointCandidates) {
    const url = `${weatherHost}${endpoint}?location=${encodeURIComponent(location)}&key=${encodeURIComponent(qweatherKey)}`;
    const response = await withTimeout(url);
    if (!response.ok) {
      continue;
    }
    const candidate = await response.json();
    if (candidate.code === "200" && candidate.daily?.length) {
      payload = candidate;
      break;
    }
  }

  if (!payload) {
    return null;
  }
  const weatherWindow = pickWeatherWindow(payload.daily, travelDate, days);
  if (!weatherWindow.length) {
    return null;
  }
  const first = weatherWindow[0];
  return {
    summary: `${weatherWindow.length}天：${first.textDay} ${first.tempMin}-${first.tempMax}°C 起`,
    weatherWindow,
    provider: "qweather-api",
  };
}

async function fetchHoliday(travelDate) {
  if (!travelDate) {
    return null;
  }
  const url = `https://timor.tech/api/holiday/info/${travelDate}`;
  const response = await withTimeout(url);
  if (!response.ok) {
    return null;
  }
  const payload = await response.json();
  const typeName = payload?.type?.name;
  const holidayName = payload?.holiday?.name;
  const holidayFlag = payload?.holiday?.holiday === true;
  if (!typeName && !holidayName) {
    return null;
  }
  const statutoryPattern = /(元旦|春节|清明|劳动节|端午|中秋|国庆)/;
  const freewayFree = holidayFlag && statutoryPattern.test(holidayName || "");
  const normalizedSummary = holidayFlag ? (holidayName || typeName) : (typeName || holidayName);
  return {
    summary: normalizedSummary,
    typeName: typeName || null,
    holidayName: holidayName || null,
    freewayFree,
    provider: "timor-holiday-api",
  };
}

export async function loadPlanningInfo(formInput) {
  const fallback = buildStaticContext();
  if (!enabledLiveSource()) {
    return fallback;
  }

  const now = new Date().toISOString();
  const amapKey = import.meta.env.VITE_AMAP_KEY;
  const qweatherKey = import.meta.env.VITE_QWEATHER_KEY;

  const providerStatus = [];
  let route = null;
  let weather = null;
  let holiday = null;
  let rail = null;
  let poiCandidates = [];

  try {
    holiday = await fetchHoliday(formInput.travelDate);
    providerStatus.push({ provider: "holiday", status: holiday ? "live" : "fallback", reason: holiday ? "ok" : "接口不可用" });
  } catch {
    providerStatus.push({ provider: "holiday", status: "fallback", reason: "请求失败，已降级" });
  }

  try {
    route = await fetchAmapRoute(amapKey, formInput.origin, formInput.destination, holiday);
    providerStatus.push({ provider: "amap", status: route ? "live" : "fallback", reason: route ? "ok" : "缺少 key 或接口不可用" });
  } catch {
    providerStatus.push({ provider: "amap", status: "fallback", reason: "请求失败，已降级" });
  }

  try {
    weather = await fetchQWeather(qweatherKey, route?.destinationCoord, formInput.travelDate, formInput.days);
    providerStatus.push({ provider: "qweather", status: weather ? "live" : "fallback", reason: weather ? "ok" : "缺少 key 或接口不可用" });
  } catch {
    providerStatus.push({ provider: "qweather", status: "fallback", reason: "请求失败，已降级" });
  }

  try {
    rail = await fetchAmapRail(amapKey, formInput.origin, formInput.destination);
    providerStatus.push({ provider: "transit", status: rail ? "live" : "fallback", reason: rail ? "ok" : "接口不可用或无可解析高铁方案" });
  } catch {
    providerStatus.push({ provider: "transit", status: "fallback", reason: "请求失败，已降级" });
  }

  try {
    poiCandidates = await fetchAmapPoi(amapKey, formInput.destination);
    providerStatus.push({ provider: "poi", status: poiCandidates.length ? "live" : "fallback", reason: poiCandidates.length ? "ok" : "未获取到景点列表" });
  } catch {
    providerStatus.push({ provider: "poi", status: "fallback", reason: "请求失败，已降级" });
  }

  const hasLiveSource = [route, rail, weather, holiday, poiCandidates.length > 0].some(Boolean);
  if (!hasLiveSource) {
    return {
      ...fallback,
      infoSource: {
        ...fallback.infoSource,
        lastUpdated: now,
        providerStatus,
      },
    };
  }

  return {
    infoSource: {
      mode: "hybrid-live-data",
      label: "实时 + 静态降级",
      freshnessBoundary: "已优先尝试实时 API；不可用字段自动降级为示例数据，请出发前再次核实。",
      replacementPlan: "当 key 缺失或接口失败时维持静态链路，保证规划流程不中断。",
      lastUpdated: now,
      providerStatus,
    },
    routeHints: {
      selfDrive: route?.selfDrive || null,
      highSpeedRail: rail?.highSpeedRail || null,
    },
    holidaySummary: holiday?.summary || null,
    freewayFree: Boolean(holiday?.freewayFree),
    weatherSummary: weather?.summary || null,
    weatherWindow: weather?.weatherWindow || [],
    poiCandidates,
  };
}
