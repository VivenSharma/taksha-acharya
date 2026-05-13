/**
 * biophilicEstimateGenerator.js
 * Place at: lib/pdf/biophilicEstimateGenerator.js
 *
 * Generates a Biophilic Project Estimate PDF that exactly matches the
 * KarmYog Vatika reference format (SC_Biophilic_Estimate_Apr2026.pdf):
 *
 *  PAGE 1 — Company header bar | Client + Estimate info cards
 *            | Design reference image + element key
 *            | Detailed estimate table with zone/item rows | Total band
 *
 *  PAGE 2 — Compact header | Payment schedule | What's included
 *            | Not included | Project timeline | Maintenance support
 *            | Banking details | Disclaimer | Signatory footer
 *
 * Install dependency:  npm install pdfkit
 *
 * ─── INPUT SCHEMA ─────────────────────────────────────────────────────────────
 *
 * {
 *   companyName:      string   // "KarmYog Vatika"
 *   companySubtitle:  string   // "BIOPHILIC LEARNING GARDEN INITIATIVE"
 *   companyTagline:   string   // bottom-right footer tagline on page 2
 *
 *   clientName:       string   // REQUIRED
 *   siteAddress:      string   // e.g. "Horizon 3, 501 Apartment"
 *   projectType:      string   // e.g. "Balcony Greening & Arrangement"
 *
 *   estimateDate:     string   // REQUIRED  e.g. "27 April 2026"
 *   validUntil:       string   // e.g. "27 May 2026"
 *   preparedBy:       string   // e.g. "KarmYog Vatika Team"
 *   projectRef:       string   // e.g. "KV/EST/SC/2026-04"
 *
 *   designElements:   string[] // bullet labels beside the design image
 *   designImagePath:  string   // optional: absolute path to reference image
 *
 *   lineItems: [               // main estimate table rows
 *     {
 *       zone:      string      // e.g. "Balcony 1"  (blank = continuation row)
 *       zoneSub:   string      // e.g. "Railing"
 *       itemName:  string      // bold item title
 *       subText:   string      // lighter descriptive sub-line
 *       qty:       number|null // null for lump-sum rows
 *       unit:      string      // e.g. "pcs", "sqft"
 *       qtyStr:    string      // display override, e.g. "Lump\nSum"
 *       rate:      number|null // null for lump-sum
 *       fixedAmt:  number      // used when qty/rate are null
 *     }
 *   ]
 *
 *   extraCharges: [            // rows appended after line items
 *     { description: string, amount: number }
 *   ]
 *
 *   paymentSchedule: [
 *     { pct: string, label: string, amount: number }
 *   ]
 *
 *   whatsIncluded:    string[]
 *   notIncluded:      string[]
 *   projectTimeline:  string[]   // use **text** for bold spans
 *   maintenanceSupport: string   // use **text** for bold spans, \n\n for paragraphs
 *
 *   bankingDetails: {
 *     accountHolder: string
 *     bank:          string
 *     accountNo:     string
 *     ifsc:          string
 *     upi:           string  // optional
 *   }
 *
 *   disclaimer: string
 *
 *   signatory: {
 *     name:    string
 *     title:   string
 *     contact: string
 *   }
 * }
 */

import PDFDocument from "pdfkit";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const C = {
  darkGreen:  "#3B5323",
  sageGreen:  "#5C7A3E",
  lightGreen: "#C8E890",
  gold:       "#C8A84B",
  rowAlt:     "#F2F2EE",
  border:     "#CCCCCC",
  textDark:   "#1A1A1A",
  textGray:   "#555555",
  textLight:  "#888888",
  white:      "#FFFFFF",
};

const W = 595.28;
const H = 841.89;
const M = 30;
const CW = W - M * 2;   // content width = 535.28

// ─── UTILITY ─────────────────────────────────────────────────────────────────

