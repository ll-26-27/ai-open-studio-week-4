import { checkCoverage, defaultModel, modelChoices } from "../../../lib/shotlist.mjs";

export const dynamic = "force-dynamic";
// A dozen stills through a Pro model can take a minute or two.
export const maxDuration = 300;

const maxImages = 30;
const maxBytes = 8 * 1024 * 1024;

const apiKey = () => (process.env.OPENROUTER_API_KEY || "").trim();

// The page asks whether a key is set and which models it can offer.
export async function GET() {
  return Response.json({ ready: Boolean(apiKey()), model: defaultModel, models: modelChoices() });
}

// Body: multipart form with `images` (JPEGs, in shooting order; the page shrinks them first), `brief`, `planned`, and
// `model`. Nothing is saved: the stills go to the model and the answer comes back.
export async function POST(request) {
  if (!apiKey()) return Response.json({ error: "No OPENROUTER_API_KEY in nextjs/.env.local." }, { status: 503 });

  let form;
  try { form = await request.formData(); } catch { return Response.json({ error: "Expected a multipart form." }, { status: 400 }); }

  const files = form.getAll("images").filter((file) => typeof file?.arrayBuffer === "function");
  if (files.length === 0) return Response.json({ error: "No stills in the request." }, { status: 400 });
  if (files.length > maxImages) return Response.json({ error: `At most ${maxImages} stills at a time.` }, { status: 413 });

  const images = [];
  for (const file of files) {
    if (file.size > maxBytes) return Response.json({ error: `${file.name} is too large.` }, { status: 413 });
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return Response.json({ error: `${file.name} isn't a JPEG.` }, { status: 415 });
    images.push({ name: String(file.name || `still-${images.length + 1}.jpg`).slice(0, 120), bytes });
  }

  const requested = String(form.get("model") || "");
  const model = modelChoices().some((choice) => choice.id === requested) ? requested : defaultModel;

  try {
    const result = await checkCoverage(images, {
      brief: String(form.get("brief") || "").trim().slice(0, 4000),
      planned: String(form.get("planned") || "").trim().slice(0, 4000),
      apiKey: apiKey(),
      model,
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: `Coverage check failed: ${error.message}` }, { status: 502 });
  }
}
