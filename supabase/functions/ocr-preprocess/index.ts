// BEGIN OCR_PREPROCESS
import initOpenCV from "npm:opencv-wasm@4.3.0-10";
import { createClient } from "npm:@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const cv = await initOpenCV();

function parseStorageUrl(fileUrl: string): { bucket: string; path: string } {
  const u = new URL(fileUrl);
  const segments = u.pathname.split("/");
  const objectIndex = segments.indexOf("object");
  const bucket = segments[objectIndex + 2];
  const path = segments.slice(objectIndex + 3).join("/");
  return { bucket, path };
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (url.searchParams.get("health") === "1") {
    return new Response(
      JSON.stringify({ status: "ok" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const dryRun = url.searchParams.get("dryRun") === "1";

  let body: { fileUrl?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.fileUrl) {
    return new Response(JSON.stringify({ error: "Missing fileUrl" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { bucket, path } = parseStorageUrl(body.fileUrl);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase credentials" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (dryRun) {
    return new Response(
      JSON.stringify({ dryRun: true, fileUrl: body.fileUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let processedUrl = "";
  try {
    const response = await fetch(body.fileUrl);
    const buffer = new Uint8Array(await response.arrayBuffer());
    const src = cv.imdecode(buffer);

    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    const denoised = new cv.Mat();
    cv.GaussianBlur(gray, denoised, new cv.Size(5, 5), 0);

    const thresh = new cv.Mat();
    cv.adaptiveThreshold(
      denoised,
      thresh,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      41,
      10,
    );

    const inverted = new cv.Mat();
    cv.bitwise_not(thresh, inverted);
    const coords = new cv.Mat();
    cv.findNonZero(inverted, coords);
    const rect = cv.minAreaRect(coords);
    let angle = rect.angle;
    if (angle < -45) angle += 90;
    const center = new cv.Point(src.cols / 2, src.rows / 2);
    const M = cv.getRotationMatrix2D(center, angle, 1);
    const rotated = new cv.Mat();
    cv.warpAffine(thresh, rotated, M, new cv.Size(src.cols, src.rows), cv.INTER_CUBIC, cv.BORDER_REPLICATE);

    const png = cv.imencode(".png", rotated);

    src.delete();
    gray.delete();
    denoised.delete();
    thresh.delete();
    inverted.delete();
    coords.delete();
    rotated.delete();

    const supabase = createClient(supabaseUrl, supabaseKey);
    const processedPath = path.replace(/(\.[^.]*)?$/, "_processed$1");
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(processedPath, png, {
        contentType: "image/png",
        upsert: true,
        metadata: { original: path },
      });
    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(processedPath);
    processedUrl = data.publicUrl;
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ processedUrl }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
// END OCR_PREPROCESS
