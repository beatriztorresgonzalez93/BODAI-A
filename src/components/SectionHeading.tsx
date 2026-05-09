type Props = {
  title: string;
  subtitle?: string;
};

export function SectionHeading({ title, subtitle }: Props) {
  return (
    <header className="mb-8 text-center">
      <h2 className="font-serif text-3xl font-normal tracking-tight text-[#332C28] sm:text-4xl">
        {title}
      </h2>
      <div className="mx-auto mt-4 h-px w-12 bg-[#C19A6B]" aria-hidden />
      {subtitle ? (
        <p className="mt-4 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-[#332C28]/55">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
