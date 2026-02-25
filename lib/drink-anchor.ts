function slugifyName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function getDrinkAnchorId(name: string) {
  return slugifyName(name) || "drink";
}

export function getBarSlug(name: string) {
  return slugifyName(name) || "bar";
}
