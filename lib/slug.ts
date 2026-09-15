export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

// Appends a short random suffix until the slug is free. Used wherever a Card
// slug is derived from a name rather than typed by hand (manual admin
// creation, and PLAN.md Fase 4's auto-spawned project/company/personal
// cards), since names collide far more often than deliberately chosen slugs.
export async function uniqueSlug(
  base: string,
  isTaken: (slug: string) => Promise<boolean>
) {
  let slug = base || "card";
  while (await isTaken(slug)) {
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return slug;
}
