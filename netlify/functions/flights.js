// netlify/functions/flights.js
//
// Esta función corre en el servidor (nunca en el navegador del usuario),
// así que tu API Key de Duffel nunca queda expuesta.
//
// La app la llama así: /.netlify/functions/flights?origin=VCE&destination=BCN&date=2026-09-10
//
// La clave real se lee de una variable de entorno (DUFFEL_API_KEY) que
// configuras en el panel de Netlify — nunca se escribe aquí en el código.

exports.handler = async (event) => {
  const { origin, destination, date, adults = "1" } = event.queryStringParameters || {};

  if (!origin || !destination || !date) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Faltan parámetros: origin, destination y date son obligatorios." }),
    };
  }

  const DUFFEL_API_KEY = process.env.DUFFEL_API_KEY;

  if (!DUFFEL_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Falta configurar DUFFEL_API_KEY en las variables de entorno de Netlify." }),
    };
  }

  try {
    const response = await fetch("https://api.duffel.com/air/offer_requests?return_offers=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Duffel-Version": "v2",
        Authorization: `Bearer ${DUFFEL_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          slices: [{ origin, destination, departure_date: date }],
          passengers: Array.from({ length: Number(adults) }, () => ({ type: "adult" })),
          cabin_class: "economy",
        },
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: json.errors?.[0]?.message || "Error consultando Duffel" }),
      };
    }

    // Simplificamos la respuesta a solo lo que la app necesita mostrar
    const offers = (json.data?.offers || []).map((offer) => {
      const firstSlice = offer.slices[0];
      const firstSegment = firstSlice.segments[0];
      const lastSegment = firstSlice.segments[firstSlice.segments.length - 1];
      return {
        id: offer.id,
        airline: firstSegment.operating_carrier?.name || "Aerolínea",
        from: `${firstSegment.origin.iata_code} → ${lastSegment.destination.iata_code}`,
        departingAt: firstSegment.departing_at,
        arrivingAt: lastSegment.arriving_at,
        stops: firstSlice.segments.length === 1 ? "Directo" : `${firstSlice.segments.length - 1} escala(s)`,
        price: offer.total_amount,
        currency: offer.total_currency,
      };
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offers }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error inesperado: " + err.message }),
    };
  }
};