function rupee(n) {
  if (n == null || n === "") return "—";
  if (typeof n === "string") return n;
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function amountInWords(n) {
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight",
    "Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen",
    "Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  function two(n){ return n<20?ones[n]:tens[Math.floor(n/10)]+(n%10?" "+ones[n%10]:""); }
  function three(n){ const h=Math.floor(n/100),r=n%100; return (h?ones[h]+" Hundred":"")+(r?(h?" ":"")+two(r):""); }
  let num = Math.floor(n||0); if(!num) return "Zero Rupees Only";
  const p=[];
  if(num>=100000){p.push(three(Math.floor(num/100000))+" Lakh");num%=100000;}
  if(num>=1000){p.push(three(Math.floor(num/1000))+" Thousand");num%=1000;}
  if(num){p.push(three(num));}
  return p.join(" ")+" Rupees Only";
}

function spaced(str){ return str.split("").join("  "); }

function hline(doc, x, y, w, color=C.border, lw=0.4){
  doc.save().strokeColor(color).lineWidth(lw).moveTo(x,y).lineTo(x+w,y).stroke().restore();
}

function card(doc, x, y, w, h, r=4){
  doc.save()
     .fillColor(C.white).strokeColor(C.border).lineWidth(0.6)
     .roundedRect(x,y,w,h,r).fillAndStroke()
     .restore();
  // Left accent bar
  doc.save().fillColor(C.sageGreen).roundedRect(x,y,3,h,1).fill().restore();
}

// ─── PAGE 1: HEADER ──────────────────────────────────────────────────────────

function p1Header(doc, data){
  // Company name
  doc.font("Helvetica-Bold").fontSize(18).fillColor(C.darkGreen)
     .text(data.companyName||"KarmYog Vatika", M, 16, {lineBreak:false});

  // Spaced subtitle
  const sub = data.companySubtitle||"BIOPHILIC LEARNING GARDEN INITIATIVE";
  doc.font("Helvetica").fontSize(7).fillColor(C.sageGreen)
     .text(spaced(sub), M, 30, {lineBreak:false});

  hline(doc, M, 46, CW);

  // "ESTIMATE" gold italic — top right
  doc.font("Helvetica-BoldOblique").fontSize(26).fillColor(C.gold)
     .text("ESTIMATE", M, 12, {width:CW, align:"right", lineBreak:false});

  // Ref
  doc.font("Helvetica").fontSize(8).fillColor(C.textGray)
     .text("Ref: "+(data.projectRef||""), M, 34, {width:CW, align:"right", lineBreak:false});
}

// ─── PAGE 1: CLIENT + ESTIMATE DETAIL CARDS ───────────────────────────────────

function p1Cards(doc, data){
  const y=54, h=70, half=(CW-12)/2;

  // Left — Prepared For
  card(doc, M, y, half, h);
  doc.font("Helvetica").fontSize(6.5).fillColor(C.textLight)
     .text("PREPARED FOR", M+10, y+8, {lineBreak:false});
  doc.font("Helvetica-Bold").fontSize(13).fillColor(C.textDark)
     .text(data.clientName||"", M+10, y+18, {lineBreak:false});
  doc.font("Helvetica").fontSize(8.5).fillColor(C.textGray)
     .text(data.siteAddress||"", M+10, y+36, {lineBreak:false});
  doc.font("Helvetica").fontSize(8.5).fillColor(C.textGray)
     .text(data.projectType||"", M+10, y+49, {lineBreak:false});

  // Right — Estimate Details
  const rx = M+half+12;
  card(doc, rx, y, half, h);
  const details=[
    ["Date",         data.estimateDate||""],
    ["Valid Until",  data.validUntil||""],
    ["Prepared By",  data.preparedBy||data.companyName||""],
    ["Project Type", data.projectType||""],
  ];
  let dy = y+9;
  for(const [l,v] of details){
    doc.font("Helvetica").fontSize(8).fillColor(C.textGray)
       .text(l, rx+10, dy, {lineBreak:false});
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.textDark)
       .text(v, rx+78, dy, {lineBreak:false});
    dy+=15;
  }

  return y+h; // bottom Y
}

// ─── PAGE 1: DESIGN REFERENCE SECTION ────────────────────────────────────────

