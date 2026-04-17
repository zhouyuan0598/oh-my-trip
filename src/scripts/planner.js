import {
  applyAiRouteRecommendations,
  buildTripFromSelection,
  clearPlanDraft,
  createPlanDraft,
  findPublishedTrip,
  generatePlanOptions,
  loadPlanDraft,
  loadPreferenceProfile,
  mergeDiscussionFeedback,
  saveGeneratedTrip,
  savePlanDraft,
  savePreferenceProfile,
  signalToHumanLabel,
} from "../data/planner.js";
import { loadPlanningInfo } from "../data/info-source.js";
import { fetchAiRouteRecommendationsWithMeta, isAiRouteEnabled } from "../data/ai-recommendation.js";

const form = document.querySelector("#planner-form");
const profileSummary = document.querySelector("#profile-summary");
const optionStack = document.querySelector("#option-stack");
const plannerStatus = document.querySelector("#planner-status");
const plannerError = document.querySelector("#planner-error");
const selectionBanner = document.querySelector("#selection-banner");
const optionDiff = document.querySelector("#option-diff");
const sourceBrief = document.querySelector("#source-brief");
const publishButton = document.querySelector("#publish-button");
const refineButton = document.querySelector("#refine-button");
const backStepButton = document.querySelector("#back-step");
const stepCtaButton = document.querySelector("#step-cta");
const stepTab1 = document.querySelector("#step-tab-1");
const stepTab2 = document.querySelector("#step-tab-2");
const stepPanels = [...document.querySelectorAll("[data-step]")];
const quickTemplateButtons = [...document.querySelectorAll("[data-template]")];
const publishConfirm = document.querySelector("#publish-confirm");
const publishConfirmTitle = document.querySelector("#publish-confirm-title");
const publishConfirmCopy = document.querySelector("#publish-confirm-copy");
const cancelPublishButton = document.querySelector("#cancel-publish");
const confirmPublishButton = document.querySelector("#confirm-publish-button");
const publishSuccess = document.querySelector("#publish-success");
const publishSuccessCopy = document.querySelector("#publish-success-copy");
const viewPublishedGuide = document.querySelector("#view-published-guide");
const draftRecovery = document.querySelector("#draft-recovery");
const draftRecoveryTitle = document.querySelector("#draft-recovery-title");
const draftRecoveryMeta = document.querySelector("#draft-recovery-meta");
const draftContinueButton = document.querySelector("#draft-continue");
const draftResetButton = document.querySelector("#draft-reset");

const quickTemplates = {
  "weekend-city": {
    destination: "杭州",
    origin: "上海",
    days: "2",
    partySize: "2",
    budgetMin: "2800",
    budgetMax: "4200",
    riskPreference: "balanced",
    transportBias: ["high-speed-rail"],
    pace: "relaxed",
    interests: ["city-walk", "scenery", "food"],
    hotelStyle: ["good-location", "atmospheric"],
    avoidRules: ["night-driving"],
  },
  "photo-night": {
    destination: "南京",
    origin: "上海",
    days: "3",
    partySize: "2",
    budgetMin: "3600",
    budgetMax: "5200",
    riskPreference: "balanced",
    transportBias: ["high-speed-rail", "flight"],
    pace: "moderate",
    interests: ["night-view", "humanities", "city-walk"],
    hotelStyle: ["atmospheric", "mid-high"],
    avoidRules: ["overpacked-schedule"],
  },
  "family-safe": {
    destination: "苏州",
    origin: "南京",
    days: "2",
    partySize: "4",
    budgetMin: "3200",
    budgetMax: "5000",
    riskPreference: "cautious",
    transportBias: ["self-drive", "high-speed-rail"],
    pace: "relaxed",
    interests: ["scenery", "food"],
    hotelStyle: ["good-location", "easy-going"],
    avoidRules: ["night-driving", "overpacked-schedule"],
  },
};

let preferenceProfile = loadPreferenceProfile();
let pendingDraft = loadPlanDraft();
let currentPlanDraft = null;
let currentStep = 1;
let hasResults = false;
let publishingTrip = null;
let isResolvingSources = false;

