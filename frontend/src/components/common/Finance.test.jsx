import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useSelector } from "react-redux";
import FineRecords from "./FineRecords";
import BorrowingActionModal from "../admin/BorrowingActionModal";
import FineSettings from "../admin/FineSettings";
import fineService from "../../api/fineService";

// CRA 5's Jest resolver does not resolve react-router/dom's package export.
// These components use the shared router exports, exercised here via the core.
jest.mock("react-router-dom", () => jest.requireActual("react-router"));

jest.mock("react-redux", () => ({ useSelector: jest.fn() }));
jest.mock("../../store/authSlice", () => ({ selectUser: state => state.auth.user }));
jest.mock("../../context/ToastContext", () => ({ useToast: () => ({ success: jest.fn() }) }));
jest.mock("../../api/fineService", () => ({ __esModule: true, default: {
  settings: jest.fn(), saveSettings: jest.fn(), fines: jest.fn(), payments: jest.fn(),
  pay: jest.fn(), preview: jest.fn(), legacyRate: jest.fn(), returnBook: jest.fn(), lostBook: jest.fn(),
} }));

const fine = { id: 8, borrowingId: 3, type: "lost", amount: "500.25", totalPaid: "200.10", balance: "300.15", status: "Partially paid", createdAt: "2026-10-28T00:00:00Z", borrowing: { id: 3, member: { id: 4, name: "Library Member" }, book: { title: "Library Book" } } };
const borrowing = { id: 3, memberId: 4, bookCopyId: 5, issueDate: "2026-10-01", dueDate: "2026-10-20", libraryDate: "2026-10-28", status: "overdue", overdueFineRate: "1.00", overdueDays: 8, overdueFine: "8.00", outstandingAmount: "8.00", lostCharge: "500.25", projectedLostOutstanding: "508.25", book: { title: "Library Book" } };
beforeEach(() => { jest.clearAllMocks(); useSelector.mockReturnValue({ role: "admin" }); fineService.fines.mockResolvedValue({ fines: [fine] }); });
const page = element => render(<MemoryRouter>{element}</MemoryRouter>);

test("staff can record an installment and refresh balances", async () => {
  fineService.pay.mockResolvedValue({ message: "Payment recorded" });
  page(<FineRecords />);
  fireEvent.click(await screen.findByRole("button", { name: "Record Payment" }));
  expect(screen.getByRole("dialog", { name: "Record Payment" })).toHaveTextContent("₹300.15");
  fireEvent.change(screen.getByLabelText("Payment amount"), { target: { value: "100.15" } });
  fireEvent.change(screen.getByLabelText("Payment Method"), { target: { value: "upi" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm Payment" }));
  await waitFor(() => expect(fineService.pay).toHaveBeenCalledWith(8, "100.15", "upi"));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(fineService.fines).toHaveBeenCalledTimes(2);
});
test("member fines are view-only and use the member API", async () => {
  page(<FineRecords own />);
  expect(await screen.findByText("Library Book")).toBeInTheDocument();
  expect(fineService.fines).toHaveBeenCalledWith(true);
  expect(screen.queryByRole("button", { name: "Record Payment" })).not.toBeInTheDocument();
  expect(screen.queryByText("View Payments")).not.toBeInTheDocument();
  expect(Array.from(screen.getByLabelText("Fine status filter").options, option => option.text)).toEqual(["All Statuses", "Pending", "Partially paid", "Paid"]);
  fireEvent.change(screen.getByLabelText("Fine type filter"), { target: { value: "overdue" } });
  expect(screen.getByText("No matching records found.")).toBeInTheDocument();
});
test("payment dates filter by library-local calendar date and have no edit actions", async () => {
  fineService.payments.mockResolvedValue({ libraryTimezone: "Asia/Kolkata", payments: [{ id: 9, fineId: 8, fine: { borrowing: fine.borrowing }, amount: "100.15", paymentDate: "2026-10-28T20:00:00Z", paymentMethod: "cash", receiver: { name: "Librarian" } }] });
  page(<FineRecords own payments />);
  expect(await screen.findByText("29/10/2026")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-10-29" } });
  expect(screen.getByText("₹100.15")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("To date"), { target: { value: "2026-10-28" } });
  expect(screen.getByText("No matching records found.")).toBeInTheDocument();
  expect(screen.queryByText("Record Payment")).not.toBeInTheDocument();
});
test("return confirmation sends the selected condition", async () => {
  fineService.preview.mockResolvedValue({ borrowing });
  fineService.returnBook.mockResolvedValue({ message: "Returned" });
  const done = jest.fn();
  page(<BorrowingActionModal id={3} action="return" onClose={jest.fn()} onDone={done} />);
  const condition = await screen.findByLabelText("Book Condition");
  expect(condition).toHaveValue("good");
  fireEvent.change(condition, { target: { value: "damaged" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm Return" }));
  await waitFor(() => expect(fineService.returnBook).toHaveBeenCalledWith(3, "damaged"));
  expect(done).toHaveBeenCalledTimes(1);
});
test("legacy borrowings require a verified rate and lost books require price", async () => {
  fineService.preview.mockResolvedValueOnce({ borrowing: { ...borrowing, overdueFineRate: null, rateNeedsReview: true } }).mockResolvedValueOnce({ borrowing });
  fineService.legacyRate.mockResolvedValue({ message: "Saved" });
  page(<BorrowingActionModal id={3} action="lost" onClose={jest.fn()} onDone={jest.fn()} />);
  const input = await screen.findByLabelText("Verified historical daily rate");
  expect(screen.getByRole("button", { name: "Confirm Lost" })).toBeDisabled();
  fireEvent.change(input, { target: { value: "1.00" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Verified Rate" }));
  await waitFor(() => expect(fineService.legacyRate).toHaveBeenCalledWith(3, "1.00"));
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirm Lost" })).toBeEnabled());
});
test("librarian sees fine settings without a save action", async () => {
  useSelector.mockReturnValue({ role: "librarian" });
  fineService.settings.mockResolvedValue({ settings: { overdueFinePerDay: "5.00", updater: { name: "Admin" }, updatedAt: "2026-10-28" } });
  page(<FineSettings />);
  expect(await screen.findByLabelText("Overdue Fine Per Day")).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Save Changes" })).not.toBeInTheDocument();
});
