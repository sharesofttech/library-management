
import React, {
  useEffect,
  useState,
  useCallback,
} from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  BookOpen,
  Bell,
  X,
  RefreshCw,
  ChevronUp,
  CalendarDays,
  Search,
  RotateCcw,
} from "lucide-react";

import bookService, {
  bookImageUrl,
} from "../../api/bookService";
import bookRequestService from "../../api/bookRequestService";
import bookIssueService from "../../api/bookIssueService";
import { useToast } from "../../context/ToastContext";
import { TablePagination, TableSearch } from "../common/TableControls";
import Select from "../common/Select";

const STATUSES = [
  "All",
  "Pending",
  "Approved",
  "Rejected",
  "Cancelled",
  "Fulfilled",
];

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return `${String(d.getDate()).padStart(2, "0")}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${d.getFullYear()}`;
};

const todayLocal = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const getCopyLabel = (copy) =>
  copy.copyCode || copy.code || copy.accessionNumber || copy.barcode || `Copy #${copy.id}`;

const getCopyStatus = (copy) => String(copy.status || "").toLowerCase();

const isAvailableCopy = (copy) =>
  ["available", "active"].includes(getCopyStatus(copy));

const statusClass = (status) => {
  const styles = {
    Pending: "bg-amber-500/10 text-amber-300",
    Approved: "bg-green-500/10 text-green-400",
    Rejected: "bg-red-500/10 text-red-400",
    Cancelled: "bg-slate-700 text-slate-300",
    Fulfilled: "bg-blue-500/10 text-blue-300",
  };

  return styles[status] || "bg-slate-800 text-slate-300";
};