hydrateProfileSummary();
hydrateDefaultForm(pendingDraft);
hydrateDraftRecovery(pendingDraft);
syncStepUi();

stepTab1.addEventListener("click", () => {
  currentStep = 1;
  syncStepUi();
});

stepTab2.addEventListener("click", () => {
  const validationMessage = validateRequiredFields(collectFormInput());
  if (validationMessage) {
    setError(validationMessage);
    return;
  }
  clearError();
  currentStep = 2;
  syncStepUi();
});

backStepButton.addEventListener("click", () => {
  if (currentStep > 1) {
    currentStep -= 1;
    syncStepUi();
  }
});

stepCtaButton.addEventListener("click", async () => {
  const formInput = collectFormInput();
  const requiredError = validateRequiredFields(formInput);
  if (requiredError) {
    setError(requiredError);
    return;
  }
  clearError();
  hidePublishPanels();

  if (currentStep === 1) {
    currentStep = 2;
    plannerStatus.textContent = "已完成必填信息，继续补充偏好后即可生成方案。";
    syncStepUi();
    return;
  }

  renderLoadingState("正在生成候选方案，请稍候…");
  await flushUiFrame();
  const sourceContext = await resolvePlanningSource(formInput);
  currentPlanDraft = createPlanDraft(formInput, preferenceProfile, sourceContext);
  currentPlanDraft = await maybeEnhanceRoutesWithAi(currentPlanDraft, formInput);
  currentPlanDraft = savePlanDraft(currentPlanDraft);
  pendingDraft = currentPlanDraft;
  hasResults = true;
  renderResults(currentPlanDraft);
  hydrateDraftRecovery(pendingDraft);
});

refineButton.addEventListener("click", async () => {
  const formInput = collectFormInput();
  const requiredError = validateRequiredFields(formInput);
  if (requiredError) {
    setError(requiredError);
    return;
  }

  clearError();
  hidePublishPanels();
  renderLoadingState("正在刷新方案，请稍候…");
  await flushUiFrame();
  const sourceContext = await resolvePlanningSource(formInput);
  if (!currentPlanDraft) {
    currentPlanDraft = createPlanDraft(formInput, preferenceProfile, sourceContext);
  } else {
    currentPlanDraft.infoSource = sourceContext.infoSource || currentPlanDraft.infoSource;
    currentPlanDraft.sourceSignals = {
      routeHints: sourceContext.routeHints || {},
      holidaySummary: sourceContext.holidaySummary || null,
      freewayFree: Boolean(sourceContext.freewayFree),
      weatherSummary: sourceContext.weatherSummary || null,
      weatherWindow: sourceContext.weatherWindow || [],
      poiCandidates: sourceContext.poiCandidates || [],
    };
    currentPlanDraft.preferences = {
      transportBias: formInput.transportBias,
      avoid: formInput.avoidRules,
      interests: formInput.interests,
      hotelStyle: formInput.hotelStyle,
      pace: formInput.pace,
    };
    currentPlanDraft.travelerContext = {
      ...currentPlanDraft.travelerContext,
      partySize: formInput.partySize,
      budgetMin: formInput.budgetMin,
      budgetMax: formInput.budgetMax,
      riskPreference: formInput.riskPreference,
    };
    currentPlanDraft.destination = {
      city: formInput.destination,
      origin: formInput.origin,
      days: formInput.days,
      season: formInput.travelDate,
    };
    currentPlanDraft.options = generatePlanOptions(currentPlanDraft, preferenceProfile, sourceContext);
    currentPlanDraft = await maybeEnhanceRoutesWithAi(currentPlanDraft, formInput);
    currentPlanDraft.status = "results";
    currentPlanDraft.selectedOptionId = null;
    currentPlanDraft.selectedTransportType = null;
    currentPlanDraft.discussionLog.push({
      type: "user-feedback",
      message: "用户在候选方案阶段调整偏好并重新生成。",
      timestamp: new Date().toISOString(),
    });
  }

  if (formInput.avoidRules.includes("night-driving")) {
    preferenceProfile = mergeDiscussionFeedback(
      preferenceProfile,
      currentPlanDraft,
      "用户明确避免夜间驾驶。",
      ["night-driving"],
    );
  }

  currentPlanDraft = savePlanDraft(currentPlanDraft);
  pendingDraft = currentPlanDraft;
  hasResults = true;
  renderResults(currentPlanDraft);
  hydrateDraftRecovery(pendingDraft);
});

