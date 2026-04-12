"use client";

import { useState } from "react";
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

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="category_id" value={categoryId} />
      <input type="hidden" name="selection" value={selection} />
      <div className="max-h-[56vh] space-y-3 overflow-y-auto pr-1">
        {(groupedItems ?? [["All nominees", items]]).map(([brandName, brandItems]) => (
          <div key={brandName} className="space-y-2">
            {groupedItems ? (
              <div className="sticky top-0 rounded-2xl bg-[color:var(--card-strong)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
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
      <SubmitButton pendingLabel="Submitting vote...">Submit vote</SubmitButton>
    </form>
  );
}
