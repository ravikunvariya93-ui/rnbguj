import fs from 'fs';
import path from 'path';
import dbConnect from './db';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import Package from '@/models/Package';
import Agency from '@/models/Agency';

/**
 * Utility to format Date to DD-MM-YYYY
 */
function formatDate(date: Date | string): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
}

/**
 * Core function to check if a Work Order has the required details and send an SMS notification
 * to the associated Agency/Contractor.
 */
const SUB_DIVISION_MOBILES: Record<string, string> = {
    'mahuva': '8980324727',
    'palitana': '8980324727',
    'vallabhipur': '9558944988',
    'talaja': '7016606240',
    'bhavnagar': '7878719949',
    'shihor': '7016571621,9909155370'
};

/**
 * Helper to match sub-division name to a phone number
 */
function getSubDivisionMobile(subDivisionName: string): string | null {
    const lowerName = subDivisionName.toLowerCase();
    for (const [key, val] of Object.entries(SUB_DIVISION_MOBILES)) {
        if (lowerName.includes(key)) {
            return val;
        }
    }
    return null;
}

/**
 * Core function to check if a Work Order has the required details and send an SMS notification
 * to the associated Agency/Contractor and the concerned Sub Division.
 */
export async function checkAndSendWorkOrderSMS(workOrderId: string): Promise<boolean> {
    try {
        await dbConnect();

        // 1. Fetch the Work Order details
        const workOrder = await WorkOrder.findById(workOrderId);
        if (!workOrder) {
            console.log(`[SMS Service] Work Order not found with ID: ${workOrderId}`);
            return false;
        }

        // Check if SMS is already sent or if Work Order details are not required
        if (workOrder.smsSent) {
            console.log(`[SMS Service] SMS already sent for Work Order: ${workOrder.workOrderWorksheetNo || workOrderId}`);
            return false;
        }

        if (workOrder.notRequired) {
            console.log(`[SMS Service] Skipping SMS: Work Order marked as not required.`);
            return false;
        }

        // We only send SMS if both Worksheet No and Work Order Date are given
        if (!workOrder.workOrderWorksheetNo || !workOrder.workOrderDate) {
            console.log(`[SMS Service] Skipping SMS: Work Order details (Worksheet No or Date) are not fully provided yet.`);
            return false;
        }

        // 2. Fetch the associated LOA
        const loa = await LOA.findById(workOrder.loaId);
        if (!loa) {
            console.log(`[SMS Service] LOA not found for Work Order: ${workOrderId}`);
            return false;
        }

        // 3. Fetch the associated Tender
        const tender = await Tender.findById(loa.tenderId);
        if (!tender) {
            console.log(`[SMS Service] Tender not found for LOA: ${loa._id}`);
            return false;
        }

        // 4. Fetch the Package and Agency (Contractor) details
        const [pkg, agency] = await Promise.all([
            Package.findById(tender.packageId),
            Agency.findOne({ name: tender.contractorName })
        ]);

        if (!agency) {
            console.log(`[SMS Service] Agency not found with name: "${tender.contractorName}"`);
            return false;
        }

        // Resolve recipients (Executive Engineer + Deputy Executive Engineer)
        const overrideMobile = process.env.SMS_RECIPIENT_OVERRIDE;
        const eeMobile = process.env.EXECUTIVE_ENGINEER_MOBILE || '9909155370';
        const rawRecipients: string[] = [];

        if (overrideMobile) {
            // Override mode redirects all copies to the override number
            // 1. Executive Engineer copy
            rawRecipients.push(overrideMobile.trim());
            // 2. Concerned Deputy Executive Engineer copy
            if (pkg && pkg.subDivision && getSubDivisionMobile(pkg.subDivision)) {
                rawRecipients.push(overrideMobile.trim());
            }
        } else {
            // 1. Executive Engineer recipient
            if (eeMobile && eeMobile.trim()) {
                rawRecipients.push(eeMobile.trim());
            }

            // 2. Concerned Deputy Executive Engineer (Sub Division) recipient
            if (pkg && pkg.subDivision) {
                const subDivMobileStr = getSubDivisionMobile(pkg.subDivision);
                if (subDivMobileStr) {
                    const subDivMobiles = subDivMobileStr.split(',');
                    for (const subDivMobile of subDivMobiles) {
                        const cleanMobile = subDivMobile.trim();
                        if (cleanMobile) {
                            rawRecipients.push(cleanMobile);
                        }
                    }
                } else {
                    console.log(`[SMS Service] No subdivision mobile number found matching: "${pkg.subDivision}"`);
                }
            }
        }

        // De-duplicate recipients to prevent sending multiple messages to the same number
        const recipients = Array.from(new Set(rawRecipients));

        if (recipients.length === 0) {
            console.log(`[SMS Service] Skipping SMS: No recipient mobile numbers found.`);
            return false;
        }

        // 5. Draft the SMS message
        const formattedDate = formatDate(workOrder.workOrderDate);
        const packageName = pkg?.packageName || 'N/A';

        // Custom template for the notification
        const message = `Work Order has been issued for Package: ${packageName} to ${agency.name} on ${formattedDate}. - Tender Clerk`;

        console.log(`[SMS Service] Attempting to send SMS to recipients:`, recipients);
        
        // 6. Dispatch SMS (depending on environment config)
        let successCount = 0;
        
        const textbeeApiKey = process.env.TEXTBEE_API_KEY;
        const textbeeDeviceId = process.env.TEXTBEE_DEVICE_ID;
        const gatewayUrl = process.env.SMS_GATEWAY_URL;
        const twilioSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioFrom = process.env.TWILIO_FROM_NUMBER;

        if (textbeeApiKey && textbeeDeviceId) {
            // A. textbee.dev integration (Turns Android phone into SMS gateway)
            // Supports multiple recipients natively in a single API call
            const textbeeUrl = `https://api.textbee.dev/api/v1/gateway/devices/${textbeeDeviceId}/send-sms`;
            const formattedRecipients = recipients.map(r => r.startsWith('+') ? r : `+91${r}`);

            console.log(`[SMS Service] Dispatching SMS via textbee.dev to recipients:`, formattedRecipients);

            const response = await fetch(textbeeUrl, {
                method: 'POST',
                headers: {
                    'x-api-key': textbeeApiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipients: formattedRecipients,
                    message: message
                })
            });

            if (response.ok) {
                console.log(`[SMS Service] textbee.dev SMS dispatched successfully.`);
                successCount = recipients.length;
            } else {
                const errorText = await response.text();
                console.error(`[SMS Service] textbee.dev API failed (Status: ${response.status}): ${errorText}`);
            }
        } else if (gatewayUrl) {
            // B. HTTP SMS Gateway Integration (Custom URL) - Loops over each recipient
            const method = (process.env.SMS_GATEWAY_METHOD || 'GET').toUpperCase();
            let headers: Record<string, string> = {};
            if (process.env.SMS_GATEWAY_HEADERS) {
                try {
                    headers = JSON.parse(process.env.SMS_GATEWAY_HEADERS);
                } catch (e) {
                    console.error('[SMS Service] Failed to parse SMS_GATEWAY_HEADERS env variable', e);
                }
            }

            for (const number of recipients) {
                const encodedMessage = encodeURIComponent(message);
                const targetUrl = gatewayUrl
                    .replace('{number}', encodeURIComponent(number))
                    .replace('{message}', encodedMessage);

                console.log(`[SMS Service] Dispatching request to custom gateway for ${number} via ${method}`);
                
                const response = await fetch(targetUrl, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        ...headers
                    },
                    body: method === 'POST' && process.env.SMS_GATEWAY_BODY 
                        ? process.env.SMS_GATEWAY_BODY
                            .replace('{number}', number)
                            .replace('{message}', message)
                        : undefined
                });

                if (response.ok) {
                    successCount++;
                } else {
                    const errorText = await response.text();
                    console.error(`[SMS Service] Gateway request failed for ${number} (Status: ${response.status}): ${errorText}`);
                }
            }
        } else if (twilioSid && twilioAuthToken && twilioFrom) {
            // C. Twilio Integration - Loops over each recipient
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
            const credentials = Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString('base64');
            const useWhatsApp = process.env.TWILIO_USE_WHATSAPP === 'true';

            for (const number of recipients) {
                const formattedMobile = number.startsWith('+') ? number : `+91${number}`;
                const fromField = useWhatsApp 
                    ? (twilioFrom.startsWith('whatsapp:') ? twilioFrom : `whatsapp:${twilioFrom}`)
                    : twilioFrom;
                const toField = useWhatsApp 
                    ? `whatsapp:${formattedMobile}`
                    : formattedMobile;

                console.log(`[SMS Service] Dispatching via Twilio to ${toField}`);
                
                const response = await fetch(twilioUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${credentials}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        From: fromField,
                        To: toField,
                        Body: message
                    }).toString()
                });

                if (response.ok) {
                    successCount++;
                } else {
                    const errorData = await response.json();
                    console.error(`[SMS Service] Twilio request failed for ${toField}:`, errorData);
                }
            }
        } else {
            // D. Sandbox Fallback Mode
            console.log(`[SMS Service] Running in Sandbox Mode (No credentials set)`);
            successCount = recipients.length;
        }

        // 7. Write to local log file for developer audit/sandbox verification
        const logPath = path.join(process.cwd(), 'sms_sent.log');
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] TO: ${recipients.join(', ')} | AGENCY: ${agency.name} | MSG: "${message}" | STATUS: ${successCount === recipients.length ? 'SUCCESS' : `${successCount}/${recipients.length} SENT`}\n`;
        fs.appendFileSync(logPath, logEntry, 'utf8');

        // 8. Update Work Order DB state if successfully processed for all/some recipients
        if (successCount > 0) {
            await WorkOrder.findByIdAndUpdate(workOrderId, { smsSent: true });
            console.log(`[SMS Service] Notification processed successfully. Flagged smsSent=true on Work Order.`);
            return true;
        }

        return false;
    } catch (error) {
        console.error(`[SMS Service] Unexpected error in SMS dispatcher:`, error);
        return false;
    }
}
