import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-primary", className)}
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.77 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" />
      <path d="M8.29 14.29L6 12l2.29-2.29" />
      <path d="M15.71 14.29L18 12l-2.29-2.29" />
      <line x1="12" y1="18" x2="12" y2="15" />
      <line x1="12" y1="9" x2="12" y2="6" />
    </svg>
  );
}
