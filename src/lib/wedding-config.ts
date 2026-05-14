/** Personaliza aquí los datos del evento (mockups de referencia). */
export type HistoriaBlock =
  | { type: "text"; content: string }
  | { type: "image"; src: string; alt?: string };

export const weddingConfig = {
  coupleLine: "Inmaculada & Alejandro",
  headline: "NOS CASAMOS",
  /** Foto principal en public/portada4.jpg */
  coverImageSrc: "/portada6.jpeg",
  /** Punto focal en móvil (object-position): novios abajo-derecha */
  coverImageMobileFocus: "90% 74%",
  dateLine: "SÁBADO · 5 DE DICIEMBRE DE 2026 · SEVILLA",
  /** Hora de referencia para la cuenta atrás (CET); cambia si ya tienes horario cerrado */
  countdownTarget: "2026-12-05T17:30:00+01:00",
  rsvpDeadlineLine: "ANTES DEL 1 DE OCTUBRE DE 2026",
  granDia: {
    fecha: "5 diciembre 2026",
    ceremonia: "12.30h",
    lugarLines: ["San José de la Rinconada (Sevilla)"],
    /** Búsqueda en Google Maps al pulsar el bloque */
    lugarMapsQuery:
      "Carretera Sevilla – Brenes km 2, San José de la Rinconada, Sevilla, España",
    dressCode: "Cóctel elegante",
    schedule: [
      { time: "12:30", label: "Ceremonia civil" },
      { time: "13:30", label: "Cóctel de bienvenida en los jardines" },
      { time: "15:00", label: "Almuerzo nupcial" },
      { time: "17:30", label: "Tarta y brindis" },
      { time: "18:00", label: "Fiesta y baile" },
      { time: "00:00", label: "Cierre con fuegos artificiales" },
    ],
  },
  viajeros: {
    subtitle: "TODO LO QUE NECESITAS SABER",
    hotel: {
      name: "Hotel Torre del Oro",
      /** Sitio oficial: https://www.hotel-en-sevilla.es/ */
      websiteUrl: "https://www.hotel-en-sevilla.es/",
      /** Foto en public/hotel.png */
      imageSrc: "/hotel.png",
      address:
        "Polígono Industrial El Malecón, C. el Malecón, 100, 41300 San José de la Rinconada, Sevilla",
      phone: "+34 955 793 127",
      rateNote: 'Menciona "Boda Inmacula y Alejandro"',
      distance: "Dos minutos a pie del lugar de la celebración",
      mapsQuery:
        "Hotel Torre del Oro, C. el Malecón 100, San José de la Rinconada, Sevilla",
    },
  },
  historia: {
    /**
     * Bloques de texto e imagen en orden. Las fotos van en public/ (raíz),
     * NO en public/assets/. Ej.: public/foto5.jpg → src: "/foto5.jpg".
     * Tras sustituir un archivo, recarga con Ctrl+Shift+R.
     */
    blocks: [
      {
        type: "text",
        content:
          "Todo empezó mucho antes de que ambos supieran realmente que sus vidas acabarían unidas para siempre.",
      },
      {
        type: "text",
        content:
          "Ale vio a Inma por primera vez en una fiesta de fin de curso y, aunque ella todavía no sabía quién era él, algo le llamó la atención. Inma descubriría quién era Ale después del verano, al comenzar el nuevo curso, cuando terminaron compartiendo clase.",
      },
      { type: "text", content: "¿Fue amor a primera vista?" },
      { type: "text", content: "La verdad es que no." },

     
      {
        type: "text",
        content:
          "Ale se caracterizaba por ser el que más molestaba en clase, algo que a Inma no le hacía demasiada gracia. Pasaba el tiempo intentando enterarse de las notitas que ella se intercambiaba con su amiga durante las clases, y eso la desesperaba bastante.",
      },
       
      {
        type: "text",
        content:
          "Pero, poco a poco, los días fueron pasando y las conversaciones empezaron a surgir de manera natural. Inma terminó confiándole sus historias y sus “movidas” a Ale, y cuando acababan las clases, seguían hablando durante horas por Messenger.",
      },
      { type: "image", src: "/foto1.JPG", alt: "Inma y Ale" },
      {
        type: "text",
        content:
          "Con el tiempo, ya no se conectaban para hablar con nadie más. Solo querían hablar entre ellos.",
      },
      { type: "image", src: "/foto2.jpg", alt: "Juntos" },
      {
        type: "text",
        content:
          "Hasta que un día, un amigo de Ale decidió montar un pequeño espectáculo e hizo creer a Inma que a Ale le gustaba. Aquello la descolocó por completo, y reaccionó diciendo que era imposible, que solo eran amigos y que jamás saldría con él.",
      },
      { type: "text", content: "Aunque en el fondo no era del todo verdad." },
      { type: "text", content: "Porque Ale también le gustaba." },
      {
        type: "text",
        content:
          "Así que Inma decidió hablar con él. Y entonces llegó la sorpresa: Ale le dijo que todo había sido un invento de su amigo.",
      },
      {
        type: "text",
        content:
          "Pero, si la historia hubiera terminado ahí, hoy no existiría ni esta boda ni todo lo que vino después.",
      },
      {
        type: "text",
        content:
          "Al final, ambos fueron sinceros y confesaron lo que sentían. Empezaron a salir… un día, y otro, y otro más. Y así, casi sin darse cuenta, comenzaron a construir una vida juntos.",
      },
      
      
      {
        type: "text",
        content:
          "Con los años, esos sentimientos no hicieron más que crecer. Han superado la distancia, dos misiones y también la gran aventura de convertirse en padres.",
      },
      { type: "image", src: "/foto4.JPG", alt: "Sevilla" },
      
      { type: "image", src: "/foto5-2.jpg", alt: "Valentina" },
      { type: "image", src: "/foto3.jpg", alt: "Pedida de matrimonio" },
      { type: "image", src: "/foto5.jpg", alt: "Briana" },
      {
        type: "text",
        content: "En su décimo aniversario, Ale le pidió matrimonio a Inma.",
      },
      
      { type: "image", src: "/foto6.jpg", alt: "Primera pedida" },
      {
        type: "text",
        content:
          "Pero todavía quedaban muchos pasos por dar. Inma tenía que terminar la carrera, Ale tenía que mudarse a Sevilla y, entre una cosa y otra, el tiempo siguió avanzando.",
      },
      { type: "image", src: "/foto7.jpg", alt: "¡Conseguido!" },
      {
        type: "text",
        content:
          "Después llegó la pandemia y, cuando por fin decidieron poner fecha para la boda, la vida volvió a sorprenderles: Briana venía en camino. Todo volvió a pausarse.",
      },
      { type: "image", src: "/foto8.jpg", alt: "Embarazo de Briana" },
      {
        type: "text",
        content:
          "Más tarde llegaron momentos preciosos, otros más difíciles, y poco después nació Valentina.",
      },
      { type: "image", src: "/foto9.jpg", alt: "Embarazo de Valentina" },
      {
        type: "text",
        content:
          "Con el tiempo entendieron que siempre habría algún motivo para retrasar la fecha perfecta. Pero también comprendieron que lo importante nunca fue el cuándo, sino el camino recorrido juntos.",
      },
      {
        type: "text",
        content:
          "Y aunque Ale ya había hecho su pedida años atrás —según él eso ya había prescrito—, Inma no quiso quedarse de brazos cruzados.",
      },
      
      {
        type: "text",
        content: "Así que fue ella quien terminó pidiéndole matrimonio a él.",
      },
      { type: "image", src: "/foto10.jpg", alt: "Segunda pedida" },
      {
        type: "text",
        content:
          "Y después de tantos años, tantas etapas y tantas historias vividas juntos, seguimos eligiéndonos cada día. Porque el amor de nuestra vida nunca fue un momento… siempre hemos sido nosotros.",
      },
      { type: "image", src: "/foto11.jpeg", alt: "Nosotros" },
      { type: "image", src: "/foto12.jpg", alt: "Nosotros" },
    ] satisfies HistoriaBlock[],
  },
};