function p1Design(doc, data, topY){
  const divY = topY+10;

  // 3 decorative glyphs
  doc.font("Helvetica").fontSize(12).fillColor(C.sageGreen);
  for(const ox of [-28,0,28])
    doc.text("✾", W/2+ox-6, divY, {lineBreak:false});

  const labelY = divY+16;
  doc.font("Helvetica").fontSize(7).fillColor(C.textLight)
     .text(spaced("DESIGN REFERENCE"), M, labelY, {lineBreak:false});
  hline(doc, M, labelY+10, CW);

  const sTop = labelY+15;
  const imgW  = CW/2 - 6;
  const keyX  = M+imgW+14;
  const keyW  = CW-imgW-14;
  const elems = data.designElements||[];
  const sH    = Math.max(16+elems.length*16+10, 80);

  // Image or placeholder
  if(data.designImagePath){
    try{
      doc.image(data.designImagePath, M, sTop, {width:imgW, height:sH});
      doc.save().strokeColor(C.border).lineWidth(0.5)
         .roundedRect(M,sTop,imgW,sH,3).stroke().restore();
    } catch {
      // fallthrough to placeholder
      doc.save().fillColor(C.rowAlt).strokeColor(C.border).lineWidth(0.5)
         .roundedRect(M,sTop,imgW,sH,3).fillAndStroke().restore();
      doc.font("Helvetica-Oblique").fontSize(8).fillColor(C.textLight)
         .text("Design Reference Image", M, sTop+sH/2-5, {width:imgW, align:"center", lineBreak:false});
    }
  } else {
    doc.save().fillColor(C.rowAlt).strokeColor(C.border).lineWidth(0.5)
       .roundedRect(M,sTop,imgW,sH,3).fillAndStroke().restore();
    doc.font("Helvetica-Oblique").fontSize(8).fillColor(C.textLight)
       .text("Design Reference Image", M, sTop+sH/2-5, {width:imgW, align:"center", lineBreak:false});
  }

  // Element Key
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.textDark)
     .text("Element Key", keyX, sTop, {lineBreak:false});

  let ey = sTop+16;
  for(let i=0;i<elems.length;i++){
    // Numbered circle
    doc.save().fillColor(C.darkGreen).circle(keyX+7, ey+4.5, 6).fill().restore();
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(C.white)
       .text(String(i+1), keyX+4, ey+2, {lineBreak:false});
    doc.font("Helvetica").fontSize(8.5).fillColor(C.textDark)
       .text(elems[i], keyX+17, ey+2, {width:keyW-20, lineBreak:false});
    ey+=16;
  }

  return sTop+sH; // bottom of this section
}

// ─── PAGE 1: DETAILED ESTIMATE TABLE ─────────────────────────────────────────

