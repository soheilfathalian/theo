import type { Category } from "./problems";

export interface ServiceProvider {
  id: string;
  name: string;
  category: Category;
  email: string;
  rating: number;
  phone: string;
  /** Pre-onboarded Stripe Connect Express account ID, hardcoded for demo */
  stripe_account_id: string;
}

/**
 * Real Berlin Handwerker names (Google lookup for credibility).
 * All emails route to the single shared demo inbox for the hackathon.
 */
export const SERVICE_PROVIDERS: ServiceProvider[] = [
  // ─── Sanitär ───
  {
    id: "sp-hsu",
    name: "HSU – Heizung, Sanitär, Umwelt",
    category: "Sanitär",
    email: "theo-demo+sanitaer-1@hallotheo.example",
    rating: 4.7,
    phone: "+49 30 65795463",
    stripe_account_id: "acct_demo_san_001",
  },
  {
    id: "sp-koenig",
    name: "Frank König GmbH",
    category: "Sanitär",
    email: "theo-demo+sanitaer-2@hallotheo.example",
    rating: 4.5,
    phone: "+49 30 2911002",
    stripe_account_id: "acct_demo_san_002",
  },
  {
    id: "sp-boettcher",
    name: "Firma Böttcher",
    category: "Sanitär",
    email: "theo-demo+sanitaer-3@hallotheo.example",
    rating: 4.3,
    phone: "+49 30 4458169",
    stripe_account_id: "acct_demo_san_003",
  },
  // ─── Heizung ───
  {
    id: "sp-schwalm",
    name: "Schwalm Heizung & Sanitär GmbH",
    category: "Heizung",
    email: "theo-demo+heizung-1@hallotheo.example",
    rating: 4.8,
    phone: "+49 30 99999991",
    stripe_account_id: "acct_demo_hzg_001",
  },
  {
    id: "sp-haffner",
    name: "Stephan Haffner GmbH",
    category: "Heizung",
    email: "theo-demo+heizung-2@hallotheo.example",
    rating: 4.6,
    phone: "+49 30 35137830",
    stripe_account_id: "acct_demo_hzg_002",
  },
  {
    id: "sp-nau",
    name: "Nau Heizung & Sanitär GmbH",
    category: "Heizung",
    email: "theo-demo+heizung-3@hallotheo.example",
    rating: 4.4,
    phone: "+49 30 7715020",
    stripe_account_id: "acct_demo_hzg_003",
  },
];

export function pickBestVendor(category: Category): ServiceProvider {
  return SERVICE_PROVIDERS
    .filter((v) => v.category === category)
    .sort((a, b) => b.rating - a.rating)[0];
}
