# Architecture rules

- Keep the document-based editorial summary for the pain postgraduate full message in one shared builder used by both yearly templates, so its modules and closing remain consistent without truncation.
- Use the shared GINE editorial builder for yearly WhatsApp summaries, while keeping full document topics in course modules for the existing schedule and PDF builders; this avoids truncated messages and duplicated curricula.
- Generate general ultrasound block-date messages from same-unit modular courses and the shared class resolver, rather than copying dates into the postgraduate schedule, to keep calendar updates reflected automatically.- Generate student-facing course PDFs through the shared branded builder in src/lib/coursePdf.ts, so every year's PDF keeps the same Nexus visual identity.
