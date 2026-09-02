export type ToolkitInfo = {
  slug: string;
  name: string;
  category: string;
};

export const TOOLKIT_CATALOG: ToolkitInfo[] = [
  { slug: "metaads", name: "Meta Ads", category: "Ad platforms" },
  { slug: "googleads", name: "Google Ads", category: "Ad platforms" },
  { slug: "linkedin", name: "LinkedIn", category: "Social" },
  { slug: "twitter", name: "X (Twitter)", category: "Social" },
  { slug: "instagram", name: "Instagram", category: "Social" },
  { slug: "facebook", name: "Facebook", category: "Social" },
  { slug: "youtube", name: "YouTube", category: "Social" },
  { slug: "reddit", name: "Reddit", category: "Social" },
  { slug: "gmail", name: "Gmail", category: "Email & comms" },
  { slug: "outlook", name: "Outlook", category: "Email & comms" },
  { slug: "slack", name: "Slack", category: "Email & comms" },
  { slug: "microsoft_teams", name: "Microsoft Teams", category: "Email & comms" },
  { slug: "whatsapp", name: "WhatsApp", category: "Email & comms" },
  { slug: "hubspot", name: "HubSpot", category: "CRM" },
  { slug: "salesforce", name: "Salesforce", category: "CRM" },
  { slug: "attio", name: "Attio", category: "CRM" },
  { slug: "apollo", name: "Apollo", category: "CRM" },
  { slug: "googlesheets", name: "Google Sheets", category: "Docs & data" },
  { slug: "googledocs", name: "Google Docs", category: "Docs & data" },
  { slug: "googleslides", name: "Google Slides", category: "Docs & data" },
  { slug: "googledrive", name: "Google Drive", category: "Docs & data" },
  { slug: "googlecalendar", name: "Google Calendar", category: "Docs & data" },
  { slug: "notion", name: "Notion", category: "Docs & data" },
  { slug: "airtable", name: "Airtable", category: "Docs & data" },
  { slug: "excel", name: "Excel", category: "Docs & data" },
];

export const DEFAULT_ENABLED_TOOLKITS = [
  "metaads",
  "googleads",
  "gmail",
  "googlesheets",
  "notion",
];

const SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const MAX_TOOLKITS = 30;

export function sanitizeToolkitSelection(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (result.length >= MAX_TOOLKITS) break;
    if (typeof item !== "string") continue;
    const slug = item.trim().toLowerCase();
    if (!SLUG_PATTERN.test(slug) || seen.has(slug)) continue;
    seen.add(slug);
    result.push(slug);
  }
  return result;
}

export function effectiveToolkitSelection(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_ENABLED_TOOLKITS];
  return sanitizeToolkitSelection(value);
}
