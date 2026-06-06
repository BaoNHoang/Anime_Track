import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  action?: { label: string; to: string };
  trailing?: ReactNode;
}

export function SectionHeader({
  eyebrow,
  title,
  action,
  trailing
}: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {trailing}
      {action && (
        <Link className="text-link" to={action.to}>
          {action.label}
          <ChevronRight size={16} />
        </Link>
      )}
    </div>
  );
}
