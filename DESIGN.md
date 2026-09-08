---
version: alpha
colors:
  ink: "#071f19"
  evergreen: "#087f5b"
  mint: "#e8f5ef"
  gold: "#e3bc62"
  danger: "#be123c"
typography:
  display:
    fontFamily: "Nunito Sans, Inter, system-ui, sans-serif"
  body:
    fontFamily: "Nunito Sans, Inter, system-ui, sans-serif"
rounded:
  card: "24px"
  control: "12px"
spacing:
  page: "1.25rem"
  panel: "1.5rem"
components:
  soft-card:
    background: "#ffffff"
    border: "#e2e8f0"
  primary-button:
    background: "#071f19"
    foreground: "#ffffff"
---

## Overview

The public JSC YDM site is a welcoming church noticeboard; the admin surface is its orderly parish register. It should feel calm, legible and durable on the phones and Windows laptops used by ministry leaders. The recognisable signature is the deep evergreen and restrained gold action treatment. Admin data and security controls remain quiet, readable and direct.

## Colors

Evergreen identifies ministry structure and positive actions. Gold is reserved for the established raised download/action treatment. White cards sit on pale neutral backgrounds; rose remains the destructive-action color. Do not introduce dark image boxes, glossy decorative panels, or another accent palette around data tables.

## Typography

Use the established rounded sans-serif stack with very heavy headings, clear sentence-case field labels, and small uppercase tracking only for section eyebrows and table headers. Tamil text uses the browser's Tamil-capable fallback without changing the surrounding hierarchy.

## Layout

Pages use wide, generous cards with natural document scrolling. Dense datasets own their scroll area inside the table surface rather than constraining a sibling form or the page. Archive tables have a stable maximum height and visible native scrollbars.

## Elevation & Depth

Cards use a thin cool border and subtle shadow. Only the gold download actions use a short, solid lower shadow to communicate their existing 3D press effect. Focus outlines stay visible in evergreen.

## Shapes

Cards are rounded and spacious; fields are compact rounded rectangles. Use the shared `soft-card`, `field`, and button classes rather than adding local imitations.

## Components

Tables use native semantic markup, sticky headers only inside their own scrolling panel, and a clearly labelled action column. Icon-only actions have an accessible name and title. Native selects and dates remain intentionally platform-owned controls in this application.

## Do's and Don'ts

Do preserve clear loading, empty, error, and keyboard-focus states. Do use server-verified authorization for all admin data. Do not make a decorative icon the only action label. Do not use browser alerts or confirmation dialogs. Do not put passwords, session tokens, or admin data in client storage.
