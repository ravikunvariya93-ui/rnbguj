// Pure billing math — no React, no Mongoose. Single source of truth for
// gross/net/GST and statutory deductions so form, print pages and (later)
// server-side validation all agree.

export const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export type TenderDirection = 'Above' | 'Below' | 'At Par' | string;

export interface BillTotalItem {
  uptoDateAmount?: number | string | null;
  considerForAsphalt?: boolean;
}

export interface BillTotals {
  totalUptoDate: number;
  adjAmount: number;
  netAmount: number;
  gstBase: number;
  gst18: number;
  netPayable: number;
  gross: number;
}

/** Gross from BOQ upto-date amounts + tender above/below % + 18% GST. */
export function calculateBillTotals(
  items: BillTotalItem[],
  tenderPercentage = 0,
  tenderDirection: TenderDirection = 'Above',
  labourCessApplicable = false,
): BillTotals {
  const totalUptoDate = round2(
    items.reduce((sum, item) => sum + (Number(item.uptoDateAmount) || 0), 0),
  );
  const adjAmount = round2((totalUptoDate * (Number(tenderPercentage) || 0)) / 100);
  // "At Par" (or anything that isn't Above/Below) means no adjustment.
  const netAmount =
    tenderDirection === 'Below'
      ? round2(totalUptoDate - adjAmount)
      : tenderDirection === 'Above'
        ? round2(totalUptoDate + adjAmount)
        : totalUptoDate;
  const gstBase = labourCessApplicable ? round2(netAmount * 0.99) : netAmount;
  const gst18 = round2(gstBase * 0.18);
  const netPayable = round2(netAmount + gst18);
  return { totalUptoDate, adjAmount, netAmount, gstBase, gst18, netPayable, gross: Math.round(netPayable) };
}

/** 6% of net pay, capped at 5% of contract price, net of previous SD. */
export function calculateSecurityDeposit(
  netPayVal: number,
  contractPriceVal = 0,
  previousDeducted = 0,
): number {
  const netPay = Math.max(netPayVal || 0, 0);
  const sdBase = netPay > 0 ? Math.ceil((netPay * 0.06) / 100) * 100 : 0;
  const contractPrice = Math.max(contractPriceVal || 0, 0);
  if (contractPrice > 0) {
    const sdMax = Math.ceil((contractPrice * 0.05) / 100) * 100;
    return Math.min(sdBase, Math.max(0, sdMax - previousDeducted));
  }
  return sdBase;
}

export interface DeductionResult {
  incomeTax: number;
  gst: number;
  labourCess: number;
  securityDeposit: number;
  freeMaintenanceDeposit: number;
  tpi: number;
  esmp: number;
}

/** Statutory deductions derived from net payable. Pure + unit-testable. */
export function getDeductionsForNetPayable(
  netPayVal: number,
  runningBillNo: number | string,
  opts: {
    contractPrice?: number;
    workType?: string;
    budgetHead?: string;
    previousSDTotal?: number;
  } = {},
): DeductionResult {
  const netPay = Math.max(netPayVal || 0, 0);
  const incomeTax = netPay > 0 ? Math.ceil((netPay * 0.02) / 10) * 10 : 0;
  const gst = incomeTax;
  const labourCess = netPay > 0 ? Math.ceil((netPay * 0.01) / 10) * 10 : 0;
  const securityDeposit = calculateSecurityDeposit(netPay, opts.contractPrice ?? 0, opts.previousSDTotal ?? 0);

  const isBuilding = String(opts.workType || '').toLowerCase().includes('building');
  const freeMaintenanceDeposit = isBuilding ? 0 : netPay > 0 ? Math.ceil((netPay * 0.05) / 100) * 100 : 0;

  const head = String(opts.budgetHead || '').trim().toLowerCase();
  const isMMGSY = head.includes('5054 mmgsy normal') || head.includes('5054 mmgsy scsp') || head.includes('mmgsy');
  const tpi = isMMGSY ? (netPay > 10000000 ? 100000 : 50000) : 0;
  const billNoStr = String(runningBillNo || '').trim().toLowerCase();
  const isFirstBill = Number(runningBillNo) === 1 || billNoStr === '1' || billNoStr.includes('1st') || billNoStr.includes('first');
  const esmp = isMMGSY && isFirstBill ? 20000 : 0;

  return { incomeTax, gst, labourCess, securityDeposit, freeMaintenanceDeposit, tpi, esmp };
}
