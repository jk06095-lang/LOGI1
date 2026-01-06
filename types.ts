

export interface CargoItem {
  description: string;
  quantity: number;
  packageType: string;
  grossWeight: number; // kg
  measurement: number; // cbm
  containerNo?: string;
  sealNo?: string;
  hsCode?: string; // New: HS Code
}

export type CargoSourceType = 'TRANSIT' | 'FISCO' | 'THIRD_PARTY';

export type DocumentScanType = 'BL' | 'CI' | 'PL' | 'EXPORT_DEC' | 'MANIFEST';

export type CargoType = 'LCL' | 'FCL'; // Existing

// New Classifications
export type CargoClass = 'IMPORT' | 'TRANSHIPMENT';
export type ImportSubClass = 'GENERAL' | 'RETURN_EXPORT' | 'SHIPS_STORES';

// Background Task Types
export interface BackgroundTask {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  progress: number; // 0 to 100
  message?: string;
}

export interface NotificationLog {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
    timestamp: string;
}

// Extended Document Types
export interface CommercialInvoiceData {
  currency: string;
  totalAmount: number;
  fileUrl?: string;
}

export interface PackingListData {
  totalPackageCount: number;
  totalCbm: number;
  totalGrossWeight: number;
  fileUrl?: string;
}

export interface ExportDeclarationData {
  declarationNo: string;
  hsCode: string;
  fileUrl?: string;
}

export interface ManifestData {
  fileUrl?: string;
}

export interface BLData {
  id: string;
  vesselJobId?: string; // Link to a specific vessel job
  fileName: string;
  fileUrl?: string; // Firebase Storage URL (Main B/L)
  
  // Core Identifiers
  blNumber: string;
  shipper: string;
  consignee: string;
  notifyParty: string;
  
  // New: Agency & Transport
  koreanForwarder?: string; // 한국 포워딩 업체
  transporterName?: string; // 운송사
  
  // Logistics Info
  vesselName: string;
  voyageNo: string;
  portOfLoading: string;
  portOfDischarge: string;
  date: string;
  
  // Cargo Data
  cargoItems: CargoItem[];
  rawText?: string;
  
  // System Fields
  status: 'processing' | 'completed' | 'error';
  uploadDate: string;
  thumbnailUrl?: string;
  sourceType: CargoSourceType; 
  cargoType?: CargoType; // LCL or FCL
  
  // New Classification Fields
  cargoClass?: CargoClass; // I (Import) or T (Transhipment)
  importSubClass?: ImportSubClass; // Return Export, Ship Stores, etc.

  supplierName?: string;
  
  // New: Extended Documents & Data
  commercialInvoice?: CommercialInvoiceData;
  packingList?: PackingListData;
  exportDeclaration?: ExportDeclarationData;
  manifest?: ManifestData;
  
  // Global Remarks
  remarks?: string; // Used for Description edits
  reportRemarks?: string; // New: Used for the specific Remarks column in Briefing
  note?: string; // New: Additional Note column (비고)
}

export type JobStatus = 'incoming' | 'working' | 'completed';

export interface VesselJob {
  id: string;
  vesselName: string;
  voyageNo: string;
  eta: string;
  status: JobStatus;
  notes: string;
  createdAt: string;
}

// Checklist structure based on the screenshot
export interface ChecklistStep {
  id: string;
  label: string;
  checked: boolean;
  checkedDate?: string;
  remarks: string;
}

export interface BLChecklist {
  blId: string;
  // Section A: Carrier/Fwd -> Agency
  sectionA: ChecklistStep[];
  // Section B: Agency -> Transport
  sectionB: ChecklistStep[];
  // Section C: Agency Tasks
  sectionC: ChecklistStep[];
  // Section D: Transport Tasks
  sectionD: ChecklistStep[];
  // Section E: Loading
  sectionE: ChecklistStep[];
}

export interface AppState {
  vesselJobs: VesselJob[];
  bls: BLData[];
  checklists: Record<string, BLChecklist>; // Keyed by BL ID
}

export type ViewState = 'dashboard' | 'vessel-list' | 'vessel-detail' | 'settings' | 'bl-list' | 'shipment-detail';

export enum ProcessingStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

// Settings Types
export type Language = 'ko' | 'en' | 'cn';
export type Theme = 'light' | 'dark';
export type FontSize = 'small' | 'medium' | 'large' | 'xl';
export type FontStyle = 'sans' | 'serif' | 'mono';

export interface AppSettings {
  language: Language;
  theme: Theme;
  fontSize: FontSize;
  fontStyle: FontStyle;
  viewMode: 'mobile' | 'pc';
  logoUrl?: string; // Custom Company Logo
}