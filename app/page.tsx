import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import Tender from '@/models/Tender';
import Approval from '@/models/Approval';
import LOA from '@/models/LOA';
import WorkOrder from '@/models/WorkOrder';
import Package from '@/models/Package';
import ApprovedWork from '@/models/ApprovedWork';
import TechnicalSanction from '@/models/TechnicalSanction';
import DTP from '@/models/DTP';
import Pagination from '@/components/Pagination';
import DataTable from '@/components/DataTable';
import ExportTableButton from '@/components/ExportTableButton';
import WorkTypeFilter from '@/components/WorkTypeFilter';
import SearchBar from '@/components/SearchBar';
import MasterReportTable from '@/components/MasterReportTable';
import { formatShortDate } from '@/lib/dateUtils';
import type { Column } from '@/lib/types';
import Link from 'next/link';
import { auth } from '@/auth';
import { isAuditorRole, getAuditorSubDivision } from '@/lib/roles';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<{ 
        page?: string;
        limit?: string;
        workType?: string;
        search?: string;
        loadSummary?: string;
        loadMaster?: string;
    }>;
}

export default async function Home({ searchParams }: Props) {
    await dbConnect();
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const auditorSubDivision = getAuditorSubDivision(userRole);
    const isAuditor = isAuditorRole(userRole);

    const params = await searchParams;

    const getQueryString = (overrides: Record<string, string | null>) => {
        const newParams = new URLSearchParams();
        if (params.page) newParams.set('page', params.page);
        if (params.limit) newParams.set('limit', params.limit);
        if (params.workType) newParams.set('workType', params.workType);
        if (params.search) newParams.set('search', params.search);
        if (params.loadSummary === 'true') newParams.set('loadSummary', 'true');
        if (params.loadMaster === 'true') newParams.set('loadMaster', 'true');
        
        Object.entries(overrides).forEach(([key, val]) => {
            if (val === null) {
                newParams.delete(key);
            } else {
                newParams.set(key, val);
            }
        });
        const str = newParams.toString();
        return str ? `?${str}` : '?';
    };

    // Parse work types selection
    const rawWorkType = params.workType;
    let activeWorkTypes: string[] = ['Road', 'Structure']; // Default initial selection
    let shouldFilter = true;

    if (rawWorkType !== undefined) {
        if (rawWorkType === 'all') {
            shouldFilter = false;
            activeWorkTypes = [];
        } else if (rawWorkType === 'none' || rawWorkType === '') {
            shouldFilter = true;
            activeWorkTypes = [];
        } else {
            shouldFilter = true;
            activeWorkTypes = rawWorkType.split(',').filter(Boolean);
        }
    }

    const PREDEFINED_WORK_TYPES = ['Road', 'Building', 'Structure', 'Service'];
    const distinctWorkTypes: string[] = await ApprovedWork.distinct('workType');
    const workTypes = Array.from(new Set([...PREDEFINED_WORK_TYPES, ...distinctWorkTypes])).filter(Boolean).sort();

    const approvedWorkQuery: any = {};
    if (shouldFilter) {
        approvedWorkQuery.workType = { $in: activeWorkTypes };
    }
    if (isAuditor && auditorSubDivision) {
        approvedWorkQuery.subDivision = { $regex: new RegExp(`^${auditorSubDivision}$`, 'i') };
    }

    const filterLabelText = !shouldFilter ? 'All' : activeWorkTypes.length === 0 ? 'None' : activeWorkTypes.join(', ');

    const loadSummary = params.loadSummary === 'true';
    const loadMaster = params.loadMaster === 'true';
    const searchQuery = params.search?.trim();

    // Determine what we need to query
    const needPackages = Boolean(searchQuery || loadSummary);
    const needApprovedWorks = Boolean(loadSummary);
    const needTS = loadSummary;
    const needDTPs = loadSummary;

    // Fetch only needed collections
    const [
        allApprovedWorks,
        allPackages,
        allTS,
        allDTPs,
        masterWorks,
        masterTS,
        masterPackages,
        masterDTPs,
        masterTenders,
        masterApprovals,
        masterLOAs,
        masterWorkOrders
    ] = await Promise.all([
        needApprovedWorks ? ApprovedWork.find(approvedWorkQuery).select('_id workName approvalYear workType').lean() : Promise.resolve([]),
        needPackages ? Package.find({}).select('_id packageName works.workName').lean() : Promise.resolve([]),
        needTS ? TechnicalSanction.find({}).select('workName').lean() : Promise.resolve([]),
        needDTPs ? DTP.find({}).select('tsId dtpApprovalDate tenderAmount').lean() : Promise.resolve([]),
        loadMaster ? ApprovedWork.find(approvedWorkQuery).lean() : Promise.resolve([]),
        loadMaster ? TechnicalSanction.find({}).lean() : Promise.resolve([]),
        loadMaster ? Package.find({}).lean() : Promise.resolve([]),
        loadMaster ? DTP.find({}).lean() : Promise.resolve([]),
        loadMaster ? Tender.find({}).lean() : Promise.resolve([]),
        loadMaster ? Approval.find({}).lean() : Promise.resolve([]),
        loadMaster ? LOA.find({}).lean() : Promise.resolve([]),
        loadMaster ? WorkOrder.find({}).lean() : Promise.resolve([])
    ]);

    // Normalize strings for fuzzy matching
    const normalizeString = (str: string) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');

    let serializedMasterWorks: any[] = [];
    if (loadMaster) {
        const tsMap = new Map<string, any>();
        masterTS.forEach((ts: any) => {
            if (ts.workName) {
                const key = normalizeString(ts.workName);
                tsMap.set(key, ts);
            }
        });

        const workToPkgMap = new Map<string, any>();
        masterPackages.forEach((pkg: any) => {
            if (pkg.works) {
                pkg.works.forEach((w: any) => {
                    if (w.workName) {
                        workToPkgMap.set(normalizeString(w.workName), pkg);
                    }
                });
            }
        });

        const dtpMap = new Map<string, any>();
        masterDTPs.forEach((dtp: any) => {
            if (dtp.tsId) {
                dtpMap.set(dtp.tsId.toString(), dtp);
            }
        });

        const tenderMap = new Map<string, any>();
        masterTenders.forEach((tender: any) => {
            if (tender.packageId) {
                tenderMap.set(tender.packageId.toString(), tender);
            }
        });

        const approvalMap = new Map<string, any>();
        masterApprovals.forEach((app: any) => {
            if (app.tenderId) {
                approvalMap.set(app.tenderId.toString(), app);
            }
        });

        const loaMap = new Map<string, any>();
        masterLOAs.forEach((loa: any) => {
            if (loa.tenderId) {
                loaMap.set(loa.tenderId.toString(), loa);
            }
        });

        const woMap = new Map<string, any>();
        masterWorkOrders.forEach((wo: any) => {
            if (wo.loaId) {
                woMap.set(wo.loaId.toString(), wo);
            }
        });

        serializedMasterWorks = masterWorks.map((w: any) => {
            const normalizedName = normalizeString(w.workName);
            const ts = tsMap.get(normalizedName) || {};
            const pkg = workToPkgMap.get(normalizedName) || {};
            const pkgIdStr = pkg._id ? pkg._id.toString() : null;
            const dtp = pkgIdStr ? dtpMap.get(pkgIdStr) || {} : {};
            const tender = pkgIdStr ? tenderMap.get(pkgIdStr) || {} : {};
            const tenderIdStr = tender._id ? tender._id.toString() : null;
            const approval = tenderIdStr ? approvalMap.get(tenderIdStr) || {} : {};
            const loa = tenderIdStr ? loaMap.get(tenderIdStr) || {} : {};
            const loaIdStr = loa._id ? loa._id.toString() : null;
            const wo = loaIdStr ? woMap.get(loaIdStr) || {} : {};

            const item: any = {
                ...w,
                _id: w._id.toString(),
                jobNumberApprovalDate: w.jobNumberApprovalDate ? new Date(w.jobNumberApprovalDate).toISOString() : null,
                createdAt: w.createdAt ? new Date(w.createdAt).toISOString() : null,
                updatedAt: w.updatedAt ? new Date(w.updatedAt).toISOString() : null,
            };

            // TS properties
            item.ts_dateSendingTS = ts.dateSendingTS ? new Date(ts.dateSendingTS).toISOString() : null;
            item.ts_tsAuthority = ts.tsAuthority || null;
            item.ts_tsAmount = ts.tsAmount || null;
            item.ts_tsNumber = ts.tsNumber || null;
            item.ts_tsDate = ts.tsDate ? new Date(ts.tsDate).toISOString() : null;
            item.ts_remarks = ts.remarks || null;

            // Package properties
            item.pkg_packageName = pkg.packageName || null;

            // DTP properties
            item.dtp_dtpSendingNo = dtp.dtpSendingNo || null;
            item.dtp_dtpSendingDate = dtp.dtpSendingDate ? new Date(dtp.dtpSendingDate).toISOString() : null;
            item.dtp_dtpApprovingAuthority = dtp.dtpApprovingAuthority || null;
            item.dtp_dtpApprovalNo = dtp.dtpApprovalNo || null;
            item.dtp_dtpApprovalDate = dtp.dtpApprovalDate ? new Date(dtp.dtpApprovalDate).toISOString() : null;
            item.dtp_tenderAmount = dtp.tenderAmount || null;
            item.dtp_remarks = dtp.remarks || null;

            // Tender properties
            item.tender_tenderId = tender.tenderId || null;
            item.tender_tenderNoticeYear = tender.tenderNoticeYear || null;
            item.tender_noticeNo = tender.noticeNo || null;
            item.tender_srNo = tender.srNo || null;
            item.tender_trialNo = tender.trialNo || null;
            item.tender_tenderCreationDate = tender.tenderCreationDate ? new Date(tender.tenderCreationDate).toISOString() : null;
            item.tender_lastDateOfSubmission = tender.lastDateOfSubmission ? new Date(tender.lastDateOfSubmission).toISOString() : null;
            item.tender_tenderOpeningDate = tender.tenderOpeningDate ? new Date(tender.tenderOpeningDate).toISOString() : null;
            item.tender_tenderValidityDate = tender.tenderValidityDate ? new Date(tender.tenderValidityDate).toISOString() : null;
            item.tender_estimatedAmount = tender.estimatedAmount || dtp.tenderAmount || null;
            item.tender_reInvite = tender.reInvite !== undefined ? tender.reInvite : null;
            item.tender_cancelled = tender.cancelled !== undefined ? tender.cancelled : null;
            item.tender_cancellationReason = tender.cancellationReason || null;
            item.tender_contractorName = tender.contractorName || null;
            item.tender_contractPrice = tender.contractPrice || null;
            item.tender_aboveBelowPercentage = tender.aboveBelowPercentage || null;
            item.tender_aboveBelowInWord = tender.aboveBelowInWord || null;
            item.tender_proposalDate = tender.proposalDate ? new Date(tender.proposalDate).toISOString() : null;
            item.tender_tenderApprovalOffice = tender.tenderApprovalOffice || null;
            item.tender_tenderApprovalNo = tender.tenderApprovalNo || null;
            item.tender_tenderApprovalDate = tender.tenderApprovalDate ? new Date(tender.tenderApprovalDate).toISOString() : null;
            item.tender_workDurationMonths = tender.workDurationMonths || null;
            item.tender_acceptanceLetterWorksheetNo = tender.acceptanceLetterWorksheetNo || null;
            item.tender_acceptanceLetterDate = tender.acceptanceLetterDate ? new Date(tender.acceptanceLetterDate).toISOString() : null;
            item.tender_agreementYear = tender.agreementYear || null;
            item.tender_agreementNo = tender.agreementNo || null;
            item.tender_agreementDate = tender.agreementDate ? new Date(tender.agreementDate).toISOString() : null;
            item.tender_securityDepositType = tender.securityDepositType || null;
            item.tender_securityDepositBankName = tender.securityDepositBankName || null;
            item.tender_securityDepositNumber = tender.securityDepositNumber || null;
            item.tender_securityDepositAmount = tender.securityDepositAmount || null;
            item.tender_securityDepositDate = tender.securityDepositDate ? new Date(tender.securityDepositDate).toISOString() : null;
            item.tender_additionalSecurityDepositType = tender.additionalSecurityDepositType || null;
            item.tender_additionalSecurityDepositBankName = tender.additionalSecurityDepositBankName || null;
            item.tender_additionalSecurityDepositNumber = tender.additionalSecurityDepositNumber || null;
            item.tender_additionalSecurityDepositAmount = tender.additionalSecurityDepositAmount || null;
            item.tender_additionalSecurityDepositDate = tender.additionalSecurityDepositDate ? new Date(tender.additionalSecurityDepositDate).toISOString() : null;
            item.tender_workOrderWorksheetNo = tender.workOrderWorksheetNo || null;
            item.tender_workOrderDate = tender.workOrderDate ? new Date(tender.workOrderDate).toISOString() : null;
            item.tender_remarks = tender.remarks || null;

            // Approval properties
            const isApprovalNotRequired = approval.notRequired === true || (
                (tender.estimatedAmount !== undefined && tender.estimatedAmount !== null)
                    ? Number(tender.estimatedAmount) < 5000000
                    : (tender.contractPrice !== undefined && Number(tender.contractPrice) < 5000000)
            );
            item.approval_notRequired = isApprovalNotRequired;
            item.approval_proposalDate = approval.proposalDate ? new Date(approval.proposalDate).toISOString() : null;
            item.approval_tenderApprovalOffice = approval.tenderApprovalOffice || null;
            item.approval_tenderApprovalNo = approval.tenderApprovalNo || null;
            item.approval_tenderApprovalDate = approval.tenderApprovalDate ? new Date(approval.tenderApprovalDate).toISOString() : null;

            // LOA properties
            item.loa_stampDuty = loa.stampDuty || null;
            item.loa_defectLiabilityPeriod = loa.defectLiabilityPeriod || null;
            item.loa_workDurationMonths = loa.workDurationMonths || null;
            item.loa_acceptanceLetterWorksheetNo = loa.acceptanceLetterWorksheetNo || null;
            item.loa_acceptanceLetterDate = loa.acceptanceLetterDate ? new Date(loa.acceptanceLetterDate).toISOString() : null;

            // Work Order properties
            item.wo_agreementYear = wo.agreementYear || null;
            item.wo_agreementNo = wo.agreementNo || null;
            item.wo_agreementDate = wo.agreementDate ? new Date(wo.agreementDate).toISOString() : null;
            item.wo_securityDepositType = wo.securityDepositType || null;
            item.wo_securityDepositBankName = wo.securityDepositBankName || null;
            item.wo_securityDepositNumber = wo.securityDepositNumber || null;
            item.wo_securityDepositAmount = wo.securityDepositAmount || null;
            item.wo_securityDepositDate = wo.securityDepositDate ? new Date(wo.securityDepositDate).toISOString() : null;
            item.wo_additionalSecurityDepositType = wo.additionalSecurityDepositType || null;
            item.wo_additionalSecurityDepositBankName = wo.additionalSecurityDepositBankName || null;
            item.wo_additionalSecurityDepositNumber = wo.additionalSecurityDepositNumber || null;
            item.wo_additionalSecurityDepositAmount = wo.additionalSecurityDepositAmount || null;
            item.wo_additionalSecurityDepositDate = wo.additionalSecurityDepositDate ? new Date(wo.additionalSecurityDepositDate).toISOString() : null;
            item.wo_workOrderWorksheetNo = wo.workOrderWorksheetNo || null;
            item.wo_workOrderDate = wo.workOrderDate ? new Date(wo.workOrderDate).toISOString() : null;
            item.wo_timeLimitStartsFrom = wo.timeLimitStartsFrom ? new Date(wo.timeLimitStartsFrom).toISOString() : null;
            item.wo_stipulatedCompletionDate = wo.stipulatedCompletionDate ? new Date(wo.stipulatedCompletionDate).toISOString() : null;

            return item;
        });
    }

    let summaryData: any[] = [];
    if (loadSummary) {
        const tsCountMap: Record<string, number> = {};
        allTS.forEach((ts: any) => {
            const name = normalizeString(ts.workName as string);
            tsCountMap[name] = (tsCountMap[name] || 0) + 1;
        });

        const pendingTSIds = new Set<string>();
        allApprovedWorks.forEach((w: any) => {
            const safeName = normalizeString(w.workName as string);
            if (tsCountMap[safeName] > 0) {
                tsCountMap[safeName]--;
            } else {
                pendingTSIds.add(w._id.toString());
            }
        });

        const workNameToPkg = new Map<string, any>();
        allPackages.forEach((pkg: any) => {
            if (pkg.works) {
                pkg.works.forEach((pw: any) => {
                    if (pw.workName) {
                        workNameToPkg.set(normalizeString(pw.workName), pkg);
                    }
                });
            }
        });

        const pkgIdToDTP = new Map<string, any>();
        allDTPs.forEach((d: any) => {
            if (d.tsId) {
                pkgIdToDTP.set(d.tsId.toString(), d);
            }
        });

        const summaryMap: Record<string, any> = {};

        allApprovedWorks.forEach((work: any) => {
            const year = work.approvalYear || 'Unspecified';
            if (!summaryMap[year]) {
                summaryMap[year] = { year, total: 0, tsPrepared: 0, tsPending: 0, dtpPrepared: 0, dtpPending: 0 };
            }
            
            summaryMap[year].total++;
            
            const isTSPending = pendingTSIds.has(work._id.toString());
            if (isTSPending) {
                summaryMap[year].tsPending++;
            } else {
                summaryMap[year].tsPrepared++;
                const safeName = normalizeString(work.workName as string);
                const pkg = workNameToPkg.get(safeName);
                const dtp = pkg ? pkgIdToDTP.get(pkg._id.toString()) : null;
                const hasApprovedDTP = Boolean(dtp && (dtp.dtpApprovalDate || (dtp.tenderAmount !== undefined && dtp.tenderAmount !== null)));
                
                if (hasApprovedDTP) {
                    summaryMap[year].dtpPrepared++;
                } else {
                    summaryMap[year].dtpPending++;
                }
            }
        });

        summaryData = Object.values(summaryMap).sort((a, b) => b.year.localeCompare(a.year));
        
        const summaryTotals = summaryData.reduce((acc, row) => ({
            year: 'Total',
            total: acc.total + row.total,
            tsPrepared: acc.tsPrepared + row.tsPrepared,
            tsPending: acc.tsPending + row.tsPending,
            dtpPrepared: acc.dtpPrepared + row.dtpPrepared,
            dtpPending: acc.dtpPending + row.dtpPending
        }), { year: 'Total', total: 0, tsPrepared: 0, tsPending: 0, dtpPrepared: 0, dtpPending: 0 });

        if (summaryData.length > 0) {
            summaryData.push(summaryTotals);
        }
    }



    const searchApprovedWorksColumns: Column[] = [
        { 
            key: 'srNo', 
            label: 'Sr. No.', 
            render: (row, idx) => idx + 1, 
            align: 'center' 
        },
        { 
            key: 'workName', 
            label: 'Name of Work', 
            minWidth: '300px',
            render: (row) => (
                <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-slate-800 break-words leading-tight">{row.workName}</span>
                    {row.workNameGujarati && <span className="text-[11px] text-slate-500 font-medium">{row.workNameGujarati}</span>}
                </div>
            )
        },
        { 
            key: 'packageName', 
            label: 'Package Name', 
            minWidth: '180px',
            render: (row) => row.packageId ? (
                <Link href={`/packages/${row.packageId}`} className="text-emerald-600 hover:underline font-semibold break-words">
                    {row.packageName}
                </Link>
            ) : (
                <span className="text-slate-400 italic">Unpackaged</span>
            )
        },
        { key: 'jobNumberAmount', label: 'Amount (Lakh)', align: 'center', render: (row) => row.jobNumberAmount || '-' },
        { key: 'approvalYear', label: 'Approval Year', align: 'center' },
        { key: 'workType', label: 'Work Type' },
        { key: 'estimateConsultant', label: 'Estimate Consultant', minWidth: '150px' }
    ];

    // 4. Search Results Report (If search query exists)
    let searchResultsData: any[] = [];
    let searchApprovedWorksData: any[] = [];
    if (searchQuery) {
        // Find packages whose packageName matches OR which contain a work matching the search query
        const searchPackages = allPackages.filter((pkg: any) => {
            const pkgNameMatch = pkg.packageName?.toLowerCase().includes(searchQuery.toLowerCase());
            const workNameMatch = pkg.works?.some((w: any) => w.workName?.toLowerCase().includes(searchQuery.toLowerCase()));
            return pkgNameMatch || workNameMatch;
        });
        const searchPackageIds = searchPackages.map((pkg: any) => pkg._id);

        // Find Tenders matching the search query in packageName OR belonging to matching packages
        const searchTendersRaw = await Tender.find({
            $or: [
                { packageName: { $regex: searchQuery, $options: 'i' } },
                { packageId: { $in: searchPackageIds } }
            ]
        })
        .select('_id tenderNoticeYear noticeNo srNo packageName packageId contractorName proposalDate tenderApprovalDate acceptanceLetterDate workOrderDate cancelled cancellationReason')
        .sort({ tenderNoticeYear: -1, noticeNo: 1, srNo: 1 })
        .lean();

        const searchTenderIds = searchTendersRaw.map((t: any) => t._id);

        // Fetch related records for matched search tenders
        const [searchApprovals, searchLOAs] = await Promise.all([
            Approval.find({ tenderId: { $in: searchTenderIds } }).select('tenderId notRequired proposalDate tenderApprovalDate').lean(),
            LOA.find({ tenderId: { $in: searchTenderIds } }).select('_id tenderId acceptanceLetterDate').lean()
        ]);

        const searchLoaIds = searchLOAs.map((l: any) => l._id);
        const searchWorkOrders = await WorkOrder.find({ loaId: { $in: searchLoaIds } }).select('loaId workOrderDate').lean();

        const searchApprovalMap = new Map(searchApprovals.map((a: any) => [a.tenderId?.toString(), a]));
        const searchLoaMap = new Map(searchLOAs.map((l: any) => [l.tenderId?.toString(), l]));
        const searchWorkOrderMap = new Map(searchWorkOrders.map((wo: any) => [wo.loaId?.toString(), wo]));
        const searchPackageMap = new Map(allPackages.map((p: any) => [p._id.toString(), p]));

        searchResultsData = searchTendersRaw.map((tender: any) => {
            const tIdStr = tender._id.toString();
            const approval = searchApprovalMap.get(tIdStr);
            const loa = searchLoaMap.get(tIdStr);
            const workOrder = loa ? searchWorkOrderMap.get(loa._id.toString()) : null;

            const isApprovalNotRequired = approval?.notRequired === true || (
                (tender.estimatedAmount !== undefined && tender.estimatedAmount !== null)
                    ? Number(tender.estimatedAmount) < 5000000
                    : (tender.contractPrice !== undefined && Number(tender.contractPrice) < 5000000)
            );
            const proposalDate = isApprovalNotRequired ? 'Not Required' : (tender.proposalDate || approval?.proposalDate || null);
            const tenderApprovalDate = isApprovalNotRequired ? 'Not Required' : (tender.tenderApprovalDate || approval?.tenderApprovalDate || null);
            const acceptanceLetterDate = tender.acceptanceLetterDate || loa?.acceptanceLetterDate || null;
            const workOrderDate = tender.workOrderDate || workOrder?.workOrderDate || null;

            const pkg = tender.packageId ? searchPackageMap.get(tender.packageId.toString()) : null;
            const approvedWorks = pkg && pkg.works && pkg.works.length > 0 
                ? pkg.works.map((w: any) => w.workName).filter(Boolean)
                : [];

            // Compute lifecycle status
            let status = 'Tendered';
            if (tender.cancelled) {
                status = 'Cancelled';
            } else if (workOrderDate) {
                status = 'Work Order Issued';
            } else if (acceptanceLetterDate) {
                status = 'LOA Issued';
            } else if (isApprovalNotRequired) {
                status = 'Approved (No Sanction Req.)';
            } else if (tenderApprovalDate) {
                status = 'Tender Approved';
            } else if (proposalDate) {
                status = 'Proposal Submitted';
            }

            return {
                _id: tIdStr,
                tenderNoticeYear: tender.tenderNoticeYear || '-',
                noticeNo: tender.noticeNo || '-',
                srNo: tender.srNo || '-',
                packageName: tender.packageName || 'Unspecified Package',
                approvedWorks,
                packageId: tender.packageId?.toString() || null,
                contractorName: tender.contractorName || '-',
                proposalDate,
                tenderApprovalDate,
                acceptanceLetterDate,
                workOrderDate,
                cancelled: tender.cancelled || false,
                cancellationReason: tender.cancellationReason || '',
                status,
            };
        });

        // Search Approved Works directly
        const matchedApprovedWorksRaw = await ApprovedWork.find({
            $or: [
                { workName: { $regex: searchQuery, $options: 'i' } },
                { workNameGujarati: { $regex: searchQuery, $options: 'i' } }
            ]
        })
        .select('_id workName circle district subDivision taluka approvalYear jobNumberAmount workType estimateConsultant remarks')
        .limit(100)
        .lean();

        const workNameToPkgInfo = new Map<string, { _id: string, packageName: string }>();
        allPackages.forEach((pkg: any) => {
            if (pkg.works) {
                pkg.works.forEach((pw: any) => {
                    if (pw.workName) {
                        workNameToPkgInfo.set(normalizeString(pw.workName), {
                            _id: pkg._id.toString(),
                            packageName: pkg.packageName
                        });
                    }
                });
            }
        });

        searchApprovedWorksData = matchedApprovedWorksRaw.map((w: any) => {
            const pkgInfo = workNameToPkgInfo.get(normalizeString(w.workName));
            return {
                ...w,
                _id: w._id.toString(),
                packageName: pkgInfo ? pkgInfo.packageName : null,
                packageId: pkgInfo ? pkgInfo._id : null
            };
        });
    }

    const searchColumns: Column[] = [
        { key: 'tenderNoticeYear', label: 'Notice Year' },
        { key: 'noticeNo', label: 'Notice No.' },
        { key: 'srNo', label: 'Sr No.', align: 'center' },
        { 
            key: 'packageName', 
            label: 'Package Name', 
            minWidth: '200px', 
            render: (row) => (
                <div className="flex flex-col gap-1">
                    {row.packageId ? (
                        <Link href={`/packages/${row.packageId}`} className="text-emerald-600 hover:underline font-semibold break-words">
                            {row.packageName}
                        </Link>
                    ) : (
                        <span className="break-words font-medium text-slate-700">{row.packageName}</span>
                    )}
                </div>
            ) 
        },
        { 
            key: 'approvedWorks', 
            label: 'Approved Works', 
            minWidth: '250px',
            render: (row) => row.approvedWorks.length > 0 ? (
                <div className="space-y-1">
                    {row.approvedWorks.map((work: string, idx: number) => (
                        <div key={idx} className="text-xs leading-tight">
                            {idx + 1}. {work}
                        </div>
                    ))}
                </div>
            ) : <span className="text-slate-400 italic">No works found</span>
        },
        { key: 'contractorName', label: 'Contractor Name', minWidth: '150px' },
        { 
            key: 'proposalDate', 
            label: 'Proposal Date', 
            render: (row) => row.proposalDate === 'Not Required' ? (
                <span className="text-slate-500 italic font-semibold">Not Required</span>
            ) : <span className="text-slate-600">{formatShortDate(row.proposalDate)}</span> 
        },
        { 
            key: 'tenderApprovalDate', 
            label: 'Approval Date', 
            render: (row) => row.tenderApprovalDate === 'Not Required' ? (
                <span className="text-slate-500 italic font-semibold">Not Required</span>
            ) : <span className="text-slate-600">{formatShortDate(row.tenderApprovalDate)}</span> 
        },
        { 
            key: 'acceptanceLetterDate', 
            label: 'Acceptance Date', 
            render: (row) => <span className="text-slate-600">{formatShortDate(row.acceptanceLetterDate)}</span> 
        },
        { 
            key: 'workOrderDate', 
            label: 'Work Order Date', 
            render: (row) => <span className="text-slate-600">{formatShortDate(row.workOrderDate)}</span> 
        },
        { 
            key: 'status', 
            label: 'Status', 
            render: (row) => {
                let badgeClass = 'bg-slate-100 text-slate-700';
                if (row.status === 'Cancelled') {
                    badgeClass = 'bg-red-50 text-red-700 border border-red-200';
                } else if (row.status === 'Work Order Issued') {
                    badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                } else if (row.status === 'LOA Issued') {
                    badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                } else if (row.status === 'Tender Approved' || row.status === 'Approved (No Sanction Req.)') {
                    badgeClass = 'bg-indigo-50 text-indigo-700 border border-indigo-200';
                } else if (row.status === 'Proposal Submitted') {
                    badgeClass = 'bg-amber-50 text-amber-700 border border-amber-200';
                }
                return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${badgeClass}`}>
                        {row.status}
                    </span>
                );
            }
        }
    ];

    const getApprovedWorksLink = (extraParams: Record<string, string>) => {
        const linkParams = new URLSearchParams();
        
        if (rawWorkType) {
            linkParams.set('workType', rawWorkType);
        } else {
            linkParams.set('workType', 'Road,Structure');
        }

        Object.entries(extraParams).forEach(([key, val]) => {
            if (val) linkParams.set(key, val);
        });

        return `/approved-works?${linkParams.toString()}`;
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 sm:p-8 space-y-12">
            <div className="max-w-[100%] mx-auto space-y-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Executive Dashboard</h1>
                        <p className="text-sm font-medium text-slate-500">Panchayat Road and Building Division, Bhavnagar</p>
                    </div>
                    <div className="w-full md:w-96">
                        <Suspense fallback={<div className="h-10 bg-slate-200 animate-pulse rounded-md" />}>
                            <SearchBar placeholder="Search work or package name..." />
                        </Suspense>
                    </div>
                </div>

                {/* Search Results Section */}
                {searchQuery && (
                    <div className="bg-white p-6 shadow-sm rounded-xl border border-slate-100 space-y-6">
                        <div className="border-b border-slate-100 pb-3">
                            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Search Results</h2>
                            <p className="text-xs text-slate-400 font-semibold mt-0.5">Matching results for "{searchQuery}"</p>
                        </div>

                        {/* Matching Tenders & Packages Table */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Matching Tenders & Packages</h3>
                            <DataTable 
                                columns={searchColumns} 
                                data={searchResultsData} 
                                emptyMessage="No matching tenders or packages found."
                                exportFilename="Tenders_Search_Results.xlsx"
                            />
                        </div>

                        {/* Matching Approved Works Table */}
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Matching Approved Works</h3>
                            <DataTable 
                                columns={searchApprovedWorksColumns} 
                                data={searchApprovedWorksData} 
                                emptyMessage="No matching approved works found."
                                exportFilename="Approved_Works_Search_Results.xlsx"
                            />
                        </div>
                    </div>
                )}

                {/* 0. Summary Report */}
                <div className="bg-white p-6 shadow-sm rounded-xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Summary Report</h2>
                                {loadSummary && (
                                    <Link 
                                        href={getQueryString({ loadSummary: null })}
                                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 border border-rose-200 px-2 py-1 rounded-md hover:bg-rose-50 transition-colors"
                                    >
                                        Hide Report
                                    </Link>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Overview of works and packages status by Approval Year — Filtered: {filterLabelText}</p>
                        </div>
                        {loadSummary && (
                            <div className="flex items-center gap-3">
                                <Suspense fallback={null}>
                                    <WorkTypeFilter workTypes={workTypes} />
                                </Suspense>
                                <ExportTableButton tableId="summary-table" filename="Summary_Report.xlsx" />
                            </div>
                        )}
                    </div>

                    {loadSummary ? (
                        <div className="overflow-x-auto border border-slate-300 shadow-sm rounded-lg">
                            <table id="summary-table" className="w-full text-left border-collapse text-xs font-medium">
                                <thead>
                                    <tr className="bg-slate-100 border-b border-slate-300">
                                        <th rowSpan={2} className="px-3 py-2.5 font-bold text-slate-700 border-r border-slate-300">Approval Year</th>
                                        <th rowSpan={2} className="px-3 py-2.5 font-bold text-slate-700 border-r border-slate-300 text-center">Total Approved Works</th>
                                        <th colSpan={2} className="px-3 py-2.5 font-bold text-slate-700 border-r border-slate-300 text-center">TS</th>
                                        <th colSpan={2} className="px-3 py-2.5 font-bold text-slate-700 text-center">DTP</th>
                                    </tr>
                                    <tr className="bg-slate-100 border-b border-slate-300">
                                        <th className="px-3 py-2.5 font-medium text-slate-700 border-r border-slate-300 text-center">Prepared</th>
                                        <th className="px-3 py-2.5 font-medium text-slate-700 border-r border-slate-300 text-center">Pending</th>
                                        <th className="px-3 py-2.5 font-medium text-slate-700 border-r border-slate-300 text-center">Prepared</th>
                                        <th className="px-3 py-2.5 font-medium text-slate-700 text-center">Pending</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {summaryData.length > 0 ? summaryData.map((row: any, index: number) => {
                                        const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';
                                        return (
                                            <tr key={row.year} className={`${rowBg} hover:bg-emerald-50/80 transition-colors`}>
                                                <td className="px-3 py-2 text-slate-800 border-r border-slate-200"><span className="font-bold">{row.year}</span></td>
                                                <td className="px-3 py-2 text-slate-800 border-r border-slate-200 text-center">
                                                    <Link href={getApprovedWorksLink(row.year !== 'Total' ? { approvalYear: row.year } : {})} className={row.year !== 'Total' ? "text-emerald-600 hover:underline font-medium" : "text-emerald-600 hover:underline font-bold"}>
                                                        {row.total}
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-2 text-slate-800 border-r border-slate-200 text-center">
                                                    <Link href={getApprovedWorksLink(row.year !== 'Total' ? { approvalYear: row.year, filter: 'preparedTS' } : { filter: 'preparedTS' })} className={row.year !== 'Total' ? "text-emerald-600 hover:underline font-medium" : "text-emerald-600 hover:underline font-bold"}>
                                                        {row.tsPrepared}
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-2 text-slate-800 border-r border-slate-200 text-center">
                                                    <Link href={getApprovedWorksLink(row.year !== 'Total' ? { approvalYear: row.year, filter: 'pending' } : { filter: 'pending' })} className={row.year !== 'Total' ? "text-amber-600 hover:underline font-medium" : "text-amber-700 hover:underline font-bold"}>
                                                        {row.tsPending}
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-2 text-slate-800 border-r border-slate-200 text-center">
                                                    <Link href={getApprovedWorksLink(row.year !== 'Total' ? { approvalYear: row.year, filter: 'preparedDTP' } : { filter: 'preparedDTP' })} className={row.year !== 'Total' ? "text-emerald-600 hover:underline font-medium" : "text-emerald-600 hover:underline font-bold"}>
                                                        {row.dtpPrepared}
                                                    </Link>
                                                </td>
                                                <td className="px-3 py-2 text-slate-800 text-center">
                                                    <Link href={getApprovedWorksLink(row.year !== 'Total' ? { approvalYear: row.year, filter: 'pendingDTP' } : { filter: 'pendingDTP' })} className={row.year !== 'Total' ? "text-amber-600 hover:underline font-medium" : "text-amber-700 hover:underline font-bold"}>
                                                        {row.dtpPending}
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No summary data available.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-3">
                            <p className="text-xs font-semibold text-slate-500">Summary Report data is not loaded.</p>
                            <Link 
                                href={getQueryString({ loadSummary: 'true' })} 
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                            >
                                Load Summary Report
                            </Link>
                        </div>
                    )}
                </div>



                {/* 4. Master Report (Approved Works) */}
                <div className="bg-white p-6 shadow-sm rounded-xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Master Report (Approved Works)</h2>
                                {loadMaster && (
                                    <Link 
                                        href={getQueryString({ loadMaster: null })}
                                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 border border-rose-200 px-2 py-1 rounded-md hover:bg-rose-50 transition-colors"
                                    >
                                        Hide Report
                                    </Link>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 font-medium">All columns of Approved Works — Filtered: {filterLabelText}</p>
                        </div>
                        {loadMaster && (
                            <div className="flex items-center gap-3">
                                <Suspense fallback={null}>
                                    <WorkTypeFilter workTypes={workTypes} />
                                </Suspense>
                            </div>
                        )}
                    </div>

                    {loadMaster ? (
                        <MasterReportTable data={serializedMasterWorks} />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-3">
                            <p className="text-xs font-semibold text-slate-500">Master Report data is not loaded.</p>
                            <Link 
                                href={getQueryString({ loadMaster: 'true' })} 
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                            >
                                Load Master Report
                            </Link>
                        </div>
                    )}
                </div>


            </div>
        </div>
    );
}