publishButton.addEventListener("click", () => {
  if (!currentPlanDraft?.selectedOptionId) {
    setError("请先选择一个方案，再发布这份行程。");
    return;
  }

  const selectedOption = currentPlanDraft.options.find((option) => option.id === currentPlanDraft.selectedOptionId);
  const selectedTransportType = currentPlanDraft.selectedTransportType || selectedOption.transportPlans[0]?.type;
  publishConfirmTitle.textContent = `确认发布 ${selectedOption.title}？`;
  publishConfirmCopy.textContent = `发布后会生成可分享页面（已选交通：${transportLabel(selectedTransportType)}）。`;
  publishConfirm.classList.remove("is-hidden");
});

cancelPublishButton.addEventListener("click", () => {
  publishConfirm.classList.add("is-hidden");
});

confirmPublishButton.addEventListener("click", () => {
  if (!currentPlanDraft?.selectedOptionId) {
    setError("请先选择一个方案，再发布这份行程。");
    return;
  }

  const selectedOption = currentPlanDraft.options.find((option) => option.id === currentPlanDraft.selectedOptionId);
  const selectedTransportType = currentPlanDraft.selectedTransportType || selectedOption.transportPlans[0]?.type;
  publishingTrip = buildTripFromSelection(currentPlanDraft, selectedOption, preferenceProfile, selectedTransportType);
  saveGeneratedTrip(publishingTrip);
  savePreferenceProfile(preferenceProfile);

  publishConfirm.classList.add("is-hidden");
  publishSuccess.classList.remove("is-hidden");
  viewPublishedGuide.href = publishingTrip.guidePath;
  publishSuccessCopy.textContent = `${selectedOption.title} 已发布完成，接下来可以直接查看分享页。`;
  plannerStatus.textContent = "发布成功。你可以继续预览分享页，或返回首页看已发布列表。";
});

quickTemplateButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyQuickTemplate(button.dataset.template);
  });
});

draftContinueButton.addEventListener("click", () => {
  if (!pendingDraft) {
    return;
  }
  currentPlanDraft = pendingDraft;
  hasResults = Array.isArray(currentPlanDraft.options) && currentPlanDraft.options.length > 0;
  draftRecovery.classList.add("is-hidden");
  plannerStatus.textContent = "已恢复上次草稿，你可以继续调整并发布。";
  if (hasResults) {
    renderResults(currentPlanDraft);
  } else {
    syncStepUi();
  }
});

draftResetButton.addEventListener("click", () => {
  clearPlanDraft();
  pendingDraft = null;
  currentPlanDraft = null;
  hasResults = false;
  publishingTrip = null;
  draftRecovery.classList.add("is-hidden");
  hidePublishPanels();
  resetFormToDefault();
  plannerStatus.textContent = "已清空草稿。先填必填信息，再生成候选方案。";
});

function hydrateProfileSummary() {
  const learnedInterests = preferenceProfile.stableSignals.interestBias.slice(0, 2).map((item) => signalToHumanLabel(item));
  profileSummary.innerHTML = `
    <span>已学习偏好：${learnedInterests.join(" / ")}</span>
    <span>常用时长：${preferenceProfile.stableSignals.preferredTripLength.join("、")}</span>
  `;
}

function hydrateDraftRecovery(draft) {
  if (!draft) {
    draftRecovery.classList.add("is-hidden");
    return;
  }
  const updated = draft.updatedAt ? new Date(draft.updatedAt) : null;
  const updatedText = updated ? `${updated.getMonth() + 1}月${updated.getDate()}日 ${String(updated.getHours()).padStart(2, "0")}:${String(updated.getMinutes()).padStart(2, "0")}` : "刚刚";
  draftRecoveryTitle.textContent = `${draft.destination.city} 草稿待继续`;
  draftRecoveryMeta.textContent = `上次更新：${updatedText}，已生成 ${draft.options?.length || 0} 个候选方案。`;
  draftRecovery.classList.remove("is-hidden");
}

