"use client";

import { useMemo, useState } from "react";
import { NomineeVoteForm } from "@/components/nominee-vote-form";

type NomineeRow = {
  id: string;
  nomineeType: "brand" | "perfume";
  label: string;
  brandName: string;
  perfumeName: string | null;
};

export function NomineeBrowser({
  categoryId,
  items,
  action
}: {
  categoryId: string;
  items: NomineeRow[];
  action: (formData: FormData) => void;
}) {
  const [query, setQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const brands = useMemo(
    () => ["all", ...Array.from(new Set(items.map((item) => item.brandName))).sort((a, b) => a.localeCompare(b))],
    [items]
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesQuery =
        !query.trim() ||
        `${item.brandName} ${item.perfumeName ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
      const matchesBrand = brandFilter === "all" || item.brandName === brandFilter;
      return matchesQuery && matchesBrand;
    });
  }, [brandFilter, items, query]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, NomineeRow[]>();
    for (const item of filteredItems) {
      const group = groups.get(item.brandName) ?? [];
      group.push(item);
      groups.set(item.brandName, group);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredItems]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr,180px]">
        <input
          className="field"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search perfume or brand"
        />
        <select className="field" value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)}>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand === "all" ? "All brands" : brand}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl bg-white/50 px-4 py-3 text-sm text-[color:var(--muted)]">
        {filteredItems.length} nominees shown
      </div>

      {filteredItems.length ? (
        <NomineeVoteForm categoryId={categoryId} items={filteredItems} groupedItems={groupedItems} action={action} />
      ) : (
        <div className="rounded-2xl border border-[color:var(--border)] bg-white/75 px-4 py-6 text-sm text-[color:var(--muted)]">
          No nominees match that search or brand filter.
        </div>
      )}
    </div>
  );
}
