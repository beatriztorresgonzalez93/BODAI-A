import Image from "next/image";
import type { HistoriaBlock } from "@/lib/wedding-config";

type StoryGroup =
  | { kind: "prose"; paragraphs: string[] }
  | { kind: "image"; src: string; alt: string; tilt: number }
  | { kind: "gallery"; images: { src: string; alt: string }[] };

function groupBlocks(blocks: HistoriaBlock[]): StoryGroup[] {
  const groups: StoryGroup[] = [];
  let prose: string[] = [];
  let images: { src: string; alt: string }[] = [];
  let imageCount = 0;

  const flushProse = () => {
    if (prose.length) {
      groups.push({ kind: "prose", paragraphs: [...prose] });
      prose = [];
    }
  };

  const flushImages = () => {
    if (images.length === 1) {
      const tilt = imageCount % 2 === 0 ? -1.5 : 1.5;
      groups.push({ kind: "image", ...images[0], tilt });
      imageCount += 1;
    } else if (images.length > 1) {
      groups.push({ kind: "gallery", images: [...images] });
      imageCount += images.length;
    }
    images = [];
  };

  for (const block of blocks) {
    if (block.type === "text") {
      flushImages();
      prose.push(block.content);
    } else {
      flushProse();
      images.push({ src: block.src, alt: block.alt ?? "" });
    }
  }
  flushProse();
  flushImages();
  return groups;
}

function isPullQuote(text: string) {
  const t = text.trim();
  return t.length < 72 || (t.endsWith("?") && t.length < 120);
}

function HistoriaPhoto({
  src,
  alt,
  sizes,
  tilt,
  showCaption,
}: {
  src: string;
  alt: string;
  sizes: string;
  tilt?: number;
  showCaption?: boolean;
}) {
  return (
    <figure
      className="mx-auto w-full"
      style={tilt !== undefined ? { transform: `rotate(${tilt}deg)` } : undefined}
    >
      <div className="overflow-hidden rounded-xl bg-white p-2 shadow-md shadow-[#2F3530]/10">
        <div className="overflow-hidden rounded-lg bg-[#E8EDE5]">
          <Image
            src={src}
            alt={alt}
            width={1400}
            height={933}
            className="h-auto w-full"
            sizes={sizes}
            unoptimized={process.env.NODE_ENV === "development"}
          />
        </div>
      </div>
      {showCaption && alt ? (
        <figcaption className="mt-3 text-center font-serif text-sm text-[#2F3530]/45 italic">
          {alt}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function HistoriaStory({ blocks }: { blocks: HistoriaBlock[] }) {
  const groups = groupBlocks(blocks);

  return (
    <div className="mx-auto max-w-2xl space-y-12">
      {groups.map((group, gi) => {
        if (group.kind === "prose") {
          return (
            <div
              key={`prose-${gi}`}
              className="space-y-5 rounded-3xl border border-[#8A9B82]/12 bg-[#FAFCF9]/65 px-6 py-7 shadow-[0_4px_28px_-6px_rgba(47,53,48,0.07)] sm:px-8"
            >
              {group.paragraphs.map((p, pi) =>
                isPullQuote(p) ? (
                  <p
                    key={`pq-${gi}-${pi}`}
                    className="py-1 text-center font-serif text-xl leading-snug tracking-tight text-[#8A9B82] italic sm:text-2xl"
                  >
                    {p}
                  </p>
                ) : (
                  <p
                    key={`p-${gi}-${pi}`}
                    className={`text-justify font-sans text-[15px] leading-[1.9] text-[#2F3530]/78 ${
                      pi === 0
                        ? "first-letter:float-left first-letter:mr-2 first-letter:mt-0.5 first-letter:font-serif first-letter:text-4xl first-letter:leading-none first-letter:text-[#8A9B82]"
                        : ""
                    }`}
                  >
                    {p}
                  </p>
                ),
              )}
            </div>
          );
        }

        if (group.kind === "gallery") {
          const galleryCols =
            group.images.length <= 2 ? "grid-cols-1" : "grid-cols-2";
          return (
            <div key={`gallery-${gi}`} className={`grid ${galleryCols} gap-4`}>
              {group.images.map((img, ii) => (
                <HistoriaPhoto
                  key={`${img.src}-${ii}`}
                  src={img.src}
                  alt={img.alt || "Foto de nuestra historia"}
                  sizes="(max-width: 768px) 92vw, 672px"
                  tilt={ii % 2 === 0 ? -1 : 1}
                />
              ))}
            </div>
          );
        }

        return (
          <div key={`img-${gi}`} className="max-w-2xl">
            <HistoriaPhoto
              src={group.src}
              alt={group.alt || "Foto de nuestra historia"}
              sizes="(max-width: 768px) 92vw, 672px"
              tilt={group.tilt}
              showCaption={Boolean(group.alt)}
            />
          </div>
        );
      })}

      <div className="flex items-center justify-center gap-3 pt-2" aria-hidden>
        <span className="h-px w-16 bg-[#8A9B82]/40" />
        <span className="font-serif text-lg text-[#8A9B82]">&</span>
        <span className="h-px w-16 bg-[#8A9B82]/40" />
      </div>
    </div>
  );
}
