import React from "react";
import { Plate, PlateVariant } from "./art/Plate";
import { cx } from "./ui/cx";

interface PageHeroProps {
  /** Section number, shown the way Hermes numbers its features: "#1". */
  index: string;
  section: string;
  title: React.ReactNode;
  description: React.ReactNode;
  actions?: React.ReactNode;
  plate: PlateVariant;
  plateCaption?: [string, string];
  size?: "lg" | "md";
  children?: React.ReactNode;
}

export function PageHero({
  index,
  section,
  title,
  description,
  actions,
  plate,
  plateCaption,
  size = "lg",
  children,
}: PageHeroProps) {
  const large = size === "lg";
  return (
    <section className="mx-auto max-w-page px-5 lg:px-8">
      <div
        className={cx(
          "grid items-center gap-10 lg:grid-cols-12",
          large ? "py-12 lg:py-16" : "py-8 lg:py-10"
        )}
      >
        <div className={cx("min-w-0", large ? "lg:col-span-7" : "lg:col-span-8")}>
          <p className="type-label flex items-center gap-2 text-text-2">
            <span className="text-accent">{index}</span>
            <span>{section}</span>
          </p>
          <h1 className={cx("mt-5 max-w-[16ch]", large ? "type-display" : "type-h1 max-w-[22ch]")}>
            {title}
          </h1>
          <p className={cx("mt-5 max-w-[54ch] text-text-2", large ? "type-body" : "type-small text-[15px]")}>
            {description}
          </p>
          {actions && <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div>}
          {children && <div className="mt-9">{children}</div>}
        </div>

        <div
          className={cx(
            "hidden lg:block",
            large
              ? "lg:col-span-5 lg:justify-self-end lg:w-full lg:max-w-[500px]"
              : "lg:col-span-4 lg:justify-self-end lg:w-full lg:max-w-[230px]"
          )}
        >
          <Plate variant={plate} compact={!large} caption={large ? plateCaption : undefined} />
        </div>
      </div>
    </section>
  );
}

export default PageHero;