function hydrateDefaultForm(draft) {
  const dateInput = form.elements.travelDate;
  if (!dateInput.value) {
    const upcoming = new Date();
    upcoming.setDate(upcoming.getDate() + 14);
    dateInput.value = upcoming.toISOString().slice(0, 10);
  }

  setCheckedValues("transportBias", ["high-speed-rail"]);
  setCheckedValues("interests", ["scenery", "city-walk"]);
  setCheckedValues("hotelStyle", ["good-location", "atmospheric"]);
  setCheckedValues("avoidRules", ["night-driving"]);

  if (!draft) {
    return;
  }

  const { destination, travelerContext, preferences } = draft;
  form.elements.destination.value = destination.city;
  form.elements.origin.value = destination.origin;
  form.elements.days.value = destination.days;
  form.elements.partySize.value = travelerContext.partySize;
  form.elements.budgetMin.value = travelerContext.budgetMin;
  form.elements.budgetMax.value = travelerContext.budgetMax;
  form.elements.travelDate.value = destination.season;
  form.elements.riskPreference.value = travelerContext.riskPreference;
  setCheckedValues("transportBias", preferences.transportBias);
  setCheckedValues("interests", preferences.interests);
  setCheckedValues("hotelStyle", preferences.hotelStyle);
  setCheckedValues("avoidRules", preferences.avoid);
  for (const item of form.querySelectorAll('[name="pace"]')) {
    item.checked = item.value === preferences.pace;
  }
}

function resetFormToDefault() {
  form.reset();
  optionStack.innerHTML = "";
  sourceBrief.classList.add("is-hidden");
  sourceBrief.innerHTML = "";
  selectionBanner.innerHTML = "<p>先选一个方案，再发布成可分享页面。</p>";
  optionDiff.classList.add("is-hidden");
  optionDiff.innerHTML = "";
  currentStep = 1;
  clearError();
  hydrateDefaultForm(null);
  syncStepUi();
}

function applyQuickTemplate(templateKey) {
  const template = quickTemplates[templateKey];
  if (!template) {
    return;
  }

  form.elements.destination.value = template.destination;
  form.elements.origin.value = template.origin;
  form.elements.days.value = template.days;
  form.elements.partySize.value = template.partySize;
  form.elements.budgetMin.value = template.budgetMin;
  form.elements.budgetMax.value = template.budgetMax;
  form.elements.riskPreference.value = template.riskPreference;
  setCheckedValues("transportBias", template.transportBias);
  setCheckedValues("interests", template.interests);
  setCheckedValues("hotelStyle", template.hotelStyle);
  setCheckedValues("avoidRules", template.avoidRules);
  for (const item of form.querySelectorAll('[name="pace"]')) {
    item.checked = item.value === template.pace;
  }
  plannerStatus.textContent = "已应用快捷模板，你可以直接下一步生成方案。";
  clearError();
}

function syncStepUi() {
  stepPanels.forEach((panel) => {
    const isVisible = Number(panel.dataset.step) === currentStep;
    panel.classList.toggle("is-hidden", !isVisible);
  });

  stepTab1.classList.toggle("is-active", currentStep === 1);
  stepTab2.classList.toggle("is-active", currentStep === 2);
  backStepButton.classList.toggle("is-hidden", currentStep === 1);
  refineButton.classList.toggle("is-hidden", !hasResults);
  publishButton.classList.toggle("is-hidden", !hasResults);
  stepCtaButton.classList.toggle("is-hidden", hasResults);
  stepCtaButton.textContent = currentStep === 1 ? "继续到偏好" : "生成 3 个候选方案";
}

function collectFormInput() {
  const data = new FormData(form);
  return {
    destination: String(data.get("destination") || "").trim(),
    origin: String(data.get("origin") || "").trim(),
    days: Number(data.get("days")),
    partySize: Number(data.get("partySize")),
    budgetMin: Number(data.get("budgetMin")),
    budgetMax: Number(data.get("budgetMax")),
    travelDate: data.get("travelDate"),
    riskPreference: data.get("riskPreference"),
    transportBias: data.getAll("transportBias"),
    pace: data.get("pace"),
    interests: data.getAll("interests"),
    hotelStyle: data.getAll("hotelStyle"),
    avoidRules: data.getAll("avoidRules"),
  };
}

