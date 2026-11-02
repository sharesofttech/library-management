import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Clock3,
  Heart,
  Library,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  X,
} from "lucide-react";
import "./LandingPage.css";

const previewBooks = [
  { title: "The Art of Small Steps", author: "A. Harper", tone: "blue", label: "A little progress, every day" },
  { title: "A Garden of Ideas", author: "M. Ellis", tone: "violet", label: "Make room for wonder" },
  { title: "Stories Between Us", author: "R. Morgan", tone: "peach", label: "Find your next favourite" },
];

const steps = [
  { number: "01", title: "Find a book", text: "Explore the collection and open a book page to see its availability and rental details.", icon: Search },
  { number: "02", title: "Send a request", text: "Choose the book and rental period, then send a request to the library or its owner.", icon: BookOpen },
  { number: "03", title: "Read and return", text: "Collect or receive your book, enjoy it, and return it by the agreed date.", icon: ArrowDown },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="landing-page">
      <div className="landing-shell">
        <header className="landing-nav">
          <Link className="landing-brand" to="/" aria-label="Library Portal home" onClick={closeMenu}>
            <span className="landing-brand-mark"><Library size={21} strokeWidth={2.2} /></span>
            <span>Library <b>Portal</b></span>
          </Link>

          <button
            className="landing-menu-toggle"
            type="button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>

          <nav className={`landing-nav-links ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
            <a href="#how-it-works" onClick={closeMenu}>How it works</a>
            <a href="#readers" onClick={closeMenu}>For readers</a>
            <a href="#lenders" onClick={closeMenu}>For book owners</a>
            <Link className="landing-nav-login" to="/login" onClick={closeMenu}>Sign in</Link>
            <Link className="landing-button landing-button-small" to="/login" onClick={closeMenu}>
              Get started <ArrowUpRight size={15} />
            </Link>
          </nav>
        </header>

        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-copy">
            <div className="landing-eyebrow"><Sparkles size={15} /> A library for curious minds</div>
            <h1 id="landing-title">A good book can take you <span>anywhere.</span></h1>
            <p className="landing-hero-text">
              Discover your next read, borrow it with ease, and share the books you love with your community.
            </p>
            <div className="landing-hero-actions">
              <Link className="landing-button" to="/login">Explore the collection <ArrowRight size={17} /></Link>
              <a className="landing-text-link" href="#how-it-works">See how it works <ChevronRight size={16} /></a>
            </div>
            <div className="landing-trust-row">
              <span className="landing-avatar-stack" aria-hidden="true"><i>R</i><i>M</i><i>A</i></span>
              <span><strong>Made for readers</strong><small>Borrow, return, and keep discovering</small></span>
            </div>
          </div>

          <div className="landing-hero-art" aria-label="Preview of book listings">
            <div className="landing-art-glow" />
            <div className="landing-art-note"><span className="landing-note-icon"><BookOpen size={17} /></span><span><b>Your next read</b><small>is waiting to be found</small></span><ArrowUpRight size={17} /></div>
            <div className="landing-book-stack">
              {previewBooks.map((book, index) => (
                <article className={`landing-preview-card landing-preview-card-${index + 1}`} key={book.title}>
                  <div className={`landing-book-cover cover-${book.tone}`}>
                    <span className="landing-cover-symbol"><BookOpen size={24} /></span>
                    <span className="landing-cover-label">{book.label}</span>
                    <strong>{book.title}</strong>
                    <small>{book.author}</small>
                  </div>
                  <div className="landing-preview-meta"><span><i /> Preview listing</span><b>View book <ArrowUpRight size={13} /></b></div>
                </article>
              ))}
            </div>
            <div className="landing-floating-badge"><Heart size={15} fill="currentColor" /> Share a story</div>
            <div className="landing-art-caption">A glimpse of the book marketplace</div>
          </div>
        </section>

        <section className="landing-value-strip" aria-label="Platform highlights">
          <div><span className="landing-value-icon value-blue"><Search size={18} /></span><span><b>Find books</b><small>Browse a growing collection</small></span></div>
          <div><span className="landing-value-icon value-violet"><Users size={18} /></span><span><b>Share locally</b><small>Connect readers and book owners</small></span></div>
          <div><span className="landing-value-icon value-green"><ShieldCheck size={18} /></span><span><b>Clear requests</b><small>Know the terms before you borrow</small></span></div>
        </section>

        <section className="landing-how" id="how-it-works" aria-labelledby="how-title">
          <div className="landing-section-heading">
            <span className="landing-kicker">Simple by design</span>
            <h2 id="how-title">From discovery to your bookshelf.</h2>
            <p>Find a book, make a request, and enjoy a straightforward borrowing journey.</p>
          </div>
          <div className="landing-step-grid">
            {steps.map(({ number, title, text, icon: Icon }) => (
              <article className="landing-step-card" key={number}>
                <div className="landing-step-top"><span>{number}</span><Icon size={20} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-audience-grid" aria-label="Ways to use the library portal">
          <article className="landing-audience-card reader-card" id="readers">
            <div className="landing-audience-icon"><BookOpen size={21} /></div>
            <span className="landing-kicker">For readers</span>
            <h2>Your next chapter starts here.</h2>
            <p>Browse books, check availability and rental terms, then keep track of requests and returns in one place.</p>
            <Link className="landing-text-link" to="/login">Explore as a reader <ArrowRight size={16} /></Link>
            <div className="audience-decoration reader-decoration"><BookOpen size={108} /></div>
          </article>
          <article className="landing-audience-card lender-card" id="lenders">
            <div className="landing-audience-icon"><Heart size={21} /></div>
            <span className="landing-kicker">For book owners</span>
            <h2>Let a loved book travel.</h2>
            <p>Offer copies for readers to borrow. Approved book owners can manage listings and respond to requests.</p>
            <Link className="landing-text-link" to="/login">Sign in to get started <ArrowRight size={16} /></Link>
            <div className="audience-decoration lender-decoration"><Library size={110} /></div>
          </article>
        </section>

        <section className="landing-community">
          <div className="landing-community-mark"><Clock3 size={19} /><Truck size={19} /></div>
          <div><span className="landing-kicker">Built around real books</span><h2>Borrow with clear details. Return with confidence.</h2></div>
          <p>Book pages can show availability, condition, rental period, and pickup or delivery details before a request is sent.</p>
        </section>

        <section className="landing-cta">
          <div className="landing-cta-spark"><Sparkles size={20} /></div>
          <span className="landing-kicker">Your next read is closer</span>
          <h2>Come find a story worth sharing.</h2>
          <p>Sign in to continue to the Library Portal.</p>
          <Link className="landing-button landing-button-light" to="/login">Continue to the portal <ArrowRight size={17} /></Link>
        </section>

        <footer className="landing-footer">
          <Link className="landing-brand" to="/" aria-label="Library Portal home">
            <span className="landing-brand-mark"><Library size={19} /></span><span>Library <b>Portal</b></span>
          </Link>
          <span>Good books are even better when shared.</span>
          <Link to="/login">Sign in <ArrowUpRight size={14} /></Link>
        </footer>
      </div>
    </main>
  );
}
