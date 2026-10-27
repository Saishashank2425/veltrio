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

  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      configured: false,
      provider: "Google Shopping via SerpApi",
      results: [],
      message: "Live product data is not configured yet. Add SERPAPI_API_KEY to the Render service environment to show product cards with current retailer listings.",
    }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_shopping");
    url.searchParams.set("q", query);
    url.searchParams.set("gl", "in");
    url.searchParams.set("hl", "en");
    url.searchParams.set("api_key", apiKey);
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
      provider: "Google Shopping via SerpApi",
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
