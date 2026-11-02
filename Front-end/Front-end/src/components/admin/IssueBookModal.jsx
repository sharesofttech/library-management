
import React, { useEffect, useState } from "react";
import { X, Loader2, BookOpen, CheckCircle2 } from "lucide-react";
import bookIssueService from "../api/bookIssueService";

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function IssueBookModal({
  request,
  onClose,
  onSuccess,
}) {
  const [copies, setCopies] = useState([]);
  const [selectedCopyId, setSelectedCopyId] = useState("");
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadCopies = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await bookIssueService.getBookCopies(
          request.bookId
        );

        if (active) {
          setCopies(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Failed to load book copies"
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCopies();

    return () => {
      active = false;
    };
  }, [request.bookId]);

  const handleIssue = async (event) => {
    event.preventDefault();

    if (submitting) return;

    if (!selectedCopyId) {
      setError("Please select a book copy");
      return;
    }

    if (!issueDate || !dueDate || dueDate <= issueDate) {
      setError("Due date must be after issue date");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await bookIssueService.issueBook({
        requestId: request.id,
        bookCopyId: selectedCopyId,
        issueDate,
        dueDate,
      });

      await onSuccess(result);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to issue book"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass =
    "w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-blue-500";

  const labelClass =
    "block text-xs font-medium text-slate-400 mb-1.5";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="issue-book-title"
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2
              id="issue-book-title"
              className="text-lg font-bold text-white"
            >
              Issue Book
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select an available copy and issue it to the member.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleIssue} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Member Name</label>
              <input
                readOnly
                value={request.member?.name || ""}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Member ID</label>
              <input
                readOnly
                value={request.memberId}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Book Title</label>
              <input
                readOnly
                value={request.book?.title || ""}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Code (ISBN)</label>
              <input
                readOnly
                value={request.book?.isbn || ""}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Book Copy <span className="text-red-400">*</span>
            </label>

            {loading ? (
              <div className="flex items-center gap-2 py-5 text-sm text-slate-400">
                <Loader2 size={17} className="animate-spin" />
                Loading available copies...
              </div>
            ) : copies.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-800 text-sm text-amber-300">
                No available copies for this book.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {copies.map((copy) => {
                  const selected =
                    String(selectedCopyId) === String(copy.id);

                  return (
                    <button
                      key={copy.id}
                      type="button"
                      disabled={submitting}
                      onClick={() =>
                        setSelectedCopyId(String(copy.id))
                      }
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                        selected
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-slate-700 bg-slate-800 hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen
                          size={18}
                          className={
                            selected
                              ? "text-blue-400"
                              : "text-slate-400"
                          }
                        />

                        <div>
                          <p className="text-sm font-medium text-white">
                            {copy.copyCode}
                          </p>
                          <p className="text-xs text-green-400 mt-1">
                            Available
                          </p>
                        </div>
                      </div>

                      {selected ? (
                        <CheckCircle2
                          size={19}
                          className="text-blue-400"
                        />
                      ) : (
                        <span className="w-5 h-5 rounded-full border border-slate-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Issue Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(event) =>
                  setIssueDate(event.target.value)
                }
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Due Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                min={issueDate}
                value={dueDate}
                onChange={(event) =>
                  setDueDate(event.target.value)
                }
                className={fieldClass}
              />
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                submitting ||
                !selectedCopyId ||
                !dueDate
              }
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
            >
              {submitting && (
                <Loader2 size={16} className="animate-spin" />
              )}
              {submitting ? "Issuing..." : "Issue Book"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
