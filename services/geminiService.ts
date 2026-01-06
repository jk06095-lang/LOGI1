

import { GoogleGenAI, Type, Schema } from "@google/genai";
import { BLData, CargoSourceType, DocumentScanType } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const cargoItemSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING, description: "Description of goods/items" },
    quantity: { type: Type.NUMBER, description: "Number of packages/units" },
    packageType: { type: Type.STRING, description: "Type of package (e.g., CARTONS, PALLETS, EA, DRUM, PAIL)" },
    grossWeight: { type: Type.NUMBER, description: "Gross weight in KG" },
    measurement: { type: Type.NUMBER, description: "Volume in CBM" },
    containerNo: { type: Type.STRING, description: "Container number" },
    sealNo: { type: Type.STRING, description: "Seal number" },
    hsCode: { type: Type.STRING, description: "HS Code if available" },
  },
  required: ["description", "quantity"],
};

const fullDocSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    // Common Fields
    blNumber: { type: Type.STRING, description: "B/L No, Invoice No, or Ref No" },
    shipper: { type: Type.STRING, description: "Shipper or Supplier Name" },
    consignee: { type: Type.STRING, description: "Consignee or Vessel Name" },
    vesselName: { type: Type.STRING, description: "Vessel Name" },
    voyageNo: { type: Type.STRING, description: "Voyage Number" },
    portOfLoading: { type: Type.STRING, description: "Port of Loading (POL)" },
    date: { type: Type.STRING, description: "Date of issue" },
    
    // New Fields
    koreanForwarder: { type: Type.STRING, description: "The 'DELIVERY AGENT' or Forwarder company name. Often found under 'For delivery of goods please apply to'." },
    transporterName: { type: Type.STRING, description: "Trucking or Transport Company Name" },
    cargoType: { type: Type.STRING, description: "Enum: 'LCL' or 'FCL'. Based on terms like 'CY-CY', 'FCL', 'CFS', 'LCL'." },
    
    // Classification Fields
    cargoClass: { 
      type: Type.STRING, 
      description: "Enum: 'IMPORT' or 'TRANSHIPMENT'. Logic: If Consignee address contains 'Korea', 'Seoul', 'Busan', 'Incheon', set to 'IMPORT'. If Consignee is outside Korea or remarks say 'T/S', set to 'TRANSHIPMENT'." 
    },
    importSubClass: { 
      type: Type.STRING, 
      description: "Enum: 'GENERAL', 'RETURN_EXPORT', 'SHIPS_STORES'. Logic: If description/remarks contains 'Ship Stores', 'Spare Parts for Vessel', set to 'SHIPS_STORES'. If 'Return', 'Re-export', set to 'RETURN_EXPORT'." 
    },

    // Cargo List
    cargoItems: {
      type: Type.ARRAY,
      items: cargoItemSchema,
      description: "List of cargo items",
    },

    // P/L Specific
    totalPackageCount: { type: Type.NUMBER, description: "Total quantity of packages from Packing List or B/L Header" },
    totalCbm: { type: Type.NUMBER, description: "Total Measurement (CBM). Sum of measurements or explicit Total CBM from B/L." },
    totalGrossWeight: { type: Type.NUMBER, description: "Total Gross Weight from Packing List or B/L Header" },

    // C/I Specific
    currency: { type: Type.STRING, description: "Currency (USD, KRW, EUR)" },
    totalAmount: { type: Type.NUMBER, description: "Total Invoice Amount/Value" },

    // Export Declaration Specific
    declarationNo: { type: Type.STRING, description: "Export Declaration Number (수출신고번호)" },
    mainHsCode: { type: Type.STRING, description: "Main HS Code from Export Declaration" }
  },
};

