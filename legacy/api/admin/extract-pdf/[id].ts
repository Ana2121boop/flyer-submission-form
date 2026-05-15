// api/admin/extract-pdf/[id].ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';

const connectionString = process.env.DATABASE_POSTGRES_URL;
const jwtSecret = process.env.JWT_SECRET;

const pool = new Pool({
  connectionString: connectionString ? `${connectionString}?sslmode=require` : undefined,
});

// Helper function to safely access nested properties
const get = (obj: any, path: string, defaultValue: any = 'N/A') => {
  if (typeof path !== 'string') return defaultValue;
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    result = result?.[key];
    if (result === undefined || result === null) {
      return defaultValue;
    }
  }
  return result;
};

// Helper function to format dates (YYYY-MM-DD)
function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return 'N/A';
    try {
        const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
        if (!year || !month || !day ) return 'Invalid Date Parts';
        const date = new Date(Date.UTC(year, month - 1, day));
        if (isNaN(date.getTime())) return 'Invalid Date Object';

        const y = date.getUTCFullYear();
        const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const d = date.getUTCDate().toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
    } catch (e) {
        console.error("Error formatting date:", dateStr, e);
        return 'Invalid Date Format';
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!connectionString || !jwtSecret) {
    console.error("Config Error: Missing DB URL or JWT Secret for PDF extraction");
    return res.status(500).json({ message: "Internal Server Error: Configuration issue." });
  }

  let adminUserPayload;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing or invalid token format.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload & { userId: number; username: string; role: string };
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required.' });
    }
    adminUserPayload = decoded;
    console.log(`Admin user ${adminUserPayload.username} attempting PDF extraction for submission ID: ${req.query.id}.`);
  } catch (error: any) {
    console.error('JWT Verification failed for PDF extraction:', error.message);
    return res.status(401).json({ message: `Unauthorized: ${error.message}` });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Bad Request: Missing or invalid submission ID.' });
  }
  const submissionId = parseInt(id, 10);
  if (isNaN(submissionId)) {
    return res.status(400).json({ message: 'Bad Request: Submission ID must be a number.' });
  }

  try {
    console.log(`Fetching submission data for ID: ${submissionId} for PDF generation.`);
    const submissionQuery = 'SELECT form_data, submitted_at FROM submissions WHERE id = $1';
    const submissionResult = await pool.query(submissionQuery, [submissionId]);

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ message: `Submission with ID ${submissionId} not found.` });
    }

    const submissionRecord = submissionResult.rows[0];
    const formData = submissionRecord.form_data;
    const submittedAt = submissionRecord.submitted_at ? new Date(submissionRecord.submitted_at).toLocaleString() : 'N/A';

    console.log(`Fetched formData for PDF (ID: ${submissionId}):\n${JSON.stringify(formData, null, 2)}`);

    const pdfDoc = await PDFDocument.create();
    let currentPage: PDFPage = pdfDoc.addPage();
    let pageHeight = currentPage.getHeight();

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const black = rgb(0, 0, 0);
    const blue = rgb(0.149, 0.251, 0.561);

    let yPosition = pageHeight - 50;
    const xMargin = 50;
    const lineSpacing = 18; 
    const sectionSpacing = 25;
    const titleFontSize = 18;
    const headingFontSize = 14;
    const textFontSize = 10;
    const smallTextFontSize = 8;
    const contentBottomMargin = 50;
    const imageMaxHeight = 80;
    const imagePaddingTop = 5;     
    const imagePaddingBottom = 12; 

    const addNewPageIfNeeded = (spaceNeeded = lineSpacing) => {
        if (yPosition - spaceNeeded < contentBottomMargin) {
            currentPage = pdfDoc.addPage();
            pageHeight = currentPage.getHeight();
            yPosition = pageHeight - xMargin; 
            return true;
        }
        return false;
    };

    const drawTextLine = (text: string, font: PDFFont, size: number, xOffset = 0, color = black) => {
      addNewPageIfNeeded(size + 4);
      currentPage.drawText(text, {
        x: xMargin + xOffset,
        y: yPosition, 
        font: font,
        size: size,
        color: color,
      });
      yPosition -= (size + 4); 
    };
    
    const moveY = (amount: number) => { 
        yPosition -= amount;
        addNewPageIfNeeded(0); 
    };

    drawTextLine(`Flyer Submission Details - ID: ${submissionId}`, helveticaBoldFont, titleFontSize, 0, blue);
    moveY(lineSpacing / 2);
    drawTextLine(`Submitted At: ${submittedAt}`, helveticaFont, textFontSize);
    moveY(sectionSpacing);

    drawTextLine('Store Information', helveticaBoldFont, headingFontSize, 0, blue);
    moveY(5);
    drawTextLine(`Store Name: ${get(formData, 'storeName')}`, helveticaFont, textFontSize);
    drawTextLine(`Submitted By: ${get(formData, 'submittedBy')}`, helveticaFont, textFontSize);
    drawTextLine(`Flyer Start Date: ${formatDate(get(formData, 'flyerValidStartDate'))}`, helveticaFont, textFontSize);
    drawTextLine(`Flyer End Date: ${formatDate(get(formData, 'flyerValidEndDate'))}`, helveticaFont, textFontSize);
    drawTextLine(`Canada Post Flyer: ${get(formData, 'canadaPostFlyer') ? 'Yes' : 'No'}`, helveticaFont, textFontSize);
    drawTextLine(`Digital/In-Store Flyer: ${get(formData, 'digitalInStoreFlyer') ? 'Yes' : 'No'}`, helveticaFont, textFontSize);
    drawTextLine('General Notes:', helveticaBoldFont, textFontSize);
    const generalNotes = get(formData, 'generalNotes', 'No general notes provided.');
    generalNotes.split('\n').forEach((line: string) => {
        if (line.trim()) drawTextLine(line, helveticaFont, textFontSize, 10);
    });
    moveY(sectionSpacing);

    const productsByPage = get(formData, 'productsByPage', null); 
    
    if (Array.isArray(productsByPage) && productsByPage.length > 0) {
        drawTextLine('Products by Page', helveticaBoldFont, headingFontSize, 0, blue);
        moveY(5); 
        // *** CHANGED from forEach to for...of to allow await inside ***
        let pageIndex = 0;
        for (const pageData of productsByPage) {
            if (pageIndex > 0) moveY(lineSpacing); 
            addNewPageIfNeeded(headingFontSize + 4 + lineSpacing);
            drawTextLine(`Page ${get(pageData, 'pageNumber', 'N/A')}`, helveticaBoldFont, textFontSize + 2, 0);
            moveY(5);

            const productsOnThisPage = get(pageData, 'products', []);
            if (Array.isArray(productsOnThisPage) && productsOnThisPage.length > 0) {
                for (const product of productsOnThisPage) {
                    addNewPageIfNeeded(textFontSize + 4 + imagePaddingTop + imageMaxHeight + imagePaddingBottom + (smallTextFontSize + 4) * 5);
                    drawTextLine(`- Product: ${get(product, 'productName')} (Brand: ${get(product, 'brandName')})`, helveticaFont, textFontSize, 10);
                    const imageUrl = get(product, 'imageDataUrl', null);
                    let imageDrawnAndSpaced = false;

                    if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('data:image/')) {
                        moveY(imagePaddingTop);
                        try {
                            const imageType = imageUrl.substring(imageUrl.indexOf('/') + 1, imageUrl.indexOf(';'));
                            const base64Data = imageUrl.split(',')[1];
                            const imageBytes = Buffer.from(base64Data, 'base64');
                            let embeddedImage;
                            if (imageType === 'jpeg' || imageType === 'jpg') embeddedImage = await pdfDoc.embedJpg(imageBytes); // Await is fine here
                            else if (imageType === 'png') embeddedImage = await pdfDoc.embedPng(imageBytes); // Await is fine here
                            else drawTextLine(`  (Unsupported image type: ${imageType})`, helveticaFont, smallTextFontSize, 15);

                            if (embeddedImage) {
                                const aspectRatio = embeddedImage.width / embeddedImage.height;
                                let imgHeight = imageMaxHeight; let imgWidth = imgHeight * aspectRatio;
                                if (imgWidth > (currentPage.getWidth() - 2 * xMargin - 15 - 10) ) { imgWidth = currentPage.getWidth() - 2 * xMargin - 15 - 10; imgHeight = imgWidth / aspectRatio; }
                                addNewPageIfNeeded(imgHeight); 
                                currentPage.drawImage(embeddedImage, { x: xMargin + 15, y: yPosition - imgHeight, width: imgWidth, height: imgHeight });
                                yPosition -= (imgHeight + imagePaddingBottom); addNewPageIfNeeded(0); 
                                imageDrawnAndSpaced = true;
                            }
                        } catch (e:any) { console.error("Img embed error:", e.message); drawTextLine(`  (Err embedding img)`, helveticaFont, smallTextFontSize, 15); imageDrawnAndSpaced = true; }
                    } else if (get(product, 'requestStockImage')) { drawTextLine(`  (Stock Image Requested)`, helveticaFont, smallTextFontSize, 15); imageDrawnAndSpaced = true; }
                    else { moveY(smallTextFontSize / 2); }

                    if (get(product, 'sku', '') !== 'N/A' && get(product, 'sku', '') !== '') drawTextLine(`  SKU: ${get(product, 'sku')}`, helveticaFont, smallTextFontSize, 15);
                    drawTextLine(`  Category: ${get(product, 'category')}`, helveticaFont, smallTextFontSize, 15);
                    drawTextLine(`  Regular Price: $${Number(get(product, 'regularPrice', 0)).toFixed(2)}`, helveticaFont, smallTextFontSize, 15);
                    drawTextLine(`  Sale Price: $${Number(get(product, 'salePrice', 0)).toFixed(2)}`, helveticaFont, smallTextFontSize, 15);
                    if (get(product, 'discountPercent', '') !== 'N/A' && get(product, 'discountPercent', '') !== '') drawTextLine(`  Discount: ${get(product, 'discountPercent')}`, helveticaFont, smallTextFontSize, 15);
                    if (get(product, 'manualDiscountDescription', '') !== 'N/A' && get(product, 'manualDiscountDescription', '') !== '') drawTextLine(`  Manual Discount: ${get(product, 'manualDiscountDescription')}`, helveticaFont, smallTextFontSize, 15);
                    if (get(product, 'description', '') !== 'N/A' && get(product, 'description', '') !== '') {
                        const descLines = get(product, 'description').match(/.{1,80}/g) || []; 
                        descLines.forEach((line: string) => drawTextLine(`  Desc: ${line}`, helveticaFont, smallTextFontSize, 15));
                    }
                    moveY(lineSpacing / 2); 
                }
            } else { drawTextLine('  No products on this page.', helveticaFont, textFontSize, 10); }
            pageIndex++; // Increment pageIndex for the for...of loop
        }
    } else { 
        const flatProductsList = get(formData, 'products', []);
        if (Array.isArray(flatProductsList) && flatProductsList.length > 0) {
            drawTextLine('Products (Unpaged)', helveticaBoldFont, headingFontSize, 0, blue);
            moveY(5);
            for (const product of flatProductsList) {
                addNewPageIfNeeded(textFontSize + 4 + imagePaddingTop + imageMaxHeight + imagePaddingBottom + (smallTextFontSize + 4) * 5);
                drawTextLine(`- Product: ${get(product, 'productName')} (Brand: ${get(product, 'brandName')})`, helveticaFont, textFontSize, 10);
                const imageUrl = get(product, 'imageDataUrl', null);
                if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('data:image/')) {
                    moveY(imagePaddingTop);
                    try {
                        const imageType = imageUrl.substring(imageUrl.indexOf('/') + 1, imageUrl.indexOf(';'));
                        const base64Data = imageUrl.split(',')[1];
                        const imageBytes = Buffer.from(base64Data, 'base64');
                        let embeddedImage;
                        if (imageType === 'jpeg' || imageType === 'jpg') embeddedImage = await pdfDoc.embedJpg(imageBytes);
                        else if (imageType === 'png') embeddedImage = await pdfDoc.embedPng(imageBytes);
                        else drawTextLine(`  (Unsupported image type: ${imageType})`, helveticaFont, smallTextFontSize, 15);

                        if (embeddedImage) {
                            const aspectRatio = embeddedImage.width / embeddedImage.height;
                            let imgHeight = imageMaxHeight; let imgWidth = imgHeight * aspectRatio;
                            if (imgWidth > (currentPage.getWidth() - 2 * xMargin - 15 - 10) ) { imgWidth = currentPage.getWidth() - 2 * xMargin - 15 - 10; imgHeight = imgWidth / aspectRatio; }
                            addNewPageIfNeeded(imgHeight); 
                            currentPage.drawImage(embeddedImage, { x: xMargin + 15, y: yPosition - imgHeight, width: imgWidth, height: imgHeight });
                            yPosition -= (imgHeight + imagePaddingBottom); addNewPageIfNeeded(0); 
                        }
                    } catch (e:any) { console.error("Img embed error (fallback):", e.message); drawTextLine(`  (Err embedding img)`, helveticaFont, smallTextFontSize, 15); }
                } else if (get(product, 'requestStockImage')) { drawTextLine(`  (Stock Image Requested)`, helveticaFont, smallTextFontSize, 15); }
                else { moveY(smallTextFontSize / 2); }

                if (get(product, 'sku', '') !== 'N/A' && get(product, 'sku', '') !== '') drawTextLine(`  SKU: ${get(product, 'sku')}`, helveticaFont, smallTextFontSize, 15);
                drawTextLine(`  Category: ${get(product, 'category')}`, helveticaFont, smallTextFontSize, 15);
                drawTextLine(`  Regular Price: $${Number(get(product, 'regularPrice', 0)).toFixed(2)}`, helveticaFont, smallTextFontSize, 15);
                drawTextLine(`  Sale Price: $${Number(get(product, 'salePrice', 0)).toFixed(2)}`, helveticaFont, smallTextFontSize, 15);
                if (get(product, 'discountPercent', '') !== 'N/A' && get(product, 'discountPercent', '') !== '') drawTextLine(`  Discount: ${get(product, 'discountPercent')}`, helveticaFont, smallTextFontSize, 15);
                if (get(product, 'manualDiscountDescription', '') !== 'N/A' && get(product, 'manualDiscountDescription', '') !== '') drawTextLine(`  Manual Discount: ${get(product, 'manualDiscountDescription')}`, helveticaFont, smallTextFontSize, 15);
                if (get(product, 'description', '') !== 'N/A' && get(product, 'description', '') !== '') {
                    const descLines = get(product, 'description').match(/.{1,80}/g) || []; 
                    descLines.forEach((line: string) => drawTextLine(`  Desc: ${line}`, helveticaFont, smallTextFontSize, 15));
                }
                moveY(lineSpacing / 2);
            }
        } else {
            drawTextLine('No product data found.', helveticaFont, textFontSize);
        }
    }
    moveY(sectionSpacing);

    drawTextLine('Social Media Selections', helveticaBoldFont, headingFontSize, 0, blue);
    moveY(5);
    const socialSelections = get(formData, 'socialMediaItems', []); 
    if (Array.isArray(socialSelections) && socialSelections.length > 0) {
      socialSelections.forEach((social: any) => {
        drawTextLine(`- ${get(social, 'productName')}`, helveticaFont, textFontSize, 10); 
      });
    } else {
      drawTextLine('No products selected for social media.', helveticaFont, textFontSize);
    }
    moveY(sectionSpacing);

    drawTextLine('Print Material Requests', helveticaBoldFont, headingFontSize, 0, blue);
    moveY(5);
    const printRequests = get(formData, 'printRequests', {});
    drawTextLine(`Price Tags: ${get(printRequests, 'priceTags') ? 'Yes' : 'No'}`, helveticaFont, textFontSize);
    drawTextLine(`Posters: ${get(printRequests, 'posters') ? 'Yes' : 'No'}`, helveticaFont, textFontSize);
    drawTextLine(`In-store Signage: ${get(printRequests, 'inStoreSignage') ? 'Yes' : 'No'}`, helveticaFont, textFontSize);
    drawTextLine('Print Notes:', helveticaBoldFont, textFontSize);
    const printNotes = get(printRequests, 'notes', 'No specific print notes.');
    printNotes.split('\n').forEach((line: string) => {
        if (line.trim()) drawTextLine(line, helveticaFont, textFontSize, 10);
    });

    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="submission-${submissionId}.pdf"`);
    console.log(`Successfully generated PDF for submission ID: ${submissionId}. Sending to client.`);
    return res.status(200).send(Buffer.from(pdfBytes));

  } catch (error: any) {
    console.error(`Error during PDF generation for submission ID ${submissionId}:`, error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Internal Server Error: Could not generate PDF.', error: error.message });
    }
  }
}
