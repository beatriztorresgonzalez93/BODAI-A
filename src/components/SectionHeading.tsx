type Props = {
  title: string;
  subtitle?: string;
};

export function SectionHeading({ title, subtitle }: Props) {
  return (
    <header className="mb-8 text-center">
      <h2 className="font-serif text-3xl font-normal tracking-tight text-[#3D322E] sm:text-4xl">
        {title}
      </h2>
      <div className="mx-auto mt-4 h-px w-12 bg-[#D4845F]" aria-hidden />
      {subtitle ? (
        <p className="mt-4 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-[#3D322E]/55">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