function p1Table(doc, data, topY){
  // Section label
  doc.font("Helvetica").fontSize(7).fillColor(C.textLight)
     .text(spaced("DETAILED ESTIMATE"), M, topY+2, {lineBreak:false});
  hline(doc, M, topY+12, CW);

  let y = topY+16;

  // Column config
  const COLS = [
    {label:"#",                 w:20,  align:"center"},
    {label:"ZONE /\nLOCATION",  w:72,  align:"left"},
    {label:"ITEM",              w:210, align:"left"},
    {label:"QTY",               w:55,  align:"right"},
    {label:"RATE\n(Rs.)",       w:62,  align:"right"},
    {label:"AMOUNT\n(Rs.)",     w:68,  align:"right"},  // 20+72+210+55+62+68 = 487 ≈ CW
  ];
  const colX = COLS.map((_,i)=>M+COLS.slice(0,i).reduce((s,c)=>s+c.w,0));

  const HEADER_H = 24;
  const ROW_H    = 22;
  const SUB_H    = 11;

  function drawHeader(){
    doc.save().fillColor(C.darkGreen).rect(M, y, CW, HEADER_H).fill().restore();
    COLS.forEach((col,i)=>{
      const lines = col.label.split("\n");
      lines.forEach((line,li)=>{
        const ly = y + 7 - (lines.length-1)*3.5 + li*8;
        doc.font("Helvetica-Bold").fontSize(7).fillColor(C.white);
        if(col.align==="right"){
          doc.text(line, colX[i]+3, ly, {width:col.w-6, align:"right", lineBreak:false});
        } else if(col.align==="center"){
          doc.text(line, colX[i], ly, {width:col.w, align:"center", lineBreak:false});
        } else {
          doc.text(line, colX[i]+4, ly, {lineBreak:false});
        }
      });
    });
    y += HEADER_H;
  }

  drawHeader();

  let total = 0;
  let rowNum = 0;

  for(const item of (data.lineItems||[])){
    rowNum++;
    const amount = (item.qty!=null && item.rate!=null)
      ? item.qty * item.rate
      : (item.fixedAmt ?? null);
    if(amount!=null) total += amount;

    const rowH = ROW_H + (item.subText ? SUB_H : 0);

    // Page break
    if(y+rowH > H-80){
      doc.addPage({size:"A4", margins:{top:0,bottom:0,left:0,right:0}});
      p2HeaderBand(doc, data);
      y = 55;
      drawHeader();
    }

    // Alternating row
    if(rowNum%2===0){
      doc.save().fillColor(C.rowAlt).rect(M, y, CW, rowH).fill().restore();
    }
    hline(doc, M, y+rowH, CW, C.border, 0.3);

    const midY = y + (rowH/2) - 5;

    // # col
    doc.font("Helvetica").fontSize(8).fillColor(C.textGray)
       .text(String(rowNum), colX[0], midY, {width:COLS[0].w, align:"center", lineBreak:false});

    // Zone/Location
    if(item.zone){
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.textDark)
         .text(item.zone, colX[1]+3, y+6, {width:COLS[1].w-6, lineBreak:false});
    }
    if(item.zoneSub){
      doc.font("Helvetica").fontSize(7.5).fillColor(C.textLight)
         .text(item.zoneSub, colX[1]+3, y+16, {width:COLS[1].w-6, lineBreak:false});
    }

    // Item name + sub text
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(C.textDark)
       .text(item.itemName||"", colX[2]+4, y+6, {width:COLS[2].w-8, lineBreak:false});
    if(item.subText){
      doc.font("Helvetica").fontSize(7.5).fillColor(C.textGray)
         .text(item.subText, colX[2]+4, y+17, {width:COLS[2].w-8, lineBreak:false});
    }

    // Qty
    const qtyLines = (item.qtyStr||"").split("\n");
    qtyLines.forEach((ql,qi)=>{
      doc.font("Helvetica").fontSize(8.5).fillColor(C.textDark)
         .text(ql, colX[3]+3, y+6+qi*9, {width:COLS[3].w-6, align:"right", lineBreak:false});
    });

    // Rate
    doc.font("Helvetica").fontSize(8.5).fillColor(C.textDark)
       .text(item.rate!=null?rupee(item.rate):"—",
             colX[4]+3, midY, {width:COLS[4].w-6, align:"right", lineBreak:false});

    // Amount
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(C.textDark)
       .text(amount!=null?rupee(amount):"—",
             colX[5]+3, midY, {width:COLS[5].w-6, align:"right", lineBreak:false});

    y += rowH;
  }

  // Extra charge rows (transport, installation)
  for(const extra of (data.extraCharges||[])){
    rowNum++;
    total += extra.amount||0;
    if(y+ROW_H > H-80){
      doc.addPage({size:"A4", margins:{top:0,bottom:0,left:0,right:0}});
      p2HeaderBand(doc, data);
      y = 55;
      drawHeader();
    }
    if(rowNum%2===0){
      doc.save().fillColor(C.rowAlt).rect(M, y, CW, ROW_H).fill().restore();
    }
    hline(doc, M, y+ROW_H, CW, C.border, 0.3);
    doc.font("Helvetica").fontSize(8.5).fillColor(C.textDark)
       .text(extra.description||"", colX[2]+4, y+7, {lineBreak:false});
    doc.font("Helvetica").fontSize(8).fillColor(C.textGray)
       .text("—", colX[4]+3, y+7, {width:COLS[4].w-6, align:"right", lineBreak:false});
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(C.textDark)
       .text(rupee(extra.amount), colX[5]+3, y+7, {width:COLS[5].w-6, align:"right", lineBreak:false});
    y += ROW_H;
  }

  // ── Total band ──
  doc.save().fillColor(C.darkGreen).rect(M, y, CW, 30).fill().restore();
  doc.font("Helvetica-BoldOblique").fontSize(8).fillColor(C.white)
     .text(amountInWords(total), M+8, y+5, {lineBreak:false});
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.white)
     .text("TOTAL ESTIMATE", M+8, y+17, {lineBreak:false});
  doc.font("Helvetica-Bold").fontSize(13).fillColor(C.lightGreen)
     .text("Rs. "+rupee(total), M, y+10, {width:CW-8, align:"right", lineBreak:false});
  y += 30;

  // Page 1 footer text
  doc.font("Helvetica").fontSize(7).fillColor(C.textLight)
     .text("PAGE 1 OF 2  •  "+(data.projectRef||""), M, y+8,
           {width:CW, align:"center", lineBreak:false});

  return total;
}

// ─── PAGE 2: HEADER BAND ─────────────────────────────────────────────────────

function p2HeaderBand(doc, data){
  doc.font("Helvetica-Bold").fontSize(11).fillColor(C.darkGreen)
     .text(data.companyName||"", M, 16, {lineBreak:false});
  const ref = `Estimate Ref: ${data.projectRef||""}  |  ${data.clientName||""}`;
  doc.font("Helvetica").fontSize(7.5).fillColor(C.textGray)
     .text(ref, M, 18, {width:CW, align:"right", lineBreak:false});
  hline(doc, M, 30, CW);
}

