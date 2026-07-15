"use client";

export default function BrandLogo({ className = "w-100 h-42", alt }) {
  return (
    <div className={className} aria-label={alt || "AcuityCx"}>
      <svg
        viewBox="0 0 320 90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
      >
        <circle
          cx="45"
          cy="38"
          r="26"
          stroke="#0d2244"
          strokeWidth="3.5"
          fill="none"
        />
        <path
          d="M24 26 Q45 10 66 26"
          stroke="#0d2244"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
        <rect x="18" y="28" width="8" height="14" rx="4" fill="#0d2244" />
        <rect x="64" y="28" width="8" height="14" rx="4" fill="#0d2244" />

        <circle cx="45" cy="35" r="2.5" fill="#20b2aa" />
        <circle cx="36" cy="42" r="2" fill="#20b2aa" />
        <circle cx="54" cy="42" r="2" fill="#20b2aa" />
        <circle cx="40" cy="28" r="2" fill="#20b2aa" />
        <circle cx="51" cy="28" r="2" fill="#20b2aa" />

        <line
          x1="45"
          y1="35"
          x2="36"
          y2="42"
          stroke="#20b2aa"
          strokeWidth="1.2"
        />
        <line
          x1="45"
          y1="35"
          x2="54"
          y2="42"
          stroke="#20b2aa"
          strokeWidth="1.2"
        />
        <line
          x1="45"
          y1="35"
          x2="40"
          y2="28"
          stroke="#20b2aa"
          strokeWidth="1.2"
        />
        <line
          x1="45"
          y1="35"
          x2="51"
          y2="28"
          stroke="#20b2aa"
          strokeWidth="1.2"
        />
        <line
          x1="40"
          y1="28"
          x2="51"
          y2="28"
          stroke="#20b2aa"
          strokeWidth="1.2"
        />

        <path
          d="M20 68 Q45 60 70 68"
          stroke="#20b2aa"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />

        <circle cx="14" cy="55" r="2.5" fill="#20b2aa" />
        <circle cx="8" cy="62" r="2" fill="#0d2244" opacity="0.5" />

        <text
          x="88"
          y="52"
          fontFamily="Segoe UI, Tahoma, sans-serif"
          fontSize="36"
          fontWeight="700"
          fill="#0d2244"
        >
          AcuityCx
        </text>

        <path
          d="M88 62 Q175 72 310 62"
          stroke="#20b2aa"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
