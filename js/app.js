import {
  renderHero,
  renderMetrics,
  renderAbout,
  renderMyths,
  renderFaq,
  renderFooter,
} from "./ui/sections.js";

renderHero(document.querySelector("#hero"));
renderMetrics(document.querySelector("#facts"));
renderAbout(document.querySelector("#about"));
renderMyths(document.querySelector("#myths"));
renderFaq(document.querySelector("#faq"));
renderFooter(document.querySelector("#footer"));
