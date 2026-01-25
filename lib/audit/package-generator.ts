/**
 * COR Audit Package Generator
 * 
 * Generates a comprehensive PDF document containing all evidence
 * organized by COR element, ready for auditor submission.
 */

import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import { COR_ELEMENTS } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface CompanyInfo {
  id: string;
  name: string;
  wsib_number?: string;
  address?: string;
  safety_manager_name?: string;
  safety_manager_email?: string;
  logo_url?: string;
  phone?: string;
  industry?: string;
}

export interface ElementEvidence {
  id: string;
  type: 'form' | 'training' | 'inspection' | 'drill' | 'meeting' | 'certificate' | 'policy';
  reference: string;
  title: string;
  description: string;
  date: string;
  form_data?: Record<string, unknown>;
  attachments?: {
    signatures?: Record<string, string>;
    photos?: string[];
  };
}

export interface ElementScore {
  element_number: number;
  element_name: string;
  percentage: number;
  status: 'excellent' | 'good' | 'needs_improvement' | 'critical';
  found_evidence: ElementEvidence[];
  gaps: Array<{
    description: string;
    severity: string;
  }>;
}

export interface PackageOptions {
  includeElements?: number[]; // Specific elements to include (all if empty)
  includeAppendices?: boolean;
  includeExecutiveSummary?: boolean;
  maxFormsPerElement?: number;
  includePhotos?: boolean;
}

export type ProgressCallback = (progress: number, status: string) => void;

// =============================================================================
// CONSTANTS
// =============================================================================

const PAGE_WIDTH = 612; // Letter size
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const LINE_HEIGHT = 14;
const HEADER_HEIGHT = 30;

const COLORS = {
  black: rgb(0, 0, 0),
  darkGray: rgb(0.3, 0.3, 0.3),
  gray: rgb(0.5, 0.5, 0.5),
  lightGray: rgb(0.8, 0.8, 0.8),
  primary: rgb(0.26, 0.32, 0.8), // Indigo
  success: rgb(0.16, 0.65, 0.35), // Green
  warning: rgb(0.85, 0.55, 0.2), // Orange
  danger: rgb(0.85, 0.2, 0.2), // Red
};

// =============================================================================
// MAIN GENERATOR FUNCTION
// =============================================================================

/**
 * Generate a complete COR audit package PDF
 */
export async function generateAuditPackage(
  company: CompanyInfo,
  elementScores: ElementScore[],
  options: PackageOptions = {},
  onProgress?: ProgressCallback
): Promise<Uint8Array> {
  const {
    includeElements = [],
    includeAppendices = true,
    includeExecutiveSummary = true,
    maxFormsPerElement = 5,
    includePhotos = true
  } = options;

  const pdfDoc = await PDFDocument.create();
  
  // Embed fonts
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const fonts = { regular: helvetica, bold: helveticaBold };
  
  // Filter elements if specific ones requested
  const elementsToInclude = includeElements.length > 0
    ? elementScores.filter(e => includeElements.includes(e.element_number))
    : elementScores;

  let currentProgress = 0;
  const totalSteps = 5 + elementsToInclude.length + (includeAppendices ? 1 : 0);
  
  const updateProgress = (step: number, status: string) => {
    currentProgress = Math.round((step / totalSteps) * 100);
    onProgress?.(currentProgress, status);
  };

  // 1. Cover Page
  updateProgress(1, 'Generating cover page...');
  await addCoverPage(pdfDoc, company, fonts);

  // 2. Table of Contents
  updateProgress(2, 'Generating table of contents...');
  const tocPage = await addTableOfContentsPlaceholder(pdfDoc, elementsToInclude, fonts, includeAppendices);

  // 3. Executive Summary
  if (includeExecutiveSummary) {
    updateProgress(3, 'Generating executive summary...');
    await addExecutiveSummary(pdfDoc, company, elementScores, fonts);
  }

  // 4. Company Information
  updateProgress(4, 'Adding company information...');
  await addCompanyInformation(pdfDoc, company, fonts);

  // 5. Element Sections
  const pageNumbers: Record<string, number> = {};
  let stepNum = 5;
  
  for (const element of elementsToInclude) {
    updateProgress(stepNum++, `Compiling Element ${element.element_number}: ${element.element_name}...`);
    pageNumbers[`element_${element.element_number}`] = pdfDoc.getPageCount() + 1;
    await addElementSection(pdfDoc, element, fonts, maxFormsPerElement, includePhotos);
  }

  // 6. Appendices
  if (includeAppendices) {
    updateProgress(stepNum++, 'Adding appendices...');
    pageNumbers['appendices'] = pdfDoc.getPageCount() + 1;
    await addAppendices(pdfDoc, company, elementScores, fonts);
  }

  // Update TOC with actual page numbers
  await updateTableOfContents(pdfDoc, tocPage, pageNumbers, fonts);

  // Add page numbers to all pages
  addPageNumbers(pdfDoc, fonts.regular);

  // Add header/footer to all pages
  addHeaderFooter(pdfDoc, company.name, fonts.regular);

  updateProgress(100, 'Complete!');

  return await pdfDoc.save();
}