function validateRequiredFields(formInput) {
  if (!formInput.destination || !formInput.origin) {
    return "请先确认目的地和出发地。";
  }
  if (!formInput.days || !formInput.partySize) {
    return "请先确认出行天数和人数。";
  }
  if (!formInput.budgetMin || !formInput.budgetMax || formInput.budgetMin > formInput.budgetMax) {
    return "请先确认预算区间，且上限不能低于下限。";
  }
  if (!formInput.travelDate || !formInput.riskPreference) {
    return "请先确认出行日期和风险偏好。";
  }
  return "";
}

function setError(message) {
  plannerError.textContent = message;
}

function clearError() {
  plannerError.textContent = "";
}

function setCheckedValues(name, values) {
  const asArray = Array.isArray(values) ? values : [values];
  const elements = form.querySelectorAll(`[name="${name}"]`);
  elements.forEach((element) => {
    element.checked = asArray.includes(element.value);
  });
}

async function resolvePlanningSource(formInput) {
  if (isResolvingSources) {
    return {};
  }

  try {
    isResolvingSources = true;
    setBusyState(true);
    plannerStatus.textContent = "正在校验信息源并生成推荐，请稍候…";
    const sourceContext = await loadPlanningInfo(formInput);
    const modeLabel = sourceContext.infoSource?.label || "静态 / 示例数据";
    plannerStatus.textContent = `候选方案已更新（信息源：${modeLabel}）。`;
    return sourceContext;
  } catch {
    plannerStatus.textContent = "实时信息源不可用，已自动降级为示例数据。";
    return {};
  } finally {
    isResolvingSources = false;
    setBusyState(false);
  }
}

async function maybeEnhanceRoutesWithAi(planDraft, formInput) {
  const aiInput = {
    ...formInput,
    poiCandidates: (planDraft.sourceSignals?.poiCandidates || []).slice(0, 18),
  };
  const aiResult = await fetchAiRouteRecommendationsWithMeta(aiInput);
  if (!aiResult.used || !aiResult.routes) {
    const reason = isAiRouteEnabled() ? aiResult.reason : "未开启";
    return {
      ...planDraft,
      aiMeta: { used: false, reason },
    };
  }
  return {
    ...applyAiRouteRecommendations(planDraft, aiResult.routes),
    aiMeta: { used: true, reason: "ok" },
  };
}

function setBusyState(isBusy) {
  stepCtaButton.disabled = isBusy;
  refineButton.disabled = isBusy;
  publishButton.disabled = isBusy || !currentPlanDraft?.selectedOptionId;
}

function hidePublishPanels() {
  publishConfirm.classList.add("is-hidden");
  publishSuccess.classList.add("is-hidden");
}