// ─── PAGE 2: FULL CONTENT ────────────────────────────────────────────────────

function drawPage2(doc, data){
  p2HeaderBand(doc, data);

  const half = (CW-12)/2;
  const rx   = M+half+12;
  let y = 44;

  const ps = data.paymentSchedule  || [];
  const wi = data.whatsIncluded    || [];
  const ni = data.notIncluded      || [];
  const tl = data.projectTimeline  || [];
  const ms = data.maintenanceSupport || "";
  const bank = data.bankingDetails || null;
  const sig  = data.signatory      || {};

  // ── Row 1: Payment Schedule | What's Included ──
  const psH = 26+ps.length*22+8;
  const wiH = 24+wi.length*13+8;
  const r1H = Math.max(psH, wiH);

  card(doc, M,  y, half, r1H);
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.textDark)
     .text("Payment Schedule", M+10, y+10, {lineBreak:false});
  hline(doc, M+10, y+22, half-18, C.border, 0.3);
  let py = y+28;
  for(const row of ps){
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(C.sageGreen)
       .text(row.pct||"", M+10, py, {lineBreak:false});
    doc.font("Helvetica").fontSize(8).fillColor(C.textGray)
       .text(row.label||"", M+38, py, {width:half-110, lineBreak:false});
    const amtT = "Rs. "+rupee(row.amount);
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(C.textDark);
    const aw = doc.widthOfString(amtT);
    doc.text(amtT, M+half-8-aw, py, {lineBreak:false});
    py+=22;
  }

  card(doc, rx, y, half, r1H);
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.textDark)
     .text("What's Included", rx+10, y+10, {lineBreak:false});
  hline(doc, rx+10, y+22, half-18, C.border, 0.3);
  let wy = y+28;
  for(const item of wi){
    doc.save().fillColor(C.sageGreen).circle(rx+14, wy+4, 2.5).fill().restore();
    doc.font("Helvetica").fontSize(8).fillColor(C.textDark)
       .text(item, rx+20, wy, {lineBreak:false});
    wy+=13;
  }
  y += r1H+12;

  // ── Not Included ──
  if(ni.length){
    const perCol = Math.ceil(ni.length/2);
    const niH = 24+perCol*13+8;
    card(doc, M, y, CW, niH);
    doc.font("Helvetica-BoldOblique").fontSize(9).fillColor(C.textDark)
       .text("Not Included (Unless Specified)", M+10, y+10, {lineBreak:false});
    hline(doc, M+10, y+22, CW-18, C.border, 0.3);
    const cw2 = (CW-20)/2;
    let ny = y+28;
    for(let i=0;i<ni.length;i++){
      const nx = M+10+(i%2)*(cw2+10);
      if(i%2===0 && i>0) ny+=13;
      doc.save().strokeColor(C.textLight).lineWidth(0.8).circle(nx+4, ny+4, 2).stroke().restore();
      doc.font("Helvetica").fontSize(8).fillColor(C.textGray)
         .text(ni[i], nx+10, ny, {width:cw2-14, lineBreak:false});
    }
    y += niH+12;
  }

  // ── Row 3: Project Timeline | Maintenance Support ──
  const tlH = 24+tl.length*14+8;
  // Measure maintenance height
  const msParas = ms.split("\n\n");
  let msLineCount = 0;
  for(const para of msParas){
    const plain = para.replace(/\*\*/g,"");
    const est = Math.ceil(plain.length / 42); // rough line estimate
    msLineCount += Math.max(est,1);
  }
  const msH = 24+msLineCount*12+msParas.length*6+8;
  const r3H = Math.max(tlH, msH);

  card(doc, M, y, half, r3H);
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.textDark)
     .text("Project Timeline", M+10, y+10, {lineBreak:false});
  hline(doc, M+10, y+22, half-18, C.border, 0.3);
  let ty = y+28;
  for(const line of tl){
    doc.save().fillColor(C.sageGreen).circle(M+14, ty+4, 2.5).fill().restore();
    // Bold spans
    let cx = M+20;
    for(const part of line.split(/(\*\*[^*]+\*\*)/)){
      const isBold = part.startsWith("**");
      const txt = isBold ? part.slice(2,-2) : part;
      const fn = isBold ? "Helvetica-Bold" : "Helvetica";
      doc.font(fn).fontSize(8).fillColor(C.textDark).text(txt, cx, ty, {lineBreak:false});
      cx += doc.widthOfString(txt);
    }
    ty+=14;
  }

  card(doc, rx, y, half, r3H);
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.textDark)
     .text("Maintenance Support", rx+10, y+10, {lineBreak:false});
  hline(doc, rx+10, y+22, half-18, C.border, 0.3);
  let my = y+28;
  for(const para of msParas){
    const parts = para.split(/(\*\*[^*]+\*\*)/);
    let cx = rx+10;
    for(const part of parts){
      const isBold = part.startsWith("**");
      const txt = isBold ? part.slice(2,-2) : part;
      const fn = isBold ? "Helvetica-Bold" : "Helvetica";
      const maxW = rx+half-8-cx;
      doc.font(fn).fontSize(8).fillColor(C.textDark);
      if(doc.widthOfString(txt) > maxW && cx > rx+10){
        my += 12; cx = rx+10;
      }
      doc.text(txt, cx, my, {lineBreak:false});
      cx += doc.widthOfString(txt);
    }
    my += 14;
  }
  y += r3H+12;

  // ── Banking Details ──
  if(bank){
    const bkH = 74;
    card(doc, M, y, CW, bkH);
    doc.font("Helvetica-BoldOblique").fontSize(9.5).fillColor(C.textDark)
       .text("Banking Details for Payment", M+10, y+10, {lineBreak:false});
    hline(doc, M+10, y+22, CW-18, C.border, 0.3);
    const bfields=[
      ["Account Holder", bank.accountHolder||""],
      ["Bank",           bank.bank||""],
      ["Account No.",    bank.accountNo||""],
      ["IFSC Code",      bank.ifsc||""],
    ];
    let by = y+28;
    for(const [l,v] of bfields){
      doc.font("Helvetica").fontSize(8).fillColor(C.textLight)
         .text(l, M+10, by, {lineBreak:false});
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.textDark)
         .text(v, M+90, by, {lineBreak:false});
      by+=11;
    }
    if(bank.upi){
      doc.font("Helvetica").fontSize(7).fillColor(C.textLight)
         .text("SCAN & PAY", M+CW-70, y+28, {lineBreak:false});
      doc.font("Helvetica").fontSize(6.5).fillColor(C.textGray)
         .text(bank.upi, M+CW-70, y+38, {width:65, lineBreak:true});
    }
    y += bkH+12;
  }

  // ── Disclaimer ──
  if(data.disclaimer){
    doc.font("Helvetica-Oblique").fontSize(7).fillColor(C.textLight)
       .text(data.disclaimer, M, y, {width:CW, align:"center"});
    y = doc.y+10;
  }

  // ── Signatory footer ──
  const fy = H-50;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.textDark)
     .text(sig.name||"", M, fy, {lineBreak:false});
  doc.font("Helvetica-Oblique").fontSize(8).fillColor(C.sageGreen)
     .text(sig.title||"", M, fy+12, {lineBreak:false});
  doc.font("Helvetica").fontSize(7.5).fillColor(C.textGray)
     .text(sig.contact||"", M, fy+23, {lineBreak:false});

  doc.font("Helvetica-BoldOblique").fontSize(14).fillColor(C.darkGreen)
     .text(data.companyName||"", M, fy+6, {width:CW, align:"right", lineBreak:false});
  if(data.companyTagline){
    doc.font("Helvetica").fontSize(7).fillColor(C.textGray)
       .text(data.companyTagline, M, fy+22, {width:CW, align:"right", lineBreak:false});
  }
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

/**
 * generateBiophilicEstimatePDF(data)
 *
 * @param   {object}          data  — see schema at top of file
 * @returns {Promise<Buffer>}        — ready to stream as application/pdf
 */
export async function generateBiophilicEstimatePDF(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      info: {
        Title:   `Estimate – ${data.projectRef || data.clientName || ""}`,
        Author:  data.companyName || "KarmYog Vatika",
        Subject: "Biophilic Project Estimate",
      },
    });

    const chunks = [];
    doc.on("data",  c   => chunks.push(c));
    doc.on("end",   ()  => resolve(Buffer.concat(chunks)));
    doc.on("error", err => reject(err));

    // ── PAGE 1 ──
    p1Header(doc, data);
    const afterCards  = p1Cards(doc, data);
    const afterDesign = p1Design(doc, data, afterCards);
    p1Table(doc, data, afterDesign + 4);

    // ── PAGE 2 ──
    doc.addPage({ size: "A4", margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    drawPage2(doc, data);

    doc.end();
  });
}