/**
 * Generate audit package with real-time progress updates
 */
export async function generateAuditPackageWithProgress(
  company: CompanyInfo,
  elementScores: ElementScore[],
  onProgress: ProgressCallback,
  options: PackageOptions = {}
): Promise<Blob> {
  const pdfBytes = await generateAuditPackage(company, elementScores, options, onProgress);
  const bytes = Uint8Array.from(pdfBytes as any);
  return new Blob([bytes], { type: 'application/pdf' });
}

// =============================================================================
// COVER PAGE
// =============================================================================

async function addCoverPage(
  pdfDoc: PDFDocument,
  company: CompanyInfo,
  fonts: { regular: PDFFont; bold: PDFFont }
) {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const { bold, regular } = fonts;

  // Title block
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 150,
    width: PAGE_WIDTH,
    height: 150,
    color: rgb(0.05, 0.1, 0.2),
  });

  page.drawText('CERTIFICATE OF RECOGNITION (COR)', {
    x: 80,
    y: PAGE_HEIGHT - 80,
    size: 24,
    font: bold,
    color: rgb(1, 1, 1),
  });

  page.drawText('AUDIT SUBMISSION PACKAGE', {
    x: 140,
    y: PAGE_HEIGHT - 115,
    size: 20,
    font: regular,
    color: rgb(0.7, 0.8, 0.9),
  });

  // Decorative line
  page.drawLine({
    start: { x: 80, y: PAGE_HEIGHT - 130 },
    end: { x: PAGE_WIDTH - 80, y: PAGE_HEIGHT - 130 },
    thickness: 2,
    color: rgb(0.3, 0.5, 0.8),
  });

  // Company details box
  const boxY = PAGE_HEIGHT - 380;
  page.drawRectangle({
    x: MARGIN,
    y: boxY,
    width: PAGE_WIDTH - (MARGIN * 2),
    height: 200,
    borderColor: COLORS.lightGray,
    borderWidth: 1,
  });

  page.drawText('COMPANY INFORMATION', {
    x: MARGIN + 20,
    y: boxY + 175,
    size: 12,
    font: bold,
    color: COLORS.primary,
  });

  let yPos = boxY + 145;
  const labelX = MARGIN + 20;
  const valueX = MARGIN + 150;

  const details = [
    { label: 'Company Name:', value: company.name },
    { label: 'WSIB Number:', value: company.wsib_number || 'N/A' },
    { label: 'Address:', value: company.address || 'N/A' },
    { label: 'Industry:', value: company.industry || 'Construction' },
    { label: 'Contact:', value: company.safety_manager_name || 'N/A' },
  ];

  for (const detail of details) {
    page.drawText(detail.label, { x: labelX, y: yPos, size: 11, font: bold, color: COLORS.darkGray });
    page.drawText(detail.value, { x: valueX, y: yPos, size: 11, font: regular, color: COLORS.black });
    yPos -= 25;
  }

  // Submission details
  page.drawText('SUBMISSION DETAILS', {
    x: MARGIN + 20,
    y: boxY - 40,
    size: 12,
    font: bold,
    color: COLORS.primary,
  });

  page.drawText(`Submission Date: ${new Date().toLocaleDateString('en-CA', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, {
    x: MARGIN + 20,
    y: boxY - 65,
    size: 11,
    font: regular,
    color: COLORS.black,
  });

  page.drawText('Audit Standard: COR 2020', {
    x: MARGIN + 20,
    y: boxY - 85,
    size: 11,
    font: regular,
    color: COLORS.black,
  });

  page.drawText('Certifying Partner: IHSA (Infrastructure Health & Safety Association)', {
    x: MARGIN + 20,
    y: boxY - 105,
    size: 11,
    font: regular,
    color: COLORS.black,
  });

  // Footer
  page.drawText('This document contains confidential business information.', {
    x: MARGIN,
    y: 60,
    size: 9,
    font: regular,
    color: COLORS.gray,
  });

  page.drawText('Prepared for COR Certification Audit', {
    x: MARGIN,
    y: 45,
    size: 9,
    font: regular,
    color: COLORS.gray,
  });
}

// =============================================================================
// TABLE OF CONTENTS
// =============================================================================

async function addTableOfContentsPlaceholder(
  pdfDoc: PDFDocument,
  elements: ElementScore[],
  fonts: { regular: PDFFont; bold: PDFFont },
  includeAppendices: boolean
): Promise<PDFPage> {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const { bold, regular } = fonts;

  page.drawText('TABLE OF CONTENTS', {
    x: MARGIN,
    y: PAGE_HEIGHT - 80,
    size: 20,
    font: bold,
    color: COLORS.black,
  });

  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - 90 },
    end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 90 },
    thickness: 2,
    color: COLORS.primary,
  });

  // TOC entries will be added later with actual page numbers
  return page;
}

async function updateTableOfContents(
  pdfDoc: PDFDocument,
  tocPage: PDFPage,
  pageNumbers: Record<string, number>,
  fonts: { regular: PDFFont; bold: PDFFont }
) {
  const { bold, regular } = fonts;
  let yPos = PAGE_HEIGHT - 130;

  // Fixed entries
  const fixedEntries = [
    { title: 'Executive Summary', page: 3 },
    { title: 'Company Information', page: 4 },
  ];

  for (const entry of fixedEntries) {
    tocPage.drawText(entry.title, { x: MARGIN + 20, y: yPos, size: 12, font: regular, color: COLORS.black });
    tocPage.drawText('.'.repeat(60), { x: MARGIN + 200, y: yPos, size: 10, font: regular, color: COLORS.lightGray });
    tocPage.drawText(String(entry.page), { x: PAGE_WIDTH - MARGIN - 30, y: yPos, size: 12, font: regular, color: COLORS.black });
    yPos -= 25;
  }

  yPos -= 10;

  // Element entries
  tocPage.drawText('COR ELEMENTS', {
    x: MARGIN,
    y: yPos,
    size: 14,
    font: bold,
    color: COLORS.primary,
  });
  yPos -= 25;

  for (let i = 1; i <= 14; i++) {
    const element = COR_ELEMENTS.find(e => e.number === i);
    if (!element) continue;

    const pageNum = pageNumbers[`element_${i}`] || '—';
    const title = `Element ${i}: ${element.name}`;

    tocPage.drawText(title, { x: MARGIN + 20, y: yPos, size: 11, font: regular, color: COLORS.black });
    tocPage.drawText('.'.repeat(50), { x: MARGIN + 280, y: yPos, size: 10, font: regular, color: COLORS.lightGray });
    tocPage.drawText(String(pageNum), { x: PAGE_WIDTH - MARGIN - 30, y: yPos, size: 11, font: regular, color: COLORS.black });
    yPos -= 20;

    if (yPos < 100) {
      // Would need pagination for TOC - simplified here
      break;
    }
  }

  // Appendices
  if (pageNumbers['appendices']) {
    yPos -= 10;
    tocPage.drawText('APPENDICES', {
      x: MARGIN,
      y: yPos,
      size: 14,
      font: bold,
      color: COLORS.primary,
    });
    yPos -= 25;

    tocPage.drawText('Appendix A: Forms Library', { x: MARGIN + 20, y: yPos, size: 11, font: regular, color: COLORS.black });
    tocPage.drawText(String(pageNumbers['appendices']), { x: PAGE_WIDTH - MARGIN - 30, y: yPos, size: 11, font: regular, color: COLORS.black });
  }
}

// =============================================================================
// EXECUTIVE SUMMARY
// =============================================================================

async function addExecutiveSummary(
  pdfDoc: PDFDocument,
  company: CompanyInfo,
  elementScores: ElementScore[],
  fonts: { regular: PDFFont; bold: PDFFont }
) {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const { bold, regular } = fonts;

  // Header
  page.drawText('EXECUTIVE SUMMARY', {
    x: MARGIN,
    y: PAGE_HEIGHT - 80,
    size: 18,
    font: bold,
    color: COLORS.black,
  });

  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - 90 },
    end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 90 },
    thickness: 2,
    color: COLORS.primary,
  });

  // Calculate overall score
  const totalScore = elementScores.reduce((sum, e) => sum + e.percentage, 0);
  const overallPercentage = Math.round(totalScore / elementScores.length);
  const passingElements = elementScores.filter(e => e.percentage >= 80).length;
  const criticalGaps = elementScores.flatMap(e => e.gaps.filter(g => g.severity === 'critical')).length;

  let yPos = PAGE_HEIGHT - 130;

  // Overall Score Box
  const scoreBoxWidth = 180;
  const scoreBoxHeight = 100;
  page.drawRectangle({
    x: MARGIN,
    y: yPos - scoreBoxHeight,
    width: scoreBoxWidth,
    height: scoreBoxHeight,
    color: overallPercentage >= 80 ? rgb(0.9, 0.98, 0.9) : rgb(0.98, 0.95, 0.9),
    borderColor: overallPercentage >= 80 ? COLORS.success : COLORS.warning,
    borderWidth: 2,
  });

  page.drawText('OVERALL SCORE', {
    x: MARGIN + 30,
    y: yPos - 25,
    size: 10,
    font: bold,
    color: COLORS.gray,
  });

  page.drawText(`${overallPercentage}%`, {
    x: MARGIN + 50,
    y: yPos - 60,
    size: 36,
    font: bold,
    color: overallPercentage >= 80 ? COLORS.success : COLORS.warning,
  });

  page.drawText(overallPercentage >= 80 ? 'PASSING' : 'NEEDS WORK', {
    x: MARGIN + 45,
    y: yPos - 85,
    size: 11,
    font: bold,
    color: overallPercentage >= 80 ? COLORS.success : COLORS.warning,
  });

  // Stats
  const statsX = MARGIN + scoreBoxWidth + 30;
  page.drawText('KEY METRICS', {
    x: statsX,
    y: yPos - 15,
    size: 12,
    font: bold,
    color: COLORS.primary,
  });

  const stats = [
    { label: 'Elements Meeting Standard (80%+):', value: `${passingElements} / 14` },
    { label: 'Critical Gaps Identified:', value: String(criticalGaps) },
    { label: 'Evidence Items Collected:', value: String(elementScores.reduce((sum, e) => sum + e.found_evidence.length, 0)) },
    { label: 'Audit Readiness:', value: overallPercentage >= 80 ? 'READY' : 'IN PROGRESS' },
  ];

  let statY = yPos - 40;
  for (const stat of stats) {
    page.drawText(stat.label, { x: statsX, y: statY, size: 10, font: regular, color: COLORS.darkGray });
    page.drawText(stat.value, { x: statsX + 200, y: statY, size: 10, font: bold, color: COLORS.black });
    statY -= 18;
  }

  yPos -= scoreBoxHeight + 40;

  // Element Score Summary Table
  page.drawText('ELEMENT SCORE SUMMARY', {
    x: MARGIN,
    y: yPos,
    size: 12,
    font: bold,
    color: COLORS.primary,
  });

  yPos -= 25;

  // Table header
  const colWidths = [40, 200, 60, 100, 80];
  const colX = [MARGIN, MARGIN + 40, MARGIN + 240, MARGIN + 300, MARGIN + 400];
  const headers = ['#', 'Element Name', 'Score', 'Status', 'Evidence'];

  page.drawRectangle({
    x: MARGIN,
    y: yPos - 15,
    width: PAGE_WIDTH - (MARGIN * 2),
    height: 20,
    color: rgb(0.95, 0.95, 0.95),
  });

  headers.forEach((header, i) => {
    page.drawText(header, {
      // eslint-disable-next-line security/detect-object-injection -- Safe: i bounded by headers.length
      x: colX[i],
      y: yPos - 10,
      size: 9,
      font: bold,
      color: COLORS.darkGray,
    });
  });

  yPos -= 25;

  // Table rows
  for (const element of elementScores) {
    if (yPos < 100) break; // Simplified - would paginate in production

    const scoreColor = element.percentage >= 80 ? COLORS.success : 
                       element.percentage >= 60 ? COLORS.warning : COLORS.danger;

    page.drawText(String(element.element_number), { x: colX[0], y: yPos, size: 9, font: regular, color: COLORS.black });
    page.drawText(element.element_name.substring(0, 35), { x: colX[1], y: yPos, size: 9, font: regular, color: COLORS.black });
    page.drawText(`${element.percentage}%`, { x: colX[2], y: yPos, size: 9, font: bold, color: scoreColor });
    
    const statusText = element.percentage >= 80 ? 'Passing' : element.percentage >= 60 ? 'At Risk' : 'Critical';
    page.drawText(statusText, { x: colX[3], y: yPos, size: 9, font: regular, color: scoreColor });
    page.drawText(String(element.found_evidence.length), { x: colX[4], y: yPos, size: 9, font: regular, color: COLORS.black });

    yPos -= 18;
  }
}

// =============================================================================
// COMPANY INFORMATION
// =============================================================================

async function addCompanyInformation(
  pdfDoc: PDFDocument,
  company: CompanyInfo,
  fonts: { regular: PDFFont; bold: PDFFont }
) {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const { bold, regular } = fonts;

  // Section header
  page.drawText('COMPANY INFORMATION', {
    x: MARGIN,
    y: PAGE_HEIGHT - 80,
    size: 18,
    font: bold,
    color: COLORS.black,
  });

  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - 90 },
    end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 90 },
    thickness: 2,
    color: COLORS.primary,
  });

  let yPos = PAGE_HEIGHT - 130;

  // Company profile section
  page.drawText('Company Profile', {
    x: MARGIN,
    y: yPos,
    size: 14,
    font: bold,
    color: COLORS.primary,
  });
  yPos -= 30;

  const profileFields = [
    { label: 'Legal Name', value: company.name },
    { label: 'WSIB Account Number', value: company.wsib_number || 'N/A' },
    { label: 'Business Address', value: company.address || 'N/A' },
    { label: 'Industry Classification', value: company.industry || 'Construction' },
    { label: 'Primary Contact', value: company.safety_manager_name || 'Safety Manager' },
    { label: 'Contact Email', value: company.safety_manager_email || 'N/A' },
    { label: 'Phone Number', value: company.phone || 'N/A' },
  ];

  for (const field of profileFields) {
    page.drawText(`${field.label}:`, { x: MARGIN + 20, y: yPos, size: 11, font: bold, color: COLORS.darkGray });
    page.drawText(field.value, { x: MARGIN + 180, y: yPos, size: 11, font: regular, color: COLORS.black });
    yPos -= 22;
  }

  yPos -= 20;

  // Scope of certification
  page.drawText('Scope of Certification', {
    x: MARGIN,
    y: yPos,
    size: 14,
    font: bold,
    color: COLORS.primary,
  });
  yPos -= 25;

  const scopeText = [
    'This Certificate of Recognition (COR) certification covers all operations conducted by',
    `${company.name} within the Province of Ontario. The scope includes all workers,`,
    'supervisors, and management personnel engaged in construction-related activities.',
    '',
    'The certification is based on the COR 2020 Standard and covers the 14 required elements',
    'of a comprehensive health and safety management system.',
  ];

  for (const line of scopeText) {
    page.drawText(line, { x: MARGIN + 20, y: yPos, size: 10, font: regular, color: COLORS.black });
    yPos -= 16;
  }

  yPos -= 20;

  // Certification commitment
  page.drawText('Management Commitment Statement', {
    x: MARGIN,
    y: yPos,
    size: 14,
    font: bold,
    color: COLORS.primary,
  });
  yPos -= 25;

  page.drawRectangle({
    x: MARGIN + 10,
    y: yPos - 80,
    width: PAGE_WIDTH - MARGIN * 2 - 20,
    height: 90,
    color: rgb(0.97, 0.97, 1),
    borderColor: COLORS.primary,
    borderWidth: 1,
  });

  const commitmentText = [
    `${company.name} is committed to providing a safe and healthy workplace for all workers.`,
    'We recognize that the prevention of occupational injuries and illnesses is a key business',
    'objective. Our management team is dedicated to continuous improvement of our health and',
    'safety management system through regular review, employee involvement, and adherence',
    'to all applicable legislation and industry best practices.',
  ];

  let commitY = yPos - 15;
  for (const line of commitmentText) {
    page.drawText(line, { x: MARGIN + 20, y: commitY, size: 9, font: regular, color: COLORS.darkGray });
    commitY -= 14;
  }
}

// =============================================================================
// ELEMENT SECTIONS
// =============================================================================

async function addElementSection(
  pdfDoc: PDFDocument,
  element: ElementScore,
  fonts: { regular: PDFFont; bold: PDFFont },
  maxForms: number,
  includePhotos: boolean
) {
  const { bold, regular } = fonts;

  // Element Cover Page
  const coverPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  
  // Element number badge
  coverPage.drawRectangle({
    x: MARGIN,
    y: PAGE_HEIGHT - 150,
    width: 100,
    height: 100,
    color: COLORS.primary,
  });

  coverPage.drawText(String(element.element_number), {
    x: element.element_number >= 10 ? MARGIN + 20 : MARGIN + 35,
    y: PAGE_HEIGHT - 115,
    size: 48,
    font: bold,
    color: rgb(1, 1, 1),
  });

  // Element title
  coverPage.drawText(`ELEMENT ${element.element_number}`, {
    x: MARGIN + 120,
    y: PAGE_HEIGHT - 80,
    size: 14,
    font: regular,
    color: COLORS.gray,
  });

  coverPage.drawText(element.element_name, {
    x: MARGIN + 120,
    y: PAGE_HEIGHT - 105,
    size: 22,
    font: bold,
    color: COLORS.black,
  });

  // Score display
  const scoreColor = element.percentage >= 80 ? COLORS.success : 
                     element.percentage >= 60 ? COLORS.warning : COLORS.danger;

  coverPage.drawText('Element Score:', {
    x: MARGIN + 120,
    y: PAGE_HEIGHT - 140,
    size: 12,
    font: regular,
    color: COLORS.gray,
  });

  coverPage.drawText(`${element.percentage}%`, {
    x: MARGIN + 220,
    y: PAGE_HEIGHT - 140,
    size: 14,
    font: bold,
    color: scoreColor,
  });

  // Element description
  const corElement = COR_ELEMENTS.find(e => e.number === element.element_number);
  if (corElement) {
    let yPos = PAGE_HEIGHT - 200;

    coverPage.drawText('Element Description', {
      x: MARGIN,
      y: yPos,
      size: 14,
      font: bold,
      color: COLORS.primary,
    });
    yPos -= 25;

    const descLines = wrapText(corElement.description, PAGE_WIDTH - MARGIN * 2 - 20, 10);
    for (const line of descLines) {
      coverPage.drawText(line, { x: MARGIN + 10, y: yPos, size: 10, font: regular, color: COLORS.darkGray });
      yPos -= 16;
    }

    yPos -= 20;

    // Evidence summary
    coverPage.drawText('Evidence Summary', {
      x: MARGIN,
      y: yPos,
      size: 14,
      font: bold,
      color: COLORS.primary,
    });
    yPos -= 25;

    coverPage.drawText(`Total Evidence Items: ${element.found_evidence.length}`, {
      x: MARGIN + 10,
      y: yPos,
      size: 11,
      font: regular,
      color: COLORS.black,
    });
    yPos -= 20;

    // Evidence breakdown by type
    const evidenceByType = element.found_evidence.reduce((acc, e) => {
      // Safe: e.type is from ElementEvidence type union ('form' | 'training' | 'inspection' | etc.)
       
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [type, count] of Object.entries(evidenceByType)) {
      coverPage.drawText(`• ${type.charAt(0).toUpperCase() + type.slice(1)}: ${count}`, {
        x: MARGIN + 20,
        y: yPos,
        size: 10,
        font: regular,
        color: COLORS.darkGray,
      });
      yPos -= 16;
    }

    // Gaps (if any)
    if (element.gaps.length > 0) {
      yPos -= 20;
      coverPage.drawText('Identified Gaps', {
        x: MARGIN,
        y: yPos,
        size: 14,
        font: bold,
        color: COLORS.warning,
      });
      yPos -= 25;

      for (const gap of element.gaps.slice(0, 5)) {
        coverPage.drawText(`• ${gap.description.substring(0, 80)}${gap.description.length > 80 ? '...' : ''}`, {
          x: MARGIN + 10,
          y: yPos,
          size: 10,
          font: regular,
          color: gap.severity === 'critical' ? COLORS.danger : COLORS.warning,
        });
        yPos -= 16;
      }
    }
  }

  // Evidence Index Page
  if (element.found_evidence.length > 0) {
    await addEvidenceIndex(pdfDoc, element, fonts);
  }

  // Sample Evidence (forms)
  const formEvidence = element.found_evidence.filter(e => e.type === 'form').slice(0, maxForms);
  for (const evidence of formEvidence) {
    await addFormEvidence(pdfDoc, evidence, fonts, includePhotos);
  }
}

async function addEvidenceIndex(
  pdfDoc: PDFDocument,
  element: ElementScore,
  fonts: { regular: PDFFont; bold: PDFFont }
) {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const { bold, regular } = fonts;

  page.drawText(`ELEMENT ${element.element_number} - EVIDENCE INDEX`, {
    x: MARGIN,
    y: PAGE_HEIGHT - 80,
    size: 16,
    font: bold,
    color: COLORS.black,
  });

  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - 90 },
    end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 90 },
    thickness: 1,
    color: COLORS.primary,
  });

  let yPos = PAGE_HEIGHT - 120;

  // Table header
  page.drawRectangle({
    x: MARGIN,
    y: yPos - 15,
    width: PAGE_WIDTH - MARGIN * 2,
    height: 20,
    color: rgb(0.95, 0.95, 0.95),
  });

  const headers = ['Date', 'Reference', 'Type', 'Description'];
  const colX = [MARGIN + 5, MARGIN + 75, MARGIN + 175, MARGIN + 250];

  headers.forEach((header, i) => {
    page.drawText(header, {
      // eslint-disable-next-line security/detect-object-injection -- Safe: i bounded by headers.length
      x: colX[i],
      y: yPos - 10,
      size: 9,
      font: bold,
      color: COLORS.darkGray,
    });
  });

  yPos -= 25;

  // Table rows
  for (const evidence of element.found_evidence) {
    if (yPos < 80) {
      // Start new page if needed
      const newPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      yPos = PAGE_HEIGHT - 80;
    }

    page.drawText(new Date(evidence.date).toLocaleDateString('en-CA'), {
      x: colX[0],
      y: yPos,
      size: 8,
      font: regular,
      color: COLORS.black,
    });

    page.drawText(evidence.reference.substring(0, 15), {
      x: colX[1],
      y: yPos,
      size: 8,
      font: regular,
      color: COLORS.black,
    });

    page.drawText(evidence.type, {
      x: colX[2],
      y: yPos,
      size: 8,
      font: regular,
      color: COLORS.black,
    });

    page.drawText(evidence.description.substring(0, 45), {
      x: colX[3],
      y: yPos,
      size: 8,
      font: regular,
      color: COLORS.black,
    });

    yPos -= 16;
  }
}

async function addFormEvidence(
  pdfDoc: PDFDocument,
  evidence: ElementEvidence,
  fonts: { regular: PDFFont; bold: PDFFont },
  includePhotos: boolean
) {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const { bold, regular } = fonts;

  // Form header
  page.drawRectangle({
    x: MARGIN,
    y: PAGE_HEIGHT - 70,
    width: PAGE_WIDTH - MARGIN * 2,
    height: 40,
    color: rgb(0.95, 0.97, 1),
    borderColor: COLORS.primary,
    borderWidth: 1,
  });

  page.drawText(evidence.title, {
    x: MARGIN + 10,
    y: PAGE_HEIGHT - 50,
    size: 12,
    font: bold,
    color: COLORS.primary,
  });

  page.drawText(`Reference: ${evidence.reference}`, {
    x: MARGIN + 10,
    y: PAGE_HEIGHT - 65,
    size: 9,
    font: regular,
    color: COLORS.gray,
  });

  page.drawText(`Date: ${new Date(evidence.date).toLocaleDateString('en-CA')}`, {
    x: PAGE_WIDTH - MARGIN - 120,
    y: PAGE_HEIGHT - 50,
    size: 9,
    font: regular,
    color: COLORS.gray,
  });

  let yPos = PAGE_HEIGHT - 100;

  // Form data fields
  if (evidence.form_data) {
    for (const [fieldKey, fieldValue] of Object.entries(evidence.form_data)) {
      if (yPos < 100) {
        // Start new page
        const newPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        yPos = PAGE_HEIGHT - 80;
      }

      // Field label
      const label = fieldKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      page.drawText(`${label}:`, {
        x: MARGIN + 10,
        y: yPos,
        size: 10,
        font: bold,
        color: COLORS.darkGray,
      });
      yPos -= 16;

      // Field value
      const valueStr = String(fieldValue);
      const valueLines = wrapText(valueStr, PAGE_WIDTH - MARGIN * 2 - 40, 9);
      
      for (const line of valueLines) {
        page.drawText(line, {
          x: MARGIN + 20,
          y: yPos,
          size: 9,
          font: regular,
          color: COLORS.black,
        });
        yPos -= 14;
      }

      yPos -= 8;
    }
  }

  // Signatures
  if (evidence.attachments?.signatures) {
    yPos -= 10;
    page.drawText('Signatures:', {
      x: MARGIN + 10,
      y: yPos,
      size: 10,
      font: bold,
      color: COLORS.darkGray,
    });
    yPos -= 20;

    for (const [sigField, _sigData] of Object.entries(evidence.attachments.signatures)) {
      page.drawText(`${sigField}: [Signature on file]`, {
        x: MARGIN + 20,
        y: yPos,
        size: 9,
        font: regular,
        color: COLORS.gray,
      });
      yPos -= 50; // Space for signature
    }
  }

  // Photos indicator
  if (includePhotos && evidence.attachments?.photos && evidence.attachments.photos.length > 0) {
    yPos -= 10;
    page.drawText(`Photos: ${evidence.attachments.photos.length} attached`, {
      x: MARGIN + 10,
      y: yPos,
      size: 9,
      font: regular,
      color: COLORS.gray,
    });
  }
}

// =============================================================================
// APPENDICES
// =============================================================================

async function addAppendices(
  pdfDoc: PDFDocument,
  company: CompanyInfo,
  elementScores: ElementScore[],
  fonts: { regular: PDFFont; bold: PDFFont }
) {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const { bold, regular } = fonts;

  page.drawText('APPENDICES', {
    x: MARGIN,
    y: PAGE_HEIGHT - 80,
    size: 20,
    font: bold,
    color: COLORS.black,
  });

  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - 90 },
    end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 90 },
    thickness: 2,
    color: COLORS.primary,
  });

  let yPos = PAGE_HEIGHT - 130;

  // Appendix A: Forms Library
  page.drawText('Appendix A: Forms Library', {
    x: MARGIN,
    y: yPos,
    size: 14,
    font: bold,
    color: COLORS.primary,
  });
  yPos -= 25;

  page.drawText('The following forms are used as part of our health and safety management system:', {
    x: MARGIN + 10,
    y: yPos,
    size: 10,
    font: regular,
    color: COLORS.darkGray,
  });
  yPos -= 25;

  // List unique form types
  const formTypes = new Set<string>();
  elementScores.forEach(e => {
    e.found_evidence.forEach(ev => {
      if (ev.type === 'form') {
        formTypes.add(ev.title);
      }
    });
  });

  for (const formType of formTypes) {
    page.drawText(`• ${formType}`, {
      x: MARGIN + 20,
      y: yPos,
      size: 10,
      font: regular,
      color: COLORS.black,
    });
    yPos -= 16;

    if (yPos < 100) break;
  }

  yPos -= 30;

  // Appendix B: Certification Statement
  page.drawText('Appendix B: Certification Statement', {
    x: MARGIN,
    y: yPos,
    size: 14,
    font: bold,
    color: COLORS.primary,
  });
  yPos -= 25;

  const certText = [
    'I hereby certify that the information contained in this audit package is true and accurate',
    'to the best of my knowledge. All evidence presented has been gathered from actual company',
    'records and represents our current health and safety management system.',
    '',
    `Company: ${company.name}`,
    `Prepared by: ${company.safety_manager_name || 'Safety Manager'}`,
    `Date: ${new Date().toLocaleDateString('en-CA')}`,
  ];

  for (const line of certText) {
    page.drawText(line, {
      x: MARGIN + 10,
      y: yPos,
      size: 10,
      font: regular,
      color: COLORS.darkGray,
    });
    yPos -= 16;
  }

  // Signature line
  yPos -= 30;
  page.drawLine({
    start: { x: MARGIN + 10, y: yPos },
    end: { x: MARGIN + 200, y: yPos },
    thickness: 1,
    color: COLORS.black,
  });

  page.drawText('Authorized Signature', {
    x: MARGIN + 10,
    y: yPos - 15,
    size: 9,
    font: regular,
    color: COLORS.gray,
  });
}

// =============================================================================
// UTILITIES
// =============================================================================

function addPageNumbers(pdfDoc: PDFDocument, font: PDFFont) {
  const pages = pdfDoc.getPages();
  
  // Skip first page (cover)
  for (let i = 1; i < pages.length; i++) {
    // Safe: i is a controlled loop index within bounds of pages array
    // eslint-disable-next-line security/detect-object-injection
    const page = pages[i];
    const { width, height } = page.getSize();

    page.drawText(`Page ${i} of ${pages.length - 1}`, {
      x: width / 2 - 30,
      y: 25,
      size: 9,
      font,
      color: COLORS.gray,
    });
  }
}

function addHeaderFooter(pdfDoc: PDFDocument, companyName: string, font: PDFFont) {
  const pages = pdfDoc.getPages();
  
  // Skip first page (cover)
  for (let i = 1; i < pages.length; i++) {
    // Safe: i is a controlled loop index within bounds of pages array
    // eslint-disable-next-line security/detect-object-injection
    const page = pages[i];
    const { width } = page.getSize();

    // Header line
    page.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - 40 },
      end: { x: width - MARGIN, y: PAGE_HEIGHT - 40 },
      thickness: 0.5,
      color: COLORS.lightGray,
    });

    // Company name in header
    page.drawText(companyName, {
      x: MARGIN,
      y: PAGE_HEIGHT - 35,
      size: 8,
      font,
      color: COLORS.gray,
    });

    // COR Audit Package in header
    page.drawText('COR Audit Package', {
      x: width - MARGIN - 80,
      y: PAGE_HEIGHT - 35,
      size: 8,
      font,
      color: COLORS.gray,
    });

    // Footer line
    page.drawLine({
      start: { x: MARGIN, y: 40 },
      end: { x: width - MARGIN, y: 40 },
      thickness: 0.5,
      color: COLORS.lightGray,
    });

    // Confidential notice
    page.drawText('CONFIDENTIAL - For COR Audit Use Only', {
      x: width - MARGIN - 160,
      y: 25,
      size: 8,
      font,
      color: COLORS.gray,
    });
  }
}

function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const avgCharWidth = fontSize * 0.5;
  const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);
  
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines;
}
