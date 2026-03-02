import axios from "axios";

export const extractLatLngFromMapLink = async (mapLink: string) => {
  try {
    if (!mapLink) throw new Error("Map link is required");

    let expandedUrl = mapLink;

    try {
      await axios.get(mapLink, { maxRedirects: 0 });
    } catch (err: any) {
      if (err.response?.status === 301 || err.response?.status === 302) {
        expandedUrl = err.response.headers.location;
      }
    }

    const coordPatterns = [
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,
      /q=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
      /maps\/(-?\d+\.\d+),(-?\d+\.\d+)/,
    ];

    for (const pattern of coordPatterns) {
  const match = expandedUrl.match(pattern);

  if (match && match[1] && match[2]) {
    return {
      lat: parseFloat(match[1]),
      lng: parseFloat(match[2]),
    };
  }
}

    const placeId = expandedUrl.match(/placeid=([^&]+)/)?.[1];
    if (placeId) {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      const placeUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}`;
      const placeResp = await axios.get(placeUrl);

      if (placeResp.data?.result?.geometry?.location) {
        return {
          lat: placeResp.data.result.geometry.location.lat,
          lng: placeResp.data.result.geometry.location.lng,
        };
      }
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    const geoUrl =
      "https://maps.googleapis.com/maps/api/geocode/json?address=" +
      encodeURIComponent(expandedUrl) +
      "&key=" +
      apiKey;

    const response = await axios.get(geoUrl);

    if (response.data.status === "OK" && response.data.results.length > 0) {
      const loc = response.data.results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng };
    }
    console.log("Reason for failure", response);

    throw new Error("Unable to extract coordinates from link");
  } catch (err) {
    console.error("Google Maps Extraction Error:", err);
    throw new Error("Failed to extract coordinates from map link");
  }
};