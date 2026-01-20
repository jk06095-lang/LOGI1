

export interface CargoItem {
  description: string;
  quantity: number;
  packageType: string;
  grossWeight: number; // kg
  measurement: number; // cbm
  containerNo?: string;
  sealNo?: string;
  containerType?: string; // New: 20GP, 40HC, etc.
  hsCode?: string; // New: HS Code
}

export type CargoSourceType = 'TRANSIT' | 'FISCO' | 'THIRD_PARTY';

export type DocumentScanType = 'BL' | 'CI' | 'PL' | 'EXPORT_DEC' | 'MANIFEST' | 'AN';

export type CargoType = 'LCL' | 'FCL'; // Existing

// New Classifications
export type CargoClass = 'IMPORT' | 'TRANSHIPMENT';
export type ImportSubClass = 'GENERAL' | 'RETURN_EXPORT' | 'SHIPS_STORES';
export type BLType = 'MASTER' | 'HOUSE';
export type CargoCategory = string;

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

// Concurrency Locking
export interface ResourceLock {
  id: string; // The resource ID (e.g., briefing-2023-10)
  userId: string;
  userEmail: string;
  timestamp: number; // Date.now()
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

export interface ArrivalNoticeData {
  eta?: string;
  location?: string; // CY or CFS Name
  freightCost?: string; // 청구 운임
  otherCosts?: string; // 기타 비용 (Demurrage etc)
  fileUrl?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadDate: string;
}

export interface BLData {
  id: string;
  vesselJobId?: string; // Link to a specific vessel job
  fileName: string;
  fileUrl?: string; // Firebase Storage URL (Main B/L)
  
  // Core Identifiers
  blNumber: string;
  blType?: BLType; // New: Master or House
  shipper: string;
  consignee: string;
  notifyParty: string;
  
  // New: Agency & Transport
  koreanForwarder?: string; // 한국 포워딩 업체
  transporterName?: string; // 운송사
  
  // Logistics Info
  vesselName: string;
  carrierCompany?: string; // New: Carrier (e.g., Maersk, KMTC)
  voyageNo: string;
  portOfLoading: string;
  portOfDischarge: string;
  date: string;
  
  // New: Storage Info
  storageLocation?: string; // 보관 장소 (Warehouse Name)
  storagePeriod?: string; // 보관 기간

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
  cargoCategory?: CargoCategory; // New: Detailed Category (Bait, Net, etc.)

  supplierName?: string;
  
  // New: Extended Documents & Data
  commercialInvoice?: CommercialInvoiceData;
  packingList?: PackingListData;
  exportDeclaration?: ExportDeclarationData;
  manifest?: ManifestData;
  arrivalNotice?: ArrivalNoticeData; // New: A/N Data
  attachments?: Attachment[]; // New: Generic Cloud Files
  
  // Global Remarks
  remarks?: string; // Used for Main Detail Remarks
  reportRemarks?: string; // Legacy: Used for Report Remarks if needed, but mapped to Main Remarks now
  reportDescription?: string; // New: Custom description for Report View
  reportTransporter?: string; // New: Report Override for Transporter
  reportStorageLocation?: string; // New: Report Override for Storage/Location
  note?: string; // New: Additional Note column (비고)
  reportSortOrder?: number; // New: For persisting manual order in reports

  // Report Overrides (Manually edited values in Briefing Report)
  quantity?: number;
  grossWeight?: number;
  volume?: number;
  packageType?: string;
}

export type JobStatus = 'incoming' | 'working' | 'completed';

export interface VesselJob {
  id: string;
  vesselName: string;
  voyageNo: string;
  eta: string;
  etd?: string; // New: Estimated Time of Departure
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

export type ViewState = 'dashboard' | 'vessel-list' | 'vessel-detail' | 'settings' | 'bl-list' | 'shipment-detail' | 'cloud';

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

// Chat Types
export interface Reaction {
  emoji: string;
  userIds: string[];
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  timestamp: number;
  channelId: string; // 'global' or 'uidA_uidB'
  readBy: string[]; // List of user IDs who have read the message
  pending?: boolean; // Optimistic UI state
  reactions?: Reaction[];
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
}

export interface ChatUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  lastSeen: number;
  status: 'online' | 'offline' | 'away';
  contacts?: string[]; // List of UIDs this user has added as friends
  fcmTokens?: string[]; // Array of FCM tokens for notifications
  authorized?: boolean; // New: Access Code Verification Status
}