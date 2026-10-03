import { HarborScene } from "@/components/brand/illustrations";
import { AddChildForm } from "./kids/AddChildSheet";

/** The brand-new, empty-household moment: a warm hero + the add-child form inline. */
export function FirstRunWelcome({ defaultColor }: { defaultColor: string }) {
  return (
    <div className="animate-enter">
      <div className="relative mb-6 flex flex-col items-center px-4 pt-6 text-center">
        <span className="absolute inset-x-0 top-0 mx-auto h-44 w-44 beacon-ring" aria-hidden />
        <HarborScene className="relative h-28 w-auto text-fg" />
        <h1 className="relative mt-5 text-display text-fg">Welcome aboard.</h1>
        <p className="relative mt-2 max-w-md text-fg-muted">
          Harbor keeps your family&apos;s days calm and predictable. Start by adding a child — they get their own color, face and routines on the
          wall.
        </p>
      </div>
      <section className="mx-auto max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 className="mb-4 text-title text-fg">Add your first child</h2>
        <AddChildForm nextColor={defaultColor} autoFocus={false} />
      </section>
    </div>
  );
}
