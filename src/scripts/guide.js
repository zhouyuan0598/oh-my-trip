import { findPublishedTrip } from "../data/planner.js";

const app = document.querySelector("#guide-app");
const baseUrl = import.meta.env.BASE_URL || "/";
const url = new URL(window.location.href);
const slug = url.searchParams.get("trip") || window.location.pathname.split("/").filter(Boolean).at(-1);
const trip = findPublishedTrip(slug);

if (!trip) {
  app.innerHTML = `
    <section class="guide-empty">
      <p>未找到这个目的地。</p>
      <a href="${baseUrl}">返回 oh-my-trip</a>
    </section>
  `;
} else {
  document.title = `${trip.city} | oh-my-trip`;

  app.innerHTML = `
    <header class="guide-hero" style="--guide-cover:url('${trip.coverImage}')">
      <div class="guide-hero__veil"></div>
      <a class="guide-back" href="${baseUrl}">返回合集</a>
      <div class="guide-hero__content">
        <p class="eyebrow">${trip.theme}</p>
        <h1>${trip.title}</h1>
        <p class="guide-hero__subtitle">${trip.subtitle}</p>
        <div class="guide-hero__meta">
          <span>${trip.dateRange}</span>
          <span>${trip.route}</span>
          <span>${trip.companion}</span>
          <span>${trip.stay}</span>
        </div>
      </div>
    </header>

    <section class="guide-section">
      <div class="guide-section__heading">
        <p class="eyebrow">Overview</p>
        <h2>行程概览</h2>
      </div>
      <div class="overview-list">
        ${trip.overview
          .map(
            (item) => `
            <article class="overview-card">
              <span class="overview-card__day">${item.day}</span>
              <div>
                <p class="overview-card__date">${item.date}</p>
                <p>${item.summary}</p>
              </div>
            </article>
          `,
          )
          .join("")}
      </div>
    </section>

    ${trip.days
      .map(
        (day, index) => `
        <section class="guide-section ${index % 2 === 1 ? "guide-section--alt" : ""}">
          <div class="guide-section__heading">
            <p class="eyebrow">Day ${day.number}</p>
            <h2>${day.title}</h2>
            <p class="guide-section__subtitle">${day.subtitle}</p>
          </div>
          <div class="entry-stack">
            ${day.entries.map(renderEntry).join("")}
          </div>
        </section>
      `,
      )
      .join("")}

    <section class="guide-section guide-section--notes">
      <div class="guide-section__heading">
        <p class="eyebrow">Trip notes</p>
        <h2>这趟行程为什么像你</h2>
      </div>
      <div class="notes-panel">
        ${trip.travelNotes.map((note) => `<p>${note}</p>`).join("")}
      </div>
    </section>

    ${renderPlanningSummary(trip)}
  `;
}

function renderEntry(entry) {
  if (entry.type === "schedule") {
    return `
      <article class="schedule-row">
        <span class="schedule-row__time">${entry.time}</span>
        <div class="schedule-row__body">
          <h3>${entry.title}</h3>
          <p>${entry.detail}</p>
        </div>
      </article>
    `;
  }

  return `
    <article class="spot-card ${entry.featured ? "spot-card--featured" : ""}">
      <div class="spot-card__image">
        <img src="${entry.image}" alt="${entry.title}" loading="lazy">
      </div>
      <div class="spot-card__body">
        <h3>${entry.title}</h3>
        <p class="spot-card__description">${entry.description}</p>
        <div class="spot-card__meta">
          ${(entry.meta || []).map((item) => `<span>${item}</span>`).join("")}
        </div>
        <ul class="spot-card__list">
          ${(entry.bullets || []).map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </div>
    </article>
  `;
}

function renderPlanningSummary(trip) {
  if (!trip.planningSummary) {
    return "";
  }

  return `
    <section class="guide-section guide-section--planning">
      <div class="guide-section__heading">
        <p class="eyebrow">Planning summary</p>
        <h2>决策摘要与偏好证据</h2>
        <p class="guide-section__subtitle">这部分说明为什么系统给出当前路线，以及哪些信息仍需要出发前自行核实。</p>
      </div>
      <div class="planning-grid">
        <article class="planning-card">
          <h3>交通与住宿决策</h3>
          <p>推荐交通：${trip.planningSummary.chosenTransport}</p>
          <p>备选交通：${trip.planningSummary.rejectedTransport.join("、") || "无"}</p>
          <p>住宿区域：${trip.planningSummary.stayArea}</p>
          <p>风险偏好：${trip.planningSummary.riskPreference}</p>
        </article>
        <article class="planning-card">
          <h3>使用过的偏好信号</h3>
          <div class="planning-chip-list">
            ${trip.preferenceSignalsUsed.map((signal) => `<span>${signal}</span>`).join("")}
          </div>
        </article>
        <article class="planning-card planning-card--wide">
          <h3>数据来源与时效性</h3>
          <ul class="planning-source-list">
            ${Object.entries(trip.planningSummary.dataSourceMeta)
              .map(
                ([key, value]) => `
                  <li>
                    <strong>${key}</strong>
                    <span>${value.source}</span>
                    <span>${new Date(value.timestamp).toLocaleString("zh-CN")}</span>
                  </li>
                `,
              )
              .join("")}
          </ul>
          <p>当前页面为 MVP 示例链路，景区开放状态、实时价格和天气仍需出行前再次核实。</p>
        </article>
      </div>
    </section>
  `;
}
