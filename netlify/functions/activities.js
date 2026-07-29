// netlify/functions/activities.js
//
// Busca actividades/lugares reales con Google Places API (New).
// La app la llama así: /.netlify/functions/activities?city=Barcelona
//
// La clave se lee de la variable de entorno GOOGLE_PLACES_API_KEY,
// configurada en Netlify — nunca se escribe aquí en el código.

exports.handler = async (event) => {
  const { city, category = "cosas que hacer" } = event.queryStringParameters || {};

  if (!city) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Falta el parámetro: city" }),
    };
  }

  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

  if (!GOOGLE_PLACES_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Falta configurar GOOGLE_PLACES_API_KEY en las variables de entorno de Netlify." }),
    };
  }

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.priceLevel",
      },
      body: JSON.stringify({
        textQuery: `${category} en ${city}`,
        languageCode: "es",
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: json.error?.message || "Error consultando Google Places" }),
      };
    }

    const activities = (json.places || []).map((place) => ({
      name: place.displayName?.text || "Sin nombre",
      address: place.formattedAddress || "",
      rating: place.rating || null,
      ratingCount: place.userRatingCount || 0,
      category: place.types?.[0]?.replaceAll("_", " ") || "lugar",
      priceLevel: place.priceLevel || null,
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activities }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error inesperado: " + err.message }),
    };
  }
};
