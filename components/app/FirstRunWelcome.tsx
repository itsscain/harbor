import { HarborScene } from "@/components/brand/illustrations";
import { AddChildCard } from "./AddChildCard";

/** The brand-new, empty-household moment: a warm hero + the add-child flow inline. */
export function FirstRunWelcome({ defaultColor }: { defaultColor: string }) {
  return (
    <div className="animate-enter">
      <div className="relative mb-6 flex flex-col items-center px-4 pt-6 text-center">
        <span className="absolute inset-x-0 top-0 mx-auto h-44 w-44 beacon-ring" aria-hidden />
        <HarborScene className="relative h-28 w-auto text-fg" />
        <h1 className="relative mt-5 text-display text-fg">Welcome aboard.</h1>
        <p className="relative mt-2 max-w-md text-fg-muted">
          Harbor keeps your family&apos;s days calm and predictable. Let&apos;s start by adding
          your crew — each child gets their own color, avatar, and routines on the wall.
        </p>
      </div>
      <AddChildCard defaultColor={defaultColor} />
    </div>
  );
}