function renderResults(planDraft) {
  const sourceLabel = planDraft.infoSource?.label || "静态 / 示例数据";
  const aiText = planDraft.aiMeta?.used ? "，已启用 AI 路线增强" : planDraft.aiMeta?.reason ? `，AI 未生效（${planDraft.aiMeta.reason}）` : "，未开启 AI 路线增强";
  plannerStatus.textContent = `已生成 ${planDraft.options.length} 个候选方案（信息源：${sourceLabel}${aiText}），先选一个再发布。`;
  optionStack.innerHTML = "";
  hidePublishPanels();
  renderSourceBrief(planDraft);
  syncStepUi();

  planDraft.options.forEach((option) => {
    const article = document.createElement("article");
    article.className = `option-card ${planDraft.selectedOptionId === option.id ? "option-card--selected" : ""}`;
    article.dataset.testid = `option-${option.id}`;
    article.innerHTML = `
      <div class="option-card__header">
        <div>
          <p class="eyebrow">${option.fitLabel}</p>
          <h3>${option.title}</h3>
          ${option.aiGenerated ? '<span class="option-card__ai-badge">🤖 AI推荐路线</span>' : ''}
        </div>
        <span class="option-card__score">${Math.round(option.fitScore * 100)}%</span>
      </div>
      <p class="option-card__summary">${option.summary}</p>
      <div class="option-card__tags">
        ${option.routeTags.map((tag) => `<span>${tag}</span>`).join("")}
      </div>
      <div class="option-card__grid">
        <section>
          <h4>为什么推荐</h4>
          <ul>${option.fitReasons.map((reason) => `<li>${reason}</li>`).join("")}</ul>
        </section>
        <section>
          <h4>交通</h4>
          <ul>
            ${option.transportPlans
              .map(
                (transport) => {
                  const isSelectedTransport = planDraft.selectedOptionId === option.id && planDraft.selectedTransportType === transport.type;
                  return `
                <li class="option-transport-row ${isSelectedTransport ? "is-selected" : ""}">
                  ${renderTransportItem(transport, {
                    isPrimary: transport.type === option.transportPlans[0].type,
                    isSelected: isSelectedTransport,
                    optionId: option.id,
                  })}
                </li>`;
                },
              )
              .join("")}
          </ul>
        </section>
        <section>
          <h4>推荐游玩路线</h4>
          <ul>
            ${option.itineraryOutline
              .map(
                (dayItem) => `
                <li>
                  <strong>Day ${dayItem.day} · ${dayItem.title}</strong>
                  <span>${dayItem.summary}</span>
                  ${Array.isArray(dayItem.spots) && dayItem.spots.length ? `<div class="option-card__transport-detail">推荐景点：${dayItem.spots.join("、")}</div>` : ""}
                </li>`,
              )
              .join("")}
          </ul>
        </section>
      </div>
      ${option.caution ? `<p class="option-card__note">${option.caution}</p>` : ""}
      <div class="option-card__actions">
        <button data-testid="select-${option.id}" type="button" class="button button--primary">选这个</button>
      </div>
    `;

    const selectButton = article.querySelector(`[data-testid="select-${option.id}"]`);
    selectButton.addEventListener("click", () => {
      planDraft.selectedOptionId = option.id;
      planDraft.selectedTransportType = option.recommendedTransportType || option.transportPlans[0]?.type || null;
      planDraft.status = "selected";
      currentPlanDraft = savePlanDraft(planDraft);
      pendingDraft = currentPlanDraft;
      renderResults(currentPlanDraft);
      hydrateDraftRecovery(pendingDraft);
    });

    article.querySelectorAll("[data-pick-transport]").forEach((button) => {
      button.addEventListener("click", () => {
        planDraft.selectedOptionId = option.id;
        planDraft.selectedTransportType = button.dataset.transportType;
        planDraft.status = "selected";
        currentPlanDraft = savePlanDraft(planDraft);
        pendingDraft = currentPlanDraft;
        renderResults(currentPlanDraft);
        hydrateDraftRecovery(pendingDraft);
      });
    });

    optionStack.appendChild(article);
  });

  publishButton.disabled = !planDraft.selectedOptionId;
  if (!planDraft.selectedOptionId) {
    selectionBanner.innerHTML = "<p>先选一个方案，再发布成可分享页面。</p>";
    optionDiff.classList.add("is-hidden");
    optionDiff.innerHTML = "";
    return;
  }

  const selected = planDraft.options.find((option) => option.id === planDraft.selectedOptionId);
  const selectedTransport = selected.transportPlans.find((item) => item.type === planDraft.selectedTransportType) || selected.transportPlans[0];
  const exists = findPublishedTrip(planDraft.selectedOptionId);
  selectionBanner.innerHTML = `
    <p data-testid="selection-banner">已选择：${selected.title}</p>
    <span>交通：${transportLabel(selectedTransport.type)}。${exists ? "该方案此前已发布过，重新发布会覆盖到最新版本。" : "下一步可直接发布到分享页。"}</span>
  `;
  renderOptionDiff(planDraft, selected);
}

