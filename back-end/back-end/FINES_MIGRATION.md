Phase 1: fines schema
=====================

Run `npm run migrate` from `server` before restarting the API. This migration
targets the existing MySQL database configured by `server/.env`. Back up the
database before deployment. Startup now authenticates without altering tables;
new installations must provision the existing application schema first.

The migration inspects columns, serializes migration runners with a MySQL
advisory lock, and supports reruns after partial DDL completion. MySQL DDL is
not transactional. It never drops tables, borrowing records, or payments.
There is deliberately no destructive down migration for financial history.

Observed schema differences: `book_issues` lacked returnDate and status despite
their presence in the model; books had no price; all three financial tables
were absent. Existing copies already support all four required statuses.

Existing borrowing rates and book prices remain NULL: there is no historical
rate or original price to infer. No fine amount or staff identity is invented.
The settings table stays empty until an authenticated admin sets the first rate.
New issuing now requires settings and stores the rate snapshot. Existing active
borrowings without a rate require an admin to use Save Verified Rate in the
return/lost confirmation dialog. This is a one-time historical reconciliation;
it does not use today's rate automatically. Missing price blocks lost charges;
set Original Book Price in the existing Books form.

Active-copy exclusivity uses the existing issue transaction and copy row lock;
the issuance endpoint additionally rejects an existing active borrowing
even if a copy's status has become inconsistent. A generated unique active-copy
column is incompatible with this database's existing cascading foreign key,
so the migration preserves that foreign key. Duplicate active records stop the
migration before changes so staff can reconcile them. A status/due-date index
supports subsequent overdue synchronization.
Fine uniqueness is enforced on (borrowingId, type). Foreign keys restrict
deleting fines with payments or borrowings with fines. Monetary columns use
DECIMAL(10,2), with database checks and model validation. Settings use the fixed
primary key 1 and a database CHECK to enforce one configuration.

Phases 2–7 are integrated: settings, immutable issuance snapshots, overdue
synchronization, return/lost, cash/UPI/card receipts, staff fines/payments pages,
and member-owned view-only pages. No further schema changes were required.
Overdue processing runs at startup and hourly, and immediately before financial
reads and return/lost/payment actions. LIBRARY_TIMEZONE defaults to Asia/Kolkata.
Each borrowing is processed in its own READ COMMITTED transaction. All financial
mutations lock borrowing before fine; copy updates are part of the same return
transaction. Multiple workers serialize through these database row locks and
the unique fine constraint. A restarted server catches up automatically.

Run integration suites serially because they share the local database:
`npm test`
The flow integration test creates dedicated fixtures, restores settings, and
removes its own fixtures afterward. Its synchronization can correctly mark
pre-existing issued records overdue; it never assigns historical rates.

See ../UI_FLOW_CHECKLIST.md for the manual testing workflow.

Fine status now uses exactly ENUM('Pending', 'Partially paid', 'Paid'), with
Pending as the default. `npm run migrate` maps unpaid → Pending, partial →
Partially paid, and paid → Paid without changing amounts or receipts. If an
older database has waived fines, migration stops for explicit reconciliation
rather than silently reopening or charging those fines. Restart the API after
applying the migration so writers use the same status values as the schema.
