
import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Loader2,
  Send,
  Clock,
  CheckCircle2,
  Ban,
  Search,
  Sparkles,
  X,
  Store,
} from "lucide-react";
import { Link } from "react-router-dom";
import apiClient from "../../api/client";
import { bookImageUrl } from "../../api/bookService";
import userService from "../../api/userService";
import bookRequestService from "../../api/bookRequestService";
import { useToast } from "../../context/ToastContext";
import { TablePagination, TableSearch } from "../common/TableControls";
import Select from "../common/Select";

function Cover({ book }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [book.bookImg]);

  return (
    <div className="h-52 bg-slate-800/60 border-b border-slate-800 flex items-center justify-center p-5">
      {book.bookImg && !failed ? (
        <img
          src={bookImageUrl(book.bookImg)}
          alt={`${book.title} cover`}
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      ) : (
        <BookOpen
          aria-hidden="true"
          className="w-16 h-16 text-slate-600"
        />
      )}
    </div>
  );
}

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return `${String(date.getDate()).padStart(2, "0")}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${date.getFullYear()}`;
};

const statusColors = {
  Pending: "text-amber-400 bg-amber-500/10",
  Approved: "text-green-400 bg-green-500/10",
  Rejected: "text-red-400 bg-red-500/10",
  Cancelled: "text-slate-400 bg-slate-700",
  Fulfilled: "text-blue-400 bg-blue-500/10",
};

