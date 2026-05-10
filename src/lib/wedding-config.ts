/** Personaliza aquí los datos del evento (mockups de referencia). */
export const weddingConfig = {
  coupleLine: "Inmaculada & Alejandro",
  headline: "NOS CASAMOS",
  dateLine: "SÁBADO · 5 DE DICIEMBRE DE 2026 · SEVILLA",
  /** Hora de referencia para la cuenta atrás (CET); cambia si ya tienes horario cerrado */
  countdownTarget: "2026-12-05T17:30:00+01:00",
  rsvpDeadlineLine: "ANTES DEL 1 DE OCTUBRE DE 2026",
  granDia: {
    fecha: "5 diciembre 2026",
    ceremonia: "Por confirmar",
    lugarLines: [
      
      "San José de la Rinconada (Sevilla)",
    ],
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
      distance:
        "Dos minutos a pie del lugar de la celebración",
      mapsQuery:
        "Hotel Torre del Oro, C. el Malecón 100, San José de la Rinconada, Sevilla",
    },
  },
  historia: {
    paragraphs: [
      "Nos conocimos un verano en Sevilla y desde entonces cada paso ha sido compartido: risas, viajes y una lista interminable de planes.",
      "Queremos celebrar este día con las personas que nos han acompañado. Gracias por ser parte de nuestra historia.",
    ],
  },
};