export default function BookList() {
  const toast = useToast();

  // Existing book states
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [target, setTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  const [bookCategory, setBookCategory] = useState("all");
  const [bookAuthor, setBookAuthor] = useState("all");
  const [copyFilter, setCopyFilter] = useState("all");
  const [bookSort, setBookSort] = useState("title");
  const [bookPage, setBookPage] = useState(1);
  const [bookLimit, setBookLimit] = useState(10);
  const [bookPagination, setBookPagination] = useState({ total: 0, totalPages: 1 });
  const [bookOptions, setBookOptions] = useState({ categories: [], authors: [] });

  // Book request states
  const [requests, setRequests] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [showRequests, setShowRequests] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [requestPage, setRequestPage] = useState(1);
  const [requestLimit, setRequestLimit] = useState(10);
  const [requestPagination, setRequestPagination] = useState({ total: 0, totalPages: 1 });
  const [updatingId, setUpdatingId] = useState(null);
  const [issueRequest, setIssueRequest] = useState(null);
  const [copies, setCopies] = useState([]);
  const [copiesLoading, setCopiesLoading] = useState(false);
  const [copiesError, setCopiesError] = useState("");
  const [selectedCopyId, setSelectedCopyId] = useState("");
  const [issueDate, setIssueDate] = useState(todayLocal());
  const [dueDate, setDueDate] = useState("");
  const [issuing, setIssuing] = useState(false);


  // Load books
  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    bookService.getBooks({
        page: bookPage,
        limit: bookLimit,
        search: bookSearch,
        categoryId: bookCategory === "all" ? undefined : bookCategory,
        authorId: bookAuthor === "all" ? undefined : bookAuthor,
        copies: copyFilter === "all" ? undefined : copyFilter,
        sort: bookSort === "title" ? "title" : bookSort,
        direction: bookSort === "year" ? "DESC" : "ASC",
      })
      .then(({ books, pagination }) => {
        if (active) { setBooks(books || []); setBookPagination(pagination || { total: books.length, totalPages: 1 }); }
      })
      .catch((err) => {
        if (active) {
          setError(
            err.status === 404
              ? "Books are temporarily unavailable. Please try again."
              : err.message || "Unable to load books."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reload, bookPage, bookLimit, bookSearch, bookCategory, bookAuthor, copyFilter, bookSort]);

  useEffect(() => {
    bookService.getOptions().then(setBookOptions).catch((err) => console.error("Book filter options error:", err));
  }, []);

  const loadPendingCount = useCallback(async () => {
    try {
      const data =
        await bookRequestService.getPendingCount();
      setPendingCount(data.count || 0);
    } catch (err) {
      console.error("Pending count error:", err);
    }
  }, []);

  const loadRequests = useCallback(async (status, query = {}) => {
    setRequestLoading(true);
    setRequestError("");

    try {
      const data =
        await bookRequestService.getAllRequests(status, { page: query.page || requestPage, limit: requestLimit, search: requestSearch });

      setRequests(data.requests || []);
      setRequestPagination(data.pagination || { total: (data.requests || []).length, totalPages: 1 });
    } catch (err) {
      setRequestError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load requests"
      );
    } finally {
      setRequestLoading(false);
    }
  }, [requestPage, requestLimit, requestSearch]);

  // Notification count polling
  useEffect(() => {
    loadPendingCount();

    const interval = setInterval(
      loadPendingCount,
      30000
    );

    return () => clearInterval(interval);
  }, [loadPendingCount]);

  // Load requests when section opens or filter changes
  useEffect(() => {
    if (showRequests) {
      loadRequests(selectedStatus);
    }
  }, [showRequests, selectedStatus, requestPage, requestLimit, requestSearch, loadRequests]);

  const refreshRequests = async () => {
    await Promise.all([
      loadRequests(selectedStatus),
      loadPendingCount(),
    ]);
  };

  const handleStatusUpdate = async (id, status) => {
    if (updatingId !== null) return;

    setUpdatingId(id);

    try {
      const result =
        await bookRequestService.updateStatus(id, status);

      toast.success(
        result.message ||
          `Request ${status.toLowerCase()} successfully`
      );

      await refreshRequests();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to update request"
      );

      await refreshRequests();
    } finally {
      setUpdatingId(null);
    }
  };

  const closeIssueModal = () => {
    if (issuing) return;
    setIssueRequest(null);
    setCopies([]);
    setSelectedCopyId("");
    setCopiesError("");
  };

  const openIssueModal = async (request) => {
    if (request.status !== "Approved") return;
    setIssueRequest(request);
    setCopies([]);
    setCopiesError("");
    setSelectedCopyId("");
    setIssueDate(todayLocal());
    setDueDate("");
    setCopiesLoading(true);

    try {
      const data = await bookIssueService.getBookCopies(request.bookId);
      const available = data.filter(isAvailableCopy);
      setCopies(available);
    } catch (err) {
      setCopiesError(err.response?.data?.message || err.message || "Failed to load book copies");
    } finally {
      setCopiesLoading(false);
    }
  };

  const handleIssueBook = async (event) => {
    event.preventDefault();
    if (!issueRequest || issuing) return;

    if (!selectedCopyId) {
      toast.error("Please select an available book copy");
      return;
    }
    if (!issueDate || !dueDate || dueDate <= issueDate) {
      toast.error("Due date must be after issue date");
      return;
    }

    setIssuing(true);
    try {
      const result = await bookIssueService.issueBook({
        requestId: issueRequest.id,
        bookCopyId: Number(selectedCopyId),
        issueDate,
        dueDate,
      });
      toast.success(result.message || "Book issued successfully");
      setIssueRequest(null);
      setSelectedCopyId("");
      setCopies([]);
      await refreshRequests();
      setReload((prev) => prev + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to issue book");
      // Keep modal open so the user can retry or change copy.
      try {
        const data = await bookIssueService.getBookCopies(issueRequest.bookId);
        setCopies(data.filter(isAvailableCopy));
      } catch (reloadError) {
        console.error("Refresh copies error:", reloadError);
      }
    } finally {
      setIssuing(false);
    }
  };

  // Existing delete functionality
  const remove = async () => {
    if (!target) return;

    setDeleting(true);

    try {
      const result =
        await bookService.deleteBook(target.id);

      setBooks((previous) =>
        previous.filter((book) => book.id !== target.id)
      );

      toast.success(result.message);
      setTarget(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const bookCategories = bookOptions.categories;
  const bookAuthors = bookOptions.authors;
  const filteredBooks = books;
  const hasBookFilters = bookSearch || bookCategory !== "all" || bookAuthor !== "all" || copyFilter !== "all";
  const clearBookFilters = () => { setBookSearch(""); setBookCategory("all"); setBookAuthor("all"); setCopyFilter("all"); setBookSort("title"); setBookPage(1); };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Books
        </h1>

        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <button
            type="button"
            onClick={() =>
              setShowRequests((prev) => !prev)
            }
            aria-label={`Book requests, ${pendingCount} pending`}
            aria-expanded={showRequests}
            title="Book Requests"
            className={`relative w-10 h-10 rounded-lg border flex items-center justify-center transition-colors ${
              showRequests
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Bell className="w-5 h-5" />

            {pendingCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingCount > 99
                  ? "99+"
                  : pendingCount}
              </span>
            )}
          </button>

          {/* Existing Add Book */}
          <Link
            to="/admin/books/add"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Book
          </Link>
        </div>
      </div>

      {/* Book Requests Panel */}
      {showRequests && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Book Requests
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Manage member book requests.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshRequests}
                  disabled={requestLoading}
                  title="Refresh requests"
                  className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${
                      requestLoading ? "animate-spin" : ""
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setShowRequests(false)}
                  title="Close requests"
                  className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {STATUSES.map((status) => (
              <button
                  key={status}
                  type="button"
                  onClick={() => { setSelectedStatus(status); setRequestPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedStatus === status
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {status}
                  {status === "Pending" &&
                    pendingCount > 0 &&
                    ` (${pendingCount})`}
                </button>
              ))}
            </div>
            <TableSearch value={requestSearch} onChange={(value) => { setRequestSearch(value); setRequestPage(1); }} placeholder="Search ID, member, phone, book, ISBN, status, date..." />
          </div>

          {requestLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <p className="text-sm">
                Loading requests...
              </p>
            </div>
          ) : requestError ? (
            <div className="p-8 text-center">
              <p
                role="alert"
                className="text-sm text-red-400"
              >
                {requestError}
              </p>
              <button
                type="button"
                onClick={refreshRequests}
                className="mt-3 text-indigo-300 underline text-sm"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead className="bg-slate-800/80 text-slate-300 border-b border-slate-800">
                  <tr>
                    {[
                      "#",
                      "Member",
                      "Book",
                      "ISBN",
                      "Request Date",
                      "Status",
                      "Approved By",
                      "Action",
                    ].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="py-3 px-4 whitespace-nowrap"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {requests.length === 0 && <tr><td colSpan={8} className="p-12 text-center text-sm text-slate-400">No matching book requests.</td></tr>}
                  {requests.map((request, index) => (
                    <tr
                      key={request.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-slate-400">
                        {index + 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {request.member?.name || "-"}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {request.member?.email || "-"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {[
                            request.member?.countryCode,
                            request.member?.phone,
                          ]
                            .filter(Boolean)
                            .join(" ") || "-"}
                        </p>
                      </td>

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
                          className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold ${statusClass(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {request.approver?.name || "-"}
                      </td>

                    <td className="py-3.5 px-4">
  {request.status === "Pending" ? (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() =>
          handleStatusUpdate(request.id, "Approved")
        }
        disabled={updatingId !== null}
        className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold disabled:opacity-50"
      >
        Approve
      </button>

      <button
        type="button"
        onClick={() =>
          handleStatusUpdate(request.id, "Rejected")
        }
        disabled={updatingId !== null}
        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  ) : request.status === "Approved" ? (
    <button
      type="button"
      onClick={() => openIssueModal(request)}
      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
    >
      Issue Book
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

          <div className="px-5 py-3 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              Total Requests: {requestPagination.total}
            </p>
          </div>
          {!requestLoading && !requestError && <TablePagination page={requestPage} totalPages={requestPagination.totalPages} total={requestPagination.total} limit={requestLimit} onPageChange={setRequestPage} onLimitChange={(size) => { setRequestLimit(size); setRequestPage(1); }} />}
        </div>
      )}

      {/* Book filters and listing */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <section aria-label="Filter books" className="border-b border-slate-800 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="text-sm font-semibold text-white">Find a book</h2><p className="mt-1 text-xs text-slate-400">Search and filter the catalog by any detail.</p></div>
            {hasBookFilters && <button type="button" onClick={clearBookFilters} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/10"><RotateCcw className="h-3.5 w-3.5" />Clear filters</button>}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_repeat(4,minmax(145px,1fr))]">
            <label className="relative"><span className="sr-only">Search books</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input type="search" value={bookSearch} onChange={(event) => { setBookSearch(event.target.value); setBookPage(1); }} placeholder="Title, ISBN, publisher, year..." className="w-full rounded-lg border border-slate-700 bg-slate-950/70 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20" /></label>
            <Select aria-label="Filter by category" value={bookCategory} onChange={(event) => { setBookCategory(event.target.value); setBookPage(1); }} className="!rounded-lg !py-2.5" options={[{ value: "all", label: "All categories" }, ...bookCategories.map((category) => ({ value: category.id, label: category.title }))]} />
            <Select aria-label="Filter by author" value={bookAuthor} onChange={(event) => { setBookAuthor(event.target.value); setBookPage(1); }} className="!rounded-lg !py-2.5" options={[{ value: "all", label: "All authors" }, ...bookAuthors.map((author) => ({ value: author.id, label: author.name }))]} />
            <Select aria-label="Filter by copy availability" value={copyFilter} onChange={(event) => { setCopyFilter(event.target.value); setBookPage(1); }} className="!rounded-lg !py-2.5" options={[{ value: "all", label: "All copy counts" }, { value: "available", label: "Has copies" }, { value: "empty", label: "No copies" }]} />
            <Select aria-label="Sort books" value={bookSort} onChange={(event) => { setBookSort(event.target.value); setBookPage(1); }} className="!rounded-lg !py-2.5" options={[{ value: "title", label: "Sort: title" }, { value: "author", label: "Sort: author" }, { value: "year", label: "Sort: newest year" }]} />
          </div>
         
        </section>
        {loading ? (
          <div
            role="status"
            className="p-12 text-center text-slate-400 flex flex-col items-center gap-2"
          >
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <p className="text-sm">
              Loading books...
            </p>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="p-12 text-center text-sm text-slate-400"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() =>
                setReload((prev) => prev + 1)
              }
              className="mt-3 underline"
            >
              Try again
            </button>
          </div>
        ) : !books.length ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No books found.
          </div>
        ) : !filteredBooks.length ? (
          <div className="p-10 text-center"><Search className="mx-auto h-7 w-7 text-slate-600" /><p className="mt-3 text-sm font-medium text-slate-200">No books match these filters.</p><button type="button" onClick={clearBookFilters} className="mt-2 text-xs font-semibold text-indigo-300 hover:text-indigo-200">Show all books</button></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-800">
                <tr>
                  {[
                    "#",
                    "Image",
                    "Title",
                    "ISBN",
                    "Category",
                    "Author",
                    "Copies",
                    "Publisher",
                    "Published Year",
                    "Created On",
                    "Updated On",
                    "Action",
                  ].map((label) => (
                    <th
                      key={label}
                      scope="col"
                      className="py-3 px-4 whitespace-nowrap"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800 text-slate-200">
                {filteredBooks.map((book, index) => (
                  <tr
                    key={book.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-center text-slate-400">
                      {index + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      {book.bookImg ? (
                        <img
                          src={bookImageUrl(book.bookImg)}
                          alt={`${book.title} cover`}
                          className="h-14 w-10 object-contain rounded bg-slate-800"
                        />
                      ) : (
                        <BookOpen className="w-8 h-8 text-slate-600" />
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-white">
                      {book.title}
                    </td>

                    <td className="py-3.5 px-4">
                      {book.isbn}
                    </td>

                    <td className="py-3.5 px-4">
                      {book.category?.title || "-"}
                    </td>

                    <td className="py-3.5 px-4">
                      {book.author?.name || "-"}
                    </td>

                    <td className="py-3.5 px-4">
                      <Link
                        to={`/admin/books/${book.id}/copies`}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-medium whitespace-nowrap"
                      >
                        {book.noofcopies} Copies
                      </Link>
                    </td>

                    <td className="py-3.5 px-4">
                      {book.publisher || "-"}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {book.publishedYear || "-"}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                      {formatDate(book.createdAt)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                      {formatDate(book.updatedAt)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          to={`/admin/books/edit/${book.id}`}
                          aria-label={`Edit ${book.title}`}
                          className="w-7 h-7 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shadow-sm"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => setTarget(book)}
                          aria-label={`Delete ${book.title}`}
                          className="w-7 h-7 rounded bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && <TablePagination page={bookPage} totalPages={bookPagination.totalPages} total={bookPagination.total} limit={bookLimit} onPageChange={setBookPage} onLimitChange={(size) => { setBookLimit(size); setBookPage(1); }} />}
      </div>

      {/* Issue Book Modal */}
      {issueRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="issue-book-title"
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <h2 id="issue-book-title" className="text-lg font-bold text-white">Issue Book</h2>
                <p className="mt-1 text-xs text-slate-400">Select an available copy and issue dates.</p>
              </div>
              <button type="button" disabled={issuing} onClick={closeIssueModal}
                aria-label="Close issue modal" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleIssueBook} className="p-6 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  ["Member Name", issueRequest.member?.name || "-"],
                  ["Member ID", issueRequest.memberId],
                  ["Book Title", issueRequest.book?.title || "-"],
                  ["Code", issueRequest.book?.code || issueRequest.book?.bookCode || issueRequest.book?.isbn || "-"],
                ].map(([label, value]) => (
                  <label key={label} className="block space-y-1.5">
                    <span className="text-xs font-medium text-slate-400">{label}</span>
                    <input readOnly value={String(value ?? "-")}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2.5 text-sm text-slate-300 outline-none" />
                  </label>
                ))}
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-white mb-2">Available Book Copies <span className="text-red-400">*</span></legend>
                {copiesLoading ? (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-700 p-4 text-sm text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading copies...
                  </div>
                ) : copiesError ? (
                  <p role="alert" className="rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-300">{copiesError}</p>
                ) : copies.length === 0 ? (
                  <p className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-sm text-amber-300">No available copies for this book.</p>
                ) : (
                  <div className="max-h-52 overflow-y-auto space-y-2 rounded-lg border border-slate-700 p-2">
                    {copies.map((copy) => {
                      const selected = String(selectedCopyId) === String(copy.id);
                      return (
                        <label key={copy.id}
                          className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${selected ? "border-blue-500 bg-blue-500/10" : "border-slate-700 bg-slate-800/40 hover:bg-slate-800"}`}>
                          <span className="flex items-center gap-3 min-w-0">
                            <input type="radio" name="bookCopyId" value={copy.id} checked={selected}
                              onChange={() => setSelectedCopyId(String(copy.id))}
                              className="h-4 w-4 accent-blue-600" />
                            <span className="min-w-0">
                              <span className="block break-all text-sm font-medium text-white">{getCopyLabel(copy)}</span>
                              <span className="block text-xs text-slate-400">Copy ID: {copy.id}</span>
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-medium text-green-400">Available</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </fieldset>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-slate-300"><CalendarDays className="h-4 w-4" /> Issue Date</span>
                  <input type="date" required value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 [color-scheme:dark]" />
                </label>
                <label className="block space-y-1.5">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-slate-300"><CalendarDays className="h-4 w-4" /> Due Date</span>
                  <input type="date" required min={issueDate} value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 [color-scheme:dark]" />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                <button type="button" disabled={issuing} onClick={closeIssueModal}
                  className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={issuing || copiesLoading || !!copiesError || !selectedCopyId || !issueDate || !dueDate || dueDate < issueDate}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {issuing ? <><Loader2 className="h-4 w-4 animate-spin" /> Issuing...</> : <><BookOpen className="h-4 w-4" /> Issue Book</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Existing Delete Confirmation */}
      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-book-title"
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4"
          >
            <h3
              id="delete-book-title"
              className="text-base font-bold text-white"
            >
              Delete Book
            </h3>

            <p className="text-xs text-slate-300">
              Are you sure you want to delete{" "}
              <strong className="text-white">
                "{target.title}"
              </strong>
              ? Its copies will also be removed.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setTarget(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={remove}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