export default function BookCatalog() {
  const toast = useToast();

  const [books, setBooks] = useState([]);
  const [renterListings, setRenterListings] = useState([]);
  const [renterListingsError, setRenterListingsError] = useState("");
  const [myRequests, setMyRequests] = useState([]);
  const [myRentalRequests, setMyRentalRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const [requestingId, setRequestingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [sortBy, setSortBy] = useState("title");
  const [collectionTab, setCollectionTab] = useState("all");
  const [requestSearch, setRequestSearch] = useState("");
  const [requestPage, setRequestPage] = useState(1);
  const [requestLimit, setRequestLimit] = useState(10);
  const [requestPagination, setRequestPagination] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [booksResponse, requestsResponse, renterResponse, rentalRequestsResponse] =
          await Promise.all([
            apiClient.get("/catalog/books"),
            bookRequestService.getMyRequests({ page: requestPage, limit: requestLimit, search: requestSearch }),
            userService.getApprovedRenterListings({ limit: 100 }),
            userService.getMyRentalRequests(),
          ]);

        if (!active) return;

        setBooks(booksResponse.data.books || []);
        setRenterListings(renterResponse.listings || []);
        setRenterListingsError("");
        setMyRequests(requestsResponse.requests || []);
        setMyRentalRequests(rentalRequestsResponse.requests || []);
        setRequestPagination(requestsResponse.pagination || { total: (requestsResponse.requests || []).length, totalPages: 1 });
      } catch (err) {
        if (active) {
          setRenterListingsError(err.message || "Unable to load community listings.");
          setError(
            err.status === 404
              ? "Books are temporarily unavailable. Please try again."
              : err.message || "Unable to load books."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [reload, requestPage, requestLimit, requestSearch]);

  const refreshRequests = async () => {
    const [result, rentalResult] = await Promise.all([
      bookRequestService.getMyRequests({ page: requestPage, limit: requestLimit, search: requestSearch }),
      userService.getMyRentalRequests(),
    ]);
    setMyRequests(result.requests || []);
    setMyRentalRequests(rentalResult.requests || []);
    setRequestPagination(result.pagination || { total: (result.requests || []).length, totalPages: 1 });
  };

  const handleRequest = async (bookId) => {
    if (requestingId !== null) return;

    setRequestingId(bookId);

    try {
      const result =
        await bookRequestService.createRequest(bookId);

      toast.success(
        result.message || "Book requested successfully"
      );

      await refreshRequests();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to request book"
      );

      // Refresh status after a possible duplicate request.
      try {
        await refreshRequests();
      } catch (refreshError) {
        console.error(refreshError);
      }
    } finally {
      setRequestingId(null);
    }
  };

  const handleCancel = async (requestId) => {
    setCancellingId(requestId);

    try {
      const result =
        await bookRequestService.cancelRequest(requestId);

      toast.success(
        result.message || "Request cancelled successfully"
      );

      await refreshRequests();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Unable to cancel request"
      );
    } finally {
      setCancellingId(null);
    }
  };

  const getActiveRequest = (bookId) =>
    myRequests.find(
      (request) =>
        Number(request.bookId) === Number(bookId) &&
        ["Pending", "Approved"].includes(request.status)
    );

  const activeCount = myRequests.filter((request) =>
    ["Pending", "Approved"].includes(request.status)
  ).length + myRentalRequests.filter((request) =>
    ["pending", "approved", "active"].includes(request.status)
  ).length;

  const categories = [...new Set([...books.map((book) => book.category?.title), ...renterListings.map((listing) => listing.categoryName)].filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredRenterListings = renterListings.filter((listing) => {
    const matchesSearch = !normalizedSearch || [listing.title, listing.authorName, listing.isbn, listing.categoryName].some((value) => String(value || "").toLocaleLowerCase().includes(normalizedSearch));
    const matchesCategory = categoryFilter === "all" || String(listing.categoryName || "").toLocaleLowerCase() === categoryFilter.toLocaleLowerCase();
    const matchesAvailability = availability === "all" || (availability === "available" ? Number(listing.copyCount) > 0 : Number(listing.copyCount) <= 0);
    return matchesSearch && matchesCategory && matchesAvailability;
  }).sort((a, b) => sortBy === "author" ? a.authorName.localeCompare(b.authorName) : a.title.localeCompare(b.title));
  const filteredBooks = books.filter((book) => {
    const matchesSearch = !normalizedSearch || [book.title, book.author?.name, book.isbn, book.publisher, book.category?.title].some((value) => String(value || "").toLocaleLowerCase().includes(normalizedSearch));
    const matchesCategory = categoryFilter === "all" || book.category?.title === categoryFilter;
    const matchesAvailability = availability === "all" || (availability === "available" ? Number(book.noofcopies) > 0 : Number(book.noofcopies) === 0);
    return matchesSearch && matchesCategory && matchesAvailability;
  }).sort((a, b) => {
    if (sortBy === "author") return (a.author?.name || "").localeCompare(b.author?.name || "");
    if (sortBy === "year") return Number(b.publishedYear || 0) - Number(a.publishedYear || 0);
    return (a.title || "").localeCompare(b.title || "");
  });

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-8">
      <section className="catalog-hero relative overflow-hidden rounded-3xl border border-indigo-300/10 p-6 sm:p-8 lg:p-10">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/15 bg-indigo-300/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-200"><Sparkles className="h-3.5 w-3.5" /> Your next chapter starts here</div>
            <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight text-white">Find a book worth <span className="text-indigo-300">getting lost in.</span></h2>
            <p className="mt-3 max-w-xl text-sm sm:text-base leading-relaxed text-slate-300">Search the shelves by title, author or ISBN, then request your next read in a couple of clicks.</p>
          </div>
          <div className="flex items-center gap-3 self-start lg:self-auto rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400/15 text-indigo-200"><BookOpen className="h-5 w-5" /></div>
            <div><p className="text-xl font-bold text-white">{books.length}</p><p className="text-xs text-slate-400">books to explore</p></div>
          </div>
        </div>
        <div className="catalog-orbit catalog-orbit-one" aria-hidden="true" /><div className="catalog-orbit catalog-orbit-two" aria-hidden="true" />
      </section>



      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${collectionTab === "renters" ? "hidden" : ""}`}>
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">The collection</p><h2 className="mt-1 text-2xl font-bold text-white tracking-tight">Browse the shelves</h2></div>

        <button
          type="button"
          onClick={() => setShowMyRequests((prev) => !prev)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-medium"
        >
          <BookOpen className="w-4 h-4" />
          My Requests
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs">
            {activeCount}
          </span>
        </button>
      </div>

      <section aria-label="Book filters" className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 sm:p-5 shadow-lg shadow-black/10">
        <div role="tablist" aria-label="Book collections" className="mb-4 flex flex-wrap gap-2">
          {[['all', 'All Books'], ['library', 'Library Books'], ['renters', 'Books from Renters']].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={collectionTab === value} onClick={() => setCollectionTab(value)} className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${collectionTab === value ? "bg-indigo-600 text-white" : "border border-slate-700 bg-slate-950/50 text-slate-300 hover:bg-slate-800"}`}>{label}</button>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.6fr)_minmax(160px,1fr)_minmax(160px,1fr)_minmax(160px,1fr)] gap-3">
          <label className="relative block"><span className="sr-only">Search books</span><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title, author, ISBN..." className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20" />{search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>}</label>
          <Select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="!rounded-xl !py-3" options={[{ value: "all", label: "All categories" }, ...categories.map((category) => ({ value: category, label: category }))]} />
          <Select aria-label="Filter by availability" value={availability} onChange={(event) => setAvailability(event.target.value)} className="!rounded-xl !py-3" options={[{ value: "all", label: "Any availability" }, { value: "available", label: "Available to request" }, { value: "unavailable", label: "Currently unavailable" }]} />
          <Select aria-label="Sort books" value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="!rounded-xl !py-3" options={[{ value: "title", label: "Sort: title" }, { value: "author", label: "Sort: author" }, { value: "year", label: "Sort: newest year" }]} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3 text-xs"><p className="text-slate-400">Results: <span className="font-semibold text-white">{filteredBooks.length}</span> library books · <span className="font-semibold text-white">{filteredRenterListings.length}</span> renter books</p>{(search || categoryFilter !== "all" || availability !== "all") && <button type="button" onClick={() => { setSearch(""); setCategoryFilter("all"); setAvailability("all"); }} className="font-medium text-indigo-300 hover:text-indigo-200">Clear filters</button>}</div>
      </section>

      <section aria-labelledby="community-books-title" className={`space-y-4 ${collectionTab === "library" ? "hidden" : ""}`}>
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Community shelf</p><h2 id="community-books-title" className="mt-1 text-2xl font-bold tracking-tight text-white">Books from Renters</h2><p className="mt-1 text-sm text-slate-400">Approved renter-owned books available for browsing.</p></div><span className="rounded-full border border-violet-400/15 bg-violet-400/5 px-3 py-1.5 text-xs text-violet-200"><Store className="mr-1.5 inline h-3.5 w-3.5" />{renterListings.length} listings</span></div>
        {renterListingsError ? <div role="alert" className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-rose-200">{renterListingsError}</div> : filteredRenterListings.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center text-sm text-slate-400">No renter books match these filters.</div> : <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{filteredRenterListings.map((listing) => <article key={listing.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl"><div className="flex h-52 items-center justify-center border-b border-slate-800 bg-slate-800/60 p-5">{listing.coverImage ? <img src={bookImageUrl(listing.coverImage)} alt={`${listing.title} cover`} className="h-full w-full object-contain" /> : <BookOpen className="h-16 w-16 text-slate-600" />}</div><div className="space-y-4 p-5"><div><span className="rounded-md bg-violet-500/10 px-2 py-1 text-[11px] font-medium text-violet-300">Renter listed</span><h3 className="mt-3 break-words text-base font-bold text-white">{listing.title}</h3><p className="mt-1 text-sm text-slate-400">{listing.authorName}</p><p className="mt-1 text-xs text-slate-500">{listing.categoryName || "Uncategorized"} | ISBN {listing.isbn || "-"}</p></div><div className="flex items-center justify-between border-t border-slate-800 pt-4"><span className="text-lg font-bold text-white">₹{listing.rentalPrice}<small className="ml-1 text-xs font-normal text-slate-400">/ {listing.rentalPeriodDays} days</small></span><span className="text-xs text-slate-400">{listing.copyCount} {Number(listing.copyCount) === 1 ? "copy" : "copies"}</span></div><Link to={`/renter-book/${listing.id}`} className="inline-flex w-full items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500">View book</Link></div></article>)}</div>}
      </section>

      {showMyRequests && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="text-base font-semibold text-white">
              My Book Requests
            </h3>
          </div>

          <div className="border-b border-slate-800 px-4 py-3"><TableSearch value={requestSearch} onChange={(value) => { setRequestSearch(value); setRequestPage(1); }} placeholder="Search your book requests..." /></div>

          {!myRequests.length ? (
            <div className="p-8 text-center text-sm text-slate-400">
              {myRentalRequests.length ? <><p>Your renter-book request is counted above.</p><Link to="/my/rental-requests" className="mt-2 inline-flex font-medium text-indigo-300 hover:text-indigo-200">View My Rental Requests</Link></> : <p>No requests found.</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-800/80 text-slate-300">
                  <tr>
                    {[
                      "Book",
                      "ISBN",
                      "Request Date",
                      "Status",
                      "Action",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="py-3 px-4 whitespace-nowrap"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {myRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="py-3.5 px-4 font-medium text-white">
                        {request.book?.title || "-"}
                      </td>
                      <td className="py-3.5 px-4">
                        {request.book?.isbn || "-"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {formatDate(request.requestDate)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${
                            statusColors[request.status] ||
                            "text-slate-400"
                          }`}
                        >
                          {request.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {request.status === "Pending" ? (
                          <button
                            type="button"
                            disabled={cancellingId !== null}
                            onClick={() =>
                              handleCancel(request.id)
                            }
                            className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 disabled:opacity-50"
                          >
                            {cancellingId === request.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Ban className="w-4 h-4" />
                            )}
                            Cancel
                          </button>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <TablePagination page={requestPage} totalPages={requestPagination.totalPages} total={requestPagination.total} limit={requestLimit} onPageChange={setRequestPage} onLimitChange={(size) => { setRequestLimit(size); setRequestPage(1); }} />
        </div>
      )}

      {collectionTab === "renters" ? null : loading ? (
        <div
          role="status"
          className="p-12 flex flex-col items-center gap-2 text-slate-400"
        >
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          <p className="text-sm">Loading books...</p>
        </div>
      ) : error ? (
        <div
          role="alert"
          className="p-8 rounded-xl bg-slate-900 border border-slate-800 text-center text-sm text-slate-400"
        >
          <p>{error}</p>
          <button
            onClick={() => setReload((prev) => prev + 1)}
            className="mt-3 text-indigo-300 underline"
          >
            Try again
          </button>
        </div>
      ) : !books.length ? (
        <div className="p-12 rounded-xl bg-slate-900 border border-slate-800 text-center text-sm text-slate-400">
          No books in the library yet.
        </div>
      ) : (
        filteredBooks.length === 0 ? <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-12 text-center"><Search className="mx-auto h-8 w-8 text-slate-600" /><h3 className="mt-3 font-semibold text-white">No matching books</h3><p className="mt-1 text-sm text-slate-400">Try another title or adjust your filters.</p><button type="button" onClick={() => { setSearch(""); setCategoryFilter("all"); setAvailability("all"); }} className="mt-4 text-sm font-semibold text-indigo-300 hover:text-indigo-200">Reset filters</button></div> : <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {filteredBooks.map((book) => {
            const activeRequest = getActiveRequest(book.id);
            const requesting = requestingId === book.id;

            return (
              <article
                key={book.id}
                className="catalog-book-card bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
              >
                <Cover book={book} />

                <div className="p-5 space-y-4">
                  <div>
                    <span className="inline-block max-w-full break-words px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-300 text-[11px] font-medium">
                      {book.category?.title || "Uncategorized"}
                    </span>

                    <h3 className="mt-3 text-base font-bold text-white break-words">
                      {book.title}
                    </h3>

                    <p className="mt-1 text-sm text-slate-400 break-words">
                      {book.author?.name || "Unknown author"}
                    </p>
                  </div>

                  <dl className="space-y-2 text-xs border-t border-slate-800 pt-4">
                    {[
                      ["ISBN", book.isbn],
                      ["Publisher", book.publisher],
                      ["Published Year", book.publishedYear],
                      ["Total Copies", book.noofcopies],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex justify-between gap-3"
                      >
                        <dt className="text-slate-500 shrink-0">
                          {label}
                        </dt>
                        <dd className="text-slate-300 text-right break-words min-w-0">
                          {value ?? "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <button
                    type="button"
                    disabled={
                      !!activeRequest || requestingId !== null
                    }
                    onClick={() => handleRequest(book.id)}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                      activeRequest
                        ? "bg-slate-800 border border-slate-700 text-slate-400"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-60"
                    }`}
                  >
                    {requesting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Requesting...
                      </>
                    ) : activeRequest?.status === "Pending" ? (
                      <>
                        <Clock className="w-4 h-4" />
                        Request Pending
                      </>
                    ) : activeRequest?.status === "Approved" ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Request Approved
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Request Book
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
