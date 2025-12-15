import { vendorSeedData } from "./seed/vendors";

// Curated = services Prism should consider for onboarding detection + matching.
// This is derived from the seed data so production DB drift (old dynamically-created vendors)
// won't pollute onboarding or dashboards.
export const CURATED_VENDOR_SLUGS = vendorSeedData.map((v) => v.slug);
