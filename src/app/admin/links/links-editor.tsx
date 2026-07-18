"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ExtraLink = { label: string; url: string };
type EditableLink = ExtraLink & { id: string };

export function LinksEditor({ extraLinks }: { extraLinks: Array<ExtraLink> }) {
  const [links, setLinks] = useState<Array<EditableLink>>(() =>
    extraLinks.map((link, index) => ({
      ...link,
      id: `saved-${index}-${link.url}`,
    })),
  );

  function addLink(): void {
    setLinks((current) => [
      ...current,
      { id: crypto.randomUUID(), label: "", url: "" },
    ]);
  }

  function removeLink(index: number): void {
    setLinks((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function updateLink(
    index: number,
    field: keyof ExtraLink,
    value: string,
  ): void {
    setLinks((current) =>
      current.map((link, itemIndex) =>
        itemIndex === index ? { ...link, [field]: value } : link,
      ),
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-stone-950">Additional links</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add any other useful destinations. They appear in a compact list
            below the featured cards.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={addLink}>
          <Plus /> Add link
        </Button>
      </div>
      {links.length ? (
        <div className="grid gap-3">
          {links.map((link, index) => (
            <div
              key={link.id}
              className="grid gap-3 rounded-xl border bg-stone-50/60 p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
            >
              <div className="grid gap-2">
                <Label htmlFor={`extra-label-${index}`}>Link name</Label>
                <Input
                  id={`extra-label-${index}`}
                  name="extra_label"
                  required
                  value={link.label}
                  onChange={(event) =>
                    updateLink(index, "label", event.target.value)
                  }
                  placeholder="Discord server"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`extra-url-${index}`}>URL</Label>
                <Input
                  id={`extra-url-${index}`}
                  name="extra_url"
                  type="url"
                  required
                  value={link.url}
                  onChange={(event) =>
                    updateLink(index, "url", event.target.value)
                  }
                  placeholder="https://…"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${link.label || "link"}`}
                onClick={() => removeLink(index)}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed px-5 py-8 text-center text-sm text-muted-foreground">
          No additional links yet.
        </div>
      )}
    </div>
  );
}
