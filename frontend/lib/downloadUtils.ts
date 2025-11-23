import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export interface AnalysisContent {
    analysis: string;
    anomalies?: string[];
    recommendations?: string[];
}

/**
 * Main entry point for downloading results.
 * Handles dispatch to specific format generators.
 */
export async function downloadResults(
    format: 'csv' | 'xlsx' | 'pdf' | 'png', // Removed 'ppt' from type
    data: any[],
    analysis: AnalysisContent | null,
    title: string,
    elementIdForPng?: string
) {
    const timestamp = new Date().toISOString().split('T')[0];
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    const fileName = `${safeTitle}_${timestamp}`;

    try {
        switch (format) {
            case 'csv':
                return generateCSV(data, analysis, fileName);
            case 'xlsx':
                return generateXLSX(data, analysis, fileName);
            case 'pdf':
                return generatePDF(data, analysis, fileName);
            case 'png':
                return await generatePNG(fileName, elementIdForPng);
        }
    } catch (e) {
        console.error("Download Error:", e);
        alert("Failed to generate download file. Check console for details.");
    }
}

// ------------------------------------------------------------------
// 1. CSV GENERATOR
// ------------------------------------------------------------------
function generateCSV(data: any[], analysis: AnalysisContent | null, fileName: string) {
    if (!data || data.length === 0) {
        alert("No data to download");
        return;
    }

    let content = "";

    // Add Analysis Header
    if (analysis) {
        content += `AI ANALYSIS REPORT\n`;
        // Clean newlines to keep CSV valid
        content += `Summary: "${analysis.analysis.replace(/[\n\r]+/g, ' ')}"\n`;

        if (analysis.anomalies && analysis.anomalies.length > 0) {
            content += `Anomalies: ${analysis.anomalies.join('; ')}\n`;
        }

        if (analysis.recommendations && analysis.recommendations.length > 0) {
            content += `Recommendations: ${analysis.recommendations.join('; ')}\n`;
        }
        content += `\nDATA TABLE\n`;
    }

    // Add Data Table
    const headers = Object.keys(data[0]);
    content += headers.join(",") + "\n";

    data.forEach(row => {
        const values = headers.map(header => {
            const val = row[header];
            const stringVal = String(val === null || val === undefined ? '' : val);
            // Escape quotes for CSV
            return `"${stringVal.replace(/"/g, '""')}"`;
        });
        content += values.join(",") + "\n";
    });

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${fileName}.csv`);
}

// ------------------------------------------------------------------
// 2. EXCEL (XLSX) GENERATOR
// ------------------------------------------------------------------
function generateXLSX(data: any[], analysis: AnalysisContent | null, fileName: string) {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Raw Data
    if (data.length > 0) {
        const wsData = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, wsData, "Raw Data");
    }

    // Sheet 2: Analysis Report
    if (analysis) {
        const analysisData = [
            ["AI Analysis Report"],
            ["Generated on", new Date().toLocaleString()],
            [],
            ["Summary", analysis.analysis],
            [],
            ["Anomalies"],
            ...(analysis.anomalies?.map(a => [a]) || [["None detected"]]),
            [],
            ["Recommendations"],
            ...(analysis.recommendations?.map(r => [r]) || [["None"]])
        ];
        const wsAnalysis = XLSX.utils.aoa_to_sheet(analysisData);
        XLSX.utils.book_append_sheet(wb, wsAnalysis, "Insights");
    }

    XLSX.writeFile(wb, `${fileName}.xlsx`);
}

// ------------------------------------------------------------------
// 3. PDF GENERATOR
// ------------------------------------------------------------------
function generatePDF(data: any[], analysis: AnalysisContent | null, fileName: string) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.text("AI Analytics Report", 14, yPos);
    yPos += 10;

    // Analysis Section
    if (analysis) {
        doc.setFontSize(12);
        doc.setTextColor(100);

        // Word wrap summary text
        const summaryLines = doc.splitTextToSize(analysis.analysis, pageWidth - 28);
        doc.text(summaryLines, 14, yPos);
        yPos += (summaryLines.length * 5) + 5;

        if (analysis.anomalies?.length) {
            doc.setTextColor(200, 0, 0); // Red for anomalies
            doc.setFontSize(10);
            doc.text("Detected Anomalies:", 14, yPos);
            yPos += 5;
            analysis.anomalies.forEach(a => {
                doc.text(`• ${a}`, 18, yPos);
                yPos += 5;
            });
            yPos += 5;
        }
    }

    // Data Table Section
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text("Data Results", 14, yPos);
    yPos += 5;

    const headers = Object.keys(data[0] || {});
    const rows = data.map(row => Object.values(row).map(val =>
        val === null || val === undefined ? '' : String(val)
    ));

    autoTable(doc, {
        head: [headers],
        body: rows,
        startY: yPos,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 160, 133] }
    });

    doc.save(`${fileName}.pdf`);
}

// ------------------------------------------------------------------
// 4. PNG IMAGE GENERATOR
// ------------------------------------------------------------------
async function generatePNG(fileName: string, elementId?: string) {
    if (!elementId) {
        alert("Cannot capture image: Element ID missing.");
        return;
    }

    const element = document.getElementById(elementId);
    if (!element) {
        alert("Cannot capture image: Data view not visible.");
        return;
    }

    try {
        const canvas = await html2canvas(element, {
            backgroundColor: '#0f172a', // Match theme background
            scale: 2, // High resolution
            logging: false,
            useCORS: true
        });

        canvas.toBlob((blob) => {
            if (blob) saveAs(blob, `${fileName}.png`);
        });
    } catch (e) {
        console.error("PNG Generation Failed", e);
        alert("Failed to generate image.");
    }
}