
import { Type, Schema } from "@google/genai";
import { BLData, CargoSourceType, DocumentScanType } from "../types";
import { compressImage } from "./storageService";

const cargoItemSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING, description: "Description of goods/items" },
    quantity: { type: Type.NUMBER, description: "Number of packages/units" },
    packageType: { type: Type.STRING, description: "Type of package (e.g., CARTONS, PALLETS, EA, DRUM, PAIL)" },
    grossWeight: { type: Type.NUMBER, description: "Gross weight in KG" },
    measurement: { type: Type.NUMBER, description: "Volume in CBM" },
    containerNo: { type: Type.STRING, description: "Container number" },
    containerType: { type: Type.STRING, description: "Container Type (e.g., 20GP, 40HQ, 40GP, LCL)" },
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
    notifyParty: { type: Type.STRING, description: "Notify Party Name" },
    vesselName: { type: Type.STRING, description: "Vessel Name" },
    voyageNo: { type: Type.STRING, description: "Voyage Number" },
    portOfLoading: { type: Type.STRING, description: "Port of Loading (POL)" },
    date: { type: Type.STRING, description: "Date of issue" },
    
    // New Fields
    koreanForwarder: { type: Type.STRING, description: "The 'DELIVERY AGENT' or Forwarder company name. Often found under 'For delivery of goods please apply to'." },
    transporterName: { type: Type.STRING, description: "Trucking or Transport Company Name" },
    cargoType: { type: Type.STRING, description: "Enum: 'LCL' or 'FCL'. Rule: If 'CY/CY', 'CY-CY', or 'FCL' is found -> 'FCL'. If 'CFS/CFS', 'CFS-CFS', or 'LCL' is found -> 'LCL'." },
    
    // Classification Fields
    cargoClass: { 
      type: Type.STRING, 
      description: "Enum: 'IMPORT' or 'TRANSHIPMENT'. Logic: If Consignee address contains 'Korea', 'Seoul', 'Busan', 'Incheon', set to 'IMPORT'. If Consignee is outside Korea or remarks say 'T/S', set to 'TRANSHIPMENT'." 
    },
    importSubClass: { 
      type: Type.STRING, 
      description: "Enum: 'GENERAL', 'RETURN_EXPORT', 'SHIPS_STORES'. Logic: If description/remarks contains 'Ship Stores', 'Spare Parts for Vessel', set to 'SHIPS_STORES'. If 'Return', 'Re-export', set to 'RETURN_EXPORT'." 
    },
    cargoCategory: {
        type: Type.STRING,
        description: "Enum: 'FISHING_GEAR' (어구), 'BAIT' (베이트/미끼), 'NETS' (그물), 'PORT_EQUIPMENT' (항통장비), 'GENERAL' (기타). Infer from description."
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
    mainHsCode: { type: Type.STRING, description: "Main HS Code from Export Declaration" },

    // A/N Specific
    anEta: { type: Type.STRING, description: "ETA Date from Arrival Notice" },
    anLocation: { type: Type.STRING, description: "Location name (CY or CFS) where cargo is stored" },
    anFreightCost: { type: Type.STRING, description: "Total Freight Cost string (e.g. 500 USD)" },
    anOtherCosts: { type: Type.STRING, description: "Other costs like Demurrage, THC" }
  },
};

export const parseDocument = async (file: File, docType: DocumentScanType, sourceType: CargoSourceType = 'TRANSIT'): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Compress Image to ensure it fits in Vercel Payload (Max 4.5MB)
      const compressedFile = await compressImage(file);
      const base64Data = await fileToGenerativePart(compressedFile);
      const mimeType = compressedFile.type === 'application/pdf' ? 'application/pdf' : compressedFile.type;

      let promptText = "";

      switch(docType) {
        case 'PL':
          promptText = `Analyze this PACKING LIST.
          Extract: Total Packages, Total Gross Weight, Total Measurement (CBM), and detailed cargo items.
          For each item, try to find Container Number and Type if listed.
          `;
          break;
        case 'CI':
          promptText = `Analyze this COMMERCIAL INVOICE.
          Extract: Total Invoice Amount, Currency, Shipper, Consignee.
          `;
          break;
        case 'EXPORT_DEC':
          promptText = `Analyze this EXPORT DECLARATION (수출신고필증).
          Extract: Declaration Number, Main HS Code.
          `;
          break;
        case 'AN':
          promptText = `Analyze this ARRIVAL NOTICE (화물도착통지서).
          Extract: 
          1. ETA (입항일).
          2. Location (장치장/CY/CFS Name).
          3. Freight Charges (Total Cost).
          4. Other Charges (Demurrage, etc).
          `;
          break;
        case 'BL':
        default:
           if (sourceType === 'TRANSIT') {
            promptText = `Analyze this Bill of Lading (B/L).
            Extract: B/L Number, Vessel, Shipper, Consignee, Notify Party, Port of Loading.
            
            CRITICAL:
            - **Total CBM / Weight / Packages**
            - **Item Details**: EXTRACT TABLE DATA.
              For EACH item, extract: Description, Qty, Weight, CBM, Container No, Seal No, Container Type (e.g. 20GP, 40HC).
            
            CLASSIFICATION RULES:
            - **Cargo Type**: Look for terms 'CY/CY' or 'FCL' -> Set to 'FCL'. Look for 'CFS/CFS' or 'LCL' -> Set to 'LCL'.
            - **Cargo Class**: If Consignee Address in KOREA -> 'IMPORT'. Else -> 'TRANSHIPMENT'.
            - **Cargo Category**: Classify as 'FISHING_GEAR', 'BAIT', 'NETS', 'PORT_EQUIPMENT', or 'GENERAL' based on description.
            - Extract Agencies (Korean Forwarder, Transporter).
            `;
          } else {
            promptText = `Analyze this Supply Document (LOGI1/3rd Party).
            Extract standard logistics data.
            `;
          }
          break;
      }

      // Call Serverless Function
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt: promptText,
            image: base64Data,
            mimeType: mimeType,
            schema: fullDocSchema
        }),
      });

      if (!response.ok) {
         const errData = await response.json();
         throw new Error(errData.error || `Server Error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.result;

      if (!text) throw new Error("No response from AI");
      const parsed = JSON.parse(text);
      
      // Post-processing
      if (!parsed.totalCbm && parsed.cargoItems && parsed.cargoItems.length > 0) {
          const sumCbm = parsed.cargoItems.reduce((acc: number, item: any) => acc + (item.measurement || 0), 0);
          if (sumCbm > 0) parsed.totalCbm = parseFloat(sumCbm.toFixed(3));
      }
      
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
