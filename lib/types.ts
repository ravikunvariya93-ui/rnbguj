export interface ListPageSearchParams {
  filter?: string;
  search?: string;
  page?: string;
  limit?: string;
  sort?: string;
  order?: string;
  // dashboard metadata filters
  natureOfWork?: string;
  subDivision?: string;
  estimateConsultant?: string;
  approvalYear?: string;
  roadCategory?: string;
  workType?: string;
  schemeName?: string;
  noticeYear?: string;
  noticeNo?: string;
  contractorName?: string;
  trialNo?: string;
  budgetHead?: string;
  dtpConsultant?: string;
  hasWorks?: string;
  buildingType?: string;
}

export interface EntityFormProps<T = any> {
  initialData?: T;
  isEditing?: boolean;
}

export interface Column<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  minWidth?: string;
  cellClassName?: string | ((row: T, index: number) => string);
  headerClassName?: string;
  footerClassName?: string;
  footer?: React.ReactNode | ((data: T[]) => React.ReactNode);
  render?: (row: T, index: number) => React.ReactNode;
}

