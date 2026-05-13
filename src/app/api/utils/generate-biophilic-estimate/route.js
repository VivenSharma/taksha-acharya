// POST /api/utils/generate-biophilic-estimate
// Next.js App Router route handler
// Place this file at: app/api/utils/generate-biophilic-estimate/route.js
//
// If you're using the Pages Router (pages/api/), use the file:
//   pages/api/utils/generate-biophilic-estimate.js
//   and replace the export with the Pages Router version at the bottom of this file.

import { NextResponse } from "next/server";
import { generateBiophilicEstimatePDF } from "@/lib/pdf/biophilicEstimateGenerator";

export const runtime = "nodejs"; // Required: pdfkit needs Node.js runtime, not Edge

/**
 * POST /api/utils/generate-biophilic-estimate
 *
 * Accepts a JSON body with project estimate details.
 * Returns a downloadable PDF file.
 *
 * See biophilicEstimateGenerator.js for full schema documentation.
 */
export async function POST(request) {
  try {
    const body = await request.json();

    // Basic validation
    const required = ["projectName", "clientName", "siteAddress", "estimateDate"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Generate the PDF buffer
    const pdfBuffer = await generateBiophilicEstimatePDF(body);

    // Build a clean filename
    const safeName = body.projectName.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `Biophilic_Estimate_${safeName}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("[generate-biophilic-estimate] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: err.message },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGES ROUTER VERSION
// If your project uses pages/api/ instead of app/api/, replace the entire
// file contents with this:
// ─────────────────────────────────────────────────────────────────────────────
//
// import { generateBiophilicEstimatePDF } from "@/lib/pdf/biophilicEstimateGenerator";
//
// export default async function handler(req, res) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method Not Allowed" });
//   }
//   try {
//     const required = ["projectName", "clientName", "siteAddress", "estimateDate"];
//     for (const field of required) {
//       if (!req.body[field]) {
//         return res.status(400).json({ error: `Missing required field: ${field}` });
//       }
//     }
//     const pdfBuffer = await generateBiophilicEstimatePDF(req.body);
//     const safeName = req.body.projectName.replace(/[^a-zA-Z0-9]/g, "_");
//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader("Content-Disposition", `attachment; filename="Biophilic_Estimate_${safeName}.pdf"`);
//     res.send(pdfBuffer);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to generate PDF" });
//   }
// }
