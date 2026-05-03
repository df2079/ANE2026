"use client";

import { useMemo, useState } from "react";
import { SubmitButton } from "@/components/submit-button";

type NomineeRow = {
  id: string;
  nomineeType: "brand" | "perfume";
  brandName: string;
  perfumeName: string | null;
};

export function NomineeVoteForm({
  categoryId,
  items,
  groupedItems,
  action
}: {
  categoryId: string;
  items: NomineeRow[];
  groupedItems?: [string, NomineeRow[]][];
  action: (formData: FormData) => void;
}) {
  const [selection, setSelection] = useState("");
  const selectedItem = useMemo(() => {
    return items.find((item) => `${item.nomineeType}:${item.id}` === selection) ?? null;
  }, [items, selection]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="category_id" value={categoryId} />
      <input type="hidden" name="selection" value={selection} />
      <div className="space-y-3 pb-24">
        {(groupedItems ?? [["All nominees", items]]).map(([brandName, brandItems]) => (
          <div key={brandName} className="space-y-2">
            {groupedItems ? (
              <div className="rounded-2xl bg-[color:var(--card-strong)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                {brandName}
              </div>
            ) : null}
            {brandItems.map((item) => {
              const radioValue = `${item.nomineeType}:${item.id}`;
              return (
                <label
                  key={item.id}
                  className="flex cursor-pointer gap-3 rounded-2xl border border-[color:var(--border)] bg-white/75 p-4"
                >
                  <input
                    type="radio"
                    name="selection_visual"
                    value={radioValue}
                    checked={selection === radioValue}
                    onChange={() => setSelection(radioValue)}
                    required
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">{item.perfumeName ?? item.brandName}</div>
                    {item.perfumeName ? (
                      <div className="mt-1 text-sm text-[color:var(--muted)]">{item.brandName}</div>
                    ) : null}
                  </div>
                </label>
              );
            })}
          </div>
        ))}
      </div>
      <div className="sticky bottom-3 z-20 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/95 p-3 shadow-[0_18px_45px_rgba(34,31,29,0.16)] backdrop-blur">
        {selectedItem ? (
          <p className="mb-2 text-xs font-medium text-[color:var(--muted)]">
            Selected:{" "}
            <span className="text-[color:var(--foreground)]">{selectedItem.perfumeName ?? selectedItem.brandName}</span>
          </p>
        ) : (
          <p className="mb-2 text-xs font-medium text-[color:var(--muted)]">Choose a nominee to submit your vote.</p>
        )}
        <SubmitButton pendingLabel="Submitting vote..." disabled={!selection}>
          Submit vote
        </SubmitButton>
      </div>
    </form>
  );
}
