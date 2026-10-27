import { NextRequest, NextResponse } from "next/server";

type ShoppingResult = {
  id: string;
  title: string;
  price: string | null;
  amount: number | null;
  currency: string | null;
  image: string | null;
  url: string;
  retailer: string | null;
  rating: number | null;
  reviews: number | null;
  delivery: string | null;
};

function parsePrice(value: unknown): { amount: number | null; currency: string | null; label: string | null } {
  if (typeof value !== "string" && typeof value !== "number") {
    return { amount: null, currency: null, label: null };
  }
  const label = String(value).trim();
  const amount = typeof value === "number" ? value : Number(label.replace(/[^\d.]/g, ""));
  const detectedCurrency = label.match(/₹|INR/i) ? "INR" : label.match(/\$|USD/i) ? "USD" : null;
  const currency = detectedCurrency ?? (Number.isFinite(amount) && amount > 0 ? "INR" : null);
  const displayLabel = label && !detectedCurrency && Number.isFinite(amount) && amount > 0
    ? "₹" + amount.toLocaleString("en-IN")
    : label;
  return { amount: Number.isFinite(amount) && amount > 0 ? amount : null, currency, label: displayLabel || null };
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const budgetRaw = request.nextUrl.searchParams.get("budget");
  const budget = budgetRaw ? Number(budgetRaw) : null;

  if (query.length < 2 || query.length > 160) {
    return NextResponse.json({ error: "Enter a search query between 2 and 160 characters." }, { status: 400 });
  }
  if (budgetRaw && (!Number.isFinite(budget) || (budget as number) <= 0 || (budget as number) > 10000000)) {
    return NextResponse.json({ error: "Budget must be a positive amount up to ₹1,00,00,000." }, { status: 400 });
  }

  const channel3Key = process.env.CHANNEL3_API_KEY;
  const serpApiKey = process.env.SERPAPI_API_KEY;

  // Channel3 is the hackathon's product-data sponsor and is preferred when configured.
  // SerpApi remains an optional fallback for existing deployments.
  if (!channel3Key && !serpApiKey) {
    return NextResponse.json({
      configured: false,
      provider: null,
      results: [],
      message: "Live product data is not configured. Add CHANNEL3_API_KEY in Render for Channel3's structured shopping catalog. SERPAPI_API_KEY remains supported as a fallback.",
      setup: {
        primary: "https://trychannel3.com/developers",
        fallback: "https://serpapi.com/",
      },
    }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }

  try {
    if (channel3Key) {
      const response = await fetch("https://api.trychannel3.com/v1/search", {
        method: "POST",
        headers: {
          "x-api-key": channel3Key,
          "content-type": "application/json",
        },
        body: JSON.stringify({ query, limit: 24 }),
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
      });

      if (!response.ok) {
        console.error("Channel3 returned HTTP", response.status);
        // If Channel3 is configured but temporarily unavailable, don't silently mask
        // the failure by charging another provider or returning stale-looking results.
        return NextResponse.json({ error: "Channel3 product search is temporarily unavailable. Please retry shortly." }, { status: 502 });
      }

      const data: Record<string, unknown> = await response.json();
      const products = (Array.isArray(data.products) ? data.products : Array.isArray(data.results) ? data.results : []) as Array<Record<string, unknown>>;
      const results: ShoppingResult[] = products.flatMap((item, index) => {
        const title = typeof item.title === "string" ? item.title.trim() : typeof item.name === "string" ? item.name.trim() : "";
        const offers = Array.isArray(item.offers) ? item.offers as Array<Record<string, unknown>> : [];
        const offer = offers[0] ?? {};
        const rawPriceObject = offer.price && typeof offer.price === "object" ? offer.price as Record<string, unknown> : {};
        const rawPrice = rawPriceObject.price ?? offer.price ?? item.price;
        const parsed = parsePrice(rawPrice);
        const rawUrl = typeof offer.url === "string" ? offer.url : typeof item.url === "string" ? item.url : "";
        if (!title || !/^https:\/\//i.test(rawUrl)) return [];
        const rawImages = Array.isArray(item.images) ? item.images : [];
        const firstImage = rawImages[0];
        const imageValue = typeof item.image === "string" ? item.image : typeof firstImage === "string" ? firstImage : firstImage && typeof firstImage === "object" ? (firstImage as Record<string, unknown>).url : null;
        const image = typeof imageValue === "string" && /^https:\/\//i.test(imageValue) ? imageValue : null;
        const website = offer.website && typeof offer.website === "object" ? offer.website as Record<string, unknown> : {};
        const retailer = typeof offer.merchant === "string" ? offer.merchant : typeof website.name === "string" ? website.name : typeof item.brand === "string" ? item.brand : null;
        const rawCurrency = typeof rawPriceObject.currency === "string" ? rawPriceObject.currency.toUpperCase() : parsed.currency;
        const currency = rawCurrency && /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : parsed.currency;
        const price = parsed.amount !== null && currency && /^[A-Z]{3}$/.test(currency)
          ? new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(parsed.amount)
          : parsed.label;
        const ratingRaw = Number(item.rating);
        const reviewsRaw = Number(item.reviews);
        return [{
          id: typeof item.id === "string" ? item.id : `channel3-${index}-${title.slice(0, 32)}`,
          title,
          price,
          amount: parsed.amount,
          currency,
          image,
          url: rawUrl,
          retailer,
          rating: Number.isFinite(ratingRaw) && ratingRaw > 0 ? ratingRaw : null,
          reviews: Number.isFinite(reviewsRaw) && reviewsRaw > 0 ? reviewsRaw : null,
          delivery: null,
        }];
      });
      const filtered = budget ? results.filter((item) => item.amount !== null && item.currency === "INR" && item.amount <= budget) : results;
      return NextResponse.json({
        configured: true,
        provider: "Channel3",
        query,
        count: filtered.length,
        results: filtered,
        note: "Product data is provided by Channel3. Prices, stock, and merchant offers may change; verify the final details with the retailer.",
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_shopping");
    url.searchParams.set("q", query);
    url.searchParams.set("gl", "in");
    url.searchParams.set("hl", "en");
    url.searchParams.set("api_key", serpApiKey!);
    url.searchParams.set("num", "24");

    const response = await fetch(url, { signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (!response.ok) {
      console.error("Shopping provider returned HTTP", response.status);
      return NextResponse.json({ error: "The product search provider could not complete the search. Please try again shortly." }, { status: 502 });
    }

    const data: { shopping_results?: Array<Record<string, unknown>>; error?: string } = await response.json();
    const results: ShoppingResult[] = (data.shopping_results ?? []).flatMap((item, index) => {
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const productUrl = typeof item.product_link === "string" ? item.product_link : typeof item.link === "string" ? item.link : "";
      if (!title || !/^https:\/\//i.test(productUrl)) return [];
      const rawPrice = item.extracted_price ?? item.price;
      const parsed = parsePrice(rawPrice);
      const rating = Number(item.rating);
      const reviews = Number(String(item.reviews ?? "").replace(/[^\d]/g, ""));
      const image = typeof item.thumbnail === "string" && /^https:\/\//i.test(item.thumbnail) ? item.thumbnail : null;
      return [{
        id: `${index}-${title.slice(0, 40)}`,
        title,
        price: parsed.label,
        amount: parsed.amount,
        currency: parsed.currency,
        image,
        url: productUrl,
        retailer: typeof item.source === "string" ? item.source : null,
        rating: Number.isFinite(rating) && rating > 0 ? rating : null,
        reviews: Number.isFinite(reviews) && reviews > 0 ? reviews : null,
        delivery: typeof item.delivery === "string" ? item.delivery : null,
      }];
    });

    const filtered = budget ? results.filter((item) => item.amount !== null && item.currency === "INR" && item.amount <= budget) : results;
    return NextResponse.json({
      configured: true,
      provider: "Google Shopping via SerpApi (fallback)",
      query,
      count: filtered.length,
      results: filtered,
      note: "Listings and prices are supplied by Google Shopping results and may change. Confirm the final price, seller, and availability with the retailer.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Shopping search failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Product search timed out or is temporarily unavailable. Please retry." }, { status: 502 });
  }
}
