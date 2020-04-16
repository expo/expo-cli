import * as React from 'react';

export const Warning = props => (
  <svg
    className={props.className}
    onClick={props.onClick}
    width={props.size}
    height={props.size}
    style={props.style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12" y2="16" />
  </svg>
);

export const Trash = props => (
  <svg
    className={props.className}
    onClick={props.onClick}
    width={props.size}
    height={props.size}
    style={props.style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

export const Dismiss = props => (
  <svg
    className={props.className}
    onClick={props.onClick}
    width={props.size}
    height={props.size}
    style={props.style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const Link = props => (
  <svg
    className={props.className}
    onClick={props.onClick}
    width={props.size}
    height={props.size}
    style={props.style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

export const Arrow = props => (
  <svg
    className={props.className}
    onClick={props.onClick}
    width={props.size}
    height={props.size}
    style={props.style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
);

export const WifiOff = props => (
  <svg
    className={props.className}
    onClick={props.onClick}
    width={props.size}
    height={props.size}
    style={props.style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
    <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12" y2="20" />
  </svg>
);

export const Wifi = props => (
  <svg
    className={props.className}
    onClick={props.onClick}
    width={props.size}
    height={props.size}
    style={props.style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12" y2="20" />
  </svg>
);

export const Tablet = props => (
  <svg
    className={props.className}
    onClick={props.onClick}
    width={props.size}
    height={props.size}
    style={props.style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" transform="rotate(180 12 12)" />
    <line x1="12" y1="18" x2="12" y2="18" />
  </svg>
);

export const HardDrive = props => (
  <svg
    className={props.className}
    onClick={props.onClick}
    width={props.size}
    height={props.size}
    style={props.style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <line x1="22" y1="12" x2="2" y2="12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    <line x1="6" y1="16" x2="6" y2="16" />
    <line x1="10" y1="16" x2="10" y2="16" />
  </svg>
);

export const Logs = props => (
  <svg
    className={props.className}
    onClick={props.onClick}
    width={props.size}
    height={props.size}
    style={props.style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

export const Package = props => (
  <svg
    className={props.className}
    onClick={props.onClick}
    width={props.size}
    height={props.size}
    style={props.style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.79 0l-8-4a2 2 0 0 1-1.1-1.8V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z" />
    <polyline points="2.32 6.16 12 11 21.68 6.16" />
    <line x1="12" y1="22.76" x2="12" y2="11" />
    <line x1="7" y1="3.5" x2="17" y2="8.5" />
  </svg>
);

export const Grid = props => (
  <svg
    className={props.className}
    onClick={props.onClick}
    width={props.size}
    height={props.size}
    style={props.style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
    data-reactid="611">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

export const Columns = props => (
  <svg
    className={props.className}
    onClick={props.onClick}
    width={props.size}
    height={props.size}
    style={props.style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const Three = props => (
  <svg
    className={props.className}
    onClick={props.onClick}
    width={props.size}
    height={props.size}
    style={props.style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
    data-reactid="611">
    <rect x="2" y="3" width="4" height="18" />
    <rect x="10" y="3" width="4" height="18" />
    <rect x="18" y="3" width="4" height="18" />
  </svg>
);

export const One = props => (
  <svg
    className={props.className}
    onClick={props.onClick}
    width={props.size}
    height={props.size}
    style={props.style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
  </svg>
);
