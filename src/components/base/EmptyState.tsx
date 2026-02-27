import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  cta?: ReactNode;
};

export default function EmptyState({ icon, title, description, cta }: EmptyStateProps) {
  return (
    <div className="base-empty-state">
      {icon ? <div className="base-empty-state__icon">{icon}</div> : null}
      <h3>{title}</h3>
      <p>{description}</p>
      {cta ? <div className="base-empty-state__cta">{cta}</div> : null}
    </div>
  );
}
