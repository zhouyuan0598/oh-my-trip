import { getPublishedTrips, loadPreferenceProfile, signalToHumanLabel } from "../data/planner.js";
import { travelProfile } from "../data/trips.js";

const profileChips = document.querySelector("#profile-chips");
const manifestoGrid = document.querySelector("#manifesto-grid");
const tripGrid = document.querySelector("#trip-grid");
const preferenceProfile = loadPreferenceProfile();
const publishedTrips = getPublishedTrips();

travelProfile.headline.forEach((item) => {
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.textContent = item;
  profileChips.appendChild(chip);
});

preferenceProfile.stableSignals.interestBias.slice(0, 2).forEach((item) => {
  const chip = document.createElement("span");
  chip.className = "chip chip--mint";
  chip.textContent = `已学习偏好：${signalToHumanLabel(item)}`;
  profileChips.appendChild(chip);
});

travelProfile.manifesto.forEach((item) => {
  const article = document.createElement("article");
  article.className = "manifesto-card";
  article.innerHTML = `
    <h3>${item.title}</h3>
    <p>${item.description}</p>
  `;
  manifestoGrid.appendChild(article);
});

publishedTrips.forEach((trip) => {
  const card = document.createElement("article");
  card.className = "trip-card";
  const guideLink = trip.guidePath || `/guides/${trip.slug}/`;
  card.innerHTML = `
    <div class="trip-card__image">
      <img src="${trip.coverImage}" alt="${trip.city}" loading="lazy">
    </div>
    <div class="trip-card__body">
      <div class="trip-card__meta">
        <span>${trip.duration}</span>
        <span>${trip.theme}</span>
        <span>${trip.generatedFromMvp ? "规划生成" : "历史作品"}</span>
      </div>
      <h3>${trip.title}</h3>
      <p>${trip.cardSummary}</p>
      <div class="trip-card__tags">
        ${trip.highlights.map((tag) => `<span>${tag}</span>`).join("")}
      </div>
      <a class="trip-card__link" href="${guideLink}" data-testid="trip-link-${trip.slug}">进入这趟旅程</a>
    </div>
  `;
  tripGrid.appendChild(card);
});
