
import apiClient from "./client";

const bookIssueService = {
  getBookCopies: async (bookId) => {
    const response = await apiClient.get(`/books/${bookId}`);

    const data = response.data ?? response;

    if (!data.book) {
      throw new Error("Book details not found");
    }

    const copies = data.book.copies;

    if (!Array.isArray(copies)) {
      throw new Error("Book copies not found in API response");
    }

    return copies.filter(
      (copy) => copy.status === "available"
    );
  },

  issueBook: async ({
    requestId,
    bookCopyId,
    issueDate,
    dueDate,
  }) => {
    const response = await apiClient.post("/book-issues", {
      requestId: Number(requestId),
      bookCopyId: Number(bookCopyId),
      issueDate,
      dueDate,
    });

    return response.data ?? response;
  },
};

export default bookIssueService;
