// The coverage check behind /shot-list: a set of stills goes to a vision model on OpenRouter (OPENROUTER_API_KEY in
// .env.local), which reads them the way a field producer or script supervisor would before the crew leaves the
// location: what each shot is, what the scene still needs, what won't cut together. The answer comes back as JSON
// (the schema below) so the page can lay it out next to the pictures.

export const models = [
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (careful)" },
  { id: "google/gemini-3.8-flash", label: "Gemini 3.8 Flash (fast)" },
];

export const defaultModel = (process.env.OPENROUTER_MODEL || "").trim() || models[0].id;

export function modelChoices() {
  return models.some((model) => model.id === defaultModel) ? models : [{ id: defaultModel, label: defaultModel }, ...models];
}

const instructions = `You are the field producer and script supervisor on a shoot. The crew has sent you the stills below, numbered in the order they were taken, and wants to know one thing before they leave the location: do we have coverage? That is, could an editor cut this into a scene or sequence that makes sense, or do we need more shots?

Judge it the way a working producer would:
- Name each shot by its size and kind (establishing, wide, medium, medium close-up, close-up, extreme close-up, insert, cutaway, over-the-shoulder, POV, reaction, two-shot, and so on), what it shows, and its angle.
- Check the standard coverage for this kind of scene: a shot that establishes where we are, a wide that shows the geography, mediums, close-ups of faces, close-ups of hands and the action, inserts and details, cutaways and reactions to cut away to, and a variety of angles (the five-shot sequence: hands, face, wide, over-the-shoulder, an unusual angle). Leave out needs that don't apply to this scene, and add any the scene calls for.
- If the crew sent a planned shot list, also check every planned shot against the stills, one coverage line each, using the crew's wording. The coverage list always carries both: the standard needs (planned: false) first, then the planned shots (planned: true).
- Flag continuity problems a script supervisor would catch: props, hands, clothing, or light that changes between shots meant to cut together, eyelines and screen direction that cross the line, jump cuts between shots too similar in size and angle.
- Flag technical problems that would make a shot unusable: focus, exposure, motion blur, a tilted horizon, headroom, something growing out of a head.
- Then say what to pick up before leaving, most important first, specific enough that a camera operator could go and get it.

Number shots by the numbers given. Be concrete, short, and plain. No praise, no preamble, and don't guess who anyone is; describe people by what they're doing.`;

const status = { type: "string", enum: ["covered", "partial", "missing"] };
const shotNumbers = { type: "array", items: { type: "integer" } };

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "summary", "shots", "coverage", "continuity", "pickups", "cut"],
  properties: {
    verdict: { type: "string", enum: ["covered", "nearly", "not yet"], description: "Could an editor cut this as it stands?" },
    summary: { type: "string", description: "Two to four sentences: what the scene is and whether it can be cut." },
    shots: {
      type: "array",
      description: "One entry per still, in order.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["n", "type", "subject", "angle", "notes", "usable"],
        properties: {
          n: { type: "integer" },
          type: { type: "string", description: "Shot size and kind, e.g. 'wide', 'close-up', 'insert'." },
          subject: { type: "string", description: "What the shot shows." },
          angle: { type: "string", description: "e.g. 'eye level', 'high angle', 'low angle', 'overhead'." },
          notes: { type: "string", description: "Technical or continuity notes, or an empty string." },
          usable: { type: "boolean" },
        },
      },
    },
    coverage: {
      type: "array",
      description: "The coverage this scene needs, and the planned shots if any were given.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["need", "status", "shots", "note", "planned"],
        properties: {
          need: { type: "string" },
          status,
          shots: shotNumbers,
          note: { type: "string" },
          planned: { type: "boolean", description: "True when this line is from the crew's planned shot list." },
        },
      },
    },
    continuity: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["shots", "issue"],
        properties: { shots: shotNumbers, issue: { type: "string" } },
      },
    },
    pickups: {
      type: "array",
      description: "Shots to get before leaving, most important first.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["shot", "why"],
        properties: { shot: { type: "string" }, why: { type: "string" } },
      },
    },
    cut: {
      type: "object",
      additionalProperties: false,
      required: ["order", "note"],
      description: "A rough cut from the usable stills as they are.",
      properties: { order: shotNumbers, note: { type: "string" } },
    },
  },
};

// images: [{ name, bytes }] in shooting order. brief and planned are the crew's own words, possibly empty.
export async function checkCoverage(images, { brief, planned, apiKey, model }) {
  const context = [
    brief ? `What we're shooting: ${brief}` : "The crew didn't say what they're shooting; work it out from the stills.",
    planned ? `The planned shot list, one per line:\n${planned}` : "There's no planned shot list.",
    `There are ${images.length} stills.`,
  ].join("\n\n");

  const content = [{ type: "text", text: `${instructions}\n\n${context}` }];
  images.forEach((image, index) => {
    content.push({ type: "text", text: `Shot ${index + 1} (${image.name})` });
    content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${Buffer.from(image.bytes).toString("base64")}` } });
  });

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "ai-open-studio-week-4 shot list" },
    body: JSON.stringify({
      model: model || defaultModel,
      max_tokens: 8000,
      response_format: { type: "json_schema", json_schema: { name: "coverage", strict: true, schema } },
      messages: [{ role: "user", content }],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `HTTP ${response.status}`);
  const text = data.choices?.[0]?.message?.content;
  const raw = (Array.isArray(text) ? text.map((part) => part.text || "").join("") : text || "").trim();
  if (!raw) throw new Error("the model sent back nothing");
  // Some models still wrap JSON in a code fence.
  const json = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return { ...JSON.parse(json), model: data.model || model || defaultModel };
  } catch {
    throw new Error("the model's answer wasn't valid JSON");
  }
}