export const parseDocument = async (file: File, docType: DocumentScanType, sourceType: CargoSourceType = 'TRANSIT'): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      const base64Data = await fileToGenerativePart(file);
      const mimeType = file.type === 'application/pdf' ? 'application/pdf' : file.type;

      let promptText = "";

      switch(docType) {
        case 'PL':
          promptText = `Analyze this PACKING LIST.
          Extract:
          1. Total Packages (sum of all quantities).
          2. Total Gross Weight.
          3. Total Measurement (CBM).
          4. Detailed cargo items list (Description, Qty, Weight, CBM per item).
          Sync description with B/L context if possible.
          `;
          break;
        case 'CI':
          promptText = `Analyze this COMMERCIAL INVOICE.
          Extract:
          1. Total Invoice Amount.
          2. Currency.
          3. Shipper/Supplier.
          4. Consignee/Vessel.
          `;
          break;
        case 'EXPORT_DEC':
          promptText = `Analyze this EXPORT DECLARATION (수출신고필증).
          Extract:
          1. Declaration Number (수출신고번호).
          2. Main HS Code (HS 품목코드).
          3. Total Weight and Qty.
          `;
          break;
        case 'BL':
        default:
           if (sourceType === 'TRANSIT') {
            promptText = `Analyze this Bill of Lading (B/L).
            Extract: B/L Number, Vessel, Shipper, Consignee, Port of Loading.
            
            CRITICAL EXTRACTION FOR CARGO DETAILS:
            - **Total CBM / Measurement**: Look for "MEASUREMENT", "CBM", "M3", "VOL". Extract the total volume value.
            - **Total Gross Weight**: Look for "GROSS WEIGHT", "G.W", "KGS", "T.W". Extract the total weight value.
            - **Total Packages**: Look for "NO. OF PKGS", "PACKAGES", "TOTAL PACKAGES". Extract the numeric count.
            - **Item Details**: If multiple items are listed, extract Description, Quantity, Gross Weight, and Measurement (CBM) for *each* item.
            
            IMPORTANT CLASSIFICATION RULES:
            1. "IMPORT" vs "TRANSHIPMENT":
               - If the Consignee Address is in KOREA (e.g., Busan, Seoul, Incheon), set cargoClass to 'IMPORT'.
               - If the Consignee is "TO ORDER" and Notify Party is in KOREA, set cargoClass to 'IMPORT'.
               - Otherwise, set to 'TRANSHIPMENT'.
            
            2. "SUB CLASS" (Only if Import):
               - If goods are 'Ship Spares', 'Stores', 'Provisions', set importSubClass to 'SHIPS_STORES'.
               - If goods are described as 'Return', 'Re-import', 'Defective', set importSubClass to 'RETURN_EXPORT'.
               - Otherwise 'GENERAL'.

            3. "LCL" vs "FCL": 
               - If 'CY', 'FCL', 'FULL CONTAINER' found -> 'FCL'.
               - If 'CFS', 'LCL' found -> 'LCL'.

            4. "Agencies":
               - Extract 'koreanForwarder' (Delivery Agent).
               - Extract 'transporterName' (Trucking Co) if present.
            `;
          } else {
            promptText = `Analyze this Supply Document (LOGI1/3rd Party).
            Extract: Order No, Supplier, Vessel, Items, CBM, Weight, Packages, and classify as Import/Transhipment based on destination.
            `;
          }
          break;
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: mimeType } },
            { text: promptText },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: fullDocSchema,
          temperature: 0.1, 
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from Gemini");
      const parsed = JSON.parse(text);
      
      // Post-processing for CBM if main object missing it but items have it
      if (!parsed.totalCbm && parsed.cargoItems && parsed.cargoItems.length > 0) {
          const sumCbm = parsed.cargoItems.reduce((acc: number, item: any) => acc + (item.measurement || 0), 0);
          if (sumCbm > 0) parsed.totalCbm = parseFloat(sumCbm.toFixed(3));
      }
      
      // Post-processing for Weight if missing
      if (!parsed.totalGrossWeight && parsed.cargoItems && parsed.cargoItems.length > 0) {
          const sumWeight = parsed.cargoItems.reduce((acc: number, item: any) => acc + (item.grossWeight || 0), 0);
          if (sumWeight > 0) parsed.totalGrossWeight = parseFloat(sumWeight.toFixed(2));
      }

      resolve(parsed);

    } catch (error) {
      console.error("Gemini Processing Error:", error);
      reject(error);
    }
  });
};

// Legacy wrapper for compatibility
export const parseBLImage = async (file: File, sourceType: CargoSourceType = 'TRANSIT'): Promise<Partial<BLData>> => {
  return parseDocument(file, 'BL', sourceType);
};

const fileToGenerativePart = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
