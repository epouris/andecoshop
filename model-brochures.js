/**
 * Whitelisted public model HTML pages for admin PDF brochure generation.
 * Only these paths can be rendered server-side (avoids open redirect / SSRF).
 */
const MODEL_BROCHURE_PAGES = [
  { slug: 'olympic-ribs-30sr', label: 'OLR 30SR', path: '/olympic-ribs-30sr.html' },
  { slug: 'olympic-ribs-40sr', label: 'OLR 40SR', path: '/olympic-ribs-40sr.html' },
  { slug: 'olympic-ribs-40src', label: 'OLR 40SRC', path: '/olympic-ribs-40src.html' },
  { slug: 'olympic-ribs-45src', label: 'OLR 45SRC', path: '/olympic-ribs-45src.html' },
  { slug: 'olympic-ribs-430-captain-hook', label: 'OLR 430 Captain Hook', path: '/olympic-ribs-430-captain-hook.html' },
  { slug: 'olympic-ribs-499-star', label: 'OLR 499 Star', path: '/olympic-ribs-499-star.html' },
  { slug: 'olympic-ribs-500-pro', label: 'OLR 500 Pro', path: '/olympic-ribs-500-pro.html' },
  { slug: 'olympic-ribs-585-speedster', label: 'OLR 585 Speedster', path: '/olympic-ribs-585-speedster.html' },
  { slug: 'olympic-ribs-720-cruiser', label: 'OLR 720 Cruiser', path: '/olympic-ribs-720-cruiser.html' },
];

function getBrochurePageBySlug(slug) {
  return MODEL_BROCHURE_PAGES.find((p) => p.slug === slug) || null;
}

module.exports = {
  MODEL_BROCHURE_PAGES,
  getBrochurePageBySlug,
};
