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

        const overrideMobile = process.env.SMS_RECIPIENT_OVERRIDE;
        const mobileNo = overrideMobile ? overrideMobile.trim() : (agency.mobileNo || '').trim();
        if (!mobileNo) {
            console.log(`[SMS Service] Skipping SMS: No mobile number found for Agency: "${agency.name}" and no SMS_RECIPIENT_OVERRIDE is configured.`);
            return false;
        }

        // 5. Draft the SMS message
        const formattedDate = formatDate(workOrder.workOrderDate);
        const packageName = pkg?.packageName || 'N/A';

        // Custom template for the notification
        const message = `Work Order has been issued for Package: ${packageName} to ${agency.name} on ${formattedDate}. - Tender Clerk`;

        console.log(`[SMS Service] Attempting to send SMS to ${mobileNo}...`);
        
        // 6. Dispatch SMS (depending on environment config)
        let success = false;
        
        const textbeeApiKey = process.env.TEXTBEE_API_KEY;
        const textbeeDeviceId = process.env.TEXTBEE_DEVICE_ID;
        const gatewayUrl = process.env.SMS_GATEWAY_URL;
        const twilioSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioFrom = process.env.TWILIO_FROM_NUMBER;

        if (textbeeApiKey && textbeeDeviceId) {
            // A. textbee.dev integration (Turns Android phone into SMS gateway)
            const textbeeUrl = `https://api.textbee.dev/api/v1/gateway/devices/${textbeeDeviceId}/send-sms`;
            const formattedMobile = mobileNo.startsWith('+') ? mobileNo : `+91${mobileNo}`;

            console.log(`[SMS Service] Dispatching SMS via textbee.dev to ${formattedMobile}`);

            const response = await fetch(textbeeUrl, {
                method: 'POST',
                headers: {
                    'x-api-key': textbeeApiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipients: [formattedMobile],
                    message: message
                })
            });

            if (response.ok) {
                console.log(`[SMS Service] textbee.dev SMS dispatched successfully.`);
                success = true;
            } else {
                const errorText = await response.text();
                console.error(`[SMS Service] textbee.dev API failed (Status: ${response.status}): ${errorText}`);
            }
        } else if (gatewayUrl) {
            // A. HTTP SMS Gateway Integration (Custom URL)
            const method = (process.env.SMS_GATEWAY_METHOD || 'GET').toUpperCase();
            
            // Format URL-encoded params or inject placeholder variables
            const encodedMessage = encodeURIComponent(message);
            const targetUrl = gatewayUrl
                .replace('{number}', encodeURIComponent(mobileNo))
                .replace('{message}', encodedMessage);

            let headers: Record<string, string> = {};
            if (process.env.SMS_GATEWAY_HEADERS) {
                try {
                    headers = JSON.parse(process.env.SMS_GATEWAY_HEADERS);
                } catch (e) {
                    console.error('[SMS Service] Failed to parse SMS_GATEWAY_HEADERS env variable', e);
                }
            }

            console.log(`[SMS Service] Dispatching request to custom gateway via ${method}: ${targetUrl}`);
            
            const response = await fetch(targetUrl, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                body: method === 'POST' && process.env.SMS_GATEWAY_BODY 
                    ? process.env.SMS_GATEWAY_BODY
                        .replace('{number}', mobileNo)
                        .replace('{message}', message)
                    : undefined
            });

            if (response.ok) {
                console.log(`[SMS Service] Gateway response successful (Status: ${response.status})`);
                success = true;
            } else {
                const errorText = await response.text();
                console.error(`[SMS Service] Gateway request failed (Status: ${response.status}): ${errorText}`);
            }
        } else if (twilioSid && twilioAuthToken && twilioFrom) {
            // B. Twilio Integration
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
            const credentials = Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString('base64');
            
            const useWhatsApp = process.env.TWILIO_USE_WHATSAPP === 'true';
            const formattedMobile = mobileNo.startsWith('+') ? mobileNo : `+91${mobileNo}`;
            
            const fromField = useWhatsApp 
                ? (twilioFrom.startsWith('whatsapp:') ? twilioFrom : `whatsapp:${twilioFrom}`)
                : twilioFrom;
            const toField = useWhatsApp 
                ? `whatsapp:${formattedMobile}`
                : formattedMobile;

            console.log(`[SMS Service] Dispatching via Twilio (${useWhatsApp ? 'WhatsApp' : 'SMS'}) to ${toField}`);
            
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
                console.log(`[SMS Service] Twilio message dispatched successfully.`);
                success = true;
            } else {
                const errorData = await response.json();
                console.error(`[SMS Service] Twilio request failed:`, errorData);
            }
        } else {
            // C. Sandbox Fallback Mode (Logs to project root)
            console.log(`[SMS Service] Running in Sandbox Mode (No credentials set)`);
            success = true; // Mark as true so we flag as sent in sandbox
        }

        // 7. Write to local log file (always do this for developer audit/sandbox verification)
        const logPath = path.join(process.cwd(), 'sms_sent.log');
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] TO: ${mobileNo} | AGENCY: ${agency.name} | MSG: "${message}" | STATUS: ${success ? 'SUCCESS' : 'FAILED'}\n`;
        fs.appendFileSync(logPath, logEntry, 'utf8');

        // 8. Update Work Order DB state if successfully processed
        if (success) {
            await WorkOrder.findByIdAndUpdate(workOrderId, { smsSent: true });
            console.log(`[SMS Service] SMS sent successfully. Flagged smsSent=true on Work Order.`);
            return true;
        }

        return false;
    } catch (error) {
        console.error(`[SMS Service] Unexpected error in SMS dispatcher:`, error);
        return false;
    }
}
