"use client";

import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import type {
  SongHistoryResult,
  SongSearchField,
  SongSortField,
} from "@/types";
import { SongBrowserPage } from "../song-browser-page";
import { useSongData } from "../use-song-data";

export default function SongHistoryPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [advancedSearch, setAdvancedSearch] = useState(false);
  const [submittedAdvancedSearch, setSubmittedAdvancedSearch] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchField, setSearchField] = useState<SongSearchField>("song");
  const [submittedSearchField, setSubmittedSearchField] =
    useState<SongSearchField>("song");
  const [sortField, setSortField] = useState<SongSortField>("time");
  const [page, setPage] = useState(1);
  const params: URLSearchParams = new URLSearchParams({ page: String(page) });
  if (submittedQuery) params.set("q", submittedQuery);
  if (submittedAdvancedSearch) params.set("regex", "1");
  params.set("field", submittedSearchField);
  params.set("sort", sortField);
  const {
    data: result,
    error,
    retry,
  } = useSongData<SongHistoryResult>(
    `/api/songs/history?${params}`,
    "Could not load song history.",
  );

  const start: number = result?.total
    ? (result.page - 1) * result.pageSize + 1
    : 0;
  const end: number = result
    ? Math.min(result.page * result.pageSize, result.total)
    : 0;

  const updateQuery = (nextQuery: string): void => {
    setQuery(nextQuery);
    if (!nextQuery) {
      setSubmittedQuery("");
      setSubmittedAdvancedSearch(false);
      setSearchError(null);
      setPage(1);
    }
  };

  const search = (): void => {
    if (advancedSearch) {
      try {
        void new RegExp(query, "i");
      } catch {
        setSearchError("That regular expression is not valid yet.");
        return;
      }
    }
    setSearchError(null);
    setPage(1);
    setSubmittedQuery(query.trim());
    setSubmittedAdvancedSearch(advancedSearch);
    setSubmittedSearchField(searchField);
  };

  const countLabel: string | null = result
    ? `${submittedQuery ? `${result.total} matches` : `${result.total} songs`} · Showing ${start}–${end}`
    : null;

  const pagination: ReactNode =
    result && result.pageCount > 1 ? (
      <nav
        className="mt-6 flex items-center justify-between gap-4"
        aria-label="History pages"
      >
        <Button
          variant="outline"
          disabled={result.page === 1}
          onClick={() => setPage((current) => current - 1)}
        >
          Previous
        </Button>
        <p className="text-sm text-stone-500">
          Page {result.page} of {result.pageCount}
        </p>
        <Button
          variant="outline"
          disabled={result.page === result.pageCount}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </Button>
      </nav>
    ) : null;

  return (
    <SongBrowserPage
      scope="history"
      songs={result?.songs ?? null}
      query={query}
      onQueryChange={updateQuery}
      onSearch={search}
      advancedSearch={advancedSearch}
      onAdvancedSearchChange={(advanced) => {
        setAdvancedSearch(advanced);
        setSearchError(null);
      }}
      searchError={searchError}
      searchField={searchField}
      onSearchFieldChange={(field) => {
        setSearchField(field);
        setSearchError(null);
      }}
      sortField={sortField}
      onSortFieldChange={(field) => {
        setSortField(field);
        setPage(1);
      }}
      showClear={Boolean(submittedQuery)}
      countLabel={countLabel}
      error={error}
      onRetry={retry}
      emptyTitle="No songs found"
      emptyDescription={`No songs in history match “${submittedQuery}”.`}
      footer={pagination}
    />
  );
}