function renderSourceBrief(planDraft) {
  const holidayText = humanHolidayText(planDraft.sourceSignals?.holidaySummary);
  const weatherWindow = Array.isArray(planDraft.sourceSignals?.weatherWindow) ? planDraft.sourceSignals.weatherWindow : [];
  const weatherWindowHtml = weatherWindow.length
    ? weatherWindow
      .map(
        (item) =>
          `<p><strong>${item.date}</strong> <span class="weather-icon" aria-hidden="true">${weatherIconSvg(item.iconDay)}</span> ${item.textDay} ${item.tempMin}-${item.tempMax}°C</p>`,
      )
      .join("")
    : "<p><strong>天气明细：</strong>示例数据</p>";
  sourceBrief.innerHTML = `
    <p><strong>天气明细：</strong></p>
    ${weatherWindowHtml}
    <p><strong>出发日：</strong>${holidayText}</p>
  `;
  sourceBrief.classList.remove("is-hidden");
}

function renderLoadingState(message) {
  optionStack.innerHTML = `
    <article class="option-loading-card">
      <p class="option-loading-card__title">${message}</p>
      <p class="option-loading-card__line"></p>
      <p class="option-loading-card__line option-loading-card__line--short"></p>
    </article>
  `;
}

function normalizeBriefValue(value, fallback) {
  if (!value) {
    return fallback;
  }
  return String(value).replace(/^天气：|^节假日：/, "").trim() || fallback;
}

function humanHolidayText(value) {
  const normalized = normalizeBriefValue(value, "示例数据");
  if (normalized === "示例数据") {
    return normalized;
  }
  if (/周[一二三四五六日天]/.test(normalized)) {
    return `${normalized}，建议关注景点客流和排队时间`;
  }
  return normalized;
}

function renderTransportItem(transport, context) {
  const { isPrimary, isSelected, optionId } = context;
  const title = `${isPrimary ? "优先" : "备选"} · ${transportLabel(transport.type)}`;
  const providerBadge = renderProviderBadge(transport.sourceProvider);
  if (transport.type === "self-drive") {
    const distanceLine = transport.notes.find((note) => note.includes("实时路程")) || "实时路程待更新";
    const tollLine = transport.notes.find((note) => note.includes("高速费") || note.includes("免费")) || "高速费待更新";
    return `
      <strong>${title}</strong>
      <span>${transport.durationText}${providerBadge}</span>
      <div class="option-card__transport-detail">路线：${transport.routeText}</div>
      <div class="option-card__transport-detail">${distanceLine}</div>
      <div class="option-card__transport-detail">${tollLine}</div>
      <button type="button" class="button button--ghost transport-pick-button ${isSelected ? "is-selected" : ""}" aria-pressed="${isSelected ? "true" : "false"}" data-pick-transport="true" data-option-id="${optionId}" data-transport-type="${transport.type}">${isSelected ? "已选此交通" : "用这个交通"}</button>
    `;
  }

  if (transport.type === "high-speed-rail") {
    const trainLine = transport.notes.find((note) => note.includes("建议车次") || note.includes("未拿到高铁车次")) || "车次请按实际余票确认";
    return `
      <strong>${title}</strong>
      <span>${transport.durationText} / ${transport.costText}${providerBadge}</span>
      <div class="option-card__transport-detail">乘车：${transport.routeText}</div>
      <div class="option-card__transport-detail">${trainLine}</div>
      <button type="button" class="button button--ghost transport-pick-button ${isSelected ? "is-selected" : ""}" aria-pressed="${isSelected ? "true" : "false"}" data-pick-transport="true" data-option-id="${optionId}" data-transport-type="${transport.type}">${isSelected ? "已选此交通" : "用这个交通"}</button>
    `;
  }

  return `
    <strong>${title}</strong>
    <span>${transport.durationText} / ${transport.costText}${providerBadge}</span>
    <div class="option-card__transport-detail">航线：${transport.routeText}</div>
    <div class="option-card__transport-detail">${transport.notes[1] || "航班以实际为准"}</div>
    <button type="button" class="button button--ghost transport-pick-button ${isSelected ? "is-selected" : ""}" aria-pressed="${isSelected ? "true" : "false"}" data-pick-transport="true" data-option-id="${optionId}" data-transport-type="${transport.type}">${isSelected ? "已选此交通" : "用这个交通"}</button>
  `;
}

