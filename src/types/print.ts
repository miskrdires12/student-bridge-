// ============================================================================
// STUDENT BRIDGE — PRINT & ID CARD TYPES
// ============================================================================

export interface StudentPrintData {
  id: string;
  studentId: string;
  fullName: string;
  contactName?: string | null;
  grade: string;
  sex: string;
  phone: string;
  cityRegion?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  bloodType?: string | null;
  emailAddress?: string | null;
  guardianFullName?: string | null;
  rollNumber?: string | null;
  nationality?: string | null;
  nationalId?: string | null;
  dateOfBirth?: Date | string | null;
  photoPath?: string | null;
  qrCodeData?: string | null;
  status?: string;
}

export interface CardDimensions {
  widthMm: number;
  heightMm: number;
  widthPt: number;
  heightPt: number;
}

export interface SheetDimensions {
  widthMm: number;
  heightMm: number;
  widthPt: number;
  heightPt: number;
}

export interface CardElementBox {
  x: number;
  y: number;
  width?: number;
  height?: number;
  size?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  label?: string;
  visible?: boolean;
}

export interface CardFieldConfig {
  photo: CardElementBox; // Movable & Resizable Photo
  qr: CardElementBox;    // Movable & Resizable QR
  fullName: CardElementBox;
  studentId: CardElementBox;
  grade: CardElementBox;
  rollNumber: CardElementBox;
  phone: CardElementBox;
  sex?: CardElementBox;
  emergencyContact?: CardElementBox;
  bloodType?: CardElementBox;
}

export interface ImpositionGrid {
  columns: number;
  rows: number;
  cardsPerPage: number;
  marginXPt: number;
  marginYPt: number;
  columnGapPt: number;
  rowGapPt: number;
}

export interface PrintEngineOptions {
  includeCutMarks?: boolean;
  showBleed?: boolean;
  bleedMm?: number;
  organizationName?: string;
  customHeaderTitle?: string;
  fieldConfig?: CardFieldConfig;
  cardDimensions?: Partial<CardDimensions>;
  pageSize?: Partial<SheetDimensions>;
  grid?: Partial<ImpositionGrid>;
  cardBackgroundColor?: string;
  cardBorderColor?: string;
  templateSvg?: string;
}