function renderProviderBadge(sourceProvider) {
  if (!sourceProvider) {
    return "";
  }
  if (String(sourceProvider).includes("amap")) {
    return ' <span class="transport-source-badge">🗺 高德实时</span>';
  }
  return "";
}

function flushUiFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function weatherIconSvg(iconCode) {
  const code = Number(iconCode);
  const shared = `viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"`;
  if (code >= 100 && code <= 103) {
    return `<svg ${shared}><circle cx="12" cy="12" r="4" fill="#F6C453"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17 4.9 19.1" stroke="#F6C453" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  }
  if (code === 104 || code === 150 || code === 151) {
    return `<svg ${shared}><path d="M7.5 18h9a4 4 0 1 0-.6-7.96A5 5 0 0 0 6 11.5 3.5 3.5 0 0 0 7.5 18Z" fill="#9FB2C8"/></svg>`;
  }
  if ((code >= 300 && code <= 399) || (code >= 456 && code <= 499)) {
    return `<svg ${shared}><path d="M7.5 14.5h9a4 4 0 1 0-.6-7.96A5 5 0 0 0 6 8a3.5 3.5 0 0 0 1.5 6.5Z" fill="#9FB2C8"/><path d="M9 17.5l-1 2M13 17.5l-1 2M17 17.5l-1 2" stroke="#6CB6FF" stroke-width="1.7" stroke-linecap="round"/></svg>`;
  }
  if (code >= 400 && code <= 409) {
    return `<svg ${shared}><path d="M7.5 13.5h9a4 4 0 1 0-.6-7.96A5 5 0 0 0 6 7a3.5 3.5 0 0 0 1.5 6.5Z" fill="#AFC4DA"/><path d="m9.5 16.5 1 1.3-1 1.2M12.8 16.2 14 17.8 12.8 19.3M16.2 16.5l1 1.3-1 1.2" stroke="#EAF4FF" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  if (code >= 500 && code <= 515) {
    return `<svg ${shared}><path d="M5 18h14" stroke="#BBD0E5" stroke-width="2" stroke-linecap="round"/><path d="M7 14h10M9 10h6" stroke="#BBD0E5" stroke-width="2" stroke-linecap="round"/></svg>`;
  }
  if (code >= 200 && code <= 213) {
    return `<svg ${shared}><path d="M4 9h10M6 13h12M4 17h8" stroke="#9CC6DE" stroke-width="2" stroke-linecap="round"/><path d="m15 8 2 1.5L15 11M17 12l2 1.5-2 1.5M13 16l2 1.5-2 1.5" stroke="#9CC6DE" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  return `<svg ${shared}><circle cx="12" cy="12" r="4" fill="#F6C453"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#F6C453" stroke-width="1.6" stroke-linecap="round"/></svg>`;
}

function renderOptionDiff(planDraft, selected) {
  const alternatives = planDraft.options
    .filter((option) => option.id !== selected.id)
    .sort((a, b) => b.fitScore - a.fitScore);
  if (!alternatives.length) {
    optionDiff.classList.add("is-hidden");
    optionDiff.innerHTML = "";
    return;
  }

  const compare = alternatives[0];
  const scoreDiff = Math.round((selected.fitScore - compare.fitScore) * 100);
  const scoreText = scoreDiff >= 0 ? `匹配度高 ${scoreDiff}%` : `匹配度低 ${Math.abs(scoreDiff)}%`;
  const transportText =
    selected.transportPlans[0].type === compare.transportPlans[0].type
      ? "交通方案与次优方案一致"
      : `交通偏向从 ${transportLabel(compare.transportPlans[0].type)} 调整为 ${transportLabel(selected.transportPlans[0].type)}`;
  optionDiff.innerHTML = `
    <p><strong>差异提示：</strong>${scoreText}，${transportText}。</p>
  `;
  optionDiff.classList.remove("is-hidden");
}

function transportLabel(value) {
  return {
    "high-speed-rail": "高铁",
    "self-drive": "自驾",
    flight: "飞机",
  }[value] || value;
}
